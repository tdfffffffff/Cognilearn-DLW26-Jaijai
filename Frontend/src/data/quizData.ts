// ============ QUIZ DATA ============

export type QuizFormat = "working" | "flashcard" | "open-ended";
export type Discipline = "math" | "science" | "history" | "psychology" | "literature" | "geography";

export interface QuizQuestion {
  id: string;
  discipline: Discipline;
  format: QuizFormat;
  topic: string;
  difficulty: "easy" | "medium" | "hard";
  question: string;
  /** For working questions: step-by-step solution */
  steps?: string[];
  /** For flashcards: the answer on the back */
  answer: string;
  /** Hints or partial solutions */
  hints?: string[];
  /** Related concepts for improvement */
  relatedConcepts: string[];
  /** Expected error types */
  commonErrors: string[];
}

export const quizQuestions: QuizQuestion[] = [
  // ── MATH: Working Questions ──
  {
    id: "math-1",
    discipline: "math",
    format: "working",
    topic: "Integration by Parts",
    difficulty: "medium",
    question: "Evaluate the integral: ∫ x·eˣ dx",
    steps: [
      "Let u = x, so du = dx",
      "Let dv = eˣ dx, so v = eˣ",
      "Apply ∫u dv = uv − ∫v du",
      "= x·eˣ − ∫eˣ dx",
      "= x·eˣ − eˣ + C",
    ],
    answer: "x·eˣ − eˣ + C",
    hints: ["Use the LIATE rule to choose u", "What's the derivative of x?"],
    relatedConcepts: ["LIATE rule", "Tabular integration", "Exponential integrals"],
    commonErrors: ["Swapping u and dv", "Forgetting the constant C", "Sign error in subtraction"],
  },
  {
    id: "math-2",
    discipline: "math",
    format: "working",
    topic: "Eigenvalues",
    difficulty: "hard",
    question: "Find the eigenvalues of the matrix A = [[3, 1], [0, 2]]",
    steps: [
      "Set up det(A − λI) = 0",
      "det([[3−λ, 1], [0, 2−λ]]) = 0",
      "(3−λ)(2−λ) − 0 = 0",
      "λ² − 5λ + 6 = 0",
      "(λ−3)(λ−2) = 0",
      "λ₁ = 3, λ₂ = 2",
    ],
    answer: "λ₁ = 3, λ₂ = 2",
    hints: ["Use the characteristic equation det(A − λI) = 0", "This is an upper triangular matrix"],
    relatedConcepts: ["Characteristic polynomial", "Eigenvectors", "Diagonalization"],
    commonErrors: ["Incorrect determinant expansion", "Arithmetic error in polynomial", "Forgetting to check multiplicity"],
  },
  {
    id: "math-3",
    discipline: "math",
    format: "working",
    topic: "Taylor Series",
    difficulty: "hard",
    question: "Find the first 4 terms of the Taylor series for f(x) = sin(x) centered at a = 0.",
    steps: [
      "f(x) = sin(x), f(0) = 0",
      "f'(x) = cos(x), f'(0) = 1",
      "f''(x) = −sin(x), f''(0) = 0",
      "f'''(x) = −cos(x), f'''(0) = −1",
      "T(x) = 0 + x + 0 − x³/3! + ...",
      "= x − x³/6 + x⁵/120 − x⁷/5040",
    ],
    answer: "x − x³/6 + x⁵/120 − x⁷/5040",
    hints: ["Recall derivatives of sin cycle every 4", "Evaluate each derivative at x = 0"],
    relatedConcepts: ["Maclaurin series", "Convergence radius", "Power series"],
    commonErrors: ["Wrong factorial", "Missing alternating signs", "Incorrect derivative cycle"],
  },

  // ── SCIENCE: Flashcards ──
  {
    id: "sci-1",
    discipline: "science",
    format: "flashcard",
    topic: "Cell Biology",
    difficulty: "easy",
    question: "What is the powerhouse of the cell and what process does it perform?",
    answer: "The mitochondria. It performs cellular respiration (oxidative phosphorylation) to produce ATP, the cell's energy currency.",
    relatedConcepts: ["ATP synthesis", "Krebs cycle", "Electron transport chain"],
    commonErrors: ["Confusing with chloroplasts", "Mixing up ATP and ADP roles"],
  },
  {
    id: "sci-2",
    discipline: "science",
    format: "flashcard",
    topic: "Organic Chemistry",
    difficulty: "medium",
    question: "What is the difference between SN1 and SN2 reactions?",
    answer: "SN1: two-step, carbocation intermediate, favors tertiary substrates, racemization. SN2: one-step, backside attack, favors primary substrates, inversion of configuration.",
    relatedConcepts: ["Nucleophilic substitution", "Stereochemistry", "Leaving groups"],
    commonErrors: ["Confusing substrate preferences", "Mixing up stereochemical outcomes"],
  },

  // ── HISTORY: Open-ended ──
  {
    id: "hist-1",
    discipline: "history",
    format: "open-ended",
    topic: "World War II",
    difficulty: "medium",
    question: "Explain how the Treaty of Versailles contributed to the rise of Nazi Germany. Consider economic, political, and social factors.",
    answer: "The Treaty of Versailles (1919) imposed severe reparations on Germany causing hyperinflation and economic collapse. The 'war guilt clause' created national humiliation and resentment. Political instability in the Weimar Republic, combined with the Great Depression, created conditions where extremist parties like the NSDAP could gain popular support by promising to restore German greatness and reject the treaty's terms.",
    hints: ["Consider the economic burden of reparations", "Think about national pride and the 'stab in the back' myth"],
    relatedConcepts: ["Weimar Republic", "Hyperinflation", "Appeasement policy"],
    commonErrors: ["Oversimplifying causation", "Ignoring economic factors", "Treating it as sole cause"],
  },

  // ── PSYCHOLOGY: Open-ended ──
  {
    id: "psych-1",
    discipline: "psychology",
    format: "open-ended",
    topic: "Cognitive Development",
    difficulty: "medium",
    question: "Compare and contrast Piaget's stages of cognitive development with Vygotsky's Zone of Proximal Development. Which theory better explains learning in a classroom setting?",
    answer: "Piaget proposed four fixed stages (sensorimotor, preoperational, concrete operational, formal operational) suggesting children develop through internal maturation. Vygotsky emphasized social interaction and the ZPD—the gap between what a learner can do alone vs. with guidance. In classrooms, Vygotsky's theory is often more applicable as it supports scaffolding, collaborative learning, and the role of teachers as guides, while Piaget's framework helps understand developmental readiness.",
    hints: ["Consider the role of social interaction in each theory", "Think about practical classroom applications"],
    relatedConcepts: ["Scaffolding", "Constructivism", "Social learning theory"],
    commonErrors: ["Treating theories as mutually exclusive", "Ignoring cultural context", "Oversimplifying stages"],
  },

  // ── LITERATURE: Open-ended ──
  {
    id: "lit-1",
    discipline: "literature",
    format: "open-ended",
    topic: "Shakespeare",
    difficulty: "medium",
    question: "Analyze how Shakespeare uses the motif of 'appearance vs. reality' in Macbeth. Provide at least two specific examples from the text.",
    answer: "Shakespeare weaves 'appearance vs. reality' throughout Macbeth. Lady Macbeth instructs Macbeth to 'look like the innocent flower, but be the serpent under't' (1.5), embodying deliberate deception. The witches' prophecies appear to promise invincibility but lead to Macbeth's downfall—Birnam Wood 'moving' and Macduff not being 'of woman born' twist literal expectations. The motif reinforces the play's exploration of moral corruption and self-deception.",
    hints: ["Consider the witches' equivocations", "Look at Lady Macbeth's advice about deception"],
    relatedConcepts: ["Dramatic irony", "Tragic hero", "Equivocation"],
    commonErrors: ["Surface-level analysis", "Not citing specific textual evidence", "Confusing theme with motif"],
  },

  // ── GEOGRAPHY: Open-ended ──
  {
    id: "geo-1",
    discipline: "geography",
    format: "open-ended",
    topic: "Climate Systems",
    difficulty: "medium",
    question: "Explain how El Niño events affect global weather patterns. Discuss impacts on at least three different regions.",
    answer: "El Niño occurs when trade winds weaken, allowing warm water to spread eastward across the Pacific. Effects include: (1) South America (Peru/Ecuador): increased rainfall and flooding due to warm coastal waters; (2) Southeast Asia/Australia: drought conditions as the warm pool shifts east, leading to bushfires; (3) East Africa: above-average rainfall and flooding. Additionally, the southern US experiences wetter winters, and the Indian monsoon can weaken, affecting agriculture for billions.",
    hints: ["Start with the mechanism in the Pacific Ocean", "Consider the Walker Circulation"],
    relatedConcepts: ["La Niña", "Walker Circulation", "ENSO cycle", "Teleconnections"],
    commonErrors: ["Confusing El Niño with La Niña", "Only discussing one region", "Ignoring the oceanic mechanism"],
  },
];

// ── Error Classifier Summary Types ──
export interface ErrorClassification {
  type: string;
  count: number;
  percentage: number;
  description: string;
  severity: "low" | "medium" | "high";
}

export const sampleErrorReport: ErrorClassification[] = [
  { type: "Conceptual", count: 3, percentage: 30, description: "Misunderstanding core concepts or theories", severity: "high" },
  { type: "Procedural", count: 2, percentage: 20, description: "Errors in applying methods or formulas", severity: "medium" },
  { type: "Careless", count: 2, percentage: 20, description: "Arithmetic or transcription mistakes", severity: "low" },
  { type: "Transfer Failure", count: 1, percentage: 10, description: "Unable to apply knowledge to new contexts", severity: "high" },
  { type: "Knowledge Gap", count: 1, percentage: 10, description: "Missing prerequisite knowledge", severity: "medium" },
  { type: "Misconception", count: 1, percentage: 10, description: "Holding incorrect mental models", severity: "high" },
];

export const disciplineConfig: Record<Discipline, { label: string; color: string; icon: string; formatLabel: string }> = {
  math: { label: "Mathematics", color: "hsl(var(--chart-1))", icon: "📐", formatLabel: "Working Questions" },
  science: { label: "Science", color: "hsl(var(--chart-4))", icon: "🔬", formatLabel: "Flashcards" },
  history: { label: "History", color: "hsl(var(--chart-3))", icon: "📜", formatLabel: "Open-ended" },
  psychology: { label: "Psychology", color: "hsl(var(--chart-2))", icon: "🧠", formatLabel: "Open-ended" },
  literature: { label: "Literature", color: "hsl(var(--chart-5))", icon: "📚", formatLabel: "Open-ended" },
  geography: { label: "Geography", color: "hsl(var(--cognitive-good))", icon: "🌍", formatLabel: "Open-ended" },
};
