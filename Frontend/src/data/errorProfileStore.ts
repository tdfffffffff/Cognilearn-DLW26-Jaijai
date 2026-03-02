/**
 * Reactive error profile store — tracks the 6-category cognitive error scores.
 *
 * Used by:
 * - QuizMe (Quiz Mode) → updates scores after AI assessment
 * - CognitiveFingerprint → reads scores for the hexagonal radar chart
 *
 * Categories: Conceptual, Procedural, Factual, Metacognitive, Transfer, Application
 */

export interface ErrorCategoryScore {
  type: "Conceptual" | "Procedural" | "Factual" | "Metacognitive" | "Transfer" | "Application";
  score: number;
  fullMark: number;
}

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
