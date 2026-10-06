import { CognitiveProfileReport, SavedSubmission, StudentInfo } from '../types';

export const DCS_MAPPING: Record<string, { name: string; dept: string }> = {
  '26DCS014': { name: 'ASHWIN S', dept: 'MSc Decision and Computing Sciences' },
  '26DCS016': { name: 'BALAMURUGAN', dept: 'MSc Decision and Computing Sciences' },
  '26DCS024': { name: 'HASSINI S', dept: 'MSc Decision and Computing Sciences' },
  '26DCS025': { name: 'ILAKKYA S', dept: 'MSc Decision and Computing Sciences' },
  '26DCS038': { name: 'PRADIKSHA', dept: 'MSc Decision and Computing Sciences' },
  '26DCS047': { name: 'THANISHA', dept: 'MSc Decision and Computing Sciences' },
};

/**
 * Normalizes student identity, ensuring official names and corrected department designations.
 */
export function normalizeStudentInfo<T extends Partial<StudentInfo> & { regNo?: string; dept?: string }>(student: T): StudentInfo {
  const rawReg = student?.registerNo || student?.regNo || '';
  const regUpper = String(rawReg).trim().toUpperCase();

  let name = student?.name || 'Student Candidate';
  let dept = student?.department || student?.dept || 'B.E. Civil Engineering';

  if (dept.toLowerCase().includes('vlsi')) {
    dept = 'B.E. Electronics Engineering (VLSI Design and Technology)';
  } else if (regUpper.includes('VLSI') || regUpper.includes('26VL') || regUpper.includes('24VL')) {
    dept = 'B.E. Electronics Engineering (VLSI Design and Technology)';
  } else if (DCS_MAPPING[regUpper]) {
    dept = 'MSc Decision and Computing Sciences';
    if (!name || name === 'Student Candidate' || name.toUpperCase().includes('STUDENT') || name.toUpperCase() === regUpper) {
      name = DCS_MAPPING[regUpper].name;
    }
  } else if (regUpper.includes('DCS')) {
    dept = 'MSc Decision and Computing Sciences';
  }

  return {
    name,
    registerNo: regUpper || 'N/A',
    department: dept,
    accessPasscode: student?.accessPasscode || 'CIT-PASS',
    authenticatedAt: student?.authenticatedAt || new Date().toISOString()
  };
}

/**
 * Normalizes full submission record and its embedded report.
 */
export function normalizeSubmissionRecord(sub: SavedSubmission): SavedSubmission {
  if (!sub) return sub;
  const normalizedStudent = normalizeStudentInfo(sub.student || ({} as any));

  let report = sub.report;
  if (report) {
    report = {
      ...report,
      student: normalizeStudentInfo(report.student || normalizedStudent)
    };
  }

  return {
    ...sub,
    student: normalizedStudent,
    report: report as CognitiveProfileReport
  };
}

/**
 * Normalizes an array of submission records.
 */
export function normalizeSubmissionsList(subs: SavedSubmission[]): SavedSubmission[] {
  if (!Array.isArray(subs)) return [];
  return subs.map(normalizeSubmissionRecord);
}

/**
 * Normalizes a standalone cognitive profile report.
 */
export function normalizeReport(report: CognitiveProfileReport | null | undefined): CognitiveProfileReport | null {
  if (!report) return null;
  return {
    ...report,
    student: normalizeStudentInfo(report.student)
  };
}
