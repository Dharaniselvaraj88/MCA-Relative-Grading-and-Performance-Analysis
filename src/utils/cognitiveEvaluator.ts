import {
  StudentInfo,
  StudentResponse,
  CognitiveProfileReport,
  StudentFeedback,
  SectionScore,
  DifficultyBreakdown,
  BehavioralTraits,
  PersonalityProfile,
  ComputationalCapabilities,
  CareerPath,
  SectionId,
  Difficulty,
  Question
} from '../types';
import { ALL_QUESTIONS, SECTION_METADATA } from '../data/questionsData';
import { calculateGrade } from './exportUtils';

export function calculateCognitiveProfile(
  student: StudentInfo,
  responses: Record<string, StudentResponse>,
  totalDurationSeconds: number,
  testQuestions: Question[] = ALL_QUESTIONS
): CognitiveProfileReport {
  let overallScore = 0;
  const maxScore = testQuestions.length || 50;

  const sectionStats: Record<
    SectionId,
    {
      score: number;
      total: number;
      easyScore: number;
      easyTotal: number;
      mediumScore: number;
      mediumTotal: number;
      hardScore: number;
      hardTotal: number;
      totalTimeSpent: number;
    }
  > = {
    calculus: { score: 0, total: 0, easyScore: 0, easyTotal: 0, mediumScore: 0, mediumTotal: 0, hardScore: 0, hardTotal: 0, totalTimeSpent: 0 },
    probability: { score: 0, total: 0, easyScore: 0, easyTotal: 0, mediumScore: 0, mediumTotal: 0, hardScore: 0, hardTotal: 0, totalTimeSpent: 0 },
    numberSystem: { score: 0, total: 0, easyScore: 0, easyTotal: 0, mediumScore: 0, mediumTotal: 0, hardScore: 0, hardTotal: 0, totalTimeSpent: 0 },
    trigonometry: { score: 0, total: 0, easyScore: 0, easyTotal: 0, mediumScore: 0, mediumTotal: 0, hardScore: 0, hardTotal: 0, totalTimeSpent: 0 },
    statistics: { score: 0, total: 0, easyScore: 0, easyTotal: 0, mediumScore: 0, mediumTotal: 0, hardScore: 0, hardTotal: 0, totalTimeSpent: 0 }
  };

  testQuestions.forEach((q) => {
    const sec = sectionStats[q.sectionId];
    if (sec) {
      sec.total += 1;
      if (q.difficulty === 'easy') sec.easyTotal += 1;
      if (q.difficulty === 'medium') sec.mediumTotal += 1;
      if (q.difficulty === 'hard') sec.hardTotal += 1;
    }
  });

  const easyTotalCount = testQuestions.filter((q) => q.difficulty === 'easy').length;
  const mediumTotalCount = testQuestions.filter((q) => q.difficulty === 'medium').length;
  const hardTotalCount = testQuestions.filter((q) => q.difficulty === 'hard').length;

  const difficultyStats: DifficultyBreakdown = {
    easy: { score: 0, total: easyTotalCount, accuracy: 0 },
    medium: { score: 0, total: mediumTotalCount, accuracy: 0 },
    hard: { score: 0, total: hardTotalCount, accuracy: 0 }
  };

  let reviewCount = 0;
  let totalTimeOnHard = 0;
  let totalTimeOnEasy = 0;

  const detailedItemAnalysis = testQuestions.map((q) => {
    const resp = responses[q.id] || {
      questionId: q.id,
      selectedOption: null,
      timeSpentSeconds: 0,
      isMarkedForReview: false,
      visited: false
    };

    const isCorrect = resp.selectedOption === q.correctAnswer;
    if (isCorrect) {
      overallScore += 1;
      if (sectionStats[q.sectionId]) sectionStats[q.sectionId].score += 1;
      difficultyStats[q.difficulty].score += 1;

      if (q.difficulty === 'easy' && sectionStats[q.sectionId]) sectionStats[q.sectionId].easyScore += 1;
      if (q.difficulty === 'medium' && sectionStats[q.sectionId]) sectionStats[q.sectionId].mediumScore += 1;
      if (q.difficulty === 'hard' && sectionStats[q.sectionId]) sectionStats[q.sectionId].hardScore += 1;
    }

    if (resp.isMarkedForReview) reviewCount += 1;

    if (sectionStats[q.sectionId]) sectionStats[q.sectionId].totalTimeSpent += resp.timeSpentSeconds;
    if (q.difficulty === 'hard') totalTimeOnHard += resp.timeSpentSeconds;
    if (q.difficulty === 'easy') totalTimeOnEasy += resp.timeSpentSeconds;

    return {
      questionId: q.id,
      sectionId: q.sectionId,
      questionNumber: q.questionNumber,
      questionText: q.questionText,
      difficulty: q.difficulty,
      userAnswer: resp.selectedOption,
      correctAnswer: q.correctAnswer,
      isCorrect,
      timeSpent: resp.timeSpentSeconds
    };
  });

  // Calculate difficulty accuracies
  difficultyStats.easy.accuracy = difficultyStats.easy.total > 0 ? Math.round((difficultyStats.easy.score / difficultyStats.easy.total) * 100) : 0;
  difficultyStats.medium.accuracy = difficultyStats.medium.total > 0 ? Math.round((difficultyStats.medium.score / difficultyStats.medium.total) * 100) : 0;
  difficultyStats.hard.accuracy = difficultyStats.hard.total > 0 ? Math.round((difficultyStats.hard.score / difficultyStats.hard.total) * 100) : 0;

  // Formulate section scores
  const sectionScores: Record<SectionId, SectionScore> = {} as any;
  SECTION_METADATA.forEach((meta) => {
    const stat = sectionStats[meta.id] || { score: 0, total: 0, easyScore: 0, easyTotal: 0, mediumScore: 0, mediumTotal: 0, hardScore: 0, hardTotal: 0, totalTimeSpent: 0 };
    const secTotal = stat.total;
    sectionScores[meta.id] = {
      sectionId: meta.id,
      title: meta.title,
      score: stat.score,
      total: secTotal,
      percentage: secTotal > 0 ? Math.round((stat.score / secTotal) * 100) : 0,
      easyScore: stat.easyScore,
      easyTotal: stat.easyTotal,
      mediumScore: stat.mediumScore,
      mediumTotal: stat.mediumTotal,
      hardScore: stat.hardScore,
      hardTotal: stat.hardTotal,
      avgTimePerQuestion: secTotal ? Math.round(stat.totalTimeSpent / secTotal) : 0
    };
  });

  const overallPercentage = Math.round((overallScore / maxScore) * 100);

  // Grade Determination based on CIT Standard (A: 80-100%, B: 50-80%, C: <50%)
  const gradeObj = calculateGrade(overallPercentage);

  const analyticalIndex = Math.min(
    100,
    Math.round(
      sectionScores.calculus.percentage * 0.35 +
        sectionScores.statistics.percentage * 0.35 +
        sectionScores.numberSystem.percentage * 0.15 +
        difficultyStats.hard.accuracy * 0.15
    )
  );

  const logicPurity = Math.min(
    100,
    Math.round(
      sectionScores.probability.percentage * 0.35 +
        sectionScores.trigonometry.percentage * 0.35 +
        sectionScores.numberSystem.percentage * 0.30
    )
  );

  const avgSecondsPerQ = totalDurationSeconds / maxScore;
  const speedAccuracyFactor = Math.min(
    100,
    Math.max(30, Math.round(overallPercentage * 0.75 + (120 - Math.min(120, avgSecondsPerQ)) * 0.25))
  );

  // Behavioral Traits
  const reflectiveRatio =
    totalTimeOnEasy > 0
      ? Math.min(100, Math.round((totalTimeOnHard / totalTimeOnEasy) * 30))
      : 50;

  let decisionSpeed: BehavioralTraits['decisionSpeed'] = 'Balanced';
  if (avgSecondsPerQ < 35) decisionSpeed = 'Rapid';
  else if (avgSecondsPerQ < 55) decisionSpeed = 'Balanced';
  else if (avgSecondsPerQ < 80) decisionSpeed = 'Methodical';
  else decisionSpeed = 'Impulsive';

  const patienceScore = Math.min(
    100,
    Math.round(difficultyStats.hard.accuracy * 0.6 + (totalTimeOnHard / (totalDurationSeconds || 1)) * 100 * 0.4)
  );

  const focusIndex = Math.min(
    100,
    Math.max(40, Math.round(overallPercentage * 0.6 + (1 - reviewCount / 20) * 40))
  );

  const behavioralTraits: BehavioralTraits = {
    patienceScore,
    focusIndex,
    decisionSpeed,
    reflectivePauseRatio: reflectiveRatio,
    reviewUtilization: Math.min(100, Math.round((reviewCount / 20) * 100)),
    traitSummary: `Demonstrates a ${decisionSpeed.toLowerCase()} problem-solving cadence with a ${reflectiveRatio}% hard-to-easy question time allocation ratio. Exhibits strong metacognitive review discipline with ${reviewCount} questions flagged for verification.`
  };

  // Computational Capabilities
  const computationalCapabilities: ComputationalCapabilities = {
    algorithmicEfficiency: sectionScores.calculus.percentage,
    patternRecognition: sectionScores.numberSystem.percentage,
    spatialReasoning: sectionScores.trigonometry.percentage,
    quantitativeFluency: sectionScores.statistics.percentage,
    workingMemoryRetention: sectionScores.probability.percentage
  };

  // Personality Profile & Archetype
  const personalityProfile = generatePersonalityProfile(
    sectionScores,
    overallPercentage,
    behavioralTraits
  );

  // Recommended Career Paths for CIT Students
  const recommendedCareerPaths = generateCareerPaths(
    sectionScores,
    overallPercentage,
    student.department
  );

  // Student Feedback: Strengths, Weaknesses, Suggestions for Improvement
  const studentFeedback = generateStudentFeedback(
    sectionScores,
    difficultyStats,
    overallPercentage,
    detailedItemAnalysis
  );

  return {
    student,
    testTimestamp: new Date().toLocaleString('en-US', {
      timeZone: 'Asia/Kolkata',
      dateStyle: 'medium',
      timeStyle: 'short'
    }),
    totalDurationSeconds,
    overallScore,
    maxScore,
    overallPercentage,
    difficultyBreakdown: difficultyStats,
    sectionScores,
    cognitionLevel: {
      grade: gradeObj.grade,
      analyticalIndex,
      logicPurity,
      speedAccuracyFactor,
      summary: `Student secured Grade ${gradeObj.grade} (${gradeObj.title}) across B.E. / B. Tech. Programmes Mathematics foundational benchmarks.`
    },
    behavioralTraits,
    personalityProfile,
    computationalCapabilities,
    recommendedCareerPaths,
    studentFeedback,
    detailedItemAnalysis
  };
}

function generateStudentFeedback(
  sectionScores: Record<SectionId, SectionScore>,
  difficultyStats: DifficultyBreakdown,
  overallPercentage: number,
  detailedItemAnalysis: Array<{ isCorrect: boolean; userAnswer: number | null }>
): StudentFeedback {
  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const suggestions: string[] = [];

  const sortedSections = Object.values(sectionScores).sort((a, b) => b.percentage - a.percentage);

  // Analyze Strengths
  const topPerformers = sortedSections.filter((s) => s.percentage >= 60);
  if (topPerformers.length > 0) {
    topPerformers.forEach((s) => {
      strengths.push(
        `Strong conceptual mastery in ${s.title} (${s.score}/10 marks, ${s.percentage}% accuracy).`
      );
    });
  } else {
    const best = sortedSections[0];
    strengths.push(
      `Highest relative proficiency in ${best.title} (${best.score}/10 marks, ${best.percentage}% accuracy).`
    );
  }

  if (difficultyStats.easy.accuracy >= 70) {
    strengths.push(
      `High accuracy on fundamental/easy questions (${difficultyStats.easy.score}/${difficultyStats.easy.total} marks, ${difficultyStats.easy.accuracy}%).`
    );
  }
  if (difficultyStats.medium.accuracy >= 65) {
    strengths.push(
      `Solid problem-solving ability on intermediate/medium problems (${difficultyStats.medium.score}/${difficultyStats.medium.total} marks, ${difficultyStats.medium.accuracy}%).`
    );
  }
  if (difficultyStats.hard.accuracy >= 60) {
    strengths.push(
      `Excellent performance on advanced/hard multi-step questions (${difficultyStats.hard.score}/${difficultyStats.hard.total} marks, ${difficultyStats.hard.accuracy}%).`
    );
  }

  const answeredCount = detailedItemAnalysis.filter((q) => q.userAnswer !== null).length;
  if (answeredCount >= 45) {
    strengths.push(`Active attempt coverage across the assessment (${answeredCount}/50 questions answered).`);
  }

  // Analyze Weaknesses
  const lowPerformers = sortedSections.filter((s) => s.percentage < 60);
  if (lowPerformers.length > 0) {
    lowPerformers.forEach((s) => {
      weaknesses.push(
        `Underperformed in ${s.title} (${s.score}/10 marks, ${s.percentage}% accuracy) - requires thorough review.`
      );
    });
  } else {
    const lowest = sortedSections[sortedSections.length - 1];
    weaknesses.push(
      `Relatively lower performance in ${lowest.title} (${lowest.score}/10 marks) compared to other cognitive domains.`
    );
  }

  if (difficultyStats.hard.accuracy < 50) {
    weaknesses.push(
      `Difficulty with complex, hard-level questions (${difficultyStats.hard.score}/${difficultyStats.hard.total} marks, ${difficultyStats.hard.accuracy}% accuracy).`
    );
  }
  if (difficultyStats.medium.accuracy < 50) {
    weaknesses.push(
      `Gaps identified in medium-level application problems (${difficultyStats.medium.score}/${difficultyStats.medium.total} marks, ${difficultyStats.medium.accuracy}% accuracy).`
    );
  }

  const unattempted = 50 - answeredCount;
  if (unattempted >= 3) {
    weaknesses.push(`Time management: ${unattempted} questions were left unattempted.`);
  }

  // Generate Suggestions for Improvement
  if (lowPerformers.length > 0) {
    const lowTitles = lowPerformers.map((s) => s.title).join(', ');
    suggestions.push(
      `Prioritize revision and problem-solving practice in core topics: ${lowTitles}.`
    );
  } else {
    suggestions.push(
      `Consolidate advanced problem-solving techniques in ${sortedSections[sortedSections.length - 1].title} to reach full mastery.`
    );
  }

  if (difficultyStats.hard.accuracy < 60) {
    suggestions.push(
      `Practice step-by-step derivations and hard multi-concept problems under timed conditions.`
    );
  }

  if (unattempted > 0) {
    suggestions.push(
      `Improve pacing during the exam to ensure adequate time allocation for all 50 questions.`
    );
  }

  suggestions.push(
    `Review detailed answer keys and step-by-step solutions for incorrect questions to eliminate conceptual misunderstandings.`
  );
  suggestions.push(
    `Take periodic topic-wise mock evaluations to build consistency, speed, and analytical confidence.`
  );

  // Generate Opportunities for Student
  const opportunities: string[] = [];
  if (topPerformers.length > 0) {
    const topTitles = topPerformers.map((s) => s.title).join(', ');
    opportunities.push(
      `Leverage strong mastery in ${topTitles} to excel in advanced quantitative research and specialized electives.`
    );
  }
  opportunities.push(
    `Participate in competitive problem-solving workshops and timed mock assessments to enhance speed and precision.`
  );
  if (lowPerformers.length > 0) {
    opportunities.push(
      `Targeted practice in ${lowPerformers.map(s => s.title).join(', ')} provides significant scope for rapid percentile improvement.`
    );
  } else {
    opportunities.push(
      `Explore advanced mathematical modeling and algorithmic applications to further build academic distinction.`
    );
  }

  // Generate Threats for Student
  const threats: string[] = [];
  if (unattempted > 0) {
    threats.push(
      `Pacing Risk: ${unattempted} questions left unattempted reduce maximum scoring potential under timed conditions.`
    );
  }
  if (difficultyStats.hard.accuracy < 50) {
    threats.push(
      `Level 3 Question Vulnerability: Low accuracy (${difficultyStats.hard.accuracy}%) on complex multi-concept items poses scoring risks.`
    );
  }
  if (difficultyStats.medium.accuracy < 50) {
    threats.push(
      `Medium Difficulty Slippage: Gaps in intermediate application questions may impact overall consistency.`
    );
  }
  if (threats.length === 0) {
    threats.push(
      `Avoidable Errors: Maintain careful double-checking discipline to prevent minor calculation slips.`
    );
    threats.push(
      `Time Pressure: Ensure steady pacing to avoid rushing during the final minutes of competitive assessments.`
    );
  }

  return { strengths, weaknesses, opportunities, threats, suggestions };
}

function generatePersonalityProfile(
  sectionScores: Record<SectionId, SectionScore>,
  overallPercentage: number,
  behavioral: BehavioralTraits
): PersonalityProfile {
  const topSections = Object.values(sectionScores).sort((a, b) => b.percentage - a.percentage);

  const highest = topSections[0].sectionId;
  const secondHighest = topSections[1].sectionId;

  if (highest === 'calculus' || (highest === 'statistics' && secondHighest === 'calculus')) {
    return {
      archetype: 'Continuous Modeling & Analytical Strategist',
      tagline: 'High mathematical rigor in differential modeling, integration, and statistical estimation',
      primaryTrait: 'Systematic Calculus & Analytical Rigor',
      secondaryTrait: 'Empirical Data Synthesizer',
      description: 'You possess exceptional mathematical dexterity in solving differential equations, integral calculus, and statistical estimation. You thrive when analyzing dynamic rates of change and multi-variable distributions.',
      keyStrengths: [
        'Rapid formulation of physical systems into differential and integral calculus equations',
        'Exceptional statistical intuition (regression, variance, and standard deviation)',
        'High accuracy when handling multi-step limits, derivatives, and definite integrals'
      ],
      growthAreas: [
        'Speed optimization during complex trigonometric series simplifications',
        'Refining speed in high-density complex number polar transformations'
      ]
    };
  }

  if (highest === 'probability' || highest === 'numberSystem') {
    return {
      archetype: 'Differential & Integral Analysis Specialist',
      tagline: 'Rigor in differentiation techniques, integral calculus, and analytical modeling',
      primaryTrait: 'Differential & Integral Analysis',
      secondaryTrait: 'Analytical Problem Solving',
      description: 'Your mathematical strengths lean heavily towards differentiation rules, rates of change, definite and indefinite integrals, and analytical calculus.',
      keyStrengths: [
        'Flawless probability modeling using Bayes theorem and binomial distributions',
        'Strong facility with De Moivre\'s theorem, complex arguments, and logarithms',
        'Methodical verification of algebraic surds and exponent rules'
      ],
      growthAreas: [
        'Expanding speed on implicit parametric differentiation',
        'Mastering geometric properties of triangles and inverse trig identities'
      ]
    };
  }

  return {
    archetype: 'Multidisciplinary Mathematical Pioneer',
    tagline: 'Balanced mathematical mastery across Limits & Continuity, Differentiation, Integration, Probability & Statistics, and Matrices & Determinants',
    primaryTrait: 'Adaptive Mathematical Fluency',
    secondaryTrait: 'Metacognitive Problem-Solving',
    description: 'You exhibit a well-rounded mathematical profile capable of switching effortlessly between continuous calculus, stochastic probability, complex algebra, trigonometric identities, and statistical inference.',
    keyStrengths: [
      'Versatile mathematical problem-solving repertoire suitable for B.E. / B. Tech. STEM courses',
      'Balanced speed-accuracy calibration across easy, medium, and hard difficulty levels',
      'High metacognitive awareness and effective review utilization'
    ],
    growthAreas: [
      'Deepening hyper-specialized limits and continuity edge-case analysis',
      'Maximizing execution speed on complex rank correlation calculations'
    ]
  };
}

function generateCareerPaths(
  sectionScores: Record<SectionId, SectionScore>,
  overallPercentage: number,
  department: string
): CareerPath[] {
  const calP = sectionScores.calculus.percentage;
  const probP = sectionScores.probability.percentage;
  const numP = sectionScores.numberSystem.percentage;
  const trigP = sectionScores.trigonometry.percentage;
  const statP = sectionScores.statistics.percentage;

  const paths: CareerPath[] = [
    {
      id: 'ai-ml-architect',
      title: 'AI Systems Architect & Machine Learning Researcher',
      domain: 'Artificial Intelligence & Data Science',
      suitabilityScore: Math.min(99, Math.round(calP * 0.35 + statP * 0.35 + probP * 0.30)),
      matchRationale: 'Exceptional combination of vector calculus, statistical inference, and probability distribution modeling required for neural network gradient descent.',
      targetRoles: ['Principal ML Architect', 'AI Research Scientist', 'LLM Infrastructure Engineer', 'Data Science Lead'],
      suggestedPGElectives: ['Multivariable Calculus & Linear Algebra', 'Stochastic Processes', 'Deep Learning Mathematics', 'Statistical Machine Learning'],
      recommendedTechnologies: ['PyTorch', 'TensorFlow', 'NumPy', 'SciPy', 'CUDA C++']
    },
    {
      id: 'quant-financial-engineer',
      title: 'Quantitative Financial Analyst & Risk Engine Lead',
      domain: 'Quantitative Finance & Actuarial Science',
      suitabilityScore: Math.min(99, Math.round(statP * 0.40 + probP * 0.35 + calP * 0.25)),
      matchRationale: 'Strong performance in probability distributions, regression modeling, expectation, and calculus needed for option pricing and risk engines.',
      targetRoles: ['Quantitative Researcher', 'Risk Analytics Specialist', 'Actuarial Scientist', 'FinTech Quant Lead'],
      suggestedPGElectives: ['Stochastic Calculus & Black-Scholes', 'Financial Risk Modeling', 'Time-Series Econometrics', 'Actuarial Mathematics'],
      recommendedTechnologies: ['Python (QuantLib/Pandas)', 'R', 'C++', 'Monte Carlo Simulators', 'MATLAB']
    },
    {
      id: 'crypto-quantum-architect',
      title: 'Cryptographic Engineer & Quantum Computing Lead',
      domain: 'Cybersecurity & Theoretical Computer Science',
      suitabilityScore: Math.min(99, Math.round(numP * 0.40 + trigP * 0.30 + calP * 0.30)),
      matchRationale: 'High facility in complex number algebra, De Moivre\'s theorem, logarithms, and surds needed for post-quantum cryptography.',
      targetRoles: ['Cryptographic Researcher', 'Quantum Algorithm Developer', 'Security Systems Architect', 'Protocol Engineer'],
      suggestedPGElectives: ['Abstract Algebra & Number Theory', 'Quantum Computing Mathematics', 'Elliptic Curve Cryptography', 'Discrete Structures'],
      recommendedTechnologies: ['Qiskit', 'Rust', 'C++', 'SageMath', 'OpenSSL']
    },
    {
      id: 'computational-physics-lead',
      title: 'Computational Systems Engineer & Robotics Lead',
      domain: 'Physical Systems & Applied Mathematics',
      suitabilityScore: Math.min(99, Math.round(calP * 0.40 + trigP * 0.35 + numP * 0.25)),
      matchRationale: 'Superior scores in trigonometric transformations, differential equations, and calculus for spatial kinematics and continuous dynamics.',
      targetRoles: ['Robotics Kinematics Engineer', 'Simulation Scientist', 'Control Systems Architect', 'Aero-Dynamics Analyst'],
      suggestedPGElectives: ['Differential Equations & Boundary Values', 'Vector Analysis', 'Classical & Quantum Mechanics', 'Numerical Analysis'],
      recommendedTechnologies: ['ROS2', 'MATLAB / Simulink', 'Julia', 'C++', 'OpenGL / CAD']
    },
    {
      id: 'tech-product-strategist',
      title: 'Applied Decision Scientist & R&D Lead',
      domain: 'Analytics & Decision Engineering',
      suitabilityScore: Math.min(99, Math.round(statP * 0.35 + probP * 0.25 + overallPercentage * 0.40)),
      matchRationale: 'Well-rounded mathematical balance combining probability estimation, statistical regression, and structured decision trees.',
      targetRoles: ['Principal Decision Scientist', 'R&D Project Director', 'Operations Research Analyst', 'Analytics Lead'],
      suggestedPGElectives: ['Operations Research & Optimization', 'Bayesian Decision Theory', 'Statistical Quality Control', 'Data-Driven Strategy'],
      recommendedTechnologies: ['SQL / BI Dashboards', 'R', 'Python', 'A/B Testing Engines', 'Linear Programming Solvers']
    }
  ];

  return paths.sort((a, b) => b.suitabilityScore - a.suitabilityScore);
}
