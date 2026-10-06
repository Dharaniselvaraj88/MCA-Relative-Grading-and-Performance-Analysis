import React, { useState } from 'react';
import { CognitiveProfileReport, SectionScore, SavedSubmission } from '../types';
import { downloadPdfReport, downloadExcelReport } from '../utils/exportUtils';
import {
  calculateRelativeDomainGrade,
  calculateRelativeOverallGrade,
  formatPercentileOrdinal,
  RELATIVE_GRADING_DISCLAIMER
} from '../utils/relativeGradingUtils';
import { formatDateDisplay } from '../utils/dateUtils';
import { googleSignIn, getAccessToken } from '../utils/googleAuth';
import { createStudentReportSpreadsheet } from '../utils/googleSheetsUtils';
import { normalizeReport } from '../utils/studentDataNormalizer';
import { StudentDomainNormativeAnalytics } from './StudentDomainNormativeAnalytics';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import {
  FileText,
  FileSpreadsheet,
  BarChart3,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ShieldAlert,
  Target,
  ExternalLink,
  Loader2,
  PieChart as PieChartIcon,
  TrendingUp,
  Lightbulb,
  ArrowLeft,
  Printer,
  Info
} from 'lucide-react';

interface CognitiveReportViewProps {
  report: CognitiveProfileReport;
  onRetake: () => void;
  onBackToAdmin?: () => void;
  onBackToFacultyLogin?: () => void;
  allSubmissions?: SavedSubmission[];
}

export const CognitiveReportView: React.FC<CognitiveReportViewProps> = ({
  report: rawReport,
  onRetake,
  onBackToAdmin,
  onBackToFacultyLogin,
  allSubmissions
}) => {
  const report = normalizeReport(rawReport) || rawReport;
  const totalQuestions = report.maxScore || report.detailedItemAnalysis.length || 50;
  const correctCount = report.detailedItemAnalysis.filter(i => i.isCorrect).length;
  const skippedCount = report.detailedItemAnalysis.filter(i => i.userAnswer === null).length;
  const incorrectCount = report.detailedItemAnalysis.length - correctCount - skippedCount;

  const itemAnalysisPieData = [
    { name: 'Correct Answers', value: correctCount, color: '#10B981' },
    { name: 'Incorrect Answers', value: incorrectCount, color: '#EF4444' },
    { name: 'Skipped Questions', value: skippedCount, color: '#64748B' },
  ].filter(item => item.value > 0);

  const sectionPalette = ['#0284C7', '#7C3AED', '#2563EB', '#DB2777', '#059669'];
  const sectionScoresPieData = (Object.values(report.sectionScores) as SectionScore[]).map((sec, idx) => ({
    name: sec.title,
    value: sec.score,
    total: sec.total || 10,
    percentage: sec.percentage,
    color: sectionPalette[idx % sectionPalette.length]
  }));

  // Google Sheets Export State
  const [isExportingSheets, setIsExportingSheets] = useState(false);
  const [sheetsUrl, setSheetsUrl] = useState<string | null>(null);
  const [sheetsError, setSheetsError] = useState<string | null>(null);

  const handleExportGoogleSheets = async () => {
    setIsExportingSheets(true);
    setSheetsError(null);
    try {
      let token = getAccessToken();
      if (!token) {
        const authRes = await googleSignIn();
        token = authRes?.accessToken || null;
      }

      if (!token) {
        throw new Error('Google Authentication required to create Google Sheet.');
      }

      const res = await createStudentReportSpreadsheet(token, report);
      setSheetsUrl(res.spreadsheetUrl);
    } catch (err: any) {
      console.error('Google Sheets Export Error:', err);
      setSheetsError(err.message || 'Failed to export to Google Sheets.');
    } finally {
      setIsExportingSheets(false);
    }
  };

  const getGrade = () => {
    const score = report.overallScore;
    const pct = report.overallPercentage;
    if (score >= 41 || pct >= 82) return 'Grade A+';
    if (score >= 34 || pct >= 68) return 'Grade A';
    if (score >= 25 || pct >= 50) return 'Grade B';
    return 'Grade C';
  };

  return (
    <div className="min-h-[calc(100vh-65px)] bg-slate-50 text-slate-800 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* TOP ACTIONS & BANNER */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 shadow-md relative overflow-hidden">

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-200">
            <div className="flex items-start gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="px-2.5 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded text-[11px] font-semibold">
                    {report.student.department}
                  </span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-sans tracking-tight">
                  Mathematics Competency Assessment Report
                </h1>
                <p className="text-xs text-slate-600 mt-1 font-sans">
                  Student: <strong className="text-slate-900">{report.student.name}</strong> (Register Number: <span className="font-mono font-bold text-slate-900">{report.student.registerNo}</span>) | Assessed: {formatDateDisplay(report.testTimestamp)}
                </p>
              </div>
            </div>

            {/* EXPORT ACTION BUTTONS */}
            <div className="flex flex-wrap items-center gap-3">
              {onBackToAdmin && (
                <button
                  onClick={onBackToAdmin}
                  className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded shadow flex items-center gap-2 transition-all cursor-pointer"
                  title="Return to Evaluated Student Submissions"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>
              )}

              {onBackToFacultyLogin && !onBackToAdmin && (
                <button
                  onClick={onBackToFacultyLogin}
                  className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded shadow flex items-center gap-2 transition-all cursor-pointer"
                  title="Return to Faculty Login Page"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>
              )}

              <button
                onClick={handleExportGoogleSheets}
                disabled={isExportingSheets}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold rounded shadow flex items-center gap-2 transition-all cursor-pointer"
              >
                {isExportingSheets ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Creating Sheet...</span>
                  </>
                ) : (
                  <>
                    <FileSpreadsheet className="w-4 h-4 text-blue-100" />
                    <span>Save to Google Sheets</span>
                  </>
                )}
              </button>

              <button
                onClick={() => window.print()}
                className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded shadow flex items-center gap-2 transition-all cursor-pointer border border-slate-700"
                title="Print Full Assessment Report"
              >
                <Printer className="w-4 h-4 text-amber-400" />
                <span>Print Report</span>
              </button>

              <button
                onClick={() => downloadPdfReport(report)}
                className="px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded border border-slate-300 flex items-center gap-2 transition-all cursor-pointer shadow-sm"
              >
                <FileText className="w-4 h-4 text-rose-600" />
                <span>Export PDF</span>
              </button>

              <button
                onClick={() => downloadExcelReport(report)}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded shadow flex items-center gap-2 transition-all cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Download Excel</span>
              </button>
            </div>
          </div>

          {/* GOOGLE SHEETS NOTIFICATION BANNER */}
          {sheetsUrl && (
            <div className="mt-4 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-sm">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>Google Spreadsheet created in your Google Drive!</span>
              </div>
              <a
                href={sheetsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded flex items-center gap-1.5 shrink-0 transition-all"
              >
                <span>Open Google Sheets</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          )}

          {sheetsError && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded text-red-800 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{sheetsError}</span>
            </div>
          )}

          {/* EXECUTIVE METRICS GRID */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-6">
            
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
              <p className="text-xs font-semibold text-slate-600 mb-1">Overall Assessment Score</p>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-slate-900 font-mono">{report.overallScore}</span>
                <span className="text-sm text-slate-500 font-mono">/ {report.maxScore || 100} ({report.overallPercentage}%)</span>
              </div>
              <div className="w-full bg-slate-200 h-1.5 rounded-full mt-3 overflow-hidden">
                <div className="bg-blue-600 h-full" style={{ width: `${report.overallPercentage}%` }} />
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-slate-600">Grade Secured (Norm-Referenced)</p>
                <span className="text-[10px] font-mono text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded">
                  College-wide Relative
                </span>
              </div>
              {(() => {
                const relGrade = calculateRelativeOverallGrade(
                  report.overallScore,
                  allSubmissions || [],
                  report.student.department
                );
                return (
                  <div className="space-y-1.5">
                    <div className="flex items-baseline gap-2">
                      <span className={`text-3xl font-extrabold font-mono ${
                        relGrade.grade === 'A' ? 'text-emerald-600' : relGrade.grade === 'B' ? 'text-blue-600' : 'text-amber-600'
                      }`}>
                        Grade {relGrade.grade}
                      </span>
                      <span className="text-xs font-bold text-slate-600 font-mono">({relGrade.title})</span>
                    </div>

                    {/* Supplementary Context: College percentile vs Department percentile */}
                    <div className="text-[11px] font-mono font-bold text-slate-700 bg-white p-1.5 rounded border border-slate-200">
                      College percentile: <span className="text-indigo-700">{formatPercentileOrdinal(relGrade.collegePercentile)}</span>
                      <span className="text-slate-400 mx-1.5">|</span>
                      Department percentile: <span className="text-emerald-700">{formatPercentileOrdinal(relGrade.deptPercentile)}</span>
                    </div>

                    {/* Cutoffs */}
                    <p className="text-[10px] text-slate-500 font-mono">
                      Cutoffs: Grade A &ge; {relGrade.cutoffs.gradeACutoff} | Grade B &ge; {relGrade.cutoffs.gradeBCutoff}
                    </p>

                    {/* Small sample warning */}
                    {relGrade.cutoffs.isSmallSample && (
                      <p className="text-[10px] font-medium text-amber-700 bg-amber-50 p-1 rounded border border-amber-200">
                        ⚠️ Fewer than 10 students college-wide ({relGrade.cutoffs.totalCollegeStudents}). Percentile cutoffs may be unreliable.
                      </p>
                    )}

                    {/* Required Short Note */}
                    <p className="text-[10px] text-slate-400 italic">
                      {RELATIVE_GRADING_DISCLAIMER}
                    </p>
                  </div>
                );
              })()}
            </div>

          </div>

        </div>

        {/* PIE CHARTS PERFORMANCE DASHBOARD */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-md space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-2">
            <div>
              <div className="flex items-center gap-2">
                <PieChartIcon className="w-5 h-5 text-cyan-600" />
                <h2 className="text-lg font-bold font-sans text-slate-900">
                  Assessment Performance Visual Breakdown
                </h2>
              </div>
              <p className="text-xs text-slate-600 mt-0.5">
                Multi-dimensional cognitive distribution pie charts for student {report.student.name} (Register Number: {report.student.registerNo})
              </p>
            </div>
            <span className="px-3 py-1 bg-cyan-50 text-cyan-700 border border-cyan-200 rounded text-xs font-semibold self-start sm:self-auto">
              Interactive Pie Chart Analysis
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* Pie Chart 1: Itemized Answer Accuracy */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col items-center">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-1 text-center">
                Answer Evaluation
              </h3>
              <p className="text-[11px] text-slate-500 mb-3 text-center">Correct vs Incorrect vs Skipped</p>
              
              <div className="w-full h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={itemAnalysisPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={42}
                      outerRadius={68}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {itemAnalysisPieData.map((entry, index) => (
                        <Cell key={`cell-item-${index}`} fill={entry.color} stroke="#FFFFFF" strokeWidth={2} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#E2E8F0', borderRadius: '8px', color: '#0F172A', fontSize: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                      formatter={(val: any, name: any) => [`${val} Questions (${Math.round((Number(val)/totalQuestions)*100)}%)`, name]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="w-full space-y-1.5 pt-2 text-[11px]">
                {itemAnalysisPieData.map((item, i) => (
                  <div key={i} className="flex items-center justify-between text-slate-700 bg-white p-1.5 rounded border border-slate-200">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                      <span>{item.name}</span>
                    </div>
                    <span className="font-mono font-bold text-slate-900">{item.value} ({Math.round((item.value/totalQuestions)*100)}%)</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Pie Chart 2: Sectional Score Contribution */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col items-center">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-1 text-center">
                Sectional Skill Weightage
              </h3>
              <p className="text-[11px] text-slate-500 mb-3 text-center">5 Cognitive Skill Domains</p>
              
              <div className="w-full h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={sectionScoresPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={42}
                      outerRadius={68}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {sectionScoresPieData.map((entry, index) => (
                        <Cell key={`cell-sec-${index}`} fill={entry.color} stroke="#FFFFFF" strokeWidth={2} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#E2E8F0', borderRadius: '8px', color: '#0F172A', fontSize: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                      formatter={(val: any, name: any) => [`${val}/10 Marks`, name]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="w-full space-y-1.5 pt-1 text-[11px]">
                {(Object.values(report.sectionScores) as SectionScore[]).map((sec, i) => {
                  const relGrade = calculateRelativeDomainGrade(
                    sec.score,
                    sec.sectionId,
                    allSubmissions || [],
                    report.student.department
                  );

                  return (
                    <div key={i} className="flex items-center justify-between text-slate-700 bg-white p-1.5 rounded-lg border border-slate-200 shadow-xs">
                      <div className="flex items-center gap-1.5 truncate max-w-[145px]">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: sectionPalette[i % sectionPalette.length] }} />
                        <span className="truncate font-medium text-slate-800">{sec.title}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-slate-900">{sec.score}/10</span>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border font-mono ${relGrade.badgeBg} ${relGrade.badgeText} ${relGrade.badgeBorder}`}>
                          Grade {relGrade.grade}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        </div>

        {/* SECTION 1: SECTIONAL COGNITIVE PERFORMANCE & LEVEL MASTERY */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* Left 7 cols: Sectional Scores Breakdown */}
          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 shadow-md space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-200 gap-1">
              <div>
                <h2 className="text-base font-bold text-slate-900 font-sans flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-blue-600" />
                  1. Sectional Cognitive Performance (Norm-Referenced)
                </h2>
                <p className="text-[11px] text-slate-500 mt-0.5 italic">
                  {RELATIVE_GRADING_DISCLAIMER}
                </p>
              </div>
              <span className="text-[10px] font-mono font-semibold px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded self-start sm:self-auto">
                A: First 25% • B: Next 40% • C: Last 35%
              </span>
            </div>

            <div className="space-y-4">
              {(Object.values(report.sectionScores) as SectionScore[]).map((sec) => {
                const relGrade = calculateRelativeDomainGrade(
                  sec.score,
                  sec.sectionId,
                  allSubmissions || [],
                  report.student.department
                );

                const progressBarColor =
                  relGrade.grade === 'A'
                    ? 'bg-emerald-500'
                    : relGrade.grade === 'B'
                    ? 'bg-blue-600'
                    : 'bg-rose-500';

                return (
                  <div key={sec.sectionId} className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-2.5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">{sec.title}</span>
                        <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold border ${relGrade.badgeBg} ${relGrade.badgeText} ${relGrade.badgeBorder}`}>
                          Grade {relGrade.grade}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 font-mono text-sm">{sec.score} / 10</span>
                        <span className="text-xs font-semibold text-slate-500 font-mono">({sec.percentage}%)</span>
                      </div>
                    </div>

                    {/* SUPPLEMENTARY CONTEXT: College percentile vs Department percentile */}
                    <div className="text-[11px] font-mono text-slate-700 bg-white p-2 rounded border border-slate-200 flex flex-wrap items-center justify-between gap-1 shadow-2xs">
                      <div>
                        <span className="font-semibold text-slate-600">Grade: </span>
                        <strong className="text-slate-900">{relGrade.grade}</strong>{' '}
                        <span className="text-indigo-700 font-bold">(College percentile: {formatPercentileOrdinal(relGrade.collegePercentile)})</span>
                        <span className="text-slate-400 mx-1.5 font-normal">|</span>
                        <span className="text-emerald-700 font-bold">Department percentile: {formatPercentileOrdinal(relGrade.deptPercentile)}</span>
                      </div>
                      <span className="text-[10px] text-slate-500 font-medium bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200">
                        Cutoffs: A &ge; {relGrade.cutoffs.gradeACutoff} | B &ge; {relGrade.cutoffs.gradeBCutoff}
                      </span>
                    </div>

                    {/* Small sample warning if fewer than 10 students */}
                    {relGrade.cutoffs.isSmallSample && (
                      <div className="text-[10px] text-amber-700 bg-amber-50 p-1.5 rounded border border-amber-200 flex items-center gap-1.5">
                        <AlertTriangle className="w-3 h-3 shrink-0 text-amber-600" />
                        <span>Fewer than 10 students college-wide ({relGrade.cutoffs.totalCollegeStudents}). Percentile cutoffs may be unreliable.</span>
                      </div>
                    )}

                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                      <div
                        className={`${progressBarColor} h-full rounded-full transition-all duration-300`}
                        style={{ width: `${sec.percentage}%` }}
                      />
                    </div>

                    {/* Level 1, Level 2, Level 3 breakdown indicators */}
                    <div className="grid grid-cols-3 gap-2 pt-1 text-[11px] font-mono text-slate-600">
                      <div className="bg-white p-1.5 rounded text-center border border-slate-200">
                        Level 1 (40%): <strong className="text-emerald-600">{sec.easyScore}/4</strong>
                      </div>
                      <div className="bg-white p-1.5 rounded text-center border border-slate-200">
                        Level 2 (30%): <strong className="text-amber-600">{sec.mediumScore}/3</strong>
                      </div>
                      <div className="bg-white p-1.5 rounded text-center border border-slate-200">
                        Level 3 (30%): <strong className="text-rose-600">{sec.hardScore}/3</strong>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right 5 cols: Level Mastery */}
          <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 shadow-md space-y-5 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="pb-3 border-b border-slate-200">
                <h2 className="text-base font-bold text-slate-900 font-sans flex items-center gap-2">
                  <Target className="w-5 h-5 text-indigo-600" />
                  2. Level Mastery (40%-30%-30%)
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Overall accuracy categorized by assessment question levels.
                </p>
              </div>

              {/* Level 1 */}
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-emerald-700 font-bold flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    Level 1 Questions (40%)
                  </span>
                  <span className="font-bold text-slate-900 font-mono">{report.difficultyBreakdown.easy.score} / {report.difficultyBreakdown.easy.total || 20} ({report.difficultyBreakdown.easy.accuracy}%)</span>
                </div>
                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-full" style={{ width: `${report.difficultyBreakdown.easy.accuracy}%` }} />
                </div>
              </div>

              {/* Level 2 */}
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-amber-700 font-bold flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                    Level 2 Questions (30%)
                  </span>
                  <span className="font-bold text-slate-900 font-mono">{report.difficultyBreakdown.medium.score} / {report.difficultyBreakdown.medium.total || 15} ({report.difficultyBreakdown.medium.accuracy}%)</span>
                </div>
                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                  <div className="bg-amber-500 h-full" style={{ width: `${report.difficultyBreakdown.medium.accuracy}%` }} />
                </div>
              </div>

              {/* Level 3 */}
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-rose-700 font-bold flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                    Level 3 Questions (30%)
                  </span>
                  <span className="font-bold text-slate-900 font-mono">{report.difficultyBreakdown.hard.score} / {report.difficultyBreakdown.hard.total || 15} ({report.difficultyBreakdown.hard.accuracy}%)</span>
                </div>
                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                  <div className="bg-rose-500 h-full" style={{ width: `${report.difficultyBreakdown.hard.accuracy}%` }} />
                </div>
              </div>
            </div>

          </div>

        </div>

        {/* NORMATIVE STANDINGS: DOMAIN Z-SCORES, PERCENTILES & RADAR PROFILE */}
        <StudentDomainNormativeAnalytics
          report={report}
          allSubmissions={allSubmissions}
        />

        {/* STUDENT DIAGNOSTIC FEEDBACK: SWOT ANALYSIS */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 shadow-md space-y-6">
          <div className="pb-4 border-b border-slate-200">
            <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">Student Performance Diagnostic</span>
            <h2 className="text-xl font-bold font-sans text-slate-900 mt-0.5 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
              SWOT Analysis
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

            {/* Strengths (S) */}
            <div className="bg-slate-50 border border-emerald-200 rounded-xl p-5 space-y-3.5 shadow-sm">
              <div className="flex items-center gap-2 pb-2 border-b border-emerald-200 text-emerald-700">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Strengths (S)</h3>
              </div>
              <ul className="space-y-2.5 text-xs text-slate-700">
                {(report.studentFeedback?.strengths || []).map((str, i) => (
                  <li key={i} className="flex items-start gap-2 bg-emerald-50/70 p-2.5 rounded border border-emerald-200/60">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 shrink-0 mt-1.5" />
                    <span className="leading-relaxed">{str}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Weaknesses (W) */}
            <div className="bg-slate-50 border border-rose-200 rounded-xl p-5 space-y-3.5 shadow-sm">
              <div className="flex items-center gap-2 pb-2 border-b border-rose-200 text-rose-700">
                <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Weaknesses (W)</h3>
              </div>
              <ul className="space-y-2.5 text-xs text-slate-700">
                {(report.studentFeedback?.weaknesses || []).map((wk, i) => (
                  <li key={i} className="flex items-start gap-2 bg-rose-50/70 p-2.5 rounded border border-rose-200/60">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-600 shrink-0 mt-1.5" />
                    <span className="leading-relaxed">{wk}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Opportunities (O) */}
            <div className="bg-slate-50 border border-blue-200 rounded-xl p-5 space-y-3.5 shadow-sm">
              <div className="flex items-center gap-2 pb-2 border-b border-blue-200 text-blue-700">
                <Lightbulb className="w-5 h-5 text-blue-600 shrink-0" />
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Opportunities (O)</h3>
              </div>
              <ul className="space-y-2.5 text-xs text-slate-700">
                {((report.studentFeedback?.opportunities && report.studentFeedback.opportunities.length > 0)
                  ? report.studentFeedback.opportunities
                  : (report.studentFeedback?.suggestions && report.studentFeedback.suggestions.length > 0)
                    ? report.studentFeedback.suggestions
                    : [
                        "Leverage strong core topics to explore advanced quantitative research and specialized electives.",
                        "Participate in timed mock assessments to enhance speed and analytical precision."
                      ]
                ).map((opp, i) => (
                  <li key={i} className="flex items-start gap-2 bg-blue-50/70 p-2.5 rounded border border-blue-200/60">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0 mt-1.5" />
                    <span className="leading-relaxed">{opp}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Threats (T) */}
            <div className="bg-slate-50 border border-amber-200 rounded-xl p-5 space-y-3.5 shadow-sm">
              <div className="flex items-center gap-2 pb-2 border-b border-amber-200 text-amber-700">
                <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0" />
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Threats (T)</h3>
              </div>
              <ul className="space-y-2.5 text-xs text-slate-700">
                {((report.studentFeedback?.threats && report.studentFeedback.threats.length > 0)
                  ? report.studentFeedback.threats
                  : (() => {
                      const items: string[] = [];
                      const unattempted = report.detailedItemAnalysis.filter(q => q.userAnswer === null).length;
                      if (unattempted > 0) {
                        items.push(`Pacing Risk: ${unattempted} questions left unattempted reduce total achievable score.`);
                      }
                      if (report.difficultyBreakdown.hard.accuracy < 50) {
                        items.push(`Level 3 Question Vulnerability: Low accuracy (${report.difficultyBreakdown.hard.accuracy}%) on complex items.`);
                      }
                      if (items.length === 0) {
                        items.push("Avoidable Errors: Maintain careful double-checking discipline to prevent calculation slips.");
                        items.push("Time Pressure: Ensure steady pacing across all sections during timed assessments.");
                      }
                      return items;
                    })()
                ).map((thr, i) => (
                  <li key={i} className="flex items-start gap-2 bg-amber-50/70 p-2.5 rounded border border-amber-200/60">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-600 shrink-0 mt-1.5" />
                    <span className="leading-relaxed">{thr}</span>
                  </li>
                ))}
              </ul>
            </div>

          </div>
        </div>

        {/* SECTION 4: ITEMIZED 50 QUESTIONS RESPONSE SHEET */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-md space-y-5">
          <div className="pb-4 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold font-sans text-slate-900">Itemized 50-Question Response Sheet</h2>
              <p className="text-xs text-slate-500 mt-0.5">Detailed evaluation key for student verification.</p>
            </div>
            <button
              onClick={() => downloadExcelReport(report)}
              className="text-xs font-mono text-blue-600 hover:underline flex items-center gap-1 cursor-pointer font-bold"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Download Excel
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-sans border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 border-b border-slate-200">
                  <th className="p-3">Q#</th>
                  <th className="p-3">Section</th>
                  <th className="p-3">Level</th>
                  <th className="p-3 font-sans">Question Prompt</th>
                  <th className="p-3">User Choice</th>
                  <th className="p-3">Correct Answer</th>
                  <th className="p-3">Result</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {report.detailedItemAnalysis.map((item, idx) => (
                  <tr key={item.questionId} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3 text-slate-700 font-bold font-mono">{idx + 1}</td>
                    <td className="p-3 text-blue-700 font-mono font-semibold">{item.sectionId.substring(0, 3).toUpperCase()}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        item.difficulty === 'easy' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                        item.difficulty === 'medium' ? 'bg-amber-100 text-amber-800 border border-amber-200' : 'bg-rose-100 text-rose-800 border border-rose-200'
                      }`}>
                        {item.difficulty === 'easy' ? 'LEVEL 1' : item.difficulty === 'medium' ? 'LEVEL 2' : 'LEVEL 3'}
                      </span>
                    </td>
                    <td className="p-3 text-slate-800 max-w-xs truncate">{item.questionText}</td>
                    <td className="p-3 text-slate-700">
                      {item.userAnswer !== null ? `Option ${String.fromCharCode(65 + item.userAnswer)}` : 'Skipped'}
                    </td>
                    <td className="p-3 text-blue-700 font-bold">
                      Option {String.fromCharCode(65 + item.correctAnswer)}
                    </td>
                    <td className="p-3">
                      {item.isCorrect ? (
                        <span className="text-emerald-700 font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Correct
                        </span>
                      ) : (
                        <span className="text-rose-700 flex items-center gap-1 font-semibold">
                          <XCircle className="w-3.5 h-3.5 text-rose-600" /> {item.userAnswer === null ? 'Skipped' : 'Incorrect'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Bottom Back Button */}
        {(onBackToAdmin || onBackToFacultyLogin) && (
          <div className="flex justify-end pt-4 border-t border-slate-200">
            <button
              onClick={onBackToAdmin || onBackToFacultyLogin}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow flex items-center gap-2 transition-all cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
