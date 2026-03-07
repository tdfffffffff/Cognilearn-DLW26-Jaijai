/**
 * Local Question Bank — offline quiz database for all 6 subjects × 4 difficulty levels.
 *
 * Structure mirrors QuizQuestionGenerated from api.ts so it can be used as a
 * drop-in replacement when AI generation is unavailable or unnecessary.
 *
 * Difficulty levels:
 *   easy        — recall, definitions, direct computation
 *   medium      — apply concepts, straightforward multi-step
 *   hard        — analysis, synthesis, proof sketches
 *   even_harder — olympiad / competition-style, creative reasoning
 */

import type { QuizQuestionGenerated } from "@/lib/api";

export type Difficulty = "easy" | "medium" | "hard" | "even_harder";

export interface QuestionBankEntry extends QuizQuestionGenerated {
  /** Topic store id this question belongs to */
  topic_id: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
//  LINEAR ALGEBRA
// ═══════════════════════════════════════════════════════════════════════════════

const LINEAR_ALGEBRA: QuestionBankEntry[] = [
  // ── easy ──
  {
    id: "la-e1", topic_id: "linear-algebra", difficulty: "easy", topic_area: "Vectors",
    question: "Compute the dot product of $\\vec{u} = (2, -1, 3)$ and $\\vec{v} = (4, 0, -2)$.",
    correct_answer: "$\\vec{u} \\cdot \\vec{v} = 2(4) + (-1)(0) + 3(-2) = 8 + 0 - 6 = 2$",
    hints: ["Multiply corresponding components and sum."],
  },
  {
    id: "la-e2", topic_id: "linear-algebra", difficulty: "easy", topic_area: "Matrices",
    question: "Find the determinant of $A = \\begin{pmatrix} 3 & 1 \\\\ 2 & 5 \\end{pmatrix}$.",
    correct_answer: "$\\det(A) = 3 \\cdot 5 - 1 \\cdot 2 = 13$",
    hints: ["For a 2×2 matrix $\\begin{pmatrix} a&b\\\\c&d \\end{pmatrix}$, $\\det = ad - bc$."],
  },
  {
    id: "la-e3", topic_id: "linear-algebra", difficulty: "easy", topic_area: "Matrix Operations",
    question: "If $A = \\begin{pmatrix} 1 & 2 \\\\ 3 & 4 \\end{pmatrix}$, what is $2A$?",
    correct_answer: "$2A = \\begin{pmatrix} 2 & 4 \\\\ 6 & 8 \\end{pmatrix}$",
    hints: ["Multiply every entry by the scalar."],
  },
  {
    id: "la-e4", topic_id: "linear-algebra", difficulty: "easy", topic_area: "Linear Systems",
    question: "Solve the system: $x + y = 5$, $x - y = 1$.",
    correct_answer: "Adding the equations: $2x = 6 \\Rightarrow x = 3$, $y = 2$.",
    hints: ["Add or subtract the equations to eliminate a variable."],
  },
  {
    id: "la-e5", topic_id: "linear-algebra", difficulty: "easy", topic_area: "Vectors",
    question: "What is the magnitude of the vector $\\vec{v} = (3, 4)$?",
    correct_answer: "$|\\vec{v}| = \\sqrt{3^2 + 4^2} = \\sqrt{25} = 5$",
    hints: ["Use $|\\vec{v}| = \\sqrt{v_1^2 + v_2^2}$."],
  },
  {
    id: "la-e6", topic_id: "linear-algebra", difficulty: "easy", topic_area: "Matrix Operations",
    question: "Find the transpose of $B = \\begin{pmatrix} 1 & 3 \\\\ 2 & 4 \\\\ 5 & 6 \\end{pmatrix}$.",
    correct_answer: "$B^T = \\begin{pmatrix} 1 & 2 & 5 \\\\ 3 & 4 & 6 \\end{pmatrix}$",
    hints: ["Swap rows and columns."],
  },
  // ── medium ──
  {
    id: "la-m1", topic_id: "linear-algebra", difficulty: "medium", topic_area: "Eigenvalues",
    question: "Find the eigenvalues of $A = \\begin{pmatrix} 4 & 1 \\\\ 2 & 3 \\end{pmatrix}$.",
    correct_answer: "$\\det(A - \\lambda I) = (4-\\lambda)(3-\\lambda) - 2 = \\lambda^2 - 7\\lambda + 10 = 0$. So $\\lambda = 5$ or $\\lambda = 2$.",
    hints: ["Solve $\\det(A - \\lambda I) = 0$."],
  },
  {
    id: "la-m2", topic_id: "linear-algebra", difficulty: "medium", topic_area: "Linear Independence",
    question: "Are the vectors $\\{(1,2,3),\\; (4,5,6),\\; (7,8,9)\\}$ linearly independent?",
    correct_answer: "No. The determinant of the matrix with these as rows is $0$. Note $(7,8,9) = 2(4,5,6) - (1,2,3)$.",
    hints: ["Form a matrix and compute its determinant.", "If det = 0 the vectors are dependent."],
  },
  {
    id: "la-m3", topic_id: "linear-algebra", difficulty: "medium", topic_area: "Matrix Inverse",
    question: "Find $A^{-1}$ for $A = \\begin{pmatrix} 2 & 1 \\\\ 5 & 3 \\end{pmatrix}$.",
    correct_answer: "$\\det(A) = 1$. $A^{-1} = \\begin{pmatrix} 3 & -1 \\\\ -5 & 2 \\end{pmatrix}$.",
    hints: ["$A^{-1} = \\frac{1}{\\det(A)}\\begin{pmatrix} d & -b \\\\ -c & a \\end{pmatrix}$"],
  },
  {
    id: "la-m4", topic_id: "linear-algebra", difficulty: "medium", topic_area: "Vector Spaces",
    question: "Let $W = \\{(x,y,z) \\in \\mathbb{R}^3 : x + 2y - z = 0\\}$. Find a basis for $W$.",
    correct_answer: "Setting $y=t, z=s$: $x = -2t+s$, so $(x,y,z) = t(-2,1,0) + s(1,0,1)$. Basis: $\\{(-2,1,0),\\;(1,0,1)\\}$.",
    hints: ["Express one variable in terms of the others."],
  },
  {
    id: "la-m5", topic_id: "linear-algebra", difficulty: "medium", topic_area: "Orthogonality",
    question: "Find the projection of $\\vec{u} = (3, 4)$ onto $\\vec{v} = (1, 0)$.",
    correct_answer: "$\\text{proj}_{\\vec{v}} \\vec{u} = \\frac{\\vec{u} \\cdot \\vec{v}}{\\vec{v} \\cdot \\vec{v}} \\vec{v} = \\frac{3}{1}(1,0) = (3,0)$.",
    hints: ["$\\text{proj}_{\\vec{v}} \\vec{u} = \\frac{\\vec{u} \\cdot \\vec{v}}{|\\vec{v}|^2}\\vec{v}$"],
  },
  {
    id: "la-m6", topic_id: "linear-algebra", difficulty: "medium", topic_area: "Determinants",
    question: "Compute $\\det\\begin{pmatrix} 1 & 2 & 3 \\\\ 0 & 4 & 5 \\\\ 0 & 0 & 6 \\end{pmatrix}$.",
    correct_answer: "For an upper triangular matrix, $\\det = 1 \\cdot 4 \\cdot 6 = 24$.",
    hints: ["The determinant of a triangular matrix is the product of diagonal entries."],
  },
  // ── hard ──
  {
    id: "la-h1", topic_id: "linear-algebra", difficulty: "hard", topic_area: "Diagonalization",
    question: "Diagonalize $A = \\begin{pmatrix} 2 & 1 \\\\ 0 & 3 \\end{pmatrix}$ by finding $P$ and $D$ such that $A = PDP^{-1}$.",
    correct_answer: "Eigenvalues: $\\lambda_1=2, \\lambda_2=3$. Eigenvectors: $v_1=(1,0), v_2=(1,1)$. $P=\\begin{pmatrix}1&1\\\\0&1\\end{pmatrix}$, $D=\\begin{pmatrix}2&0\\\\0&3\\end{pmatrix}$.",
    hints: ["Find eigenvalues, then eigenvectors for each.", "$P$ is the matrix of eigenvectors."],
  },
  {
    id: "la-h2", topic_id: "linear-algebra", difficulty: "hard", topic_area: "Linear Transformations",
    question: "Let $T: \\mathbb{R}^3 \\to \\mathbb{R}^3$ be defined by $T(x,y,z) = (x+y, y+z, x+z)$. Find $\\ker(T)$ and its dimension.",
    correct_answer: "Setting $T(x,y,z)=0$: $x+y=0, y+z=0, x+z=0$. From the first two: $x=-y, z=-y$, and checking: $x+z=-2y=0 \\Rightarrow y=0$. So $\\ker(T)=\\{\\vec{0}\\}$, $\\dim(\\ker T) = 0$.",
    hints: ["Solve the homogeneous system $T(x,y,z)=\\vec{0}$."],
  },
  {
    id: "la-h3", topic_id: "linear-algebra", difficulty: "hard", topic_area: "Singular Value Decomposition",
    question: "Find the singular values of $A = \\begin{pmatrix} 3 & 0 \\\\ 0 & -2 \\end{pmatrix}$.",
    correct_answer: "Singular values are the square roots of eigenvalues of $A^TA = \\begin{pmatrix}9&0\\\\0&4\\end{pmatrix}$. So $\\sigma_1 = 3$, $\\sigma_2 = 2$.",
    hints: ["Compute $A^TA$ and find its eigenvalues.", "Singular values = square roots of eigenvalues of $A^TA$."],
  },
  {
    id: "la-h4", topic_id: "linear-algebra", difficulty: "hard", topic_area: "Cayley–Hamilton",
    question: "Verify the Cayley–Hamilton theorem for $A=\\begin{pmatrix}1&2\\\\3&4\\end{pmatrix}$.",
    correct_answer: "Characteristic polynomial: $p(\\lambda)=\\lambda^2, -5\\lambda -2$. $A^2=\\begin{pmatrix}7&10\\\\15&22\\end{pmatrix}$. $A^2-5A-2I=\\begin{pmatrix}7-5-2&10-10\\\\15-15&22-20-2\\end{pmatrix}=0$. ✓",
    hints: ["Find the characteristic polynomial, then plug in the matrix."],
  },
  {
    id: "la-h5", topic_id: "linear-algebra", difficulty: "hard", topic_area: "Jordan Normal Form",
    question: "Find the Jordan form of $A = \\begin{pmatrix} 5 & 1 \\\\ 0 & 5 \\end{pmatrix}$.",
    correct_answer: "$A$ has eigenvalue $\\lambda=5$ with algebraic multiplicity 2 but geometric multiplicity 1 (only one independent eigenvector). Jordan form is $J = \\begin{pmatrix} 5 & 1 \\\\ 0 & 5 \\end{pmatrix}$, which is $A$ itself.",
    hints: ["Check if $A-5I$ is the zero matrix.", "If not, the Jordan block has a 1 on the super-diagonal."],
  },
  // ── even_harder (olympiad) ──
  {
    id: "la-o1", topic_id: "linear-algebra", difficulty: "even_harder", topic_area: "Matrix Theory",
    question: "Let $A$ be an $n \\times n$ matrix such that $A^3 = I$ and $A \\neq I$. Prove that $\\text{tr}(A)$ is an integer satisfying $\\text{tr}(A) \\equiv n \\pmod{3}$.",
    correct_answer: "Eigenvalues of $A$ satisfy $\\lambda^3=1$, so $\\lambda \\in \\{1, \\omega, \\omega^2\\}$ where $\\omega = e^{2\\pi i/3}$. If there are $k$ eigenvalues equal to 1, $j$ equal to $\\omega$, and $j$ equal to $\\omega^2$ (conjugate pairs since $A$ is real), then $\\text{tr}(A) = k + j(\\omega+\\omega^2) = k - j$. Since $k+2j=n$, we get $\\text{tr}(A) = n - 3j \\equiv n \\pmod{3}$.",
    hints: ["What are the possible eigenvalues?", "For real matrices, complex eigenvalues come in conjugate pairs."],
  },
  {
    id: "la-o2", topic_id: "linear-algebra", difficulty: "even_harder", topic_area: "Spectral Theory",
    question: "Let $A$ be a real symmetric matrix with eigenvalues $\\lambda_1 \\le \\lambda_2 \\le \\cdots \\le \\lambda_n$. Prove that $$\\lambda_1 = \\min_{\\|x\\|=1} x^T A x$$ (Rayleigh quotient characterization).",
    correct_answer: "Since $A$ is real symmetric, it is orthogonally diagonalizable: $A = Q\\Lambda Q^T$. Let $y = Q^Tx$, then $\\|y\\|=1$ and $x^TAx = y^T\\Lambda y = \\sum_i \\lambda_i y_i^2 \\ge \\lambda_1 \\sum y_i^2 = \\lambda_1$. Equality holds when $x$ is the eigenvector for $\\lambda_1$.",
    hints: ["Use the spectral decomposition $A = Q\\Lambda Q^T$.", "Substitute $y = Q^Tx$."],
  },
  {
    id: "la-o3", topic_id: "linear-algebra", difficulty: "even_harder", topic_area: "Rank",
    question: "Let $A$ be an $m \\times n$ matrix and $B$ an $n \\times p$ matrix. Prove that $\\text{rank}(AB) \\ge \\text{rank}(A) + \\text{rank}(B) - n$ (Sylvester's rank inequality).",
    correct_answer: "By the rank-nullity theorem, $\\text{null}(AB) \\le \\text{null}(A) + \\text{null}(B)$ since $\\ker(B) \\subseteq \\ker(AB)$ and any $x \\in \\ker(AB) \\setminus \\ker(B)$ satisfies $Bx \\in \\ker(A)$. Then $\\text{rank}(AB) = p - \\text{null}(AB) \\ge p - \\text{null}(B) - \\text{null}(A) = \\text{rank}(B) + \\text{rank}(A) - n$.",
    hints: ["Use rank-nullity and relate null spaces.", "Show $\\text{null}(AB) \\le \\text{null}(A) + \\text{null}(B)$."],
  },
  {
    id: "la-o4", topic_id: "linear-algebra", difficulty: "even_harder", topic_area: "Determinants",
    question: "Let $A$ be an $n \\times n$ matrix with integer entries such that $A^{-1}$ also has integer entries. Prove that $\\det(A) = \\pm 1$.",
    correct_answer: "Since $A$ has integer entries, $\\det(A) \\in \\mathbb{Z}$. Similarly $\\det(A^{-1}) \\in \\mathbb{Z}$. But $\\det(A) \\cdot \\det(A^{-1}) = \\det(I) = 1$. Two integers whose product is 1 must be $\\pm 1$.",
    hints: ["What is $\\det(A) \\cdot \\det(A^{-1})$?", "Both determinants must be integers."],
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
//  CALCULUS II
// ═══════════════════════════════════════════════════════════════════════════════

const CALCULUS_II: QuestionBankEntry[] = [
  // ── easy ──
  {
    id: "ca-e1", topic_id: "calculus-ii", difficulty: "easy", topic_area: "Integration",
    question: "Evaluate $\\int x^3 \\, dx$.",
    correct_answer: "$\\frac{x^4}{4} + C$",
    hints: ["Use the power rule: $\\int x^n\\,dx = \\frac{x^{n+1}}{n+1}+C$."],
  },
  {
    id: "ca-e2", topic_id: "calculus-ii", difficulty: "easy", topic_area: "Integration",
    question: "Evaluate $\\int_0^1 2x \\, dx$.",
    correct_answer: "$[x^2]_0^1 = 1 - 0 = 1$",
    hints: ["Find the antiderivative, then apply bounds."],
  },
  {
    id: "ca-e3", topic_id: "calculus-ii", difficulty: "easy", topic_area: "Sequences",
    question: "Does the sequence $a_n = \\frac{1}{n}$ converge? If so, to what?",
    correct_answer: "Yes, $\\lim_{n\\to\\infty} \\frac{1}{n} = 0$.",
    hints: ["Consider what happens as $n \\to \\infty$."],
  },
  {
    id: "ca-e4", topic_id: "calculus-ii", difficulty: "easy", topic_area: "Series",
    question: "Compute $\\sum_{n=0}^{4} 2^n$.",
    correct_answer: "$1 + 2 + 4 + 8 + 16 = 31$. Or by formula: $\\frac{2^5-1}{2-1} = 31$.",
    hints: ["This is a finite geometric series with $r=2$."],
  },
  {
    id: "ca-e5", topic_id: "calculus-ii", difficulty: "easy", topic_area: "Integration",
    question: "Evaluate $\\int \\sin(x) \\, dx$.",
    correct_answer: "$-\\cos(x) + C$",
    hints: ["Which function's derivative is $\\sin(x)$?"],
  },
  {
    id: "ca-e6", topic_id: "calculus-ii", difficulty: "easy", topic_area: "Integration",
    question: "Find $\\int e^{2x} \\, dx$.",
    correct_answer: "$\\frac{1}{2}e^{2x} + C$",
    hints: ["Use substitution $u = 2x$."],
  },
  // ── medium ──
  {
    id: "ca-m1", topic_id: "calculus-ii", difficulty: "medium", topic_area: "Integration Techniques",
    question: "Evaluate $\\int x \\cos(x) \\, dx$ using integration by parts.",
    correct_answer: "Let $u=x$, $dv=\\cos x\\,dx$. Then $du=dx$, $v=\\sin x$. $\\int x\\cos x\\,dx = x\\sin x - \\int \\sin x\\,dx = x\\sin x + \\cos x + C$.",
    hints: ["Integration by parts: $\\int u\\,dv = uv - \\int v\\,du$."],
  },
  {
    id: "ca-m2", topic_id: "calculus-ii", difficulty: "medium", topic_area: "Series",
    question: "Determine whether $\\sum_{n=1}^{\\infty} \\frac{1}{n^2}$ converges or diverges.",
    correct_answer: "Converges by the $p$-series test ($p = 2 > 1$). In fact, $\\sum_{n=1}^{\\infty} \\frac{1}{n^2} = \\frac{\\pi^2}{6}$ (Basel problem).",
    hints: ["$p$-series $\\sum \\frac{1}{n^p}$ converges when $p > 1$."],
  },
  {
    id: "ca-m3", topic_id: "calculus-ii", difficulty: "medium", topic_area: "Integration Techniques",
    question: "Evaluate $\\int \\frac{1}{x^2 + 1} \\, dx$.",
    correct_answer: "$\\arctan(x) + C$",
    hints: ["Recall that $\\frac{d}{dx}\\arctan(x) = \\frac{1}{1+x^2}$."],
  },
  {
    id: "ca-m4", topic_id: "calculus-ii", difficulty: "medium", topic_area: "Polar Coordinates",
    question: "Find the area enclosed by the cardioid $r = 1 + \\cos\\theta$.",
    correct_answer: "$A = \\frac{1}{2}\\int_0^{2\\pi}(1+\\cos\\theta)^2\\,d\\theta = \\frac{1}{2}\\int_0^{2\\pi}(1 + 2\\cos\\theta + \\cos^2\\theta)\\,d\\theta = \\frac{3\\pi}{2}$.",
    hints: ["Area in polar: $A = \\frac{1}{2}\\int_\\alpha^\\beta r^2\\,d\\theta$."],
  },
  {
    id: "ca-m5", topic_id: "calculus-ii", difficulty: "medium", topic_area: "Series",
    question: "Find the radius of convergence of $\\sum_{n=0}^{\\infty} \\frac{x^n}{n!}$.",
    correct_answer: "By the ratio test: $\\lim_{n\\to\\infty}\\left|\\frac{x^{n+1}/(n+1)!}{x^n/n!}\\right| = \\lim\\frac{|x|}{n+1} = 0 < 1$ for all $x$. Radius $R = \\infty$.",
    hints: ["Apply the ratio test.", "This is the Taylor series for $e^x$."],
  },
  {
    id: "ca-m6", topic_id: "calculus-ii", difficulty: "medium", topic_area: "Integration Techniques",
    question: "Compute $\\int_0^{\\infty} e^{-x} \\, dx$.",
    correct_answer: "$\\lim_{b\\to\\infty}[-e^{-x}]_0^b = \\lim_{b\\to\\infty}(-e^{-b}+1) = 1$.",
    hints: ["This is an improper integral.", "Find the antiderivative and take the limit."],
  },
  // ── hard ──
  {
    id: "ca-h1", topic_id: "calculus-ii", difficulty: "hard", topic_area: "Series",
    question: "Determine whether $\\sum_{n=2}^{\\infty} \\frac{1}{n \\ln n}$ converges or diverges.",
    correct_answer: "By the integral test: $\\int_2^{\\infty}\\frac{1}{x\\ln x}\\,dx = [\\ln(\\ln x)]_2^{\\infty} = \\infty$. The series diverges.",
    hints: ["Try the integral test.", "Substitute $u = \\ln x$."],
  },
  {
    id: "ca-h2", topic_id: "calculus-ii", difficulty: "hard", topic_area: "Integration Techniques",
    question: "Evaluate $\\int_0^1 \\frac{\\ln x}{1-x} \\, dx$.",
    correct_answer: "Expand $\\frac{1}{1-x} = \\sum_{n=0}^\\infty x^n$, then $\\int_0^1 x^n \\ln x\\,dx = -\\frac{1}{(n+1)^2}$. So the answer is $-\\sum_{n=1}^\\infty \\frac{1}{n^2} = -\\frac{\\pi^2}{6}$.",
    hints: ["Expand $\\frac{1}{1-x}$ as a power series.", "Interchange sum and integral."],
  },
  {
    id: "ca-h3", topic_id: "calculus-ii", difficulty: "hard", topic_area: "Parametric Curves",
    question: "Find the arc length of the curve $x = t^2$, $y = t^3$ for $0 \\le t \\le 1$.",
    correct_answer: "$L = \\int_0^1 \\sqrt{(2t)^2 + (3t^2)^2}\\,dt = \\int_0^1 t\\sqrt{4+9t^2}\\,dt = \\frac{1}{27}(13\\sqrt{13}-8)$.",
    hints: ["$L = \\int \\sqrt{(dx/dt)^2 + (dy/dt)^2}\\,dt$.", "Use $u$-substitution with $u=4+9t^2$."],
  },
  {
    id: "ca-h4", topic_id: "calculus-ii", difficulty: "hard", topic_area: "Taylor Series",
    question: "Find the Taylor series of $\\ln(1+x)$ centred at $x=0$ and determine its interval of convergence.",
    correct_answer: "$\\ln(1+x) = \\sum_{n=1}^{\\infty} \\frac{(-1)^{n+1}}{n}x^n$ for $-1 < x \\le 1$. Radius $R=1$. At $x=1$: alternating harmonic series (converges). At $x=-1$: harmonic series (diverges).",
    hints: ["Integrate the geometric series $\\frac{1}{1+x}$.", "Check endpoints separately."],
  },
  {
    id: "ca-h5", topic_id: "calculus-ii", difficulty: "hard", topic_area: "Volumes",
    question: "Find the volume of the solid obtained by revolving $y = \\sin x$, $0 \\le x \\le \\pi$, about the $x$-axis.",
    correct_answer: "$V = \\pi\\int_0^\\pi \\sin^2 x\\,dx = \\pi \\int_0^\\pi \\frac{1-\\cos 2x}{2}\\,dx = \\frac{\\pi^2}{2}$.",
    hints: ["Disk method: $V = \\pi\\int [f(x)]^2\\,dx$.", "Use $\\sin^2 x = \\frac{1-\\cos 2x}{2}$."],
  },
  // ── even_harder (olympiad) ──
  {
    id: "ca-o1", topic_id: "calculus-ii", difficulty: "even_harder", topic_area: "Series",
    question: "Evaluate $\\sum_{n=1}^{\\infty} \\frac{1}{n^2 \\binom{2n}{n}}$.",
    correct_answer: "$\\sum_{n=1}^{\\infty}\\frac{1}{n^2\\binom{2n}{n}} = \\frac{\\pi^2}{18}$.\n\nUse the identity $\\frac{1}{n\\binom{2n}{n}} = \\frac{1}{2}B(n,n) = \\frac{1}{2}\\int_0^1 t^{n-1}(1-t)^{n-1}\\,dt$, then divide by $n$, swap sum and integral, and recognise that $\\sum \\frac{[t(1-t)]^{n-1}}{n} = -\\frac{\\ln(1-t(1-t))}{t(1-t)}$. The resulting integral evaluates to $\\frac{\\pi^2}{18}$.",
    hints: ["Use the Beta function to represent $\\frac{1}{\\binom{2n}{n}}$.", "Swap summation and integration."],
  },
  {
    id: "ca-o2", topic_id: "calculus-ii", difficulty: "even_harder", topic_area: "Integration",
    question: "Evaluate $\\int_0^{\\infty} \\frac{\\sin x}{x} \\, dx$.",
    correct_answer: "$\\frac{\\pi}{2}$.\n\nMethod: Introduce $I(a) = \\int_0^\\infty \\frac{\\sin x}{x}e^{-ax}dx$ for $a>0$. Then $I'(a) = -\\int_0^\\infty \\sin x \\cdot e^{-ax}dx = -\\frac{1}{1+a^2}$. So $I(a) = \\frac{\\pi}{2} - \\arctan(a)$. Taking $a\\to 0^+$: $I(0) = \\frac{\\pi}{2}$.",
    hints: ["Introduce a parameter (Feynman's trick): multiply by $e^{-ax}$.", "Differentiate under the integral sign."],
  },
  {
    id: "ca-o3", topic_id: "calculus-ii", difficulty: "even_harder", topic_area: "Series",
    question: "Prove that $\\sum_{n=0}^{\\infty} \\frac{(-1)^n}{2n+1} = \\frac{\\pi}{4}$ (Leibniz formula).",
    correct_answer: "Start with $\\frac{1}{1+t^2} = \\sum_{n=0}^\\infty (-1)^n t^{2n}$ for $|t|<1$. Integrate from 0 to $x$: $\\arctan x = \\sum_{n=0}^\\infty \\frac{(-1)^n x^{2n+1}}{2n+1}$. By Abel's theorem the series converges at $x=1$ and equals $\\arctan(1) = \\frac{\\pi}{4}$.",
    hints: ["Start with the geometric series for $\\frac{1}{1+t^2}$.", "Integrate term by term and evaluate at $x=1$."],
  },
  {
    id: "ca-o4", topic_id: "calculus-ii", difficulty: "even_harder", topic_area: "Integration",
    question: "Evaluate $\\int_0^1 \\frac{\\arctan x}{x} \\, dx$.",
    correct_answer: "Using the series $\\arctan x = \\sum_{n=0}^\\infty \\frac{(-1)^n x^{2n+1}}{2n+1}$, divide by $x$: $\\frac{\\arctan x}{x} = \\sum_{n=0}^\\infty \\frac{(-1)^n x^{2n}}{2n+1}$. Integrate term by term: $\\sum_{n=0}^\\infty \\frac{(-1)^n}{(2n+1)^2} = G$, where $G \\approx 0.9159$ is Catalan's constant.",
    hints: ["Expand $\\arctan x$ as a power series.", "Integrate term by term."],
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
//  PROBABILITY
// ═══════════════════════════════════════════════════════════════════════════════

const PROBABILITY: QuestionBankEntry[] = [
  // ── easy ──
  {
    id: "pr-e1", topic_id: "probability", difficulty: "easy", topic_area: "Basic Probability",
    question: "A fair die is rolled. What is the probability of getting an even number?",
    correct_answer: "$P(\\text{even}) = \\frac{3}{6} = \\frac{1}{2}$.",
    hints: ["Even outcomes: 2, 4, 6."],
  },
  {
    id: "pr-e2", topic_id: "probability", difficulty: "easy", topic_area: "Counting",
    question: "How many ways can 3 books be arranged on a shelf?",
    correct_answer: "$3! = 6$",
    hints: ["This is a permutation of 3 distinct objects."],
  },
  {
    id: "pr-e3", topic_id: "probability", difficulty: "easy", topic_area: "Basic Probability",
    question: "Two coins are flipped. What is the probability of getting at least one head?",
    correct_answer: "$1 - P(\\text{no heads}) = 1 - \\frac{1}{4} = \\frac{3}{4}$.",
    hints: ["Use the complement: $P(\\text{at least one}) = 1 - P(\\text{none})$."],
  },
  {
    id: "pr-e4", topic_id: "probability", difficulty: "easy", topic_area: "Counting",
    question: "How many ways can you choose 2 items from 5? (i.e., $\\binom{5}{2}$)",
    correct_answer: "$\\binom{5}{2} = \\frac{5!}{2!\\cdot3!} = 10$",
    hints: ["$\\binom{n}{k} = \\frac{n!}{k!(n-k)!}$"],
  },
  {
    id: "pr-e5", topic_id: "probability", difficulty: "easy", topic_area: "Basic Probability",
    question: "A bag has 3 red and 7 blue balls. What is the probability of drawing a red ball?",
    correct_answer: "$P(\\text{red}) = \\frac{3}{10} = 0.3$",
    hints: ["$P = \\frac{\\text{favorable}}{\\text{total}}$"],
  },
  // ── medium ──
  {
    id: "pr-m1", topic_id: "probability", difficulty: "medium", topic_area: "Conditional Probability",
    question: "Given $P(A)=0.6$, $P(B)=0.5$, $P(A \\cap B)=0.3$. Find $P(A|B)$.",
    correct_answer: "$P(A|B) = \\frac{P(A \\cap B)}{P(B)} = \\frac{0.3}{0.5} = 0.6$.",
    hints: ["$P(A|B) = \\frac{P(A \\cap B)}{P(B)}$"],
  },
  {
    id: "pr-m2", topic_id: "probability", difficulty: "medium", topic_area: "Bayes' Theorem",
    question: "A disease has prevalence 1%. A test has 95% sensitivity and 90% specificity. If a person tests positive, what is the probability they have the disease?",
    correct_answer: "By Bayes': $P(D|+) = \\frac{0.01 \\times 0.95}{0.01 \\times 0.95 + 0.99 \\times 0.10} = \\frac{0.0095}{0.1085} \\approx 8.76\\%$.",
    hints: ["Sensitivity = $P(+|D)$, Specificity = $P(-|\\bar{D})$.", "Apply Bayes' theorem."],
  },
  {
    id: "pr-m3", topic_id: "probability", difficulty: "medium", topic_area: "Expected Value",
    question: "A game costs \\$5 to play. You win \\$20 with probability $\\frac{1}{4}$ and \\$0 otherwise. What is the expected profit?",
    correct_answer: "$E[\\text{profit}] = \\frac{1}{4}(20) + \\frac{3}{4}(0) - 5 = 5 - 5 = 0$. The game is fair.",
    hints: ["$E[\\text{profit}] = E[\\text{winnings}] - \\text{cost}$."],
  },
  {
    id: "pr-m4", topic_id: "probability", difficulty: "medium", topic_area: "Distributions",
    question: "If $X \\sim \\text{Binomial}(10, 0.3)$, find $P(X = 3)$.",
    correct_answer: "$P(X=3) = \\binom{10}{3}(0.3)^3(0.7)^7 = 120 \\times 0.027 \\times 0.0824 \\approx 0.2668$.",
    hints: ["$P(X=k) = \\binom{n}{k}p^k(1-p)^{n-k}$"],
  },
  {
    id: "pr-m5", topic_id: "probability", difficulty: "medium", topic_area: "Variance",
    question: "Find the variance of a fair die roll.",
    correct_answer: "$E[X] = 3.5$, $E[X^2] = \\frac{1+4+9+16+25+36}{6} = \\frac{91}{6}$. $\\text{Var}(X) = \\frac{91}{6} - 3.5^2 = \\frac{91}{6} - \\frac{49}{4} = \\frac{35}{12} \\approx 2.917$.",
    hints: ["$\\text{Var}(X) = E[X^2] - (E[X])^2$"],
  },
  // ── hard ──
  {
    id: "pr-h1", topic_id: "probability", difficulty: "hard", topic_area: "Random Variables",
    question: "Let $X$ and $Y$ be independent standard normal random variables. Find the distribution of $X^2 + Y^2$.",
    correct_answer: "$X^2 + Y^2 \\sim \\chi^2(2) = \\text{Exponential}(1/2)$. The PDF is $f(z) = \\frac{1}{2}e^{-z/2}$ for $z>0$.",
    hints: ["Sum of squares of independent standard normals follows chi-squared.", "$\\chi^2(2)$ is the same as $\\text{Exp}(1/2)$."],
  },
  {
    id: "pr-h2", topic_id: "probability", difficulty: "hard", topic_area: "Moment Generating Functions",
    question: "Find the MGF of $X \\sim \\text{Poisson}(\\lambda)$ and use it to derive $E[X]$ and $\\text{Var}(X)$.",
    correct_answer: "$M_X(t) = E[e^{tX}] = \\sum_{k=0}^\\infty e^{tk}\\frac{\\lambda^k e^{-\\lambda}}{k!} = e^{\\lambda(e^t - 1)}$. $M'(0) = \\lambda = E[X]$. $M''(0) = \\lambda^2+\\lambda$, so $\\text{Var}(X) = \\lambda$.",
    hints: ["$M_X(t) = E[e^{tX}]$.", "Take derivatives and evaluate at $t=0$."],
  },
  {
    id: "pr-h3", topic_id: "probability", difficulty: "hard", topic_area: "Markov Chains",
    question: "In a simple random walk on $\\{0,1,2,3\\}$ with absorbing barriers at 0 and 3, starting at state 1, what is the probability of being absorbed at 3?",
    correct_answer: "Let $p_i$ = prob of absorption at 3 starting from $i$. $p_0=0, p_3=1$. By symmetry $p_i = \\frac{1}{2}p_{i-1}+\\frac{1}{2}p_{i+1}$. Solution: $p_i = i/3$. So $p_1 = 1/3$.",
    hints: ["Set up equations $p_i = \\frac{1}{2}p_{i-1}+\\frac{1}{2}p_{i+1}$.", "Boundary conditions: $p_0=0, p_3=1$."],
  },
  {
    id: "pr-h4", topic_id: "probability", difficulty: "hard", topic_area: "Order Statistics",
    question: "Let $X_1, X_2, X_3$ be i.i.d. $\\text{Uniform}(0,1)$. Find $E[X_{(2)}]$ (the expected value of the median).",
    correct_answer: "For $U(0,1)$, $E[X_{(k)}] = \\frac{k}{n+1}$. So $E[X_{(2)}] = \\frac{2}{4} = \\frac{1}{2}$.",
    hints: ["The expected value of the $k$-th order statistic from $U(0,1)$.", "$E[X_{(k)}] = \\frac{k}{n+1}$ for uniform."],
  },
  // ── even_harder (olympiad) ──
  {
    id: "pr-o1", topic_id: "probability", difficulty: "even_harder", topic_area: "Combinatorial Probability",
    question: "What is the expected number of fixed points of a random permutation of $\\{1,2,\\ldots,n\\}$? Prove your answer.",
    correct_answer: "Let $X_i = \\mathbf{1}[\\sigma(i)=i]$. Then $E[X_i] = 1/n$. By linearity, $E[\\sum X_i] = \\sum E[X_i] = n \\cdot \\frac{1}{n} = 1$. The expected number of fixed points is **1**, regardless of $n$.",
    hints: ["Define indicator variables.", "Use linearity of expectation."],
  },
  {
    id: "pr-o2", topic_id: "probability", difficulty: "even_harder", topic_area: "Geometric Probability",
    question: "Three points are chosen uniformly at random on a circle. What is the probability that the triangle formed is acute?",
    correct_answer: "$\\frac{1}{4}$.\n\nFix one point. The triangle is acute iff all three arcs are less than $\\pi$. Parameterize the other two points by their angles $\\theta_1, \\theta_2 \\in [0, 2\\pi)$ relative to the first. The favorable region is $\\frac{1}{4}$ of the total area.",
    hints: ["A triangle inscribed in a circle is acute iff the centre lies inside the triangle.", "Fix one point and parameterize."],
  },
  {
    id: "pr-o3", topic_id: "probability", difficulty: "even_harder", topic_area: "Stochastic Processes",
    question: "In a Gambler's Ruin problem with initial fortune $i$, target $N$, and win probability $p \\neq 1/2$ per round, derive the ruin probability.",
    correct_answer: "Let $q_i$ = prob of reaching 0 starting from $i$. $q_0=1, q_N=0$. $q_i = pq_{i+1}+qq_{i-1}$. Let $r = q/p$. Solution: $q_i = \\frac{r^i - r^N}{1 - r^N}$ when $r \\neq 1$.",
    hints: ["Set up the difference equation.", "Try $q_i = A + B r^i$."],
  },
  {
    id: "pr-o4", topic_id: "probability", difficulty: "even_harder", topic_area: "Inequalities",
    question: "Prove Chebyshev's inequality: for any random variable $X$ with finite mean $\\mu$ and variance $\\sigma^2$, and any $k > 0$, $P(|X - \\mu| \\ge k\\sigma) \\le \\frac{1}{k^2}$.",
    correct_answer: "By Markov's inequality applied to $(X-\\mu)^2$:\n$$P(|X-\\mu| \\ge k\\sigma) = P((X-\\mu)^2 \\ge k^2\\sigma^2) \\le \\frac{E[(X-\\mu)^2]}{k^2\\sigma^2} = \\frac{\\sigma^2}{k^2\\sigma^2} = \\frac{1}{k^2}.$$",
    hints: ["Start from Markov's inequality.", "Apply it to $(X-\\mu)^2$."],
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
//  STATISTICS
// ═══════════════════════════════════════════════════════════════════════════════

const STATISTICS: QuestionBankEntry[] = [
  // ── easy ──
  {
    id: "st-e1", topic_id: "statistics", difficulty: "easy", topic_area: "Descriptive Statistics",
    question: "Find the mean of the data set: $\\{2, 4, 6, 8, 10\\}$.",
    correct_answer: "$\\bar{x} = \\frac{2+4+6+8+10}{5} = 6$",
    hints: ["Mean = sum of values / number of values."],
  },
  {
    id: "st-e2", topic_id: "statistics", difficulty: "easy", topic_area: "Descriptive Statistics",
    question: "Find the median of $\\{3, 7, 1, 9, 5\\}$.",
    correct_answer: "Sorted: $\\{1,3,5,7,9\\}$. Median = $5$.",
    hints: ["Sort the data first."],
  },
  {
    id: "st-e3", topic_id: "statistics", difficulty: "easy", topic_area: "Descriptive Statistics",
    question: "Compute the sample standard deviation of $\\{4, 4, 4, 4\\}$.",
    correct_answer: "$s = 0$. All values are the same, so there is no spread.",
    hints: ["If all values equal the mean, every deviation is 0."],
  },
  {
    id: "st-e4", topic_id: "statistics", difficulty: "easy", topic_area: "Descriptive Statistics",
    question: "What is the range of $\\{12, 5, 8, 20, 3\\}$?",
    correct_answer: "$\\text{Range} = 20 - 3 = 17$",
    hints: ["Range = max − min."],
  },
  {
    id: "st-e5", topic_id: "statistics", difficulty: "easy", topic_area: "Probability Distributions",
    question: "If $Z \\sim N(0,1)$, what is $P(Z \\le 0)$?",
    correct_answer: "$P(Z \\le 0) = 0.5$ by symmetry of the standard normal.",
    hints: ["The normal distribution is symmetric about its mean."],
  },
  // ── medium ──
  {
    id: "st-m1", topic_id: "statistics", difficulty: "medium", topic_area: "Hypothesis Testing",
    question: "In a one-sample $z$-test, $H_0: \\mu = 50$, $\\bar{x} = 52$, $\\sigma = 10$, $n = 25$. Compute the test statistic.",
    correct_answer: "$z = \\frac{\\bar{x}-\\mu_0}{\\sigma/\\sqrt{n}} = \\frac{52-50}{10/5} = \\frac{2}{2} = 1.0$.",
    hints: ["$z = \\frac{\\bar{x}-\\mu_0}{\\sigma/\\sqrt{n}}$"],
  },
  {
    id: "st-m2", topic_id: "statistics", difficulty: "medium", topic_area: "Confidence Intervals",
    question: "Construct a 95% confidence interval for the mean: $\\bar{x}=100$, $\\sigma=15$, $n=36$.",
    correct_answer: "$CI = \\bar{x} \\pm z_{0.025}\\frac{\\sigma}{\\sqrt{n}} = 100 \\pm 1.96 \\cdot \\frac{15}{6} = 100 \\pm 4.9 = (95.1, 104.9)$.",
    hints: ["$z_{0.025} = 1.96$ for 95% CI."],
  },
  {
    id: "st-m3", topic_id: "statistics", difficulty: "medium", topic_area: "Regression",
    question: "In simple linear regression $y = \\beta_0 + \\beta_1 x$, given $\\bar{x}=3$, $\\bar{y}=7$, $\\sum(x_i-\\bar{x})(y_i-\\bar{y})=20$, $\\sum(x_i-\\bar{x})^2=10$, find $\\hat{\\beta}_1$ and $\\hat{\\beta}_0$.",
    correct_answer: "$\\hat{\\beta}_1 = \\frac{20}{10} = 2$. $\\hat{\\beta}_0 = \\bar{y} - \\hat{\\beta}_1\\bar{x} = 7 - 2(3) = 1$. Model: $\\hat{y} = 1 + 2x$.",
    hints: ["$\\hat{\\beta}_1 = \\frac{S_{xy}}{S_{xx}}$", "$\\hat{\\beta}_0 = \\bar{y} - \\hat{\\beta}_1 \\bar{x}$"],
  },
  {
    id: "st-m4", topic_id: "statistics", difficulty: "medium", topic_area: "Hypothesis Testing",
    question: "State the conditions for a valid $\\chi^2$ goodness-of-fit test.",
    correct_answer: "1) Data are from a random sample. 2) All expected frequencies are ≥ 5 (or at least 80% are ≥ 5 with none < 1). 3) Observations are independent. 4) Categories are mutually exclusive and exhaustive.",
    hints: ["Think about expected cell counts.", "What assumptions does the test make?"],
  },
  {
    id: "st-m5", topic_id: "statistics", difficulty: "medium", topic_area: "Estimation",
    question: "Show that the sample mean $\\bar{X}$ is an unbiased estimator of $\\mu$.",
    correct_answer: "$E[\\bar{X}] = E\\left[\\frac{1}{n}\\sum X_i\\right] = \\frac{1}{n}\\sum E[X_i] = \\frac{n\\mu}{n} = \\mu$. Since $E[\\bar{X}] = \\mu$, it is unbiased.",
    hints: ["Use linearity of expectation."],
  },
  // ── hard ──
  {
    id: "st-h1", topic_id: "statistics", difficulty: "hard", topic_area: "Maximum Likelihood",
    question: "Derive the MLE of $\\lambda$ for a Poisson distribution from a sample $x_1,\\ldots,x_n$.",
    correct_answer: "$L(\\lambda) = \\prod \\frac{\\lambda^{x_i}e^{-\\lambda}}{x_i!}$. $\\ln L = \\sum x_i \\ln\\lambda - n\\lambda - \\sum\\ln(x_i!)$. Setting $\\frac{d}{d\\lambda}\\ln L = \\frac{\\sum x_i}{\\lambda} - n = 0$ gives $\\hat{\\lambda} = \\bar{x}$.",
    hints: ["Write the likelihood, take the log.", "Differentiate and set to zero."],
  },
  {
    id: "st-h2", topic_id: "statistics", difficulty: "hard", topic_area: "Bayesian Inference",
    question: "With a $\\text{Beta}(\\alpha,\\beta)$ prior on $p$ and $k$ successes in $n$ Bernoulli trials, find the posterior distribution.",
    correct_answer: "Posterior $\\propto p^k(1-p)^{n-k} \\cdot p^{\\alpha-1}(1-p)^{\\beta-1} = p^{k+\\alpha-1}(1-p)^{n-k+\\beta-1}$. So the posterior is $\\text{Beta}(\\alpha+k, \\beta+n-k)$.",
    hints: ["Multiply likelihood by prior.", "Recognize the kernel of a Beta distribution."],
  },
  {
    id: "st-h3", topic_id: "statistics", difficulty: "hard", topic_area: "Sufficient Statistics",
    question: "Using the factorization theorem, find a sufficient statistic for $\\theta$ in $f(x|\\theta) = \\theta e^{-\\theta x}$ (Exponential distribution).",
    correct_answer: "$f(\\vec{x}|\\theta) = \\theta^n e^{-\\theta \\sum x_i} = g(T(\\vec{x}), \\theta) \\cdot h(\\vec{x})$ where $T = \\sum x_i$ (or equivalently $\\bar{x}$), $g = \\theta^n e^{-\\theta T}$, $h = 1$. So $\\sum x_i$ is sufficient.",
    hints: ["Write the joint density.", "Factor it into a function of $(T, \\theta)$ and a function of data alone."],
  },
  {
    id: "st-h4", topic_id: "statistics", difficulty: "hard", topic_area: "ANOVA",
    question: "In one-way ANOVA with $k$ groups each of size $n$, derive the $F$-statistic formula.",
    correct_answer: "$F = \\frac{\\text{MSB}}{\\text{MSW}} = \\frac{SSB/(k-1)}{SSW/(N-k)}$ where $SSB = n\\sum_j (\\bar{X}_j - \\bar{X})^2$, $SSW = \\sum_j\\sum_i (X_{ij}-\\bar{X}_j)^2$, and $N=nk$.",
    hints: ["Partition total variation into between-group and within-group.", "Divide each SS by its degrees of freedom."],
  },
  // ── even_harder (olympiad) ──
  {
    id: "st-o1", topic_id: "statistics", difficulty: "even_harder", topic_area: "Estimation Theory",
    question: "Prove the Cramér–Rao lower bound: for an unbiased estimator $\\hat{\\theta}$, $\\text{Var}(\\hat{\\theta}) \\ge \\frac{1}{I(\\theta)}$ where $I(\\theta) = -E\\left[\\frac{\\partial^2}{\\partial\\theta^2}\\ln f(X|\\theta)\\right]$.",
    correct_answer: "Starting from $E[\\hat{\\theta}] = \\theta$, differentiate under the integral and apply Cauchy–Schwarz: $1 = \\text{Cov}(\\hat{\\theta}, S)$ where $S = \\frac{\\partial}{\\partial\\theta}\\ln f$. By Cauchy–Schwarz, $1 \\le \\text{Var}(\\hat{\\theta}) \\cdot \\text{Var}(S)$. Since $\\text{Var}(S) = I(\\theta)$, we get $\\text{Var}(\\hat{\\theta}) \\ge 1/I(\\theta)$.",
    hints: ["Differentiate $\\int \\hat{\\theta}f\\,dx = \\theta$ w.r.t. $\\theta$.", "Apply the Cauchy–Schwarz inequality."],
  },
  {
    id: "st-o2", topic_id: "statistics", difficulty: "even_harder", topic_area: "Hypothesis Testing",
    question: "State and prove the Neyman–Pearson Lemma for the most powerful test of simple hypotheses.",
    correct_answer: "The most powerful test of $H_0:\\theta=\\theta_0$ vs $H_1:\\theta=\\theta_1$ at level $\\alpha$ rejects $H_0$ when $\\frac{L(\\theta_1)}{L(\\theta_0)} > c$ for some $c$ chosen so $P(\\text{reject}|H_0) = \\alpha$.\n\nProof sketch: Let $\\phi^*$ be the LR test and $\\phi$ any other test with the same level. Show $E_{\\theta_1}[\\phi^* - \\phi] \\ge 0$ by splitting the sample space into the rejection region and its complement, using the fact that $(\\phi^*-\\phi)(L_1 - cL_0) \\ge 0$ everywhere.",
    hints: ["Consider the likelihood ratio.", "Compare any level-$\\alpha$ test to the LR test."],
  },
  {
    id: "st-o3", topic_id: "statistics", difficulty: "even_harder", topic_area: "Asymptotic Theory",
    question: "Prove that the MLE is consistent under regularity conditions. That is, $\\hat{\\theta}_n \\xrightarrow{P} \\theta_0$.",
    correct_answer: "By the law of large numbers, $\\frac{1}{n}\\ell_n(\\theta) \\to E_{\\theta_0}[\\ln f(X|\\theta)]$ uniformly. The function $M(\\theta) = E_{\\theta_0}[\\ln f(X|\\theta)]$ is uniquely maximized at $\\theta_0$ by the information inequality (Kullback–Leibler divergence $\\ge 0$ with equality iff $\\theta = \\theta_0$). Since the MLE maximizes $\\ell_n/n$ and the limit is uniquely maximized at $\\theta_0$, consistency follows.",
    hints: ["Use the LLN on the log-likelihood.", "KL divergence is non-negative."],
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
//  DISCRETE MATH
// ═══════════════════════════════════════════════════════════════════════════════

const DISCRETE_MATH: QuestionBankEntry[] = [
  // ── easy ──
  {
    id: "dm-e1", topic_id: "discrete-math", difficulty: "easy", topic_area: "Sets",
    question: "If $A = \\{1,2,3\\}$ and $B = \\{2,3,4\\}$, find $A \\cup B$ and $A \\cap B$.",
    correct_answer: "$A \\cup B = \\{1,2,3,4\\}$ and $A \\cap B = \\{2,3\\}$.",
    hints: ["Union includes all elements from both sets.", "Intersection includes only shared elements."],
  },
  {
    id: "dm-e2", topic_id: "discrete-math", difficulty: "easy", topic_area: "Logic",
    question: "Write the contrapositive of the statement: \"If it rains, then the ground is wet.\"",
    correct_answer: "\"If the ground is not wet, then it did not rain.\"",
    hints: ["Contrapositive of $p \\Rightarrow q$ is $\\neg q \\Rightarrow \\neg p$."],
  },
  {
    id: "dm-e3", topic_id: "discrete-math", difficulty: "easy", topic_area: "Graph Theory",
    question: "How many edges does the complete graph $K_4$ have?",
    correct_answer: "$\\binom{4}{2} = 6$ edges.",
    hints: ["$K_n$ has $\\binom{n}{2}$ edges."],
  },
  {
    id: "dm-e4", topic_id: "discrete-math", difficulty: "easy", topic_area: "Number Theory",
    question: "Find $\\gcd(12, 18)$.",
    correct_answer: "$\\gcd(12, 18) = 6$.",
    hints: ["List the factors of each, or use the Euclidean algorithm."],
  },
  {
    id: "dm-e5", topic_id: "discrete-math", difficulty: "easy", topic_area: "Combinatorics",
    question: "How many bit strings of length 4 are there?",
    correct_answer: "$2^4 = 16$.",
    hints: ["Each position has 2 choices (0 or 1)."],
  },
  // ── medium ──
  {
    id: "dm-m1", topic_id: "discrete-math", difficulty: "medium", topic_area: "Proof Techniques",
    question: "Prove by induction that $\\sum_{i=1}^{n} i = \\frac{n(n+1)}{2}$.",
    correct_answer: "Base case ($n=1$): $1 = \\frac{1 \\cdot 2}{2}$ ✓. Inductive step: assume $\\sum_{i=1}^k i = \\frac{k(k+1)}{2}$. Then $\\sum_{i=1}^{k+1} i = \\frac{k(k+1)}{2} + (k+1) = \\frac{k(k+1)+2(k+1)}{2} = \\frac{(k+1)(k+2)}{2}$. ✓",
    hints: ["Start with $n=1$ as base case.", "Assume true for $n=k$, prove for $n=k+1$."],
  },
  {
    id: "dm-m2", topic_id: "discrete-math", difficulty: "medium", topic_area: "Graph Theory",
    question: "Prove that in any graph, the sum of all vertex degrees equals twice the number of edges.",
    correct_answer: "Each edge connects two vertices, contributing 1 to the degree of each endpoint. So each edge is counted exactly twice in the sum of degrees. Thus $\\sum \\deg(v) = 2|E|$.",
    hints: ["How many times does each edge contribute to the degree sum?"],
  },
  {
    id: "dm-m3", topic_id: "discrete-math", difficulty: "medium", topic_area: "Recurrence Relations",
    question: "Solve the recurrence $a_n = 3a_{n-1}$ with $a_0 = 2$.",
    correct_answer: "$a_n = 2 \\cdot 3^n$.\n\nThis is a geometric sequence with ratio 3.",
    hints: ["This is a first-order linear recurrence.", "Try $a_n = c \\cdot r^n$."],
  },
  {
    id: "dm-m4", topic_id: "discrete-math", difficulty: "medium", topic_area: "Number Theory",
    question: "Find $17^{-1} \\pmod{43}$ (the modular inverse of 17 modulo 43).",
    correct_answer: "Using the extended Euclidean algorithm: $43 = 2(17) + 9$, $17 = 1(9)+8$, $9=1(8)+1$. Back-substituting: $1 = 9-8 = 9-(17-9) = 2(9)-17 = 2(43-2\\cdot17)-17 = 2(43)-5(17)$. So $17^{-1} \\equiv -5 \\equiv 38 \\pmod{43}$.",
    hints: ["Use the extended Euclidean algorithm.", "Find $x$ such that $17x \\equiv 1 \\pmod{43}$."],
  },
  {
    id: "dm-m5", topic_id: "discrete-math", difficulty: "medium", topic_area: "Combinatorics",
    question: "How many ways can 10 identical balls be placed into 4 distinct boxes?",
    correct_answer: "$\\binom{10+4-1}{4-1} = \\binom{13}{3} = 286$.",
    hints: ["Stars and bars method.", "$\\binom{n+k-1}{k-1}$ for $n$ identical objects into $k$ distinct boxes."],
  },
  // ── hard ──
  {
    id: "dm-h1", topic_id: "discrete-math", difficulty: "hard", topic_area: "Graph Theory",
    question: "Prove that every tree with $n \\ge 2$ vertices has at least 2 leaves (vertices of degree 1).",
    correct_answer: "A tree on $n$ vertices has $n-1$ edges. Sum of degrees = $2(n-1) = 2n-2$. If at most 1 vertex had degree 1, the remaining $n-1$ vertices have degree $\\ge 2$. Degree sum $\\ge 1 + 2(n-1) = 2n-1 > 2n-2$, contradiction.",
    hints: ["Use the handshaking lemma: $\\sum \\deg = 2|E| = 2(n-1)$.", "Assume for contradiction that at most 1 leaf exists."],
  },
  {
    id: "dm-h2", topic_id: "discrete-math", difficulty: "hard", topic_area: "Combinatorics",
    question: "Using inclusion-exclusion, find the number of derangements $D_n$ (permutations with no fixed points) of $n$ elements.",
    correct_answer: "$D_n = n! \\sum_{k=0}^n \\frac{(-1)^k}{k!}$.\n\nLet $A_i$ = permutations fixing $i$. $|A_i| = (n-1)!$, $|A_i \\cap A_j| = (n-2)!$, etc. By inclusion-exclusion, $D_n = n! - \\binom{n}{1}(n-1)! + \\binom{n}{2}(n-2)! - \\cdots = n!\\sum_{k=0}^n \\frac{(-1)^k}{k!}$.",
    hints: ["Let $A_i$ be the set of permutations that fix element $i$.", "Apply inclusion-exclusion to $D_n = |\\overline{A_1} \\cap \\cdots \\cap \\overline{A_n}|$."],
  },
  {
    id: "dm-h3", topic_id: "discrete-math", difficulty: "hard", topic_area: "Number Theory",
    question: "Prove Fermat's Little Theorem: if $p$ is prime and $\\gcd(a,p)=1$, then $a^{p-1} \\equiv 1 \\pmod{p}$.",
    correct_answer: "Consider $\\{a, 2a, 3a, \\ldots, (p-1)a\\} \\pmod{p}$. These are a permutation of $\\{1,2,\\ldots,p-1\\}$ since $\\gcd(a,p)=1$. Product: $a^{p-1}(p-1)! \\equiv (p-1)! \\pmod{p}$. Cancel $(p-1)!$ (coprime to $p$): $a^{p-1} \\equiv 1 \\pmod{p}$.",
    hints: ["Consider the set $\\{a, 2a, \\ldots, (p-1)a\\}$ mod $p$.", "Why is this a permutation of $\\{1, \\ldots, p-1\\}$?"],
  },
  {
    id: "dm-h4", topic_id: "discrete-math", difficulty: "hard", topic_area: "Graph Theory",
    question: "State and prove Euler's formula for connected planar graphs.",
    correct_answer: "$V - E + F = 2$.\n\nProof by induction on $E$: Base ($E=0$): one vertex, one face, $1-0+1=2$ ✓. If the graph has a cycle, removing an edge from a cycle merges two faces: $V-(E-1)+(F-1) = V-E+F$. If no cycle (tree), $F=1$ and $E=V-1$, so $V-(V-1)+1=2$ ✓.",
    hints: ["Induct on the number of edges.", "Consider cases: tree vs. graph with a cycle."],
  },
  // ── even_harder (olympiad) ──
  {
    id: "dm-o1", topic_id: "discrete-math", difficulty: "even_harder", topic_area: "Combinatorics",
    question: "Prove the Erdős–Gallai theorem: a sequence $d_1 \\ge d_2 \\ge \\cdots \\ge d_n$ of non-negative integers is the degree sequence of a simple graph if and only if $\\sum d_i$ is even and for each $k$:\n$$\\sum_{i=1}^k d_i \\le k(k-1) + \\sum_{i=k+1}^n \\min(d_i, k).$$",
    correct_answer: "The necessity is shown by counting: the left side counts degree contributions from the top-$k$ vertices. Within themselves they contribute at most $k(k-1)$ (complete graph on $k$ vertices). From the remaining vertices, vertex $i$ contributes at most $\\min(d_i, k)$ edges to the top-$k$ group.\n\nSufficiency can be proved via the Erdős–Gallai constructive algorithm or by appeal to the stronger Hakimi theorem (sequential reduction).",
    hints: ["For necessity, count edges within and between the top-$k$ set.", "For sufficiency, use induction or the Hakimi algorithm."],
  },
  {
    id: "dm-o2", topic_id: "discrete-math", difficulty: "even_harder", topic_area: "Number Theory",
    question: "Let $p > 2$ be prime. Prove that $\\sum_{k=1}^{p-1} k^{p-1} \\equiv -1 \\pmod{p}$.",
    correct_answer: "By Fermat's Little Theorem, $k^{p-1} \\equiv 1 \\pmod{p}$ for each $k \\in \\{1,\\ldots,p-1\\}$. So $\\sum_{k=1}^{p-1} k^{p-1} \\equiv \\sum_{k=1}^{p-1} 1 = p-1 \\equiv -1 \\pmod{p}$.",
    hints: ["Apply Fermat's Little Theorem to each term.", "How many terms are in the sum?"],
  },
  {
    id: "dm-o3", topic_id: "discrete-math", difficulty: "even_harder", topic_area: "Graph Theory",
    question: "Prove that the Petersen graph is not Hamiltonian.",
    correct_answer: "The Petersen graph is 3-regular on 10 vertices with girth 5. Suppose it has a Hamiltonian cycle $C$. $C$ uses 10 edges. The remaining 5 edges form a perfect matching. Each of the 5 non-cycle edges connects two vertices of $C$. These chords partition the cycle into paths, and any two chords intersecting would create a cycle of length $\\le 4$ (contradicting girth 5). Checking all possible non-crossing chord placements on a 10-cycle with girth $\\ge 5$ leads to a contradiction.",
    hints: ["Use the girth-5 property.", "If a Hamiltonian cycle exists, analyze the 5 remaining edges."],
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
//  DIFFERENTIAL EQUATIONS
// ═══════════════════════════════════════════════════════════════════════════════

const DIFFERENTIAL_EQ: QuestionBankEntry[] = [
  // ── easy ──
  {
    id: "de-e1", topic_id: "differential-eq", difficulty: "easy", topic_area: "First Order ODEs",
    question: "Solve $\\frac{dy}{dx} = 3x^2$ with $y(0) = 1$.",
    correct_answer: "$y = x^3 + C$. From $y(0)=1$: $C=1$. So $y = x^3 + 1$.",
    hints: ["Integrate both sides with respect to $x$."],
  },
  {
    id: "de-e2", topic_id: "differential-eq", difficulty: "easy", topic_area: "First Order ODEs",
    question: "Classify the ODE $y' + 2y = e^x$: is it linear, separable, or both?",
    correct_answer: "It is linear (first-order linear ODE of the form $y' + P(x)y = Q(x)$). It is not separable because we cannot write it as $g(y)\\,dy = f(x)\\,dx$.",
    hints: ["A linear ODE has the form $y' + P(x)y = Q(x)$."],
  },
  {
    id: "de-e3", topic_id: "differential-eq", difficulty: "easy", topic_area: "First Order ODEs",
    question: "Solve the separable ODE $\\frac{dy}{dx} = \\frac{y}{x}$ for $x > 0$.",
    correct_answer: "$\\frac{dy}{y} = \\frac{dx}{x} \\Rightarrow \\ln|y| = \\ln|x| + C \\Rightarrow y = Ax$ where $A = \\pm e^C$.",
    hints: ["Separate variables: move all $y$ terms to one side and $x$ to the other."],
  },
  {
    id: "de-e4", topic_id: "differential-eq", difficulty: "easy", topic_area: "First Order ODEs",
    question: "Find the general solution of $y' = -2y$.",
    correct_answer: "$y = Ce^{-2x}$. This is exponential decay with rate 2.",
    hints: ["This is a constant-coefficient first-order linear ODE."],
  },
  {
    id: "de-e5", topic_id: "differential-eq", difficulty: "easy", topic_area: "Second Order ODEs",
    question: "Verify that $y = e^{3x}$ is a solution of $y'' - 9y = 0$.",
    correct_answer: "$y' = 3e^{3x}$, $y'' = 9e^{3x}$. $y'' - 9y = 9e^{3x} - 9e^{3x} = 0$ ✓.",
    hints: ["Compute $y''$ and substitute into the equation."],
  },
  // ── medium ──
  {
    id: "de-m1", topic_id: "differential-eq", difficulty: "medium", topic_area: "Integrating Factors",
    question: "Solve $y' + \\frac{2}{x}y = x^3$ using an integrating factor.",
    correct_answer: "IF $= e^{\\int 2/x\\,dx} = x^2$. Multiply: $(x^2 y)' = x^5$. Integrate: $x^2 y = \\frac{x^6}{6} + C$. So $y = \\frac{x^4}{6} + \\frac{C}{x^2}$.",
    hints: ["Integrating factor: $\\mu = e^{\\int P(x)\\,dx}$."],
  },
  {
    id: "de-m2", topic_id: "differential-eq", difficulty: "medium", topic_area: "Second Order ODEs",
    question: "Solve $y'' - 5y' + 6y = 0$.",
    correct_answer: "Characteristic equation: $r^2-5r+6 = (r-2)(r-3)=0$. Roots $r=2,3$. General solution: $y = C_1 e^{2x} + C_2 e^{3x}$.",
    hints: ["Write the characteristic equation.", "Factor or use the quadratic formula."],
  },
  {
    id: "de-m3", topic_id: "differential-eq", difficulty: "medium", topic_area: "Systems",
    question: "Find the general solution of the system $x' = 3x + y$, $y' = x + 3y$.",
    correct_answer: "Matrix $A = \\begin{pmatrix}3&1\\\\1&3\\end{pmatrix}$. Eigenvalues: $\\lambda = 4, 2$. Eigenvectors: $(1,1)$ and $(1,-1)$. Solution: $\\begin{pmatrix}x\\\\y\\end{pmatrix} = C_1 e^{4t}\\begin{pmatrix}1\\\\1\\end{pmatrix} + C_2 e^{2t}\\begin{pmatrix}1\\\\-1\\end{pmatrix}$.",
    hints: ["Write as $\\vec{x}' = A\\vec{x}$ and find eigenvalues/eigenvectors."],
  },
  {
    id: "de-m4", topic_id: "differential-eq", difficulty: "medium", topic_area: "Laplace Transforms",
    question: "Use the Laplace transform to solve $y'' + y = 0$, $y(0)=1$, $y'(0)=0$.",
    correct_answer: "$s^2Y - s + Y = 0 \\Rightarrow Y = \\frac{s}{s^2+1} \\Rightarrow y = \\cos t$.",
    hints: ["$\\mathcal{L}\\{y''\\} = s^2Y - sy(0) - y'(0)$.", "Use known transforms: $\\mathcal{L}^{-1}\\{\\frac{s}{s^2+1}\\} = \\cos t$."],
  },
  {
    id: "de-m5", topic_id: "differential-eq", difficulty: "medium", topic_area: "Undetermined Coefficients",
    question: "Find a particular solution of $y'' - y = e^{2x}$.",
    correct_answer: "Try $y_p = Ae^{2x}$. $y_p'' = 4Ae^{2x}$. $4A - A = 1 \\Rightarrow A = 1/3$. So $y_p = \\frac{1}{3}e^{2x}$.",
    hints: ["Since $e^{2x}$ is not a solution of the homogeneous equation, try $y_p = Ae^{2x}$."],
  },
  // ── hard ──
  {
    id: "de-h1", topic_id: "differential-eq", difficulty: "hard", topic_area: "Power Series",
    question: "Find the power series solution of $y'' - xy = 0$ (Airy's equation) about $x=0$.",
    correct_answer: "Let $y = \\sum a_n x^n$. Then $y'' = \\sum_{n=2} n(n-1)a_n x^{n-2}$, $xy = \\sum a_n x^{n+1}$. Matching coefficients: $a_2 = 0$, and for $n \\ge 1$: $(n+2)(n+1)a_{n+2} = a_{n-1}$. Two linearly independent solutions arise from $a_0=1, a_1=0$ and $a_0=0, a_1=1$.",
    hints: ["Substitute $y = \\sum a_n x^n$ and match powers.", "Find the recurrence relation for $a_n$."],
  },
  {
    id: "de-h2", topic_id: "differential-eq", difficulty: "hard", topic_area: "Stability",
    question: "For the system $x' = x - xy$, $y' = -y + xy$, find all equilibria and classify their stability.",
    correct_answer: "Equilibria: $(0,0)$ and $(1,1)$. Jacobian: $J = \\begin{pmatrix}1-y & -x\\\\y & -1+x\\end{pmatrix}$.\n\nAt $(0,0)$: $J = \\begin{pmatrix}1&0\\\\0&-1\\end{pmatrix}$, eigenvalues $1,-1$ → saddle (unstable).\n\nAt $(1,1)$: $J = \\begin{pmatrix}0&-1\\\\1&0\\end{pmatrix}$, eigenvalues $\\pm i$ → centre (linearization inconclusive, but it's a conservative system so it's a centre).",
    hints: ["Set $x'=0, y'=0$ simultaneously.", "Compute the Jacobian at each equilibrium."],
  },
  {
    id: "de-h3", topic_id: "differential-eq", difficulty: "hard", topic_area: "Sturm–Liouville",
    question: "Find the eigenvalues of $y'' + \\lambda y = 0$ with boundary conditions $y(0)=0$, $y(\\pi)=0$.",
    correct_answer: "For $\\lambda > 0$: $y = A\\sin(\\sqrt{\\lambda}x) + B\\cos(\\sqrt{\\lambda}x)$. $y(0)=0 \\Rightarrow B=0$. $y(\\pi)=0 \\Rightarrow \\sin(\\sqrt{\\lambda}\\pi)=0 \\Rightarrow \\sqrt{\\lambda} = n$. So $\\lambda_n = n^2$ for $n=1,2,3,\\ldots$, with eigenfunctions $y_n = \\sin(nx)$.",
    hints: ["Try the case $\\lambda > 0$ first.", "Apply both boundary conditions."],
  },
  {
    id: "de-h4", topic_id: "differential-eq", difficulty: "hard", topic_area: "PDEs",
    question: "Solve the heat equation $u_t = u_{xx}$ on $0 \\le x \\le \\pi$ with $u(0,t)=u(\\pi,t)=0$ and $u(x,0) = \\sin(2x)$.",
    correct_answer: "By separation of variables, $u(x,t) = \\sum B_n \\sin(nx) e^{-n^2 t}$. Matching $u(x,0) = \\sin(2x)$: $B_2=1$, all others 0. So $u(x,t) = \\sin(2x)e^{-4t}$.",
    hints: ["Use separation of variables: $u = X(x)T(t)$.", "The eigenfunctions are $\\sin(nx)$."],
  },
  // ── even_harder (olympiad) ──
  {
    id: "de-o1", topic_id: "differential-eq", difficulty: "even_harder", topic_area: "Existence & Uniqueness",
    question: "Give a precise statement and proof sketch of the Picard–Lindelöf (existence and uniqueness) theorem for $y' = f(t,y)$, $y(t_0) = y_0$.",
    correct_answer: "**Theorem:** If $f$ is continuous in $t$ and Lipschitz in $y$ on a rectangle $R = \\{|t-t_0| \\le a, |y-y_0| \\le b\\}$, then there exists a unique solution on $|t-t_0| \\le \\min(a, b/M)$ where $M = \\max_R |f|$.\n\n**Proof sketch:** Define the Picard iterates $y_{n+1}(t) = y_0 + \\int_{t_0}^t f(s, y_n(s))\\,ds$. The Lipschitz condition gives $|y_{n+1}-y_n| \\le \\frac{ML^n|t-t_0|^{n+1}}{(n+1)!}$. The series $\\sum (y_{n+1}-y_n)$ converges uniformly by comparison with $e^{L|t-t_0|}$, giving existence. Uniqueness follows from Gronwall's inequality.",
    hints: ["Use successive approximations (Picard iteration).", "The Lipschitz condition controls the convergence."],
  },
  {
    id: "de-o2", topic_id: "differential-eq", difficulty: "even_harder", topic_area: "Nonlinear ODEs",
    question: "Find all solutions to $y'' = 2yy'$ (hint: let $p = y'$).",
    correct_answer: "Let $p = y'$. Then $y'' = p\\frac{dp}{dy} = 2yp$. If $p \\neq 0$: $\\frac{dp}{dy} = 2y \\Rightarrow p = y^2 + C_1$. Then $\\frac{dy}{y^2+C_1} = dx$. For $C_1 > 0$: $y = \\sqrt{C_1}\\tan(\\sqrt{C_1}(x+C_2))$. For $C_1 = 0$: $y = -1/(x+C_2)$. For $C_1 < 0$: involves $\\tanh$. Also $p=0$ gives constant solutions $y = C$, but substituting back: $0 = 0$ ✓.",
    hints: ["Reduce order: let $p = y'$ and write $y'' = p\\frac{dp}{dy}$.", "This becomes a separable ODE in $p$ and $y$."],
  },
  {
    id: "de-o3", topic_id: "differential-eq", difficulty: "even_harder", topic_area: "Green's Functions",
    question: "Find the Green's function for $y'' = f(x)$ on $[0,1]$ with $y(0) = y(1) = 0$.",
    correct_answer: "The Green's function is:\n$$G(x,\\xi) = \\begin{cases} \\xi(1-x) & 0 \\le \\xi \\le x \\\\ x(1-\\xi) & x \\le \\xi \\le 1 \\end{cases}$$\n\nDerivation: For $x \\neq \\xi$, $G'' = 0$ so $G$ is piecewise linear. Boundary conditions: $G(0,\\xi)=G(1,\\xi)=0$. Continuity at $x=\\xi$ and jump condition $G'(\\xi^+)-G'(\\xi^-) = 1$ determine the coefficients.",
    hints: ["$G$ is piecewise linear (solving $G''=0$ on each piece).", "Apply BCs, continuity, and the jump condition on $G'$."],
  },
  {
    id: "de-o4", topic_id: "differential-eq", difficulty: "even_harder", topic_area: "Dynamical Systems",
    question: "Prove the Poincaré–Bendixson theorem: if a trajectory of a planar autonomous system stays in a bounded region containing no equilibria, then the $\\omega$-limit set is a periodic orbit.",
    correct_answer: "Sketch: The $\\omega$-limit set $\\Omega$ is non-empty (bounded sequence has convergent subsequence), compact, connected, and invariant. Since $\\Omega$ contains no equilibria, every point in $\\Omega$ lies on a regular orbit. A trajectory in $\\Omega$ cannot spiral (by the Jordan curve theorem, any closed curve divides the plane into inside/outside, constraining where trajectories can go). By the non-crossing property of trajectories in 2D, the $\\omega$-limit must be a single closed orbit.",
    hints: ["Use compactness and connectedness of the $\\omega$-limit set.", "The Jordan curve theorem is key in 2D."],
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
//  COMBINED BANK & QUERY HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

/** Full question bank — all subjects, all difficulties */
export const QUESTION_BANK: QuestionBankEntry[] = [
  ...LINEAR_ALGEBRA,
  ...CALCULUS_II,
  ...PROBABILITY,
  ...STATISTICS,
  ...DISCRETE_MATH,
  ...DIFFERENTIAL_EQ,
];

/**
 * Get questions filtered by topic id and difficulty.
 * Returns a shuffled copy so repeated calls yield different orderings.
 */
export function getQuestions(
  topicId: string,
  difficulty: Difficulty,
  count = 5,
): QuestionBankEntry[] {
  const pool = QUESTION_BANK.filter(
    (q) => q.topic_id === topicId && q.difficulty === difficulty,
  );
  // Fisher-Yates shuffle
  const shuffled = [...pool];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, count);
}

/**
 * Get questions for a topic across all difficulties (for practice mode).
 * Returns a mix weighted toward medium/hard.
 */
export function getMixedQuestions(topicId: string, count = 5): QuestionBankEntry[] {
  const pool = QUESTION_BANK.filter((q) => q.topic_id === topicId);
  const shuffled = [...pool];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, count);
}

/** Get all available difficulties for a given topic */
export function getAvailableDifficulties(topicId: string): Difficulty[] {
  const diffs = new Set(
    QUESTION_BANK.filter((q) => q.topic_id === topicId).map((q) => q.difficulty),
  );
  return ["easy", "medium", "hard", "even_harder"].filter((d) =>
    diffs.has(d as Difficulty),
  ) as Difficulty[];
}

/** Total count per topic per difficulty (for UI display) */
export function getQuestionCounts(topicId: string): Record<Difficulty, number> {
  const counts: Record<Difficulty, number> = { easy: 0, medium: 0, hard: 0, even_harder: 0 };
  for (const q of QUESTION_BANK) {
    if (q.topic_id === topicId) {
      counts[q.difficulty]++;
    }
  }
  return counts;
}
