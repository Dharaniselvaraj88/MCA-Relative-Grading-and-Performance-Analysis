import React, { useState, useMemo } from 'react';
import { SavedSubmission, SectionId } from '../types';
import {
  Building2,
  Download,
  FileSpreadsheet,
  FileText,
  Printer,
  Search,
  ArrowUpDown,
  TrendingUp,
  BarChart3,
  Sparkles,
  Info,
  Award,
  Users
} from 'lucide-react';

interface CollegeDomainStatisticsTableProps {
  submissions: SavedSubmission[];
}

export interface DomainStatPair {
  mean: number;
  stdDev: number;
}

export interface DepartmentDomainStatsRow {
  department: string;
  studentCount: number;
  calculus: DomainStatPair; // Limits & Continuity
  probability: DomainStatPair; // Differentiation
  numberSystem: DomainStatPair; // Integration
  trigonometry: DomainStatPair; // Probability & Statistics
  statistics: DomainStatPair; // Matrices & Determinants
  overall: DomainStatPair; // Overall Score / 50
}

export interface InstituteDomainStatsRow {
  studentCount: number;
  calculus: DomainStatPair;
  probability: DomainStatPair;
  numberSystem: DomainStatPair;
  trigonometry: DomainStatPair;
  statistics: DomainStatPair;
  overall: DomainStatPair;
}

const DOMAINS: { id: SectionId; name: string; shortCode: string; maxMarks: number; colorClass: string; bgClass: string; borderClass: string }[] = [
  { id: 'calculus', name: 'Limits & Continuity', shortCode: 'LIM', maxMarks: 10, colorClass: 'text-blue-700', bgClass: 'bg-blue-50/70', borderClass: 'border-blue-200' },
  { id: 'probability', name: 'Differentiation', shortCode: 'DIFF', maxMarks: 10, colorClass: 'text-emerald-700', bgClass: 'bg-emerald-50/70', borderClass: 'border-emerald-200' },
  { id: 'numberSystem', name: 'Integration', shortCode: 'INT', maxMarks: 10, colorClass: 'text-purple-700', bgClass: 'bg-purple-50/70', borderClass: 'border-purple-200' },
  { id: 'trigonometry', name: 'Probability & Statistics', shortCode: 'P&S', maxMarks: 10, colorClass: 'text-amber-700', bgClass: 'bg-amber-50/70', borderClass: 'border-amber-200' },
  { id: 'statistics', name: 'Matrices & Determinants', shortCode: 'MAT', maxMarks: 10, colorClass: 'text-pink-700', bgClass: 'bg-pink-50/70', borderClass: 'border-pink-200' },
];

/**
 * Calculates mean and sample standard deviation (s = sqrt(sum((x - mean)^2) / (n - 1)))
 * Returns 0 stdDev if n <= 1
 */
function calculateStats(scores: number[]): DomainStatPair {
  if (!scores || scores.length === 0) {
    return { mean: 0, stdDev: 0 };
  }
  const n = scores.length;
  const sum = scores.reduce((acc, val) => acc + val, 0);
  const mean = Number((sum / n).toFixed(2));

  if (n <= 1) {
    return { mean, stdDev: 0 };
  }

  const sumSquares = scores.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0);
  const variance = sumSquares / (n - 1);
  const stdDev = Number(Math.sqrt(Math.max(0, variance)).toFixed(2));

  return { mean, stdDev };
}

export const CollegeDomainStatisticsTable: React.FC<CollegeDomainStatisticsTableProps> = ({
  submissions
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<
    'department' | 'count' | 'calculus' | 'probability' | 'numberSystem' | 'trigonometry' | 'statistics' | 'overall'
  >('department');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [isExporting, setIsExporting] = useState(false);

  // Compute departmental and whole college institute statistics
  const { departmentRows, instituteRow, topDomain, lowestDomain } = useMemo(() => {
    // Collect all scores grouped by department
    const deptMap: Record<
      string,
      {
        calcScores: number[];
        probScores: number[];
        numScores: number[];
        trigScores: number[];
        statScores: number[];
        overallScores: number[];
      }
    > = {};

    // Whole college score collections
    const collegeCalcScores: number[] = [];
    const collegeProbScores: number[] = [];
    const collegeNumScores: number[] = [];
    const collegeTrigScores: number[] = [];
    const collegeStatScores: number[] = [];
    const collegeOverallScores: number[] = [];

    (submissions || []).forEach((sub) => {
      const dept = (sub.student?.department || 'General').trim() || 'General';

      if (!deptMap[dept]) {
        deptMap[dept] = {
          calcScores: [],
          probScores: [],
          numScores: [],
          trigScores: [],
          statScores: [],
          overallScores: []
        };
      }

      const sec = sub.report?.sectionScores;
      const calc = sec?.calculus?.score ?? 0;
      const prob = sec?.probability?.score ?? 0;
      const num = sec?.numberSystem?.score ?? 0;
      const trig = sec?.trigonometry?.score ?? 0;
      const stat = sec?.statistics?.score ?? 0;
      const overall = sub.report?.overallScore ?? (calc + prob + num + trig + stat);

      deptMap[dept].calcScores.push(calc);
      deptMap[dept].probScores.push(prob);
      deptMap[dept].numScores.push(num);
      deptMap[dept].trigScores.push(trig);
      deptMap[dept].statScores.push(stat);
      deptMap[dept].overallScores.push(overall);

      collegeCalcScores.push(calc);
      collegeProbScores.push(prob);
      collegeNumScores.push(num);
      collegeTrigScores.push(trig);
      collegeStatScores.push(stat);
      collegeOverallScores.push(overall);
    });

    const rows: DepartmentDomainStatsRow[] = Object.entries(deptMap).map(([department, data]) => {
      return {
        department,
        studentCount: data.overallScores.length,
        calculus: calculateStats(data.calcScores),
        probability: calculateStats(data.probScores),
        numberSystem: calculateStats(data.numScores),
        trigonometry: calculateStats(data.trigScores),
        statistics: calculateStats(data.statScores),
        overall: calculateStats(data.overallScores)
      };
    });

    // Institute Whole College overall row
    const institute: InstituteDomainStatsRow = {
      studentCount: collegeOverallScores.length,
      calculus: calculateStats(collegeCalcScores),
      probability: calculateStats(collegeProbScores),
      numberSystem: calculateStats(collegeNumScores),
      trigonometry: calculateStats(collegeTrigScores),
      statistics: calculateStats(collegeStatScores),
      overall: calculateStats(collegeOverallScores)
    };

    // Determine strongest & weakest domain for whole institute
    const domainAverages = [
      { name: 'Limits & Continuity', mean: institute.calculus.mean, sd: institute.calculus.stdDev },
      { name: 'Differentiation', mean: institute.probability.mean, sd: institute.probability.stdDev },
      { name: 'Integration', mean: institute.numberSystem.mean, sd: institute.numberSystem.stdDev },
      { name: 'Probability & Statistics', mean: institute.trigonometry.mean, sd: institute.trigonometry.stdDev },
      { name: 'Matrices & Determinants', mean: institute.statistics.mean, sd: institute.statistics.stdDev }
    ];

    domainAverages.sort((a, b) => b.mean - a.mean);
    const top = domainAverages[0];
    const lowest = domainAverages[domainAverages.length - 1];

    return {
      departmentRows: rows,
      instituteRow: institute,
      topDomain: top,
      lowestDomain: lowest
    };
  }, [submissions]);

  // Filtered and sorted department rows
  const filteredAndSortedRows = useMemo(() => {
    let list = [...departmentRows];

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      list = list.filter((r) => r.department.toLowerCase().includes(q));
    }

    list.sort((a, b) => {
      let valA: any = 0;
      let valB: any = 0;

      if (sortField === 'department') {
        valA = a.department.toLowerCase();
        valB = b.department.toLowerCase();
        if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
        if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      } else if (sortField === 'count') {
        valA = a.studentCount;
        valB = b.studentCount;
      } else {
        valA = a[sortField]?.mean ?? 0;
        valB = b[sortField]?.mean ?? 0;
      }

      return sortDirection === 'asc' ? valA - valB : valB - valA;
    });

    return list;
  }, [departmentRows, searchTerm, sortField, sortDirection]);

  // Sort click handler
  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection(field === 'department' ? 'asc' : 'desc');
    }
  };

  // Export to Excel
  const handleExportExcel = async () => {
    try {
      setIsExporting(true);
      const XLSX = await import('xlsx');
      const wb = XLSX.utils.book_new();

      const titleRows = [
        ['COIMBATORE INSTITUTE OF TECHNOLOGY (AUTONOMOUS)'],
        ['WHOLE COLLEGE DOMAIN-WISE MEAN AND STANDARD DEVIATION ANALYSIS REPORT'],
        [`Generated On: ${new Date().toLocaleString()}`],
        [`Total Evaluated Students: ${instituteRow.studentCount} | Departments: ${departmentRows.length}`],
        ['Domain Max Score: 10 Marks each (Total 50 Marks) | Sample Standard Deviation (N - 1)'],
        ['']
      ];

      const headers = [
        'S.No',
        'Department Name',
        'Students (N)',
        'Limits & Continuity Mean (10M)',
        'Limits & Continuity Std Dev',
        'Differentiation Mean (10M)',
        'Differentiation Std Dev',
        'Integration Mean (10M)',
        'Integration Std Dev',
        'Probability & Statistics Mean (10M)',
        'Probability & Statistics Std Dev',
        'Matrices & Determinants Mean (10M)',
        'Matrices & Determinants Std Dev',
        'Overall Score Mean (50M)',
        'Overall Score Std Dev'
      ];

      const dataRows = filteredAndSortedRows.map((r, index) => [
        index + 1,
        r.department,
        r.studentCount,
        r.calculus.mean,
        r.calculus.stdDev,
        r.probability.mean,
        r.probability.stdDev,
        r.numberSystem.mean,
        r.numberSystem.stdDev,
        r.trigonometry.mean,
        r.trigonometry.stdDev,
        r.statistics.mean,
        r.statistics.stdDev,
        r.overall.mean,
        r.overall.stdDev
      ]);

      const instituteSummaryRow = [
        '★',
        'INSTITUTE (Whole College Benchmark)',
        instituteRow.studentCount,
        instituteRow.calculus.mean,
        instituteRow.calculus.stdDev,
        instituteRow.probability.mean,
        instituteRow.probability.stdDev,
        instituteRow.numberSystem.mean,
        instituteRow.numberSystem.stdDev,
        instituteRow.trigonometry.mean,
        instituteRow.trigonometry.stdDev,
        instituteRow.statistics.mean,
        instituteRow.statistics.stdDev,
        instituteRow.overall.mean,
        instituteRow.overall.stdDev
      ];

      const wsData = [...titleRows, headers, ...dataRows, [''], instituteSummaryRow];
      const ws = XLSX.utils.aoa_to_sheet(wsData);

      // Set column widths
      ws['!cols'] = [
        { wch: 8 },  // S.No
        { wch: 30 }, // Dept Name
        { wch: 14 }, // Students
        { wch: 22 }, // Lim Mean
        { wch: 20 }, // Lim SD
        { wch: 22 }, // Diff Mean
        { wch: 20 }, // Diff SD
        { wch: 22 }, // Int Mean
        { wch: 20 }, // Int SD
        { wch: 24 }, // P&S Mean
        { wch: 22 }, // P&S SD
        { wch: 24 }, // Mat Mean
        { wch: 22 }, // Mat SD
        { wch: 22 }, // Overall Mean
        { wch: 20 }  // Overall SD
      ];

      XLSX.utils.book_append_sheet(wb, ws, 'Domain Mean & SD');
      XLSX.writeFile(wb, `CIT_Whole_College_Domainwise_Mean_StdDev_${new Date().toISOString().slice(0, 10)}.xlsx`);
    } catch (err) {
      console.error('Failed to export Excel report:', err);
    } finally {
      setIsExporting(false);
    }
  };

  // Export to CSV
  const handleExportCSV = () => {
    const headers = [
      'S.No',
      'Department Name',
      'Students (N)',
      'Limits & Continuity Mean',
      'Limits & Continuity Std Dev',
      'Differentiation Mean',
      'Differentiation Std Dev',
      'Integration Mean',
      'Integration Std Dev',
      'Probability & Statistics Mean',
      'Probability & Statistics Std Dev',
      'Matrices & Determinants Mean',
      'Matrices & Determinants Std Dev',
      'Overall Score Mean (50M)',
      'Overall Score Std Dev'
    ];

    const dataRows = filteredAndSortedRows.map((r, index) => [
      index + 1,
      `"${r.department.replace(/"/g, '""')}"`,
      r.studentCount,
      r.calculus.mean,
      r.calculus.stdDev,
      r.probability.mean,
      r.probability.stdDev,
      r.numberSystem.mean,
      r.numberSystem.stdDev,
      r.trigonometry.mean,
      r.trigonometry.stdDev,
      r.statistics.mean,
      r.statistics.stdDev,
      r.overall.mean,
      r.overall.stdDev
    ]);

    const instituteRowData = [
      'INSTITUTE',
      '"INSTITUTE (Whole College Benchmark)"',
      instituteRow.studentCount,
      instituteRow.calculus.mean,
      instituteRow.calculus.stdDev,
      instituteRow.probability.mean,
      instituteRow.probability.stdDev,
      instituteRow.numberSystem.mean,
      instituteRow.numberSystem.stdDev,
      instituteRow.trigonometry.mean,
      instituteRow.trigonometry.stdDev,
      instituteRow.statistics.mean,
      instituteRow.statistics.stdDev,
      instituteRow.overall.mean,
      instituteRow.overall.stdDev
    ];

    const csvContent = [headers.join(','), ...dataRows.map((row) => row.join(',')), instituteRowData.join(',')].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `CIT_Whole_College_Domainwise_Mean_StdDev_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-5 break-inside-avoid">
      {/* SECTION HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-indigo-100 text-indigo-700 rounded-lg">
              <BarChart3 className="w-5 h-5" />
            </span>
            <h3 className="text-base font-bold text-slate-900 tracking-tight">
              Domainwise Mean & Standard Deviation for Whole College
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Tabular evaluation of mean score ($\mu$) and score dispersion standard deviation ($\sigma$) across all 5 mathematics domains by department, concluding with the official Institute benchmark.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExportExcel}
            disabled={isExporting || departmentRows.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors shadow-2xs disabled:opacity-50"
            title="Download full analysis as Excel Spreadsheet"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            Export Excel
          </button>
          <button
            onClick={handleExportCSV}
            disabled={departmentRows.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-slate-700 hover:bg-slate-800 text-white rounded-lg transition-colors shadow-2xs disabled:opacity-50"
            title="Download analysis as CSV"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            title="Print this domain statistics report"
          >
            <Printer className="w-3.5 h-3.5" />
            Print
          </button>
        </div>
      </div>

      {/* QUICK KPI TILES */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Whole College (N)</span>
            <Users className="w-4 h-4 text-slate-400" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-bold font-mono text-slate-900">{instituteRow.studentCount}</span>
            <span className="text-[11px] text-slate-500">across {departmentRows.length} depts</span>
          </div>
        </div>

        <div className="bg-indigo-50/70 border border-indigo-200 p-3 rounded-xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-indigo-700 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Institute Mean (50M)</span>
            <Award className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-bold font-mono text-indigo-900">{instituteRow.overall.mean}</span>
            <span className="text-xs font-mono font-medium text-indigo-600">± {instituteRow.overall.stdDev} (σ)</span>
          </div>
        </div>

        <div className="bg-emerald-50/70 border border-emerald-200 p-3 rounded-xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-emerald-700 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider truncate">Strongest Domain</span>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="truncate">
            <span className="text-xs font-bold text-emerald-900 block truncate" title={topDomain?.name}>
              {topDomain?.name}
            </span>
            <span className="text-xs font-mono font-bold text-emerald-700">
              {topDomain?.mean} / 10 <span className="text-[10px] text-emerald-600 font-normal">(σ: {topDomain?.sd})</span>
            </span>
          </div>
        </div>

        <div className="bg-amber-50/70 border border-amber-200 p-3 rounded-xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-amber-700 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider truncate">Growth Opportunity</span>
            <Sparkles className="w-4 h-4 text-amber-500" />
          </div>
          <div className="truncate">
            <span className="text-xs font-bold text-amber-900 block truncate" title={lowestDomain?.name}>
              {lowestDomain?.name}
            </span>
            <span className="text-xs font-mono font-bold text-amber-700">
              {lowestDomain?.mean} / 10 <span className="text-[10px] text-amber-600 font-normal">(σ: {lowestDomain?.sd})</span>
            </span>
          </div>
        </div>
      </div>

      {/* SEARCH AND FILTER BAR */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search department name..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
            >
              ×
            </button>
          )}
        </div>

        <div className="text-[11px] text-slate-500 flex items-center gap-1.5 self-end sm:self-auto">
          <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span>Scores out of 10 marks per domain | Overall out of 50 marks</span>
        </div>
      </div>

      {/* TABULAR DISPLAY: DEPARTMENT NAME, MEAN, STD DEV FOR ALL DOMAINS + INSTITUTE ROW */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-2xs">
        <table className="w-full text-xs text-left border-collapse">
          <thead>
            {/* Main Header Row */}
            <tr className="bg-slate-800 text-white font-semibold text-[11px]">
              <th scope="col" rowSpan={2} className="px-3 py-2.5 text-center border-r border-slate-700 w-12">
                S.No
              </th>
              <th
                scope="col"
                rowSpan={2}
                onClick={() => handleSort('department')}
                className="px-3 py-2.5 border-r border-slate-700 cursor-pointer hover:bg-slate-700 transition-colors min-w-[180px]"
              >
                <div className="flex items-center justify-between gap-1">
                  <span>Department Name</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th
                scope="col"
                rowSpan={2}
                onClick={() => handleSort('count')}
                className="px-3 py-2.5 text-center border-r border-slate-700 cursor-pointer hover:bg-slate-700 transition-colors w-20"
              >
                <div className="flex items-center justify-center gap-1">
                  <span>Students (N)</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>

              {/* 5 Cognitive Domains */}
              <th scope="col" colSpan={2} className="px-2 py-2 text-center border-r border-slate-700 bg-blue-900/80 text-blue-100">
                Limits & Continuity (10M)
              </th>
              <th scope="col" colSpan={2} className="px-2 py-2 text-center border-r border-slate-700 bg-emerald-900/80 text-emerald-100">
                Differentiation (10M)
              </th>
              <th scope="col" colSpan={2} className="px-2 py-2 text-center border-r border-slate-700 bg-purple-900/80 text-purple-100">
                Integration (10M)
              </th>
              <th scope="col" colSpan={2} className="px-2 py-2 text-center border-r border-slate-700 bg-amber-900/80 text-amber-100">
                Probability & Statistics (10M)
              </th>
              <th scope="col" colSpan={2} className="px-2 py-2 text-center border-r border-slate-700 bg-pink-900/80 text-pink-100">
                Matrices & Determinants (10M)
              </th>

              {/* Overall */}
              <th scope="col" colSpan={2} className="px-2 py-2 text-center bg-indigo-950 text-indigo-100">
                Overall Score (50M)
              </th>
            </tr>

            {/* Sub-header Row for Mean and Std Dev */}
            <tr className="bg-slate-900 text-white text-xs font-bold border-t border-slate-700">
              {/* Limits & Continuity */}
              <th
                onClick={() => handleSort('calculus')}
                className="px-2 py-2 text-center border-r border-slate-700 cursor-pointer bg-blue-950 hover:bg-blue-900 transition-colors"
                title="Sort by Limits & Continuity Mean"
              >
                <span className="text-white font-extrabold tracking-wide">Mean (μ)</span>
              </th>
              <th className="px-2 py-2 text-center border-r border-slate-700 bg-blue-950/90 text-yellow-300 font-extrabold tracking-wide">
                SD (σ)
              </th>

              {/* Differentiation */}
              <th
                onClick={() => handleSort('probability')}
                className="px-2 py-2 text-center border-r border-slate-700 cursor-pointer bg-emerald-950 hover:bg-emerald-900 transition-colors"
                title="Sort by Differentiation Mean"
              >
                <span className="text-white font-extrabold tracking-wide">Mean (μ)</span>
              </th>
              <th className="px-2 py-2 text-center border-r border-slate-700 bg-emerald-950/90 text-yellow-300 font-extrabold tracking-wide">
                SD (σ)
              </th>

              {/* Integration */}
              <th
                onClick={() => handleSort('numberSystem')}
                className="px-2 py-2 text-center border-r border-slate-700 cursor-pointer bg-purple-950 hover:bg-purple-900 transition-colors"
                title="Sort by Integration Mean"
              >
                <span className="text-white font-extrabold tracking-wide">Mean (μ)</span>
              </th>
              <th className="px-2 py-2 text-center border-r border-slate-700 bg-purple-950/90 text-yellow-300 font-extrabold tracking-wide">
                SD (σ)
              </th>

              {/* Probability & Statistics */}
              <th
                onClick={() => handleSort('trigonometry')}
                className="px-2 py-2 text-center border-r border-slate-700 cursor-pointer bg-amber-950 hover:bg-amber-900 transition-colors"
                title="Sort by Probability & Statistics Mean"
              >
                <span className="text-white font-extrabold tracking-wide">Mean (μ)</span>
              </th>
              <th className="px-2 py-2 text-center border-r border-slate-700 bg-amber-950/90 text-yellow-300 font-extrabold tracking-wide">
                SD (σ)
              </th>

              {/* Matrices & Determinants */}
              <th
                onClick={() => handleSort('statistics')}
                className="px-2 py-2 text-center border-r border-slate-700 cursor-pointer bg-pink-950 hover:bg-pink-900 transition-colors"
                title="Sort by Matrices & Determinants Mean"
              >
                <span className="text-white font-extrabold tracking-wide">Mean (μ)</span>
              </th>
              <th className="px-2 py-2 text-center border-r border-slate-700 bg-pink-950/90 text-yellow-300 font-extrabold tracking-wide">
                SD (σ)
              </th>

              {/* Overall */}
              <th
                onClick={() => handleSort('overall')}
                className="px-2 py-2 text-center border-r border-slate-700 cursor-pointer bg-indigo-950 hover:bg-indigo-900 transition-colors"
                title="Sort by Overall Score Mean"
              >
                <span className="text-white font-extrabold tracking-wide">Mean (μ)</span>
              </th>
              <th className="px-2 py-2 text-center bg-indigo-950/90 text-yellow-300 font-extrabold tracking-wide">
                SD (σ)
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-200">
            {filteredAndSortedRows.length > 0 ? (
              filteredAndSortedRows.map((row, idx) => (
                <tr
                  key={row.department}
                  className={`hover:bg-indigo-50/40 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}`}
                >
                  <td className="px-3 py-2 text-center text-slate-400 font-mono text-[11px] border-r border-slate-200">
                    {idx + 1}
                  </td>
                  <td className="px-3 py-2 font-semibold text-slate-900 border-r border-slate-200">
                    <div className="flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate max-w-[200px]" title={row.department}>
                        {row.department}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-center font-mono font-bold text-slate-700 border-r border-slate-200 bg-slate-100/50">
                    {row.studentCount}
                  </td>

                  {/* Limits & Continuity */}
                  <td className="px-2.5 py-2 text-center font-mono font-bold text-blue-700 bg-blue-50/30">
                    {row.calculus.mean.toFixed(2)}
                  </td>
                  <td className="px-2 py-2 text-center font-mono text-slate-500 border-r border-slate-200 text-[11px]">
                    {row.calculus.stdDev.toFixed(2)}
                  </td>

                  {/* Differentiation */}
                  <td className="px-2.5 py-2 text-center font-mono font-bold text-emerald-700 bg-emerald-50/30">
                    {row.probability.mean.toFixed(2)}
                  </td>
                  <td className="px-2 py-2 text-center font-mono text-slate-500 border-r border-slate-200 text-[11px]">
                    {row.probability.stdDev.toFixed(2)}
                  </td>

                  {/* Integration */}
                  <td className="px-2.5 py-2 text-center font-mono font-bold text-purple-700 bg-purple-50/30">
                    {row.numberSystem.mean.toFixed(2)}
                  </td>
                  <td className="px-2 py-2 text-center font-mono text-slate-500 border-r border-slate-200 text-[11px]">
                    {row.numberSystem.stdDev.toFixed(2)}
                  </td>

                  {/* Probability & Statistics */}
                  <td className="px-2.5 py-2 text-center font-mono font-bold text-amber-700 bg-amber-50/30">
                    {row.trigonometry.mean.toFixed(2)}
                  </td>
                  <td className="px-2 py-2 text-center font-mono text-slate-500 border-r border-slate-200 text-[11px]">
                    {row.trigonometry.stdDev.toFixed(2)}
                  </td>

                  {/* Matrices & Determinants */}
                  <td className="px-2.5 py-2 text-center font-mono font-bold text-pink-700 bg-pink-50/30">
                    {row.statistics.mean.toFixed(2)}
                  </td>
                  <td className="px-2 py-2 text-center font-mono text-slate-500 border-r border-slate-200 text-[11px]">
                    {row.statistics.stdDev.toFixed(2)}
                  </td>

                  {/* Overall */}
                  <td className="px-2.5 py-2 text-center font-mono font-extrabold text-indigo-900 bg-indigo-50/50">
                    {row.overall.mean.toFixed(2)}
                  </td>
                  <td className="px-2 py-2 text-center font-mono text-slate-600 font-semibold text-[11px] bg-indigo-50/20">
                    {row.overall.stdDev.toFixed(2)}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={15} className="py-8 text-center text-slate-400">
                  No department records found matching &ldquo;{searchTerm}&rdquo;
                </td>
              </tr>
            )}
          </tbody>

          {/* FINAL ROW: INSTITUTE OVERALL MEAN AND STANDARD DEVIATION FOR EACH DOMAIN */}
          <tfoot>
            <tr className="bg-slate-900 text-white font-bold border-t-2 border-indigo-500 shadow-md">
              <td className="px-3 py-3 text-center text-amber-400 font-mono text-xs border-r border-slate-800">
                ★
              </td>
              <td className="px-3 py-3 border-r border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                  <span className="uppercase tracking-wider font-extrabold text-slate-100 text-[12px]">
                    Institute (Whole College Benchmark)
                  </span>
                </div>
              </td>
              <td className="px-3 py-3 text-center font-mono text-emerald-300 border-r border-slate-800 text-[12px]">
                {instituteRow.studentCount}
              </td>

              {/* Limits & Continuity Overall */}
              <td className="px-2.5 py-3 text-center font-mono text-blue-300 text-[12px] bg-blue-950/60">
                {instituteRow.calculus.mean.toFixed(2)}
              </td>
              <td className="px-2 py-3 text-center font-mono text-blue-200/80 border-r border-slate-800 text-[11px] bg-blue-950/40">
                {instituteRow.calculus.stdDev.toFixed(2)}
              </td>

              {/* Differentiation Overall */}
              <td className="px-2.5 py-3 text-center font-mono text-emerald-300 text-[12px] bg-emerald-950/60">
                {instituteRow.probability.mean.toFixed(2)}
              </td>
              <td className="px-2 py-3 text-center font-mono text-emerald-200/80 border-r border-slate-800 text-[11px] bg-emerald-950/40">
                {instituteRow.probability.stdDev.toFixed(2)}
              </td>

              {/* Integration Overall */}
              <td className="px-2.5 py-3 text-center font-mono text-purple-300 text-[12px] bg-purple-950/60">
                {instituteRow.numberSystem.mean.toFixed(2)}
              </td>
              <td className="px-2 py-3 text-center font-mono text-purple-200/80 border-r border-slate-800 text-[11px] bg-purple-950/40">
                {instituteRow.numberSystem.stdDev.toFixed(2)}
              </td>

              {/* Probability & Statistics Overall */}
              <td className="px-2.5 py-3 text-center font-mono text-amber-300 text-[12px] bg-amber-950/60">
                {instituteRow.trigonometry.mean.toFixed(2)}
              </td>
              <td className="px-2 py-3 text-center font-mono text-amber-200/80 border-r border-slate-800 text-[11px] bg-amber-950/40">
                {instituteRow.trigonometry.stdDev.toFixed(2)}
              </td>

              {/* Matrices & Determinants Overall */}
              <td className="px-2.5 py-3 text-center font-mono text-pink-300 text-[12px] bg-pink-950/60">
                {instituteRow.statistics.mean.toFixed(2)}
              </td>
              <td className="px-2 py-3 text-center font-mono text-pink-200/80 border-r border-slate-800 text-[11px] bg-pink-950/40">
                {instituteRow.statistics.stdDev.toFixed(2)}
              </td>

              {/* Overall Score */}
              <td className="px-2.5 py-3 text-center font-mono font-black text-emerald-300 text-sm bg-indigo-900">
                {instituteRow.overall.mean.toFixed(2)}
              </td>
              <td className="px-2 py-3 text-center font-mono text-indigo-200 text-xs bg-indigo-900/80">
                {instituteRow.overall.stdDev.toFixed(2)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* LEGEND FOOTNOTE */}
      <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100 gap-2">
        <div className="flex flex-wrap items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="font-bold text-slate-700">μ (Mean):</span> Average score obtained in domain
          </span>
          <span className="flex items-center gap-1.5">
            <span className="font-bold text-slate-700">σ (Std Dev):</span> Sample standard deviation measuring performance consistency
          </span>
        </div>
        <div className="text-slate-400 font-mono text-[10px]">
          CIT Autonomous Academic Standard Evaluation
        </div>
      </div>
    </div>
  );
};
