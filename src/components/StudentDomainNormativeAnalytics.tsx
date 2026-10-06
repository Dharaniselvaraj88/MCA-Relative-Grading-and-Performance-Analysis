import React, { useMemo, useState } from 'react';
import { CognitiveProfileReport, SavedSubmission, SectionId } from '../types';
import { SECTION_METADATA } from '../data/questionsData';
import { Award, TrendingUp, BarChart3, Info, Sparkles, Compass } from 'lucide-react';

interface StudentDomainNormativeAnalyticsProps {
  report: CognitiveProfileReport;
  allSubmissions?: SavedSubmission[];
}

interface DomainNormativeRow {
  domainId: SectionId;
  domainName: string;
  studentScore: number;
  deptMean: number;
  deptSd: number;
  deptZScore: number | null;
  deptPercentile: number;
  collegeMean: number;
  collegeSd: number;
  collegeZScore: number | null;
  collegePercentile: number;
}

function formatOrdinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function formatZScore(z: number | null): string {
  if (z === null || isNaN(z)) return 'N/A';
  return (z >= 0 ? `+${z.toFixed(1)}` : z.toFixed(1));
}

function getZScoreColorClass(z: number | null): string {
  if (z === null || isNaN(z)) {
    return 'bg-slate-100 text-slate-500 border-slate-200';
  }
  if (z >= 1.0) {
    return 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold';
  }
  if (z <= -1.0) {
    return 'bg-rose-100 text-rose-800 border-rose-300 font-bold';
  }
  // -1.0 < z < 1.0
  return 'bg-amber-100 text-amber-800 border-amber-300 font-bold';
}

/**
 * Calculates normative performance inference based on Z-score:
 * - z >= +2.0        -> Exceptional
 * - +1.0 to +2.0     -> Strong
 * - -1.0 to +1.0     -> Average/typical
 * - -2.0 to -1.0     -> Weak
 * - z <= -2.0        -> Requires Attention
 */
export function getZScoreInference(z: number | null): {
  label: string;
  badgeClass: string;
  dotColor: string;
} {
  if (z === null || isNaN(z)) {
    return {
      label: 'Average/typical',
      badgeClass: 'bg-slate-100 text-slate-700 border-slate-300',
      dotColor: 'bg-slate-400'
    };
  }
  if (z >= 2.0) {
    return {
      label: 'Exceptional',
      badgeClass: 'bg-emerald-100 text-emerald-900 border-emerald-300 font-bold',
      dotColor: 'bg-emerald-600'
    };
  }
  if (z >= 1.0) {
    return {
      label: 'Strong',
      badgeClass: 'bg-teal-100 text-teal-900 border-teal-300 font-bold',
      dotColor: 'bg-teal-600'
    };
  }
  if (z > -1.0) {
    return {
      label: 'Average/typical',
      badgeClass: 'bg-blue-50 text-blue-900 border-blue-200 font-medium',
      dotColor: 'bg-blue-500'
    };
  }
  if (z > -2.0) {
    return {
      label: 'Weak',
      badgeClass: 'bg-amber-100 text-amber-900 border-amber-300 font-bold',
      dotColor: 'bg-amber-500'
    };
  }
  return {
    label: 'Requires Attention',
    badgeClass: 'bg-rose-100 text-rose-900 border-rose-300 font-bold',
    dotColor: 'bg-rose-600'
  };
}

function getDomainScore(sub: SavedSubmission, sectionId: SectionId): number {
  if (sub.report?.sectionScores && sub.report.sectionScores[sectionId]?.score !== undefined) {
    return sub.report.sectionScores[sectionId].score;
  }
  if (sub.report?.detailedItemAnalysis) {
    return sub.report.detailedItemAnalysis.filter(
      (item) => item.sectionId === sectionId && item.isCorrect
    ).length;
  }
  return 0;
}

export const StudentDomainNormativeAnalytics: React.FC<StudentDomainNormativeAnalyticsProps> = ({
  report,
  allSubmissions = []
}) => {
  const [hoveredDomain, setHoveredDomain] = useState<string | null>(null);

  // Normalize submissions list from props or local storage
  const submissionsList = useMemo(() => {
    let list: SavedSubmission[] = allSubmissions && allSubmissions.length > 0 ? [...allSubmissions] : [];

    if (list.length === 0) {
      try {
        const local = localStorage.getItem('CIT_COGNITIVE_SUBMISSIONS');
        if (local) {
          const parsed = JSON.parse(local);
          if (Array.isArray(parsed) && parsed.length > 0) list = parsed;
        }
      } catch (e) {
        console.error('Failed to parse local submissions for normative analytics:', e);
      }
    }

    // Always include current student in distribution if missing
    const hasCurrent = list.some(
      (s) => s.student?.registerNo && s.student.registerNo === report.student.registerNo
    );
    if (!hasCurrent) {
      list = [
        ...list,
        {
          id: 'current_eval',
          student: report.student,
          report: report
        } as SavedSubmission
      ];
    }

    return list;
  }, [allSubmissions, report]);

  // Student Department
  const studentDept = (report.student.department || 'General').trim() || 'General';

  // Compute domain analytics rows
  const { domainRows, strongestDomain, weakestDomain, summaryText } = useMemo(() => {
    const deptStudents = submissionsList.filter(
      (s) => ((s.student?.department || 'General').trim() || 'General') === studentDept
    );

    const rows: DomainNormativeRow[] = SECTION_METADATA.map((meta) => {
      const secId = meta.id;
      const studentScore = report.sectionScores[secId]?.score ?? 0;

      // Department scores
      const deptScores = deptStudents.map((s) => getDomainScore(s, secId));
      const deptN = deptScores.length || 1;
      const deptSum = deptScores.reduce((acc, v) => acc + v, 0);
      const deptMean = Number((deptSum / deptN).toFixed(2));

      let deptSd = 0;
      if (deptScores.length > 1) {
        const sumSq = deptScores.reduce((acc, v) => acc + Math.pow(v - deptMean, 2), 0);
        deptSd = Number(Math.sqrt(sumSq / (deptScores.length - 1)).toFixed(2));
      }

      // Department Z-score: z_dept = (student_score - dept_mean) / dept_sd
      const deptZScore = deptSd > 0 ? Number(((studentScore - deptMean) / deptSd).toFixed(1)) : null;

      // Department Percentile: (students with score <= studentScore) / total * 100
      const deptScoresLessOrEqual = deptScores.filter((s) => s <= studentScore).length;
      const deptPercentile = Math.round((deptScoresLessOrEqual / deptN) * 100);

      // College scores
      const collegeScores = submissionsList.map((s) => getDomainScore(s, secId));
      const collegeN = collegeScores.length || 1;
      const collegeSum = collegeScores.reduce((acc, v) => acc + v, 0);
      const collegeMean = Number((collegeSum / collegeN).toFixed(2));

      let collegeSd = 0;
      if (collegeScores.length > 1) {
        const sumSq = collegeScores.reduce((acc, v) => acc + Math.pow(v - collegeMean, 2), 0);
        collegeSd = Number(Math.sqrt(sumSq / (collegeScores.length - 1)).toFixed(2));
      }

      // College Z-score: z_college = (student_score - college_mean) / college_sd
      const collegeZScore = collegeSd > 0 ? Number(((studentScore - collegeMean) / collegeSd).toFixed(1)) : null;

      // College Percentile: (students with score <= studentScore) / total * 100
      const collegeScoresLessOrEqual = collegeScores.filter((s) => s <= studentScore).length;
      const collegePercentile = Math.round((collegeScoresLessOrEqual / collegeN) * 100);

      return {
        domainId: secId,
        domainName: meta.title,
        studentScore,
        deptMean,
        deptSd,
        deptZScore,
        deptPercentile,
        collegeMean,
        collegeSd,
        collegeZScore,
        collegePercentile
      };
    });

    // Determine strongest & weakest domains by department Z-score (or fallback to college Z-score / score)
    const validZRows = [...rows].filter((r) => r.deptZScore !== null);
    let strongest: DomainNormativeRow | null = null;
    let weakest: DomainNormativeRow | null = null;

    if (validZRows.length > 0) {
      validZRows.sort((a, b) => (b.deptZScore ?? 0) - (a.deptZScore ?? 0));
      strongest = validZRows[0];
      weakest = validZRows[validZRows.length - 1];
    } else {
      // Fallback if SD = 0 across all domains
      const sortedByScore = [...rows].sort((a, b) => b.studentScore - a.studentScore);
      strongest = sortedByScore[0];
      weakest = sortedByScore[sortedByScore.length - 1];
    }

    const studentName = report.student.name || 'Candidate';
    let summary = '';
    if (strongest && weakest) {
      const strongZStr = formatZScore(strongest.deptZScore);
      const weakZStr = formatZScore(weakest.deptZScore);
      summary = `${studentName} is strongest in ${strongest.domainName} (z = ${strongZStr}, ${formatOrdinal(strongest.deptPercentile)} percentile) and weakest in ${weakest.domainName} (z = ${weakZStr}, ${formatOrdinal(weakest.deptPercentile)} percentile).`;
    } else {
      summary = `${studentName} exhibits consistent cognitive performance across all mathematics domains.`;
    }

    return {
      domainRows: rows,
      strongestDomain: strongest,
      weakestDomain: weakest,
      summaryText: summary
    };
  }, [submissionsList, report, studentDept]);

  // Spider / Radar Chart Geometry
  // 5 axes regularly spaced in a pentagon
  const chartConfig = useMemo(() => {
    const width = 480;
    const height = 400;
    const cx = width / 2;
    const cy = height / 2;

    // Radius scaling:
    // z = 0 is Department Average at R = 85px
    // z = +1 is at R = 120px (+35px)
    // z = -1 is at R = 50px (-35px)
    // z = +2 is at R = 155px (+70px)
    // z = -2 is at R = 15px (-70px)
    const r0 = 85;
    const scale = 35; // pixels per z unit

    const getRadiusForZ = (z: number | null) => {
      const val = z === null ? 0 : Math.max(-2.0, Math.min(2.0, z));
      return r0 + val * scale;
    };

    // Calculate vertex positions for the student polygon
    const studentPoints: { x: number; y: number; z: number | null; label: string; score: number }[] = [];
    const axes: { x: number; y: number; label: string; shortCode: string; z: number | null }[] = [];

    const n = domainRows.length;
    domainRows.forEach((row, i) => {
      // Start from top (-PI/2) and rotate clockwise
      const angle = -Math.PI / 2 + (i * 2 * Math.PI) / n;
      const r = getRadiusForZ(row.deptZScore);

      const x = cx + r * Math.cos(angle);
      const y = cy + r * Math.sin(angle);
      studentPoints.push({
        x,
        y,
        z: row.deptZScore,
        label: row.domainName,
        score: row.studentScore
      });

      // Axis outer endpoint for max radius 160
      const axisR = 160;
      axes.push({
        x: cx + axisR * Math.cos(angle),
        y: cy + axisR * Math.sin(angle),
        label: row.domainName,
        shortCode: SECTION_METADATA[i]?.shortCode || row.domainName.slice(0, 3).toUpperCase(),
        z: row.deptZScore
      });
    });

    const polygonPath = studentPoints.map((pt, i) => `${i === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`).join(' ') + ' Z';

    return {
      width,
      height,
      cx,
      cy,
      r0,
      rPlus1: r0 + scale,
      rMinus1: r0 - scale,
      rPlus2: r0 + scale * 2,
      axes,
      studentPoints,
      polygonPath
    };
  }, [domainRows]);

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 shadow-md space-y-6 break-inside-avoid">
      {/* SECTION TITLE */}
      <div className="pb-4 border-b border-slate-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <span className="text-xs font-semibold text-indigo-700 uppercase tracking-wider flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5" />
              Normative Standings & Distribution Analysis
            </span>
            <h2 className="text-xl font-bold font-sans text-slate-900 mt-0.5 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-indigo-600" />
              Department & College Relative Performance
            </h2>
          </div>
          <span className="px-3 py-1 bg-indigo-50 border border-indigo-200 text-indigo-800 rounded-lg text-xs font-semibold self-start sm:self-auto">
            Cohort Benchmark: {studentDept}
          </span>
        </div>
        <p className="text-xs text-slate-500 mt-1">
          Evaluates standard score deviations (Z-score: z = (x - &mu;) / &sigma;) and percentile rankings within the candidate&apos;s department and across the entire institute.
        </p>
      </div>

      {/* A. TABLE: DOMAIN | SCORE | DEPT MEAN | DEPT Z-SCORE | DEPT PERCENTILE | COLLEGE Z-SCORE | COLLEGE PERCENTILE */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <Award className="w-4 h-4 text-indigo-600" />
            Domainwise Comparative Matrix
          </h3>
          <span className="text-[11px] text-slate-500 font-mono">
            Scores: /10 Marks • Z-score rounded to 1 decimal • Percentile to nearest whole %
          </span>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-2xs">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-slate-800 text-white font-semibold text-[11px]">
                <th scope="col" className="px-3.5 py-3 border-r border-slate-700">
                  Domain
                </th>
                <th scope="col" className="px-3 py-3 text-center border-r border-slate-700 bg-slate-850">
                  Score
                </th>
                <th scope="col" className="px-3 py-3 text-center border-r border-slate-700">
                  Dept Mean (μ)
                </th>
                <th scope="col" className="px-3 py-3 text-center border-r border-slate-700 bg-indigo-950/70">
                  Dept Z-score
                </th>
                <th scope="col" className="px-3 py-3 text-center border-r border-slate-700">
                  Dept Percentile
                </th>
                <th scope="col" className="px-3 py-3 text-center border-r border-slate-700 bg-indigo-950/70">
                  College Z-score
                </th>
                <th scope="col" className="px-3 py-3 text-center border-r border-slate-700">
                  College Percentile
                </th>
                <th scope="col" className="px-3.5 py-3 text-center bg-indigo-900/90 text-indigo-100 font-bold min-w-[140px]">
                  Inference
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {domainRows.map((row, idx) => {
                const deptZColor = getZScoreColorClass(row.deptZScore);
                const collegeZColor = getZScoreColorClass(row.collegeZScore);
                const zVal = row.deptZScore ?? row.collegeZScore;
                const inference = getZScoreInference(zVal);

                return (
                  <tr
                    key={row.domainId}
                    className={`hover:bg-slate-50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}
                  >
                    {/* Domain Name */}
                    <td className="px-3.5 py-2.5 font-bold text-slate-900 border-r border-slate-200">
                      {row.domainName}
                    </td>

                    {/* Student Score */}
                    <td className="px-3 py-2.5 text-center font-mono font-bold text-slate-900 border-r border-slate-200 bg-slate-100/40">
                      {row.studentScore} / 10
                    </td>

                    {/* Dept Mean */}
                    <td className="px-3 py-2.5 text-center font-mono text-slate-700 border-r border-slate-200">
                      {row.deptMean.toFixed(1)} <span className="text-[10px] text-slate-400">±{row.deptSd.toFixed(1)}</span>
                    </td>

                    {/* Dept Z-Score with required color rules */}
                    <td className="px-3 py-2.5 text-center border-r border-slate-200">
                      <span className={`inline-block px-2.5 py-0.5 rounded text-xs font-mono ${deptZColor}`}>
                        {formatZScore(row.deptZScore)}
                      </span>
                    </td>

                    {/* Dept Percentile */}
                    <td className="px-3 py-2.5 text-center font-mono font-bold text-slate-800 border-r border-slate-200">
                      {row.deptPercentile}%
                    </td>

                    {/* College Z-Score with required color rules */}
                    <td className="px-3 py-2.5 text-center border-r border-slate-200">
                      <span className={`inline-block px-2.5 py-0.5 rounded text-xs font-mono ${collegeZColor}`}>
                        {formatZScore(row.collegeZScore)}
                      </span>
                    </td>

                    {/* College Percentile & Relative Grade */}
                    <td className="px-3 py-2 text-center border-r border-slate-200">
                      <div className="flex flex-col items-center justify-center">
                        <span className="font-mono font-bold text-slate-900 text-xs">{row.collegePercentile}%</span>
                        <span className={`mt-1 px-1.5 py-0.5 rounded text-[10px] font-bold border tracking-wide ${
                          row.collegePercentile >= 75
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                            : row.collegePercentile >= 35
                            ? 'bg-blue-100 text-blue-800 border-blue-300'
                            : 'bg-rose-100 text-rose-800 border-rose-300'
                        }`}>
                          {row.collegePercentile >= 75 ? 'Grade A' : row.collegePercentile >= 35 ? 'Grade B' : 'Grade C'}
                        </span>
                      </div>
                    </td>

                    {/* Inference based on Z-score */}
                    <td className="px-3.5 py-2.5 text-center">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs border ${inference.badgeClass}`}
                        title={`Inference: ${inference.label} (Z-score: ${formatZScore(zVal)})`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${inference.dotColor}`} />
                        <span>{inference.label}</span>
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Legend for Z-score and Inference */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between text-[11px] text-slate-500 pt-1 px-1 gap-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="font-semibold text-slate-700">Z-Score Inference:</span>
            <span className="inline-flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span><strong>&ge; +2:</strong> Exceptional</span>
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-teal-500" />
              <span><strong>+1 to +2:</strong> Strong</span>
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              <span><strong>-1 to +1:</strong> Average/typical</span>
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span><strong>-2 to -1:</strong> Weak</span>
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              <span><strong>&le; -2:</strong> Requires Attention</span>
            </span>
          </div>
          <div className="text-[10px] italic text-slate-500">
            Inference calibrated against standard normative Z-score distributions.
          </div>
        </div>
      </div>

      {/* B. RADAR / SPIDER CHART: DEPARTMENT Z-SCORE ON EACH AXIS */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 flex flex-col items-center space-y-4">
        <div className="text-center space-y-1">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center justify-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-indigo-600" />
            Department Relative Z-Score Spider Profile
          </h3>
          <p className="text-xs text-slate-500 max-w-lg mx-auto">
            Plots the candidate&apos;s department Z-score deviation against the solid Department Average circle ($z = 0.0$) with benchmark boundaries at $z = +1.0$ and $z = -1.0$.
          </p>
          {summaryText && (
            <p className="text-xs font-semibold text-indigo-900 bg-indigo-50/80 px-3.5 py-1.5 rounded-lg border border-indigo-200 max-w-xl mx-auto mt-2">
              {summaryText}
            </p>
          )}
        </div>

        {/* SVG RADAR CHART */}
        <div className="relative w-full max-w-[480px] flex justify-center">
          <svg
            viewBox={`0 0 ${chartConfig.width} ${chartConfig.height}`}
            className="w-full h-auto max-h-[380px] drop-shadow-sm select-none"
          >
            {/* Background Outer Ring (+2.0) */}
            <circle
              cx={chartConfig.cx}
              cy={chartConfig.cy}
              r={chartConfig.rPlus2}
              fill="none"
              stroke="#CBD5E1"
              strokeWidth="1"
              strokeDasharray="2,2"
            />

            {/* REFERENCE DASHED LINE: z = +1.0 (Green Dashed Circle) */}
            <circle
              cx={chartConfig.cx}
              cy={chartConfig.cy}
              r={chartConfig.rPlus1}
              fill="none"
              stroke="#10B981"
              strokeWidth="1.5"
              strokeDasharray="4,4"
            />

            {/* REFERENCE SOLID LINE: z = 0.0 (Department Average Circle) */}
            <circle
              cx={chartConfig.cx}
              cy={chartConfig.cy}
              r={chartConfig.r0}
              fill="none"
              stroke="#4F46E5"
              strokeWidth="2.2"
            />

            {/* REFERENCE DASHED LINE: z = -1.0 (Red Dashed Circle) */}
            <circle
              cx={chartConfig.cx}
              cy={chartConfig.cy}
              r={chartConfig.rMinus1}
              fill="none"
              stroke="#EF4444"
              strokeWidth="1.5"
              strokeDasharray="4,4"
            />

            {/* Center Hub */}
            <circle
              cx={chartConfig.cx}
              cy={chartConfig.cy}
              r={4}
              fill="#64748B"
            />

            {/* Reference Line Labels along Top Vertical Axis */}
            <text
              x={chartConfig.cx + 6}
              y={chartConfig.cy - chartConfig.rPlus1 + 3}
              className="text-[9px] font-mono font-bold fill-emerald-600"
            >
              +1.0σ
            </text>
            <text
              x={chartConfig.cx + 6}
              y={chartConfig.cy - chartConfig.r0 + 3}
              className="text-[9px] font-mono font-black fill-indigo-700"
            >
              0.0 (Dept Avg)
            </text>
            <text
              x={chartConfig.cx + 6}
              y={chartConfig.cy - chartConfig.rMinus1 + 3}
              className="text-[9px] font-mono font-bold fill-rose-600"
            >
              -1.0σ
            </text>

            {/* 5 Domain Axes */}
            {chartConfig.axes.map((axis, i) => (
              <g key={`axis-${i}`}>
                <line
                  x1={chartConfig.cx}
                  y1={chartConfig.cy}
                  x2={axis.x}
                  y2={axis.y}
                  stroke="#94A3B8"
                  strokeWidth="1"
                  strokeDasharray="2,2"
                />
              </g>
            ))}

            {/* Student Z-Score Polygon */}
            <path
              d={chartConfig.polygonPath}
              fill="rgba(99, 102, 241, 0.25)"
              stroke="#4F46E5"
              strokeWidth="2.5"
              strokeLinejoin="round"
            />

            {/* Student Data Vertices */}
            {chartConfig.studentPoints.map((pt, i) => {
              const zVal = pt.z;
              let ptColor = '#F59E0B'; // yellow
              if (zVal !== null && zVal >= 1.0) ptColor = '#10B981'; // green
              else if (zVal !== null && zVal <= -1.0) ptColor = '#EF4444'; // red

              const isHovered = hoveredDomain === pt.label;

              return (
                <g
                  key={`pt-${i}`}
                  onMouseEnter={() => setHoveredDomain(pt.label)}
                  onMouseLeave={() => setHoveredDomain(null)}
                  className="cursor-pointer"
                >
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r={isHovered ? 7 : 5}
                    fill={ptColor}
                    stroke="#FFFFFF"
                    strokeWidth="2"
                    className="transition-all duration-150"
                  />
                  {/* Floating Z-Score Tag */}
                  <text
                    x={pt.x}
                    y={pt.y < chartConfig.cy ? pt.y - 10 : pt.y + 16}
                    textAnchor="middle"
                    className="text-[10px] font-mono font-extrabold fill-slate-900"
                  >
                    {formatZScore(pt.z)}
                  </text>
                </g>
              );
            })}

            {/* Outer Domain Name Labels */}
            {chartConfig.axes.map((axis, i) => {
              // Calculate text anchor and positioning offset
              const angle = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
              const textR = 175;
              const tx = chartConfig.cx + textR * Math.cos(angle);
              const ty = chartConfig.cy + textR * Math.sin(angle);

              let anchor = 'middle';
              if (Math.cos(angle) > 0.3) anchor = 'start';
              else if (Math.cos(angle) < -0.3) anchor = 'end';

              return (
                <text
                  key={`label-${i}`}
                  x={tx}
                  y={ty + 4}
                  textAnchor={anchor}
                  className="text-[11px] font-bold fill-slate-800"
                >
                  {axis.label}
                </text>
              );
            })}
          </svg>
        </div>

        {/* RADAR CHART LEGEND */}
        <div className="flex flex-wrap items-center justify-center gap-4 text-xs pt-1 border-t border-slate-200 w-full">
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded bg-indigo-500/20 border-2 border-indigo-600 inline-block" />
            <span className="font-semibold text-slate-800">Student Z-Score Profile</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="w-5 h-0.5 bg-indigo-600 inline-block" />
            <span className="text-slate-600 font-medium">Solid Line: <strong>z = 0.0</strong> (Dept Avg)</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="w-5 h-0.5 border-t-2 border-dashed border-emerald-500 inline-block" />
            <span className="text-slate-600 font-medium">Dashed Green: <strong>z = +1.0σ</strong></span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="w-5 h-0.5 border-t-2 border-dashed border-rose-500 inline-block" />
            <span className="text-slate-600 font-medium">Dashed Red: <strong>z = -1.0σ</strong></span>
          </div>
        </div>
      </div>
    </div>
  );
};
