import { CognitiveProfileReport, SavedSubmission, Question, AppExperienceFeedback } from '../types';
import { ALL_QUESTIONS, SECTION_METADATA } from '../data/questionsData';
import { formatDateDisplay } from './dateUtils';
import { normalizeReport, normalizeSubmissionsList, normalizeSubmissionRecord } from './studentDataNormalizer';

export async function buildIndividualStudentPdfDoc(rawReport: CognitiveProfileReport) {
  const report = normalizeReport(rawReport) || rawReport;
  const { default: jsPDF } = await import('jspdf');
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  let y = 16;

  // Colors
  const darkBg = '#0B132B';
  const primaryCyan = '#00E5FF';
  const textWhite = '#FFFFFF';
  const textMuted = '#94A3B8';
  const accentEmerald = '#10B981';

  // --- HEADER COVER / TOP BANNER ---
  doc.setFillColor(11, 19, 43); // #0B132B
  doc.rect(0, 0, pageWidth, 38, 'F');

  // Institution Title
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text('COIMBATORE INSTITUTE OF TECHNOLOGY', margin, 14);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 229, 255); // #00E5FF
  doc.text('MATHEMATICS COMPETENCY ASSESSMENT REPORT', margin, 20);

  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text(`Generated on: ${report.testTimestamp} | Autonomous Institution affiliated to Anna University`, margin, 25);

  y = 44;

  // --- STUDENT METADATA CARD ---
  const studentGrade = calculateGrade(report.overallPercentage);

  doc.setFillColor(241, 245, 249);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(margin, y, pageWidth - 2 * margin, 26, 2, 2, 'FD');

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(`Student Name: ${report.student.name}`, margin + 4, y + 6);
  doc.text(`Register Number: ${report.student.registerNo}`, margin + 4, y + 12);
  doc.text(`Department: ${report.student.department}`, margin + 4, y + 18);
  doc.text(`Grade Secured: Grade ${studentGrade.grade} (${studentGrade.title})`, margin + 4, y + 23);

  doc.text(`Overall Score: ${report.overallScore} / ${report.maxScore} (${report.overallPercentage}%)`, pageWidth - margin - 85, y + 6);
  doc.text(`Grade Benchmark: ${studentGrade.gradeLabel}`, pageWidth - margin - 85, y + 12);
  doc.text(`Description: ${studentGrade.description}`, pageWidth - margin - 85, y + 18);

  y += 32;

  // --- SECTION PERFORMANCE SUMMARY ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('1. Sectional Cognitive Performance (Norm-Referenced)', margin, y);
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('Grade is relative to college-wide performance on this domain, not an absolute score threshold.', margin, y + 4);
  y += 7;

  // Table Headers
  doc.setFillColor(30, 41, 59);
  doc.rect(margin, y, pageWidth - 2 * margin, 7, 'F');
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text('Section Name', margin + 3, y + 5);
  doc.text('Score', margin + 58, y + 5);
  doc.text('Grade', margin + 84, y + 5);
  doc.text('Level 1 (40%)', margin + 104, y + 5);
  doc.text('Level 2 (30%)', margin + 128, y + 5);
  doc.text('Level 3 (30%)', margin + 150, y + 5);
  doc.text('Avg Time', margin + 168, y + 5);

  y += 7;

  // Table Rows
  Object.values(report.sectionScores).forEach((sec, idx) => {
    if (idx % 2 === 0) {
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, y, pageWidth - 2 * margin, 6, 'F');
    }
    const dGrade = calculateDomainGrade(sec.score, sec.total || 10);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(30, 41, 59);

    doc.text(sec.title, margin + 3, y + 4.5);
    doc.setFont('helvetica', 'bold');
    doc.text(`${sec.score}/10 (${sec.percentage}%)`, margin + 58, y + 4.5);

    // Domain Grade Color
    if (dGrade.grade === 'A') doc.setTextColor(16, 185, 129);
    else if (dGrade.grade === 'B') doc.setTextColor(37, 99, 235);
    else doc.setTextColor(220, 38, 38);
    doc.text(`Grade ${dGrade.grade}`, margin + 84, y + 4.5);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 41, 59);
    doc.text(`${sec.easyScore}/3`, margin + 104, y + 4.5);
    doc.text(`${sec.mediumScore}/3`, margin + 128, y + 4.5);
    doc.text(`${sec.hardScore}/4`, margin + 150, y + 4.5);
    doc.text(`${sec.avgTimePerQuestion}s/q`, margin + 168, y + 4.5);

    y += 6;
  });

  y += 6;

  // --- DIFFICULTY MASTERY SUMMARY ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('2. Difficulty Mastery Breakdown', margin, y);
  y += 5;

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);

  const diffText = `Level 1 (20 Qs - 40%): ${report.difficultyBreakdown.easy.score}/${report.difficultyBreakdown.easy.total} (${report.difficultyBreakdown.easy.accuracy}%)   |   Level 2 (15 Qs - 30%): ${report.difficultyBreakdown.medium.score}/${report.difficultyBreakdown.medium.total} (${report.difficultyBreakdown.medium.accuracy}%)   |   Level 3 (15 Qs - 30%): ${report.difficultyBreakdown.hard.score}/${report.difficultyBreakdown.hard.total} (${report.difficultyBreakdown.hard.accuracy}%)`;
  doc.text(diffText, margin, y);

  y += 8;

  // --- STUDENT DIAGNOSTIC FEEDBACK ---
  if (report.studentFeedback) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(15, 23, 42);
    doc.text('3. Student Diagnostic Analysis (Strengths, Weaknesses & Improvement Suggestions)', margin, y);
    y += 5;

    // Strengths
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(16, 185, 129);
    doc.text('Key Strengths:', margin, y);
    y += 4;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(51, 65, 85);
    (report.studentFeedback.strengths || []).forEach((str) => {
      const lines = doc.splitTextToSize(`• ${str}`, pageWidth - 2 * margin - 4);
      doc.text(lines, margin + 2, y);
      y += lines.length * 3.5;
    });

    y += 2;

    // Weaknesses
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(225, 29, 72);
    doc.text('Areas for Improvement (Weaknesses):', margin, y);
    y += 4;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(51, 65, 85);
    (report.studentFeedback.weaknesses || []).forEach((wk) => {
      const lines = doc.splitTextToSize(`• ${wk}`, pageWidth - 2 * margin - 4);
      doc.text(lines, margin + 2, y);
      y += lines.length * 3.5;
    });

    y += 2;

    // Suggestions
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(37, 99, 235);
    doc.text('Actionable Suggestions for Improvement:', margin, y);
    y += 4;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(51, 65, 85);
    (report.studentFeedback.suggestions || []).forEach((sug) => {
      const lines = doc.splitTextToSize(`• ${sug}`, pageWidth - 2 * margin - 4);
      doc.text(lines, margin + 2, y);
      y += lines.length * 3.5;
    });
  }

  // --- PAGE 2: ITEMIZED 100 QUESTIONS RESPONSE SHEET ---
  doc.addPage();
  y = 16;

  doc.setFillColor(11, 19, 43);
  doc.rect(0, 0, pageWidth, 20, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('COIMBATORE INSTITUTE OF TECHNOLOGY - ITEM ANALYSIS (50 QUESTIONS)', margin, 13);

  y = 26;

  // Table header
  doc.setFillColor(30, 41, 59);
  doc.rect(margin, y, pageWidth - 2 * margin, 6, 'F');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text('Q#', margin + 2, y + 4.5);
  doc.text('Sec', margin + 10, y + 4.5);
  doc.text('Diff', margin + 22, y + 4.5);
  doc.text('Question Summary', margin + 35, y + 4.5);
  doc.text('User Choice', margin + 125, y + 4.5);
  doc.text('Correct Key', margin + 150, y + 4.5);
  doc.text('Result', margin + 172, y + 4.5);

  y += 6;

  report.detailedItemAnalysis.forEach((item, index) => {
    if (y > pageHeight - 15) {
      doc.addPage();
      y = 16;
      // Header repeat
      doc.setFillColor(30, 41, 59);
      doc.rect(margin, y, pageWidth - 2 * margin, 6, 'F');
      doc.setFontSize(7.5);
      doc.setTextColor(255, 255, 255);
      doc.text('Q#', margin + 2, y + 4.5);
      doc.text('Sec', margin + 10, y + 4.5);
      doc.text('Diff', margin + 22, y + 4.5);
      doc.text('Question Summary', margin + 35, y + 4.5);
      doc.text('User Choice', margin + 125, y + 4.5);
      doc.text('Correct Key', margin + 150, y + 4.5);
      doc.text('Result', margin + 172, y + 4.5);
      y += 6;
    }

    if (index % 2 === 0) {
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, y, pageWidth - 2 * margin, 5, 'F');
    }

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(30, 41, 59);

    doc.text(`${index + 1}`, margin + 2, y + 3.8);
    doc.text(item.sectionId.substring(0, 3).toUpperCase(), margin + 10, y + 3.8);
    doc.text(item.difficulty.substring(0, 1).toUpperCase(), margin + 22, y + 3.8);

    const truncQ = item.questionText.length > 55 ? item.questionText.substring(0, 52) + '...' : item.questionText;
    doc.text(truncQ, margin + 35, y + 3.8);

    const userAnsStr = item.userAnswer !== null ? `Option ${String.fromCharCode(65 + item.userAnswer)}` : 'Unanswered';
    doc.text(userAnsStr, margin + 125, y + 3.8);

    doc.text(`Option ${String.fromCharCode(65 + item.correctAnswer)}`, margin + 150, y + 3.8);

    if (item.isCorrect) {
      doc.setTextColor(16, 185, 129); // Green
      doc.setFont('helvetica', 'bold');
      doc.text('CORRECT', margin + 172, y + 3.8);
    } else {
      doc.setTextColor(239, 68, 68); // Red
      doc.setFont('helvetica', 'normal');
      doc.text(item.userAnswer === null ? 'SKIPPED' : 'WRONG', margin + 172, y + 3.8);
    }

    y += 5;
  });

  return doc;
}

export async function downloadPdfReport(rawReport: CognitiveProfileReport) {
  const report = normalizeReport(rawReport) || rawReport;
  const doc = await buildIndividualStudentPdfDoc(report);
  const fileName = `CIT_Cognitive_Report_${report.student.registerNo.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
  doc.save(fileName);
}

export async function downloadExcelReport(rawReport: CognitiveProfileReport) {
  const report = normalizeReport(rawReport) || rawReport;
  const XLSX = await import('xlsx');
  const wb = XLSX.utils.book_new();

  // Sheet 1: Student & Summary
  const summaryData = [
    ['COIMBATORE INSTITUTE OF TECHNOLOGY'],
    ['MATHEMATICS COMPETENCY ASSESSMENT REPORT'],
    [''],
    ['Student Name', report.student.name],
    ['Register Number', report.student.registerNo],
    ['Department', report.student.department],
    ['Timestamp', report.testTimestamp],
    ['Duration Taken (seconds)', report.totalDurationSeconds],
    ['Overall Score', `${report.overallScore} / ${report.maxScore}`],
    ['Overall Percentage', `${report.overallPercentage}%`],
    ['Grade Secured', `Grade ${calculateGrade(report.overallPercentage).grade} (${calculateGrade(report.overallPercentage).title})`],
    ['Grade Benchmark', calculateGrade(report.overallPercentage).description],
    ['Logic Purity (100)', report.cognitionLevel.logicPurity],
    ['Speed-Accuracy Factor', report.cognitionLevel.speedAccuracyFactor],
    [''],
    ['DIFFICULTY MASTERY BREAKDOWN'],
    ['Difficulty Level', 'Questions Count', 'Score Obtained', 'Accuracy Percentage'],
    ['Level 1 (40%)', report.difficultyBreakdown.easy.total, report.difficultyBreakdown.easy.score, `${report.difficultyBreakdown.easy.accuracy}%`],
    ['Level 2 (30%)', report.difficultyBreakdown.medium.total, report.difficultyBreakdown.medium.score, `${report.difficultyBreakdown.medium.accuracy}%`],
    ['Level 3 (30%)', report.difficultyBreakdown.hard.total, report.difficultyBreakdown.hard.score, `${report.difficultyBreakdown.hard.accuracy}%`],
    [''],
    ['STUDENT DIAGNOSTIC FEEDBACK'],
    ['KEY STRENGTHS'],
    ...(report.studentFeedback?.strengths || []).map((s) => ['• ' + s]),
    ['AREAS FOR IMPROVEMENT (WEAKNESSES)'],
    ...(report.studentFeedback?.weaknesses || []).map((w) => ['• ' + w]),
    ['ACTIONABLE SUGGESTIONS FOR IMPROVEMENT'],
    ...(report.studentFeedback?.suggestions || []).map((s) => ['• ' + s])
  ];

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary Profile');

  // Sheet 2: Sectional Breakdown
  const sectionHeaders = [
    'Section ID',
    'Section Title',
    'Total Score',
    'Percentage',
    'Grade Secured',
    'Level 1 Score (/4)',
    'Level 2 Score (/3)',
    'Level 3 Score (/3)',
    'Avg Time / Question (sec)'
  ];

  const sectionRows = Object.values(report.sectionScores).map((sec) => {
    const dGrade = calculateDomainGrade(sec.score, sec.total || 10);
    return [
      sec.sectionId,
      sec.title,
      `${sec.score} / ${sec.total}`,
      `${sec.percentage}%`,
      `Grade ${dGrade.grade} (${dGrade.gradeLabel})`,
      `${sec.easyScore} / 3`,
      `${sec.mediumScore} / 3`,
      `${sec.hardScore} / 4`,
      `${sec.avgTimePerQuestion}s`
    ];
  });

  const wsSections = XLSX.utils.aoa_to_sheet([sectionHeaders, ...sectionRows]);
  XLSX.utils.book_append_sheet(wb, wsSections, 'Sectional Metrics');

  // Sheet 3: Itemized 50 Questions Response Sheet
  const itemHeaders = [
    'Question Number',
    'Section',
    'Difficulty',
    'Question Prompt',
    'Student Selected Option',
    'Correct Option',
    'Evaluation Result',
    'Time Spent (sec)'
  ];

  const itemRows = report.detailedItemAnalysis.map((item, idx) => [
    idx + 1,
    item.sectionId.toUpperCase(),
    item.difficulty.toUpperCase(),
    item.questionText,
    item.userAnswer !== null ? `Option ${String.fromCharCode(65 + item.userAnswer)}` : 'Unanswered',
    `Option ${String.fromCharCode(65 + item.correctAnswer)}`,
    item.isCorrect ? 'CORRECT' : item.userAnswer === null ? 'SKIPPED' : 'INCORRECT',
    item.timeSpent
  ]);

  const wsItems = XLSX.utils.aoa_to_sheet([itemHeaders, ...itemRows]);
  XLSX.utils.book_append_sheet(wb, wsItems, '50 Qs Answer Sheet');

  const fileName = `CIT_Cognitive_Assessment_${report.student.registerNo.replace(/[^a-zA-Z0-9]/g, '_')}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

/**
 * Generates a single consolidated PDF report for all students who took the assessment on a chosen date.
 * Columns: S.No, Register Number, Student Name, Department, Score Secured, Date of Assessment
 */
export async function downloadSingleDatePdfReport(rawSubmissions: SavedSubmission[], dateLabel: string, allSubmissions?: SavedSubmission[]) {
  const submissions = normalizeSubmissionsList(rawSubmissions);
  const { default: jsPDF } = await import('jspdf');
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 12;
  let y = 14;

  // Header banner
  doc.setFillColor(11, 19, 43); // #0B132B
  doc.rect(0, 0, pageWidth, 42, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text('COIMBATORE INSTITUTE OF TECHNOLOGY', margin, 13);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 229, 255);
  doc.text('MATHEMATICS COMPETENCY ASSESSMENT CONSOLIDATED REPORT', margin, 20);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184);
  doc.text(`Assessment Date Filter: ${dateLabel} | Generated: ${new Date().toLocaleString()}`, margin, 32);
  doc.text(`Total Students Evaluated: ${submissions.length}`, margin, 37);

  y = 48;

  const printHeaders = (currY: number) => {
    doc.setFillColor(30, 41, 59); // #1E293B
    doc.rect(margin, currY, pageWidth - 2 * margin, 8, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(255, 255, 255);

    doc.text('S.No', margin + 3, currY + 5.5);
    doc.text('Register Number', margin + 15, currY + 5.5);
    doc.text('Student Name', margin + 52, currY + 5.5);
    doc.text('Department', margin + 110, currY + 5.5);
    doc.text('Score Secured', margin + 175, currY + 5.5);
    doc.text('Date of Assessment', margin + 220, currY + 5.5);
  };

  printHeaders(y);
  y += 8;

  if (submissions.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text('No student assessment records found for the selected date.', margin + 3, y + 8);
  } else {
    submissions.forEach((sub, idx) => {
      if (y > pageHeight - 18) {
        doc.addPage();
        y = 14;
        printHeaders(y);
        y += 8;
      }

      if (idx % 2 === 0) {
        doc.setFillColor(248, 250, 252);
        doc.rect(margin, y, pageWidth - 2 * margin, 7, 'F');
      }

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(15, 23, 42);

      const regNo = sub.student.registerNo || 'N/A';
      const name = sub.student.name.length > 30 ? sub.student.name.substring(0, 28) + '..' : sub.student.name;
      const dept = sub.student.department.length > 35 ? sub.student.department.substring(0, 33) + '..' : sub.student.department;
      const score = `${sub.report.overallScore} / ${sub.report.maxScore} (${sub.report.overallPercentage}%)`;
      const dateStr = sub.submittedAt || sub.report.testTimestamp || 'N/A';

      doc.text(String(idx + 1), margin + 3, y + 5);
      doc.setFont('helvetica', 'bold');
      doc.text(regNo, margin + 15, y + 5);
      doc.setFont('helvetica', 'normal');
      doc.text(name, margin + 52, y + 5);
      doc.text(dept, margin + 110, y + 5);
      doc.setFont('helvetica', 'bold');
      doc.text(score, margin + 175, y + 5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(15, 23, 42);
      doc.text(dateStr, margin + 220, y + 5);

      y += 7;
    });
  }

  // Footer page numbers
  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(`Coimbatore Institute of Technology | Page ${i} of ${totalPages}`, margin, pageHeight - 6);
  }

  const cleanDateLabel = dateLabel.replace(/[^a-zA-Z0-9]/g, '_');
  doc.save(`CIT_Single_Date_Assessment_Report_${cleanDateLabel}.pdf`);
}

/**
 * Generates an Excel workbook for all students who took the assessment on a chosen date.
 */
export async function downloadSingleDateExcelReport(rawSubmissions: SavedSubmission[], dateLabel: string, allSubmissions?: SavedSubmission[]) {
  const submissions = normalizeSubmissionsList(rawSubmissions);
  const XLSX = await import('xlsx');
  const wb = XLSX.utils.book_new();

  const titleRows = [
    ['COIMBATORE INSTITUTE OF TECHNOLOGY'],
    ['MATHEMATICS COMPETENCY ASSESSMENT CONSOLIDATED REPORT'],
    [`Assessment Date Filter: ${dateLabel}`],
    [`Total Evaluated Students: ${submissions.length}`],
    ['Generated Date:', new Date().toLocaleString()],
    ['']
  ];

  const headers = ['S.No', 'Register Number', 'Student Name', 'Department', 'Score Secured', 'Date of Assessment'];

  const rows = submissions.map((sub, idx) => {
    return [
      idx + 1,
      sub.student.registerNo,
      sub.student.name,
      sub.student.department,
      `${sub.report.overallScore} / ${sub.report.maxScore} (${sub.report.overallPercentage}%)`,
      sub.submittedAt || sub.report.testTimestamp
    ];
  });

  const sheetData = [...titleRows, headers, ...rows];
  const ws = XLSX.utils.aoa_to_sheet(sheetData);
  XLSX.utils.book_append_sheet(wb, ws, 'Single Date Report');

  const cleanDateLabel = dateLabel.replace(/[^a-zA-Z0-9]/g, '_');
  XLSX.writeFile(wb, `CIT_Single_Date_Assessment_Report_${cleanDateLabel}.xlsx`);
}

/**
 * Generates a CSV file for all students who took the assessment on a chosen date.
 */
export function downloadSingleDateCsvReport(rawSubmissions: SavedSubmission[], dateLabel: string, allSubmissions?: SavedSubmission[]) {
  const submissions = normalizeSubmissionsList(rawSubmissions);
  const headers = ['S.No', 'Register Number', 'Student Name', 'Department', 'Score Secured', 'Date of Assessment'];
  const rows = submissions.map((sub, idx) => {
    return [
      idx + 1,
      `"${sub.student.registerNo.replace(/"/g, '""')}"`,
      `"${sub.student.name.replace(/"/g, '""')}"`,
      `"${sub.student.department.replace(/"/g, '""')}"`,
      `"${sub.report.overallScore} / ${sub.report.maxScore} (${sub.report.overallPercentage}%)"`,
      `"${(sub.submittedAt || sub.report.testTimestamp).replace(/"/g, '""')}"`
    ];
  });

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const cleanDateLabel = dateLabel.replace(/[^a-zA-Z0-9]/g, '_');
  a.download = `CIT_Single_Date_Assessment_Report_${cleanDateLabel}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Generates a consolidated PDF report for a selected department.
 * Columns: S.No, Register Number, Student Name, Department, Score Secured, Date of Assessment
 */
export async function downloadDepartmentwisePdfReport(rawSubmissions: SavedSubmission[], deptLabel: string, allSubmissions?: SavedSubmission[]) {
  const submissions = normalizeSubmissionsList(rawSubmissions);
  const { default: jsPDF } = await import('jspdf');
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 12;
  let y = 14;

  // Header banner
  doc.setFillColor(11, 19, 43); // #0B132B
  doc.rect(0, 0, pageWidth, 42, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text('COIMBATORE INSTITUTE OF TECHNOLOGY', margin, 13);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 229, 255);
  doc.text('DEPARTMENTWISE MATHEMATICS COMPETENCY ASSESSMENT CONSOLIDATED REPORT', margin, 20);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184);
  doc.text(`Department Filter: ${deptLabel} | Generated: ${new Date().toLocaleString()}`, margin, 32);
  doc.text(`Total Students Evaluated: ${submissions.length}`, margin, 37);

  y = 48;

  const printHeaders = (currY: number) => {
    doc.setFillColor(30, 41, 59); // #1E293B
    doc.rect(margin, currY, pageWidth - 2 * margin, 8, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(255, 255, 255);

    doc.text('S.No', margin + 3, currY + 5.5);
    doc.text('Register Number', margin + 15, currY + 5.5);
    doc.text('Student Name', margin + 52, currY + 5.5);
    doc.text('Department', margin + 110, currY + 5.5);
    doc.text('Score Secured', margin + 175, currY + 5.5);
    doc.text('Date of Assessment', margin + 220, currY + 5.5);
  };

  printHeaders(y);
  y += 8;

  if (submissions.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text('No student assessment records found for the selected department.', margin + 3, y + 8);
  } else {
    submissions.forEach((sub, idx) => {
      if (y > pageHeight - 18) {
        doc.addPage();
        y = 14;
        printHeaders(y);
        y += 8;
      }

      if (idx % 2 === 0) {
        doc.setFillColor(248, 250, 252);
        doc.rect(margin, y, pageWidth - 2 * margin, 7, 'F');
      }

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(15, 23, 42);

      const regNo = sub.student.registerNo || 'N/A';
      const name = sub.student.name.length > 30 ? sub.student.name.substring(0, 28) + '..' : sub.student.name;
      const dept = sub.student.department.length > 35 ? sub.student.department.substring(0, 33) + '..' : sub.student.department;
      const score = `${sub.report.overallScore} / ${sub.report.maxScore} (${sub.report.overallPercentage}%)`;
      const dateStr = sub.submittedAt || sub.report.testTimestamp || 'N/A';

      doc.text(String(idx + 1), margin + 3, y + 5);
      doc.setFont('helvetica', 'bold');
      doc.text(regNo, margin + 15, y + 5);
      doc.setFont('helvetica', 'normal');
      doc.text(name, margin + 52, y + 5);
      doc.text(dept, margin + 110, y + 5);
      doc.setFont('helvetica', 'bold');
      doc.text(score, margin + 175, y + 5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(15, 23, 42);
      doc.text(dateStr, margin + 220, y + 5);

      y += 7;
    });
  }

  // Footer page numbers
  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(`Coimbatore Institute of Technology | Page ${i} of ${totalPages}`, margin, pageHeight - 6);
  }

  const cleanDeptLabel = deptLabel.replace(/[^a-zA-Z0-9]/g, '_');
  doc.save(`CIT_Departmentwise_Assessment_Report_${cleanDeptLabel}.pdf`);
}

/**
 * Generates an Excel workbook for all students of a selected department.
 */
export async function downloadDepartmentwiseExcelReport(rawSubmissions: SavedSubmission[], deptLabel: string, allSubmissions?: SavedSubmission[]) {
  const submissions = normalizeSubmissionsList(rawSubmissions);
  const XLSX = await import('xlsx');
  const wb = XLSX.utils.book_new();

  const titleRows = [
    ['COIMBATORE INSTITUTE OF TECHNOLOGY'],
    ['DEPARTMENTWISE MATHEMATICS COMPETENCY ASSESSMENT CONSOLIDATED REPORT'],
    [`Department Filter: ${deptLabel}`],
    [`Total Evaluated Students: ${submissions.length}`],
    ['Generated Date:', new Date().toLocaleString()],
    ['']
  ];

  const headers = ['S.No', 'Register Number', 'Student Name', 'Department', 'Score Secured', 'Date of Assessment'];

  const rows = submissions.map((sub, idx) => {
    return [
      idx + 1,
      sub.student.registerNo,
      sub.student.name,
      sub.student.department,
      `${sub.report.overallScore} / ${sub.report.maxScore} (${sub.report.overallPercentage}%)`,
      sub.submittedAt || sub.report.testTimestamp
    ];
  });

  const sheetData = [...titleRows, headers, ...rows];
  const ws = XLSX.utils.aoa_to_sheet(sheetData);
  XLSX.utils.book_append_sheet(wb, ws, 'Departmentwise Report');

  const cleanDeptLabel = deptLabel.replace(/[^a-zA-Z0-9]/g, '_');
  XLSX.writeFile(wb, `CIT_Departmentwise_Assessment_Report_${cleanDeptLabel}.xlsx`);
}

/**
 * Generates a CSV file for all students in a selected department.
 */
export function downloadDepartmentwiseCsvReport(rawSubmissions: SavedSubmission[], deptLabel: string, allSubmissions?: SavedSubmission[]) {
  const submissions = normalizeSubmissionsList(rawSubmissions);
  const headers = ['S.No', 'Register Number', 'Student Name', 'Department', 'Score Secured', 'Date of Assessment'];
  const rows = submissions.map((sub, idx) => {
    return [
      idx + 1,
      `"${sub.student.registerNo.replace(/"/g, '""')}"`,
      `"${sub.student.name.replace(/"/g, '""')}"`,
      `"${sub.student.department.replace(/"/g, '""')}"`,
      `"${sub.report.overallScore} / ${sub.report.maxScore} (${sub.report.overallPercentage}%)"`,
      `"${(sub.submittedAt || sub.report.testTimestamp).replace(/"/g, '""')}"`
    ];
  });

  const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  const cleanDeptLabel = deptLabel.replace(/[^a-zA-Z0-9]/g, '_');
  link.setAttribute('download', `CIT_Departmentwise_Assessment_Report_${cleanDeptLabel}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Generates a master consolidated PDF report containing all candidate assessment records across all departments and dates.
 */
export async function downloadAllSubmissionsMasterPdfReport(rawSubmissions: SavedSubmission[]) {
  const submissions = normalizeSubmissionsList(rawSubmissions);
  const { default: jsPDF } = await import('jspdf');
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 12;
  let y = 14;

  // Header banner
  doc.setFillColor(11, 19, 43); // #0B132B
  doc.rect(0, 0, pageWidth, 42, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text('COIMBATORE INSTITUTE OF TECHNOLOGY', margin, 13);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 229, 255);
  doc.text('MASTER INSTITUTIONAL ASSESSMENT CONSOLIDATED REPORT', margin, 20);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184);
  doc.text(`Scope: All Student Assessment Records | Generated: ${new Date().toLocaleString()}`, margin, 32);
  doc.text(`Total Students Evaluated: ${submissions.length}`, margin, 37);

  y = 48;

  const printHeaders = (currY: number) => {
    doc.setFillColor(30, 41, 59); // #1E293B
    doc.rect(margin, currY, pageWidth - 2 * margin, 8, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(255, 255, 255);

    doc.text('S.No', margin + 3, currY + 5.5);
    doc.text('Register Number', margin + 15, currY + 5.5);
    doc.text('Student Name', margin + 52, currY + 5.5);
    doc.text('Department', margin + 110, currY + 5.5);
    doc.text('Score Secured', margin + 175, currY + 5.5);
    doc.text('Date of Assessment', margin + 220, currY + 5.5);
  };

  printHeaders(y);
  y += 8;

  if (submissions.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text('No student assessment records found.', margin + 3, y + 8);
  } else {
    submissions.forEach((sub, idx) => {
      if (y > pageHeight - 18) {
        doc.addPage();
        y = 14;
        printHeaders(y);
        y += 8;
      }

      if (idx % 2 === 0) {
        doc.setFillColor(248, 250, 252);
        doc.rect(margin, y, pageWidth - 2 * margin, 7, 'F');
      }

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(15, 23, 42);

      const regNo = sub.student.registerNo || 'N/A';
      const name = sub.student.name.length > 30 ? sub.student.name.substring(0, 28) + '..' : sub.student.name;
      const dept = sub.student.department.length > 35 ? sub.student.department.substring(0, 33) + '..' : sub.student.department;
      const score = `${sub.report.overallScore} / ${sub.report.maxScore} (${sub.report.overallPercentage}%)`;
      const dateStr = sub.submittedAt || sub.report.testTimestamp || 'N/A';

      doc.text(String(idx + 1), margin + 3, y + 5);
      doc.setFont('helvetica', 'bold');
      doc.text(regNo, margin + 15, y + 5);
      doc.setFont('helvetica', 'normal');
      doc.text(name, margin + 52, y + 5);
      doc.text(dept, margin + 110, y + 5);
      doc.setFont('helvetica', 'bold');
      doc.text(score, margin + 175, y + 5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(15, 23, 42);
      doc.text(dateStr, margin + 220, y + 5);

      y += 7;
    });
  }

  // Footer page numbers
  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(`Coimbatore Institute of Technology | Page ${i} of ${totalPages}`, margin, pageHeight - 6);
  }

  doc.save('CIT_Master_Institutional_Assessment_Report.pdf');
}

/**
 * Alias for downloadAllDatabaseRecordsExcelReport to maintain backward compatibility
 */
export async function downloadAllDatabaseRecordsExcelReport(submissions: SavedSubmission[]) {
  return bulkExportAllSubmissionsToExcel(submissions);
}

/**
 * Exports all questions across all domains with options, correct answers, and explanations to an Excel (.xlsx) file.
 * Includes a Master sheet with all questions plus dedicated tabs for each domain (Limits & Continuity, Differentiation, Integration, Probability & Statistics, Matrices & Determinants).
 */
export async function downloadQuestionBankExcel(customBank?: Question[]) {
  const XLSX = await import('xlsx');
  const wb = XLSX.utils.book_new();
  const qBank = customBank && customBank.length > 0 ? customBank : ALL_QUESTIONS;

  // Sheet 1: Master Questions
  const masterHeaders = [
    'Q.No',
    'Question ID',
    'Domain / Section',
    'Difficulty Level',
    'Question Prompt',
    'Option A',
    'Option B',
    'Option C',
    'Option D',
    'Correct Option Key',
    'Correct Answer Text',
    'Detailed Explanation / Solution',
    'Context / Math Formula'
  ];

  const masterRows = qBank.map((q, idx) => {
    const secMeta = SECTION_METADATA.find((s) => s.id === q.sectionId);
    const domainTitle = secMeta ? secMeta.title : q.sectionId;
    const optionLetter = String.fromCharCode(65 + q.correctAnswer); // A, B, C, D
    const optionText = q.options[q.correctAnswer] || '';

    return [
      idx + 1,
      q.id,
      domainTitle,
      q.difficulty.toUpperCase(),
      q.questionText || q.question,
      q.options[0] || '',
      q.options[1] || '',
      q.options[2] || '',
      q.options[3] || '',
      `Option ${optionLetter}`,
      optionText,
      q.explanation || '',
      q.codeSnippet || ''
    ];
  });

  const titleRows = [
    ['COIMBATORE INSTITUTE OF TECHNOLOGY'],
    [`COGNITIVE MATHEMATICS ASSESSMENT - QUESTION BANK (${qBank.length} QUESTIONS)`],
    ['Domains: Limits & Continuity | Differentiation | Integration | Probability & Statistics | Matrices & Determinants'],
    [`Generated Date: ${new Date().toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short' })}`],
    ['']
  ];

  const masterWs = XLSX.utils.aoa_to_sheet([...titleRows, masterHeaders, ...masterRows]);

  masterWs['!cols'] = [
    { wch: 6 },   // Q.No
    { wch: 12 },  // Question ID
    { wch: 18 },  // Domain
    { wch: 14 },  // Difficulty
    { wch: 65 },  // Question Text
    { wch: 28 },  // Option A
    { wch: 28 },  // Option B
    { wch: 28 },  // Option C
    { wch: 28 },  // Option D
    { wch: 18 },  // Correct Option Key
    { wch: 32 },  // Correct Answer Text
    { wch: 70 },  // Explanation
    { wch: 35 }   // Formula / Context
  ];

  XLSX.utils.book_append_sheet(wb, masterWs, 'All Questions');

  // Sheet 2 to 6: Domain Specific Sheets
  SECTION_METADATA.forEach((sec) => {
    const secQuestions = qBank.filter((q) => q.sectionId === sec.id);
    if (secQuestions.length === 0) return;

    const secHeaders = [
      'Domain Q.No',
      'Overall Q.No',
      'Question ID',
      'Difficulty Level',
      'Question Prompt',
      'Option A',
      'Option B',
      'Option C',
      'Option D',
      'Correct Option Key',
      'Correct Answer Text',
      'Detailed Explanation / Solution',
      'Context / Math Formula'
    ];

    const secRows = secQuestions.map((q, idx) => {
      const globalIdx = qBank.findIndex((item) => item.id === q.id) + 1;
      const optionLetter = String.fromCharCode(65 + q.correctAnswer);
      const optionText = q.options[q.correctAnswer] || '';

      return [
        idx + 1,
        globalIdx,
        q.id,
        q.difficulty.toUpperCase(),
        q.questionText || q.question,
        q.options[0] || '',
        q.options[1] || '',
        q.options[2] || '',
        q.options[3] || '',
        `Option ${optionLetter}`,
        optionText,
        q.explanation || '',
        q.codeSnippet || ''
      ];
    });

    const secTitleRows = [
      [`COIMBATORE INSTITUTE OF TECHNOLOGY - ${sec.title.toUpperCase()} QUESTION BANK`],
      [sec.subtitle],
      [`Total Questions in Domain: ${secQuestions.length}`],
      ['']
    ];

    const secWs = XLSX.utils.aoa_to_sheet([...secTitleRows, secHeaders, ...secRows]);
    secWs['!cols'] = [
      { wch: 12 },  // Domain Q.No
      { wch: 12 },  // Overall Q.No
      { wch: 12 },  // Question ID
      { wch: 14 },  // Difficulty
      { wch: 65 },  // Question Text
      { wch: 28 },  // Option A
      { wch: 28 },  // Option B
      { wch: 28 },  // Option C
      { wch: 28 },  // Option D
      { wch: 18 },  // Correct Option Key
      { wch: 32 },  // Correct Answer Text
      { wch: 70 },  // Explanation
      { wch: 35 }   // Formula / Context
    ];

    const sheetName = sec.title.substring(0, 31);
    XLSX.utils.book_append_sheet(wb, secWs, sheetName);
  });

  const fileName = `CIT_Mathematics_Assessment_Question_Bank_${qBank.length}Qs.xlsx`;
  XLSX.writeFile(wb, fileName);
}

/**
 * Exports all questions across all domains to a CSV file.
 */
export function downloadQuestionBankCsv(customBank?: Question[]) {
  const qBank = customBank && customBank.length > 0 ? customBank : ALL_QUESTIONS;
  const headers = [
    'Q.No',
    'Question ID',
    'Domain',
    'Difficulty',
    'Question Prompt',
    'Option A',
    'Option B',
    'Option C',
    'Option D',
    'Correct Option',
    'Correct Answer Text',
    'Detailed Explanation'
  ];

  const rows = qBank.map((q, idx) => {
    const secMeta = SECTION_METADATA.find((s) => s.id === q.sectionId);
    const domainTitle = secMeta ? secMeta.title : q.sectionId;
    const optionLetter = String.fromCharCode(65 + q.correctAnswer);
    const optionText = q.options[q.correctAnswer] || '';

    const clean = (str: string) => `"${(str || '').replace(/"/g, '""')}"`;

    return [
      idx + 1,
      clean(q.id),
      clean(domainTitle),
      clean(q.difficulty.toUpperCase()),
      clean(q.questionText || q.question),
      clean(q.options[0]),
      clean(q.options[1]),
      clean(q.options[2]),
      clean(q.options[3]),
      clean(`Option ${optionLetter}`),
      clean(optionText),
      clean(q.explanation)
    ];
  });

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `CIT_Mathematics_Assessment_Question_Bank_${qBank.length}Qs.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Extracts a ZIP archive containing individual PDF performance reports for any provided student submissions.
 * Includes a Master Summary Index inside the ZIP for convenient reference.
 */
export async function extractIndividualPdfsZip(
  rawSubmissions: SavedSubmission[],
  contextTitle: string = 'All_Students',
  onProgress?: (current: number, total: number, studentName: string) => void
) {
  const submissions = normalizeSubmissionsList(rawSubmissions);
  if (!submissions || submissions.length === 0) {
    throw new Error('No student assessment records found to extract into ZIP.');
  }

  const JSZipModule = await import('jszip');
  const JSZip = (JSZipModule as any).default || JSZipModule;
  const zip = new JSZip();

  const cleanContext = (contextTitle || 'All_Students').replace(/[^a-zA-Z0-9]/g, '_');
  const dateStamp = formatDateDisplay(new Date()).replace(/\//g, '-');
  const folderName = `CIT_Individual_PDF_Reports_${cleanContext}_${dateStamp}`;
  const folder = zip.folder(folderName);

  let successCount = 0;
  const summaryRows: string[] = [
    'COIMBATORE INSTITUTE OF TECHNOLOGY - INDIVIDUAL PDF REPORTS ROSTER',
    `Context: ${contextTitle} | Export Date: ${formatDateDisplay(new Date())} | Total Records: ${submissions.length}`,
    '--------------------------------------------------------------------------------------------------',
    'S.No | Register Number | Student Name | Department | Score (/50) | Percentage | Grade | Assessment Date',
    '--------------------------------------------------------------------------------------------------'
  ];

  for (let i = 0; i < submissions.length; i++) {
    const sub = submissions[i];
    const studentName = sub.student?.name || `Student ${i + 1}`;
    const regNo = sub.student?.registerNo || `USER_${i + 1}`;
    const dept = sub.student?.department || 'General';

    if (onProgress) {
      onProgress(i + 1, submissions.length, studentName);
    }

    try {
      if (sub.report) {
        const doc = await buildIndividualStudentPdfDoc(sub.report);
        const pdfArrayBuffer = doc.output('arraybuffer');
        const safeReg = regNo.replace(/[^a-zA-Z0-9]/g, '_');
        const safeName = studentName.replace(/[^a-zA-Z0-9]/g, '_');
        const fileName = `${String(i + 1).padStart(3, '0')}_${safeReg}_${safeName}_Report.pdf`;
        folder?.file(fileName, pdfArrayBuffer);
        successCount++;

        const gradeInfo = calculateGrade(sub.report.overallPercentage || 0);
        summaryRows.push(
          `${String(i + 1).padStart(3, '0')} | ${regNo} | ${studentName} | ${dept} | ${sub.report.overallScore || 0}/50 | ${sub.report.overallPercentage || 0}% | Grade ${gradeInfo.grade} | ${sub.submittedAt || sub.report.testTimestamp || 'N/A'}`
        );
      }
    } catch (docErr) {
      console.warn(`Failed to generate PDF for ${studentName} (${regNo}):`, docErr);
    }
  }

  if (successCount === 0) {
    throw new Error('Failed to generate individual PDF documents for the provided submissions.');
  }

  // Add Master Summary text index inside the ZIP archive
  folder?.file('000_MASTER_INDEX_ROSTER.txt', summaryRows.join('\n'));

  const blob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 }
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${folderName}.zip`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  return successCount;
}

/**
 * Extracts a ZIP archive containing individual Excel performance reports for any provided student submissions.
 */
export async function extractIndividualExcelZip(
  rawSubmissions: SavedSubmission[],
  contextTitle: string = 'All_Students',
  onProgress?: (current: number, total: number, studentName: string) => void
) {
  const submissions = normalizeSubmissionsList(rawSubmissions);
  if (!submissions || submissions.length === 0) {
    throw new Error('No student assessment records found to extract into ZIP.');
  }

  const XLSX = await import('xlsx');
  const JSZipModule = await import('jszip');
  const JSZip = (JSZipModule as any).default || JSZipModule;
  const zip = new JSZip();

  const cleanContext = (contextTitle || 'All_Students').replace(/[^a-zA-Z0-9]/g, '_');
  const dateStamp = formatDateDisplay(new Date()).replace(/\//g, '-');
  const folderName = `CIT_Individual_Excel_Reports_${cleanContext}_${dateStamp}`;
  const folder = zip.folder(folderName);

  let successCount = 0;
  const summaryRows: string[] = [
    'COIMBATORE INSTITUTE OF TECHNOLOGY - INDIVIDUAL EXCEL REPORTS ROSTER',
    `Context: ${contextTitle} | Export Date: ${formatDateDisplay(new Date())} | Total Records: ${submissions.length}`,
    '--------------------------------------------------------------------------------------------------',
    'S.No | Register Number | Student Name | Department | Score (/50) | Percentage | Grade | Assessment Date',
    '--------------------------------------------------------------------------------------------------'
  ];

  for (let i = 0; i < submissions.length; i++) {
    const sub = submissions[i];
    const studentName = sub.student?.name || `Student ${i + 1}`;
    const regNo = sub.student?.registerNo || `USER_${i + 1}`;
    const dept = sub.student?.department || 'General';

    if (onProgress) {
      onProgress(i + 1, submissions.length, studentName);
    }

    try {
      if (sub.report) {
        const wb = XLSX.utils.book_new();
        const report = sub.report;

        const summaryData = [
          ['COIMBATORE INSTITUTE OF TECHNOLOGY'],
          ['MATHEMATICS COMPETENCY ASSESSMENT REPORT'],
          [''],
          ['Student Name', report.student?.name || studentName],
          ['Register Number', report.student?.registerNo || regNo],
          ['Department', report.student?.department || dept],
          ['Timestamp', report.testTimestamp || sub.submittedAt || 'N/A'],
          ['Overall Score', `${report.overallScore || 0} / ${report.maxScore || 50}`],
          ['Overall Percentage', `${report.overallPercentage || 0}%`],
          ['Grade Secured', `Grade ${calculateGrade(report.overallPercentage || 0).grade} (${calculateGrade(report.overallPercentage || 0).description})`]
        ];
        const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
        XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

        const sectionHeaders = ['Section ID', 'Section Title', 'Total Score', 'Percentage'];
        const sectionRows = report.sectionScores
          ? Object.values(report.sectionScores).map((sec) => [
              sec.sectionId,
              sec.title,
              `${sec.score} / ${sec.total || 10}`,
              `${sec.percentage}%`
            ])
          : [];
        const wsSections = XLSX.utils.aoa_to_sheet([sectionHeaders, ...sectionRows]);
        XLSX.utils.book_append_sheet(wb, wsSections, 'Sectional');

        const itemHeaders = ['Q#', 'Section', 'Difficulty', 'Question Prompt', 'User Choice', 'Correct Option', 'Result'];
        const itemRows = (report.detailedItemAnalysis || []).map((item, idx) => [
          idx + 1,
          (item.sectionId || '').toUpperCase(),
          (item.difficulty || '').toUpperCase(),
          item.questionText || '',
          item.userAnswer !== null && item.userAnswer !== undefined ? `Option ${String.fromCharCode(65 + item.userAnswer)}` : 'Unanswered',
          item.correctAnswer !== null && item.correctAnswer !== undefined ? `Option ${String.fromCharCode(65 + item.correctAnswer)}` : 'N/A',
          item.isCorrect ? 'CORRECT' : 'INCORRECT'
        ]);
        const wsItems = XLSX.utils.aoa_to_sheet([itemHeaders, ...itemRows]);
        XLSX.utils.book_append_sheet(wb, wsItems, '50 Qs Answers');

        const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        const safeReg = regNo.replace(/[^a-zA-Z0-9]/g, '_');
        const safeName = studentName.replace(/[^a-zA-Z0-9]/g, '_');
        const fileName = `${String(i + 1).padStart(3, '0')}_${safeReg}_${safeName}_Report.xlsx`;
        folder?.file(fileName, excelBuffer);
        successCount++;

        const gradeInfo = calculateGrade(report.overallPercentage || 0);
        summaryRows.push(
          `${String(i + 1).padStart(3, '0')} | ${regNo} | ${studentName} | ${dept} | ${report.overallScore || 0}/50 | ${report.overallPercentage || 0}% | Grade ${gradeInfo.grade} | ${sub.submittedAt || report.testTimestamp || 'N/A'}`
        );
      }
    } catch (excelErr) {
      console.warn(`Failed to generate Excel for ${studentName} (${regNo}):`, excelErr);
    }
  }

  if (successCount === 0) {
    throw new Error('Failed to generate individual Excel documents for the provided submissions.');
  }

  folder?.file('000_MASTER_INDEX_ROSTER.txt', summaryRows.join('\n'));

  const blob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 }
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${folderName}.zip`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  return successCount;
}

/**
 * Extracts a ZIP archive containing individual PDF performance reports for all students belonging to the selected department.
 */
export async function extractDepartmentIndividualPdfsZip(
  rawSubmissions: SavedSubmission[],
  deptLabel: string,
  allSubmissions?: SavedSubmission[]
) {
  const submissions = normalizeSubmissionsList(rawSubmissions);
  const normalizedAll = allSubmissions ? normalizeSubmissionsList(allSubmissions) : undefined;
  let targetList = submissions;
  const isAllDept = !deptLabel || deptLabel.toUpperCase() === 'ALL' || deptLabel.toUpperCase().includes('ALL DEPARTMENTS') || deptLabel.toUpperCase() === 'ALL';

  if (!isAllDept && normalizedAll && normalizedAll.length > 0) {
    targetList = normalizedAll.filter((s) => s.student?.department?.trim().toLowerCase() === deptLabel.trim().toLowerCase());
  } else if (!isAllDept && submissions && submissions.length > 0) {
    const matched = submissions.filter((s) => s.student?.department?.trim().toLowerCase() === deptLabel.trim().toLowerCase());
    if (matched.length > 0) targetList = matched;
  }

  if (!targetList || targetList.length === 0) {
    throw new Error(`No student assessment records found for department: ${deptLabel}`);
  }

  return extractIndividualPdfsZip(targetList, `Dept_${deptLabel}`);
}

/**
 * Extracts a ZIP archive containing individual Excel performance reports for all students belonging to the selected department.
 */
export async function extractDepartmentIndividualExcelZip(
  rawSubmissions: SavedSubmission[],
  deptLabel: string,
  allSubmissions?: SavedSubmission[]
) {
  const submissions = normalizeSubmissionsList(rawSubmissions);
  const normalizedAll = allSubmissions ? normalizeSubmissionsList(allSubmissions) : undefined;
  let targetList = submissions;
  const isAllDept = !deptLabel || deptLabel.toUpperCase() === 'ALL' || deptLabel.toUpperCase().includes('ALL DEPARTMENTS') || deptLabel.toUpperCase() === 'ALL';

  if (!isAllDept && normalizedAll && normalizedAll.length > 0) {
    targetList = normalizedAll.filter((s) => s.student?.department?.trim().toLowerCase() === deptLabel.trim().toLowerCase());
  } else if (!isAllDept && submissions && submissions.length > 0) {
    const matched = submissions.filter((s) => s.student?.department?.trim().toLowerCase() === deptLabel.trim().toLowerCase());
    if (matched.length > 0) targetList = matched;
  }

  if (!targetList || targetList.length === 0) {
    throw new Error(`No student assessment records found for department: ${deptLabel}`);
  }

  return extractIndividualExcelZip(targetList, `Dept_${deptLabel}`);
}

/**
 * Extracts a ZIP archive containing individual PDF performance reports for all students on a selected date.
 */
export async function extractDatewiseIndividualPdfsZip(
  submissions: SavedSubmission[],
  dateLabel: string
) {
  if (!submissions || submissions.length === 0) {
    throw new Error(`No student assessment records found for date: ${dateLabel}`);
  }
  return extractIndividualPdfsZip(submissions, `Date_${dateLabel}`);
}

/**
 * Extracts a ZIP archive containing individual Excel performance reports for all students on a selected date.
 */
export async function extractDatewiseIndividualExcelZip(
  submissions: SavedSubmission[],
  dateLabel: string
) {
  if (!submissions || submissions.length === 0) {
    throw new Error(`No student assessment records found for date: ${dateLabel}`);
  }
  return extractIndividualExcelZip(submissions, `Date_${dateLabel}`);
}

import {
  computePercentileRank,
  formatPercentileOrdinal,
  calculateRelativeDomainGrade,
  calculateRelativeOverallGrade,
  computeAllDomainMarkLimits,
  computeDomainMarkLimits,
  RELATIVE_GRADING_DISCLAIMER
} from './relativeGradingUtils';

export {
  computePercentileRank,
  formatPercentileOrdinal,
  calculateRelativeDomainGrade,
  calculateRelativeOverallGrade,
  computeAllDomainMarkLimits,
  computeDomainMarkLimits,
  RELATIVE_GRADING_DISCLAIMER
};

/**
 * Calculates academic letter grade based on CIT Norm-Referenced (Relative) criteria:
 * - Grade A: College-wide Percentile >= 75% (First 25% of the college)
 * - Grade B: College-wide Percentile 35% to 74% (Next 40% of the college)
 * - Grade C: College-wide Percentile < 35% (Last 35% of the college)
 * Ties are assigned identical fractional average ranks so ties land consistently on one side of a cutoff.
 */
export function calculateGrade(percentageOrPercentile: number, allCollegeScores?: number[]): {
  grade: 'A' | 'B' | 'C';
  gradeLabel: string;
  title: string;
  color: string;
  gpa: number;
  description: string;
  percentile: number;
} {
  let percentile = percentageOrPercentile;
  if (allCollegeScores && allCollegeScores.length > 0) {
    percentile = computePercentileRank(percentageOrPercentile, allCollegeScores);
  }

  if (percentile >= 75) {
    return {
      grade: 'A',
      gradeLabel: 'Grade A (First 25% College-wide)',
      title: 'First 25% College Cohort',
      color: '#10B981',
      gpa: 9.0,
      description: 'Norm-Referenced: Percentile >= 75th (First 25% College-wide)',
      percentile: Math.round(percentile)
    };
  }
  if (percentile >= 35) {
    return {
      grade: 'B',
      gradeLabel: 'Grade B (Next 40% College-wide)',
      title: 'Middle 40% College Cohort',
      color: '#3B82F6',
      gpa: 7.0,
      description: 'Norm-Referenced: Percentile 35th–74th (Next 40% College-wide)',
      percentile: Math.round(percentile)
    };
  }
  return {
    grade: 'C',
    gradeLabel: 'Grade C (Last 35% College-wide)',
    title: 'Last 35% College Cohort',
    color: '#EA580C',
    gpa: 5.0,
    description: 'Norm-Referenced: Percentile < 35th (Last 35% College-wide)',
    percentile: Math.round(percentile)
  };
}

/**
 * Calculates domain letter grade based on college-wide relative percentile:
 * - Grade A: Percentile >= 75 (first 25% of the college)
 * - Grade B: Percentile >= 35 and < 75 (next 40%)
 * - Grade C: Percentile < 35 (last 35%)
 */
export function calculateDomainGrade(
  score: number,
  maxScore: number = 10,
  allCollegeScores?: number[]
): {
  grade: 'A' | 'B' | 'C';
  percentage: number;
  gradeLabel: string;
  color: string;
  percentile: number;
} {
  let percentile = maxScore > 0 ? (score / maxScore) * 100 : 0;
  if (allCollegeScores && allCollegeScores.length > 0) {
    percentile = computePercentileRank(score, allCollegeScores);
  }

  if (percentile >= 75) {
    return {
      grade: 'A',
      percentage: Math.round((score / (maxScore || 10)) * 100),
      gradeLabel: 'Grade A (First 25% College-wide)',
      color: '#10B981',
      percentile: Math.round(percentile)
    };
  }
  if (percentile >= 35) {
    return {
      grade: 'B',
      percentage: Math.round((score / (maxScore || 10)) * 100),
      gradeLabel: 'Grade B (Next 40% College-wide)',
      color: '#3B82F6',
      percentile: Math.round(percentile)
    };
  }
  return {
    grade: 'C',
    percentage: Math.round((score / (maxScore || 10)) * 100),
    gradeLabel: 'Grade C (Last 35% College-wide)',
    color: '#EA580C',
    percentile: Math.round(percentile)
  };
}

/**
 * Formats duration in seconds to human-readable string (e.g. 24m 18s).
 */
export function formatDuration(seconds?: number): string {
  if (!seconds || seconds <= 0) return '0s';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s}s`;
  return `${m}m ${s}s`;
}

/**
 * Extracts and formats the complete SWOT analysis for a candidate submission.
 */
export function getStudentSwotAnalysis(rawSub: SavedSubmission): {
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
  threats: string[];
} {
  const sub = normalizeSubmissionRecord(rawSub);
  const fb = sub.report?.studentFeedback;
  const detailed = sub.report?.detailedItemAnalysis || [];
  const unattempted = detailed.filter((q) => q.userAnswer === null || q.userAnswer === undefined).length;
  const hardAcc = sub.report?.difficultyBreakdown?.hard?.accuracy ?? 0;
  const medAcc = sub.report?.difficultyBreakdown?.medium?.accuracy ?? 0;

  const strengths = (fb?.strengths && fb.strengths.length > 0)
    ? fb.strengths
    : [`Proficiency in Core Mathematics (${sub.report?.overallScore || 0}/50 marks secured, ${sub.report?.overallPercentage || 0}%)`];

  const weaknesses = (fb?.weaknesses && fb.weaknesses.length > 0)
    ? fb.weaknesses
    : ['Needs targeted practice on complex multi-step application items'];

  const opportunities = (fb?.opportunities && fb.opportunities.length > 0)
    ? fb.opportunities
    : (fb?.suggestions && fb.suggestions.length > 0)
      ? fb.suggestions
      : [
          'Leverage strong foundational concepts to excel in advanced STEM electives',
          'Practice with timed mock assessments to optimize question transition speed'
        ];

  const threats = (fb?.threats && fb.threats.length > 0)
    ? fb.threats
    : (() => {
        const t: string[] = [];
        if (unattempted > 0) t.push(`Pacing Risk: ${unattempted} questions unattempted under timed exam conditions.`);
        if (hardAcc < 50) t.push(`Level 3 Vulnerability: Low accuracy (${hardAcc}%) on advanced synthesis questions.`);
        if (medAcc < 50) t.push(`Intermediate Slip: ${medAcc}% accuracy on medium difficulty problems.`);
        if (t.length === 0) {
          t.push('Avoidable Slips: Maintain double-checking discipline to eliminate calculation mistakes.');
          t.push('Time Pressure: Maintain steady pacing across all sections.');
        }
        return t;
      })();

  return { strengths, weaknesses, opportunities, threats };
}

/**
 * Extracts comprehensive domain-wise grade analysis for each student.
 */
export function extractStudentDomainGrades(rawSub: SavedSubmission) {
  const sub = normalizeSubmissionRecord(rawSub);
  const scores = sub.report?.sectionScores || ({} as any);

  const getSec = (key1: string, key2: string) => {
    return scores[key1] || scores[key2] || { score: 0, total: 10, percentage: 0 };
  };

  const calc = getSec('calculus', 'Calculus');
  const prob = getSec('probability', 'Probability');
  const num = getSec('numberSystem', 'number_system');
  const trig = getSec('trigonometry', 'Trigonometry');
  const stat = getSec('statistics', 'Statistics');

  const calcGrade = calculateDomainGrade(calc.score, calc.total || 10);
  const probGrade = calculateDomainGrade(prob.score, prob.total || 10);
  const numGrade = calculateDomainGrade(num.score, num.total || 10);
  const trigGrade = calculateDomainGrade(trig.score, trig.total || 10);
  const statGrade = calculateDomainGrade(stat.score, stat.total || 10);

  const domainList = [
    { id: 'calculus', name: 'Limits & Continuity', score: calc.score, total: calc.total || 10, pct: calc.percentage, ...calcGrade },
    { id: 'probability', name: 'Differentiation', score: prob.score, total: prob.total || 10, pct: prob.percentage, ...probGrade },
    { id: 'numberSystem', name: 'Integration', score: num.score, total: num.total || 10, pct: num.percentage, ...numGrade },
    { id: 'trigonometry', name: 'Probability & Statistics', score: trig.score, total: trig.total || 10, pct: trig.percentage, ...trigGrade },
    { id: 'statistics', name: 'Matrices & Determinants', score: stat.score, total: stat.total || 10, pct: stat.percentage, ...statGrade }
  ];

  const sorted = [...domainList].sort((a, b) => b.pct - a.pct);
  const dominantDomain = sorted[0] ? `${sorted[0].name} (${sorted[0].score}/${sorted[0].total} - Grade ${sorted[0].grade})` : 'N/A';
  const growthDomain = sorted[sorted.length - 1] ? `${sorted[sorted.length - 1].name} (${sorted[sorted.length - 1].score}/${sorted[sorted.length - 1].total} - Grade ${sorted[sorted.length - 1].grade})` : 'N/A';

  return {
    calculus: domainList[0],
    probability: domainList[1],
    numberSystem: domainList[2],
    trigonometry: domainList[3],
    statistics: domainList[4],
    domainList,
    dominantDomain,
    growthDomain
  };
}

/**
 * Comprehensive Bulk Excel Export for all student submissions.
 * Generates an all-inclusive workbook containing:
 * 1. Complete Master Roster (Register Numbers, Names, Depts, Marks /50, %, Letter Grades (A/B/C), SWOT S/W/O/T, Grade Benchmarks, Indices, Timestamps, Duration, Security Status)
 * 2. Domainwise Grade Analysis (Limits & Continuity, Differentiation, Integration, Probability & Statistics, Matrices & Determinants scores + % + Grades A/B/C)
 * 3. Student SWOT Diagnostic Matrix
 * 4. Difficulty Mastery Breakdown
 * 5. Departmental Grade & Domain Matrix
 */
export async function bulkExportAllSubmissionsToExcel(rawSubmissions: SavedSubmission[]) {
  const submissions = normalizeSubmissionsList(rawSubmissions);
  const XLSX = await import('xlsx');
  const wb = XLSX.utils.book_new();

  // -------------------------------------------------------------
  // SHEET 1: Complete Master Roster
  // -------------------------------------------------------------
  const titleRows = [
    ['COIMBATORE INSTITUTE OF TECHNOLOGY (AUTONOMOUS)'],
    ['PG MATHEMATICS COGNITIVE COMPETENCY ASSESSMENT - COMPLETE MASTER ROSTER'],
    [`Database Collection: submissions | Total Evaluated Records: ${submissions.length}`],
    [`Export Date & Time: ${new Date().toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'medium' })}`],
    ['Letter Grade Standards: Grade A (Above 80% / 40-50 Marks) | Grade B (50%-80% / 25-39 Marks) | Grade C (Below 50% / 0-24 Marks)'],
    ['']
  ];

  const masterHeaders = [
    'S.No',
    'Register Number',
    'Student Name',
    'Department',
    'Marks Secured (/50)',
    'Percentage (%)',
    'Grade Secured',
    'Grade Title & Description',
    'Grade Benchmark Range',
    'Logic Index (/100)',
    'Speed-Accuracy Factor',
    'Assessment Timestamp',
    'Duration Taken',
    'Duration (Seconds)',
    'Security / Lockout Status',
    'Strengths (SWOT - S)',
    'Weaknesses (SWOT - W)',
    'Opportunities (SWOT - O)',
    'Threats (SWOT - T)',
    'Correct Answers',
    'Wrong Answers',
    'Skipped Questions',
    'Submission ID'
  ];

  const masterRows = submissions.map((sub, idx) => {
    const gradeObj = sub.report ? calculateGrade(sub.report.overallPercentage) : null;
    const swot = getStudentSwotAnalysis(sub);

    // Count correct, wrong, skipped
    const detailed = sub.report?.detailedItemAnalysis || [];
    const correctCount = detailed.filter((r) => r.isCorrect).length;
    const skippedCount = detailed.filter((r) => r.userAnswer === null || r.userAnswer === undefined).length;
    const wrongCount = detailed.filter((r) => !r.isCorrect && r.userAnswer !== null && r.userAnswer !== undefined).length;

    return [
      idx + 1,
      sub.student?.registerNo || 'N/A',
      sub.student?.name || 'N/A',
      sub.student?.department || 'N/A',
      sub.report ? `${sub.report.overallScore} / ${sub.report.maxScore || 50}` : 'N/A',
      sub.report ? `${sub.report.overallPercentage}%` : 'N/A',
      gradeObj ? `Grade ${gradeObj.grade}` : 'N/A',
      gradeObj ? `${gradeObj.title} (${gradeObj.description})` : 'N/A',
      gradeObj ? gradeObj.description : 'N/A',
      sub.report?.cognitionLevel?.logicPurity ?? 'N/A',
      sub.report?.cognitionLevel?.speedAccuracyFactor ?? 'N/A',
      sub.submittedAt || sub.report?.testTimestamp || 'N/A',
      formatDuration(sub.report?.totalDurationSeconds),
      sub.report?.totalDurationSeconds ?? 'N/A',
      sub.isLockedOut ? 'LOCKED OUT (Security Violation)' : 'NORMAL (Compliant Submission)',
      swot.strengths.join(' | '),
      swot.weaknesses.join(' | '),
      swot.opportunities.join(' | '),
      swot.threats.join(' | '),
      sub.report ? correctCount : 'N/A',
      sub.report ? wrongCount : 'N/A',
      sub.report ? skippedCount : 'N/A',
      sub.id
    ];
  });

  const masterWs = XLSX.utils.aoa_to_sheet([...titleRows, masterHeaders, ...masterRows]);
  masterWs['!cols'] = [
    { wch: 6 },  // S.No
    { wch: 18 }, // Register Number
    { wch: 25 }, // Name
    { wch: 35 }, // Department
    { wch: 18 }, // Marks Secured
    { wch: 14 }, // Percentage
    { wch: 14 }, // Grade Secured
    { wch: 32 }, // Grade Title
    { wch: 24 }, // Grade Benchmark Range
    { wch: 18 }, // Logic Index
    { wch: 20 }, // Speed-Accuracy
    { wch: 26 }, // Assessment Timestamp
    { wch: 16 }, // Duration Taken
    { wch: 18 }, // Duration Seconds
    { wch: 30 }, // Security Status
    { wch: 45 }, // Strengths
    { wch: 45 }, // Weaknesses
    { wch: 45 }, // Opportunities
    { wch: 45 }, // Threats
    { wch: 14 }, // Correct
    { wch: 14 }, // Wrong
    { wch: 14 }, // Skipped
    { wch: 28 }  // Submission ID
  ];

  XLSX.utils.book_append_sheet(wb, masterWs, 'Master Roster');

  // -------------------------------------------------------------
  // SHEET 2: Domainwise Grade Analysis
  // -------------------------------------------------------------
  const domainHeaders = [
    'S.No',
    'Register Number',
    'Student Name',
    'Department',
    'Limits & Continuity Score (/10)',
    'Limits & Continuity (%)',
    'Limits & Continuity Grade',
    'Differentiation Score (/10)',
    'Differentiation (%)',
    'Differentiation Grade',
    'Integration Score (/10)',
    'Integration (%)',
    'Integration Grade',
    'Probability & Statistics Score (/10)',
    'Probability & Statistics (%)',
    'Probability & Statistics Grade',
    'Matrices & Determinants Score (/10)',
    'Matrices & Determinants (%)',
    'Matrices & Determinants Grade',
    'Total Score (/50)',
    'Overall (%)',
    'Overall Letter Grade',
    'Dominant / Highest Domain',
    'Growth / Focus Area Domain'
  ];

  const domainRows = submissions.map((sub, idx) => {
    const d = extractStudentDomainGrades(sub);
    const overallPct = sub.report?.overallPercentage || 0;
    const overallGrade = calculateGrade(overallPct);

    return [
      idx + 1,
      sub.student?.registerNo || 'N/A',
      sub.student?.name || 'N/A',
      sub.student?.department || 'N/A',
      `${d.calculus.score}/10`,
      `${d.calculus.pct}%`,
      `Grade ${d.calculus.grade}`,
      `${d.probability.score}/10`,
      `${d.probability.pct}%`,
      `Grade ${d.probability.grade}`,
      `${d.numberSystem.score}/10`,
      `${d.numberSystem.pct}%`,
      `Grade ${d.numberSystem.grade}`,
      `${d.trigonometry.score}/10`,
      `${d.trigonometry.pct}%`,
      `Grade ${d.trigonometry.grade}`,
      `${d.statistics.score}/10`,
      `${d.statistics.pct}%`,
      `Grade ${d.statistics.grade}`,
      sub.report ? `${sub.report.overallScore}/50` : 'N/A',
      `${overallPct}%`,
      `Grade ${overallGrade.grade}`,
      d.dominantDomain,
      d.growthDomain
    ];
  });

  const domainWs = XLSX.utils.aoa_to_sheet([
    ['COIMBATORE INSTITUTE OF TECHNOLOGY (AUTONOMOUS)'],
    ['INDIVIDUAL CANDIDATE DOMAINWISE GRADE ANALYSIS'],
    ['Domain Letter Grading: Grade A (>=80% / 8-10 Marks) | Grade B (50%-79% / 5-7 Marks) | Grade C (<50% / 0-4 Marks)'],
    [`Total Students Analyzed: ${submissions.length}`],
    [''],
    domainHeaders,
    ...domainRows
  ]);
  domainWs['!cols'] = [
    { wch: 6 },  { wch: 18 }, { wch: 25 }, { wch: 35 },
    { wch: 20 }, { wch: 14 }, { wch: 16 },
    { wch: 20 }, { wch: 14 }, { wch: 16 },
    { wch: 22 }, { wch: 16 }, { wch: 18 },
    { wch: 22 }, { wch: 16 }, { wch: 18 },
    { wch: 20 }, { wch: 14 }, { wch: 16 },
    { wch: 18 }, { wch: 14 }, { wch: 18 },
    { wch: 32 }, { wch: 32 }
  ];

  XLSX.utils.book_append_sheet(wb, domainWs, 'Domain Grade Analysis');

  // -------------------------------------------------------------
  // SHEET 3: Student SWOT Diagnostic Matrix
  // -------------------------------------------------------------
  const swotHeaders = [
    'S.No',
    'Register Number',
    'Student Name',
    'Department',
    'Overall Score (/50)',
    'Percentage (%)',
    'Letter Grade',
    'Grade Benchmark Range',
    'Strengths (S)',
    'Weaknesses (W)',
    'Opportunities (O)',
    'Threats (T)',
    'Actionable Cognitive Recommendations'
  ];

  const swotRows = submissions.map((sub, idx) => {
    const swot = getStudentSwotAnalysis(sub);
    const overallPct = sub.report?.overallPercentage || 0;
    const gradeObj = calculateGrade(overallPct);
    const suggestions = sub.report?.studentFeedback?.suggestions || [];

    return [
      idx + 1,
      sub.student?.registerNo || 'N/A',
      sub.student?.name || 'N/A',
      sub.student?.department || 'N/A',
      sub.report ? `${sub.report.overallScore}/50` : 'N/A',
      `${overallPct}%`,
      `Grade ${gradeObj.grade}`,
      gradeObj.description,
      swot.strengths.join('\n• '),
      swot.weaknesses.join('\n• '),
      swot.opportunities.join('\n• '),
      swot.threats.join('\n• '),
      suggestions.join('\n• ')
    ];
  });

  const swotWs = XLSX.utils.aoa_to_sheet([
    ['COIMBATORE INSTITUTE OF TECHNOLOGY (AUTONOMOUS)'],
    ['STUDENT SWOT ANALYSIS & COGNITIVE DIAGNOSTIC MATRIX'],
    ['Comprehensive evaluation of Strengths, Weaknesses, Opportunities, and Threats for every student'],
    [''],
    swotHeaders,
    ...swotRows
  ]);
  swotWs['!cols'] = [
    { wch: 6 },  { wch: 18 }, { wch: 25 }, { wch: 35 },
    { wch: 18 }, { wch: 14 }, { wch: 14 }, { wch: 24 },
    { wch: 50 }, { wch: 50 }, { wch: 50 }, { wch: 50 },
    { wch: 55 }
  ];

  XLSX.utils.book_append_sheet(wb, swotWs, 'SWOT Diagnostic Matrix');

  // -------------------------------------------------------------
  // SHEET 4: Difficulty Mastery Breakdown
  // -------------------------------------------------------------
  const diffHeaders = [
    'S.No',
    'Register Number',
    'Student Name',
    'Department',
    'Level 1 Score (/20 - 40%)',
    'Level 1 Accuracy (%)',
    'Level 2 Score (/15 - 30%)',
    'Level 2 Accuracy (%)',
    'Level 3 Score (/15 - 30%)',
    'Level 3 Accuracy (%)',
    'Total Score (/50)',
    'Letter Grade'
  ];

  const diffRows = submissions.map((sub, idx) => {
    const diff = sub.report?.difficultyBreakdown;
    const gradeObj = sub.report ? calculateGrade(sub.report.overallPercentage) : null;
    return [
      idx + 1,
      sub.student?.registerNo || 'N/A',
      sub.student?.name || 'N/A',
      sub.student?.department || 'N/A',
      diff?.easy ? `${diff.easy.score}/${diff.easy.total}` : 'N/A',
      diff?.easy ? `${diff.easy.accuracy}%` : 'N/A',
      diff?.medium ? `${diff.medium.score}/${diff.medium.total}` : 'N/A',
      diff?.medium ? `${diff.medium.accuracy}%` : 'N/A',
      diff?.hard ? `${diff.hard.score}/${diff.hard.total}` : 'N/A',
      diff?.hard ? `${diff.hard.accuracy}%` : 'N/A',
      sub.report ? `${sub.report.overallScore}/50` : 'N/A',
      gradeObj ? `Grade ${gradeObj.grade}` : 'N/A'
    ];
  });

  const diffWs = XLSX.utils.aoa_to_sheet([
    ['CIT COGNITIVE MATHEMATICS ASSESSMENT - DIFFICULTY MASTERY BREAKDOWN'],
    ['Level 1 (Foundation): 20 Qs | Level 2 (Application): 15 Qs | Level 3 (Advanced Synthesis): 15 Qs'],
    [''],
    diffHeaders,
    ...diffRows
  ]);
  diffWs['!cols'] = [
    { wch: 6 },  { wch: 18 }, { wch: 25 }, { wch: 35 },
    { wch: 24 }, { wch: 20 }, { wch: 24 }, { wch: 20 },
    { wch: 24 }, { wch: 20 }, { wch: 16 }, { wch: 14 }
  ];

  XLSX.utils.book_append_sheet(wb, diffWs, 'Difficulty Mastery');

  // -------------------------------------------------------------
  // SHEET 5: Departmental Grade & Domain Summary Matrix
  // -------------------------------------------------------------
  const depts = Array.from(new Set(submissions.map((s) => s.student?.department || 'Unspecified')));
  const deptMatrixHeaders = [
    'Department Name',
    'Total Students',
    'Grade A (Above 80%)',
    'Grade A (%)',
    'Grade B (50%-80%)',
    'Grade B (%)',
    'Grade C (Below 50%)',
    'Grade C (%)',
    'Pass Rate (%)',
    'Average Score (/50)',
    'Avg Limits & Continuity (/10)',
    'Avg Differentiation (/10)',
    'Avg Integration (/10)',
    'Avg Probability & Statistics (/10)',
    'Avg Matrices & Determinants (/10)'
  ];

  const deptMatrixRows = depts.map((dName) => {
    const deptSubs = submissions.filter((s) => (s.student?.department || 'Unspecified') === dName);
    const total = deptSubs.length;
    let gradeACount = 0;
    let gradeBCount = 0;
    let gradeCCount = 0;
    let scoreSum = 0;
    let calcSum = 0, probSum = 0, numSum = 0, trigSum = 0, statSum = 0;

    deptSubs.forEach((s) => {
      const pct = s.report?.overallPercentage || 0;
      scoreSum += s.report?.overallScore || 0;
      const g = calculateGrade(pct);
      if (g.grade === 'A') gradeACount++;
      else if (g.grade === 'B') gradeBCount++;
      else gradeCCount++;

      const dg = extractStudentDomainGrades(s);
      calcSum += dg.calculus.score;
      probSum += dg.probability.score;
      numSum += dg.numberSystem.score;
      trigSum += dg.trigonometry.score;
      statSum += dg.statistics.score;
    });

    const passRate = total > 0 ? (((gradeACount + gradeBCount) / total) * 100).toFixed(1) : '0.0';
    const avgScore = total > 0 ? (scoreSum / total).toFixed(2) : '0.0';
    const avgCalc = total > 0 ? (calcSum / total).toFixed(2) : '0.0';
    const avgProb = total > 0 ? (probSum / total).toFixed(2) : '0.0';
    const avgNum = total > 0 ? (numSum / total).toFixed(2) : '0.0';
    const avgTrig = total > 0 ? (trigSum / total).toFixed(2) : '0.0';
    const avgStat = total > 0 ? (statSum / total).toFixed(2) : '0.0';

    return [
      dName,
      total,
      gradeACount,
      total ? `${Math.round((gradeACount / total) * 100)}%` : '0%',
      gradeBCount,
      total ? `${Math.round((gradeBCount / total) * 100)}%` : '0%',
      gradeCCount,
      total ? `${Math.round((gradeCCount / total) * 100)}%` : '0%',
      `${passRate}%`,
      avgScore,
      avgCalc,
      avgProb,
      avgNum,
      avgTrig,
      avgStat
    ];
  });

  const deptWs = XLSX.utils.aoa_to_sheet([
    ['COIMBATORE INSTITUTE OF TECHNOLOGY (AUTONOMOUS)'],
    ['DEPARTMENTWISE GRADE DISTRIBUTION & DOMAIN PROFICIENCY SUMMARY'],
    ['Grade A: Above 80% | Grade B: 50% - 80% | Grade C: Below 50%'],
    [''],
    deptMatrixHeaders,
    ...deptMatrixRows
  ]);
  deptWs['!cols'] = [
    { wch: 35 }, { wch: 14 }, { wch: 20 }, { wch: 14 }, { wch: 20 }, { wch: 14 }, { wch: 20 }, { wch: 14 },
    { wch: 16 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 20 }, { wch: 20 }, { wch: 18 }
  ];

  XLSX.utils.book_append_sheet(wb, deptWs, 'Department Grade Matrix');

  const dateStamp = new Date().toISOString().slice(0, 10);
  const fileName = `CIT_Complete_Master_Roster_${submissions.length}_Students_${dateStamp}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

/**
 * Generates a high-fidelity PDF report containing Complete Master Student Evaluation Roster.
 */
export async function downloadCompleteMasterRosterPdf(
  rawSubmissions: SavedSubmission[],
  deptLabel: string = 'ALL',
  allSubmissions?: SavedSubmission[]
) {
  const submissions = normalizeSubmissionsList(rawSubmissions);
  const { default: jsPDF } = await import('jspdf');
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  const filteredSubs = deptLabel === 'ALL'
    ? submissions
    : submissions.filter((s) => (s.student.department || 'Unspecified') === deptLabel);

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 10;
  let y = 14;

  // Header Banner
  doc.setFillColor(11, 19, 43); // #0B132B
  doc.rect(0, 0, pageWidth, 42, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('COIMBATORE INSTITUTE OF TECHNOLOGY (AUTONOMOUS)', margin, 13);

  doc.setFontSize(11);
  doc.setTextColor(0, 229, 255);
  doc.text('COMPLETE MASTER STUDENT EVALUATION & COGNITIVE ROSTER', margin, 20);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184);
  doc.text(`Department: ${deptLabel} | Total Students: ${filteredSubs.length} | Generated: ${new Date().toLocaleString()}`, margin, 30);
  doc.text('Grading Scale: Grade A (Above 80% / 40-50 Marks) | Grade B (50%-80% / 25-39 Marks) | Grade C (Below 50% / 0-24 Marks)', margin, 36);

  y = 48;

  const printHeaders = (currY: number) => {
    doc.setFillColor(30, 41, 59);
    doc.rect(margin, currY, pageWidth - 2 * margin, 7, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(255, 255, 255);

    doc.text('S.No', margin + 2, currY + 4.8);
    doc.text('Register Number', margin + 10, currY + 4.8);
    doc.text('Student Name', margin + 35, currY + 4.8);
    doc.text('Department', margin + 85, currY + 4.8);
    doc.text('Marks (/50)', margin + 145, currY + 4.8);
    doc.text('Grade', margin + 172, currY + 4.8);
    doc.text('Grade Band', margin + 192, currY + 4.8);
    doc.text('Analytical', margin + 230, currY + 4.8);
    doc.text('Logic', margin + 248, currY + 4.8);
    doc.text('Duration', margin + 262, currY + 4.8);
  };

  printHeaders(y);
  y += 7;

  const sortedSubs = [...filteredSubs].sort((a, b) => {
    const deptComp = (a.student.department || '').localeCompare(b.student.department || '');
    if (deptComp !== 0) return deptComp;
    return (b.report?.overallPercentage || 0) - (a.report?.overallPercentage || 0);
  });

  sortedSubs.forEach((sub, idx) => {
    if (y > pageHeight - 14) {
      doc.addPage();
      y = 14;
      printHeaders(y);
      y += 7;
    }

    if (idx % 2 === 0) {
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, y, pageWidth - 2 * margin, 5.5, 'F');
    }

    const pct = sub.report?.overallPercentage || 0;
    const gradeObj = calculateGrade(pct);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(15, 23, 42);

    doc.text(String(idx + 1), margin + 2, y + 3.8);
    doc.setFont('helvetica', 'bold');
    doc.text(sub.student.registerNo || 'N/A', margin + 10, y + 3.8);
    doc.setFont('helvetica', 'normal');

    const truncName = sub.student.name.length > 24 ? sub.student.name.substring(0, 22) + '..' : sub.student.name;
    doc.text(truncName, margin + 35, y + 3.8);

    const truncDept = sub.student.department.length > 28 ? sub.student.department.substring(0, 26) + '..' : sub.student.department;
    doc.text(truncDept, margin + 85, y + 3.8);

    doc.setFont('helvetica', 'bold');
    doc.text(`${sub.report?.overallScore || 0}/50 (${pct}%)`, margin + 145, y + 3.8);

    // Grade coloring
    if (gradeObj.grade === 'A') doc.setTextColor(16, 185, 129);
    else if (gradeObj.grade === 'B') doc.setTextColor(37, 99, 235);
    else doc.setTextColor(220, 38, 38);

    doc.text(`Grade ${gradeObj.grade}`, margin + 172, y + 3.8);

    doc.setTextColor(51, 65, 85);
    doc.setFont('helvetica', 'normal');
    doc.text(gradeObj.description, margin + 192, y + 3.8);

    doc.text(`${sub.report?.cognitionLevel?.analyticalIndex ?? '-'}`, margin + 230, y + 3.8);
    doc.text(`${sub.report?.cognitionLevel?.logicPurity ?? '-'}`, margin + 248, y + 3.8);
    doc.text(formatDuration(sub.report?.totalDurationSeconds), margin + 262, y + 3.8);

    y += 5.5;
  });

  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(`Coimbatore Institute of Technology (Autonomous) | Master Roster | Page ${i} of ${totalPages}`, margin, pageHeight - 5);
  }

  const cleanDeptLabel = deptLabel.replace(/[^a-zA-Z0-9]/g, '_');
  doc.save(`CIT_Complete_Master_Roster_${cleanDeptLabel}.pdf`);
}

/**
 * Generates a PDF report containing Domainwise Grade Analysis for all students.
 */
export async function downloadDomainwiseGradeAnalysisPdf(
  rawSubmissions: SavedSubmission[],
  deptLabel: string = 'ALL',
  allSubmissions?: SavedSubmission[]
) {
  const submissions = normalizeSubmissionsList(rawSubmissions);
  const { default: jsPDF } = await import('jspdf');
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  const filteredSubs = deptLabel === 'ALL'
    ? submissions
    : submissions.filter((s) => (s.student.department || 'Unspecified') === deptLabel);

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 10;
  let y = 14;

  // Header Banner
  doc.setFillColor(11, 19, 43); // #0B132B
  doc.rect(0, 0, pageWidth, 42, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('COIMBATORE INSTITUTE OF TECHNOLOGY (AUTONOMOUS)', margin, 13);

  doc.setFontSize(11);
  doc.setTextColor(0, 229, 255);
  doc.text('DOMAINWISE GRADE & COGNITIVE PROFICIENCY ANALYSIS REPORT', margin, 20);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184);
  doc.text(`Scope: ${deptLabel} | Total Students: ${filteredSubs.length} | Generated: ${new Date().toLocaleString()}`, margin, 30);
  doc.text('Domain Letter Grading: Grade A (>=80% / 8-10 Marks) | Grade B (50%-79% / 5-7 Marks) | Grade C (<50% / 0-4 Marks)', margin, 36);

  y = 48;

  const printHeaders = (currY: number) => {
    doc.setFillColor(30, 41, 59);
    doc.rect(margin, currY, pageWidth - 2 * margin, 7, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(255, 255, 255);

    doc.text('S.No', margin + 2, currY + 4.8);
    doc.text('Register Number', margin + 10, currY + 4.8);
    doc.text('Student Name', margin + 35, currY + 4.8);
    doc.text('Department', margin + 75, currY + 4.8);
    doc.text('Limits & Cont (/10)', margin + 115, currY + 4.8);
    doc.text('Differentiation (/10)', margin + 145, currY + 4.8);
    doc.text('Integration (/10)', margin + 175, currY + 4.8);
    doc.text('Prob & Stat (/10)', margin + 205, currY + 4.8);
    doc.text('Matrices & Det (/10)', margin + 235, currY + 4.8);
    doc.text('Total (/50)', margin + 265, currY + 4.8);
  };

  printHeaders(y);
  y += 7;

  const sortedSubs = [...filteredSubs].sort((a, b) => {
    const deptComp = (a.student.department || '').localeCompare(b.student.department || '');
    if (deptComp !== 0) return deptComp;
    return (b.report?.overallPercentage || 0) - (a.report?.overallPercentage || 0);
  });

  sortedSubs.forEach((sub, idx) => {
    if (y > pageHeight - 14) {
      doc.addPage();
      y = 14;
      printHeaders(y);
      y += 7;
    }

    if (idx % 2 === 0) {
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, y, pageWidth - 2 * margin, 5.5, 'F');
    }

    const d = extractStudentDomainGrades(sub);
    const overallPct = sub.report?.overallPercentage || 0;
    const overallGrade = calculateGrade(overallPct);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(15, 23, 42);

    doc.text(String(idx + 1), margin + 2, y + 3.8);
    doc.setFont('helvetica', 'bold');
    doc.text(sub.student.registerNo || 'N/A', margin + 10, y + 3.8);
    doc.setFont('helvetica', 'normal');

    const truncName = sub.student.name.length > 20 ? sub.student.name.substring(0, 18) + '..' : sub.student.name;
    doc.text(truncName, margin + 35, y + 3.8);

    const truncDept = sub.student.department.length > 22 ? sub.student.department.substring(0, 20) + '..' : sub.student.department;
    doc.text(truncDept, margin + 75, y + 3.8);

    // Domain columns
    const renderDomainCell = (dom: any, posX: number) => {
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(15, 23, 42);
      doc.text(`${dom.score}/10`, posX, y + 3.8);
      
      doc.setFont('helvetica', 'bold');
      if (dom.grade === 'A') doc.setTextColor(16, 185, 129);
      else if (dom.grade === 'B') doc.setTextColor(37, 99, 235);
      else doc.setTextColor(220, 38, 38);
      doc.text(`[${dom.grade}]`, posX + 13, y + 3.8);
    };

    renderDomainCell(d.calculus, margin + 115);
    renderDomainCell(d.probability, margin + 145);
    renderDomainCell(d.numberSystem, margin + 175);
    renderDomainCell(d.trigonometry, margin + 205);
    renderDomainCell(d.statistics, margin + 235);

    // Total score & Grade
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(`${sub.report?.overallScore || 0}/50`, margin + 265, y + 3.8);

    if (overallGrade.grade === 'A') doc.setTextColor(16, 185, 129);
    else if (overallGrade.grade === 'B') doc.setTextColor(37, 99, 235);
    else doc.setTextColor(220, 38, 38);
    doc.text(`(${overallGrade.grade})`, margin + 276, y + 3.8);

    y += 5.5;
  });

  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(`Coimbatore Institute of Technology (Autonomous) | Domainwise Grade Analysis | Page ${i} of ${totalPages}`, margin, pageHeight - 5);
  }

  const cleanDeptLabel = deptLabel.replace(/[^a-zA-Z0-9]/g, '_');
  doc.save(`CIT_Domainwise_Grade_Analysis_${cleanDeptLabel}.pdf`);
}

/**
 * Generates an executive Departmentwise & Gradewise Assessment PDF Report.
 * Supports filtering by Department and specific Grade (Grade A, Grade B, Grade C, or All).
 */
export async function downloadGradewiseDepartmentPdfReport(
  rawSubmissions: SavedSubmission[],
  deptLabel: string,
  gradeFilter: 'ALL' | 'A' | 'B' | 'C' = 'ALL',
  allSubmissions?: SavedSubmission[]
) {
  const submissions = normalizeSubmissionsList(rawSubmissions);
  const { default: jsPDF } = await import('jspdf');
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  const deptFilteredSubs = deptLabel === 'ALL'
    ? submissions
    : submissions.filter((s) => s.student.department === deptLabel);

  const finalFilteredSubs = gradeFilter === 'ALL'
    ? deptFilteredSubs
    : deptFilteredSubs.filter((s) => calculateGrade(s.report?.overallPercentage || 0).grade === gradeFilter);

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 12;
  let y = 14;

  // Header Banner
  doc.setFillColor(11, 19, 43); // #0B132B
  doc.rect(0, 0, pageWidth, 42, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text('COIMBATORE INSTITUTE OF TECHNOLOGY (AUTONOMOUS)', margin, 13);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 229, 255);
  const gradeTitleSuffix = gradeFilter === 'ALL'
    ? 'OVERALL PERFORMANCE REPORT (ALL GRADES)'
    : `OVERALL PERFORMANCE REPORT — GRADE ${gradeFilter} (${gradeFilter === 'A' ? 'DISTINCTION / ABOVE 80%' : gradeFilter === 'B' ? 'MERIT / 50%-80%' : 'DEVELOPING / BELOW 50%'})`;
  doc.text(`DEPARTMENT ${gradeTitleSuffix}`, margin, 20);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184);
  doc.text(`Department Scope: ${deptLabel === 'ALL' ? 'Every Department (All Departments Combined)' : deptLabel} | Filter: ${gradeFilter === 'ALL' ? 'All Grades (A, B, C)' : `Grade ${gradeFilter}`} | Generated: ${new Date().toLocaleString()}`, margin, 30);
  doc.text(`Total Candidates in Report: ${finalFilteredSubs.length} (out of ${deptFilteredSubs.length} department candidates) | Grading Standards: Grade A (Above 80%), Grade B (50%-80%), Grade C (Below 50%)`, margin, 36);

  y = 48;

  // Section 1: Department Grade Matrix Summary Table
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('1. Departmental Grade Distribution Summary Matrix', margin, y);
  y += 5;

  const depts = Array.from(new Set(deptFilteredSubs.map((s) => s.student.department || 'Unspecified')));

  doc.setFillColor(30, 41, 59);
  doc.rect(margin, y, pageWidth - 2 * margin, 7, 'F');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text('Department Name', margin + 3, y + 4.8);
  doc.text('Total Students', margin + 75, y + 4.8);
  doc.text('Grade A (Above 80%)', margin + 105, y + 4.8);
  doc.text('Grade B (50%-80%)', margin + 145, y + 4.8);
  doc.text('Grade C (Below 50%)', margin + 185, y + 4.8);
  doc.text('Pass Rate (%)', margin + 225, y + 4.8);
  doc.text('Average Score (/50)', margin + 250, y + 4.8);

  y += 7;

  depts.forEach((dName, idx) => {
    const deptSubs = deptFilteredSubs.filter((s) => s.student.department === dName);
    const totalCount = deptSubs.length;
    let aCount = 0, bCount = 0, cCount = 0;
    let scoreSum = 0;

    deptSubs.forEach((s) => {
      const pct = s.report?.overallPercentage || 0;
      scoreSum += s.report?.overallScore || 0;
      const g = calculateGrade(pct).grade;
      if (g === 'A') aCount++;
      else if (g === 'B') bCount++;
      else cCount++;
    });

    const passPct = totalCount > 0 ? Math.round(((aCount + bCount) / totalCount) * 100) : 0;
    const avgScore = totalCount > 0 ? (scoreSum / totalCount).toFixed(2) : '0.0';

    if (idx % 2 === 0) {
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, y, pageWidth - 2 * margin, 6, 'F');
    }

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(15, 23, 42);

    const truncDept = dName.length > 32 ? dName.substring(0, 30) + '..' : dName;
    doc.text(truncDept, margin + 3, y + 4.2);
    doc.setFont('helvetica', 'bold');
    doc.text(String(totalCount), margin + 75, y + 4.2);
    doc.setFont('helvetica', 'normal');
    doc.text(`${aCount} (${totalCount ? Math.round((aCount / totalCount) * 100) : 0}%)`, margin + 105, y + 4.2);
    doc.text(`${bCount} (${totalCount ? Math.round((bCount / totalCount) * 100) : 0}%)`, margin + 145, y + 4.2);
    doc.text(`${cCount} (${totalCount ? Math.round((cCount / totalCount) * 100) : 0}%)`, margin + 185, y + 4.2);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(passPct >= 75 ? 16 : 225, passPct >= 75 ? 185 : 29, passPct >= 75 ? 129 : 72);
    doc.text(`${passPct}%`, margin + 225, y + 4.2);

    doc.setTextColor(15, 23, 42);
    doc.text(`${avgScore} / 50`, margin + 250, y + 4.2);

    y += 6;
  });

  y += 8;

  // Section 2: Individual Candidate Gradewise Roster
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  const section2Title = gradeFilter === 'ALL'
    ? '2. Individual Candidate Performance Evaluation Roster (All Grades)'
    : `2. Individual Candidate Performance Evaluation Roster — Grade ${gradeFilter} (${finalFilteredSubs.length} Students)`;
  doc.text(section2Title, margin, y);
  y += 5;

  const printHeaders = (currY: number) => {
    doc.setFillColor(30, 41, 59);
    doc.rect(margin, currY, pageWidth - 2 * margin, 7, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(255, 255, 255);

    doc.text('S.No', margin + 3, currY + 4.8);
    doc.text('Register Number', margin + 14, currY + 4.8);
    doc.text('Student Name', margin + 50, currY + 4.8);
    doc.text('Department', margin + 105, currY + 4.8);
    doc.text('Score (/50)', margin + 175, currY + 4.8);
    doc.text('Grade Secured', margin + 205, currY + 4.8);
    doc.text('Grade Description', margin + 232, currY + 4.8);
  };

  printHeaders(y);
  y += 7;

  const sortedSubs = [...finalFilteredSubs].sort((a, b) => {
    const deptComp = (a.student.department || '').localeCompare(b.student.department || '');
    if (deptComp !== 0) return deptComp;
    return (b.report?.overallPercentage || 0) - (a.report?.overallPercentage || 0);
  });

  if (sortedSubs.length === 0) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(`No students found matching Grade ${gradeFilter} in selected department scope.`, margin + 3, y + 5);
    y += 10;
  } else {
    sortedSubs.forEach((sub, idx) => {
      if (y > pageHeight - 16) {
        doc.addPage();
        y = 14;
        printHeaders(y);
        y += 7;
      }

      if (idx % 2 === 0) {
        doc.setFillColor(248, 250, 252);
        doc.rect(margin, y, pageWidth - 2 * margin, 6, 'F');
      }

      const pct = sub.report?.overallPercentage || 0;
      const gradeObj = calculateGrade(pct);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(15, 23, 42);

      doc.text(String(idx + 1), margin + 3, y + 4.2);
      doc.setFont('helvetica', 'bold');
      doc.text(sub.student.registerNo || 'N/A', margin + 14, y + 4.2);
      doc.setFont('helvetica', 'normal');
      const truncName = sub.student.name.length > 25 ? sub.student.name.substring(0, 23) + '..' : sub.student.name;
      doc.text(truncName, margin + 50, y + 4.2);
      const truncDept = sub.student.department.length > 32 ? sub.student.department.substring(0, 30) + '..' : sub.student.department;
      doc.text(truncDept, margin + 105, y + 4.2);

      doc.setFont('helvetica', 'bold');
      doc.text(`${sub.report?.overallScore || 0}/50 (${pct}%)`, margin + 175, y + 4.2);

      if (gradeObj.grade === 'A') doc.setTextColor(16, 185, 129);
      else if (gradeObj.grade === 'B') doc.setTextColor(37, 99, 235);
      else doc.setTextColor(220, 38, 38);

      doc.text(`Grade ${gradeObj.grade}`, margin + 205, y + 4.2);

      doc.setTextColor(51, 65, 85);
      doc.setFont('helvetica', 'normal');
      doc.text(gradeObj.title, margin + 232, y + 4.2);

      y += 6;
    });
  }

  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(`Coimbatore Institute of Technology | Page ${i} of ${totalPages}`, margin, pageHeight - 6);
  }

  const cleanDeptLabel = deptLabel.replace(/[^a-zA-Z0-9]/g, '_');
  const gradeSuffix = gradeFilter === 'ALL' ? 'All_Grades' : `Grade_${gradeFilter}`;
  doc.save(`CIT_Performance_Report_${gradeSuffix}_${cleanDeptLabel}.pdf`);
}

/**
 * Generates an Excel workbook containing Departmentwise Grade Matrix & Gradewise Student Breakdown.
 * Supports filtering by Department and specific Grade (Grade A, Grade B, Grade C, or All).
 */
export async function downloadGradewiseDepartmentExcelReport(
  rawSubmissions: SavedSubmission[],
  deptLabel: string,
  gradeFilter: 'ALL' | 'A' | 'B' | 'C' = 'ALL',
  allSubmissions?: SavedSubmission[]
) {
  const submissions = normalizeSubmissionsList(rawSubmissions);
  const XLSX = await import('xlsx');
  const wb = XLSX.utils.book_new();

  const deptFilteredSubs = deptLabel === 'ALL'
    ? submissions
    : submissions.filter((s) => s.student.department === deptLabel);

  const finalFilteredSubs = gradeFilter === 'ALL'
    ? deptFilteredSubs
    : deptFilteredSubs.filter((s) => calculateGrade(s.report?.overallPercentage || 0).grade === gradeFilter);

  const depts = Array.from(new Set(deptFilteredSubs.map((s) => s.student.department || 'Unspecified')));
  const matrixTitle = [
    ['COIMBATORE INSTITUTE OF TECHNOLOGY (AUTONOMOUS)'],
    [`DEPARTMENT OVERALL PERFORMANCE REPORT - ${gradeFilter === 'ALL' ? 'ALL GRADES' : `GRADE ${gradeFilter}`}`],
    [`Department Scope: ${deptLabel} | Grade Filter: ${gradeFilter === 'ALL' ? 'All Grades' : `Grade ${gradeFilter}`} | Candidates in Sheet: ${finalFilteredSubs.length}`],
    ['Grade Scale: Grade A (Above 80% / 40-50 Marks) | Grade B (50%-80% / 25-39 Marks) | Grade C (Below 50% / 0-24 Marks)'],
    [`Generated Date: ${new Date().toLocaleString()}`],
    ['']
  ];

  const matrixHeaders = [
    'Department Name',
    'Total Students',
    'Grade A (Above 80%)',
    'Grade A (%)',
    'Grade B (50%-80%)',
    'Grade B (%)',
    'Grade C (Below 50%)',
    'Grade C (%)',
    'Pass Percentage (%)',
    'Average Score (/50)'
  ];

  const matrixRows = depts.map((dName) => {
    const deptSubs = deptFilteredSubs.filter((s) => s.student.department === dName);
    const totalCount = deptSubs.length;
    let a = 0, b = 0, c = 0;
    let scoreSum = 0;

    deptSubs.forEach((s) => {
      const pct = s.report?.overallPercentage || 0;
      const g = calculateGrade(pct);
      scoreSum += s.report?.overallScore || 0;
      if (g.grade === 'A') a++;
      else if (g.grade === 'B') b++;
      else c++;
    });

    const passPct = totalCount > 0 ? (((a + b) / totalCount) * 100).toFixed(1) : '0.0';
    const avgScore = totalCount > 0 ? (scoreSum / totalCount).toFixed(2) : '0';

    return [
      dName,
      totalCount,
      `${a} (${totalCount ? Math.round((a / totalCount) * 100) : 0}%)`,
      totalCount ? `${Math.round((a / totalCount) * 100)}%` : '0%',
      `${b} (${totalCount ? Math.round((b / totalCount) * 100) : 0}%)`,
      totalCount ? `${Math.round((b / totalCount) * 100)}%` : '0%',
      `${c} (${totalCount ? Math.round((c / totalCount) * 100) : 0}%)`,
      totalCount ? `${Math.round((c / totalCount) * 100)}%` : '0%',
      `${passPct}%`,
      avgScore
    ];
  });

  const wsMatrix = XLSX.utils.aoa_to_sheet([...matrixTitle, matrixHeaders, ...matrixRows]);
  XLSX.utils.book_append_sheet(wb, wsMatrix, 'Department Grade Matrix');

  const rosterHeaders = [
    'S.No',
    'Register Number',
    'Student Name',
    'Department',
    'Score Secured (/50)',
    'Percentage (%)',
    'Grade Secured',
    'Grade Description',
    'Duration',
    'Date of Assessment'
  ];

  const rosterRows = finalFilteredSubs.map((sub, idx) => {
    const pct = sub.report?.overallPercentage || 0;
    const g = calculateGrade(pct);

    return [
      idx + 1,
      sub.student.registerNo,
      sub.student.name,
      sub.student.department,
      `${sub.report?.overallScore || 0} / 50`,
      `${pct}%`,
      `Grade ${g.grade}`,
      g.title,
      formatDuration(sub.report?.totalDurationSeconds),
      sub.submittedAt || sub.report?.testTimestamp || 'N/A'
    ];
  });

  const wsRoster = XLSX.utils.aoa_to_sheet([
    [`CIT MATHEMATICS ASSESSMENT - ${gradeFilter === 'ALL' ? 'ALL GRADES' : `GRADE ${gradeFilter}`} CANDIDATE ROSTER`],
    [`Department Scope: ${deptLabel} | Filter: ${gradeFilter === 'ALL' ? 'All Grades' : `Grade ${gradeFilter}`} | Total Candidates: ${finalFilteredSubs.length}`],
    [''],
    rosterHeaders,
    ...rosterRows
  ]);
  XLSX.utils.book_append_sheet(wb, wsRoster, `${gradeFilter === 'ALL' ? 'All Grades' : `Grade ${gradeFilter}`} Roster`);

  const cleanDeptLabel = deptLabel.replace(/[^a-zA-Z0-9]/g, '_');
  const gradeSuffix = gradeFilter === 'ALL' ? 'All_Grades' : `Grade_${gradeFilter}`;
  XLSX.writeFile(wb, `CIT_Performance_Report_${gradeSuffix}_${cleanDeptLabel}.xlsx`);
}

/**
 * Generates a CSV file containing Departmentwise & Gradewise Student Breakdown.
 * Supports filtering by Department and specific Grade (Grade A, Grade B, Grade C, or All).
 */
export function downloadGradewiseDepartmentCsvReport(
  rawSubmissions: SavedSubmission[],
  deptLabel: string,
  gradeFilter: 'ALL' | 'A' | 'B' | 'C' = 'ALL',
  allSubmissions?: SavedSubmission[]
) {
  const submissions = normalizeSubmissionsList(rawSubmissions);
  const deptFilteredSubs = deptLabel === 'ALL'
    ? submissions
    : submissions.filter((s) => s.student.department === deptLabel);

  const finalFilteredSubs = gradeFilter === 'ALL'
    ? deptFilteredSubs
    : deptFilteredSubs.filter((s) => calculateGrade(s.report?.overallPercentage || 0).grade === gradeFilter);

  const headers = [
    'S.No',
    'Register Number',
    'Student Name',
    'Department',
    'Score Secured',
    'Percentage',
    'Grade Secured',
    'Grade Title',
    'Duration',
    'Assessment Date'
  ];

  const rows = finalFilteredSubs.map((sub, idx) => {
    const pct = sub.report?.overallPercentage || 0;
    const g = calculateGrade(pct);

    return [
      idx + 1,
      `"${(sub.student.registerNo || '').replace(/"/g, '""')}"`,
      `"${(sub.student.name || '').replace(/"/g, '""')}"`,
      `"${(sub.student.department || '').replace(/"/g, '""')}"`,
      `"${sub.report?.overallScore || 0}/50"`,
      `"${pct}%"`,
      `"Grade ${g.grade}"`,
      `"${g.title}"`,
      `"${formatDuration(sub.report?.totalDurationSeconds)}"`,
      `"${(sub.submittedAt || sub.report?.testTimestamp || '').replace(/"/g, '""')}"`
    ];
  });

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const cleanDeptLabel = deptLabel.replace(/[^a-zA-Z0-9]/g, '_');
  const gradeSuffix = gradeFilter === 'ALL' ? 'All_Grades' : `Grade_${gradeFilter}`;
  a.download = `CIT_Performance_Report_${gradeSuffix}_${cleanDeptLabel}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Downloads Complete Master Student Evaluation Roster in CSV format.
 */
export function downloadCompleteMasterRosterCsv(
  rawSubmissions: SavedSubmission[],
  deptLabel: string = 'ALL'
) {
  const submissions = normalizeSubmissionsList(rawSubmissions);
  const filteredSubs = deptLabel === 'ALL'
    ? submissions
    : submissions.filter((s) => (s.student.department || 'Unspecified') === deptLabel);

  const headers = [
    'S.No',
    'Register Number',
    'Student Name',
    'Department',
    'Score Secured (/50)',
    'Percentage (%)',
    'Grade Secured',
    'Grade Description',
    'Grade Range',
    'Logic Index',
    'Speed-Accuracy Factor',
    'Assessment Timestamp',
    'Duration',
    'Security Status',
    'Strengths (SWOT)',
    'Weaknesses (SWOT)',
    'Opportunities (SWOT)',
    'Threats (SWOT)'
  ];

  const rows = filteredSubs.map((sub, idx) => {
    const gradeObj = sub.report ? calculateGrade(sub.report.overallPercentage) : null;
    const swot = getStudentSwotAnalysis(sub);

    return [
      idx + 1,
      `"${(sub.student.registerNo || '').replace(/"/g, '""')}"`,
      `"${(sub.student.name || '').replace(/"/g, '""')}"`,
      `"${(sub.student.department || '').replace(/"/g, '""')}"`,
      `"${sub.report?.overallScore || 0}/50"`,
      `"${sub.report?.overallPercentage || 0}%"`,
      `"Grade ${gradeObj?.grade || 'N/A'}"`,
      `"${(gradeObj?.title || 'N/A').replace(/"/g, '""')}"`,
      `"${(gradeObj?.description || 'N/A').replace(/"/g, '""')}"`,
      `"${sub.report?.cognitionLevel?.logicPurity ?? 'N/A'}"`,
      `"${sub.report?.cognitionLevel?.speedAccuracyFactor ?? 'N/A'}"`,
      `"${(sub.submittedAt || sub.report?.testTimestamp || '').replace(/"/g, '""')}"`,
      `"${formatDuration(sub.report?.totalDurationSeconds)}"`,
      `"${sub.isLockedOut ? 'LOCKED OUT' : 'NORMAL'}"`,
      `"${swot.strengths.join(' | ').replace(/"/g, '""')}"`,
      `"${swot.weaknesses.join(' | ').replace(/"/g, '""')}"`,
      `"${swot.opportunities.join(' | ').replace(/"/g, '""')}"`,
      `"${swot.threats.join(' | ').replace(/"/g, '""')}"`
    ];
  });

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const cleanDeptLabel = deptLabel.replace(/[^a-zA-Z0-9]/g, '_');
  a.download = `CIT_Complete_Master_Roster_${cleanDeptLabel}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Downloads Domainwise Grade Analysis in CSV format.
 */
export function downloadDomainwiseGradeAnalysisCsv(
  rawSubmissions: SavedSubmission[],
  deptLabel: string = 'ALL'
) {
  const submissions = normalizeSubmissionsList(rawSubmissions);
  const filteredSubs = deptLabel === 'ALL'
    ? submissions
    : submissions.filter((s) => (s.student.department || 'Unspecified') === deptLabel);

  const headers = [
    'S.No',
    'Register Number',
    'Student Name',
    'Department',
    'Limits & Continuity Score',
    'Limits & Continuity (%)',
    'Limits & Continuity Grade',
    'Differentiation Score',
    'Differentiation (%)',
    'Differentiation Grade',
    'Integration Score',
    'Integration (%)',
    'Integration Grade',
    'Probability & Statistics Score',
    'Probability & Statistics (%)',
    'Probability & Statistics Grade',
    'Matrices & Determinants Score',
    'Matrices & Determinants (%)',
    'Matrices & Determinants Grade',
    'Total Score (/50)',
    'Overall Percentage (%)',
    'Overall Letter Grade',
    'Dominant Domain',
    'Focus Domain'
  ];

  const rows = filteredSubs.map((sub, idx) => {
    const d = extractStudentDomainGrades(sub);
    const overallPct = sub.report?.overallPercentage || 0;
    const overallGrade = calculateGrade(overallPct);

    return [
      idx + 1,
      `"${(sub.student.registerNo || '').replace(/"/g, '""')}"`,
      `"${(sub.student.name || '').replace(/"/g, '""')}"`,
      `"${(sub.student.department || '').replace(/"/g, '""')}"`,
      `"${d.calculus.score}/10"`,
      `"${d.calculus.pct}%"`,
      `"Grade ${d.calculus.grade}"`,
      `"${d.probability.score}/10"`,
      `"${d.probability.pct}%"`,
      `"Grade ${d.probability.grade}"`,
      `"${d.numberSystem.score}/10"`,
      `"${d.numberSystem.pct}%"`,
      `"Grade ${d.numberSystem.grade}"`,
      `"${d.trigonometry.score}/10"`,
      `"${d.trigonometry.pct}%"`,
      `"Grade ${d.trigonometry.grade}"`,
      `"${d.statistics.score}/10"`,
      `"${d.statistics.pct}%"`,
      `"Grade ${d.statistics.grade}"`,
      `"${sub.report?.overallScore || 0}/50"`,
      `"${overallPct}%"`,
      `"Grade ${overallGrade.grade}"`,
      `"${d.dominantDomain.replace(/"/g, '""')}"`,
      `"${d.growthDomain.replace(/"/g, '""')}"`
    ];
  });

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const cleanDeptLabel = deptLabel.replace(/[^a-zA-Z0-9]/g, '_');
  a.download = `CIT_Domainwise_Grade_Analysis_${cleanDeptLabel}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Exports all student-submitted feedback to a multi-sheet Excel (.xlsx) workbook.
 * Sheet 1: Master Student Feedback Records (with ratings, averages, student details, marks, and comments)
 * Sheet 2: Department-wise Satisfaction Analytics
 * Sheet 3: Feedback Comments and Suggestions
 */
export async function exportStudentFeedbackToExcel(
  feedbacks: AppExperienceFeedback[],
  submissions: SavedSubmission[] = []
) {
  const XLSX = await import('xlsx');
  const wb = XLSX.utils.book_new();

  // Create submission map by Register Number
  const subMap = new Map<string, SavedSubmission>();
  submissions.forEach((s) => {
    if (s.student?.registerNo) {
      subMap.set(s.student.registerNo.trim().toUpperCase(), s);
    }
  });

  // -------------------------------------------------------------
  // SHEET 1: Master Student Feedback Records
  // -------------------------------------------------------------
  const titleRows = [
    ['COIMBATORE INSTITUTE OF TECHNOLOGY (AUTONOMOUS)'],
    ['PG MATHEMATICS COGNITIVE COMPETENCY ASSESSMENT - STUDENT FEEDBACK MASTER RECORDS'],
    [`Total Feedback Responses: ${feedbacks.length} | Export Date: ${new Date().toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'medium' })}`],
    ['Rating Standards: 5 = Excellent | 4 = Very Good | 3 = Good | 2 = Fair | 1 = Needs Improvement'],
    ['']
  ];

  const headers = [
    'S.No',
    'Register Number',
    'Student Name',
    'Department',
    'Assessment Rating (/5)',
    'UI & Usability Rating (/5)',
    'Question Clarity Rating (/5)',
    'Navigation Ease Rating (/5)',
    'Average Rating (/5.0)',
    'Satisfaction Level',
    'Score Secured (/50)',
    'Percentage (%)',
    'Letter Grade',
    'Student Feedback & Suggestions',
    'Submission Timestamp'
  ];

  const rows = feedbacks.map((fb, idx) => {
    const r1 = Number(fb.assessmentRating) || 5;
    const r2 = Number(fb.userFriendlinessRating) || 5;
    const r3 = Number(fb.questionClarityRating) || 5;
    const r4 = Number(fb.navEaseRating) || 5;
    const avgRating = ((r1 + r2 + r3 + r4) / 4).toFixed(2);

    let satLevel = 'Excellent';
    const numAvg = parseFloat(avgRating);
    if (numAvg >= 4.5) satLevel = 'Outstanding (5/5)';
    else if (numAvg >= 3.5) satLevel = 'Very Good (4/5)';
    else if (numAvg >= 2.5) satLevel = 'Good (3/5)';
    else if (numAvg >= 1.5) satLevel = 'Fair (2/5)';
    else satLevel = 'Needs Attention (1/5)';

    const regNo = (fb.studentRegNo || '').trim().toUpperCase();
    const matchedSub = subMap.get(regNo);
    const score = matchedSub?.report?.overallScore ?? '-';
    const pct = matchedSub?.report?.overallPercentage !== undefined ? `${matchedSub.report.overallPercentage}%` : '-';
    const grade = matchedSub?.report?.overallPercentage !== undefined ? `Grade ${calculateGrade(matchedSub.report.overallPercentage).grade}` : '-';

    return [
      idx + 1,
      fb.studentRegNo || 'N/A',
      fb.studentName || 'N/A',
      fb.department || 'N/A',
      r1,
      r2,
      r3,
      r4,
      avgRating,
      satLevel,
      score,
      pct,
      grade,
      fb.comments || 'No comment provided',
      fb.submittedAt || 'N/A'
    ];
  });

  const wsMaster = XLSX.utils.aoa_to_sheet([...titleRows, headers, ...rows]);
  wsMaster['!cols'] = [
    { wch: 6 },   // S.No
    { wch: 18 },  // Register Number
    { wch: 26 },  // Name
    { wch: 32 },  // Dept
    { wch: 22 },  // Assessment Rating
    { wch: 24 },  // UI Rating
    { wch: 24 },  // Clarity Rating
    { wch: 24 },  // Nav Rating
    { wch: 20 },  // Avg Rating
    { wch: 22 },  // Satisfaction
    { wch: 18 },  // Score
    { wch: 16 },  // Pct
    { wch: 16 },  // Grade
    { wch: 55 },  // Comments
    { wch: 26 }   // Timestamp
  ];
  XLSX.utils.book_append_sheet(wb, wsMaster, 'Feedback Master Roster');

  // -------------------------------------------------------------
  // SHEET 2: Department-wise Satisfaction Analytics
  // -------------------------------------------------------------
  const deptStats: Record<string, {
    count: number;
    r1Sum: number;
    r2Sum: number;
    r3Sum: number;
    r4Sum: number;
  }> = {};

  feedbacks.forEach((fb) => {
    const dept = fb.department || 'Unspecified';
    if (!deptStats[dept]) {
      deptStats[dept] = { count: 0, r1Sum: 0, r2Sum: 0, r3Sum: 0, r4Sum: 0 };
    }
    deptStats[dept].count += 1;
    deptStats[dept].r1Sum += Number(fb.assessmentRating) || 5;
    deptStats[dept].r2Sum += Number(fb.userFriendlinessRating) || 5;
    deptStats[dept].r3Sum += Number(fb.questionClarityRating) || 5;
    deptStats[dept].r4Sum += Number(fb.navEaseRating) || 5;
  });

  const deptHeaders = [
    'Department Name',
    'Total Feedback Submissions',
    'Avg Assessment Rating (/5)',
    'Avg UI/Usability Rating (/5)',
    'Avg Question Clarity Rating (/5)',
    'Avg Navigation Ease Rating (/5)',
    'Overall Department Satisfaction (/5.0)',
    'Satisfaction Index (%)'
  ];

  const deptRows = Object.entries(deptStats).map(([dept, s]) => {
    const avgR1 = (s.r1Sum / s.count).toFixed(2);
    const avgR2 = (s.r2Sum / s.count).toFixed(2);
    const avgR3 = (s.r3Sum / s.count).toFixed(2);
    const avgR4 = (s.r4Sum / s.count).toFixed(2);
    const overallAvg = ((s.r1Sum + s.r2Sum + s.r3Sum + s.r4Sum) / (s.count * 4)).toFixed(2);
    const satPct = (parseFloat(overallAvg) * 20).toFixed(1) + '%';
    return [
      dept,
      s.count,
      avgR1,
      avgR2,
      avgR3,
      avgR4,
      overallAvg,
      satPct
    ];
  });

  const wsDept = XLSX.utils.aoa_to_sheet([
    ['COIMBATORE INSTITUTE OF TECHNOLOGY (AUTONOMOUS)'],
    ['DEPARTMENT-WISE STUDENT FEEDBACK & SATISFACTION SUMMARY'],
    [''],
    deptHeaders,
    ...deptRows
  ]);
  wsDept['!cols'] = [
    { wch: 35 }, { wch: 25 }, { wch: 25 }, { wch: 25 },
    { wch: 28 }, { wch: 28 }, { wch: 35 }, { wch: 22 }
  ];
  XLSX.utils.book_append_sheet(wb, wsDept, 'Department Satisfaction');

  // -------------------------------------------------------------
  // SHEET 3: Feedback Comments & Actionable Suggestions
  // -------------------------------------------------------------
  const commentHeaders = [
    'S.No',
    'Register Number',
    'Student Name',
    'Department',
    'Overall Rating',
    'Student Feedback & Suggestions',
    'Timestamp'
  ];

  const commentRows = feedbacks
    .filter((fb) => fb.comments && fb.comments.trim().length > 0)
    .map((fb, idx) => {
      const r1 = Number(fb.assessmentRating) || 5;
      const r2 = Number(fb.userFriendlinessRating) || 5;
      const r3 = Number(fb.questionClarityRating) || 5;
      const r4 = Number(fb.navEaseRating) || 5;
      const avg = ((r1 + r2 + r3 + r4) / 4).toFixed(1);
      return [
        idx + 1,
        fb.studentRegNo || 'N/A',
        fb.studentName || 'N/A',
        fb.department || 'N/A',
        `${avg} / 5.0`,
        fb.comments,
        fb.submittedAt || 'N/A'
      ];
    });

  const wsComments = XLSX.utils.aoa_to_sheet([
    ['COIMBATORE INSTITUTE OF TECHNOLOGY (AUTONOMOUS)'],
    ['STUDENT FEEDBACK COMMENTS & SUGGESTIONS LOG'],
    [''],
    commentHeaders,
    ...commentRows
  ]);
  wsComments['!cols'] = [
    { wch: 6 }, { wch: 18 }, { wch: 25 }, { wch: 30 },
    { wch: 16 }, { wch: 70 }, { wch: 26 }
  ];
  XLSX.utils.book_append_sheet(wb, wsComments, 'Comments & Suggestions');

  const dateStamp = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `CIT_Student_Assessment_Feedback_Report_${dateStamp}.xlsx`);
}

/**
 * Exports all student feedback as CSV
 */
export function exportStudentFeedbackToCSV(
  feedbacks: AppExperienceFeedback[],
  submissions: SavedSubmission[] = []
) {
  const subMap = new Map<string, SavedSubmission>();
  submissions.forEach((s) => {
    if (s.student?.registerNo) {
      subMap.set(s.student.registerNo.trim().toUpperCase(), s);
    }
  });

  const headers = [
    'S.No',
    'Register Number',
    'Student Name',
    'Department',
    'Assessment Rating (/5)',
    'UI Usability Rating (/5)',
    'Question Clarity Rating (/5)',
    'Navigation Ease Rating (/5)',
    'Average Rating (/5.0)',
    'Score Secured (/50)',
    'Percentage (%)',
    'Grade Awarded',
    'Student Feedback Comments',
    'Submitted Timestamp'
  ];

  const rows = feedbacks.map((fb, idx) => {
    const r1 = Number(fb.assessmentRating) || 5;
    const r2 = Number(fb.userFriendlinessRating) || 5;
    const r3 = Number(fb.questionClarityRating) || 5;
    const r4 = Number(fb.navEaseRating) || 5;
    const avg = ((r1 + r2 + r3 + r4) / 4).toFixed(2);

    const regNo = (fb.studentRegNo || '').trim().toUpperCase();
    const matchedSub = subMap.get(regNo);
    const score = matchedSub?.report?.overallScore ?? '-';
    const pct = matchedSub?.report?.overallPercentage !== undefined ? `${matchedSub.report.overallPercentage}%` : '-';
    const grade = matchedSub?.report?.overallPercentage !== undefined ? `Grade ${calculateGrade(matchedSub.report.overallPercentage).grade}` : '-';

    return [
      idx + 1,
      `"${(fb.studentRegNo || '').replace(/"/g, '""')}"`,
      `"${(fb.studentName || '').replace(/"/g, '""')}"`,
      `"${(fb.department || '').replace(/"/g, '""')}"`,
      r1,
      r2,
      r3,
      r4,
      avg,
      `"${score}"`,
      `"${pct}"`,
      `"${grade}"`,
      `"${(fb.comments || '').replace(/"/g, '""')}"`,
      `"${(fb.submittedAt || '').replace(/"/g, '""')}"`
    ];
  });

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const dateStamp = new Date().toISOString().slice(0, 10);
  a.download = `CIT_Student_Feedback_Records_${dateStamp}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Generates an official landscape Institutional Student Feedback Evaluation PDF Report
 */
export async function exportStudentFeedbackToPDF(
  feedbacks: AppExperienceFeedback[],
  submissions: SavedSubmission[] = []
) {
  const { default: jsPDF } = await import('jspdf');
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  const subMap = new Map<string, SavedSubmission>();
  submissions.forEach((s) => {
    if (s.student?.registerNo) {
      subMap.set(s.student.registerNo.trim().toUpperCase(), s);
    }
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 12;
  let y = 14;

  // Calculate overall metrics
  let totalR1 = 0, totalR2 = 0, totalR3 = 0, totalR4 = 0;
  feedbacks.forEach((fb) => {
    totalR1 += Number(fb.assessmentRating) || 5;
    totalR2 += Number(fb.userFriendlinessRating) || 5;
    totalR3 += Number(fb.questionClarityRating) || 5;
    totalR4 += Number(fb.navEaseRating) || 5;
  });
  const count = feedbacks.length || 1;
  const avgR1 = (totalR1 / count).toFixed(2);
  const avgR2 = (totalR2 / count).toFixed(2);
  const avgR3 = (totalR3 / count).toFixed(2);
  const avgR4 = (totalR4 / count).toFixed(2);
  const totalAvg = ((totalR1 + totalR2 + totalR3 + totalR4) / (count * 4)).toFixed(2);

  // Top Institutional Header
  doc.setFillColor(11, 19, 43); // #0B132B
  doc.rect(0, 0, pageWidth, 42, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('COIMBATORE INSTITUTE OF TECHNOLOGY (AUTONOMOUS)', margin, 12);

  doc.setFontSize(10);
  doc.setTextColor(0, 229, 255);
  doc.text('STUDENT ASSESSMENT FEEDBACK & USABILITY EVALUATION REPORT', margin, 18);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184);
  doc.text(`Total Responses: ${feedbacks.length} | Generated: ${new Date().toLocaleString()} | Autonomous Institution Affiliated to Anna University`, margin, 24);

  // Summary Metrics Badges in Header Banner
  const boxW = 46;
  const boxH = 12;
  const startX = margin;
  const boxY = 27;

  const metricsBoxes = [
    { label: 'Overall Satisfaction', val: `${totalAvg} / 5.0` },
    { label: 'Assessment Quality', val: `${avgR1} / 5` },
    { label: 'UI / Usability', val: `${avgR2} / 5` },
    { label: 'Question Clarity', val: `${avgR3} / 5` },
    { label: 'Navigation Ease', val: `${avgR4} / 5` }
  ];

  metricsBoxes.forEach((mb, i) => {
    const bx = startX + i * (boxW + 6);
    if (bx + boxW <= pageWidth - margin) {
      doc.setFillColor(23, 37, 84);
      doc.roundedRect(bx, boxY, boxW, boxH, 2, 2, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.setTextColor(148, 163, 184);
      doc.text(mb.label.toUpperCase(), bx + 3, boxY + 4.5);
      doc.setFontSize(9);
      doc.setTextColor(255, 255, 255);
      doc.text(mb.val, bx + 3, boxY + 10);
    }
  });

  y = 48;

  const printHeaders = (currY: number) => {
    doc.setFillColor(30, 41, 59); // #1E293B
    doc.rect(margin, currY, pageWidth - 2 * margin, 8, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(255, 255, 255);

    doc.text('S.No', margin + 2, currY + 5.5);
    doc.text('Register Number', margin + 11, currY + 5.5);
    doc.text('Student Name', margin + 35, currY + 5.5);
    doc.text('Department', margin + 74, currY + 5.5);
    doc.text('Rating (A / UI / Q / N)', margin + 120, currY + 5.5);
    doc.text('Avg', margin + 160, currY + 5.5);
    doc.text('Score', margin + 172, currY + 5.5);
    doc.text('Grade', margin + 186, currY + 5.5);
    doc.text('Student Feedback Comments & Suggestions', margin + 202, currY + 5.5);
  };

  printHeaders(y);
  y += 8;

  if (feedbacks.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text('No student feedback records submitted yet.', margin + 3, y + 8);
  } else {
    feedbacks.forEach((fb, idx) => {
      const r1 = Number(fb.assessmentRating) || 5;
      const r2 = Number(fb.userFriendlinessRating) || 5;
      const r3 = Number(fb.questionClarityRating) || 5;
      const r4 = Number(fb.navEaseRating) || 5;
      const avg = ((r1 + r2 + r3 + r4) / 4).toFixed(1);

      const regNo = (fb.studentRegNo || '').trim().toUpperCase();
      const matchedSub = subMap.get(regNo);
      const score = matchedSub?.report?.overallScore !== undefined ? `${matchedSub.report.overallScore}/50` : '-';
      const grade = matchedSub?.report?.overallPercentage !== undefined ? `Grade ${calculateGrade(matchedSub.report.overallPercentage).grade}` : '-';

      const commentText = fb.comments || '-';
      const commentLines = doc.splitTextToSize(commentText, pageWidth - margin - (margin + 202) - 2);
      const rowHeight = Math.max(7, commentLines.length * 3.5 + 3);

      if (y + rowHeight > pageHeight - 14) {
        doc.addPage();
        y = 14;
        printHeaders(y);
        y += 8;
      }

      // Alternating row background
      if (idx % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(margin, y, pageWidth - 2 * margin, rowHeight, 'F');
      }

      // Border line
      doc.setDrawColor(226, 232, 240);
      doc.line(margin, y + rowHeight, pageWidth - margin, y + rowHeight);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(30, 41, 59);

      doc.text(`${idx + 1}`, margin + 2, y + 4.5);
      doc.text(fb.studentRegNo || '-', margin + 11, y + 4.5);
      doc.text((fb.studentName || '-').slice(0, 22), margin + 35, y + 4.5);
      doc.text((fb.department || '-').slice(0, 24), margin + 74, y + 4.5);

      // Star / ratings summary: A:5 | UI:5 | Q:5 | N:5
      doc.setFont('helvetica', 'bold');
      doc.text(`${r1} | ${r2} | ${r3} | ${r4}`, margin + 120, y + 4.5);

      doc.setTextColor(16, 185, 129); // emerald
      doc.text(`${avg}★`, margin + 160, y + 4.5);

      doc.setTextColor(30, 41, 59);
      doc.setFont('helvetica', 'normal');
      doc.text(score, margin + 172, y + 4.5);
      doc.text(grade, margin + 186, y + 4.5);

      // Comment
      doc.setTextColor(71, 85, 105);
      doc.text(commentLines, margin + 202, y + 4.5);

      y += rowHeight;
    });
  }

  // Footer page number
  const totalPages = (doc.internal as any).getNumberOfPages ? (doc.internal as any).getNumberOfPages() : 1;
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Coimbatore Institute of Technology | Student Feedback Report | Page ${i} of ${totalPages}`,
      pageWidth / 2,
      pageHeight - 5,
      { align: 'center' }
    );
  }

  const dateStamp = new Date().toISOString().slice(0, 10);
  doc.save(`CIT_Student_Feedback_Evaluation_Report_${dateStamp}.pdf`);
}

/**
 * Interface for Department Domain-wise Aggregated Metrics
 */
export interface DepartmentDomainStats {
  department: string;
  studentCount: number;
  overallAvgScore: number;
  overallAvgPercentage: number;
  calculusAvg: number;
  calculusPct: number;
  probabilityAvg: number;
  probabilityPct: number;
  numberSystemAvg: number;
  numberSystemPct: number;
  trigonometryAvg: number;
  trigonometryPct: number;
  statisticsAvg: number;
  statisticsPct: number;
  strongestDomain: string;
  weakestDomain: string;
  masteryCount: number;
}

/**
 * Computes domain-wise aggregates for all departments based on submissions
 */
export function computeDepartmentDomainAnalysis(rawSubmissions: SavedSubmission[]): {
  departmentStats: DepartmentDomainStats[];
  overallDomainStats: {
    calculusAvg: number;
    probabilityAvg: number;
    numberSystemAvg: number;
    trigonometryAvg: number;
    statisticsAvg: number;
    overallAvg: number;
    totalStudents: number;
  };
} {
  const submissions = normalizeSubmissionsList(rawSubmissions);
  const deptMap: Record<
    string,
    {
      count: number;
      totalScore: number;
      calcScore: number;
      probScore: number;
      numScore: number;
      trigScore: number;
      statScore: number;
      mastery: number;
    }
  > = {};

  let totalCalc = 0;
  let totalProb = 0;
  let totalNum = 0;
  let totalTrig = 0;
  let totalStat = 0;
  let totalScoreSum = 0;

  submissions.forEach((sub) => {
    const dept = sub.student?.department || 'Unassigned';
    if (!deptMap[dept]) {
      deptMap[dept] = {
        count: 0,
        totalScore: 0,
        calcScore: 0,
        probScore: 0,
        numScore: 0,
        trigScore: 0,
        statScore: 0,
        mastery: 0
      };
    }

    const sec = sub.report?.sectionScores;
    const calc = sec?.calculus?.score ?? 0;
    const prob = sec?.probability?.score ?? 0;
    const num = sec?.numberSystem?.score ?? 0;
    const trig = sec?.trigonometry?.score ?? 0;
    const stat = sec?.statistics?.score ?? 0;
    const overall = sub.report?.overallScore ?? (calc + prob + num + trig + stat);

    deptMap[dept].count += 1;
    deptMap[dept].totalScore += overall;
    deptMap[dept].calcScore += calc;
    deptMap[dept].probScore += prob;
    deptMap[dept].numScore += num;
    deptMap[dept].trigScore += trig;
    deptMap[dept].statScore += stat;
    if ((sub.report?.overallPercentage || (overall / 50) * 100) >= 80) {
      deptMap[dept].mastery += 1;
    }

    totalCalc += calc;
    totalProb += prob;
    totalNum += num;
    totalTrig += trig;
    totalStat += stat;
    totalScoreSum += overall;
  });

  const departmentStats: DepartmentDomainStats[] = Object.entries(deptMap).map(([dept, d]) => {
    const n = d.count || 1;
    const cAvg = Number((d.calcScore / n).toFixed(2));
    const pAvg = Number((d.probScore / n).toFixed(2));
    const numAvg = Number((d.numScore / n).toFixed(2));
    const tAvg = Number((d.trigScore / n).toFixed(2));
    const sAvg = Number((d.statScore / n).toFixed(2));
    const oAvg = Number((d.totalScore / n).toFixed(2));

    const domainList = [
      { name: 'Limits & Continuity', score: cAvg },
      { name: 'Differentiation', score: pAvg },
      { name: 'Integration', score: numAvg },
      { name: 'Probability & Statistics', score: tAvg },
      { name: 'Matrices & Determinants', score: sAvg }
    ];

    domainList.sort((a, b) => b.score - a.score);
    const strongest = domainList[0].name;
    const weakest = domainList[domainList.length - 1].name;

    return {
      department: dept,
      studentCount: d.count,
      overallAvgScore: oAvg,
      overallAvgPercentage: Number(((oAvg / 50) * 100).toFixed(1)),
      calculusAvg: cAvg,
      calculusPct: Math.round((cAvg / 10) * 100),
      probabilityAvg: pAvg,
      probabilityPct: Math.round((pAvg / 10) * 100),
      numberSystemAvg: numAvg,
      numberSystemPct: Math.round((numAvg / 10) * 100),
      trigonometryAvg: tAvg,
      trigonometryPct: Math.round((tAvg / 10) * 100),
      statisticsAvg: sAvg,
      statisticsPct: Math.round((sAvg / 10) * 100),
      strongestDomain: strongest,
      weakestDomain: weakest,
      masteryCount: d.mastery
    };
  });

  // Sort departments alphabetically or by student count
  departmentStats.sort((a, b) => b.studentCount - a.studentCount);

  const totalN = submissions.length || 1;
  const overallDomainStats = {
    calculusAvg: Number((totalCalc / totalN).toFixed(2)),
    probabilityAvg: Number((totalProb / totalN).toFixed(2)),
    numberSystemAvg: Number((totalNum / totalN).toFixed(2)),
    trigonometryAvg: Number((totalTrig / totalN).toFixed(2)),
    statisticsAvg: Number((totalStat / totalN).toFixed(2)),
    overallAvg: Number((totalScoreSum / totalN).toFixed(2)),
    totalStudents: submissions.length
  };

  return { departmentStats, overallDomainStats };
}

/**
 * Generates an Excel report for Domain-wise Analysis across each Department
 */
export async function downloadDomainWiseDepartmentExcelReport(rawSubmissions: SavedSubmission[]) {
  const submissions = normalizeSubmissionsList(rawSubmissions);
  const XLSX = await import('xlsx');
  const wb = XLSX.utils.book_new();

  const { departmentStats, overallDomainStats } = computeDepartmentDomainAnalysis(submissions);

  // Sheet 1: Department Summary Matrix
  const titleRows = [
    ['COIMBATORE INSTITUTE OF TECHNOLOGY'],
    ['DEPARTMENT-WISE DOMAIN COGNITIVE ANALYSIS & EVALUATION MATRIX'],
    [`Total Evaluated Students: ${submissions.length}`],
    [`Total Departments Represented: ${departmentStats.length}`],
    ['Benchmark Domain Allocation: 10 Marks per Domain (Total 50 Marks)'],
    ['Generated Date:', new Date().toLocaleString()],
    ['']
  ];

  const headers = [
    'S.No',
    'Department Name',
    'Total Students',
    'Limits & Continuity Avg (/10)',
    'Limits & Continuity (%)',
    'Differentiation Avg (/10)',
    'Differentiation (%)',
    'Integration Avg (/10)',
    'Integration (%)',
    'Probability & Statistics Avg (/10)',
    'Probability & Statistics (%)',
    'Matrices & Determinants Avg (/10)',
    'Matrices & Determinants (%)',
    'Overall Avg Score (/50)',
    'Overall Avg (%)',
    'Strongest Domain',
    'Growth Focus Area',
    'Mastery Students (>=80%)'
  ];

  const rows = departmentStats.map((d, idx) => [
    idx + 1,
    d.department,
    d.studentCount,
    d.calculusAvg,
    `${d.calculusPct}%`,
    d.probabilityAvg,
    `${d.probabilityPct}%`,
    d.numberSystemAvg,
    `${d.numberSystemPct}%`,
    d.trigonometryAvg,
    `${d.trigonometryPct}%`,
    d.statisticsAvg,
    `${d.statisticsPct}%`,
    d.overallAvgScore,
    `${d.overallAvgPercentage}%`,
    d.strongestDomain,
    d.weakestDomain,
    d.masteryCount
  ]);

  // Summary row
  const summaryRow = [
    'TOTAL',
    'All Departments Combined',
    overallDomainStats.totalStudents,
    overallDomainStats.calculusAvg,
    `${Math.round((overallDomainStats.calculusAvg / 10) * 100)}%`,
    overallDomainStats.probabilityAvg,
    `${Math.round((overallDomainStats.probabilityAvg / 10) * 100)}%`,
    overallDomainStats.numberSystemAvg,
    `${Math.round((overallDomainStats.numberSystemAvg / 10) * 100)}%`,
    overallDomainStats.trigonometryAvg,
    `${Math.round((overallDomainStats.trigonometryAvg / 10) * 100)}%`,
    overallDomainStats.statisticsAvg,
    `${Math.round((overallDomainStats.statisticsAvg / 10) * 100)}%`,
    overallDomainStats.overallAvg,
    `${Math.round((overallDomainStats.overallAvg / 50) * 100)}%`,
    '-',
    '-',
    submissions.filter((s) => s.report?.overallPercentage >= 80).length
  ];

  const sheetData = [...titleRows, headers, ...rows, [''], summaryRow];
  const ws = XLSX.utils.aoa_to_sheet(sheetData);
  XLSX.utils.book_append_sheet(wb, ws, 'Department Domain Analysis');

  // Sheet 2: Individual Student Detailed Domain Scores
  const studentHeaders = [
    'S.No',
    'Register Number',
    'Student Name',
    'Department',
    'Limits & Continuity (/10)',
    'Differentiation (/10)',
    'Integration (/10)',
    'Probability & Statistics (/10)',
    'Matrices & Determinants (/10)',
    'Overall Score (/50)',
    'Overall %',
    'Assigned Grade',
    'Date of Assessment'
  ];

  const studentRows = submissions.map((sub, idx) => {
    const sec = sub.report?.sectionScores;
    return [
      idx + 1,
      sub.student?.registerNo || '-',
      sub.student?.name || '-',
      sub.student?.department || '-',
      sec?.calculus?.score ?? 0,
      sec?.probability?.score ?? 0,
      sec?.numberSystem?.score ?? 0,
      sec?.trigonometry?.score ?? 0,
      sec?.statistics?.score ?? 0,
      sub.report?.overallScore ?? 0,
      `${sub.report?.overallPercentage ?? 0}%`,
      `Grade ${calculateGrade(sub.report?.overallPercentage ?? 0).grade}`,
      sub.submittedAt || sub.report?.testTimestamp || '-'
    ];
  });

  const wsStudents = XLSX.utils.aoa_to_sheet([studentHeaders, ...studentRows]);
  XLSX.utils.book_append_sheet(wb, wsStudents, 'Student Domain Breakdown');

  const dateStamp = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `CIT_Department_Domain_Wise_Analysis_${dateStamp}.xlsx`);
}

/**
 * Generates a CSV export for Domain-wise Analysis across each Department
 */
export function downloadDomainWiseDepartmentCsvReport(rawSubmissions: SavedSubmission[]) {
  const submissions = normalizeSubmissionsList(rawSubmissions);
  const { departmentStats, overallDomainStats } = computeDepartmentDomainAnalysis(submissions);

  const headers = [
    'S.No',
    'Department Name',
    'Total Students',
    'Limits & Continuity Avg (/10)',
    'Limits & Continuity %',
    'Differentiation Avg (/10)',
    'Differentiation %',
    'Integration Avg (/10)',
    'Integration %',
    'Probability & Statistics Avg (/10)',
    'Probability & Statistics %',
    'Matrices & Determinants Avg (/10)',
    'Matrices & Determinants %',
    'Overall Avg (/50)',
    'Overall %',
    'Strongest Domain',
    'Growth Focus Area',
    'Mastery Students'
  ];

  const rows = departmentStats.map((d, idx) => [
    idx + 1,
    `"${d.department.replace(/"/g, '""')}"`,
    d.studentCount,
    d.calculusAvg,
    `"${d.calculusPct}%"`,
    d.probabilityAvg,
    `"${d.probabilityPct}%"`,
    d.numberSystemAvg,
    `"${d.numberSystemPct}%"`,
    d.trigonometryAvg,
    `"${d.trigonometryPct}%"`,
    d.statisticsAvg,
    `"${d.statisticsPct}%"`,
    d.overallAvgScore,
    `"${d.overallAvgPercentage}%"`,
    `"${d.strongestDomain}"`,
    `"${d.weakestDomain}"`,
    d.masteryCount
  ]);

  const summaryRow = [
    '"TOTAL"',
    '"All Departments Combined"',
    overallDomainStats.totalStudents,
    overallDomainStats.calculusAvg,
    `"${Math.round((overallDomainStats.calculusAvg / 10) * 100)}%"`,
    overallDomainStats.probabilityAvg,
    `"${Math.round((overallDomainStats.probabilityAvg / 10) * 100)}%"`,
    overallDomainStats.numberSystemAvg,
    `"${Math.round((overallDomainStats.numberSystemAvg / 10) * 100)}%"`,
    overallDomainStats.trigonometryAvg,
    `"${Math.round((overallDomainStats.trigonometryAvg / 10) * 100)}%"`,
    overallDomainStats.statisticsAvg,
    `"${Math.round((overallDomainStats.statisticsAvg / 10) * 100)}%"`,
    overallDomainStats.overallAvg,
    `"${Math.round((overallDomainStats.overallAvg / 50) * 100)}%"`,
    '"-"',
    '"-"',
    submissions.filter((s) => s.report?.overallPercentage >= 80).length
  ];

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(',')), '', summaryRow.join(',')].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const dateStamp = new Date().toISOString().slice(0, 10);
  a.download = `CIT_Department_Domain_Wise_Analysis_${dateStamp}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Generates a PDF Report for Department Domain-wise Cognitive Analysis
 */
export async function downloadDomainWiseDepartmentPdfReport(rawSubmissions: SavedSubmission[]) {
  const submissions = normalizeSubmissionsList(rawSubmissions);
  const { default: jsPDF } = await import('jspdf');
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 12;
  let y = 14;

  const { departmentStats, overallDomainStats } = computeDepartmentDomainAnalysis(submissions);

  // Header Cover Banner
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageWidth, 28, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('COIMBATORE INSTITUTE OF TECHNOLOGY', margin, 10);

  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 229, 255); // primary cyan
  doc.text('DEPARTMENT-WISE DOMAIN COGNITIVE ANALYSIS & BENCHMARK REPORT', margin, 16);

  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text(
    `Autonomous Institution | Total Evaluated Students: ${submissions.length} | Departments: ${departmentStats.length} | Generated: ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`,
    margin,
    22
  );

  y = 33;

  // Domain Legend Box
  doc.setFillColor(241, 245, 249);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(margin, y, pageWidth - 2 * margin, 12, 1.5, 1.5, 'FD');

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('Core Assessment Domains (10 Marks Each / 50 Total Marks):', margin + 3, y + 5);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(
    '1. Limits & Continuity  |  2. Differentiation  |  3. Integration  |  4. Probability & Statistics  |  5. Matrices & Determinants',
    margin + 3,
    y + 9.5
  );

  y += 16;

  // Department Domain Summary Table Header
  doc.setFillColor(30, 41, 59);
  doc.rect(margin, y, pageWidth - 2 * margin, 7, 'F');

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);

  doc.text('S.No', margin + 2, y + 4.8);
  doc.text('Department Name', margin + 11, y + 4.8);
  doc.text('Students', margin + 74, y + 4.8);
  doc.text('Limits & Cont (/10)', margin + 88, y + 4.8);
  doc.text('Differentiation (/10)', margin + 116, y + 4.8);
  doc.text('Integration (/10)', margin + 144, y + 4.8);
  doc.text('Prob & Stat (/10)', margin + 172, y + 4.8);
  doc.text('Matrices & Det (/10)', margin + 200, y + 4.8);
  doc.text('Overall (/50)', margin + 224, y + 4.8);
  doc.text('Top Domain', margin + 248, y + 4.8);

  y += 7;

  // Table Body Rows
  departmentStats.forEach((d, idx) => {
    if (y > pageHeight - 20) {
      doc.addPage();
      y = 15;
      // re-draw header on new page
      doc.setFillColor(30, 41, 59);
      doc.rect(margin, y, pageWidth - 2 * margin, 7, 'F');
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      doc.text('S.No', margin + 2, y + 4.8);
      doc.text('Department Name', margin + 11, y + 4.8);
      doc.text('Students', margin + 74, y + 4.8);
      doc.text('Limits & Cont (/10)', margin + 88, y + 4.8);
      doc.text('Differentiation (/10)', margin + 116, y + 4.8);
      doc.text('Integration (/10)', margin + 144, y + 4.8);
      doc.text('Prob & Stat (/10)', margin + 172, y + 4.8);
      doc.text('Matrices & Det (/10)', margin + 200, y + 4.8);
      doc.text('Overall (/50)', margin + 224, y + 4.8);
      doc.text('Top Domain', margin + 248, y + 4.8);
      y += 7;
    }

    if (idx % 2 === 0) {
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, y, pageWidth - 2 * margin, 6.5, 'F');
    }

    doc.setDrawColor(226, 232, 240);
    doc.line(margin, y + 6.5, pageWidth - margin, y + 6.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(30, 41, 59);

    doc.text(`${idx + 1}`, margin + 2, y + 4.5);
    doc.setFont('helvetica', 'bold');
    doc.text(d.department.slice(0, 34), margin + 11, y + 4.5);

    doc.setFont('helvetica', 'normal');
    doc.text(`${d.studentCount}`, margin + 74, y + 4.5);

    // Limits & Continuity
    doc.text(`${d.calculusAvg} (${d.calculusPct}%)`, margin + 88, y + 4.5);

    // Differentiation
    doc.text(`${d.probabilityAvg} (${d.probabilityPct}%)`, margin + 116, y + 4.5);

    // Integration
    doc.text(`${d.numberSystemAvg} (${d.numberSystemPct}%)`, margin + 144, y + 4.5);

    // Probability & Statistics
    doc.text(`${d.trigonometryAvg} (${d.trigonometryPct}%)`, margin + 172, y + 4.5);

    // Matrices & Determinants
    doc.text(`${d.statisticsAvg} (${d.statisticsPct}%)`, margin + 200, y + 4.5);

    // Overall
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(16, 185, 129); // emerald
    doc.text(`${d.overallAvgScore} (${d.overallAvgPercentage}%)`, margin + 224, y + 4.5);

    // Top Domain
    doc.setTextColor(79, 70, 229); // indigo
    doc.text(d.strongestDomain, margin + 248, y + 4.5);

    y += 6.5;
  });

  // Overall Total Row
  y += 2;
  doc.setFillColor(238, 242, 255); // indigo-50
  doc.setDrawColor(199, 210, 254);
  doc.roundedRect(margin, y, pageWidth - 2 * margin, 7.5, 1, 1, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(30, 27, 75);

  doc.text('INSTITUTIONAL OVERALL AVERAGE:', margin + 4, y + 5);
  doc.text(`${overallDomainStats.totalStudents} total`, margin + 74, y + 5);
  doc.text(`${overallDomainStats.calculusAvg} (${Math.round((overallDomainStats.calculusAvg / 10) * 100)}%)`, margin + 92, y + 5);
  doc.text(`${overallDomainStats.probabilityAvg} (${Math.round((overallDomainStats.probabilityAvg / 10) * 100)}%)`, margin + 118, y + 5);
  doc.text(`${overallDomainStats.numberSystemAvg} (${Math.round((overallDomainStats.numberSystemAvg / 10) * 100)}%)`, margin + 144, y + 5);
  doc.text(`${overallDomainStats.trigonometryAvg} (${Math.round((overallDomainStats.trigonometryAvg / 10) * 100)}%)`, margin + 172, y + 5);
  doc.text(`${overallDomainStats.statisticsAvg} (${Math.round((overallDomainStats.statisticsAvg / 10) * 100)}%)`, margin + 200, y + 5);
  doc.setTextColor(16, 185, 129);
  doc.text(`${overallDomainStats.overallAvg} (${Math.round((overallDomainStats.overallAvg / 50) * 100)}%)`, margin + 224, y + 5);

  // Footer page numbers
  const totalPages = (doc.internal as any).getNumberOfPages ? (doc.internal as any).getNumberOfPages() : 1;
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Coimbatore Institute of Technology | Department-wise Domain Analysis Report | Page ${i} of ${totalPages}`,
      pageWidth / 2,
      pageHeight - 5,
      { align: 'center' }
    );
  }

  const dateStamp = new Date().toISOString().slice(0, 10);
  doc.save(`CIT_Department_Domain_Wise_Analysis_${dateStamp}.pdf`);
}

