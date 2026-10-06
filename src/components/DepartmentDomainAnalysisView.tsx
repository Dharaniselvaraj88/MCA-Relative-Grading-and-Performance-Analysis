import React, { useState, useMemo } from 'react';
import { SavedSubmission, SectionId } from '../types';
import {
  computeDepartmentDomainAnalysis,
  DepartmentDomainStats,
  downloadDomainWiseDepartmentExcelReport,
  downloadDomainWiseDepartmentCsvReport,
  downloadDomainWiseDepartmentPdfReport,
  calculateGrade
} from '../utils/exportUtils';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from 'recharts';
import {
  Building2,
  Users,
  Award,
  TrendingUp,
  Download,
  FileSpreadsheet,
  FileText,
  FileCode,
  Search,
  Filter,
  Layers,
  ArrowUpDown,
  CheckCircle2,
  AlertCircle,
  Eye,
  X,
  Target,
  Sparkles,
  Zap,
  BarChart3,
  BookOpen
} from 'lucide-react';

interface DepartmentDomainAnalysisViewProps {
  submissions: SavedSubmission[];
  onViewStudentReport?: (sub: SavedSubmission) => void;
  compactMode?: boolean;
}

const DOMAINS: { id: SectionId; name: string; shortCode: string; color: string; bgColor: string; borderColor: string }[] = [
  { id: 'calculus', name: 'Limits & Continuity', shortCode: 'LIM', color: '#3B82F6', bgColor: 'bg-blue-50', borderColor: 'border-blue-200' },
  { id: 'probability', name: 'Differentiation', shortCode: 'DIFF', color: '#10B981', bgColor: 'bg-emerald-50', borderColor: 'border-emerald-200' },
  { id: 'numberSystem', name: 'Integration', shortCode: 'INT', color: '#8B5CF6', bgColor: 'bg-purple-50', borderColor: 'border-purple-200' },
  { id: 'trigonometry', name: 'Probability & Statistics', shortCode: 'P&S', color: '#F59E0B', bgColor: 'bg-amber-50', borderColor: 'border-amber-200' },
  { id: 'statistics', name: 'Matrices & Determinants', shortCode: 'MAT', color: '#EC4899', bgColor: 'bg-pink-50', borderColor: 'border-pink-200' }
];

export const DepartmentDomainAnalysisView: React.FC<DepartmentDomainAnalysisViewProps> = ({
  submissions,
  onViewStudentReport,
  compactMode = false
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState<
    'STUDENTS' | 'OVERALL' | 'CALCULUS' | 'PROBABILITY' | 'NUMBER_SYSTEM' | 'TRIGONOMETRY' | 'STATISTICS'
  >('OVERALL');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [viewMode, setViewMode] = useState<'matrix' | 'cards' | 'charts'>('matrix');
  const [selectedDetailDept, setSelectedDetailDept] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  // Compute aggregated stats
  const { departmentStats, overallDomainStats } = useMemo(() => {
    return computeDepartmentDomainAnalysis(submissions);
  }, [submissions]);

  // Unique department list for dropdown filter
  const departmentsList = useMemo(() => {
    return Array.from(new Set(submissions.map((s) => s.student?.department || 'Unassigned'))).sort();
  }, [submissions]);

  // Filter and sort departments
  const filteredDepartments = useMemo(() => {
    let list = [...departmentStats];

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter((d) => d.department.toLowerCase().includes(q));
    }

    if (selectedDeptFilter !== 'ALL') {
      list = list.filter((d) => d.department === selectedDeptFilter);
    }

    list.sort((a, b) => {
      let valA = 0;
      let valB = 0;

      switch (sortBy) {
        case 'STUDENTS':
          valA = a.studentCount;
          valB = b.studentCount;
          break;
        case 'OVERALL':
          valA = a.overallAvgScore;
          valB = b.overallAvgScore;
          break;
        case 'CALCULUS':
          valA = a.calculusAvg;
          valB = b.calculusAvg;
          break;
        case 'PROBABILITY':
          valA = a.probabilityAvg;
          valB = b.probabilityAvg;
          break;
        case 'NUMBER_SYSTEM':
          valA = a.numberSystemAvg;
          valB = b.numberSystemAvg;
          break;
        case 'TRIGONOMETRY':
          valA = a.trigonometryAvg;
          valB = b.trigonometryAvg;
          break;
        case 'STATISTICS':
          valA = a.statisticsAvg;
          valB = b.statisticsAvg;
          break;
      }

      return sortOrder === 'desc' ? valB - valA : valA - valB;
    });

    return list;
  }, [departmentStats, searchTerm, selectedDeptFilter, sortBy, sortOrder]);

  // Chart dataset for grouped bar comparison
  const chartData = useMemo(() => {
    return filteredDepartments.map((d) => {
      let shortName = d.department;
      if (d.department.toLowerCase().includes('vlsi')) {
        shortName = 'VLSI Design & Tech';
      } else if (d.department.length > 15) {
        shortName = d.department.replace('MSc ', '').replace('B.E. ', '').replace('B.Tech ', '');
      }

      return {
        name: shortName,
        fullName: d.department,
        'Limits & Continuity': d.calculusAvg,
        'Differentiation': d.probabilityAvg,
        'Integration': d.numberSystemAvg,
        'Probability & Statistics': d.trigonometryAvg,
        'Matrices & Determinants': d.statisticsAvg,
        Overall: Number((d.overallAvgScore / 5).toFixed(2)) // normalized to /10 scale for visual parity
      };
    });
  }, [filteredDepartments]);

  // Radar chart data for selected or top department
  const activeRadarDept = useMemo(() => {
    if (selectedDetailDept) {
      return departmentStats.find((d) => d.department === selectedDetailDept);
    }
    if (selectedDeptFilter !== 'ALL') {
      return departmentStats.find((d) => d.department === selectedDeptFilter);
    }
    return filteredDepartments[0] || null;
  }, [selectedDetailDept, selectedDeptFilter, departmentStats, filteredDepartments]);

  const radarData = useMemo(() => {
    if (!activeRadarDept) return [];
    return [
      {
        domain: 'Limits & Continuity',
        DeptScore: activeRadarDept.calculusAvg,
        InstitutionalBenchmark: overallDomainStats.calculusAvg,
        fullMark: 10
      },
      {
        domain: 'Differentiation',
        DeptScore: activeRadarDept.probabilityAvg,
        InstitutionalBenchmark: overallDomainStats.probabilityAvg,
        fullMark: 10
      },
      {
        domain: 'Integration',
        DeptScore: activeRadarDept.numberSystemAvg,
        InstitutionalBenchmark: overallDomainStats.numberSystemAvg,
        fullMark: 10
      },
      {
        domain: 'Probability & Statistics',
        DeptScore: activeRadarDept.trigonometryAvg,
        InstitutionalBenchmark: overallDomainStats.trigonometryAvg,
        fullMark: 10
      },
      {
        domain: 'Matrices & Determinants',
        DeptScore: activeRadarDept.statisticsAvg,
        InstitutionalBenchmark: overallDomainStats.statisticsAvg,
        fullMark: 10
      }
    ];
  }, [activeRadarDept, overallDomainStats]);

  // Find top and growth domains across institution
  const institutionalDomainRanking = useMemo(() => {
    const arr = [
      { name: 'Limits & Continuity', score: overallDomainStats.calculusAvg },
      { name: 'Differentiation', score: overallDomainStats.probabilityAvg },
      { name: 'Integration', score: overallDomainStats.numberSystemAvg },
      { name: 'Probability & Statistics', score: overallDomainStats.trigonometryAvg },
      { name: 'Matrices & Determinants', score: overallDomainStats.statisticsAvg }
    ];
    arr.sort((a, b) => b.score - a.score);
    return {
      strongest: arr[0],
      weakest: arr[arr.length - 1]
    };
  }, [overallDomainStats]);

  // Top department overall
  const topDepartment = useMemo(() => {
    if (departmentStats.length === 0) return null;
    return [...departmentStats].sort((a, b) => b.overallAvgScore - a.overallAvgScore)[0];
  }, [departmentStats]);

  // Submissions for modal deep-dive
  const detailDeptSubmissions = useMemo(() => {
    if (!selectedDetailDept) return [];
    return submissions.filter((s) => (s.student?.department || 'Unassigned') === selectedDetailDept);
  }, [selectedDetailDept, submissions]);

  // Export handlers
  const handleExportExcel = async () => {
    try {
      setIsExporting(true);
      await downloadDomainWiseDepartmentExcelReport(submissions);
    } catch (err) {
      console.error('Excel Export Error:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportCsv = () => {
    try {
      downloadDomainWiseDepartmentCsvReport(submissions);
    } catch (err) {
      console.error('CSV Export Error:', err);
    }
  };

  const handleExportPdf = async () => {
    try {
      setIsExporting(true);
      await downloadDomainWiseDepartmentPdfReport(submissions);
    } catch (err) {
      console.error('PDF Export Error:', err);
    } finally {
      setIsExporting(false);
    }
  };

  // Helper for score badge styling
  const getScoreBadge = (score: number, max = 10) => {
    const pct = (score / max) * 100;
    if (pct >= 80) {
      return {
        bg: 'bg-emerald-50 text-emerald-800 border-emerald-300',
        dot: 'bg-emerald-500',
        label: 'Mastery'
      };
    }
    if (pct >= 60) {
      return {
        bg: 'bg-blue-50 text-blue-800 border-blue-300',
        dot: 'bg-blue-500',
        label: 'Proficient'
      };
    }
    if (pct >= 40) {
      return {
        bg: 'bg-amber-50 text-amber-800 border-amber-300',
        dot: 'bg-amber-500',
        label: 'Satisfactory'
      };
    }
    return {
      bg: 'bg-rose-50 text-rose-800 border-rose-300',
      dot: 'bg-rose-500',
      label: 'Needs Growth'
    };
  };

  return (
    <div className="space-y-6" id="department-domain-analysis-view">
      {/* HEADER BANNER */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-lg border border-indigo-200">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-extrabold text-slate-900">
                Department Domain-Wise Cognitive Analysis
              </h2>
              <p className="text-xs text-slate-600 mt-0.5">
                Evaluates sectional mastery across Limits & Continuity, Differentiation, Integration, Probability & Statistics & Matrices & Determinants (10 Marks each).
              </p>
            </div>
          </div>
        </div>

        {/* EXPORT ACTION BUTTONS */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleExportExcel}
            disabled={isExporting || submissions.length === 0}
            className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            title="Export full matrix and student-level breakdown to Excel"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Export Excel</span>
          </button>

          <button
            type="button"
            onClick={handleExportCsv}
            disabled={submissions.length === 0}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-900 disabled:opacity-50 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            title="Export CSV data"
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>

          <button
            type="button"
            onClick={handleExportPdf}
            disabled={isExporting || submissions.length === 0}
            className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            title="Export official Landscape PDF report"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Export PDF</span>
          </button>
        </div>
      </div>

      {/* TOP KPI CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Total Evaluated */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1">
            <span>Evaluated Headcount</span>
            <Users className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-2xl font-extrabold font-mono text-slate-900">{submissions.length}</p>
          <p className="text-[11px] text-slate-500 mt-1">Across {departmentStats.length} departments</p>
        </div>

        {/* Institutional Average */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1">
            <span>Institutional Average</span>
            <Award className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-extrabold font-mono text-emerald-700">
            {overallDomainStats.overallAvg} <span className="text-xs text-slate-500 font-sans">/ 50</span>
          </p>
          <p className="text-[11px] text-emerald-600 font-medium mt-1">
            {Math.round((overallDomainStats.overallAvg / 50) * 100)}% overall mastery
          </p>
        </div>

        {/* Top Department */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1">
            <span>Top Performing Dept</span>
            <Sparkles className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-sm font-extrabold text-slate-900 truncate" title={topDepartment?.department || 'N/A'}>
            {topDepartment?.department || 'N/A'}
          </p>
          <p className="text-[11px] text-indigo-600 font-bold font-mono mt-1">
            {topDepartment ? `${topDepartment.overallAvgScore}/50 (${topDepartment.overallAvgPercentage}%)` : '-'}
          </p>
        </div>

        {/* Top & Growth Domain */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1">
            <span>Domain Benchmark</span>
            <Zap className="w-4 h-4 text-purple-500" />
          </div>
          <div className="space-y-0.5 mt-0.5">
            <p className="text-[11px] text-emerald-700 font-semibold truncate flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              Top: {institutionalDomainRanking.strongest.name} ({institutionalDomainRanking.strongest.score}/10)
            </p>
            <p className="text-[11px] text-rose-700 font-semibold truncate flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
              Growth: {institutionalDomainRanking.weakest.name} ({institutionalDomainRanking.weakest.score}/10)
            </p>
          </div>
        </div>
      </div>

      {/* INSTITUTIONAL DOMAIN SCORE OVERVIEW PILLS */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
        <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5 flex items-center gap-2">
          <Layers className="w-4 h-4 text-slate-500" />
          <span>Institutional Domain Score Baselines (10 Marks Each):</span>
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
          {DOMAINS.map((dom) => {
            let avg = 0;
            switch (dom.id) {
              case 'calculus':
                avg = overallDomainStats.calculusAvg;
                break;
              case 'probability':
                avg = overallDomainStats.probabilityAvg;
                break;
              case 'numberSystem':
                avg = overallDomainStats.numberSystemAvg;
                break;
              case 'trigonometry':
                avg = overallDomainStats.trigonometryAvg;
                break;
              case 'statistics':
                avg = overallDomainStats.statisticsAvg;
                break;
            }
            const pct = Math.round((avg / 10) * 100);
            return (
              <div
                key={dom.id}
                className={`bg-white border ${dom.borderColor} p-3 rounded-lg shadow-2xs flex flex-col justify-between`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">{dom.name}</span>
                  <span
                    className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded text-white"
                    style={{ backgroundColor: dom.color }}
                  >
                    {dom.shortCode}
                  </span>
                </div>
                <div className="mt-2 flex items-baseline justify-between">
                  <span className="text-lg font-extrabold font-mono text-slate-900">
                    {avg} <span className="text-xs text-slate-500">/10</span>
                  </span>
                  <span className="text-xs font-bold text-slate-600">{pct}%</span>
                </div>
                <div className="w-full bg-slate-100 h-1.5 rounded-full mt-1.5 overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: dom.color }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* FILTER & VIEW MODE TOOLBAR */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5 flex-1">
          {/* Search input */}
          <div className="relative min-w-[200px] flex-1 sm:flex-initial">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search department..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800"
            />
          </div>

          {/* Department Filter Dropdown */}
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <select
              value={selectedDeptFilter}
              onChange={(e) => setSelectedDeptFilter(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value="ALL">All Departments ({departmentStats.length})</option>
              {departmentsList.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          </div>

          {/* Sort By Dropdown */}
          <div className="flex items-center gap-1.5">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value="OVERALL">Sort by Overall Score</option>
              <option value="STUDENTS">Sort by Headcount (N)</option>
              <option value="CALCULUS">Sort by Limits & Continuity Avg</option>
              <option value="PROBABILITY">Sort by Differentiation Avg</option>
              <option value="NUMBER_SYSTEM">Sort by Integration Avg</option>
              <option value="TRIGONOMETRY">Sort by Probability & Statistics Avg</option>
              <option value="STATISTICS">Sort by Matrices & Determinants Avg</option>
            </select>

            <button
              type="button"
              onClick={() => setSortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'))}
              className="px-2 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-700 cursor-pointer"
              title={`Toggle sort order (Current: ${sortOrder.toUpperCase()})`}
            >
              {sortOrder === 'desc' ? 'DESC ↓' : 'ASC ↑'}
            </button>
          </div>
        </div>

        {/* View Mode Toggle Buttons */}
        <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 self-start lg:self-auto">
          <button
            type="button"
            onClick={() => setViewMode('matrix')}
            className={`px-3 py-1 text-xs font-bold rounded-md transition-colors cursor-pointer ${
              viewMode === 'matrix' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Matrix Table
          </button>
          <button
            type="button"
            onClick={() => setViewMode('cards')}
            className={`px-3 py-1 text-xs font-bold rounded-md transition-colors cursor-pointer ${
              viewMode === 'cards' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Dept Cards
          </button>
          <button
            type="button"
            onClick={() => setViewMode('charts')}
            className={`px-3 py-1 text-xs font-bold rounded-md transition-colors cursor-pointer ${
              viewMode === 'charts' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Visual Charts
          </button>
        </div>
      </div>

      {/* VIEW MODE 1: MATRIX & HEATMAP TABLE */}
      {viewMode === 'matrix' && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-800 text-white border-b border-slate-700">
                  <th className="py-3 px-3.5 font-bold uppercase tracking-wider text-[11px] w-12 text-center">#</th>
                  <th className="py-3 px-4 font-bold uppercase tracking-wider text-[11px]">Department Name</th>
                  <th className="py-3 px-3 font-bold uppercase tracking-wider text-[11px] text-center">Students</th>
                  <th className="py-3 px-3 font-bold uppercase tracking-wider text-[11px] text-center bg-blue-900/40 text-blue-200">
                    Limits & Continuity (/10)
                  </th>
                  <th className="py-3 px-3 font-bold uppercase tracking-wider text-[11px] text-center bg-emerald-900/40 text-emerald-200">
                    Differentiation (/10)
                  </th>
                  <th className="py-3 px-3 font-bold uppercase tracking-wider text-[11px] text-center bg-purple-900/40 text-purple-200">
                    Integration (/10)
                  </th>
                  <th className="py-3 px-3 font-bold uppercase tracking-wider text-[11px] text-center bg-amber-900/40 text-amber-200">
                    Probability & Statistics (/10)
                  </th>
                  <th className="py-3 px-3 font-bold uppercase tracking-wider text-[11px] text-center bg-pink-900/40 text-pink-200">
                    Matrices & Determinants (/10)
                  </th>
                  <th className="py-3 px-4 font-bold uppercase tracking-wider text-[11px] text-center bg-slate-900 text-cyan-300">
                    Overall (/50)
                  </th>
                  <th className="py-3 px-3.5 font-bold uppercase tracking-wider text-[11px]">Strongest Domain</th>
                  <th className="py-3 px-3.5 font-bold uppercase tracking-wider text-[11px]">Growth Area</th>
                  <th className="py-3 px-3 font-bold uppercase tracking-wider text-[11px] text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-700">
                {filteredDepartments.length > 0 ? (
                  filteredDepartments.map((dept, idx) => {
                    const overallBadge = getScoreBadge(dept.overallAvgScore, 50);
                    return (
                      <tr
                        key={dept.department}
                        className={`hover:bg-slate-50/80 transition-colors ${
                          idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'
                        }`}
                      >
                        <td className="py-3 px-3.5 text-center font-mono font-bold text-slate-500">{idx + 1}</td>
                        <td className="py-3 px-4 font-semibold text-slate-900">
                          <div className="flex items-center gap-2">
                            <span className="truncate max-w-[220px]" title={dept.department}>
                              {dept.department}
                            </span>
                            {dept.masteryCount > 0 && (
                              <span
                                className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200"
                                title={`${dept.masteryCount} students scored >=80%`}
                              >
                                {dept.masteryCount} 🌟
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-3 text-center font-mono font-bold text-slate-800">
                          <span className="px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-[11px]">
                            {dept.studentCount}
                          </span>
                        </td>

                        {/* Limits & Continuity */}
                        <td className="py-3 px-3 text-center">
                          <div className="inline-flex flex-col items-center">
                            <span className="font-mono font-bold text-blue-700">{dept.calculusAvg}</span>
                            <span className="text-[10px] text-slate-500">{dept.calculusPct}%</span>
                          </div>
                        </td>

                        {/* Differentiation */}
                        <td className="py-3 px-3 text-center">
                          <div className="inline-flex flex-col items-center">
                            <span className="font-mono font-bold text-emerald-700">{dept.probabilityAvg}</span>
                            <span className="text-[10px] text-slate-500">{dept.probabilityPct}%</span>
                          </div>
                        </td>

                        {/* Integration */}
                        <td className="py-3 px-3 text-center">
                          <div className="inline-flex flex-col items-center">
                            <span className="font-mono font-bold text-purple-700">{dept.numberSystemAvg}</span>
                            <span className="text-[10px] text-slate-500">{dept.numberSystemPct}%</span>
                          </div>
                        </td>

                        {/* Probability & Statistics */}
                        <td className="py-3 px-3 text-center">
                          <div className="inline-flex flex-col items-center">
                            <span className="font-mono font-bold text-amber-700">{dept.trigonometryAvg}</span>
                            <span className="text-[10px] text-slate-500">{dept.trigonometryPct}%</span>
                          </div>
                        </td>

                        {/* Matrices & Determinants */}
                        <td className="py-3 px-3 text-center">
                          <div className="inline-flex flex-col items-center">
                            <span className="font-mono font-bold text-pink-700">{dept.statisticsAvg}</span>
                            <span className="text-[10px] text-slate-500">{dept.statisticsPct}%</span>
                          </div>
                        </td>

                        {/* Overall Score */}
                        <td className="py-3 px-4 text-center bg-slate-50">
                          <div className="inline-flex flex-col items-center">
                            <span className="font-mono font-black text-slate-900 text-sm">
                              {dept.overallAvgScore} <span className="text-[10px] text-slate-500 font-normal">/50</span>
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold border mt-0.5 ${overallBadge.bg}`}
                            >
                              {dept.overallAvgPercentage}% ({calculateGrade(dept.overallAvgPercentage).grade})
                            </span>
                          </div>
                        </td>

                        {/* Strongest */}
                        <td className="py-3 px-3.5">
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                            <span>{dept.strongestDomain}</span>
                          </span>
                        </td>

                        {/* Weakest / Growth Area */}
                        <td className="py-3 px-3.5">
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded">
                            <AlertCircle className="w-3 h-3 text-rose-600 shrink-0" />
                            <span>{dept.weakestDomain}</span>
                          </span>
                        </td>

                        {/* Action */}
                        <td className="py-3 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => setSelectedDetailDept(dept.department)}
                            className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded text-[11px] font-bold transition-colors cursor-pointer flex items-center gap-1 mx-auto"
                            title="Inspect individual students and granular domain analytics"
                          >
                            <Eye className="w-3 h-3" />
                            <span>Inspect</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={12} className="py-10 text-center text-slate-400">
                      No departments match the specified search or filter criteria.
                    </td>
                  </tr>
                )}
              </tbody>

              {/* TABLE SUMMARY FOOTER ROW */}
              {filteredDepartments.length > 0 && (
                <tfoot>
                  <tr className="bg-slate-900 text-white font-bold border-t-2 border-slate-700">
                    <td colSpan={2} className="py-3.5 px-4 uppercase tracking-wider text-xs text-cyan-300">
                      Institutional Benchmark Total ({submissions.length} Students)
                    </td>
                    <td className="py-3.5 px-3 text-center font-mono text-xs">{submissions.length}</td>
                    <td className="py-3.5 px-3 text-center font-mono text-blue-300 text-xs">
                      {overallDomainStats.calculusAvg} ({Math.round((overallDomainStats.calculusAvg / 10) * 100)}%)
                    </td>
                    <td className="py-3.5 px-3 text-center font-mono text-emerald-300 text-xs">
                      {overallDomainStats.probabilityAvg} ({Math.round((overallDomainStats.probabilityAvg / 10) * 100)}%)
                    </td>
                    <td className="py-3.5 px-3 text-center font-mono text-purple-300 text-xs">
                      {overallDomainStats.numberSystemAvg} ({Math.round((overallDomainStats.numberSystemAvg / 10) * 100)}%)
                    </td>
                    <td className="py-3.5 px-3 text-center font-mono text-amber-300 text-xs">
                      {overallDomainStats.trigonometryAvg} ({Math.round((overallDomainStats.trigonometryAvg / 10) * 100)}%)
                    </td>
                    <td className="py-3.5 px-3 text-center font-mono text-pink-300 text-xs">
                      {overallDomainStats.statisticsAvg} ({Math.round((overallDomainStats.statisticsAvg / 10) * 100)}%)
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono text-emerald-400 text-sm">
                      {overallDomainStats.overallAvg} / 50 ({Math.round((overallDomainStats.overallAvg / 50) * 100)}%)
                    </td>
                    <td colSpan={3} className="py-3.5 px-4 text-slate-400 text-[11px] font-normal">
                      Based on standard CIT 50-mark assessment baseline
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}

      {/* VIEW MODE 2: DEPARTMENT PERFORMANCE CARDS */}
      {viewMode === 'cards' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDepartments.map((dept) => {
            const overallBadge = getScoreBadge(dept.overallAvgScore, 50);
            return (
              <div
                key={dept.department}
                className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-2 pb-3 border-b border-slate-100">
                    <div>
                      <h4 className="font-extrabold text-slate-900 text-sm leading-snug">{dept.department}</h4>
                      <p className="text-xs text-slate-500 font-mono mt-0.5">
                        {dept.studentCount} Evaluated Student{dept.studentCount > 1 ? 's' : ''}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-lg font-black font-mono text-slate-900">{dept.overallAvgScore}</span>
                      <span className="text-xs text-slate-500 font-sans"> /50</span>
                      <div className={`px-2 py-0.5 rounded text-[10px] font-bold border mt-0.5 ${overallBadge.bg}`}>
                        {dept.overallAvgPercentage}%
                      </div>
                    </div>
                  </div>

                  {/* 5 Domain Progress Rows */}
                  <div className="space-y-2.5 my-4">
                    {DOMAINS.map((dom) => {
                      let score = 0;
                      let pct = 0;
                      switch (dom.id) {
                        case 'calculus':
                          score = dept.calculusAvg;
                          pct = dept.calculusPct;
                          break;
                        case 'probability':
                          score = dept.probabilityAvg;
                          pct = dept.probabilityPct;
                          break;
                        case 'numberSystem':
                          score = dept.numberSystemAvg;
                          pct = dept.numberSystemPct;
                          break;
                        case 'trigonometry':
                          score = dept.trigonometryAvg;
                          pct = dept.trigonometryPct;
                          break;
                        case 'statistics':
                          score = dept.statisticsAvg;
                          pct = dept.statisticsPct;
                          break;
                      }

                      return (
                        <div key={dom.id} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: dom.color }}></span>
                              {dom.name}
                            </span>
                            <span className="font-mono font-bold text-slate-900">
                              {score} <span className="text-[10px] text-slate-500">/10 ({pct}%)</span>
                            </span>
                          </div>
                          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-300"
                              style={{ width: `${pct}%`, backgroundColor: dom.color }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Highlights Box */}
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-500 font-medium">Strongest Domain:</span>
                      <span className="font-bold text-emerald-700">{dept.strongestDomain}</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-500 font-medium">Growth Focus:</span>
                      <span className="font-bold text-rose-700">{dept.weakestDomain}</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-500 font-medium">Mastery Students (≥80%):</span>
                      <span className="font-mono font-bold text-indigo-700">{dept.masteryCount}</span>
                    </div>
                  </div>
                </div>

                {/* Card Action Button */}
                <button
                  type="button"
                  onClick={() => setSelectedDetailDept(dept.department)}
                  className="mt-4 w-full py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Inspect Department Breakdown</span>
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* VIEW MODE 3: VISUAL COMPARISON CHARTS */}
      {viewMode === 'charts' && (
        <div className="space-y-6">
          {/* Chart 1: Domain Comparison Bar Chart */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 mb-4 border-b border-slate-200 gap-2">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-blue-600" />
                  <span>Cross-Department Domain Performance Comparison (Score / 10)</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Side-by-side comparative scores across Limits & Continuity, Differentiation, Integration, Probability & Statistics, and Matrices & Determinants.
                </p>
              </div>
              <span className="text-xs font-mono font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded">
                Top {chartData.length} Departments
              </span>
            </div>

            {chartData.length > 0 ? (
              <div className="w-full h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 25 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis dataKey="name" stroke="#64748B" fontSize={11} interval={0} angle={-15} textAnchor="end" />
                    <YAxis domain={[0, 10]} stroke="#64748B" fontSize={11} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0F172A',
                        borderColor: '#334155',
                        borderRadius: '8px',
                        color: '#FFF',
                        fontSize: '12px'
                      }}
                      formatter={(val: any, name: any) => [`${val} / 10 marks`, name]}
                      labelFormatter={(label: any, payload: any) => {
                        if (payload && payload[0]) return payload[0].payload.fullName;
                        return label;
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                    <Bar dataKey="Limits & Continuity" fill="#3B82F6" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="Differentiation" fill="#10B981" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="Integration" fill="#8B5CF6" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="Probability & Statistics" fill="#F59E0B" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="Matrices & Determinants" fill="#EC4899" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="py-16 text-center text-slate-400 text-xs">No records available for chart visualization.</div>
            )}
          </div>

          {/* Chart 2: Radar Mastery Profile */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-200">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Target className="w-4 h-4 text-purple-600" />
                    <span>Cognitive Competency Radar Polygon</span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    {activeRadarDept?.department} vs Institutional Benchmark
                  </p>
                </div>

                {/* Dropdown to switch radar department */}
                <select
                  value={activeRadarDept?.department || ''}
                  onChange={(e) => setSelectedDetailDept(e.target.value)}
                  className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer"
                >
                  {departmentStats.map((d) => (
                    <option key={d.department} value={d.department}>
                      {d.department}
                    </option>
                  ))}
                </select>
              </div>

              {radarData.length > 0 ? (
                <div className="w-full h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
                      <PolarGrid stroke="#CBD5E1" />
                      <PolarAngleAxis dataKey="domain" stroke="#475569" fontSize={11} />
                      <PolarRadiusAxis angle={30} domain={[0, 10]} stroke="#94A3B8" fontSize={10} />
                      <Radar
                        name={activeRadarDept?.department || 'Department'}
                        dataKey="DeptScore"
                        stroke="#6366F1"
                        fill="#6366F1"
                        fillOpacity={0.45}
                      />
                      <Radar
                        name="Institutional Benchmark"
                        dataKey="InstitutionalBenchmark"
                        stroke="#10B981"
                        fill="#10B981"
                        fillOpacity={0.2}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#0F172A',
                          borderColor: '#334155',
                          borderRadius: '8px',
                          color: '#FFF',
                          fontSize: '12px'
                        }}
                        formatter={(val: any, name: any) => [`${val} / 10 marks`, name]}
                      />
                      <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              ) : null}
            </div>

            {/* Department Pedagogical Diagnostic */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 flex flex-col justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4 text-indigo-600" />
                  <span>Curriculum & Pedagogical Notes</span>
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Based on sectional assessment metrics for <strong>{activeRadarDept?.department}</strong>:
                </p>

                <div className="space-y-3 mt-3 text-xs">
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-900">
                    <p className="font-bold flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>Key Strength: {activeRadarDept?.strongestDomain}</span>
                    </p>
                    <p className="text-[11px] text-emerald-700 mt-1">
                      Students demonstrated robust conceptual grasp and quick computation in {activeRadarDept?.strongestDomain} modules.
                    </p>
                  </div>

                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-900">
                    <p className="font-bold flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                      <span>Target Remediation: {activeRadarDept?.weakestDomain}</span>
                    </p>
                    <p className="text-[11px] text-rose-700 mt-1">
                      Recommend hosting targeted problem-solving workshops and tutorial problem sets in {activeRadarDept?.weakestDomain}.
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 mt-4 text-[11px] text-slate-500 font-mono">
                Total Evaluated in Dept: {activeRadarDept?.studentCount} | Avg Score: {activeRadarDept?.overallAvgScore}/50
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: GRANULAR DEPARTMENT STUDENT-LEVEL BREAKDOWN */}
      {selectedDetailDept && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-150">
            {/* Modal Header */}
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-500/20 text-indigo-300 rounded-lg border border-indigo-400/30">
                  <Building2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                    <span>{selectedDetailDept}</span>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-mono bg-indigo-900 text-indigo-200 border border-indigo-700">
                      {detailDeptSubmissions.length} Students
                    </span>
                  </h3>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Individual student domain marks (Limits & Continuity, Differentiation, Integration, Probability & Statistics, Matrices & Determinants)
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedDetailDept(null)}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body: Student List Table */}
            <div className="p-5 overflow-y-auto flex-1 space-y-4">
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-800 border-b border-slate-200 font-bold">
                      <th className="py-2.5 px-3 text-center">#</th>
                      <th className="py-2.5 px-3">Register Number</th>
                      <th className="py-2.5 px-3">Student Name</th>
                      <th className="py-2.5 px-2.5 text-center text-blue-700">LIM (/10)</th>
                      <th className="py-2.5 px-2.5 text-center text-emerald-700">DIFF (/10)</th>
                      <th className="py-2.5 px-2.5 text-center text-purple-700">INT (/10)</th>
                      <th className="py-2.5 px-2.5 text-center text-amber-700">P&S (/10)</th>
                      <th className="py-2.5 px-2.5 text-center text-pink-700">MAT (/10)</th>
                      <th className="py-2.5 px-3 text-center bg-slate-200/70">Total (/50)</th>
                      <th className="py-2.5 px-3 text-center">Grade</th>
                      <th className="py-2.5 px-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-slate-700">
                    {detailDeptSubmissions.map((sub, sIdx) => {
                      const sec = sub.report?.sectionScores;
                      const cScore = sec?.calculus?.score ?? 0;
                      const pScore = sec?.probability?.score ?? 0;
                      const nScore = sec?.numberSystem?.score ?? 0;
                      const tScore = sec?.trigonometry?.score ?? 0;
                      const sScore = sec?.statistics?.score ?? 0;
                      const total = sub.report?.overallScore ?? (cScore + pScore + nScore + tScore + sScore);
                      const pct = sub.report?.overallPercentage ?? Math.round((total / 50) * 100);
                      const gradeObj = calculateGrade(pct);

                      return (
                        <tr key={sub.id} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3 text-center font-mono text-slate-500 font-bold">{sIdx + 1}</td>
                          <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                            {sub.student?.registerNo || '-'}
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-slate-800">{sub.student?.name || '-'}</td>
                          <td className="py-2.5 px-2.5 text-center font-mono font-bold text-blue-700">{cScore}</td>
                          <td className="py-2.5 px-2.5 text-center font-mono font-bold text-emerald-700">{pScore}</td>
                          <td className="py-2.5 px-2.5 text-center font-mono font-bold text-purple-700">{nScore}</td>
                          <td className="py-2.5 px-2.5 text-center font-mono font-bold text-amber-700">{tScore}</td>
                          <td className="py-2.5 px-2.5 text-center font-mono font-bold text-pink-700">{sScore}</td>
                          <td className="py-2.5 px-3 text-center font-mono font-black text-slate-900 bg-slate-50">
                            {total} <span className="text-[10px] text-slate-500">({pct}%)</span>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                gradeObj.grade === 'A'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : gradeObj.grade === 'B'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              Grade {gradeObj.grade}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            {onViewStudentReport && (
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedDetailDept(null);
                                  onViewStudentReport(sub);
                                }}
                                className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded text-[11px] font-bold transition-colors cursor-pointer"
                              >
                                View Report
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                Department domain analysis computed directly from student test submissions.
              </span>
              <button
                type="button"
                onClick={() => setSelectedDetailDept(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
              >
                Close Breakdown
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default DepartmentDomainAnalysisView;
