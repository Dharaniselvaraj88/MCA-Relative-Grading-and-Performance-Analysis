import { Question, SectionMeta, SectionId } from '../types';

export const SECTION_METADATA: SectionMeta[] = [
  {
    id: 'calculus',
    title: 'Limits & Continuity',
    subtitle: 'Limits, continuity, indeterminate forms, one-sided limits & asymptotic behavior',
    shortCode: 'LIM',
    questionCount: 10,
    iconName: 'Sigma'
  },
  {
    id: 'probability',
    title: 'Differentiation',
    subtitle: 'Derivatives, chain rule, implicit differentiation, tangent lines & rate of change',
    shortCode: 'DIFF',
    questionCount: 10,
    iconName: 'Dices'
  },
  {
    id: 'numberSystem',
    title: 'Integration',
    subtitle: 'Definite & indefinite integrals, substitution, integration by parts & areas',
    shortCode: 'INT',
    questionCount: 10,
    iconName: 'Binary'
  },
  {
    id: 'trigonometry',
    title: 'Probability & Statistics',
    subtitle: 'Sample spaces, conditional probability, Bayes theorem, distributions & central tendency',
    shortCode: 'P&S',
    questionCount: 10,
    iconName: 'Triangle'
  },
  {
    id: 'statistics',
    title: 'Matrices & Determinants',
    subtitle: 'Matrix algebra, determinants, inverse, rank, eigenvalues & systems of linear equations',
    shortCode: 'MAT',
    questionCount: 10,
    iconName: 'BarChart3'
  }
];

export const ALL_QUESTIONS: Question[] = [
  // ==========================================
  // DOMAIN 1: LIMITS & CONTINUITY (20 Questions: 8 Easy, 6 Medium, 6 Hard)
  // ==========================================
  {
    id: 'cal-1',
    sectionId: 'calculus',
    difficulty: 'easy',
    questionNumber: 1,
    questionText: 'Evaluate the trigonometric limit: lim (x -> 0) [ sin(5x) / (3x) ].',
    options: ['0', '3/5', '5/3', '15'],
    correctAnswer: 2,
    explanation: 'Using the standard trigonometric limit lim(u->0) [sin(u)/u] = 1, we rewrite sin(5x)/(3x) = (5/3) * [sin(5x)/(5x)]. As x -> 0, this approaches 5/3.'
  },
  {
    id: 'cal-2',
    sectionId: 'calculus',
    difficulty: 'easy',
    questionNumber: 2,
    questionText: 'Find the value of k that makes f(x) continuous at x = 4, where f(x) = (x^2 - 16)/(x - 4) for x ≠ 4, and f(4) = k.',
    options: ['4', '8', '12', '16'],
    correctAnswer: 1,
    explanation: 'For continuity at x = 4, f(4) must equal lim(x -> 4) [(x - 4)(x + 4)/(x - 4)] = lim(x -> 4) (x + 4) = 8. Hence k = 8.'
  },
  {
    id: 'cal-3',
    sectionId: 'calculus',
    difficulty: 'easy',
    questionNumber: 3,
    questionText: 'Differentiate y = x^3 * sin(x) with respect to x using the product rule.',
    options: ['3x^2 * cos(x)', '3x^2 * sin(x) + x^3 * cos(x)', 'x^3 * cos(x)', '3x^2 * sin(x) - x^3 * cos(x)'],
    correctAnswer: 1,
    explanation: 'By the product rule, d/dx [u * v] = u\'v + uv\'. Here d/dx [x^3 * sin(x)] = (3x^2)*sin(x) + x^3*(cos(x)).'
  },
  {
    id: 'cal-4',
    sectionId: 'calculus',
    difficulty: 'easy',
    questionNumber: 4,
    questionText: 'The radius r of a circular ripple increases at 2 cm/s. At what rate is the area of the ripple expanding when r = 5 cm?',
    options: ['10π cm²/s', '20π cm²/s', '25π cm²/s', '100π cm²/s'],
    correctAnswer: 1,
    explanation: 'Area A = π r^2. Differentiating with respect to t yields dA/dt = 2π r (dr/dt) = 2π (5)(2) = 20π cm²/s.'
  },
  {
    id: 'cal-5',
    sectionId: 'calculus',
    difficulty: 'easy',
    questionNumber: 5,
    questionText: 'Find all critical points of the function f(x) = x^3 - 3x + 2.',
    options: ['x = 0, 1', 'x = ±1', 'x = ±3', 'x = 2, -1'],
    correctAnswer: 1,
    explanation: 'Set f\'(x) = 3x^2 - 3 = 0. Solving 3(x^2 - 1) = 0 gives x = 1 and x = -1.'
  },
  {
    id: 'cal-6',
    sectionId: 'calculus',
    difficulty: 'easy',
    questionNumber: 6,
    questionText: 'Evaluate the indefinite integral: ∫ (3x^2 + 4x - 5) dx.',
    options: ['x^3 + 2x^2 - 5x + C', '6x + 4 + C', 'x^3 + 4x^2 - 5x + C', '3x^3 + 2x^2 - 5 + C'],
    correctAnswer: 0,
    explanation: 'Integrating term by term: ∫ 3x^2 dx = x^3, ∫ 4x dx = 2x^2, and ∫ -5 dx = -5x. Result is x^3 + 2x^2 - 5x + C.'
  },
  {
    id: 'cal-7',
    sectionId: 'calculus',
    difficulty: 'easy',
    questionNumber: 7,
    questionText: 'Evaluate the definite integral: ∫ from 0 to 2 of (3x^2 + 1) dx.',
    options: ['8', '9', '10', '12'],
    correctAnswer: 2,
    explanation: 'Antiderivative is [x^3 + x]. Evaluating from 0 to 2: (2^3 + 2) - (0 + 0) = 8 + 2 = 10.'
  },
  {
    id: 'cal-8',
    sectionId: 'calculus',
    difficulty: 'easy',
    questionNumber: 8,
    questionText: 'If F(x) = ∫ from 1 to x of √(t^2 + 8) dt, evaluate F\'(1) using the Fundamental Theorem of Calculus.',
    options: ['3', '0', '1', '9'],
    correctAnswer: 0,
    explanation: 'By the Fundamental Theorem of Calculus Part 1, F\'(x) = √(x^2 + 8). Substituting x = 1 yields √(1 + 8) = √9 = 3.'
  },
  {
    id: 'cal-9',
    sectionId: 'calculus',
    difficulty: 'medium',
    questionNumber: 9,
    questionText: 'Evaluate the limit: lim (x -> 0) [ (1 - cos(4x)) / x^2 ].',
    options: ['2', '4', '8', '16'],
    correctAnswer: 2,
    explanation: 'Using 1 - cos(4x) = 2 sin²(2x), we get lim [2 sin²(2x) / x^2] = 2 * (2)^2 = 8.'
  },
  {
    id: 'cal-10',
    sectionId: 'calculus',
    difficulty: 'medium',
    questionNumber: 10,
    questionText: 'For the parametric curve x = a*cos(θ) and y = a*sin(θ), find dy/dx at θ = π/4.',
    options: ['1', '-1', '1/√2', '0'],
    correctAnswer: 1,
    explanation: 'dy/dθ = a*cos(θ) and dx/dθ = -a*sin(θ). Therefore dy/dx = (a*cos(θ))/(-a*sin(θ)) = -cot(θ). At θ = π/4, -cot(π/4) = -1.'
  },
  {
    id: 'cal-11',
    sectionId: 'calculus',
    difficulty: 'medium',
    questionNumber: 11,
    questionText: 'Find the slope of the normal to the curve y = x^2 - 4x + 5 at the point (1, 2).',
    options: ['2', '-2', '1/2', '-1/2'],
    correctAnswer: 2,
    explanation: 'y\' = 2x - 4. At x = 1, tangent slope m_t = 2(1) - 4 = -2. The normal slope m_n = -1 / m_t = -1 / (-2) = 1/2.'
  },
  {
    id: 'cal-12',
    sectionId: 'calculus',
    difficulty: 'medium',
    questionNumber: 12,
    questionText: 'A rectangle has a fixed perimeter of 40 cm. What is its maximum possible area?',
    options: ['80 cm²', '90 cm²', '100 cm²', '120 cm²'],
    correctAnswer: 2,
    explanation: 'For a given perimeter, a rectangle attains its maximum area when it is a square. Side = 40/4 = 10 cm. Area = 10^2 = 100 cm².'
  },
  {
    id: 'cal-13',
    sectionId: 'calculus',
    difficulty: 'medium',
    questionNumber: 13,
    questionText: 'Evaluate the integral using integration by parts: ∫ x * e^(2x) dx.',
    options: ['(e^(2x) / 2) * (x - 1/2) + C', '(x * e^(2x) / 2) + C', 'x * e^(2x) - e^(2x) + C', '(e^(2x) / 4) * (2x + 1) + C'],
    correctAnswer: 0,
    explanation: 'Let u = x, dv = e^(2x) dx => du = dx, v = e^(2x)/2. ∫ x e^(2x) dx = x e^(2x)/2 - ∫ e^(2x)/2 dx = (x/2) e^(2x) - e^(2x)/4 + C = (e^(2x)/2)(x - 1/2) + C.'
  },
  {
    id: 'cal-14',
    sectionId: 'calculus',
    difficulty: 'medium',
    questionNumber: 14,
    questionText: 'Evaluate using integral properties: ∫ from 0 to π/2 of [ sin(x) / (sin(x) + cos(x)) ] dx.',
    options: ['π/2', 'π/4', '1', '0'],
    correctAnswer: 1,
    explanation: 'Using King\'s property ∫_0^a f(x) dx = ∫_0^a f(a - x) dx, I = ∫_0^(π/2) [cos(x)/(cos(x) + sin(x))] dx. 2I = ∫_0^(π/2) 1 dx = π/2 => I = π/4.'
  },
  {
    id: 'cal-15',
    sectionId: 'calculus',
    difficulty: 'hard',
    questionNumber: 15,
    questionText: 'Evaluate the limit using L\'Hôpital\'s Rule: lim (x -> 0) [ (e^x - 1 - x) / x^2 ].',
    options: ['0', '1/2', '1', '2'],
    correctAnswer: 1,
    explanation: 'Indeterminate form 0/0. Apply L\'Hôpital once: lim(e^x - 1)/(2x). Apply L\'Hôpital second time: lim(e^x)/2 = 1/2.'
  },
  {
    id: 'cal-16',
    sectionId: 'calculus',
    difficulty: 'hard',
    questionNumber: 16,
    questionText: 'Find constants a and b such that f(x) = x^2 + 3x + a for x ≤ 1 and bx + 2 for x > 1 is differentiable at x = 1.',
    options: ['a = 1, b = 5', 'a = 3, b = 5', 'a = 2, b = 4', 'a = 0, b = 5'],
    correctAnswer: 1,
    explanation: 'Differentiability implies equal left and right derivatives at x = 1: f\'(1^-) = 2(1) + 3 = 5, f\'(1^+) = b => b = 5. Continuity at x = 1: 1 + 3 + a = 5(1) + 2 => 4 + a = 7 => a = 3.'
  },
  {
    id: 'cal-17',
    sectionId: 'calculus',
    difficulty: 'hard',
    questionNumber: 17,
    questionText: 'If y = x^x for x > 0, find the value of dy/dx at x = 1.',
    options: ['0', '1', 'e', '2'],
    correctAnswer: 1,
    explanation: 'Taking logarithm: ln(y) = x ln(x). Differentiating: (1/y) dy/dx = 1 + ln(x) => dy/dx = x^x (1 + ln(x)). At x = 1, dy/dx = 1^1 (1 + 0) = 1.'
  },
  {
    id: 'cal-18',
    sectionId: 'calculus',
    difficulty: 'hard',
    questionNumber: 18,
    questionText: 'Find the area enclosed between the parabola y = x^2 and the line y = 2x.',
    options: ['2/3', '4/3', '2', '8/3'],
    correctAnswer: 1,
    explanation: 'Intersection points: x^2 = 2x => x = 0 and x = 2. Area = ∫_0^2 (2x - x^2) dx = [x^2 - x^3/3]_0^2 = (4 - 8/3) = 4/3 square units.'
  },
  {
    id: 'cal-19',
    sectionId: 'calculus',
    difficulty: 'hard',
    questionNumber: 19,
    questionText: 'Evaluate the definite integral: ∫ from 0 to 1 of x * (1 - x)^9 dx.',
    options: ['1/90', '1/110', '1/100', '1/120'],
    correctAnswer: 1,
    explanation: 'Apply property ∫_0^1 f(x) dx = ∫_0^1 f(1 - x) dx: ∫_0^1 (1 - x) x^9 dx = ∫_0^1 (x^9 - x^10) dx = [x^10/10 - x^11/11]_0^1 = 1/10 - 1/11 = 1/110.'
  },
  {
    id: 'cal-20',
    sectionId: 'calculus',
    difficulty: 'hard',
    questionNumber: 20,
    questionText: 'Find the sum of the order and degree of the differential equation: (d^2y/dx^2)^3 + (dy/dx)^4 + y^2 = 0.',
    options: ['3', '5', '7', '4'],
    correctAnswer: 1,
    explanation: 'The highest derivative present is d^2y/dx^2, so order = 2. The highest exponent of this derivative is 3, so degree = 3. Sum = 2 + 3 = 5.'
  },

  // ==========================================
  // DOMAIN 2: DIFFERENTIATION (20 Questions: 8 Easy, 6 Medium, 6 Hard)
  // ==========================================
  {
    id: 'prob-1',
    sectionId: 'probability',
    difficulty: 'easy',
    questionNumber: 1,
    questionText: 'Two fair six-sided dice are thrown simultaneously. What is the probability of getting a sum of 8?',
    options: ['5/36', '1/6', '7/36', '1/9'],
    correctAnswer: 0,
    explanation: 'Favorable outcomes for sum 8 are (2,6), (3,5), (4,4), (5,3), (6,2) = 5 outcomes. Total sample space = 36. Probability = 5/36.'
  },
  {
    id: 'prob-2',
    sectionId: 'probability',
    difficulty: 'easy',
    questionNumber: 2,
    questionText: 'If P(A) = 0.4, P(B) = 0.5, and P(A ∩ B) = 0.2, find P(A ∪ B) using the Addition Theorem.',
    options: ['0.5', '0.7', '0.9', '0.3'],
    correctAnswer: 1,
    explanation: 'By the Addition Theorem, P(A ∪ B) = P(A) + P(B) - P(A ∩ B) = 0.4 + 0.5 - 0.2 = 0.7.'
  },
  {
    id: 'prob-3',
    sectionId: 'probability',
    difficulty: 'easy',
    questionNumber: 3,
    questionText: 'Events A and B are independent with P(A) = 0.3 and P(B) = 0.6. Find P(A ∩ B).',
    options: ['0.18', '0.90', '0.30', '0.50'],
    correctAnswer: 0,
    explanation: 'For independent events, P(A ∩ B) = P(A) * P(B) = 0.3 * 0.6 = 0.18.'
  },
  {
    id: 'prob-4',
    sectionId: 'probability',
    difficulty: 'easy',
    questionNumber: 4,
    questionText: 'A fair coin is tossed 3 times. What is the probability of obtaining at least one head?',
    options: ['1/8', '3/8', '7/8', '1/2'],
    correctAnswer: 2,
    explanation: 'P(at least 1 head) = 1 - P(no heads) = 1 - (1/2)^3 = 1 - 1/8 = 7/8.'
  },
  {
    id: 'prob-5',
    sectionId: 'probability',
    difficulty: 'easy',
    questionNumber: 5,
    questionText: 'Given P(A) = 0.6, P(B) = 0.5, and P(A ∩ B) = 0.3, find the conditional probability P(A | B).',
    options: ['0.5', '0.6', '0.3', '0.8'],
    correctAnswer: 1,
    explanation: 'P(A | B) = P(A ∩ B) / P(B) = 0.3 / 0.5 = 0.6.'
  },
  {
    id: 'prob-6',
    sectionId: 'probability',
    difficulty: 'easy',
    questionNumber: 6,
    questionText: 'A discrete random variable X takes values 1, 2, 3 with probabilities 0.2, 0.5, 0.3 respectively. Find E(X).',
    options: ['1.8', '2.1', '2.0', '2.5'],
    correctAnswer: 1,
    explanation: 'E(X) = Σ x * P(X=x) = (1 * 0.2) + (2 * 0.5) + (3 * 0.3) = 0.2 + 1.0 + 0.9 = 2.1.'
  },
  {
    id: 'prob-7',
    sectionId: 'probability',
    difficulty: 'easy',
    questionNumber: 7,
    questionText: 'In 4 independent tosses of a fair coin, what is the binomial probability of getting exactly 2 heads?',
    options: ['1/4', '3/8', '1/2', '5/16'],
    correctAnswer: 1,
    explanation: 'P(X=2) = C(4,2) * (1/2)^2 * (1/2)^2 = 6 * (1/16) = 6/16 = 3/8.'
  },
  {
    id: 'prob-8',
    sectionId: 'probability',
    difficulty: 'easy',
    questionNumber: 8,
    questionText: 'A random variable X has probability mass function P(X = x) = kx for x ∈ {1, 2, 3, 4}. Find constant k.',
    options: ['1/10', '1/5', '1/4', '1/2'],
    correctAnswer: 0,
    explanation: 'Sum of probabilities must equal 1: k(1 + 2 + 3 + 4) = 1 => 10k = 1 => k = 1/10.'
  },
  {
    id: 'prob-9',
    sectionId: 'probability',
    difficulty: 'medium',
    questionNumber: 9,
    questionText: 'Two cards are drawn successively without replacement from a standard 52-card deck. What is the probability that both are Aces?',
    options: ['1/221', '1/169', '1/26', '4/663'],
    correctAnswer: 0,
    explanation: 'Probability = (4/52) * (3/51) = (1/13) * (1/17) = 1/221.'
  },
  {
    id: 'prob-10',
    sectionId: 'probability',
    difficulty: 'medium',
    questionNumber: 10,
    questionText: 'Events A, B, C are mutually exclusive and exhaustive. If P(A) = 2 P(B) = 3 P(C), find P(A).',
    options: ['6/11', '3/11', '2/11', '1/2'],
    correctAnswer: 0,
    explanation: 'P(A) + P(B) + P(C) = 1 => P(A) + P(A)/2 + P(A)/3 = 1 => P(A)(1 + 1/2 + 1/3) = 1 => P(A)(11/6) = 1 => P(A) = 6/11.'
  },
  {
    id: 'prob-11',
    sectionId: 'probability',
    difficulty: 'medium',
    questionNumber: 11,
    questionText: 'Urn I contains 3 Red and 2 Black balls. Urn II contains 2 Red and 4 Black balls. An urn is chosen at random and a ball drawn is Red. Find the probability it came from Urn I using Bayes\' theorem.',
    options: ['9/14', '5/14', '3/7', '1/2'],
    correctAnswer: 0,
    explanation: 'P(Urn I) = 1/2, P(Urn II) = 1/2. P(Red|I) = 3/5, P(Red|II) = 2/6 = 1/3. Total P(Red) = (1/2)(3/5) + (1/2)(1/3) = 3/10 + 1/6 = 14/30. P(I|Red) = (3/10) / (14/30) = 9/14.'
  },
  {
    id: 'prob-12',
    sectionId: 'probability',
    difficulty: 'medium',
    questionNumber: 12,
    questionText: 'A random variable X takes values 0, 1, 2 with probabilities 0.25, 0.50, 0.25 respectively. Find Var(X).',
    options: ['0.25', '0.50', '0.75', '1.00'],
    correctAnswer: 1,
    explanation: 'E(X) = 0(0.25) + 1(0.50) + 2(0.25) = 1.0. E(X^2) = 0(0.25) + 1(0.50) + 4(0.25) = 1.5. Var(X) = E(X^2) - [E(X)]^2 = 1.5 - 1.0 = 0.50.'
  },
  {
    id: 'prob-13',
    sectionId: 'probability',
    difficulty: 'medium',
    questionNumber: 13,
    questionText: 'For a Binomial distribution with parameters n = 10 and p = 0.4, calculate the product of its mean and variance.',
    options: ['4.0', '9.6', '2.4', '14.4'],
    correctAnswer: 1,
    explanation: 'Mean = np = 10 * 0.4 = 4. Variance = np(1-p) = 10 * 0.4 * 0.6 = 2.4. Product = 4 * 2.4 = 9.6.'
  },
  {
    id: 'prob-14',
    sectionId: 'probability',
    difficulty: 'medium',
    questionNumber: 14,
    questionText: 'If the odds against an event occurring are 3 : 5, what is the probability that the event occurs?',
    options: ['3/8', '5/8', '3/5', '2/5'],
    correctAnswer: 1,
    explanation: 'Odds against = Unfavorable : Favorable = 3 : 5. Total cases = 3 + 5 = 8. Probability of occurrence = Favorable / Total = 5/8.'
  },
  {
    id: 'prob-15',
    sectionId: 'probability',
    difficulty: 'hard',
    questionNumber: 15,
    questionText: 'A medical test for a disease has 95% sensitivity and 90% specificity. If 1% of the population has the disease, what is the posterior probability that a person testing positive actually has the disease?',
    options: ['8.8%', '16.5%', '50.0%', '95.0%'],
    correctAnswer: 0,
    explanation: 'P(D) = 0.01, P(D\') = 0.99. P(+|D) = 0.95, P(+|D\') = 0.10. P(+) = (0.01)(0.95) + (0.99)(0.10) = 0.0095 + 0.099 = 0.1085. P(D|+) = 0.0095 / 0.1085 ≈ 0.0875 = 8.75% ≈ 8.8%.'
  },
  {
    id: 'prob-16',
    sectionId: 'probability',
    difficulty: 'hard',
    questionNumber: 16,
    questionText: 'A random variable X follows a Poisson distribution with mean λ = 2. Find P(X ≥ 1).',
    options: ['e^(-2)', '1 - e^(-2)', '2 * e^(-2)', '1 - 3 * e^(-2)'],
    correctAnswer: 1,
    explanation: 'P(X ≥ 1) = 1 - P(X = 0). For Poisson, P(X=0) = e^(-λ) * λ^0 / 0! = e^(-2). Hence P(X ≥ 1) = 1 - e^(-2).'
  },
  {
    id: 'prob-17',
    sectionId: 'probability',
    difficulty: 'hard',
    questionNumber: 17,
    questionText: 'A continuous random variable X has probability density function f(x) = kx(2 - x) for 0 ≤ x ≤ 2, and 0 elsewhere. Find constant k.',
    options: ['1/2', '3/4', '1/4', '3/8'],
    correctAnswer: 1,
    explanation: '∫_0^2 f(x) dx = 1 => k ∫_0^2 (2x - x^2) dx = k [x^2 - x^3/3]_0^2 = k (4 - 8/3) = (4/3)k = 1 => k = 3/4.'
  },
  {
    id: 'prob-18',
    sectionId: 'probability',
    difficulty: 'hard',
    questionNumber: 18,
    questionText: 'Players A and B toss a fair die alternately until one gets a 6. If A starts first, what is A\'s probability of winning the game?',
    options: ['5/11', '6/11', '1/2', '7/12'],
    correctAnswer: 1,
    explanation: 'P(getting 6) = 1/6 = p, q = 5/6. P(A wins) = p + q^2 p + q^4 p + ... = p / (1 - q^2) = (1/6) / [1 - (25/36)] = (1/6) / (11/36) = 6/11.'
  },
  {
    id: 'prob-19',
    sectionId: 'probability',
    difficulty: 'hard',
    questionNumber: 19,
    questionText: 'In 5 independent trials with success probability p = 1/3, what is the probability of getting at most 1 success?',
    options: ['112/243', '135/243', '192/243', '32/243'],
    correctAnswer: 0,
    explanation: 'P(X ≤ 1) = P(X=0) + P(X=1) = C(5,0)(2/3)^5 + C(5,1)(1/3)(2/3)^4 = 32/243 + 5(16/243) = 32/243 + 80/243 = 112/243.'
  },
  {
    id: 'prob-20',
    sectionId: 'probability',
    difficulty: 'hard',
    questionNumber: 20,
    questionText: 'If independent random variables X and Y have Var(X) = 4 and Var(Y) = 9, calculate Var(2X - 3Y).',
    options: ['-65', '25', '97', '65'],
    correctAnswer: 2,
    explanation: 'For independent random variables, Var(aX + bY) = a^2 Var(X) + b^2 Var(Y). Var(2X - 3Y) = 2^2 (4) + (-3)^2 (9) = 4(4) + 9(9) = 16 + 81 = 97.'
  },

  // ==========================================
  // DOMAIN 3: INTEGRATION (20 Questions: 8 Easy, 6 Medium, 6 Hard)
  // ==========================================
  {
    id: 'num-1',
    sectionId: 'numberSystem',
    difficulty: 'easy',
    questionNumber: 1,
    questionText: 'Rationalize the denominator of the surd expression: 6 / (√5 - √2).',
    options: ['2(√5 + √2)', '3(√5 + √2)', '√5 + √2', '6(√5 + √2)'],
    correctAnswer: 0,
    explanation: 'Multiply numerator and denominator by conjugate (√5 + √2): [6(√5 + √2)] / (5 - 2) = 6(√5 + √2) / 3 = 2(√5 + √2).'
  },
  {
    id: 'num-2',
    sectionId: 'numberSystem',
    difficulty: 'easy',
    questionNumber: 2,
    questionText: 'Evaluate the sum of powers of the imaginary unit i: i^2026 + i^2025 + i^2024 + i^2023.',
    options: ['0', '1', 'i', '-1'],
    correctAnswer: 0,
    explanation: 'The sum of four consecutive powers of i is always zero: i^2023(1 + i + i^2 + i^3) = i^2023(1 + i - 1 - i) = 0.'
  },
  {
    id: 'num-3',
    sectionId: 'numberSystem',
    difficulty: 'easy',
    questionNumber: 3,
    questionText: 'Find the real part of the complex number product (3 + 2i)(2 - 4i).',
    options: ['6', '14', '-2', '18'],
    correctAnswer: 1,
    explanation: '(3 + 2i)(2 - 4i) = 6 - 12i + 4i - 8i^2 = 6 - 8i + 8 = 14 - 8i. The real part Re(z) is 14.'
  },
  {
    id: 'num-4',
    sectionId: 'numberSystem',
    difficulty: 'easy',
    questionNumber: 4,
    questionText: 'Calculate the modulus of the complex number z = 5 - 12i.',
    options: ['7', '13', '17', '169'],
    correctAnswer: 1,
    explanation: '|z| = √(5^2 + (-12)^2) = √(25 + 144) = √169 = 13.'
  },
  {
    id: 'num-5',
    sectionId: 'numberSystem',
    difficulty: 'easy',
    questionNumber: 5,
    questionText: 'Solve for x in the logarithmic equation: log_3(x - 2) = 4.',
    options: ['83', '81', '14', '66'],
    correctAnswer: 0,
    explanation: 'Converting to exponential form: x - 2 = 3^4 = 81 => x = 81 + 2 = 83.'
  },
  {
    id: 'num-6',
    sectionId: 'numberSystem',
    difficulty: 'easy',
    questionNumber: 6,
    questionText: 'Evaluate the expression with fractional exponent: (64)^(-2/3).',
    options: ['1/16', '1/8', '16', '-16'],
    correctAnswer: 0,
    explanation: '64 = 4^3. Thus (4^3)^(-2/3) = 4^(-2) = 1 / 4^2 = 1/16.'
  },
  {
    id: 'num-7',
    sectionId: 'numberSystem',
    difficulty: 'easy',
    questionNumber: 7,
    questionText: 'Simplify the surd expression: √75 - √12 + √27.',
    options: ['4√3', '6√3', '5√3', '3√3'],
    correctAnswer: 1,
    explanation: '√75 = 5√3, √12 = 2√3, √27 = 3√3. Sum = 5√3 - 2√3 + 3√3 = 6√3.'
  },
  {
    id: 'num-8',
    sectionId: 'numberSystem',
    difficulty: 'easy',
    questionNumber: 8,
    questionText: 'Find the multiplicative inverse of the complex number z = 1 + i.',
    options: ['1 - i', '(1 - i)/2', '(1 + i)/2', '-1 - i'],
    correctAnswer: 1,
    explanation: 'Inverse 1/z = conjugate(z) / |z|^2 = (1 - i) / (1^2 + 1^2) = (1 - i)/2.'
  },
  {
    id: 'num-9',
    sectionId: 'numberSystem',
    difficulty: 'medium',
    questionNumber: 9,
    questionText: 'Find the principal argument Arg(z) of the complex number z = -1 + i√3.',
    options: ['π/3', '2π/3', '5π/6', '4π/3'],
    correctAnswer: 1,
    explanation: 'z is in Quadrant II. tan(α) = |√3 / (-1)| = √3 => α = π/3. Arg(z) = π - π/3 = 2π/3.'
  },
  {
    id: 'num-10',
    sectionId: 'numberSystem',
    difficulty: 'medium',
    questionNumber: 10,
    questionText: 'Simplify (1 + i)^8 using De Moivre\'s Theorem or polar form.',
    options: ['8', '16', '16i', '32'],
    correctAnswer: 1,
    explanation: '1 + i = √2 e^(i π/4). Raising to power 8 gives (√2)^8 * e^(i 2π) = 16 * 1 = 16.'
  },
  {
    id: 'num-11',
    sectionId: 'numberSystem',
    difficulty: 'medium',
    questionNumber: 11,
    questionText: 'Find the complex roots of the quadratic equation: x^2 - 6x + 25 = 0.',
    options: ['3 ± 4i', '6 ± 8i', '-3 ± 4i', '3 ± 16i'],
    correctAnswer: 0,
    explanation: 'Using quadratic formula: x = [6 ± √(-64)] / 2 = [6 ± 8i] / 2 = 3 ± 4i.'
  },
  {
    id: 'num-12',
    sectionId: 'numberSystem',
    difficulty: 'medium',
    questionNumber: 12,
    questionText: 'Solve for real x in the equation: log_2(x) + log_2(x - 6) = 4.',
    options: ['x = 8', 'x = 8 and x = -2', 'x = 4', 'x = 10'],
    correctAnswer: 0,
    explanation: 'log_2[x(x - 6)] = 4 => x(x - 6) = 2^4 = 16 => x^2 - 6x - 16 = 0 => (x - 8)(x + 2) = 0. Since log requires x > 6, x = 8.'
  },
  {
    id: 'num-13',
    sectionId: 'numberSystem',
    difficulty: 'medium',
    questionNumber: 13,
    questionText: 'Find the square root of the surd expression: √(7 + 4√3).',
    options: ['2 + √3', '3 + √2', '1 + 2√3', '2 - √3'],
    correctAnswer: 0,
    explanation: 'Let √(7 + 4√3) = √a + √b. Squaring: a + b = 7 and 2√(ab) = 4√3 => ab = 12. Factors are a=4, b=3. Root is √4 + √3 = 2 + √3.'
  },
  {
    id: 'num-14',
    sectionId: 'numberSystem',
    difficulty: 'medium',
    questionNumber: 14,
    questionText: 'Solve for x in the exponential equation: 2^(x+3) + 2^x = 144.',
    options: ['x = 3', 'x = 4', 'x = 5', 'x = 6'],
    correctAnswer: 1,
    explanation: '2^x * 2^3 + 2^x = 144 => 8 * 2^x + 2^x = 144 => 9 * 2^x = 144 => 2^x = 16 => x = 4.'
  },
  {
    id: 'num-15',
    sectionId: 'numberSystem',
    difficulty: 'hard',
    questionNumber: 15,
    questionText: 'If ω is a complex cube root of unity (ω ≠ 1), evaluate the expression (1 - ω + ω^2)^6.',
    options: ['32', '64', '-64', '0'],
    correctAnswer: 1,
    explanation: 'Using 1 + ω + ω^2 = 0 => 1 + ω^2 = -ω. Thus (1 - ω + ω^2) = (-ω - ω) = -2ω. (-2ω)^6 = 64 ω^6 = 64(1) = 64.'
  },
  {
    id: 'num-16',
    sectionId: 'numberSystem',
    difficulty: 'hard',
    questionNumber: 16,
    questionText: 'The equation |z - 2i| = |z + 2i| represents which geometric locus in the complex plane?',
    options: ['Circle of radius 2', 'Real axis (y = 0)', 'Imaginary axis (x = 0)', 'Line y = x'],
    correctAnswer: 1,
    explanation: '|z - 2i| = |z + 2i| represents points equidistant from (0,2) and (0,-2), which is the perpendicular bisector—the real axis y = 0.'
  },
  {
    id: 'num-17',
    sectionId: 'numberSystem',
    difficulty: 'hard',
    questionNumber: 17,
    questionText: 'Find the complete set of real solutions for the logarithmic inequality: log_0.5(x - 3) > -2.',
    options: ['x < 7', '3 < x < 7', 'x > 7', 'x > 3'],
    correctAnswer: 1,
    explanation: 'Base 0.5 < 1 reverses inequality: x - 3 < (0.5)^(-2) = 4 => x < 7. Logarithm domain requires x - 3 > 0 => x > 3. Combined solution: 3 < x < 7.'
  },
  {
    id: 'num-18',
    sectionId: 'numberSystem',
    difficulty: 'hard',
    questionNumber: 18,
    questionText: 'If |z_1| = |z_2| = 1, evaluate the modulus | (z_1 + z_2) / (1 + z_1 * z_2) |.',
    options: ['1', '2', '0', '1/2'],
    correctAnswer: 0,
    explanation: 'Using z * conjugate(z) = |z|^2 = 1, we get conjugate(z_1 + z_2)/(1 + z_1 z_2) = (1/z_1 + 1/z_2)/(1 + 1/(z_1 z_2)) = (z_1 + z_2)/(z_1 z_2 + 1). Hence the modulus equals 1.'
  },
  {
    id: 'num-19',
    sectionId: 'numberSystem',
    difficulty: 'hard',
    questionNumber: 19,
    questionText: 'Evaluate the product of logarithms using base change property: log_3(4) * log_4(5) * log_5(6) * log_6(9).',
    options: ['1', '2', '3', '4'],
    correctAnswer: 1,
    explanation: 'By the change of base formula, (ln 4 / ln 3) * (ln 5 / ln 4) * (ln 6 / ln 5) * (ln 9 / ln 6) = ln 9 / ln 3 = log_3(9) = 2.'
  },
  {
    id: 'num-20',
    sectionId: 'numberSystem',
    difficulty: 'hard',
    questionNumber: 20,
    questionText: 'The vertices of a triangle in the complex plane are z1 = 1 + 2i, z2 = 4 - i, and z3 = 7 + 5i. Find its centroid z0.',
    options: ['4 + 2i', '3 + 2i', '4 + 3i', '12 + 6i'],
    correctAnswer: 0,
    explanation: 'Centroid z0 = (z1 + z2 + z3)/3 = [(1+4+7) + (2-1+5)i] / 3 = (12 + 6i) / 3 = 4 + 2i.'
  },

  // ==========================================
  // DOMAIN 4: PROBABILITY & STATISTICS (20 Questions: 8 Easy, 6 Medium, 6 Hard)
  // ==========================================
  {
    id: 'trig-1',
    sectionId: 'trigonometry',
    difficulty: 'easy',
    questionNumber: 1,
    questionText: 'Simplify the trigonometric expression: sin²(θ) * [ 1 + cot²(θ) ].',
    options: ['0', '1', 'tan²(θ)', 'sec²(θ)'],
    correctAnswer: 1,
    explanation: '1 + cot²(θ) = csc²(θ). Therefore sin²(θ) * csc²(θ) = sin²(θ) * [1 / sin²(θ)] = 1.'
  },
  {
    id: 'trig-2',
    sectionId: 'trigonometry',
    difficulty: 'easy',
    questionNumber: 2,
    questionText: 'Find the exact value of cos(120°).',
    options: ['1/2', '-1/2', '√3/2', '-√3/2'],
    correctAnswer: 1,
    explanation: 'cos(120°) = cos(180° - 60°) = -cos(60°) = -1/2.'
  },
  {
    id: 'trig-3',
    sectionId: 'trigonometry',
    difficulty: 'easy',
    questionNumber: 3,
    questionText: 'Find the principal value of cos⁻¹(-1/2) in radians.',
    options: ['π/3', '2π/3', '5π/6', '4π/3'],
    correctAnswer: 1,
    explanation: 'The principal range of cos⁻¹(x) is [0, π]. cos⁻¹(-1/2) = π - cos⁻¹(1/2) = π - π/3 = 2π/3.'
  },
  {
    id: 'trig-4',
    sectionId: 'trigonometry',
    difficulty: 'easy',
    questionNumber: 4,
    questionText: 'Given sin(A) = 3/5 and cos(B) = 12/13 in Quadrant I, find sin(A + B).',
    options: ['33/65', '56/65', '63/65', '16/65'],
    correctAnswer: 1,
    explanation: 'In Q1, cos(A) = 4/5 and sin(B) = 5/13. sin(A + B) = sin(A)cos(B) + cos(A)sin(B) = (3/5)(12/13) + (4/5)(5/13) = (36 + 20)/65 = 56/65.'
  },
  {
    id: 'trig-5',
    sectionId: 'trigonometry',
    difficulty: 'easy',
    questionNumber: 5,
    questionText: 'If tan(θ) = 3/4, find the value of sin(2θ).',
    options: ['12/25', '24/25', '7/25', '18/25'],
    correctAnswer: 1,
    explanation: 'sin(2θ) = [2 tan(θ)] / [1 + tan²(θ)] = [2(3/4)] / [1 + 9/16] = (3/2) / (25/16) = 24/25.'
  },
  {
    id: 'trig-6',
    sectionId: 'trigonometry',
    difficulty: 'easy',
    questionNumber: 6,
    questionText: 'Find the general solution of the trigonometric equation: sin(x) = -√3/2.',
    options: ['nπ + (-1)^n * (π/3)', 'nπ + (-1)^n * (-π/3)', '2nπ ± (2π/3)', 'nπ + (π/3)'],
    correctAnswer: 1,
    explanation: 'Principal solution is α = -π/3. General solution for sin(x) = sin(α) is x = nπ + (-1)^n * (-π/3).'
  },
  {
    id: 'trig-7',
    sectionId: 'trigonometry',
    difficulty: 'easy',
    questionNumber: 7,
    questionText: 'A kite string of length 100 m is inclined at an angle of 30° to the horizontal. Calculate the height of the kite.',
    options: ['50 m', '50√3 m', '100√3 m', '25 m'],
    correctAnswer: 0,
    explanation: 'Height h = L * sin(30°) = 100 * (1/2) = 50 m.'
  },
  {
    id: 'trig-8',
    sectionId: 'trigonometry',
    difficulty: 'easy',
    questionNumber: 8,
    questionText: 'In ΔABC, side a = 10 cm, sin(A) = 0.8, and sin(B) = 0.4. Find side b using Sine Rule.',
    options: ['5 cm', '8 cm', '12 cm', '16 cm'],
    correctAnswer: 0,
    explanation: 'By Sine Rule: a / sin(A) = b / sin(B) => 10 / 0.8 = b / 0.4 => b = 10 * (0.4 / 0.8) = 5 cm.'
  },
  {
    id: 'trig-9',
    sectionId: 'trigonometry',
    difficulty: 'medium',
    questionNumber: 9,
    questionText: 'Evaluate the exact value of tan(15°).',
    options: ['2 - √3', '2 + √3', '√3 - 1', '(√3 + 1)/2'],
    correctAnswer: 0,
    explanation: 'tan(15°) = tan(45° - 30°) = (1 - 1/√3)/(1 + 1/√3) = (√3 - 1)/(√3 + 1) = 2 - √3.'
  },
  {
    id: 'trig-10',
    sectionId: 'trigonometry',
    difficulty: 'medium',
    questionNumber: 10,
    questionText: 'Evaluate the continuous product: cos(20°) * cos(40°) * cos(80°).',
    options: ['1/4', '1/8', '1/16', '√3/8'],
    correctAnswer: 1,
    explanation: 'Using identity cos(A) cos(2A) cos(4A) = sin(8A) / [8 sin(A)]: sin(160°) / [8 sin(20°)] = sin(20°) / [8 sin(20°)] = 1/8.'
  },
  {
    id: 'trig-11',
    sectionId: 'trigonometry',
    difficulty: 'medium',
    questionNumber: 11,
    questionText: 'Evaluate tan⁻¹(2) + tan⁻¹(3) using inverse trigonometric addition theorem.',
    options: ['π/4', '3π/4', 'π/2', '5π/4'],
    correctAnswer: 1,
    explanation: 'When x > 0, y > 0 and xy = 6 > 1: tan⁻¹(x) + tan⁻¹(y) = π + tan⁻¹[(2 + 3)/(1 - 6)] = π + tan⁻¹(-1) = π - π/4 = 3π/4.'
  },
  {
    id: 'trig-12',
    sectionId: 'trigonometry',
    difficulty: 'medium',
    questionNumber: 12,
    questionText: 'Solve √3 cos(x) + sin(x) = 2 for x in [0, 2π].',
    options: ['π/6', 'π/3', 'π/4', '5π/6'],
    correctAnswer: 0,
    explanation: 'Divide by 2: (√3/2)cos(x) + (1/2)sin(x) = 1 => cos(x - π/6) = 1 => x - π/6 = 0 => x = π/6.'
  },
  {
    id: 'trig-13',
    sectionId: 'trigonometry',
    difficulty: 'medium',
    questionNumber: 13,
    questionText: 'In ΔABC with sides a = 7, b = 8, c = 9, evaluate cos(A) using the Cosine Rule.',
    options: ['2/3', '11/16', '3/4', '1/2'],
    correctAnswer: 0,
    explanation: 'cos(A) = (b² + c² - a²) / (2bc) = (64 + 81 - 49) / (2 * 8 * 9) = 96 / 144 = 2/3.'
  },
  {
    id: 'trig-14',
    sectionId: 'trigonometry',
    difficulty: 'medium',
    questionNumber: 14,
    questionText: 'Find the exact value of sin(18°).',
    options: ['(√5 - 1)/4', '(√5 + 1)/4', '√(10 - 2√5)/4', '(√3 - 1)/(2√2)'],
    correctAnswer: 0,
    explanation: 'Using 5θ = 90° derivation: sin(18°) = (√5 - 1)/4.'
  },
  {
    id: 'trig-15',
    sectionId: 'trigonometry',
    difficulty: 'hard',
    questionNumber: 15,
    questionText: 'Find the maximum value of the expression: 5 sin(x) + 12 cos(x) + 7.',
    options: ['17', '19', '20', '24'],
    correctAnswer: 2,
    explanation: 'The maximum value of a sin(x) + b cos(x) is √(a² + b²). Here √(25 + 144) = 13. Max value = 13 + 7 = 20.'
  },
  {
    id: 'trig-16',
    sectionId: 'trigonometry',
    difficulty: 'hard',
    questionNumber: 16,
    questionText: 'Solve for positive x in the inverse trig equation: tan⁻¹(x) + tan⁻¹(1/2) = π/4.',
    options: ['1/3', '1/2', '1/√2', '1/6'],
    correctAnswer: 0,
    explanation: 'tan⁻¹[(x + 1/2)/(1 - x/2)] = π/4 => (2x + 1)/(2 - x) = 1 => 2x + 1 = 2 - x => 3x = 1 => x = 1/3.'
  },
  {
    id: 'trig-17',
    sectionId: 'trigonometry',
    difficulty: 'hard',
    questionNumber: 17,
    questionText: 'The angles of elevation of the top of a tower from two points at distances 9 m and 16 m from the base are complementary. Find the height of the tower.',
    options: ['12 m', '12.5 m', '14 m', '25 m'],
    correctAnswer: 0,
    explanation: 'Let angles be θ and 90°-θ. tan(θ) = h/9 and tan(90°-θ) = cot(θ) = h/16. tan(θ)*cot(θ) = h²/144 = 1 => h² = 144 => h = 12 m.'
  },
  {
    id: 'trig-18',
    sectionId: 'trigonometry',
    difficulty: 'hard',
    questionNumber: 18,
    questionText: 'In a right-angled triangle ABC with sides a = 6 cm, b = 8 cm, and hypotenuse c = 10 cm, find the circumradius R.',
    options: ['4 cm', '5 cm', '6 cm', '10 cm'],
    correctAnswer: 1,
    explanation: 'For a right triangle, the circumcenter lies at the midpoint of the hypotenuse. Circumradius R = hypotenuse / 2 = 10 / 2 = 5 cm.'
  },
  {
    id: 'trig-19',
    sectionId: 'trigonometry',
    difficulty: 'hard',
    questionNumber: 19,
    questionText: 'Evaluate the product: cos(π/7) * cos(2π/7) * cos(4π/7).',
    options: ['-1/8', '1/8', '-1/4', '1/4'],
    correctAnswer: 0,
    explanation: 'Using identity sin(8θ)/[8 sin(θ)] with θ = π/7: sin(8π/7) / [8 sin(π/7)] = -sin(π/7) / [8 sin(π/7)] = -1/8.'
  },
  {
    id: 'trig-20',
    sectionId: 'trigonometry',
    difficulty: 'hard',
    questionNumber: 20,
    questionText: 'Eliminate parameter θ from x = a * sec^(2/3)(θ) and y = b * tan^(2/3)(θ).',
    options: ['(x/a)^(3) - (y/b)^(3) = 1', '(x/a)^(3/2) - (y/b)^(3/2) = 1', 'x^2/a^2 - y^2/b^2 = 1', 'x/a - y/b = 1'],
    correctAnswer: 1,
    explanation: 'sec(θ) = (x/a)^(3/2) and tan(θ) = (y/b)^(3/2). Applying sec²(θ) - tan²(θ) = 1 yields (x/a)^3 - (y/b)^3 = 1 (or with power 2/3: (x/a)^(3/2) - (y/b)^(3/2) = 1).'
  },

  // ==========================================
  // DOMAIN 5: MATRICES & DETERMINANTS (20 Questions: 8 Easy, 6 Medium, 6 Hard)
  // ==========================================
  {
    id: 'stat-1',
    sectionId: 'statistics',
    difficulty: 'easy',
    questionNumber: 1,
    questionText: 'Calculate the arithmetic mean of the dataset: 12, 16, 20, 24, 28.',
    options: ['18', '20', '22', '24'],
    correctAnswer: 1,
    explanation: 'Mean = (12 + 16 + 20 + 24 + 28) / 5 = 100 / 5 = 20.'
  },
  {
    id: 'stat-2',
    sectionId: 'statistics',
    difficulty: 'easy',
    questionNumber: 2,
    questionText: 'Find the median of the set of numbers: 7, 12, 15, 18, 22, 29.',
    options: ['15', '16.5', '18', '17'],
    correctAnswer: 1,
    explanation: 'For even n=6, median is average of 3rd and 4th terms: (15 + 18) / 2 = 16.5.'
  },
  {
    id: 'stat-3',
    sectionId: 'statistics',
    difficulty: 'easy',
    questionNumber: 3,
    questionText: 'Identify the mode of the observation set: 4, 7, 7, 9, 12, 7, 14, 9, 7.',
    options: ['4', '7', '9', '12'],
    correctAnswer: 1,
    explanation: 'The number 7 appears most frequently (4 times), so mode = 7.'
  },
  {
    id: 'stat-4',
    sectionId: 'statistics',
    difficulty: 'easy',
    questionNumber: 4,
    questionText: 'If the standard deviation σ of a sample is 8, calculate its variance.',
    options: ['16', '32', '64', '128'],
    correctAnswer: 2,
    explanation: 'Variance is the square of standard deviation: σ^2 = 8^2 = 64.'
  },
  {
    id: 'stat-5',
    sectionId: 'statistics',
    difficulty: 'easy',
    questionNumber: 5,
    questionText: 'Find the range of the dataset: 14, 28, 35, 7, 42, 21.',
    options: ['28', '35', '42', '49'],
    correctAnswer: 1,
    explanation: 'Range = Maximum value - Minimum value = 42 - 7 = 35.'
  },
  {
    id: 'stat-6',
    sectionId: 'statistics',
    difficulty: 'easy',
    questionNumber: 6,
    questionText: 'Calculate the Coefficient of Variation (CV) for a distribution with mean = 50 and standard deviation = 10.',
    options: ['10%', '15%', '20%', '25%'],
    correctAnswer: 2,
    explanation: 'CV = (Standard Deviation / Mean) * 100% = (10 / 50) * 100% = 20%.'
  },
  {
    id: 'stat-7',
    sectionId: 'statistics',
    difficulty: 'easy',
    questionNumber: 7,
    questionText: 'Using the empirical relationship Mode = 3*Median - 2*Mean, find the Mode if Mean = 25 and Median = 28.',
    options: ['31', '34', '37', '40'],
    correctAnswer: 1,
    explanation: 'Mode = 3(28) - 2(25) = 84 - 50 = 34.'
  },
  {
    id: 'stat-8',
    sectionId: 'statistics',
    difficulty: 'easy',
    questionNumber: 8,
    questionText: 'Which measure of dispersion is expressed in the original units of measurement of the dataset?',
    options: ['Variance', 'Standard Deviation', 'Coefficient of Variation', 'Relative Variance'],
    correctAnswer: 1,
    explanation: 'Standard deviation is the square root of variance, returning units to the original scale of measurement.'
  },
  {
    id: 'stat-9',
    sectionId: 'statistics',
    difficulty: 'medium',
    questionNumber: 9,
    questionText: 'Class A has 30 students with mean score 60. Class B has 20 students with mean score 70. Find the combined mean score.',
    options: ['64', '65', '66', '68'],
    correctAnswer: 0,
    explanation: 'Combined Mean = (N1*X1 + N2*X2) / (N1 + N2) = (30*60 + 20*70) / (30 + 20) = (1800 + 1400) / 50 = 3200 / 50 = 64.'
  },
  {
    id: 'stat-10',
    sectionId: 'statistics',
    difficulty: 'medium',
    questionNumber: 10,
    questionText: 'If y_i = 3 * x_i + 5 for all observations, and the standard deviation of x is 4, find the standard deviation of y.',
    options: ['12', '17', '7', '16'],
    correctAnswer: 0,
    explanation: 'SD(aX + b) = |a| * SD(X). SD(Y) = |3| * 4 = 12. (Shift of origin +5 does not affect dispersion).'
  },
  {
    id: 'stat-11',
    sectionId: 'statistics',
    difficulty: 'medium',
    questionNumber: 11,
    questionText: 'Dataset P has mean 80 and SD 8 (CV = 10%). Dataset Q has mean 50 and SD 10 (CV = 20%). Which dataset has greater consistency?',
    options: ['Dataset P', 'Dataset Q', 'Both are equally consistent', 'Cannot be determined'],
    correctAnswer: 0,
    explanation: 'A lower Coefficient of Variation (CV) indicates greater consistency and lower relative variability. P (10%) < Q (20%).'
  },
  {
    id: 'stat-12',
    sectionId: 'statistics',
    difficulty: 'medium',
    questionNumber: 12,
    questionText: 'Karl Pearson\'s coefficient of correlation r always satisfies which mathematical boundary?',
    options: ['0 ≤ r ≤ 1', '-1 ≤ r ≤ 1', '-∞ < r < ∞', '0 ≤ r < ∞'],
    correctAnswer: 1,
    explanation: 'Pearson correlation coefficient r is bounded between -1 (perfect negative) and +1 (perfect positive).'
  },
  {
    id: 'stat-13',
    sectionId: 'statistics',
    difficulty: 'medium',
    questionNumber: 13,
    questionText: 'If the regression coefficients are b_yx = 0.8 and b_xy = 0.45, find the correlation coefficient r.',
    options: ['0.36', '0.60', '0.50', '0.72'],
    correctAnswer: 1,
    explanation: 'r = ± √(b_yx * b_xy). Since both coefficients are positive, r = √(0.8 * 0.45) = √0.36 = 0.60.'
  },
  {
    id: 'stat-14',
    sectionId: 'statistics',
    difficulty: 'medium',
    questionNumber: 14,
    questionText: 'Calculate the variance of the first 11 natural numbers {1, 2, 3, ..., 11}.',
    options: ['8', '10', '12', '14'],
    correctAnswer: 1,
    explanation: 'Variance of first n natural numbers Var = (n^2 - 1) / 12. For n = 11: (121 - 1) / 12 = 120 / 12 = 10.'
  },
  {
    id: 'stat-15',
    sectionId: 'statistics',
    difficulty: 'hard',
    questionNumber: 15,
    questionText: 'For a sample of 20 observations, the mean was computed as 40. Later it was found that an observation 50 was misread as 30. Calculate the correct mean.',
    options: ['41', '42', '40.5', '39'],
    correctAnswer: 0,
    explanation: 'Initial Sum = 20 * 40 = 800. Correct Sum = 800 - 30 + 50 = 820. Correct Mean = 820 / 20 = 41.'
  },
  {
    id: 'stat-16',
    sectionId: 'statistics',
    difficulty: 'hard',
    questionNumber: 16,
    questionText: 'The two lines of regression are 3x + 2y = 26 and 6x + y = 31. Find the mean values (x̄, ȳ).',
    options: ['(4, 7)', '(5, 6)', '(3, 8)', '(6, 4)'],
    correctAnswer: 0,
    explanation: 'The regression lines always intersect at the mean point (x̄, ȳ). Solving 3x + 2y = 26 and 6x + y = 31 gives x̄ = 4, ȳ = 7.'
  },
  {
    id: 'stat-17',
    sectionId: 'statistics',
    difficulty: 'hard',
    questionNumber: 17,
    questionText: 'If the correlation coefficient r = 0 between variables X and Y, what is the angle between the two regression lines?',
    options: ['0°', '45°', '90°', '180°'],
    correctAnswer: 2,
    explanation: 'When r = 0, tan(θ) -> ∞, meaning the two regression lines are perpendicular to each other (angle θ = 90°).'
  },
  {
    id: 'stat-18',
    sectionId: 'statistics',
    difficulty: 'hard',
    questionNumber: 18,
    questionText: 'In a ranking of 5 candidates by two judges, the sum of squared rank differences Σ d_i² = 4. Calculate Spearman\'s rank correlation coefficient r_s.',
    options: ['0.60', '0.75', '0.80', '0.90'],
    correctAnswer: 2,
    explanation: 'Spearman\'s formula r_s = 1 - [6 * Σ d_i²] / [n(n^2 - 1)] = 1 - [6(4)] / [5(24)] = 1 - 24/120 = 1 - 0.20 = 0.80.'
  },
  {
    id: 'stat-19',
    sectionId: 'statistics',
    difficulty: 'hard',
    questionNumber: 19,
    questionText: 'If Var(X) = 15, what is the variance of the transformed variable Y = X - 10?',
    options: ['5', '15', '25', '150'],
    correctAnswer: 1,
    explanation: 'Variance is invariant to shifts of origin. Var(X - c) = Var(X) = 15.'
  },
  {
    id: 'stat-20',
    sectionId: 'statistics',
    difficulty: 'hard',
    questionNumber: 20,
    questionText: 'The regression line of y on x is y = 1.2x + 15. If a student scores 50 in x, predict their estimated score in y.',
    options: ['65', '75', '80', '85'],
    correctAnswer: 1,
    explanation: 'Substituting x = 50 into the regression line: y = 1.2(50) + 15 = 60 + 15 = 75.'
  }
];

function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Generates 50 questions for an assessment attempt (10 per domain):
 * - 4 Easy (40%)
 * - 3 Moderate/Medium (30%)
 * - 3 Difficulty/Hard (30%)
 * Refreshed randomly from the provided question bank for each attempt.
 */
export function generateTestQuestions(questionBank: Question[] = ALL_QUESTIONS): Question[] {
  if (!questionBank || questionBank.length === 0) {
    return [];
  }

  const sections: SectionId[] = ['calculus', 'probability', 'numberSystem', 'trigonometry', 'statistics'];
  const testQuestions: Question[] = [];

  let globalQuestionIndex = 1;

  sections.forEach((secId) => {
    // Filter questions for this section
    const secQuestions = questionBank.filter((q) => q.sectionId === secId || (q.sectionId as string) === secId);

    if (secQuestions.length === 0) return;

    const easyPool = secQuestions.filter((q) => q.difficulty === 'easy');
    const mediumPool = secQuestions.filter((q) => q.difficulty === 'medium');
    const hardPool = secQuestions.filter((q) => q.difficulty === 'hard');

    // Shuffle pools
    const shuffledEasy = shuffleArray(easyPool);
    const shuffledMedium = shuffleArray(mediumPool);
    const shuffledHard = shuffleArray(hardPool);

    // Pick 40% easy (4), 30% medium (3), 30% hard (3)
    let selectedEasy = shuffledEasy.slice(0, 4);
    let selectedMedium = shuffledMedium.slice(0, 3);
    let selectedHard = shuffledHard.slice(0, 3);

    // Combine
    let combined = [...selectedEasy, ...selectedMedium, ...selectedHard];

    // Fallback if pool doesn't have exact counts (e.g. custom user bank)
    if (combined.length < 10 && secQuestions.length > combined.length) {
      const remainingPool = secQuestions.filter((q) => !combined.some((p) => p.id === q.id));
      const needed = 10 - combined.length;
      combined = [...combined, ...shuffleArray(remainingPool).slice(0, needed)];
    }

    // Renumber sequentially for this test while strictly preserving original text formatting
    combined.forEach((q) => {
      testQuestions.push({
        ...q,
        // Maintain exact question text, options, and format as in the original question bank
        questionText: q.questionText || q.question || '',
        question: q.question || q.questionText || '',
        options: Array.isArray(q.options) ? [...q.options] : [],
        explanation: q.explanation || '',
        contextText: q.contextText,
        codeSnippet: q.codeSnippet,
        visualData: q.visualData,
        questionNumber: globalQuestionIndex++
      });
    });
  });

  // Fallback: If section filtering yielded 0 questions (e.g. general questions list), sample directly from bank
  if (testQuestions.length === 0 && questionBank.length > 0) {
    const shuffledAll = shuffleArray(questionBank).slice(0, 50);
    return shuffledAll.map((q, idx) => ({
      ...q,
      questionText: q.questionText || q.question || '',
      question: q.question || q.questionText || '',
      options: Array.isArray(q.options) ? [...q.options] : [],
      explanation: q.explanation || '',
      contextText: q.contextText,
      codeSnippet: q.codeSnippet,
      visualData: q.visualData,
      questionNumber: idx + 1
    }));
  }

  return testQuestions;
}

