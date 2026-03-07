/**
 * Reactive error profile store — tracks the 6-category cognitive error scores.
 *
 * Used by:
 * - QuizMe (Quiz Mode) → updates scores after AI assessment
 * - CognitiveFingerprint → reads scores for the hexagonal radar chart
 *
 * Categories: Conceptual, Procedural, Factual, Metacognitive, Transfer, Application
 *
 * Also exposes per-topic error profiles with confidence tiers and OOD flags.
 */

export interface ErrorCategoryScore {
  type: "Conceptual" | "Procedural" | "Factual" | "Metacognitive" | "Transfer" | "Application";
  score: number;
  fullMark: number;
}

// ── Confidence Tier system ──────────────────────────────────────────────────

export type ConfidenceTier = "provisional" | "uncertain" | "developing" | "reliable";

export interface ConfidenceTierInfo {
  tier: ConfidenceTier;
  label: string;
  emoji: string;
  color: string;       // tailwind text color
  bgColor: string;     // tailwind bg color
  description: string;
}

export const CONFIDENCE_TIER_INFO: Record<ConfidenceTier, ConfidenceTierInfo> = {
  provisional: {
    tier: "provisional",
    label: "Provisional",
    emoji: "🔴",
    color: "text-red-400",
    bgColor: "bg-red-500/10 border-red-500/30",
    description: "< 10 interactions — too little data to trust",
  },
  uncertain: {
    tier: "uncertain",
    label: "Uncertain",
    emoji: "🟡",
    color: "text-yellow-400",
    bgColor: "bg-yellow-500/10 border-yellow-500/30",
    description: "Pattern doesn't fit trained profiles",
  },
  developing: {
    tier: "developing",
    label: "Developing",
    emoji: "🟠",
    color: "text-orange-400",
    bgColor: "bg-orange-500/10 border-orange-500/30",
    description: "Needs more data or confidence is moderate",
  },
  reliable: {
    tier: "reliable",
    label: "Reliable",
    emoji: "🟢",
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/10 border-emerald-500/30",
    description: "High confidence with sufficient data",
  },
};

/**
 * Compute the confidence tier from probability + interaction count.
 * Mirrors the backend _compute_confidence_tier logic.
 */
export function computeConfidenceTier(proba: number, interactionCount: number): ConfidenceTier {
  if (interactionCount < 10) return "provisional";
  if (proba < 0.55) return "uncertain";
  if (proba < 0.75 || interactionCount < 40) return "developing";
  return "reliable";
}

// ── Per-topic error profile ─────────────────────────────────────────────────

export interface TopicErrorProfile {
  topicId: string;
  /** 6-category radar scores for this specific topic */
  scores: ErrorCategoryScore[];
  /** XGBoost probability */
  confidence: number;
  /** Computed confidence tier */
  confidenceTier: ConfidenceTier;
  /** Number of quiz interactions for this topic */
  interactionCount: number;
  /** Out-of-distribution flag */
  isOod: boolean;
  /** Reason for OOD flag */
  oodReason: string;
  /** Primary error type detected */
  primaryErrorType: string;
  /** SHAP explanation */
  shapExplanation: string;
}

// Default per-topic profiles with varied realistic profiles
let _topicProfiles: Map<string, TopicErrorProfile> = new Map([
  ["linear-algebra", {
    topicId: "linear-algebra",
    scores: [
      { type: "Conceptual", score: 85, fullMark: 100 },
      { type: "Procedural", score: 70, fullMark: 100 },
      { type: "Factual", score: 92, fullMark: 100 },
      { type: "Metacognitive", score: 55, fullMark: 100 },
      { type: "Transfer", score: 78, fullMark: 100 },
      { type: "Application", score: 80, fullMark: 100 },
    ],
    confidence: 0.82,
    confidenceTier: "reliable",
    interactionCount: 47,
    isOod: false,
    oodReason: "",
    primaryErrorType: "Careless",
    shapExplanation: "Classified as careless (confidence 82%). Strongest signal: accuracy_variance = 0.045 (SHAP impact: +0.18). High overall accuracy but inconsistent — random slips.",
  }],
  ["calculus-ii", {
    topicId: "calculus-ii",
    scores: [
      { type: "Conceptual", score: 35, fullMark: 100 },
      { type: "Procedural", score: 28, fullMark: 100 },
      { type: "Factual", score: 60, fullMark: 100 },
      { type: "Metacognitive", score: 22, fullMark: 100 },
      { type: "Transfer", score: 30, fullMark: 100 },
      { type: "Application", score: 40, fullMark: 100 },
    ],
    confidence: 0.78,
    confidenceTier: "developing",
    interactionCount: 32,
    isOod: false,
    oodReason: "",
    primaryErrorType: "Conceptual",
    shapExplanation: "Classified as conceptual (confidence 78%). Strongest signal: accuracy = 0.350 (SHAP impact: -0.31). Low accuracy with high hint dependency — foundational gaps in integration techniques.",
  }],
  ["probability", {
    topicId: "probability",
    scores: [
      { type: "Conceptual", score: 72, fullMark: 100 },
      { type: "Procedural", score: 65, fullMark: 100 },
      { type: "Factual", score: 80, fullMark: 100 },
      { type: "Metacognitive", score: 45, fullMark: 100 },
      { type: "Transfer", score: 50, fullMark: 100 },
      { type: "Application", score: 58, fullMark: 100 },
    ],
    confidence: 0.61,
    confidenceTier: "developing",
    interactionCount: 22,
    isOod: false,
    oodReason: "",
    primaryErrorType: "Application",
    shapExplanation: "Classified as application (confidence 61%). Strongest signal: improvement_slope = -0.008 (SHAP impact: -0.14). Performance declining — likely memory decay on conditional probability.",
  }],
  ["statistics", {
    topicId: "statistics",
    scores: [
      { type: "Conceptual", score: 78, fullMark: 100 },
      { type: "Procedural", score: 72, fullMark: 100 },
      { type: "Factual", score: 85, fullMark: 100 },
      { type: "Metacognitive", score: 50, fullMark: 100 },
      { type: "Transfer", score: 65, fullMark: 100 },
      { type: "Application", score: 70, fullMark: 100 },
    ],
    confidence: 0.74,
    confidenceTier: "developing",
    interactionCount: 28,
    isOod: false,
    oodReason: "",
    primaryErrorType: "Time Constraint",
    shapExplanation: "Classified as time_constraint (confidence 74%). Strongest signal: timed_delta = 0.32 (SHAP impact: +0.22). Performs well untimed, struggles under pressure — test anxiety pattern.",
  }],
  ["discrete-math", {
    topicId: "discrete-math",
    scores: [
      { type: "Conceptual", score: 55, fullMark: 100 },
      { type: "Procedural", score: 40, fullMark: 100 },
      { type: "Factual", score: 70, fullMark: 100 },
      { type: "Metacognitive", score: 30, fullMark: 100 },
      { type: "Transfer", score: 38, fullMark: 100 },
      { type: "Application", score: 45, fullMark: 100 },
    ],
    confidence: 0.48,
    confidenceTier: "uncertain",
    interactionCount: 8,
    isOod: true,
    oodReason: "Unusual pattern — the classifier could not confidently match this behaviour to any known error type. We'll flag this for review rather than guess.",
    primaryErrorType: "Unknown",
    shapExplanation: "⚠️ Out-of-distribution: mixed error signals across categories. Accuracy (0.42) is low, but error patterns don't clearly match conceptual, careless, or time-constraint profiles.",
  }],
  ["differential-eq", {
    topicId: "differential-eq",
    scores: [
      { type: "Conceptual", score: 30, fullMark: 100 },
      { type: "Procedural", score: 25, fullMark: 100 },
      { type: "Factual", score: 50, fullMark: 100 },
      { type: "Metacognitive", score: 18, fullMark: 100 },
      { type: "Transfer", score: 22, fullMark: 100 },
      { type: "Application", score: 32, fullMark: 100 },
    ],
    confidence: 0.40,
    confidenceTier: "provisional",
    interactionCount: 6,
    isOod: false,
    oodReason: "",
    primaryErrorType: "Conceptual",
    shapExplanation: "Classified as conceptual (confidence 40%). ⚠️ Provisional — only 6 interactions. Strongest signal: hint_dependency = 0.67 (SHAP impact: -0.25).",
  }],
]);

// ── Global (aggregate) profile ──────────────────────────────────────────────

// Default scores (initial values matching mockData)
let _errorProfile: ErrorCategoryScore[] = [
  { type: "Conceptual", score: 72, fullMark: 100 },
  { type: "Procedural", score: 45, fullMark: 100 },
  { type: "Factual", score: 88, fullMark: 100 },
  { type: "Metacognitive", score: 31, fullMark: 100 },
  { type: "Transfer", score: 56, fullMark: 100 },
  { type: "Application", score: 63, fullMark: 100 },
];

// Track how many assessments have been made (for weighted averaging)
let _assessmentCount = 0;

// Simple reactive store with listeners
type Listener = () => void;
const listeners: Set<Listener> = new Set();

function notify() {
  listeners.forEach((l) => l());
}

/** Get the current error profile data (for the radar chart). */
export function getErrorProfile(): ErrorCategoryScore[] {
  return _errorProfile;
}

/** Get the number of assessments that have been made. */
export function getAssessmentCount(): number {
  return _assessmentCount;
}

/**
 * Update the error profile with new assessment scores.
 * Uses exponential moving average to smoothly adjust scores over time.
 *
 * @param newScores - Array of { type, score } from the latest quiz assessment
 */
export function updateErrorProfile(
  newScores: { type: string; score: number }[],
): void {
  _assessmentCount += 1;

  // Weight: new assessments have more impact early, stabilise over time
  // α = 0.4 for first few assessments, decreasing to 0.2 as more data comes in
  const alpha = Math.max(0.2, 0.6 / Math.sqrt(_assessmentCount));

  _errorProfile = _errorProfile.map((cat) => {
    const newScore = newScores.find(
      (s) => s.type.toLowerCase() === cat.type.toLowerCase(),
    );
    if (newScore) {
      // Exponential moving average: new = α * latest + (1 - α) * old
      const blended = Math.round(alpha * newScore.score + (1 - alpha) * cat.score);
      return { ...cat, score: Math.max(0, Math.min(100, blended)) };
    }
    return cat;
  });

  notify();
}

/** Reset the error profile to defaults. */
export function resetErrorProfile(): void {
  _errorProfile = [
    { type: "Conceptual", score: 72, fullMark: 100 },
    { type: "Procedural", score: 45, fullMark: 100 },
    { type: "Factual", score: 88, fullMark: 100 },
    { type: "Metacognitive", score: 31, fullMark: 100 },
    { type: "Transfer", score: 56, fullMark: 100 },
    { type: "Application", score: 63, fullMark: 100 },
  ];
  _assessmentCount = 0;
  notify();
}

/** Subscribe to changes in the error profile. Returns an unsubscribe function. */
export function subscribeErrorProfile(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// ── Per-topic API ───────────────────────────────────────────────────────────

/** Get the error profile for a specific topic (or null if not found). */
export function getTopicErrorProfile(topicId: string): TopicErrorProfile | null {
  return _topicProfiles.get(topicId) ?? null;
}

/** Get all per-topic error profiles. */
export function getAllTopicProfiles(): Map<string, TopicErrorProfile> {
  return _topicProfiles;
}

/** Update or insert a per-topic error profile. */
export function setTopicErrorProfile(topicId: string, profile: TopicErrorProfile): void {
  _topicProfiles = new Map(_topicProfiles);
  _topicProfiles.set(topicId, profile);
  notify();
}

/** Update per-topic scores after a quiz assessment for a specific topic. */
export function updateTopicErrorProfile(
  topicId: string,
  newScores: { type: string; score: number }[],
  confidence?: number,
  interactionCount?: number,
): void {
  const existing = _topicProfiles.get(topicId);
  if (!existing) return;

  const alpha = Math.max(0.2, 0.6 / Math.sqrt(Math.max(1, existing.interactionCount)));
  const updatedScores = existing.scores.map((cat) => {
    const ns = newScores.find((s) => s.type.toLowerCase() === cat.type.toLowerCase());
    if (ns) {
      const blended = Math.round(alpha * ns.score + (1 - alpha) * cat.score);
      return { ...cat, score: Math.max(0, Math.min(100, blended)) };
    }
    return cat;
  }) as ErrorCategoryScore[];

  const updatedCount = interactionCount ?? existing.interactionCount + 1;
  const updatedConf = confidence ?? existing.confidence;
  const updatedTier = computeConfidenceTier(updatedConf, updatedCount);

  _topicProfiles = new Map(_topicProfiles);
  _topicProfiles.set(topicId, {
    ...existing,
    scores: updatedScores,
    confidence: updatedConf,
    confidenceTier: updatedTier,
    interactionCount: updatedCount,
  });
  notify();
}
