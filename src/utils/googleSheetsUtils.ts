import { CognitiveProfileReport, SavedSubmission } from '../types';
import { calculateGrade, extractStudentDomainGrades, formatDuration, getStudentSwotAnalysis } from './exportUtils';
import { normalizeReport, normalizeSubmissionsList } from './studentDataNormalizer';

export interface GoogleSheetsExportResult {
  spreadsheetId: string;
  spreadsheetUrl: string;
}

/**
 * Creates a formatted Google Spreadsheet for a single student's Cognitive Profile Report.
 */
export async function createStudentReportSpreadsheet(
  accessToken: string,
  rawReport: CognitiveProfileReport
): Promise<GoogleSheetsExportResult> {
  const report = normalizeReport(rawReport) || rawReport;
  const title = `CIT Mathematics Competency Assessment - ${report.student.name} (${report.student.registerNo})`;

  // 1. Create Spreadsheet with 3 sheets
  const createResponse = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: { title },
      sheets: [
        { properties: { title: 'Summary Profile' } },
        { properties: { title: 'Sectional Metrics' } },
        { properties: { title: '50 Qs Answer Sheet' } },
      ],
    }),
  });

  if (!createResponse.ok) {
    const err = await createResponse.json();
    throw new Error(err.error?.message || 'Failed to create Google Spreadsheet.');
  }

  const spreadsheet = await createResponse.json();
  const spreadsheetId = spreadsheet.spreadsheetId;
  const spreadsheetUrl = spreadsheet.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

  const gradeObj = calculateGrade(report.overallPercentage);

  // 2. Prepare Data for Sheet 1: Summary Profile
  const summaryValues = [
    ['COIMBATORE INSTITUTE OF TECHNOLOGY (AUTONOMOUS)'],
    ['MATHEMATICS COMPETENCY ASSESSMENT REPORT - GOOGLE SHEETS SYNC'],
    [''],
    ['Student Name', report.student.name],
    ['Register Number', report.student.registerNo],
    ['Department', report.student.department],
    ['Assessment Timestamp', report.testTimestamp],
    ['Duration Taken', formatDuration(report.totalDurationSeconds)],
    ['Overall Score', `${report.overallScore} / ${report.maxScore}`],
    ['Overall Percentage', `${report.overallPercentage}%`],
    ['Grade Secured', `Grade ${gradeObj.grade} (${gradeObj.title})`],
    ['Grade Benchmark Range', gradeObj.description],
    ['Logic Index (100)', report.cognitionLevel.logicPurity],
    ['Speed-Accuracy Factor', report.cognitionLevel.speedAccuracyFactor],
    ['Archetype', report.personalityProfile.archetype],
    ['Primary Behavioral Trait', report.personalityProfile.primaryTrait],
    [''],
    ['DIFFICULTY MASTERY BREAKDOWN'],
    ['Difficulty Level', 'Questions Count', 'Score Obtained', 'Accuracy Percentage'],
    ['Level 1 (Foundation - 40%)', report.difficultyBreakdown.easy.total, report.difficultyBreakdown.easy.score, `${report.difficultyBreakdown.easy.accuracy}%`],
    ['Level 2 (Application - 30%)', report.difficultyBreakdown.medium.total, report.difficultyBreakdown.medium.score, `${report.difficultyBreakdown.medium.accuracy}%`],
    ['Level 3 (Synthesis - 30%)', report.difficultyBreakdown.hard.total, report.difficultyBreakdown.hard.score, `${report.difficultyBreakdown.hard.accuracy}%`],
  ];

  // 3. Prepare Data for Sheet 2: Sectional Metrics
  const sectionHeaders = [
    'Section ID',
    'Section Title',
    'Total Score',
    'Percentage',
    'Grade Secured',
    'Level 1 Score (/4)',
    'Level 2 Score (/3)',
    'Level 3 Score (/3)',
    'Avg Time / Question (sec)',
  ];

  const sectionRows = Object.values(report.sectionScores).map((sec) => {
    const secPct = sec.percentage;
    const secGrade = secPct >= 80 ? 'Grade A' : secPct >= 50 ? 'Grade B' : 'Grade C';
    return [
      sec.sectionId.toUpperCase(),
      sec.title,
      `${sec.score} / ${sec.total}`,
      `${sec.percentage}%`,
      secGrade,
      `${sec.easyScore} / 3`,
      `${sec.mediumScore} / 3`,
      `${sec.hardScore} / 4`,
      `${sec.avgTimePerQuestion}s`,
    ];
  });

  const sectionValues = [sectionHeaders, ...sectionRows];

  // 4. Prepare Data for Sheet 3: 50 Qs Answer Sheet
  const itemHeaders = [
    'Q.No',
    'Section ID',
    'Difficulty',
    'Question Prompt',
    'Student Selected Option',
    'Correct Option',
    'Evaluation Result',
    'Time Spent (sec)',
  ];

  const itemRows = report.detailedItemAnalysis.map((item, idx) => [
    idx + 1,
    item.sectionId.toUpperCase(),
    item.difficulty.toUpperCase(),
    item.questionText,
    item.userAnswer !== null ? `Option ${String.fromCharCode(65 + item.userAnswer)}` : 'Unanswered',
    `Option ${String.fromCharCode(65 + item.correctAnswer)}`,
    item.isCorrect ? 'CORRECT' : item.userAnswer === null ? 'SKIPPED' : 'INCORRECT',
    item.timeSpent,
  ]);

  const itemValues = [itemHeaders, ...itemRows];

  // 5. Populate Data via batchUpdate
  const updateResponse = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        valueInputOption: 'USER_ENTERED',
        data: [
          { range: "'Summary Profile'!A1", majorDimension: 'ROWS', values: summaryValues },
          { range: "'Sectional Metrics'!A1", majorDimension: 'ROWS', values: sectionValues },
          { range: "'50 Qs Answer Sheet'!A1", majorDimension: 'ROWS', values: itemValues },
        ],
      }),
    }
  );

  if (!updateResponse.ok) {
    const err = await updateResponse.json();
    throw new Error(err.error?.message || 'Failed to populate Google Sheet values.');
  }

  return { spreadsheetId, spreadsheetUrl };
}

/**
 * Creates a Master Assessment Records Google Spreadsheet for Faculty/Admin containing all candidate submissions.
 */
export async function createMasterSubmissionsSpreadsheet(
  accessToken: string,
  rawSubmissions: SavedSubmission[]
): Promise<GoogleSheetsExportResult> {
  const submissions = normalizeSubmissionsList(rawSubmissions);
  const title = `CIT Master Mathematics Assessment Records - ${new Date().toISOString().slice(0, 10)}`;

  const createResponse = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: { title },
      sheets: [
        { properties: { title: 'Complete Master Roster' } },
        { properties: { title: 'Domainwise Grade Analysis' } },
        { properties: { title: 'SWOT Diagnostic Matrix' } },
        { properties: { title: 'Department Analytics' } },
      ],
    }),
  });

  if (!createResponse.ok) {
    const err = await createResponse.json();
    throw new Error(err.error?.message || 'Failed to create Master Google Spreadsheet.');
  }

  const spreadsheet = await createResponse.json();
  const spreadsheetId = spreadsheet.spreadsheetId;
  const spreadsheetUrl = spreadsheet.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

  // 1. Master Roster
  const rosterHeaders = [
    'S.No',
    'Register Number',
    'Student Name',
    'Department / Program',
    'Marks Secured (/50)',
    'Percentage (%)',
    'Grade Secured',
    'Grade Description',
    'Grade Benchmark Range',
    'Logic Index (/100)',
    'Speed-Accuracy Factor',
    'Duration Taken',
    'Assessment Date & Time',
    'Security / Lockout Status',
    'Strengths (SWOT - S)',
    'Weaknesses (SWOT - W)',
    'Opportunities (SWOT - O)',
    'Threats (SWOT - T)',
  ];

  const rosterRows = submissions.map((sub, idx) => {
    const gradeObj = calculateGrade(sub.report?.overallPercentage || 0);
    const swot = getStudentSwotAnalysis(sub);

    return [
      idx + 1,
      sub.student.registerNo,
      sub.student.name,
      sub.student.department,
      sub.report.overallScore,
      `${sub.report.overallPercentage}%`,
      `Grade ${gradeObj.grade}`,
      gradeObj.title,
      gradeObj.description,
      sub.report.cognitionLevel.logicPurity,
      sub.report.cognitionLevel.speedAccuracyFactor,
      formatDuration(sub.report.totalDurationSeconds),
      sub.submittedAt || sub.report.testTimestamp,
      sub.isLockedOut ? 'LOCKED OUT' : 'NORMAL',
      swot.strengths.join(' | '),
      swot.weaknesses.join(' | '),
      swot.opportunities.join(' | '),
      swot.threats.join(' | '),
    ];
  });

  const rosterValues = [
    ['COIMBATORE INSTITUTE OF TECHNOLOGY (AUTONOMOUS)'],
    ['MASTER STUDENT EVALUATION ROSTER'],
    ['Grading Standards: Grade A (Above 80%) | Grade B (50%-80%) | Grade C (Below 50%)'],
    [''],
    rosterHeaders,
    ...rosterRows,
  ];

  // 2. Domainwise Grade Analysis
  const domainHeaders = [
    'S.No',
    'Register Number',
    'Student Name',
    'Department',
    'Limits & Continuity (/10)',
    'Limits & Continuity (%)',
    'Limits & Continuity Grade',
    'Differentiation (/10)',
    'Differentiation (%)',
    'Differentiation Grade',
    'Integration (/10)',
    'Integration (%)',
    'Integration Grade',
    'Probability & Statistics (/10)',
    'Probability & Statistics (%)',
    'Probability & Statistics Grade',
    'Matrices & Determinants (/10)',
    'Matrices & Determinants (%)',
    'Matrices & Determinants Grade',
    'Total Score (/50)',
    'Overall Percentage (%)',
    'Grade Secured',
    'Dominant Domain',
    'Focus Domain'
  ];

  const domainRows = submissions.map((sub, idx) => {
    const d = extractStudentDomainGrades(sub);
    const overallPct = sub.report?.overallPercentage || 0;
    const overallGrade = calculateGrade(overallPct);

    return [
      idx + 1,
      sub.student.registerNo,
      sub.student.name,
      sub.student.department,
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
      `${sub.report?.overallScore || 0}/50`,
      `${overallPct}%`,
      `Grade ${overallGrade.grade}`,
      d.dominantDomain,
      d.growthDomain
    ];
  });

  const domainValues = [
    ['COIMBATORE INSTITUTE OF TECHNOLOGY (AUTONOMOUS)'],
    ['DOMAINWISE GRADE ANALYSIS FOR EVALUATED CANDIDATES'],
    ['Domain Grades: Grade A (>=80% / 8-10 Marks) | Grade B (50%-79% / 5-7 Marks) | Grade C (<50% / 0-4 Marks)'],
    [''],
    domainHeaders,
    ...domainRows
  ];

  // 3. SWOT Diagnostic Matrix
  const swotHeaders = [
    'S.No',
    'Register Number',
    'Student Name',
    'Department',
    'Score (/50)',
    'Percentage (%)',
    'Grade Secured',
    'Grade Benchmark Range',
    'Strengths (S)',
    'Weaknesses (W)',
    'Opportunities (O)',
    'Threats (T)'
  ];

  const swotRows = submissions.map((sub, idx) => {
    const swot = getStudentSwotAnalysis(sub);
    const overallPct = sub.report?.overallPercentage || 0;
    const gradeObj = calculateGrade(overallPct);

    return [
      idx + 1,
      sub.student.registerNo,
      sub.student.name,
      sub.student.department,
      `${sub.report?.overallScore || 0}/50`,
      `${overallPct}%`,
      `Grade ${gradeObj.grade}`,
      gradeObj.description,
      swot.strengths.join(' | '),
      swot.weaknesses.join(' | '),
      swot.opportunities.join(' | '),
      swot.threats.join(' | ')
    ];
  });

  const swotValues = [
    ['COIMBATORE INSTITUTE OF TECHNOLOGY (AUTONOMOUS)'],
    ['STUDENT SWOT ANALYSIS & DIAGNOSTIC MATRIX'],
    [''],
    swotHeaders,
    ...swotRows
  ];

  // 4. Department Analytics
  const deptMap: Record<string, { count: number; totalScore: number; gradeA: number; gradeB: number; gradeC: number }> = {};
  submissions.forEach((sub) => {
    const dept = sub.student.department || 'Unspecified';
    if (!deptMap[dept]) {
      deptMap[dept] = { count: 0, totalScore: 0, gradeA: 0, gradeB: 0, gradeC: 0 };
    }
    deptMap[dept].count += 1;
    deptMap[dept].totalScore += sub.report.overallScore;
    const g = calculateGrade(sub.report.overallPercentage).grade;
    if (g === 'A') deptMap[dept].gradeA += 1;
    else if (g === 'B') deptMap[dept].gradeB += 1;
    else deptMap[dept].gradeC += 1;
  });

  const deptHeaders = [
    'Department Name',
    'Total Students',
    'Grade A (Above 80%)',
    'Grade B (50%-80%)',
    'Grade C (Below 50%)',
    'Pass Percentage (%)',
    'Average Score (/50)',
    'Average Percentage (%)'
  ];

  const deptRows = Object.entries(deptMap).map(([dept, data]) => {
    const avgScore = (data.totalScore / data.count).toFixed(1);
    const avgPct = ((data.totalScore / (data.count * 50)) * 100).toFixed(1);
    const passPct = (((data.gradeA + data.gradeB) / data.count) * 100).toFixed(1);
    return [
      dept,
      data.count,
      `${data.gradeA} (${Math.round((data.gradeA / data.count) * 100)}%)`,
      `${data.gradeB} (${Math.round((data.gradeB / data.count) * 100)}%)`,
      `${data.gradeC} (${Math.round((data.gradeC / data.count) * 100)}%)`,
      `${passPct}%`,
      avgScore,
      `${avgPct}%`
    ];
  });

  const deptValues = [
    ['COIMBATORE INSTITUTE OF TECHNOLOGY (AUTONOMOUS)'],
    ['DEPARTMENT-WISE GRADE & COGNITIVE EVALUATION SUMMARY'],
    [''],
    deptHeaders,
    ...deptRows,
  ];

  const updateResponse = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        valueInputOption: 'USER_ENTERED',
        data: [
          { range: "'Complete Master Roster'!A1", majorDimension: 'ROWS', values: rosterValues },
          { range: "'Domainwise Grade Analysis'!A1", majorDimension: 'ROWS', values: domainValues },
          { range: "'SWOT Diagnostic Matrix'!A1", majorDimension: 'ROWS', values: swotValues },
          { range: "'Department Analytics'!A1", majorDimension: 'ROWS', values: deptValues },
        ],
      }),
    }
  );

  if (!updateResponse.ok) {
    const err = await updateResponse.json();
    throw new Error(err.error?.message || 'Failed to populate Master Google Sheet values.');
  }

  return { spreadsheetId, spreadsheetUrl };
}
