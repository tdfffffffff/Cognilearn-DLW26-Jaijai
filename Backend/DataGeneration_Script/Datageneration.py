"""
Phase 1 — Synthetic Data Generation
====================================
Outputs (written to Model/GeneratedData/):
  • sample_interactions.json   — 1 200+ student interaction records
  • curriculum_notes.json      — 25 concept-explanation entries for RAG

Run (from repo root):
    python Backend/DataGeneration_Script/Datageneration.py
"""

import json
import random
from datetime import datetime, timedelta, timezone
from pathlib import Path

# ── Output paths --------------------------------------------------------
# Resolves to Model/GeneratedData/ regardless of where the script is invoked from
OUT_DIR = Path(__file__).parent.parent.parent / "Model" / "GeneratedData"
OUT_DIR.mkdir(parents=True, exist_ok=True)
INTERACTIONS_FILE = OUT_DIR / "sample_interactions.json"
CURRICULUM_FILE   = OUT_DIR / "curriculum_notes.json"

# ── Seeded RNG -----------------------------------------------------------
random.seed(42)

# ════════════════════════════════════════════════════════════════════════
# 1.  CURRICULUM NOTES
# ════════════════════════════════════════════════════════════════════════

CURRICULUM_NOTES = [
    # ── Calculus ────────────────────────────────────────────────────────
    {
        "topic_id": "calc-limits",
        "title": "Limits and Continuity",
        "content": (
            "A limit describes the value a function approaches as the input approaches some point. "
            "Formally, lim_{x→c} f(x) = L means that for every ε > 0 there exists δ > 0 such that "
            "0 < |x − c| < δ implies |f(x) − L| < ε. A function is continuous at c if the limit "
            "equals f(c). Key techniques: factoring to cancel (0/0) indeterminate forms, rationalising, "
            "and L'Hôpital's Rule for ∞/∞ or 0/0 forms. One-sided limits must agree for the two-sided "
            "limit to exist. Squeeze theorem: if g(x) ≤ f(x) ≤ h(x) and lim g = lim h = L, then lim f = L."
        ),
        "prerequisites": [],
    },
    {
        "topic_id": "calc-derivatives",
        "title": "Differentiation",
        "content": (
            "The derivative f′(x) = lim_{h→0} [f(x+h)−f(x)]/h gives the instantaneous rate of change. "
            "Core rules: power rule d/dx[xⁿ] = nxⁿ⁻¹, product rule (uv)′ = u′v + uv′, "
            "quotient rule (u/v)′ = (u′v − uv′)/v², chain rule d/dx[f(g(x))] = f′(g(x))·g′(x). "
            "Common derivatives: sin→cos, cos→−sin, eˣ→eˣ, ln x→1/x. "
            "Higher-order derivatives represent successive rates of change; the second derivative "
            "indicates concavity. Critical points occur where f′ = 0 or f′ is undefined."
        ),
        "prerequisites": ["calc-limits"],
    },
    {
        "topic_id": "calc-integrals",
        "title": "Integration by Parts",
        "content": (
            "Integration by parts derives from the product rule: ∫u dv = uv − ∫v du. "
            "Choose u using the LIATE priority (Logarithmic, Inverse trig, Algebraic, "
            "Trigonometric, Exponential). Example: ∫x eˣ dx — let u = x, dv = eˣ dx, "
            "so du = dx, v = eˣ, giving x eˣ − eˣ + C. For cyclic integrals (∫eˣ sin x dx) "
            "apply parts twice and solve algebraically. The definite-integral version: "
            "[uv]_a^b − ∫_a^b v du. Tabular integration accelerates repeated applications."
        ),
        "prerequisites": ["calc-derivatives"],
    },
    {
        "topic_id": "calc-techniques",
        "title": "Integration Techniques",
        "content": (
            "Beyond integration by parts, key techniques include: "
            "(1) Substitution: let u = g(x), du = g′(x) dx — transforms the integrand into a simpler form. "
            "(2) Trigonometric substitution: for √(a²−x²) let x = a sin θ; for √(a²+x²) let x = a tan θ. "
            "(3) Partial fractions: decompose a rational function P(x)/Q(x) where deg P < deg Q "
            "into simpler fractions over linear or irreducible quadratic factors. "
            "(4) Trigonometric integrals: use power-reduction identities sin²x = (1−cos 2x)/2. "
            "Always check whether a simple substitution works before resorting to heavier methods."
        ),
        "prerequisites": ["calc-integrals"],
    },
    {
        "topic_id": "calc-taylor-series",
        "title": "Taylor and Maclaurin Series",
        "content": (
            "A Taylor series expands f around a point a: f(x) = Σ f⁽ⁿ⁾(a)/n! · (x−a)ⁿ. "
            "The Maclaurin series is the special case a = 0. "
            "Key series: eˣ = Σ xⁿ/n!, sin x = Σ (−1)ⁿ x^(2n+1)/(2n+1)!, "
            "cos x = Σ (−1)ⁿ x^(2n)/(2n)!, 1/(1−x) = Σ xⁿ for |x|<1. "
            "The remainder term Rₙ(x) = f⁽ⁿ⁺¹⁾(c)/(n+1)! · (x−a)ⁿ⁺¹ bounds the approximation error. "
            "Convergence is determined by the radius of convergence R = 1/limsup |aₙ|^(1/n)."
        ),
        "prerequisites": ["calc-derivatives", "calc-integrals"],
    },
    {
        "topic_id": "calc-multivariable",
        "title": "Multivariable Calculus",
        "content": (
            "For f: ℝⁿ → ℝ, partial derivatives ∂f/∂xᵢ hold all other variables fixed. "
            "The gradient ∇f = (∂f/∂x, ∂f/∂y, ...) points in the direction of steepest ascent. "
            "The chain rule for f(g(t), h(t)): df/dt = ∂f/∂x · g′(t) + ∂f/∂y · h′(t). "
            "Critical points satisfy ∇f = 0; classify using the Hessian matrix H: "
            "if det H > 0 and ∂²f/∂x² > 0 → local min; det H > 0 and < 0 → local max; det H < 0 → saddle. "
            "Double integrals ∬_D f dA computed by iterated integration or polar coordinates."
        ),
        "prerequisites": ["calc-derivatives", "calc-integrals"],
    },
    # ── Linear Algebra ──────────────────────────────────────────────────
    {
        "topic_id": "linalg-vectors",
        "title": "Vectors and Vector Spaces",
        "content": (
            "A vector space V over ℝ satisfies 8 axioms including closure under addition and scalar multiplication. "
            "A subspace must contain the zero vector and be closed under both operations. "
            "A set S spans V if every vector in V is a linear combination of elements of S. "
            "S is linearly independent if Σ cᵢvᵢ = 0 implies all cᵢ = 0. "
            "A basis is a linearly independent spanning set; its size is the dimension of V. "
            "Dot product: u·v = Σ uᵢvᵢ; |u| = √(u·u). cos θ = (u·v)/(|u||v|). "
            "Cross product u×v is orthogonal to both u and v with magnitude |u||v| sin θ."
        ),
        "prerequisites": [],
    },
    {
        "topic_id": "linalg-matrices",
        "title": "Matrix Operations",
        "content": (
            "An m×n matrix A has rows m and columns n. Matrix multiplication AB requires A's columns = B's rows; "
            "(AB)ᵢⱼ = Σₖ AᵢₖBₖⱼ — not commutative in general. "
            "Transpose (Aᵀ)ᵢⱼ = Aⱼᵢ; (AB)ᵀ = BᵀAᵀ. "
            "Determinant of 2×2: ad−bc. For n×n, expand along any row/column (cofactor expansion). "
            "det(AB) = det(A)·det(B). A is invertible iff det(A) ≠ 0; A⁻¹ = adj(A)/det(A). "
            "Row echelon form via Gaussian elimination; reduced row echelon form (RREF) via Gauss-Jordan. "
            "Rank = number of pivot positions = dim(column space)."
        ),
        "prerequisites": ["linalg-vectors"],
    },
    {
        "topic_id": "linalg-linear-systems",
        "title": "Systems of Linear Equations",
        "content": (
            "Ax = b: unique solution when A is invertible (det ≠ 0); infinitely many when rank(A) = rank([A|b]) < n; "
            "no solution when rank(A) < rank([A|b]). "
            "Solve via row reduction on the augmented matrix [A|b]. "
            "Back-substitution after forward elimination obtains the solution. "
            "The null space (kernel) of A is the solution set of Ax = 0; its dimension is the nullity. "
            "Rank-nullity theorem: rank(A) + nullity(A) = n (number of columns). "
            "Cramer's Rule: xᵢ = det(Aᵢ)/det(A) where Aᵢ has column i replaced by b."
        ),
        "prerequisites": ["linalg-matrices"],
    },
    {
        "topic_id": "linalg-eigenvalues",
        "title": "Eigenvalues and Eigenvectors",
        "content": (
            "λ is an eigenvalue of A with eigenvector v ≠ 0 if Av = λv. "
            "Find eigenvalues by solving the characteristic equation det(A − λI) = 0. "
            "For each λ, the eigenspace = null(A − λI). "
            "A is diagonalisable iff it has n linearly independent eigenvectors: A = PDP⁻¹ where "
            "D is diagonal (eigenvalues) and P's columns are eigenvectors. "
            "Symmetric matrices always have real eigenvalues and orthogonal eigenvectors (spectral theorem). "
            "Applications: PCA reduces to eigendecomposition of the covariance matrix; "
            "Markov chain steady states are eigenvectors with eigenvalue 1."
        ),
        "prerequisites": ["linalg-matrices", "linalg-linear-systems"],
    },
    {
        "topic_id": "linalg-transformations",
        "title": "Linear Transformations",
        "content": (
            "T: V → W is linear if T(u+v) = T(u)+T(v) and T(cu) = cT(u). "
            "Every linear map between finite-dimensional spaces is represented by a matrix [T] relative to chosen bases. "
            "Kernel (null space) = {v : T(v) = 0}; image (range) = {T(v) : v ∈ V}. "
            "Rank-nullity: dim(ker T) + dim(im T) = dim(V). "
            "Change of basis: if B and B′ are bases, [T]_{B′} = P⁻¹[T]_B P where P is the change-of-basis matrix. "
            "Geometric transformations: rotation by θ → [[cos θ, −sin θ],[sin θ, cos θ]]; "
            "reflection, scaling, shear each have canonical matrix representations."
        ),
        "prerequisites": ["linalg-matrices", "linalg-vectors"],
    },
    # ── Probability ─────────────────────────────────────────────────────
    {
        "topic_id": "prob-basics",
        "title": "Probability Fundamentals",
        "content": (
            "A probability space (Ω, F, P) consists of sample space Ω, σ-algebra F of events, and measure P. "
            "Axioms: P(Ω) = 1, P(A) ≥ 0, countable additivity for disjoint events. "
            "Complement rule: P(Aᶜ) = 1 − P(A). "
            "Inclusion-exclusion: P(A∪B) = P(A) + P(B) − P(A∩B). "
            "Events are independent if P(A∩B) = P(A)·P(B). "
            "Equally likely outcomes: P(A) = |A|/|Ω|. "
            "Combinatorics: nPr = n!/(n−r)! (ordered), nCr = n!/[r!(n−r)!] (unordered)."
        ),
        "prerequisites": [],
    },
    {
        "topic_id": "prob-conditional",
        "title": "Conditional Probability",
        "content": (
            "P(A|B) = P(A∩B)/P(B) for P(B) > 0 — the probability of A given B has occurred. "
            "Multiplication rule: P(A∩B) = P(A|B)·P(B). "
            "Law of total probability: if {Bᵢ} partition Ω, then P(A) = Σ P(A|Bᵢ)·P(Bᵢ). "
            "Independent events: P(A|B) = P(A) (knowing B gives no information about A). "
            "Common mistake: confusing P(A|B) with P(B|A) — these are generally different (base-rate neglect). "
            "Sequential problems: tree diagrams track P(path) = product of edge probabilities."
        ),
        "prerequisites": ["prob-basics"],
    },
    {
        "topic_id": "prob-bayes",
        "title": "Bayes' Theorem",
        "content": (
            "Bayes' theorem: P(H|E) = P(E|H)·P(H) / P(E). "
            "Here P(H) is the prior, P(E|H) the likelihood, P(E) the marginal (normalisation constant), "
            "and P(H|E) the posterior. "
            "Expand denominator via total probability: P(E) = Σ P(E|Hᵢ)·P(Hᵢ). "
            "Medical testing example: even a 99% accurate test yields many false positives when the "
            "disease is rare — because a low prior P(H) dominates. "
            "Bayesian updating: the posterior from one observation becomes the prior for the next, "
            "allowing sequential belief revision. Conjugate priors (e.g. Beta-Binomial) give closed-form posteriors."
        ),
        "prerequisites": ["prob-conditional"],
    },
    {
        "topic_id": "prob-distributions",
        "title": "Probability Distributions",
        "content": (
            "Discrete distributions — Bernoulli(p): P(X=1)=p; Binomial(n,p): P(X=k)=C(n,k)pᵏ(1−p)ⁿ⁻ᵏ; "
            "Poisson(λ): P(X=k)=e⁻λλᵏ/k! models rare events in fixed time. "
            "Continuous distributions — Uniform(a,b): f(x)=1/(b−a); "
            "Normal(μ,σ²): f(x)=(1/σ√2π)exp(−(x−μ)²/2σ²); "
            "Exponential(λ): f(x)=λe⁻λˣ (memoryless property). "
            "CDF F(x) = P(X ≤ x); PDF f(x) = F′(x). "
            "Standard normal Z ~ N(0,1); standardise with Z = (X−μ)/σ. "
            "Central Limit Theorem: for large n, X̄ ~ N(μ, σ²/n) regardless of the population distribution."
        ),
        "prerequisites": ["prob-basics"],
    },
    {
        "topic_id": "prob-expectation",
        "title": "Expected Value and Variance",
        "content": (
            "E[X] = Σ x·P(X=x) (discrete) or ∫ x f(x) dx (continuous). "
            "Linearity: E[aX + bY] = aE[X] + bE[Y] always (even if X, Y dependent). "
            "Var(X) = E[X²] − (E[X])² = E[(X−μ)²]; SD(X) = √Var(X). "
            "Var(aX + b) = a²Var(X). For independent X, Y: Var(X+Y) = Var(X) + Var(Y). "
            "Covariance Cov(X,Y) = E[XY] − E[X]E[Y]; independent → Cov = 0 (not conversely). "
            "Correlation ρ = Cov(X,Y)/(SD(X)·SD(Y)) ∈ [−1, 1]. "
            "Moment generating function M(t) = E[eᵗˣ]; Mˣ⁽ⁿ⁾(0) = E[Xⁿ]."
        ),
        "prerequisites": ["prob-distributions"],
    },
    # ── Statistics ──────────────────────────────────────────────────────
    {
        "topic_id": "stats-descriptive",
        "title": "Descriptive Statistics",
        "content": (
            "Measures of centre: mean x̄ = (Σxᵢ)/n; median (middle value); mode (most frequent). "
            "Measures of spread: range = max−min; IQR = Q3−Q1; "
            "sample variance s² = Σ(xᵢ−x̄)²/(n−1) (Bessel's correction for unbiasedness); SD = √s². "
            "Five-number summary: min, Q1, median, Q3, max — displayed as a box-and-whisker plot. "
            "Outliers: values beyond Q1−1.5·IQR or Q3+1.5·IQR. "
            "Skewness measures asymmetry; kurtosis measures tail heaviness relative to normal. "
            "Histogram bin width: Sturges' rule k = ⌈log₂ n⌉ + 1."
        ),
        "prerequisites": ["prob-basics"],
    },
    {
        "topic_id": "stats-hypothesis",
        "title": "Hypothesis Testing",
        "content": (
            "Null hypothesis H₀ (no effect) vs alternative H₁. "
            "Type I error (α): reject true H₀; Type II error (β): fail to reject false H₀. Power = 1−β. "
            "p-value: probability of observing data at least as extreme as the sample, assuming H₀ is true. "
            "Reject H₀ if p-value < α (commonly 0.05). "
            "z-test: σ known; t-test: σ unknown (uses t-distribution with n−1 df). "
            "t-statistic: t = (x̄ − μ₀)/(s/√n). "
            "Two-sample t-test compares means of two independent groups. "
            "Chi-squared test: goodness-of-fit or independence in contingency tables. "
            "Multiple testing correction: Bonferroni α* = α/m for m simultaneous tests."
        ),
        "prerequisites": ["stats-descriptive", "prob-distributions"],
    },
    {
        "topic_id": "stats-confidence",
        "title": "Confidence Intervals",
        "content": (
            "A 95% CI for μ: x̄ ± t_{α/2, n−1} · s/√n. "
            "Interpretation: if we repeated the sampling procedure many times, 95% of the constructed intervals "
            "would contain the true μ — NOT that there is a 95% chance μ lies in this particular interval. "
            "Width ∝ 1/√n — quadrupling n halves the width. "
            "CI and hypothesis test duality: the 95% CI contains all μ₀ values that would not be rejected "
            "at α = 0.05. "
            "Bootstrap CI: resample with replacement B times, compute statistic each time, "
            "take the (α/2) and (1−α/2) percentiles of the bootstrap distribution."
        ),
        "prerequisites": ["stats-hypothesis"],
    },
    {
        "topic_id": "stats-regression",
        "title": "Linear Regression",
        "content": (
            "Simple OLS: ŷ = β₀ + β₁x minimises Σ(yᵢ − ŷᵢ)². "
            "Estimates: β̂₁ = Σ(xᵢ−x̄)(yᵢ−ȳ)/Σ(xᵢ−x̄)²; β̂₀ = ȳ − β̂₁x̄. "
            "R² = 1 − SS_res/SS_tot measures proportion of variance explained (0–1). "
            "Assumptions (LINE): Linear relationship, Independent errors, Normal residuals, Equal variance (homoscedasticity). "
            "Multiple regression in matrix form: β̂ = (XᵀX)⁻¹Xᵀy. "
            "VIF detects multicollinearity; residual plots diagnose heteroscedasticity. "
            "Regularisation: Ridge (L2) shrinks coefficients; LASSO (L1) induces sparsity."
        ),
        "prerequisites": ["stats-descriptive", "linalg-matrices"],
    },
    {
        "topic_id": "stats-anova",
        "title": "Analysis of Variance (ANOVA)",
        "content": (
            "One-way ANOVA tests whether k group means are all equal (H₀: μ₁=…=μₖ). "
            "Partition total variance: SS_total = SS_between + SS_within. "
            "F-statistic = MS_between/MS_within where MS = SS/df. "
            "Between df = k−1; within df = N−k. "
            "Reject H₀ if F > F_{α, k−1, N−k}. "
            "ANOVA assumes normality within groups and homogeneity of variance (Levene's test). "
            "Post-hoc tests (Tukey HSD, Bonferroni) identify which pairs differ after rejecting H₀. "
            "Two-way ANOVA adds a second factor and an interaction term."
        ),
        "prerequisites": ["stats-hypothesis"],
    },
    # ── Differential Equations ──────────────────────────────────────────
    {
        "topic_id": "diffeq-first-order",
        "title": "First-Order Differential Equations",
        "content": (
            "A first-order ODE has the form dy/dx = f(x, y). "
            "Separable: g(y) dy = h(x) dx → integrate both sides. "
            "Linear: y′ + P(x)y = Q(x) → integrating factor μ(x) = e^{∫P dx}; solution y = (1/μ)∫μQ dx. "
            "Exact equations: M dx + N dy = 0 is exact iff ∂M/∂y = ∂N/∂x; find F with F_x = M, F_y = N. "
            "Bernoulli equation y′ + P(x)y = Q(x)yⁿ: substitute v = y^{1−n}. "
            "Equilibrium solutions: set dy/dx = 0; classify stability by checking the sign of f near the equilibrium."
        ),
        "prerequisites": ["calc-integrals"],
    },
    {
        "topic_id": "diffeq-second-order",
        "title": "Second-Order Differential Equations",
        "content": (
            "Linear second-order ODE: ay″ + by′ + cy = g(x). "
            "Homogeneous (g = 0): characteristic equation ar² + br + c = 0. "
            "Two distinct real roots r₁, r₂ → y = C₁e^{r₁x} + C₂e^{r₂x}. "
            "Repeated root r → y = (C₁ + C₂x)eˣʳ. "
            "Complex roots α ± βi → y = eᵅˣ(C₁ cos βx + C₂ sin βx). "
            "Non-homogeneous: particular solution via undetermined coefficients (for polynomial/exponential/trig forcing) "
            "or variation of parameters (general). "
            "IVP: two initial conditions y(x₀) = y₀, y′(x₀) = y₁ determine C₁, C₂."
        ),
        "prerequisites": ["diffeq-first-order"],
    },
    {
        "topic_id": "diffeq-systems",
        "title": "Systems of Differential Equations",
        "content": (
            "A system x′ = Ax can be solved via eigenvalues of A. "
            "For each eigenvalue λ with eigenvector v: solution component eˡᵗv. "
            "General solution is a linear combination of all eigensolution components. "
            "Repeated eigenvalues require generalised eigenvectors: (A−λI)w = v → solution te^{λt}v + e^{λt}w. "
            "Phase portrait: trajectory directions determined by the sign of eigenvalues. "
            "Stable node (both λ < 0), unstable node (both λ > 0), saddle (opposite signs), "
            "spiral (complex λ with non-zero real part), centre (pure imaginary λ). "
            "Matrix exponential e^{At} = PeDPe^{-1} where D is diagonal of eigenvalues."
        ),
        "prerequisites": ["diffeq-second-order", "linalg-eigenvalues"],
    },
    {
        "topic_id": "diffeq-laplace",
        "title": "Laplace Transforms",
        "content": (
            "L{f(t)} = F(s) = ∫₀^∞ e^{−st}f(t) dt. "
            "Key pairs: L{1} = 1/s, L{eᵅᵗ} = 1/(s−α), L{sin ωt} = ω/(s²+ω²), L{tⁿ} = n!/s^{n+1}. "
            "Linearity: L{af+bg} = aF+bG. "
            "Derivative rule: L{f′} = sF(s)−f(0); L{f″} = s²F−sf(0)−f′(0). "
            "Solve IVPs: apply L to both sides → algebraic equation in F(s) → solve → inverse transform. "
            "Inverse via partial fractions and table lookup. "
            "Convolution theorem: L{f*g} = F(s)G(s). "
            "Step function u_c(t) = u(t−c) and L{u_c f(t−c)} = e^{−cs}F(s) handle piecewise forcing."
        ),
        "prerequisites": ["diffeq-second-order", "calc-integrals"],
    },
]

# ════════════════════════════════════════════════════════════════════════
# 2.  SYNTHETIC INTERACTIONS
# ════════════════════════════════════════════════════════════════════════

TOPIC_IDS = [n["topic_id"] for n in CURRICULUM_NOTES]
TOPIC_PREREQS = {n["topic_id"]: n["prerequisites"] for n in CURRICULUM_NOTES}

N_STUDENTS = 25
BASE_DATE = datetime(2026, 1, 1, tzinfo=timezone.utc)
TARGET_RECORDS = 1_200


def _rand_timestamp(base: datetime, day_offset_range: tuple[int, int]) -> str:
    days = random.randint(*day_offset_range)
    hour = random.randint(8, 22)
    minute = random.choice([0, 15, 30, 45])
    return (base + timedelta(days=days, hours=hour, minutes=minute)).isoformat()


def _generate_profile(error_label: str) -> dict:
    """Return per-student-topic behavioural parameters for the given label."""
    if error_label == "knowledge_gap":
        return {
            "base_accuracy": random.uniform(0.05, 0.28),
            "accuracy_variance": random.uniform(0.01, 0.06),
            "time_correct_mean": random.uniform(60, 120),
            "time_wrong_mean": random.uniform(55, 115),
            "timed_accuracy_delta": random.uniform(-0.05, 0.08),
            "days_since_last_correct_range": (0, 7),
        }
    if error_label == "careless":
        return {
            "base_accuracy": random.uniform(0.70, 0.90),
            "accuracy_variance": random.uniform(0.12, 0.22),
            "time_correct_mean": random.uniform(8, 18),
            "time_wrong_mean": random.uniform(5, 14),
            "timed_accuracy_delta": random.uniform(-0.05, 0.10),
            "days_since_last_correct_range": (0, 5),
        }
    if error_label == "misconception":
        return {
            "base_accuracy": random.uniform(0.25, 0.55),
            "accuracy_variance": random.uniform(0.02, 0.08),
            "time_correct_mean": random.uniform(30, 60),
            "time_wrong_mean": random.uniform(6, 16),
            "timed_accuracy_delta": random.uniform(-0.08, 0.08),
            "days_since_last_correct_range": (0, 10),
        }
    if error_label == "transfer_failure":
        return {
            "base_accuracy": random.uniform(0.30, 0.55),
            "accuracy_variance": random.uniform(0.08, 0.18),
            "time_correct_mean": random.uniform(40, 80),
            "time_wrong_mean": random.uniform(35, 75),
            "timed_accuracy_delta": random.uniform(-0.05, 0.10),
            "days_since_last_correct_range": (0, 8),
        }
    if error_label == "decay":
        return {
            "base_accuracy": random.uniform(0.25, 0.50),
            "accuracy_variance": random.uniform(0.05, 0.15),
            "time_correct_mean": random.uniform(35, 70),
            "time_wrong_mean": random.uniform(40, 75),
            "timed_accuracy_delta": random.uniform(-0.08, 0.08),
            "days_since_last_correct_range": (22, 60),
        }
    # anxiety
    return {
        "base_accuracy": random.uniform(0.45, 0.70),
        "accuracy_variance": random.uniform(0.08, 0.18),
        "time_correct_mean": random.uniform(30, 60),
        "time_wrong_mean": random.uniform(25, 55),
        "timed_accuracy_delta": random.uniform(0.30, 0.55),
        "days_since_last_correct_range": (0, 10),
    }


def _generate_interactions_for_profile(
    student_id: str,
    topic_id: str,
    error_label: str,
    profile: dict,
    q_counter: list,
) -> list[dict]:
    """Generate 4–8 interaction records consistent with the error profile."""
    n_records = random.randint(4, 8)
    records = []
    prereqs = TOPIC_PREREQS.get(topic_id, [])

    for attempt in range(1, n_records + 1):
        # Determine correctness by sampling around the profile's base accuracy
        noise = random.gauss(0, profile["accuracy_variance"])
        effective_acc = max(0.0, min(1.0, profile["base_accuracy"] + noise))
        is_correct = random.random() < effective_acc

        # Timed condition — anxiety students perform worse under time pressure
        timed = random.random() < 0.5
        if error_label == "anxiety" and timed:
            is_correct = random.random() < max(0.0, effective_acc - profile["timed_accuracy_delta"])

        # Time taken (seconds)
        if is_correct:
            time_taken = max(3, int(random.gauss(profile["time_correct_mean"], 8)))
        else:
            time_taken = max(3, int(random.gauss(profile["time_wrong_mean"], 8)))

        # Days since last correct
        dslc = random.randint(*profile["days_since_last_correct_range"])

        # Question ID
        q_counter[0] += 1
        question_id = f"q_{q_counter[0]:04d}"

        # Timestamp: spread over Jan–Feb 2026
        session_ts = _rand_timestamp(BASE_DATE, (0, 55))

        records.append(
            {
                "student_id": student_id,
                "topic": topic_id,
                "question_id": question_id,
                "is_correct": is_correct,
                "time_taken_seconds": time_taken,
                "attempt_number": attempt,
                "timed_condition": timed,
                "session_timestamp": session_ts,
                "days_since_last_correct": dslc,
                "cross_topic_ids": prereqs[:2] if prereqs else [],
                "error_label": error_label,
            }
        )

    return records


def generate_interactions() -> list[dict]:
    """Build ≥TARGET_RECORDS student interaction records."""
    all_records: list[dict] = []
    q_counter = [0]  # mutable counter shared across calls

    student_ids = [f"stu_{i:03d}" for i in range(1, N_STUDENTS + 1)]
    error_labels = [
        "knowledge_gap", "careless", "misconception",
        "transfer_failure", "decay", "anxiety",
    ]

    # Each student gets assigned ~8–12 topics with randomised error labels
    for student_id in student_ids:
        n_topics = random.randint(8, 12)
        assigned_topics = random.sample(TOPIC_IDS, n_topics)
        for topic_id in assigned_topics:
            label = random.choice(error_labels)
            profile = _generate_profile(label)
            records = _generate_interactions_for_profile(
                student_id, topic_id, label, profile, q_counter
            )
            all_records.extend(records)

    # Pad to target if we fell short (unlikely but safe)
    while len(all_records) < TARGET_RECORDS:
        extra_student = random.choice(student_ids)
        extra_topic   = random.choice(TOPIC_IDS)
        label         = random.choice(error_labels)
        profile       = _generate_profile(label)
        all_records.extend(
            _generate_interactions_for_profile(
                extra_student, extra_topic, label, profile, q_counter
            )
        )

    random.shuffle(all_records)
    return all_records


# ════════════════════════════════════════════════════════════════════════
# 3.  MAIN
# ════════════════════════════════════════════════════════════════════════

def main() -> None:
    # ── Curriculum notes ────────────────────────────────────────────────
    with open(CURRICULUM_FILE, "w", encoding="utf-8") as f:
        json.dump(CURRICULUM_NOTES, f, indent=2, ensure_ascii=False)
    print(f"[✓] curriculum_notes.json  — {len(CURRICULUM_NOTES)} topics  →  {CURRICULUM_FILE}")

    # ── Student interactions ────────────────────────────────────────────
    interactions = generate_interactions()
    with open(INTERACTIONS_FILE, "w", encoding="utf-8") as f:
        json.dump(interactions, f, indent=2, ensure_ascii=False)
    print(
        f"[✓] sample_interactions.json — {len(interactions):,} records  →  {INTERACTIONS_FILE}"
    )

    # ── Summary stats ───────────────────────────────────────────────────
    from collections import Counter
    label_counts = Counter(r["error_label"] for r in interactions)
    print("\nError label distribution:")
    for label, count in sorted(label_counts.items()):
        bar = "█" * (count // 20)
        print(f"  {label:<20s} {count:>5d}  {bar}")

    unique_students = len({r["student_id"] for r in interactions})
    unique_topics   = len({r["topic"]       for r in interactions})
    print(f"\nStudents: {unique_students}   Topics covered: {unique_topics}")


if __name__ == "__main__":
    main()
