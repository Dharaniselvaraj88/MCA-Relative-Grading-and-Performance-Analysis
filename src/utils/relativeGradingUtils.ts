import { SavedSubmission, SectionId, StudentInfo, CognitiveProfileReport } from '../types';
import { SECTION_METADATA } from '../data/questionsData';

export type RelativeGrade = 'A' | 'B' | 'C';

export interface RelativeGradeCutoffs {
  gradeACutoff: number; // lowest raw score achieving percentile >= 75 (first 25%)
  gradeBCutoff: number; // lowest raw score achieving percentile >= 35 (next 40%)
  gradeCCutoff: number; // below gradeBCutoff (last 35%)
  isSmallSample: boolean; // collegeN < 10
  totalCollegeStudents: number;
  totalDeptStudents: number;
}

export interface RelativeDomainGradeResult {
  grade: RelativeGrade;
  collegePercentile: number;
  deptPercentile: number;
  gradeLabel: string;
  color: string;
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
  displayLabel: string; // "Grade: B (College percentile: 68th) | Department percentile: 91st"
  cutoffs: RelativeGradeCutoffs;
}

export interface RelativeOverallGradeResult {
  grade: RelativeGrade;
  collegePercentile: number;
  deptPercentile: number;
  gradeLabel: string;
  title: string;
  color: string;
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
  description: string;
  cutoffs: {
    gradeACutoff: number;
    gradeBCutoff: number;
    isSmallSample: boolean;
    totalCollegeStudents: number;
  };
}

/**
 * Format a number as an ordinal (e.g. 1st, 2nd, 3rd, 68th, 91st)
 */
export function formatPercentileOrdinal(pct: number): string {
  const rounded = Math.round(pct);
  const s = ['th', 'st', 'nd', 'rd'];
  const v = rounded % 100;
  return rounded + (s[(v - 20) % 10] || s[v] || s[0]);
}

/**
 * Extracts raw score for a given domain from a submission
 */
export function getDomainScoreFromSub(sub: SavedSubmission, domainId: SectionId): number {
  if (sub.report?.sectionScores && sub.report.sectionScores[domainId]?.score !== undefined) {
    return sub.report.sectionScores[domainId].score;
  }
  if (sub.report?.detailedItemAnalysis) {
    return sub.report.detailedItemAnalysis.filter(
      (item) => item.sectionId === domainId && item.isCorrect
    ).length;
  }
  return 0;
}

/**
 * Computes fractional / average rank percentile for tied scores.
 *
 * Rule from prompt:
 * percentile = (number of students with score <= this student's score) / total * 100
 * Tie handling: Use average / fractional rank for tied scores so ties land consistently
 * on one side of a cutoff.
 */
export function computePercentileRank(score: number, allScores: number[]): number {
  if (!allScores || allScores.length === 0) return 0;
  const n = allScores.length;
  if (n === 1) return 100;

  const countLess = allScores.filter((s) => s < score).length;
  const countEqual = allScores.filter((s) => s === score).length;

  // Average / fractional rank for tied scores:
  // e.g. if 3 students tie, they span ranks (countLess + 1) to (countLess + countEqual)
  // Average rank = countLess + (countEqual + 1) / 2
  const avgRank = countLess + (countEqual + 1) / 2;
  const percentile = (avgRank / n) * 100;
  return Math.min(100, Math.max(0, Number(percentile.toFixed(1))));
}

/**
 * Computes actual score cutoffs for a domain across all college students.
 * Grade A cutoff: lowest raw score achieving college percentile >= 80
 * Grade B cutoff: lowest raw score achieving college percentile >= 30
 */
export function computeDomainCutoffs(
  allCollegeScores: number[],
  deptScores: number[] = []
): RelativeGradeCutoffs {
  const totalCollegeStudents = allCollegeScores.length;
  const totalDeptStudents = deptScores.length;
  const isSmallSample = totalCollegeStudents < 10;

  if (totalCollegeStudents === 0) {
    return {
      gradeACutoff: 8,
      gradeBCutoff: 5,
      gradeCCutoff: 0,
      isSmallSample: true,
      totalCollegeStudents: 0,
      totalDeptStudents: 0
    };
  }

  // Check unique possible scores from min to max
  const uniqueScores = Array.from(new Set(allCollegeScores)).sort((a, b) => a - b);

  let gradeACutoff = uniqueScores[uniqueScores.length - 1]; // fallback to max
  let gradeBCutoff = uniqueScores[0]; // fallback to min

  // Find lowest score with percentile >= 75 (first 25%)
  for (const s of uniqueScores) {
    const p = computePercentileRank(s, allCollegeScores);
    if (p >= 75) {
      gradeACutoff = s;
      break;
    }
  }

  // Find lowest score with percentile >= 35 (next 40%)
  for (const s of uniqueScores) {
    const p = computePercentileRank(s, allCollegeScores);
    if (p >= 35) {
      gradeBCutoff = s;
      break;
    }
  }

  return {
    gradeACutoff,
    gradeBCutoff,
    gradeCCutoff: 0,
    isSmallSample,
    totalCollegeStudents,
    totalDeptStudents
  };
}

/**
 * Calculates relative (norm-referenced) grade for a student in a specific domain.
 *
 * Rules:
 * 1. College-wide percentile rank:
 *    percentile >= 75 -> Grade A (first 25% of college)
 *    percentile >= 35 AND < 75 -> Grade B (next 40%)
 *    percentile < 35 -> Grade C (last 35%)
 * 2. Department-wise percentile rank shown as supplementary context.
 */
export function calculateRelativeDomainGrade(
  studentScore: number,
  domainId: SectionId,
  allSubmissions: SavedSubmission[] = [],
  studentDept: string = 'General'
): RelativeDomainGradeResult {
  // Ensure we have college scores
  let collegeScores = allSubmissions.map((s) => getDomainScoreFromSub(s, domainId));

  // If collegeScores is empty or doesn't include this student, add studentScore
  if (collegeScores.length === 0) {
    collegeScores = [studentScore];
  }

  const deptTrimmed = (studentDept || 'General').trim().toLowerCase();
  let deptScores = allSubmissions
    .filter((s) => (s.student?.department || 'General').trim().toLowerCase() === deptTrimmed)
    .map((s) => getDomainScoreFromSub(s, domainId));

  if (deptScores.length === 0) {
    deptScores = [studentScore];
  }

  // College-wide percentile determines the grade
  const collegePercentile = computePercentileRank(studentScore, collegeScores);
  const deptPercentile = computePercentileRank(studentScore, deptScores);

  // Assign grade based on college-wide percentile rank
  let grade: RelativeGrade = 'C';
  let gradeLabel = 'Grade C (Last 35% College-wide)';
  let color = '#EA580C';
  let badgeBg = 'bg-rose-100';
  let badgeBorder = 'border-rose-300';
  let badgeText = 'text-rose-800';

  if (collegePercentile >= 75) {
    grade = 'A';
    gradeLabel = 'Grade A (First 25% College-wide)';
    color = '#10B981';
    badgeBg = 'bg-emerald-100';
    badgeBorder = 'border-emerald-300';
    badgeText = 'text-emerald-800';
  } else if (collegePercentile >= 35) {
    grade = 'B';
    gradeLabel = 'Grade B (Next 40% College-wide)';
    color = '#3B82F6';
    badgeBg = 'bg-blue-100';
    badgeBorder = 'border-blue-300';
    badgeText = 'text-blue-800';
  }

  const cutoffs = computeDomainCutoffs(collegeScores, deptScores);

  const displayLabel = `Grade: ${grade} (College percentile: ${formatPercentileOrdinal(collegePercentile)}) | Department percentile: ${formatPercentileOrdinal(deptPercentile)}`;

  return {
    grade,
    collegePercentile: Math.round(collegePercentile),
    deptPercentile: Math.round(deptPercentile),
    gradeLabel,
    color,
    badgeBg,
    badgeBorder,
    badgeText,
    displayLabel,
    cutoffs
  };
}

/**
 * Calculates college-wide relative overall grade across total test scores
 */
export function calculateRelativeOverallGrade(
  overallScore: number,
  allSubmissions: SavedSubmission[] = [],
  studentDept: string = 'General'
): RelativeOverallGradeResult {
  let collegeScores = allSubmissions.map((s) => s.report?.overallScore ?? 0);
  if (collegeScores.length === 0) collegeScores = [overallScore];

  const deptTrimmed = (studentDept || 'General').trim().toLowerCase();
  let deptScores = allSubmissions
    .filter((s) => (s.student?.department || 'General').trim().toLowerCase() === deptTrimmed)
    .map((s) => s.report?.overallScore ?? 0);
  if (deptScores.length === 0) deptScores = [overallScore];

  const collegePercentile = computePercentileRank(overallScore, collegeScores);
  const deptPercentile = computePercentileRank(overallScore, deptScores);

  let grade: RelativeGrade = 'C';
  let gradeLabel = 'Grade C (Last 35% College-wide)';
  let title = 'Developing Competency';
  let color = '#EA580C';
  let badgeBg = 'bg-rose-100';
  let badgeBorder = 'border-rose-300';
  let badgeText = 'text-rose-800';
  let description = 'Norm-referenced: Placed in the lower 35% college-wide cohort on this assessment.';

  if (collegePercentile >= 75) {
    grade = 'A';
    gradeLabel = 'Grade A (First 25% College-wide)';
    title = 'High Proficiency / First 25%';
    color = '#10B981';
    badgeBg = 'bg-emerald-100';
    badgeBorder = 'border-emerald-300';
    badgeText = 'text-emerald-800';
    description = 'Norm-referenced: Placed in the top 25% college-wide cohort across B.E. / B.Tech programmes.';
  } else if (collegePercentile >= 35) {
    grade = 'B';
    gradeLabel = 'Grade B (Next 40% College-wide)';
    title = 'Proficient / Middle 40%';
    color = '#3B82F6';
    badgeBg = 'bg-blue-100';
    badgeBorder = 'border-blue-300';
    badgeText = 'text-blue-800';
    description = 'Norm-referenced: Placed in the middle 40% college-wide cohort across B.E. / B.Tech programmes.';
  }

  const uniqueScores = Array.from(new Set(collegeScores)).sort((a, b) => a - b);
  let gradeACutoff = uniqueScores[uniqueScores.length - 1];
  let gradeBCutoff = uniqueScores[0];

  for (const s of uniqueScores) {
    if (computePercentileRank(s, collegeScores) >= 75) {
      gradeACutoff = s;
      break;
    }
  }
  for (const s of uniqueScores) {
    if (computePercentileRank(s, collegeScores) >= 35) {
      gradeBCutoff = s;
      break;
    }
  }

  return {
    grade,
    collegePercentile: Math.round(collegePercentile),
    deptPercentile: Math.round(deptPercentile),
    gradeLabel,
    title,
    color,
    badgeBg,
    badgeBorder,
    badgeText,
    description,
    cutoffs: {
      gradeACutoff,
      gradeBCutoff,
      isSmallSample: collegeScores.length < 10,
      totalCollegeStudents: collegeScores.length
    }
  };
}

export interface DomainMarkLimitRow {
  sNo: number;
  domainId: SectionId | 'overall';
  domainName: string;
  maxMarks: number;
  gradeAFrom: number;
  gradeATo: number;
  gradeBFrom: number;
  gradeBTo: number;
  gradeCFrom: number;
  gradeCTo: number;
  totalStudents: number;
  isSmallSample: boolean;
}

/**
 * Computes the exact Mark Limits (From and To) for Grade A (first 25%), Grade B (next 40%),
 * and Grade C (last 35%) for a specific domain.
 */
export function computeDomainMarkLimits(
  domainId: SectionId,
  domainName: string,
  submissions: SavedSubmission[],
  sNo: number,
  maxMarks: number = 10
): DomainMarkLimitRow {
  const scores = (submissions || []).map((s) => getDomainScoreFromSub(s, domainId));
  const totalStudents = scores.length;
  const isSmallSample = totalStudents < 10;

  if (totalStudents === 0) {
    return {
      sNo,
      domainId,
      domainName,
      maxMarks,
      gradeAFrom: 8,
      gradeATo: maxMarks,
      gradeBFrom: 5,
      gradeBTo: 7,
      gradeCFrom: 0,
      gradeCTo: 4,
      totalStudents: 0,
      isSmallSample: true
    };
  }

  const scoresA: number[] = [];
  const scoresB: number[] = [];
  const scoresC: number[] = [];

  scores.forEach((s) => {
    const p = computePercentileRank(s, scores);
    if (p >= 75) {
      scoresA.push(s);
    } else if (p >= 35) {
      scoresB.push(s);
    } else {
      scoresC.push(s);
    }
  });

  const cutoffs = computeDomainCutoffs(scores);

  let gradeAFrom = scoresA.length > 0 ? Math.min(...scoresA) : cutoffs.gradeACutoff;
  let gradeATo = maxMarks;

  let gradeBFrom = scoresB.length > 0 ? Math.min(...scoresB) : cutoffs.gradeBCutoff;
  let gradeBTo = scoresB.length > 0 ? Math.max(...scoresB) : Math.max(gradeBFrom, gradeAFrom - 1);

  let gradeCFrom = 0;
  let gradeCTo = scoresC.length > 0 ? Math.max(...scoresC) : Math.max(0, gradeBFrom - 1);

  // Maintain strict non-overlapping order if valid
  if (gradeBTo >= gradeAFrom && gradeAFrom > 0) {
    gradeBTo = gradeAFrom - 1;
  }
  if (gradeCTo >= gradeBFrom && gradeBFrom > 0) {
    gradeCTo = gradeBFrom - 1;
  }

  return {
    sNo,
    domainId,
    domainName,
    maxMarks,
    gradeAFrom: Math.min(gradeAFrom, gradeATo),
    gradeATo,
    gradeBFrom: Math.min(gradeBFrom, gradeBTo),
    gradeBTo,
    gradeCFrom: 0,
    gradeCTo,
    totalStudents,
    isSmallSample
  };
}

/**
 * Computes Mark Limits (From and To) for all 5 domains across the college cohort.
 */
export function computeAllDomainMarkLimits(submissions: SavedSubmission[]): DomainMarkLimitRow[] {
  const domains: { id: SectionId; name: string }[] = [
    { id: 'calculus', name: 'Limits & Continuity' },
    { id: 'probability', name: 'Differentiation' },
    { id: 'numberSystem', name: 'Integration' },
    { id: 'trigonometry', name: 'Probability & Statistics' },
    { id: 'statistics', name: 'Matrices & Determinants' }
  ];

  const domainRows = domains.map((d, index) =>
    computeDomainMarkLimits(d.id, d.name, submissions, index + 1, 10)
  );

  // Also include the overall 50-mark test limits as summary benchmark row
  const overallScores = (submissions || []).map((s) => s.report?.overallScore ?? 0);
  const totalStudents = overallScores.length;
  const isSmallSample = totalStudents < 10;

  if (totalStudents === 0) {
    domainRows.push({
      sNo: 6,
      domainId: 'overall',
      domainName: 'Overall Assessment Benchmark (Total Score)',
      maxMarks: 50,
      gradeAFrom: 40,
      gradeATo: 50,
      gradeBFrom: 25,
      gradeBTo: 39,
      gradeCFrom: 0,
      gradeCTo: 24,
      totalStudents: 0,
      isSmallSample: true
    });
  } else {
    const scoresA: number[] = [];
    const scoresB: number[] = [];
    const scoresC: number[] = [];

    overallScores.forEach((s) => {
      const p = computePercentileRank(s, overallScores);
      if (p >= 75) scoresA.push(s);
      else if (p >= 35) scoresB.push(s);
      else scoresC.push(s);
    });

    let aFrom = scoresA.length > 0 ? Math.min(...scoresA) : 40;
    let aTo = 50;
    let bFrom = scoresB.length > 0 ? Math.min(...scoresB) : 25;
    let bTo = scoresB.length > 0 ? Math.max(...scoresB) : Math.max(bFrom, aFrom - 1);
    let cFrom = 0;
    let cTo = scoresC.length > 0 ? Math.max(...scoresC) : Math.max(0, bFrom - 1);

    if (bTo >= aFrom && aFrom > 0) bTo = aFrom - 1;
    if (cTo >= bFrom && bFrom > 0) cTo = bFrom - 1;

    domainRows.push({
      sNo: 6,
      domainId: 'overall',
      domainName: 'Overall Assessment Benchmark (Total Score)',
      maxMarks: 50,
      gradeAFrom: Math.min(aFrom, aTo),
      gradeATo: aTo,
      gradeBFrom: Math.min(bFrom, bTo),
      gradeBTo: bTo,
      gradeCFrom: cFrom,
      gradeCTo: cTo,
      totalStudents,
      isSmallSample
    });
  }

  return domainRows;
}

/**
 * Standard disclaimer note required on any grade display:
 */
export const RELATIVE_GRADING_DISCLAIMER =
  'Grade is relative to college-wide performance on this domain, not an absolute score threshold.';
