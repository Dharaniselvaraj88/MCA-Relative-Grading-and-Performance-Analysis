import { SavedSubmission } from '../types';

export interface StudentRankInfo {
  overallRank: number; // 0 indicates disqualified / locked / no rank
  deptRank: number;    // 0 indicates disqualified / locked / no rank
  totalOverallStudents: number;
  totalDeptStudents: number;
  isDisqualified?: boolean;
}

/**
 * Generates Department Rank and Overall Rank for all students
 * who attended assessment, calculated across valid submissions
 * (excluding disqualified or locked students).
 */
export function computeStudentRankings(submissions: SavedSubmission[]): Map<string, StudentRankInfo> {
  const rankMap = new Map<string, StudentRankInfo>();
  if (!submissions || submissions.length === 0) return rankMap;

  // Filter out disqualified / locked submissions for ranking
  const validSubmissions = submissions.filter(
    (sub) => !sub.isLockedOut && !sub.securityViolation?.isViolated
  );

  // 1. Calculate Overall Ranks across valid submissions ONLY
  const sortedOverall = [...validSubmissions].sort((a, b) => b.report.overallScore - a.report.overallScore);
  const totalOverall = validSubmissions.length;

  const overallRanks = new Map<string, number>();
  let currentOverallRank = 1;

  sortedOverall.forEach((sub, idx) => {
    if (idx > 0 && sub.report.overallScore < sortedOverall[idx - 1].report.overallScore) {
      currentOverallRank = idx + 1;
    }
    overallRanks.set(sub.id, currentOverallRank);
  });

  // 2. Calculate Department Ranks within each department across valid submissions ONLY
  const deptGroups: Record<string, SavedSubmission[]> = {};
  validSubmissions.forEach((sub) => {
    const dept = sub.student.department || 'General';
    if (!deptGroups[dept]) deptGroups[dept] = [];
    deptGroups[dept].push(sub);
  });

  const deptRanks = new Map<string, number>();
  const deptTotals = new Map<string, number>();

  Object.entries(deptGroups).forEach(([dept, group]) => {
    const sortedDept = [...group].sort((a, b) => b.report.overallScore - a.report.overallScore);
    deptTotals.set(dept, group.length);

    let currentDeptRank = 1;
    sortedDept.forEach((sub, idx) => {
      if (idx > 0 && sub.report.overallScore < sortedDept[idx - 1].report.overallScore) {
        currentDeptRank = idx + 1;
      }
      deptRanks.set(sub.id, currentDeptRank);
    });
  });

  // 3. Build lookup map for each submission ID
  submissions.forEach((sub) => {
    const dept = sub.student.department || 'General';
    const isDisqualified = Boolean(sub.isLockedOut || sub.securityViolation?.isViolated);

    if (isDisqualified) {
      rankMap.set(sub.id, {
        overallRank: 0,
        deptRank: 0,
        totalOverallStudents: totalOverall,
        totalDeptStudents: deptTotals.get(dept) || 0,
        isDisqualified: true,
      });
    } else {
      rankMap.set(sub.id, {
        overallRank: overallRanks.get(sub.id) || 1,
        deptRank: deptRanks.get(sub.id) || 1,
        totalOverallStudents: totalOverall,
        totalDeptStudents: deptTotals.get(dept) || 1,
        isDisqualified: false,
      });
    }
  });

  return rankMap;
}
