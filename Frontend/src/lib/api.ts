/**
 * API helper for communicating with the backend.
 */

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

export interface SentenceAnalysis {
  original: string;
  verdict: "correct" | "partially_correct" | "incorrect";
  explanation: string;
  correction: string | null;
}

export interface VoiceAnalysisResult {
  topic: string;
  transcript: string;
  sentences: SentenceAnalysis[];
  missing_concepts: string[];
  overall_accuracy: number;
  feedback: string;
  strengths: string[];
  weaknesses: string[];
}

export interface GeneratedQuestion {
  question: string;
  answer: string;
  difficulty: "easy" | "medium" | "hard";
  source_reference: string;
  related_concepts: string[];
  hints: string[];
}

/** Analyse student's spoken understanding using OpenAI */
export async function analyzeVoiceUnderstanding(
  transcript: string,
  topic: string,
  materialsContext?: string,
): Promise<VoiceAnalysisResult> {
  const res = await fetch(`${API_BASE}/voice/analyze-understanding`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ transcript, topic, materials_context: materialsContext || null }),
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

/** Generate quiz questions from uploaded materials */
export async function generateQuizFromMaterials(
  topic: string,
  materialsText: string,
  numQuestions = 5,
): Promise<{ topic: string; questions: GeneratedQuestion[] }> {
  const res = await fetch(`${API_BASE}/quiz/generate-from-materials`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ topic, materials_text: materialsText, num_questions: numQuestions }),
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

/** Chat with AI tutor (Ask Mode) */
export async function chatWithTutor(
  message: string,
  topic: string,
  conversationHistory?: { role: string; content: string }[],
  materialsContext?: string,
): Promise<string> {
  const res = await fetch(`${API_BASE}/chat/tutor`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message,
      topic,
      conversation_history: conversationHistory || null,
      materials_context: materialsContext || null,
    }),
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const data = await res.json();
  return data.reply;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Quiz Mode — Text-based assessment with image support & 6-category error classification
// ═══════════════════════════════════════════════════════════════════════════════

export interface ErrorCategoryScore {
  type: "Conceptual" | "Procedural" | "Factual" | "Metacognitive" | "Transfer" | "Application";
  score: number;
}

export interface ErrorFound {
  category: string;
  description: string;
  correction: string;
}

export interface QuizAssessmentResult {
  assessment: string;
  score: number;
  error_classifications: ErrorCategoryScore[];
  errors_found: ErrorFound[];
  feedback: string;
  latex_solution: string;
}

export interface QuizQuestionGenerated {
  id: string;
  question: string;
  correct_answer: string;
  difficulty: "easy" | "medium" | "hard";
  hints: string[];
  topic_area: string;
}

/** Generate AI-powered quiz questions for a topic (text-based, with LaTeX) */
export async function generateQuizQuestions(
  topic: string,
  numQuestions = 5,
  materialsContext?: string,
): Promise<{ topic: string; questions: QuizQuestionGenerated[] }> {
  const res = await fetch(`${API_BASE}/quiz/generate-questions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      topic,
      num_questions: numQuestions,
      materials_context: materialsContext || null,
    }),
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

/** Assess a student's quiz answer (text or image) and classify errors into 6 categories */
export async function assessQuizAnswer(
  question: string,
  studentAnswer: string,
  topic: string,
  imageBase64?: string,
  materialsContext?: string,
): Promise<QuizAssessmentResult> {
  const res = await fetch(`${API_BASE}/quiz/assess-answer`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      question,
      student_answer: studentAnswer,
      topic,
      image_base64: imageBase64 || null,
      materials_context: materialsContext || null,
    }),
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

// ═══════════════════════════════════════════════════════════════════════════════
// Emergency Mode — Generate flashcards with key concepts for rapid revision
// ═══════════════════════════════════════════════════════════════════════════════

export interface EmergencyFlashcard {
  id: string;
  /** Concept / theorem / key idea title */
  title: string;
  /** Front of card — a question or title about the concept */
  front: string;
  /** Back of card — brief explanation or intuition */
  back: string;
  /** Full detailed explanation shown when user clicks "Explain" —
   *  uses **bold** markdown for key terms */
  detailedExplanation: string;
  /** Importance tag */
  importance: "critical" | "important" | "supplementary";
  /** Category: theorem, concept, formula, intuition, definition */
  category: string;
}

/** Generate emergency flashcards for rapid pre-exam revision */
export async function generateEmergencyFlashcards(
  topic: string,
  numCards = 10,
  materialsContext?: string,
): Promise<{ topic: string; flashcards: EmergencyFlashcard[] }> {
  const res = await fetch(`${API_BASE}/quiz/emergency-flashcards`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      topic,
      num_cards: numCards,
      materials_context: materialsContext || null,
    }),
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}
