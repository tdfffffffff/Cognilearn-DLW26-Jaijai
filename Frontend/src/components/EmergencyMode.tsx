/**
 * EmergencyMode — rapid pre-exam flashcard revision.
 *
 * Flow:
 *  1. AI generates flashcards with key concepts/theorems/intuitions
 *  2. Front shows concept/question — click the card to flip
 *  3. Back shows the answer with "Explain" and "I Got It" buttons
 *  4. "Explain" calls the AI tutor API for a detailed explanation & marks for review
 *  5. "I Got It" marks understood and advances
 *  6. When all cards are done → "Review Missed" or "Generate More"
 *
 * Designed for students who have ~2 hours before an exam.
 */

import React, { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  ChevronRight,
  RotateCcw,
  Sparkles,
  Loader2,
  CheckCircle2,
  XCircle,
  Zap,
  BookOpen,
  Brain,
  Trophy,
  Lightbulb,
  Star,
  Hash,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { generateEmergencyFlashcards, chatWithTutor, type EmergencyFlashcard } from "@/lib/api";
import { getMaterialsForTopic } from "@/data/topicStore";
import { LatexRenderer } from "@/components/LatexRenderer";

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

type CardStatus = "unseen" | "understood" | "missed";
type CardFace = "front" | "back" | "explain";

interface CardState {
  card: EmergencyFlashcard;
  status: CardStatus;
  face: CardFace;
  aiExplanation: string | null;
  loadingExplanation: boolean;
}

type EmergencyPhase = "loading" | "cards" | "complete";

interface EmergencyModeProps {
  topicId: string;
  topicName: string;
  onBack: () => void;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Fallback flashcards (when API is unavailable)
// ═══════════════════════════════════════════════════════════════════════════════

function generateFallbackCards(topic: string): EmergencyFlashcard[] {
  return [
    {
      id: "fb-1",
      title: `Core Definition`,
      front: `What is the core definition of ${topic}?`,
      back: `${topic} is built on foundational axioms that everything else derives from. If you can state the core definition from memory and explain it in your own words with a concrete example, you truly understand it.`,
      detailedExplanation: `**${topic}** is built on a set of **foundational axioms or definitions** that everything else derives from. Start by making sure you can **state the core definition from memory**. If you can explain it in your own words to someone who has never heard of it, you truly understand it. Try to think of **one concrete example** that illustrates the definition — this anchors abstract concepts to something tangible. Ask yourself: what would break if this definition were slightly different?`,
      importance: "critical",
      category: "definition",
    },
    {
      id: "fb-2",
      title: `Central Theorem`,
      front: `What is the most important theorem in ${topic} and what does it imply?`,
      back: `The central theorem connects the key ideas and bridges theory to application. Know three things: (1) the exact statement, (2) the conditions under which it applies, and (3) what you can do with it.`,
      detailedExplanation: `Every field has a **central theorem** that ties the key concepts together. In ${topic}, this theorem provides the **bridge between theory and application**. Make sure you know: (1) **the statement** of the theorem — what does it say exactly? (2) **the conditions** — when does it apply? (3) **the implications** — what can you do with it? If you can recall these three parts, you can tackle most exam questions related to this theorem.`,
      importance: "critical",
      category: "theorem",
    },
    {
      id: "fb-3",
      title: `Common Pitfalls`,
      front: `What are the most common mistakes students make in ${topic}?`,
      back: `Four common traps: (1) Sign errors — always double-check. (2) Boundary conditions — check the edges. (3) Missing assumptions — verify preconditions. (4) Skipping steps under pressure loses easy marks.`,
      detailedExplanation: `The most frequent errors in ${topic} fall into a few categories: (1) **Sign errors** — always double-check positive/negative. (2) **Boundary conditions** — does the formula or theorem still hold at the **edges** of its domain? (3) **Missing assumptions** — many results require specific **preconditions** to be true. (4) **Algebraic shortcuts** — skipping steps often leads to mistakes under exam pressure. **Slow down** at critical steps to avoid losing easy marks.`,
      importance: "important",
      category: "intuition",
    },
    {
      id: "fb-4",
      title: `Essential Formulas`,
      front: `What are the must-know formulas for ${topic}?`,
      back: `Focus on the 3-5 most critical formulas. For each one, know what every variable means, when to use it, and how to re-derive it from first principles if you forget.`,
      detailedExplanation: `When memorizing formulas for ${topic}, use this approach: (1) **Write each formula by hand** — motor memory helps retention. (2) **Understand the units** of each variable — this helps you **sanity-check** your answers. (3) **Know the derivation** in broad strokes — if you forget a formula, you can often **re-derive** it from first principles. (4) **Link formulas together** — many formulas are just **special cases** of a more general one.`,
      importance: "critical",
      category: "formula",
    },
    {
      id: "fb-5",
      title: `Key Intuition`,
      front: `How would you explain ${topic} to someone who has never studied it?`,
      back: `If you can explain the core idea using a real-world analogy a non-expert understands, you truly grasp it. Examiners test intuition by giving unfamiliar scenarios requiring you to apply concepts in new ways.`,
      detailedExplanation: `**Intuition** is what separates students who truly understand from those who just memorize. For ${topic}, ask yourself: **"What is this REALLY about?"** Try to explain it using a **real-world analogy**. If you can explain it to a 12-year-old, you understand it deeply. Examiners often test whether you have intuition by asking **"why" questions** or giving you an **unfamiliar scenario** where you need to apply the concept in a new way.`,
      importance: "important",
      category: "intuition",
    },
    {
      id: "fb-6",
      title: `Cross-Topic Connections`,
      front: `How does ${topic} relate to other subjects you've studied?`,
      back: `${topic} connects to many other areas. These links help you remember via multiple mental models, solve harder interdisciplinary problems, and demonstrate depth in exams.`,
      detailedExplanation: `${topic} does not exist in isolation — it connects to many other areas. **Identifying these links** helps you: (1) **Remember concepts** more easily because they're anchored to multiple mental models. (2) **Solve harder problems** that combine ideas from different areas. (3) **Impress examiners** by showing breadth and depth of understanding. Think about what **prerequisites** ${topic} builds on and what **advanced topics** build on ${topic}.`,
      importance: "supplementary",
      category: "concept",
    },
  ];
}

// ═══════════════════════════════════════════════════════════════════════════════
// Importance badge config
// ═══════════════════════════════════════════════════════════════════════════════

const importanceConfig = {
  critical: { label: "Critical", color: "bg-cognitive-critical/20 text-cognitive-critical border-cognitive-critical/30" },
  important: { label: "Important", color: "bg-cognitive-moderate/20 text-cognitive-moderate border-cognitive-moderate/30" },
  supplementary: { label: "Supplementary", color: "bg-primary/20 text-primary border-primary/30" },
};

const categoryIcon: Record<string, typeof Brain> = {
  theorem: Star,
  concept: Brain,
  formula: Hash,
  intuition: Lightbulb,
  definition: BookOpen,
};

// ═══════════════════════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════════════════════

const EmergencyMode: React.FC<EmergencyModeProps> = ({ topicId, topicName, onBack }) => {
  const [phase, setPhase] = useState<EmergencyPhase>("loading");
  const [cardStates, setCardStates] = useState<CardState[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [reviewMode, setReviewMode] = useState(false);
  const [generatingMore, setGeneratingMore] = useState(false);

  // ── Load flashcards ──
  const loadCards = useCallback(async (append = false) => {
    if (!append) setPhase("loading");
    else setGeneratingMore(true);

    const materials = getMaterialsForTopic(topicId);
    let flashcards: EmergencyFlashcard[];
    try {
      const result = await generateEmergencyFlashcards(topicName, 10, materials || undefined);
      flashcards = result.flashcards;
    } catch {
      flashcards = generateFallbackCards(topicName);
    }

    const newStates: CardState[] = flashcards.map((card) => ({
      card,
      status: "unseen",
      face: "front" as CardFace,
      aiExplanation: null,
      loadingExplanation: false,
    }));

    if (append) {
      setCardStates((prev) => [...prev, ...newStates]);
      setCurrentIdx((prev) => prev); // stay at current position (will be at "complete", so move to new cards)
      setGeneratingMore(false);
      setPhase("cards");
      setReviewMode(false);
    } else {
      setCardStates(newStates);
      setCurrentIdx(0);
      setPhase("cards");
    }
  }, [topicId, topicName]);

  // Auto-load on mount
  React.useEffect(() => {
    loadCards();
  }, [loadCards]);

  // ── Derived state ──
  // In review mode we show cards that are still "missed" OR already re-evaluated ("unseen" from this review round).
  // We snapshot which card IDs are being reviewed so the list stays stable.
  const [reviewIds, setReviewIds] = useState<Set<string>>(new Set());

  const displayCards = useMemo(() => {
    if (reviewMode) return cardStates.filter((cs) => reviewIds.has(cs.card.id));
    return cardStates;
  }, [cardStates, reviewMode, reviewIds]);

  const currentCard = displayCards[currentIdx] ?? null;
  const totalCards = displayCards.length;
  const progress = totalCards > 0 ? ((currentIdx + 1) / totalCards) * 100 : 0;
  const understoodCount = cardStates.filter((cs) => cs.status === "understood").length;
  const missedCount = cardStates.filter((cs) => cs.status === "missed").length;

  // ── Handlers ──

  /** Flip the card from front → back */
  const handleFlipToBack = () => {
    setCardStates((prev) =>
      prev.map((cs) =>
        cs.card.id === currentCard?.card.id ? { ...cs, face: "back" as CardFace } : cs,
      ),
    );
  };

  /** "I Got It" — mark understood and advance */
  const handleGotIt = () => {
    setCardStates((prev) =>
      prev.map((cs) =>
        cs.card.id === currentCard?.card.id
          ? { ...cs, status: "understood" as CardStatus, face: "front" as CardFace }
          : cs,
      ),
    );
    advanceCard();
  };

  /** "Explain" — call AI tutor for a detailed explanation, mark as missed */
  const handleExplain = async () => {
    if (!currentCard) return;
    const cardId = currentCard.card.id;

    // Mark loading + missed
    setCardStates((prev) =>
      prev.map((cs) =>
        cs.card.id === cardId
          ? { ...cs, status: "missed" as CardStatus, face: "explain" as CardFace, loadingExplanation: true }
          : cs,
      ),
    );

    // Build a prompt for the AI tutor
    const prompt = `The student is studying "${topicName}" and doesn't understand this flashcard concept. Please explain it in detail with examples.

**Concept:** ${currentCard.card.title}
**Question:** ${currentCard.card.front}
**Short Answer:** ${currentCard.card.back}

Provide a clear, detailed explanation that helps the student understand. Use **bold** for key terms. Include a concrete example if possible.`;

    const materials = getMaterialsForTopic(topicId);
    let explanation: string;
    try {
      explanation = await chatWithTutor(prompt, topicName, undefined, materials || undefined);
    } catch {
      // Fallback to the pre-generated detailed explanation
      explanation = currentCard.card.detailedExplanation;
    }

    setCardStates((prev) =>
      prev.map((cs) =>
        cs.card.id === cardId
          ? { ...cs, aiExplanation: explanation, loadingExplanation: false }
          : cs,
      ),
    );
  };

  /** After reading the explanation, advance to next card */
  const handleNextAfterExplanation = () => {
    setCardStates((prev) =>
      prev.map((cs) =>
        cs.card.id === currentCard?.card.id ? { ...cs, face: "front" as CardFace } : cs,
      ),
    );
    advanceCard();
  };

  const advanceCard = () => {
    if (currentIdx < totalCards - 1) {
      setCurrentIdx((i) => i + 1);
    } else {
      setPhase("complete");
    }
  };

  const startReview = () => {
    // Snapshot the IDs of missed cards so the review list is stable
    const missed = cardStates.filter((cs) => cs.status === "missed").map((cs) => cs.card.id);
    if (missed.length === 0) return;
    setReviewIds(new Set(missed));
    // Reset missed cards to "unseen" so they can be re-evaluated
    setCardStates((prev) =>
      prev.map((cs) =>
        cs.status === "missed" ? { ...cs, status: "unseen", face: "front" as CardFace, aiExplanation: null, loadingExplanation: false } : cs,
      ),
    );
    setCurrentIdx(0);
    setReviewMode(true);
    setPhase("cards");
  };

  const handleGenerateMore = () => {
    // Set currentIdx to the end of new cards when they load
    const currentLength = cardStates.length;
    setCurrentIdx(currentLength); // will be first of the new batch
    loadCards(true);
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // Render: Loading
  // ═══════════════════════════════════════════════════════════════════════════
  if (phase === "loading") {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <button onClick={onBack} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Quiz Me
        </button>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-2xl p-12 text-center"
        >
          <div className="relative mx-auto w-16 h-16 mb-6">
            <div className="absolute inset-0 rounded-full bg-cognitive-risk/20 animate-ping" />
            <div className="relative w-16 h-16 rounded-full bg-cognitive-risk/10 flex items-center justify-center">
              <Zap className="w-8 h-8 text-cognitive-risk" />
            </div>
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">Emergency Mode</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Generating key concepts for <span className="text-primary font-semibold">{topicName}</span>...
          </p>
          <div className="flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-primary" />
            <span className="text-xs text-muted-foreground">Extracting theorems, formulas & intuitions</span>
          </div>
        </motion.div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Render: Complete
  // ═══════════════════════════════════════════════════════════════════════════
  if (phase === "complete") {
    const allUnderstood = missedCount === 0;

    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <button onClick={onBack} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Quiz Me
        </button>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass rounded-2xl p-8 text-center"
        >
          {allUnderstood ? (
            <div className="mb-6">
              <Trophy className="w-16 h-16 text-cognitive-excellent mx-auto mb-3" />
              <h2 className="text-2xl font-bold text-foreground">All Cards Reviewed!</h2>
              <p className="text-muted-foreground mt-1">
                You marked all {understoodCount} cards as understood. Great job!
              </p>
            </div>
          ) : (
            <div className="mb-6">
              <Brain className="w-16 h-16 text-cognitive-moderate mx-auto mb-3" />
              <h2 className="text-2xl font-bold text-foreground">Session Complete</h2>
              <p className="text-muted-foreground mt-1">
                You reviewed all flashcards for {topicName}.
              </p>
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4 mb-8 max-w-xs mx-auto">
            <div className="rounded-xl bg-cognitive-excellent/10 border border-cognitive-excellent/30 p-4">
              <CheckCircle2 className="w-5 h-5 text-cognitive-excellent mx-auto mb-1" />
              <p className="text-2xl font-bold text-cognitive-excellent">{understoodCount}</p>
              <p className="text-[10px] text-muted-foreground uppercase">Got It</p>
            </div>
            <div className="rounded-xl bg-cognitive-risk/10 border border-cognitive-risk/30 p-4">
              <XCircle className="w-5 h-5 text-cognitive-risk mx-auto mb-1" />
              <p className="text-2xl font-bold text-cognitive-risk">{missedCount}</p>
              <p className="text-[10px] text-muted-foreground uppercase">Need Review</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {missedCount > 0 && (
              <Button onClick={startReview} className="gap-2" variant="default">
                <RotateCcw className="w-4 h-4" />
                Review Missed ({missedCount})
              </Button>
            )}
            <Button onClick={handleGenerateMore} variant="outline" className="gap-2" disabled={generatingMore}>
              {generatingMore ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              Generate More
            </Button>
            <Button onClick={onBack} variant="ghost" className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Done
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Render: Flashcard
  // ═══════════════════════════════════════════════════════════════════════════
  if (!currentCard) return null;

  const { card, face, loadingExplanation, aiExplanation } = currentCard;
  const CatIcon = categoryIcon[card.category] ?? Brain;
  const impCfg = importanceConfig[card.importance] ?? importanceConfig.important;

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-cognitive-risk" />
          <span className="text-sm font-bold text-foreground">Emergency Mode</span>
          {reviewMode && (
            <Badge variant="outline" className="text-[10px] bg-cognitive-risk/10 text-cognitive-risk border-cognitive-risk/30">
              Reviewing Missed
            </Badge>
          )}
        </div>
        <span className="text-xs font-mono text-muted-foreground">
          {currentIdx + 1} / {totalCards}
        </span>
      </div>

      {/* Progress Bar */}
      <Progress value={progress} className="h-1.5" />

      {/* Score Tracker */}
      <div className="flex items-center justify-center gap-6 text-xs">
        <div className="flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5 text-cognitive-excellent" />
          <span className="text-muted-foreground">Got it: <span className="font-bold text-foreground">{understoodCount}</span></span>
        </div>
        <div className="flex items-center gap-1.5">
          <XCircle className="w-3.5 h-3.5 text-cognitive-risk" />
          <span className="text-muted-foreground">Need review: <span className="font-bold text-foreground">{missedCount}</span></span>
        </div>
      </div>

      {/* Flashcard */}
      <AnimatePresence mode="wait">
        <motion.div
          key={card.id + "-" + face}
          initial={{ opacity: 0, rotateY: face === "front" ? -90 : 90, scale: 0.95 }}
          animate={{ opacity: 1, rotateY: 0, scale: 1 }}
          exit={{ opacity: 0, rotateY: face === "front" ? 90 : -90, scale: 0.95 }}
          transition={{ duration: 0.35, ease: "easeInOut" }}
          className="glass rounded-2xl overflow-hidden"
          style={{ perspective: "1000px" }}
        >
          {/* Card Header */}
          <div className="p-4 border-b border-border/30 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CatIcon className="w-4 h-4 text-primary" />
              <span className="text-xs font-semibold text-foreground uppercase tracking-wider">{card.category}</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={`text-[9px] ${impCfg.color}`}>
                {impCfg.label}
              </Badge>
              {face === "front" && (
                <span className="text-[10px] text-muted-foreground italic">Tap to flip</span>
              )}
            </div>
          </div>

          {/* ═══ FRONT — Question or concept title, click to flip ═══ */}
          {face === "front" && (
            <div
              onClick={handleFlipToBack}
              className="cursor-pointer hover:bg-secondary/10 transition-colors"
            >
              <div className="p-8 min-h-[280px] flex flex-col items-center justify-center text-center">
                <h3 className="text-xl font-bold text-foreground mb-3 max-w-md leading-snug">
                  <LatexRenderer text={card.front} />
                </h3>
                <div className="mt-8 flex items-center gap-2 text-xs text-muted-foreground/60">
                  <RotateCcw className="w-3.5 h-3.5" />
                  Click card to reveal answer
                </div>
              </div>
            </div>
          )}

          {/* ═══ BACK — Brief explanation/intuition + Explain / I Got It ═══ */}
          {face === "back" && (
            <>
              <div className="p-8 min-h-[280px] flex flex-col items-center justify-center text-center">
                <div className="text-xs uppercase tracking-widest text-primary/70 mb-3 font-semibold">{card.title}</div>
                <div className="text-sm text-foreground leading-relaxed max-w-md">
                  <LatexRenderer text={card.back} />
                </div>
              </div>
              <div className="p-4 border-t border-border/30">
                <div className="flex gap-3">
                  <Button
                    onClick={handleExplain}
                    variant="outline"
                    className="flex-1 gap-2 border-cognitive-moderate/30 text-cognitive-moderate hover:bg-cognitive-moderate/10"
                  >
                    <Lightbulb className="w-4 h-4" />
                    Explain
                  </Button>
                  <Button
                    onClick={handleGotIt}
                    className="flex-1 gap-2 bg-cognitive-excellent hover:bg-cognitive-excellent/90 text-white"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    I Got It
                  </Button>
                </div>
              </div>
            </>
          )}

          {/* ═══ EXPLAIN — AI-generated detailed explanation ═══ */}
          {face === "explain" && (
            <>
              <div className="p-8 min-h-[280px] flex flex-col">
                <div className="flex items-center gap-2 mb-4">
                  <Lightbulb className="w-5 h-5 text-cognitive-moderate flex-shrink-0" />
                  <h3 className="text-sm font-bold text-cognitive-moderate">AI Explanation</h3>
                  <Badge variant="outline" className="text-[9px] bg-cognitive-risk/10 text-cognitive-risk border-cognitive-risk/30 ml-auto">
                    Needs Review
                  </Badge>
                </div>
                {loadingExplanation ? (
                  <div className="flex-1 flex flex-col items-center justify-center gap-3">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">AI is generating an explanation...</p>
                  </div>
                ) : (
                  <div className="flex-1">
                    <h4 className="text-base font-bold text-foreground mb-3">{card.title}</h4>
                    <div className="text-sm text-muted-foreground leading-relaxed prose prose-sm prose-invert max-w-none">
                      <FormattedExplanation text={aiExplanation || card.detailedExplanation} />
                    </div>
                  </div>
                )}
              </div>
              {!loadingExplanation && (
                <div className="p-4 border-t border-border/30">
                  <Button
                    onClick={handleNextAfterExplanation}
                    className="w-full gap-2"
                  >
                    <ChevronRight className="w-4 h-4" />
                    {currentIdx < totalCards - 1 ? "Next Card" : "Finish"}
                  </Button>
                </div>
              )}
            </>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Topic Reminder */}
      <p className="text-center text-[10px] text-muted-foreground">
        <BookOpen className="w-3 h-3 inline mr-1" />
        {topicName} · Emergency Revision
      </p>
    </div>
  );
};

export default EmergencyMode;

// ═══════════════════════════════════════════════════════════════════════════════
// Helper: Render text with **bold** markdown
// ═══════════════════════════════════════════════════════════════════════════════

function FormattedExplanation({ text }: { text: string }) {
  // Split on **bold** markers and render spans
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <p>
      {parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return (
            <span key={i} className="font-bold text-foreground">
              {part.slice(2, -2)}
            </span>
          );
        }
        return <React.Fragment key={i}>{part}</React.Fragment>;
      })}
    </p>
  );
}
