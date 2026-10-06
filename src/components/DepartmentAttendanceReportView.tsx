import React, { useState, useMemo, useEffect } from 'react';
import {
  Users,
  Building2,
  Clock,
  CheckCircle2,
  Radio,
  AlertTriangle,
  Download,
  FileSpreadsheet,
  FileText,
  Printer,
  Search,
  Filter,
  RefreshCw,
  Calendar,
  Layers,
  ArrowUpDown,
  Check,
  X,
  ChevronRight,
  ShieldCheck
} from 'lucide-react';
import { SavedSubmission } from '../types';
import {
  ActiveStudentSession,
  StudentLoginRecord,
  fetchStudentLoginsFromFirestore
} from '../lib/firebase';
import {
  buildAttendanceReportData,
  exportAttendanceReportToExcel,
  exportAttendanceReportToPDF,
  exportAttendanceReportToCSV,
  StudentAttendanceRecord,
  DepartmentAttendanceSummary
} from '../utils/attendanceReportUtils';
import { STANDARD_PROGRAMMES } from '../utils/testManagerUtils';

interface DepartmentAttendanceReportViewProps {
  submissions: SavedSubmission[];
  activeSessions?: ActiveStudentSession[];
  configuredDepartments?: Array<{ name: string; code?: string }>;
  onRefreshData?: () => void;
}

export const DepartmentAttendanceReportView: React.FC<DepartmentAttendanceReportViewProps> = ({
  submissions = [],
  activeSessions = [],
  configuredDepartments = STANDARD_PROGRAMMES,
  onRefreshData
}) => {
  const [additionalLogins, setAdditionalLogins] = useState<StudentLoginRecord[]>([]);
  const [isLoadingLogins, setIsLoadingLogins] = useState(false);
  const [selectedDept, setSelectedDept] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<'ALL' | 'COMPLETED' | 'IN_PROGRESS' | 'INTERRUPTED'>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [sortField, setSortField] = useState<'sNo' | 'registerNo' | 'studentName' | 'department' | 'loginTimestamp'>('department');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [exportToast, setExportToast] = useState<string | null>(null);

  // Load any dedicated student logins from Firestore & localStorage
  useEffect(() => {
    let isMounted = true;
    const loadLogins = async () => {
      setIsLoadingLogins(true);
      try {
        const logins = await fetchStudentLoginsFromFirestore();
        if (isMounted && logins) {
          setAdditionalLogins(logins);
        }
      } catch (err) {
        console.warn('Could not fetch additional student logins:', err);
      } finally {
        if (isMounted) setIsLoadingLogins(false);
      }
    };
    loadLogins();
    return () => {
      isMounted = false;
    };
  }, []);

  // Build full synthesized attendance report
  const fullReport = useMemo(() => {
    return buildAttendanceReportData(
      submissions,
      activeSessions,
      additionalLogins,
      configuredDepartments
    );
  }, [submissions, activeSessions, additionalLogins, configuredDepartments]);

  // Filter candidate records
  const filteredCandidates = useMemo(() => {
    let list = [...fullReport.candidateRecords];

    // Department filter
    if (selectedDept !== 'ALL') {
      list = list.filter((c) =>
        c.department.toLowerCase().includes(selectedDept.toLowerCase()) ||
        c.departmentCode.toLowerCase() === selectedDept.toLowerCase()
      );
    }

    // Status filter
    if (selectedStatus !== 'ALL') {
      list = list.filter((c) => c.status === selectedStatus);
    }

    // Search term
    if (searchTerm.trim()) {
      const q = searchTerm.trim().toLowerCase();
      list = list.filter((c) =>
        c.registerNo.toLowerCase().includes(q) ||
        c.studentName.toLowerCase().includes(q) ||
        c.department.toLowerCase().includes(q) ||
        c.loginTimeFormatted.toLowerCase().includes(q)
      );
    }

    // Sort
    list.sort((a, b) => {
      let comparison = 0;
      if (sortField === 'sNo') {
        comparison = a.sNo - b.sNo;
      } else if (sortField === 'registerNo') {
        comparison = a.registerNo.localeCompare(b.registerNo);
      } else if (sortField === 'studentName') {
        comparison = a.studentName.localeCompare(b.studentName);
      } else if (sortField === 'department') {
        comparison = a.department.localeCompare(b.department);
        if (comparison === 0) {
          comparison = a.loginTimestamp - b.loginTimestamp;
        }
      } else if (sortField === 'loginTimestamp') {
        comparison = a.loginTimestamp - b.loginTimestamp;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return list;
  }, [fullReport.candidateRecords, selectedDept, selectedStatus, searchTerm, sortField, sortOrder]);

  // Toast auto-clear
  useEffect(() => {
    if (exportToast) {
      const timer = setTimeout(() => setExportToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [exportToast]);

  const handleExportExcel = async () => {
    setIsExportingExcel(true);
    setExportToast('Generating Department-wise Attendance Excel (.xlsx) Report...');
    try {
      await exportAttendanceReportToExcel(fullReport, selectedDept);
      setExportToast('✅ Department Attendance Excel Report downloaded successfully!');
    } catch (err: any) {
      console.error('Excel export error:', err);
      setExportToast('❌ Failed to export Attendance Excel Report.');
    } finally {
      setIsExportingExcel(false);
    }
  };

  const handleExportPDF = async () => {
    setIsExportingPDF(true);
    setExportToast('Generating Consolidated Attendance PDF Report...');
    try {
      await exportAttendanceReportToPDF(fullReport, selectedDept);
      setExportToast('✅ Official Attendance PDF downloaded successfully!');
    } catch (err: any) {
      console.error('PDF export error:', err);
      setExportToast('❌ Failed to generate Attendance PDF.');
    } finally {
      setIsExportingPDF(false);
    }
  };

  const handleExportCSV = () => {
    try {
      exportAttendanceReportToCSV(fullReport, selectedDept);
      setExportToast('✅ CSV Attendance Report downloaded successfully!');
    } catch (err) {
      setExportToast('❌ Failed to download CSV.');
    }
  };

  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const instSummary = fullReport.institutionalSummary;

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* EXPORT TOAST NOTIFICATION */}
      {exportToast && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white px-5 py-3 rounded-xl shadow-2xl border border-slate-700 flex items-center gap-3 text-sm font-semibold animate-in slide-in-from-bottom-5">
          <span>{exportToast}</span>
          <button
            type="button"
            onClick={() => setExportToast(null)}
            className="text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* INSTITUTIONAL HEADER & TOOLBAR */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide uppercase bg-blue-100 text-blue-800 border border-blue-200">
                Official Examination Register
              </span>
              <span className="text-xs text-slate-500 font-medium">
                Autonomous Institution Affiliated to Anna University
              </span>
            </div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
              <Users className="w-6 h-6 text-blue-600" />
              <span>Department-wise Student Attendance Report</span>
            </h2>
            <p className="text-sm text-slate-600 max-w-3xl">
              Real-time attendance audit and candidate portal login timestamps across all academic engineering departments. Tracks student entry timestamps, completion status, and active workstations.
            </p>
          </div>

          {/* Action Export Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={handleExportExcel}
              disabled={isExportingExcel || fullReport.candidateRecords.length === 0}
              className="px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs shadow-xs flex items-center gap-2 transition-all cursor-pointer"
              title="Download comprehensive multi-sheet Excel workbook with Attendance Summary and Candidate Register"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-100" />
              <span>{isExportingExcel ? 'Exporting...' : 'Export Excel (.xlsx)'}</span>
            </button>

            <button
              type="button"
              onClick={handleExportPDF}
              disabled={isExportingPDF || fullReport.candidateRecords.length === 0}
              className="px-3.5 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs shadow-xs flex items-center gap-2 transition-all cursor-pointer"
              title="Download institutional landscape PDF report with department matrix, candidate log, and official sign-off"
            >
              <FileText className="w-4 h-4 text-rose-100" />
              <span>{isExportingPDF ? 'Generating...' : 'Export PDF'}</span>
            </button>

            <button
              type="button"
              onClick={handleExportCSV}
              disabled={fullReport.candidateRecords.length === 0}
              className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-900 disabled:opacity-50 text-white font-bold rounded-xl text-xs shadow-xs flex items-center gap-2 transition-all cursor-pointer"
              title="Download CSV attendance roster"
            >
              <Download className="w-4 h-4 text-slate-200" />
              <span>Export CSV</span>
            </button>

            <button
              type="button"
              onClick={() => setIsPrintModalOpen(true)}
              disabled={fullReport.candidateRecords.length === 0}
              className="px-3.5 py-2.5 bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white font-bold rounded-xl text-xs shadow-xs flex items-center gap-2 transition-all cursor-pointer"
              title="Open printable official register with institutional letterhead and signature lines"
            >
              <Printer className="w-4 h-4 text-blue-200" />
              <span>Print Official Register</span>
            </button>

            {onRefreshData && (
              <button
                type="button"
                onClick={onRefreshData}
                className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all cursor-pointer"
                title="Refresh attendance records from Firestore"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* EXECUTIVE SUMMARY KPI CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* KPI 1: Total Candidates Attended */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1.5">
            <span className="text-xs font-bold uppercase tracking-wider">Total Attended</span>
            <Users className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono">{instSummary.totalCandidates}</div>
          <p className="text-[11px] text-slate-500 mt-1">Distinct students logged in</p>
        </div>

        {/* KPI 2: Total Departments */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1.5">
            <span className="text-xs font-bold uppercase tracking-wider">Departments</span>
            <Building2 className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono">{instSummary.totalDepartments}</div>
          <p className="text-[11px] text-slate-500 mt-1">Branches represented</p>
        </div>

        {/* KPI 3: Completed Submissions */}
        <div className="bg-white border border-emerald-200 rounded-xl p-4 shadow-xs bg-emerald-50/20">
          <div className="flex items-center justify-between text-emerald-800 mb-1.5">
            <span className="text-xs font-bold uppercase tracking-wider">Completed</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-700 font-mono">{instSummary.completedCount}</div>
          <p className="text-[11px] text-emerald-600 font-semibold mt-1">{instSummary.completionRate}% completion rate</p>
        </div>

        {/* KPI 4: Active In-Progress */}
        <div className="bg-white border border-blue-200 rounded-xl p-4 shadow-xs bg-blue-50/20">
          <div className="flex items-center justify-between text-blue-800 mb-1.5">
            <span className="text-xs font-bold uppercase tracking-wider">Active Terminals</span>
            <Radio className="w-4 h-4 text-blue-600 animate-pulse" />
          </div>
          <div className="text-2xl font-black text-blue-700 font-mono">{instSummary.inProgressCount}</div>
          <p className="text-[11px] text-blue-600 font-semibold mt-1">Live in assessment</p>
        </div>

        {/* KPI 5: Earliest Student Login */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1.5">
            <span className="text-xs font-bold uppercase tracking-wider">Earliest Login</span>
            <Clock className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-xs font-bold text-slate-800 font-mono truncate" title={instSummary.overallEarliestLogin}>
            {instSummary.overallEarliestLogin !== '-' ? instSummary.overallEarliestLogin.split(',')[1]?.trim() || instSummary.overallEarliestLogin : '-'}
          </div>
          <p className="text-[10px] text-slate-500 truncate mt-1">
            {instSummary.overallEarliestLogin.split(',')[0] || 'First candidate entry'}
          </p>
        </div>

        {/* KPI 6: Latest Student Login */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1.5">
            <span className="text-xs font-bold uppercase tracking-wider">Latest Login</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-xs font-bold text-slate-800 font-mono truncate" title={instSummary.overallLatestLogin}>
            {instSummary.overallLatestLogin !== '-' ? instSummary.overallLatestLogin.split(',')[1]?.trim() || instSummary.overallLatestLogin : '-'}
          </div>
          <p className="text-[10px] text-slate-500 truncate mt-1">
            {instSummary.overallLatestLogin.split(',')[0] || 'Most recent entry'}
          </p>
        </div>
      </div>

      {/* DEPARTMENT-WISE ATTENDANCE SUMMARY MATRIX */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-indigo-600" />
              <span>Department-wise Attendance Summary Matrix</span>
            </h3>
            <p className="text-xs text-slate-500">
              Breakdown of student attendance, completion volume, and login timestamps by engineering programme.
            </p>
          </div>
          {selectedDept !== 'ALL' && (
            <button
              type="button"
              onClick={() => setSelectedDept('ALL')}
              className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
            >
              <span>Reset filter (showing all departments)</span>
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Department Matrix Grid Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {fullReport.departmentSummaries.map((deptSummary) => {
            const isSelected = selectedDept !== 'ALL' && deptSummary.department.toLowerCase().includes(selectedDept.toLowerCase());
            return (
              <div
                key={deptSummary.department}
                onClick={() => setSelectedDept(isSelected ? 'ALL' : deptSummary.department)}
                className={`p-4 rounded-xl border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-blue-50/70 border-blue-500 ring-2 ring-blue-400/30 shadow-xs'
                    : 'bg-white hover:bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="space-y-0.5">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200">
                      {deptSummary.departmentCode}
                    </span>
                    <h4 className="text-xs font-bold text-slate-900 leading-snug line-clamp-1" title={deptSummary.department}>
                      {deptSummary.department}
                    </h4>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-lg font-black text-slate-900 font-mono">
                      {deptSummary.totalPresent}
                    </span>
                    <span className="text-[10px] text-slate-500 block">Attended</span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mb-2.5">
                  <div
                    className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                    style={{ width: `${deptSummary.completionRate}%` }}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 pt-1 border-t border-slate-100">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Earliest Login:</span>
                    <span className="font-mono font-semibold text-slate-800 truncate block" title={deptSummary.earliestLogin}>
                      {deptSummary.earliestLogin !== '-' ? deptSummary.earliestLogin.split(',')[1]?.trim() || deptSummary.earliestLogin : '-'}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-400 block text-[10px]">Latest Login:</span>
                    <span className="font-mono font-semibold text-slate-800 truncate block" title={deptSummary.latestLogin}>
                      {deptSummary.latestLogin !== '-' ? deptSummary.latestLogin.split(',')[1]?.trim() || deptSummary.latestLogin : '-'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] mt-2.5 pt-2 border-t border-slate-100">
                  <span className="text-emerald-700 font-semibold">
                    {deptSummary.completedCount} Completed ({deptSummary.completionRate}%)
                  </span>
                  {deptSummary.inProgressCount > 0 && (
                    <span className="text-blue-600 font-semibold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
                      {deptSummary.inProgressCount} Active
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* DETAILED STUDENT ATTENDANCE REGISTER */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        {/* Table Controls Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50/70 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-600" />
              <span>Student Candidate Login & Attendance Register</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Showing {filteredCandidates.length} of {fullReport.candidateRecords.length} student records sorted by {sortField} ({sortOrder.toUpperCase()}).
            </p>
          </div>

          {/* Filters Bar */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search Input */}
            <div className="relative min-w-[220px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search register no, name..."
                className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Department Filter Dropdown */}
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">All Departments ({fullReport.candidateRecords.length})</option>
              {fullReport.departmentSummaries.map((d) => (
                <option key={d.department} value={d.department}>
                  {d.departmentCode} - {d.department} ({d.totalPresent})
                </option>
              ))}
            </select>

            {/* Status Filter Dropdown */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as any)}
              className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="COMPLETED">Completed ({instSummary.completedCount})</option>
              <option value="IN_PROGRESS">Active / In Progress ({instSummary.inProgressCount})</option>
              <option value="INTERRUPTED">Interrupted ({instSummary.interruptedCount})</option>
            </select>

            {(selectedDept !== 'ALL' || selectedStatus !== 'ALL' || searchTerm) && (
              <button
                type="button"
                onClick={() => {
                  setSelectedDept('ALL');
                  setSelectedStatus('ALL');
                  setSearchTerm('');
                }}
                className="px-2.5 py-1.5 text-xs text-slate-600 hover:text-slate-900 bg-slate-200 hover:bg-slate-300 rounded-lg font-semibold transition-colors"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-100/90 text-slate-700 text-[11px] font-bold uppercase tracking-wider border-b border-slate-200">
                <th
                  onClick={() => toggleSort('sNo')}
                  className="p-3 w-12 text-center cursor-pointer hover:bg-slate-200/70"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>S.No</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => toggleSort('registerNo')}
                  className="p-3 cursor-pointer hover:bg-slate-200/70"
                >
                  <div className="flex items-center gap-1">
                    <span>Register Number</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => toggleSort('studentName')}
                  className="p-3 cursor-pointer hover:bg-slate-200/70"
                >
                  <div className="flex items-center gap-1">
                    <span>Student Name</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => toggleSort('department')}
                  className="p-3 cursor-pointer hover:bg-slate-200/70"
                >
                  <div className="flex items-center gap-1">
                    <span>Department / Branch</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => toggleSort('loginTimestamp')}
                  className="p-3 cursor-pointer hover:bg-slate-200/70"
                >
                  <div className="flex items-center gap-1 text-blue-700 font-black">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Student Login Timestamp</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="p-3">Attendance Status</th>
                <th className="p-3">Submission Time</th>
                <th className="p-3">Duration</th>
                <th className="p-3 text-right">Terminal / Device</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs">
              {filteredCandidates.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <Users className="w-8 h-8 text-slate-300" />
                      <p className="font-semibold text-slate-700">No student attendance records matched your filter criteria.</p>
                      <p className="text-xs text-slate-400">Try adjusting the department filter or clearing the search query.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredCandidates.map((candidate, idx) => (
                  <tr
                    key={candidate.registerNo}
                    className="hover:bg-slate-50 transition-colors"
                  >
                    <td className="p-3 text-center text-slate-500 font-mono">
                      {idx + 1}
                    </td>
                    <td className="p-3 font-mono font-bold text-slate-900">
                      {candidate.registerNo}
                    </td>
                    <td className="p-3 font-bold text-slate-900">
                      {candidate.studentName}
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-1.5">
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200">
                          {candidate.departmentCode}
                        </span>
                        <span className="text-slate-700 font-medium truncate max-w-[240px]" title={candidate.department}>
                          {candidate.department}
                        </span>
                      </div>
                    </td>
                    <td className="p-3 font-mono text-xs">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-50 text-blue-900 font-bold border border-blue-200">
                        <Clock className="w-3 h-3 text-blue-600 shrink-0" />
                        <span>{candidate.loginTimeFormatted}</span>
                      </div>
                    </td>
                    <td className="p-3">
                      {candidate.status === 'COMPLETED' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>Present (Completed)</span>
                        </span>
                      ) : candidate.status === 'IN_PROGRESS' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                          <Radio className="w-3 h-3 text-blue-600 animate-pulse" />
                          <span>Present (In Progress)</span>
                        </span>
                      ) : candidate.status === 'INTERRUPTED' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                          <AlertTriangle className="w-3 h-3 text-amber-600" />
                          <span>Present (Savepoint)</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-800 border border-slate-200">
                          <Users className="w-3 h-3 text-slate-600" />
                          <span>Present (Logged In)</span>
                        </span>
                      )}
                    </td>
                    <td className="p-3 font-mono text-[11px] text-slate-600">
                      {candidate.submittedAt || '-'}
                    </td>
                    <td className="p-3 font-mono text-[11px] text-slate-600">
                      {candidate.durationFormatted || '-'}
                    </td>
                    <td className="p-3 text-right font-mono text-[10px] text-slate-400">
                      {candidate.deviceId ? candidate.deviceId.substring(0, 14) : '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* PRINT PREVIEW MODAL */}
      {isPrintModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/75 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-5xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Actions Header */}
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5 text-blue-400" />
                <h3 className="font-bold text-sm">Official Attendance Register - Print Preview</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs flex items-center gap-2 cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Document</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsPrintModalOpen(false)}
                  className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Paper Canvas */}
            <div className="p-8 overflow-y-auto space-y-6 text-slate-900 bg-white">
              {/* Institution Header */}
              <div className="text-center border-b-2 border-slate-900 pb-4">
                <h1 className="text-xl font-black uppercase tracking-wider text-slate-900">
                  COIMBATORE INSTITUTE OF TECHNOLOGY
                </h1>
                <p className="text-xs font-semibold text-slate-700">
                  (Autonomous Institution Affiliated to Anna University, Chennai & Approved by AICTE, New Delhi)
                </p>
                <p className="text-xs text-slate-600">Coimbatore - 641 014, Tamil Nadu, India</p>
                <div className="inline-block mt-2 px-3 py-1 bg-slate-900 text-white text-xs font-bold uppercase tracking-wide">
                  OFFICIAL CANDIDATE ATTENDANCE REPORT (LOGIN TIMESTAMPS)
                </div>
              </div>

              {/* Scope & Date Info */}
              <div className="grid grid-cols-2 gap-4 text-xs font-semibold text-slate-700 border-b border-slate-200 pb-3">
                <div>
                  <p>Programme / Department: <strong className="text-slate-900">{selectedDept === 'ALL' ? 'All Academic Engineering Departments' : selectedDept}</strong></p>
                  <p>Total Candidates Present: <strong className="text-slate-900">{filteredCandidates.length}</strong></p>
                </div>
                <div className="text-right">
                  <p>Report Generated: <strong className="text-slate-900">{fullReport.generatedAt}</strong></p>
                  <p>Earliest Login: <strong className="text-slate-900 font-mono">{instSummary.overallEarliestLogin}</strong></p>
                </div>
              </div>

              {/* Department Summary Matrix for Print */}
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 mb-2">
                  I. Department-wise Summary Matrix
                </h4>
                <table className="w-full text-left text-xs border border-slate-300">
                  <thead>
                    <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300">
                      <th className="p-2 border-r border-slate-300">Programme / Department</th>
                      <th className="p-2 border-r border-slate-300 text-center">Code</th>
                      <th className="p-2 border-r border-slate-300 text-center">Attended</th>
                      <th className="p-2 border-r border-slate-300 text-center">Completed</th>
                      <th className="p-2 border-r border-slate-300 text-center">Earliest Login</th>
                      <th className="p-2 text-center">Latest Login</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fullReport.departmentSummaries.map((dept) => (
                      <tr key={dept.department} className="border-b border-slate-200">
                        <td className="p-2 border-r border-slate-200 font-medium">{dept.department}</td>
                        <td className="p-2 border-r border-slate-200 text-center font-mono font-bold">{dept.departmentCode}</td>
                        <td className="p-2 border-r border-slate-200 text-center font-mono font-bold">{dept.totalPresent}</td>
                        <td className="p-2 border-r border-slate-200 text-center font-mono">{dept.completedCount}</td>
                        <td className="p-2 border-r border-slate-200 text-center font-mono">{dept.earliestLogin}</td>
                        <td className="p-2 text-center font-mono">{dept.latestLogin}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Detailed Candidate Attendance Table for Print */}
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 mb-2">
                  II. Candidate Attendance & Login Timestamps Register
                </h4>
                <table className="w-full text-left text-xs border border-slate-300">
                  <thead>
                    <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300">
                      <th className="p-2 border-r border-slate-300 text-center w-10">S.No</th>
                      <th className="p-2 border-r border-slate-300">Register Number</th>
                      <th className="p-2 border-r border-slate-300">Student Name</th>
                      <th className="p-2 border-r border-slate-300 text-center">Dept</th>
                      <th className="p-2 border-r border-slate-300">Login Timestamp</th>
                      <th className="p-2 border-r border-slate-300 text-center">Status</th>
                      <th className="p-2">Invigilator Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCandidates.map((c, idx) => (
                      <tr key={c.registerNo} className="border-b border-slate-200">
                        <td className="p-2 border-r border-slate-200 text-center font-mono">{idx + 1}</td>
                        <td className="p-2 border-r border-slate-200 font-mono font-bold">{c.registerNo}</td>
                        <td className="p-2 border-r border-slate-200 font-bold">{c.studentName}</td>
                        <td className="p-2 border-r border-slate-200 text-center font-mono">{c.departmentCode}</td>
                        <td className="p-2 border-r border-slate-200 font-mono font-semibold text-slate-900">{c.loginTimeFormatted}</td>
                        <td className="p-2 border-r border-slate-200 text-center font-semibold">{c.statusLabel}</td>
                        <td className="p-2 text-slate-400 font-mono text-[10px]">Verified</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Sign-off Blocks */}
              <div className="pt-12 grid grid-cols-3 gap-8 text-center text-xs text-slate-800">
                <div className="border-t border-slate-400 pt-2">
                  <p className="font-bold">Hall Invigilator / Staff Incharge</p>
                  <p className="text-[10px] text-slate-500">Signature & Date</p>
                </div>
                <div className="border-t border-slate-400 pt-2">
                  <p className="font-bold">Head of the Department (HOD)</p>
                  <p className="text-[10px] text-slate-500">Signature with Seal</p>
                </div>
                <div className="border-t border-slate-400 pt-2">
                  <p className="font-bold">Chief Superintendent of Examinations</p>
                  <p className="text-[10px] text-slate-500">Controller of Examinations, CIT</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
