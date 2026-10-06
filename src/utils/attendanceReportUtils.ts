/**
 * Department-wise Student Attendance Report & Institutional Summary Utility
 * Coimbatore Institute of Technology
 *
 * Tracks, aggregates, and exports candidate attendance registers based on student login timestamps.
 */

import { SavedSubmission } from '../types';
import { ActiveStudentSession, StudentLoginRecord } from '../lib/firebase';
import { normalizeProgrammeName, getProgrammeCode, STANDARD_PROGRAMMES } from './testManagerUtils';
import { formatDateDisplay } from './dateUtils';

export interface StudentAttendanceRecord {
  sNo: number;
  registerNo: string;
  studentName: string;
  department: string;
  departmentCode: string;
  loginTimestamp: number;
  loginTimeFormatted: string;
  status: 'COMPLETED' | 'IN_PROGRESS' | 'INTERRUPTED' | 'LOGGED_IN';
  statusLabel: string;
  submittedAt?: string;
  durationSeconds?: number;
  durationFormatted?: string;
  score?: number;
  percentage?: number;
  deviceId?: string;
}

export interface DepartmentAttendanceSummary {
  department: string;
  departmentCode: string;
  totalPresent: number;
  completedCount: number;
  inProgressCount: number;
  interruptedCount: number;
  earliestLogin: string;
  latestLogin: string;
  earliestLoginTimestamp: number;
  latestLoginTimestamp: number;
  avgDurationMinutes: number;
  completionRate: number;
}

export interface InstitutionalAttendanceSummary {
  totalCandidates: number;
  totalDepartments: number;
  completedCount: number;
  inProgressCount: number;
  interruptedCount: number;
  overallEarliestLogin: string;
  overallLatestLogin: string;
  avgDurationMinutes: number;
  completionRate: number;
}

export interface FullAttendanceReport {
  generatedAt: string;
  institutionalSummary: InstitutionalAttendanceSummary;
  departmentSummaries: DepartmentAttendanceSummary[];
  candidateRecords: StudentAttendanceRecord[];
}

/**
 * Parses any date/timestamp representation into epoch milliseconds.
 */
export function parseDateToEpoch(input?: string | number | null): number {
  if (!input) return 0;
  if (typeof input === 'number') return input;

  const str = String(input).trim();
  if (!str) return 0;

  // Numeric string check
  if (/^\d{11,15}$/.test(str)) {
    return parseInt(str, 10);
  }

  // Parse DD/MM/YYYY, HH:MM:SS AM/PM
  const ddmmyyyyMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:,\s*(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?\s*(AM|PM)?)?/i);
  if (ddmmyyyyMatch) {
    const day = parseInt(ddmmyyyyMatch[1], 10);
    const month = parseInt(ddmmyyyyMatch[2], 10) - 1;
    const year = parseInt(ddmmyyyyMatch[3], 10);
    let hours = ddmmyyyyMatch[4] ? parseInt(ddmmyyyyMatch[4], 10) : 9;
    const minutes = ddmmyyyyMatch[5] ? parseInt(ddmmyyyyMatch[5], 10) : 0;
    const seconds = ddmmyyyyMatch[6] ? parseInt(ddmmyyyyMatch[6], 10) : 0;
    const ampm = ddmmyyyyMatch[7] ? ddmmyyyyMatch[7].toUpperCase() : null;

    if (ampm === 'PM' && hours < 12) hours += 12;
    if (ampm === 'AM' && hours === 12) hours = 0;

    const d = new Date(year, month, day, hours, minutes, seconds);
    if (!isNaN(d.getTime())) return d.getTime();
  }

  const standardParsed = new Date(str);
  if (!isNaN(standardParsed.getTime())) {
    return standardParsed.getTime();
  }

  return 0;
}

/**
 * Formats epoch milliseconds into official "DD/MM/YYYY, HH:MM:SS AM/PM" format.
 */
export function formatEpochToDateTime(epoch: number): string {
  if (!epoch || epoch <= 0) return 'N/A';
  const date = new Date(epoch);
  if (isNaN(date.getTime())) return 'N/A';

  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();

  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  const formattedHours = String(hours).padStart(2, '0');

  return `${day}/${month}/${year}, ${formattedHours}:${minutes}:${seconds} ${ampm}`;
}

/**
 * Formats duration in seconds to human-readable string.
 */
export function formatDurationHuman(seconds?: number): string {
  if (!seconds || seconds <= 0) return '-';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  if (mins === 0) return `${secs}s`;
  if (secs === 0) return `${mins}m`;
  return `${mins}m ${secs}s`;
}

/**
 * Builds the complete Department-wise Attendance Report based on login timestamps.
 * Synthesizes data from completed submissions, live active candidate sessions, and recorded login events.
 */
export function buildAttendanceReportData(
  submissions: SavedSubmission[] = [],
  activeSessions: ActiveStudentSession[] = [],
  additionalLogins: StudentLoginRecord[] = [],
  configuredDepts: Array<{ name: string; code?: string }> = STANDARD_PROGRAMMES
): FullAttendanceReport {
  const candidateMap = new Map<string, StudentAttendanceRecord>();

  // 1. Process completed submissions
  submissions.forEach((sub) => {
    const rawReg = sub.student?.registerNo || '';
    const cleanReg = rawReg.trim().toUpperCase();
    if (!cleanReg) return;

    const dept = normalizeProgrammeName(sub.student?.department || (sub.student as any)?.dept || 'General Engineering');
    const deptCode = getProgrammeCode(dept);

    // Determine login timestamp
    let loginEpoch = 0;
    if (sub.student?.authenticatedAt) {
      loginEpoch = parseDateToEpoch(sub.student.authenticatedAt);
    }
    // If authenticatedAt is missing or invalid, compute from submittedAt / testTimestamp - duration
    if (!loginEpoch || loginEpoch <= 0) {
      const submitEpoch = parseDateToEpoch(sub.submittedAt || sub.report?.testTimestamp);
      const durationSecs = (sub as any).durationSeconds || sub.report?.totalDurationSeconds || 3600;
      if (submitEpoch > 0) {
        loginEpoch = submitEpoch - (durationSecs * 1000);
      } else {
        loginEpoch = Date.now() - 3600000;
      }
    }

    const durationSec = (sub as any).durationSeconds || sub.report?.totalDurationSeconds || 0;

    candidateMap.set(cleanReg, {
      sNo: 0,
      registerNo: cleanReg,
      studentName: sub.student?.name || 'Candidate',
      department: dept,
      departmentCode: deptCode,
      loginTimestamp: loginEpoch,
      loginTimeFormatted: formatEpochToDateTime(loginEpoch),
      status: 'COMPLETED',
      statusLabel: 'Present - Completed',
      submittedAt: sub.submittedAt || sub.report?.testTimestamp || 'Submitted',
      durationSeconds: durationSec,
      durationFormatted: formatDurationHuman(durationSec),
      score: sub.report?.overallScore,
      percentage: sub.report?.overallPercentage,
      deviceId: sub.student?.deviceId || '-'
    });
  });

  // 2. Process active / in-progress candidate sessions
  activeSessions.forEach((session) => {
    const rawReg = session.registerNo || '';
    const cleanReg = rawReg.trim().toUpperCase();
    if (!cleanReg) return;

    const existing = candidateMap.get(cleanReg);
    // If student already completed submission, maintain completed state
    if (existing && existing.status === 'COMPLETED') {
      return;
    }

    const dept = normalizeProgrammeName(session.department || 'General Engineering');
    const deptCode = getProgrammeCode(dept);
    const loginEpoch = session.loginTimestamp || session.startedAt || session.lastHeartbeat || Date.now();
    const isInterrupted = (session.status as string) === 'interrupted';

    const durationSec = Math.max(0, Math.floor((Date.now() - loginEpoch) / 1000));

    candidateMap.set(cleanReg, {
      sNo: 0,
      registerNo: cleanReg,
      studentName: session.studentName || 'Candidate',
      department: dept,
      departmentCode: deptCode,
      loginTimestamp: loginEpoch,
      loginTimeFormatted: formatEpochToDateTime(loginEpoch),
      status: isInterrupted ? 'INTERRUPTED' : 'IN_PROGRESS',
      statusLabel: isInterrupted ? 'Present - Interrupted' : 'Present - In Progress',
      submittedAt: 'In Progress',
      durationSeconds: durationSec,
      durationFormatted: formatDurationHuman(durationSec),
      deviceId: session.deviceId || '-'
    });
  });

  // 3. Process additional login records (from studentLogins Firestore / localStorage)
  additionalLogins.forEach((login) => {
    const rawReg = login.registerNo || '';
    const cleanReg = rawReg.trim().toUpperCase();
    if (!cleanReg) return;

    const existing = candidateMap.get(cleanReg);
    if (existing) {
      // If login timestamp in record is earlier, preserve earliest login
      if (login.loginTimestamp && login.loginTimestamp < existing.loginTimestamp) {
        existing.loginTimestamp = login.loginTimestamp;
        existing.loginTimeFormatted = formatEpochToDateTime(login.loginTimestamp);
      }
      return;
    }

    const dept = normalizeProgrammeName(login.department || 'General Engineering');
    const deptCode = getProgrammeCode(dept);
    const loginEpoch = login.loginTimestamp || Date.now();

    candidateMap.set(cleanReg, {
      sNo: 0,
      registerNo: cleanReg,
      studentName: login.studentName || 'Candidate',
      department: dept,
      departmentCode: deptCode,
      loginTimestamp: loginEpoch,
      loginTimeFormatted: formatEpochToDateTime(loginEpoch),
      status: 'LOGGED_IN',
      statusLabel: 'Present - Logged In',
      submittedAt: '-',
      durationSeconds: 0,
      durationFormatted: '-',
      deviceId: login.deviceId || '-'
    });
  });

  // Convert to sorted candidate list (sorted by Department, then Login Timestamp)
  const candidateRecords = Array.from(candidateMap.values());
  candidateRecords.sort((a, b) => {
    const deptComp = a.department.localeCompare(b.department);
    if (deptComp !== 0) return deptComp;
    return a.loginTimestamp - b.loginTimestamp;
  });

  // Assign sequential S.No
  candidateRecords.forEach((c, idx) => {
    c.sNo = idx + 1;
  });

  // 4. Compute Department-wise Summaries
  const deptMap = new Map<string, {
    deptName: string;
    deptCode: string;
    records: StudentAttendanceRecord[];
  }>();

  // Initialize with configured departments so catalog is full
  configuredDepts.forEach((std) => {
    const norm = normalizeProgrammeName(std.name);
    deptMap.set(norm, {
      deptName: norm,
      deptCode: std.code || getProgrammeCode(norm),
      records: []
    });
  });

  // Group candidate records into departments
  candidateRecords.forEach((rec) => {
    const dName = rec.department;
    if (!deptMap.has(dName)) {
      deptMap.set(dName, {
        deptName: dName,
        deptCode: rec.departmentCode,
        records: []
      });
    }
    deptMap.get(dName)!.records.push(rec);
  });

  const departmentSummaries: DepartmentAttendanceSummary[] = [];

  deptMap.forEach((entry, deptName) => {
    const recs = entry.records;
    const totalPresent = recs.length;

    let completedCount = 0;
    let inProgressCount = 0;
    let interruptedCount = 0;
    let totalDurationSec = 0;
    let earliestEpoch = Infinity;
    let latestEpoch = 0;

    recs.forEach((r) => {
      if (r.status === 'COMPLETED') completedCount++;
      else if (r.status === 'IN_PROGRESS') inProgressCount++;
      else if (r.status === 'INTERRUPTED') interruptedCount++;

      if (r.durationSeconds) totalDurationSec += r.durationSeconds;
      if (r.loginTimestamp > 0 && r.loginTimestamp < earliestEpoch) earliestEpoch = r.loginTimestamp;
      if (r.loginTimestamp > latestEpoch) latestEpoch = r.loginTimestamp;
    });

    const earliestLogin = totalPresent > 0 && earliestEpoch !== Infinity ? formatEpochToDateTime(earliestEpoch) : '-';
    const latestLogin = totalPresent > 0 && latestEpoch > 0 ? formatEpochToDateTime(latestEpoch) : '-';
    const avgDurationMinutes = totalPresent > 0 ? Math.round(totalDurationSec / totalPresent / 60) : 0;
    const completionRate = totalPresent > 0 ? Math.round((completedCount / totalPresent) * 100) : 0;

    departmentSummaries.push({
      department: deptName,
      departmentCode: entry.deptCode,
      totalPresent,
      completedCount,
      inProgressCount,
      interruptedCount,
      earliestLogin,
      latestLogin,
      earliestLoginTimestamp: earliestEpoch === Infinity ? 0 : earliestEpoch,
      latestLoginTimestamp: latestEpoch,
      avgDurationMinutes,
      completionRate
    });
  });

  // Sort department summaries by total attended descending, then department name
  departmentSummaries.sort((a, b) => {
    if (b.totalPresent !== a.totalPresent) return b.totalPresent - a.totalPresent;
    return a.department.localeCompare(b.department);
  });

  // 5. Overall Institutional Summary
  let totalCandidates = candidateRecords.length;
  let totalDepartments = departmentSummaries.filter((d) => d.totalPresent > 0).length;
  let completedTotal = 0;
  let inProgressTotal = 0;
  let interruptedTotal = 0;
  let grandTotalDurationSec = 0;
  let overallEarliest = Infinity;
  let overallLatest = 0;

  candidateRecords.forEach((r) => {
    if (r.status === 'COMPLETED') completedTotal++;
    else if (r.status === 'IN_PROGRESS') inProgressTotal++;
    else if (r.status === 'INTERRUPTED') interruptedTotal++;

    if (r.durationSeconds) grandTotalDurationSec += r.durationSeconds;
    if (r.loginTimestamp > 0 && r.loginTimestamp < overallEarliest) overallEarliest = r.loginTimestamp;
    if (r.loginTimestamp > overallLatest) overallLatest = r.loginTimestamp;
  });

  const institutionalSummary: InstitutionalAttendanceSummary = {
    totalCandidates,
    totalDepartments,
    completedCount: completedTotal,
    inProgressCount: inProgressTotal,
    interruptedCount: interruptedTotal,
    overallEarliestLogin: totalCandidates > 0 && overallEarliest !== Infinity ? formatEpochToDateTime(overallEarliest) : '-',
    overallLatestLogin: totalCandidates > 0 && overallLatest > 0 ? formatEpochToDateTime(overallLatest) : '-',
    avgDurationMinutes: totalCandidates > 0 ? Math.round(grandTotalDurationSec / totalCandidates / 60) : 0,
    completionRate: totalCandidates > 0 ? Math.round((completedTotal / totalCandidates) * 100) : 0
  };

  return {
    generatedAt: formatEpochToDateTime(Date.now()),
    institutionalSummary,
    departmentSummaries,
    candidateRecords
  };
}

/**
 * Exports Department-wise Student Attendance Report to Excel (.xlsx) with multi-sheet structure:
 * - Tab 1: "Attendance Summary"
 * - Tab 2: "Candidate Login Register"
 */
export async function exportAttendanceReportToExcel(
  report: FullAttendanceReport,
  filterDept: string = 'ALL'
): Promise<void> {
  const XLSX = await import('xlsx');
  const wb = XLSX.utils.book_new();

  const isFiltered = filterDept !== 'ALL';
  const targetRecords = isFiltered
    ? report.candidateRecords.filter((r) => r.department.toLowerCase().includes(filterDept.toLowerCase()))
    : report.candidateRecords;

  const targetSummaries = isFiltered
    ? report.departmentSummaries.filter((d) => d.department.toLowerCase().includes(filterDept.toLowerCase()))
    : report.departmentSummaries;

  // -------------------------------------------------------------
  // SHEET 1: Attendance Summary
  // -------------------------------------------------------------
  const summarySheetRows: any[][] = [
    ['COIMBATORE INSTITUTE OF TECHNOLOGY'],
    ['(Autonomous Institution Affiliated to Anna University, Chennai)'],
    ['INSTITUTIONAL DEPARTMENT-WISE STUDENT ATTENDANCE REPORT'],
    [`Report Scope: ${isFiltered ? filterDept : 'All Academic Engineering Departments'} | Generated: ${report.generatedAt}`],
    [],
    ['EXECUTIVE ATTENDANCE SUMMARY'],
    ['Metric', 'Value'],
    ['Total Candidates Attended', report.institutionalSummary.totalCandidates],
    ['Participating Departments', report.institutionalSummary.totalDepartments],
    ['Completed Submissions', `${report.institutionalSummary.completedCount} (${report.institutionalSummary.completionRate}%)`],
    ['Active In-Progress Sessions', report.institutionalSummary.inProgressCount],
    ['Interrupted / Savepoints', report.institutionalSummary.interruptedCount],
    ['Earliest Candidate Login Timestamp', report.institutionalSummary.overallEarliestLogin],
    ['Latest Candidate Login Timestamp', report.institutionalSummary.overallLatestLogin],
    ['Average Assessment Duration', `${report.institutionalSummary.avgDurationMinutes} minutes`],
    [],
    ['DEPARTMENT-WISE ATTENDANCE BREAKDOWN'],
    [
      'S.No',
      'Programme / Department',
      'Dept Code',
      'Total Attended',
      'Completed',
      'In-Progress',
      'Interrupted',
      'Earliest Login Timestamp',
      'Latest Login Timestamp',
      'Avg Duration (min)',
      'Completion Rate (%)'
    ]
  ];

  targetSummaries.forEach((d, idx) => {
    summarySheetRows.push([
      idx + 1,
      d.department,
      d.departmentCode,
      d.totalPresent,
      d.completedCount,
      d.inProgressCount,
      d.interruptedCount,
      d.earliestLogin,
      d.latestLogin,
      d.avgDurationMinutes,
      `${d.completionRate}%`
    ]);
  });

  const wsSummary = XLSX.utils.aoa_to_sheet(summarySheetRows);
  wsSummary['!cols'] = [
    { wch: 8 },  // S.No
    { wch: 55 }, // Department
    { wch: 12 }, // Code
    { wch: 16 }, // Total
    { wch: 14 }, // Completed
    { wch: 14 }, // In Progress
    { wch: 14 }, // Interrupted
    { wch: 28 }, // Earliest Login
    { wch: 28 }, // Latest Login
    { wch: 18 }, // Avg Duration
    { wch: 20 }  // Completion Rate
  ];
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Attendance Summary');

  // -------------------------------------------------------------
  // SHEET 2: Candidate Login Register
  // -------------------------------------------------------------
  const registerRows: any[][] = [
    ['COIMBATORE INSTITUTE OF TECHNOLOGY'],
    ['STUDENT CANDIDATE ATTENDANCE & LOGIN REGISTER'],
    [`Generated: ${report.generatedAt} | Total Candidates: ${targetRecords.length}`],
    [],
    [
      'S.No',
      'College Register Number',
      'Student Name',
      'Programme / Department',
      'Dept Code',
      'Student Login Timestamp',
      'Attendance Status',
      'Submission Timestamp',
      'Duration Spent',
      'Marks (/50)',
      'Percentage (%)',
      'Workstation / Device ID'
    ]
  ];

  targetRecords.forEach((c, idx) => {
    registerRows.push([
      idx + 1,
      c.registerNo,
      c.studentName,
      c.department,
      c.departmentCode,
      c.loginTimeFormatted,
      c.statusLabel,
      c.submittedAt || '-',
      c.durationFormatted || '-',
      c.score !== undefined ? c.score : '-',
      c.percentage !== undefined ? `${c.percentage}%` : '-',
      c.deviceId || '-'
    ]);
  });

  const wsRegister = XLSX.utils.aoa_to_sheet(registerRows);
  wsRegister['!cols'] = [
    { wch: 8 },  // S.No
    { wch: 24 }, // Reg No
    { wch: 32 }, // Student Name
    { wch: 55 }, // Department
    { wch: 12 }, // Dept Code
    { wch: 28 }, // Login Timestamp
    { wch: 24 }, // Status
    { wch: 28 }, // Submission Timestamp
    { wch: 16 }, // Duration
    { wch: 14 }, // Score
    { wch: 16 }, // Percentage
    { wch: 24 }  // Device ID
  ];
  XLSX.utils.book_append_sheet(wb, wsRegister, 'Candidate Login Register');

  const fileScope = isFiltered ? filterDept.replace(/[^a-zA-Z0-9]/g, '_') : 'All_Departments';
  const fileName = `CIT_Departmentwise_Attendance_Report_${fileScope}_${Date.now()}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

/**
 * Exports Department-wise Student Attendance Report to consolidated PDF.
 */
export async function exportAttendanceReportToPDF(
  report: FullAttendanceReport,
  filterDept: string = 'ALL'
): Promise<void> {
  const { default: jsPDF } = await import('jspdf');
  await import('jspdf-autotable');

  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  const isFiltered = filterDept !== 'ALL';
  const targetRecords = isFiltered
    ? report.candidateRecords.filter((r) => r.department.toLowerCase().includes(filterDept.toLowerCase()))
    : report.candidateRecords;

  const targetSummaries = isFiltered
    ? report.departmentSummaries.filter((d) => d.department.toLowerCase().includes(filterDept.toLowerCase()))
    : report.departmentSummaries;

  const margin = 14;
  const pageWidth = 297;

  // Header
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageWidth, 28, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('COIMBATORE INSTITUTE OF TECHNOLOGY', pageWidth / 2, 9, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('(Autonomous Institution Affiliated to Anna University & Approved by AICTE, New Delhi)', pageWidth / 2, 14, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('OFFICIAL DEPARTMENT-WISE STUDENT ATTENDANCE REPORT', pageWidth / 2, 20, { align: 'center' });

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(`Scope: ${isFiltered ? filterDept : 'All Departments'} | Generated: ${report.generatedAt} | Total Attended: ${targetRecords.length}`, pageWidth / 2, 25, { align: 'center' });

  // Executive KPI summary boxes
  let startY = 32;
  const boxWidth = (pageWidth - 2 * margin - 12) / 4;
  const boxHeight = 15;

  const kpis = [
    { label: 'TOTAL ATTENDED', val: String(targetRecords.length), color: [30, 41, 59] },
    { label: 'COMPLETED SUBMISSIONS', val: `${report.institutionalSummary.completedCount} (${report.institutionalSummary.completionRate}%)`, color: [16, 185, 129] },
    { label: 'IN PROGRESS / ACTIVE', val: String(report.institutionalSummary.inProgressCount), color: [59, 130, 246] },
    { label: 'LOGIN TIME WINDOW', val: `${report.institutionalSummary.overallEarliestLogin.split(',')[1] || '-'} to ${report.institutionalSummary.overallLatestLogin.split(',')[1] || '-'}`, color: [139, 92, 246] }
  ];

  kpis.forEach((kpi, idx) => {
    const x = margin + idx * (boxWidth + 4);
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(x, startY, boxWidth, boxHeight, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text(kpi.label, x + 3, startY + 5);

    doc.setFontSize(9);
    doc.setTextColor(kpi.color[0], kpi.color[1], kpi.color[2]);
    doc.text(kpi.val, x + 3, startY + 11);
  });

  // Table 1: Department Summary Matrix
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('I. DEPARTMENT-WISE ATTENDANCE SUMMARY MATRIX', margin, startY + 22);

  const summaryTableBody = targetSummaries.map((d, idx) => [
    idx + 1,
    d.department,
    d.departmentCode,
    d.totalPresent,
    d.completedCount,
    d.inProgressCount,
    d.interruptedCount,
    d.earliestLogin,
    d.latestLogin,
    `${d.completionRate}%`
  ]);

  (doc as any).autoTable({
    startY: startY + 25,
    margin: { left: margin, right: margin },
    head: [[
      'S.No',
      'Programme / Department',
      'Code',
      'Total',
      'Completed',
      'In-Progress',
      'Interrupted',
      'Earliest Login',
      'Latest Login',
      'Completion %'
    ]],
    body: summaryTableBody,
    theme: 'grid',
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold',
      halign: 'center'
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: [30, 41, 59]
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10 },
      1: { cellWidth: 70 },
      2: { halign: 'center', cellWidth: 14 },
      3: { halign: 'center', fontStyle: 'bold', cellWidth: 16 },
      4: { halign: 'center', cellWidth: 18 },
      5: { halign: 'center', cellWidth: 18 },
      6: { halign: 'center', cellWidth: 18 },
      7: { halign: 'center', cellWidth: 38 },
      8: { halign: 'center', cellWidth: 38 },
      9: { halign: 'center', fontStyle: 'bold', cellWidth: 20 }
    }
  });

  // Table 2: Candidate Login Register
  const registerBody = targetRecords.map((c, idx) => [
    idx + 1,
    c.registerNo,
    c.studentName,
    c.departmentCode,
    c.loginTimeFormatted,
    c.statusLabel,
    c.submittedAt || '-',
    c.durationFormatted || '-',
    c.deviceId || '-'
  ]);

  (doc as any).autoTable({
    startY: (doc as any).lastAutoTable.finalY + 10,
    margin: { left: margin, right: margin },
    head: [[
      'S.No',
      'Register Number',
      'Student Name',
      'Dept',
      'Login Date & Timestamp',
      'Attendance Status',
      'Submission Timestamp',
      'Duration',
      'Terminal / Device'
    ]],
    body: registerBody,
    theme: 'striped',
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold',
      halign: 'center'
    },
    bodyStyles: {
      fontSize: 7,
      textColor: [30, 41, 59]
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10 },
      1: { fontStyle: 'bold', cellWidth: 28 },
      2: { fontStyle: 'bold', cellWidth: 46 },
      3: { halign: 'center', cellWidth: 14 },
      4: { halign: 'center', fontStyle: 'bold', cellWidth: 44 },
      5: { halign: 'center', cellWidth: 36 },
      6: { halign: 'center', cellWidth: 42 },
      7: { halign: 'center', cellWidth: 20 },
      8: { halign: 'center', cellWidth: 28 }
    }
  });

  // Signatures Section at the end
  let finalY = (doc as any).lastAutoTable.finalY + 15;
  if (finalY > 175) {
    doc.addPage();
    finalY = 30;
  }

  const sigWidth = (pageWidth - 2 * margin) / 3;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);

  doc.text('Certified that all candidates listed above logged into the portal at the indicated timestamps.', margin, finalY);

  const sigY = finalY + 18;
  doc.setDrawColor(148, 163, 184);
  doc.line(margin + 5, sigY, margin + sigWidth - 10, sigY);
  doc.line(margin + sigWidth + 5, sigY, margin + 2 * sigWidth - 10, sigY);
  doc.line(margin + 2 * sigWidth + 5, sigY, pageWidth - margin - 10, sigY);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text('Hall Invigilator / Staff Incharge', margin + sigWidth / 2, sigY + 5, { align: 'center' });
  doc.text('Head of the Department (HOD)', margin + sigWidth * 1.5, sigY + 5, { align: 'center' });
  doc.text('Chief Superintendent of Examinations', margin + sigWidth * 2.5, sigY + 5, { align: 'center' });

  const fileScope = isFiltered ? filterDept.replace(/[^a-zA-Z0-9]/g, '_') : 'All_Departments';
  doc.save(`CIT_Attendance_Report_${fileScope}_${Date.now()}.pdf`);
}

/**
 * Exports Department-wise Student Attendance Report to CSV.
 */
export function exportAttendanceReportToCSV(
  report: FullAttendanceReport,
  filterDept: string = 'ALL'
): void {
  const isFiltered = filterDept !== 'ALL';
  const targetRecords = isFiltered
    ? report.candidateRecords.filter((r) => r.department.toLowerCase().includes(filterDept.toLowerCase()))
    : report.candidateRecords;

  const header = [
    'S.No',
    'College Register Number',
    'Student Name',
    'Department',
    'Department Code',
    'Student Login Timestamp',
    'Attendance Status',
    'Submission Timestamp',
    'Duration Spent',
    'Marks Obtained',
    'Percentage',
    'Workstation Device ID'
  ];

  const rows = targetRecords.map((c, idx) => [
    idx + 1,
    `"${c.registerNo.replace(/"/g, '""')}"`,
    `"${c.studentName.replace(/"/g, '""')}"`,
    `"${c.department.replace(/"/g, '""')}"`,
    `"${c.departmentCode.replace(/"/g, '""')}"`,
    `"${c.loginTimeFormatted.replace(/"/g, '""')}"`,
    `"${c.statusLabel.replace(/"/g, '""')}"`,
    `"${(c.submittedAt || '-').replace(/"/g, '""')}"`,
    `"${(c.durationFormatted || '-').replace(/"/g, '""')}"`,
    c.score !== undefined ? c.score : '-',
    c.percentage !== undefined ? `${c.percentage}%` : '-',
    `"${(c.deviceId || '-').replace(/"/g, '""')}"`
  ]);

  const csvContent = [header.join(','), ...rows.map((r) => r.join(','))].join('\n');
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const fileScope = isFiltered ? filterDept.replace(/[^a-zA-Z0-9]/g, '_') : 'All_Departments';
  a.download = `CIT_Attendance_Report_${fileScope}_${Date.now()}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
