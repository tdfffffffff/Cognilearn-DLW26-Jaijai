// ============ COGNITIVE FINGERPRINT DATA ============
export const errorTypeRadar = [
  { type: "Conceptual", score: 72, fullMark: 100 },
  { type: "Procedural", score: 45, fullMark: 100 },
  { type: "Factual", score: 88, fullMark: 100 },
  { type: "Metacognitive", score: 31, fullMark: 100 },
  { type: "Transfer", score: 56, fullMark: 100 },
  { type: "Application", score: 63, fullMark: 100 },
];

export const topicBreakdown = [
  { topic: "Linear Algebra", mastery: 82, errors: 5, riskLevel: "good" as const },
  { topic: "Calculus II", mastery: 45, errors: 18, riskLevel: "critical" as const },
  { topic: "Probability", mastery: 68, errors: 9, riskLevel: "moderate" as const },
  { topic: "Statistics", mastery: 73, errors: 7, riskLevel: "good" as const },
  { topic: "Discrete Math", mastery: 55, errors: 14, riskLevel: "risk" as const },
  { topic: "Differential Eq.", mastery: 38, errors: 21, riskLevel: "critical" as const },
];

export const shapExplanations = [
  {
    feature: "Time spent on integration problems",
    impact: 0.34,
    direction: "negative" as const,
    explanation: "Spending significantly more time than peers on integration suggests a gap in foundational techniques like substitution and parts.",
  },
  {
    feature: "Error pattern: sign errors in chain rule",
    impact: 0.28,
    direction: "negative" as const,
    explanation: "Recurring sign errors during chain rule application indicate a procedural weakness, not a conceptual one.",
  },
  {
    feature: "Strong performance on matrix operations",
    impact: 0.22,
    direction: "positive" as const,
    explanation: "Consistent accuracy in matrix operations shows solid procedural knowledge in linear algebra.",
  },
  {
    feature: "Spaced repetition adherence",
    impact: 0.18,
    direction: "positive" as const,
    explanation: "Following the spaced repetition schedule has measurably improved retention in Statistics topics.",
  },
];

// ============ STUDY BRIEF DATA ============
export const riskTopics = [
  { topic: "Integration by Parts", risk: 0.89, decay: "fast", nextReview: "Today" },
  { topic: "Taylor Series", risk: 0.76, decay: "moderate", nextReview: "Today" },
  { topic: "Eigenvalues", risk: 0.62, decay: "slow", nextReview: "Tomorrow" },
  { topic: "Bayes' Theorem", risk: 0.54, decay: "moderate", nextReview: "Tomorrow" },
];

export const deepWorkWindows = [
  { start: "09:00", end: "11:30", type: "deep" as const, topic: "Calculus II - Integration" },
  { start: "11:30", end: "11:45", type: "break" as const, topic: "Adaptive Break" },
  { start: "11:45", end: "13:00", type: "deep" as const, topic: "Differential Equations" },
  { start: "13:00", end: "14:00", type: "break" as const, topic: "Lunch Break" },
  { start: "14:00", end: "15:30", type: "light" as const, topic: "Statistics Review" },
  { start: "15:30", end: "15:45", type: "break" as const, topic: "Adaptive Break" },
  { start: "15:45", end: "17:00", type: "deep" as const, topic: "Linear Algebra Practice" },
];

export const momentumState = {
  state: "building" as const,
  streak: 4,
  todayProgress: 65,
  weeklyTrend: [45, 52, 60, 58, 72, 65, 70],
};

// ============ KNOWLEDGE GRAPH DATA ============
export interface GraphNode {
  id: string;
  label: string;
  risk: "excellent" | "good" | "moderate" | "risk" | "critical";
  group: string;
  mastery: number;
}

export interface GraphLink {
  source: string;
  target: string;
  strength: number;
}

export const knowledgeGraphNodes: GraphNode[] = [
  { id: "calc-limits", label: "Limits", risk: "excellent", group: "Calculus", mastery: 92 },
  { id: "calc-derivatives", label: "Derivatives", risk: "good", group: "Calculus", mastery: 78 },
  { id: "calc-integrals", label: "Integrals", risk: "critical", group: "Calculus", mastery: 38 },
  { id: "calc-series", label: "Series", risk: "risk", group: "Calculus", mastery: 52 },
  { id: "calc-taylor", label: "Taylor Series", risk: "critical", group: "Calculus", mastery: 35 },
  { id: "la-vectors", label: "Vectors", risk: "excellent", group: "Linear Algebra", mastery: 90 },
  { id: "la-matrices", label: "Matrices", risk: "good", group: "Linear Algebra", mastery: 82 },
  { id: "la-eigen", label: "Eigenvalues", risk: "moderate", group: "Linear Algebra", mastery: 62 },
  { id: "la-transforms", label: "Transforms", risk: "risk", group: "Linear Algebra", mastery: 48 },
  { id: "prob-basic", label: "Basic Probability", risk: "good", group: "Probability", mastery: 80 },
  { id: "prob-bayes", label: "Bayes' Theorem", risk: "moderate", group: "Probability", mastery: 58 },
  { id: "prob-distributions", label: "Distributions", risk: "good", group: "Probability", mastery: 74 },
  { id: "stat-hypothesis", label: "Hypothesis Testing", risk: "moderate", group: "Statistics", mastery: 65 },
  { id: "stat-regression", label: "Regression", risk: "risk", group: "Statistics", mastery: 50 },
  { id: "de-first", label: "First Order DE", risk: "risk", group: "Diff. Equations", mastery: 45 },
  { id: "de-second", label: "Second Order DE", risk: "critical", group: "Diff. Equations", mastery: 30 },
];

export const knowledgeGraphLinks: GraphLink[] = [
  { source: "calc-limits", target: "calc-derivatives", strength: 0.9 },
  { source: "calc-derivatives", target: "calc-integrals", strength: 0.85 },
  { source: "calc-integrals", target: "calc-series", strength: 0.7 },
  { source: "calc-series", target: "calc-taylor", strength: 0.9 },
  { source: "la-vectors", target: "la-matrices", strength: 0.8 },
  { source: "la-matrices", target: "la-eigen", strength: 0.85 },
  { source: "la-eigen", target: "la-transforms", strength: 0.75 },
  { source: "prob-basic", target: "prob-bayes", strength: 0.8 },
  { source: "prob-basic", target: "prob-distributions", strength: 0.7 },
  { source: "prob-distributions", target: "stat-hypothesis", strength: 0.6 },
  { source: "stat-hypothesis", target: "stat-regression", strength: 0.7 },
  { source: "calc-derivatives", target: "de-first", strength: 0.8 },
  { source: "de-first", target: "de-second", strength: 0.9 },
  { source: "la-matrices", target: "de-second", strength: 0.5 },
  { source: "calc-integrals", target: "de-first", strength: 0.6 },
  { source: "la-eigen", target: "de-second", strength: 0.65 },
];

// ============ FORGETTING CURVE DATA ============
export const forgettingCurveData = [
  { day: 0, "Integration": 100, "Taylor Series": 100, "Eigenvalues": 100, "Bayes": 100 },
  { day: 1, "Integration": 72, "Taylor Series": 68, "Eigenvalues": 80, "Bayes": 75 },
  { day: 2, "Integration": 55, "Taylor Series": 50, "Eigenvalues": 72, "Bayes": 65 },
  { day: 3, "Integration": 42, "Taylor Series": 38, "Eigenvalues": 66, "Bayes": 58 },
  { day: 5, "Integration": 30, "Taylor Series": 25, "Eigenvalues": 58, "Bayes": 48 },
  { day: 7, "Integration": 22, "Taylor Series": 18, "Eigenvalues": 52, "Bayes": 42 },
  { day: 14, "Integration": 12, "Taylor Series": 10, "Eigenvalues": 40, "Bayes": 30 },
];

// ============ ATTENTION MONITOR DATA ============
export const attentionStates = [
  { time: "09:00", state: "focused" as const, ear: 0.32, fatigue: 12 },
  { time: "09:15", state: "focused" as const, ear: 0.30, fatigue: 15 },
  { time: "09:30", state: "focused" as const, ear: 0.31, fatigue: 18 },
  { time: "09:45", state: "engaged" as const, ear: 0.29, fatigue: 22 },
  { time: "10:00", state: "focused" as const, ear: 0.28, fatigue: 28 },
  { time: "10:15", state: "wandering" as const, ear: 0.24, fatigue: 35 },
  { time: "10:30", state: "drowsy" as const, ear: 0.20, fatigue: 48 },
  { time: "10:45", state: "drowsy" as const, ear: 0.18, fatigue: 55 },
  { time: "11:00", state: "break" as const, ear: 0.0, fatigue: 40 },
  { time: "11:15", state: "focused" as const, ear: 0.31, fatigue: 20 },
  { time: "11:30", state: "focused" as const, ear: 0.33, fatigue: 22 },
  { time: "11:45", state: "engaged" as const, ear: 0.30, fatigue: 26 },
  { time: "12:00", state: "focused" as const, ear: 0.29, fatigue: 30 },
];

export const currentAttention = {
  state: "focused" as const,
  confidence: 0.87,
  ear: 0.29,
  fatigueLevel: 30,
  sessionDuration: "2h 45m",
  alertsToday: 3,
};

export const fatigueAlerts = [
  { time: "10:15", type: "warning" as const, message: "Attention wandering detected. Consider a micro-break." },
  { time: "10:30", type: "critical" as const, message: "Drowsiness detected (EAR: 0.20). Break recommended." },
  { time: "10:45", type: "critical" as const, message: "Sustained drowsiness. Auto-triggered break reminder." },
];

// ============ TEACH ME DATA ============
export const sampleTranscription = `I'm trying to understand integration by parts. So we have the formula u dv equals uv minus the integral of v du. But I keep getting confused about when to choose u and when to choose dv. Like for the integral of x times e to the x, I know x should be u but I don't really understand why.`;

export const extractedKeywords = [
  { word: "integration by parts", relevance: 0.95, isGap: true },
  { word: "u dv formula", relevance: 0.88, isGap: false },
  { word: "choosing u and dv", relevance: 0.92, isGap: true },
  { word: "LIATE rule", relevance: 0.85, isGap: true },
  { word: "e to the x", relevance: 0.70, isGap: false },
];

export const ragExplanation = {
  title: "Integration by Parts: Choosing u and dv",
  content: `The LIATE rule helps you choose which function to set as **u**:

**L** - Logarithmic functions (ln x, log x)
**I** - Inverse trig functions (arcsin, arctan)
**A** - Algebraic functions (x², x³, polynomials)
**T** - Trigonometric functions (sin, cos, tan)
**E** - Exponential functions (eˣ, 2ˣ)

Choose **u** from higher in the list, and **dv** from lower.

For ∫x·eˣdx: x is Algebraic (A) and eˣ is Exponential (E). Since A comes before E in LIATE, let u = x and dv = eˣdx.`,
  relatedConcepts: ["Tabular integration", "Reduction formulas", "Integration techniques"],
};

// ============ MY DATA / PRIVACY ============
export const storedDataCategories = [
  { category: "Practice Responses", items: 342, size: "2.1 MB", retention: "Until deletion" },
  { category: "Error Classifications", items: 156, size: "0.4 MB", retention: "Until deletion" },
  { category: "Attention States", items: 1205, size: "1.8 MB", retention: "30 days" },
  { category: "Knowledge Graph", items: 16, size: "0.1 MB", retention: "Until deletion" },
  { category: "Study Session Logs", items: 28, size: "0.3 MB", retention: "90 days" },
  { category: "Voice Transcriptions", items: 12, size: "0.8 MB", retention: "7 days" },
];

export const auditLog = [
  { timestamp: "2026-03-01 10:23:14", action: "Model inference", detail: "Error classifier ran on practice set #42", actor: "System" },
  { timestamp: "2026-03-01 09:45:02", action: "Data collection", detail: "Attention state recorded (focused)", actor: "System" },
  { timestamp: "2026-02-28 16:30:00", action: "Human override", detail: "Error label corrected: Procedural → Conceptual", actor: "Student" },
  { timestamp: "2026-02-28 14:12:33", action: "Data export", detail: "Full dataset exported as JSON", actor: "Student" },
  { timestamp: "2026-02-28 11:00:15", action: "Model inference", detail: "Knowledge graph updated with new mastery scores", actor: "System" },
  { timestamp: "2026-02-27 09:00:00", action: "Study brief generated", detail: "Daily adaptive plan created", actor: "System" },
  { timestamp: "2026-02-26 15:45:22", action: "Maker-Checker validation", detail: "AI prediction flagged for review: low confidence (0.42)", actor: "System" },
  { timestamp: "2026-02-26 10:30:00", action: "Privacy action", detail: "Voice transcriptions auto-deleted (7-day policy)", actor: "System" },
];
