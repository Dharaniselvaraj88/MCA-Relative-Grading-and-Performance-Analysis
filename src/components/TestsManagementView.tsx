import React, { useState, useMemo } from 'react';
import {
  Layers,
  PlusCircle,
  FileSpreadsheet,
  Download,
  Users,
  Search,
  CheckCircle2,
  Calendar,
  Clock,
  BookOpen,
  Sparkles,
  Trash2,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Eye,
  Loader2,
  Building2,
  Plus,
  X,
  RotateCcw,
  AlertCircle,
  Tag
} from 'lucide-react';
import { AssessmentTestConfig, EnrolledStudent, ConfiguredDepartment } from '../types';
import {
  generateAndDownloadStudentCredentialsExcel,
  getProgrammeCode,
  getActiveAssessmentTest,
  setActiveAssessmentTest,
  getConfiguredDepartments,
  addCustomDepartment,
  removeCustomDepartment,
  resetConfiguredDepartments,
  STANDARD_PROGRAMMES
} from '../utils/testManagerUtils';

interface TestsManagementViewProps {
  tests: AssessmentTestConfig[];
  onOpenNewTestModal: () => void;
  onDeleteTest: (testId: string) => void;
  onToggleTestStatus?: (testId: string, newStatus: 'active' | 'draft' | 'archived') => void;
}

export const TestsManagementView: React.FC<TestsManagementViewProps> = ({
  tests,
  onOpenNewTestModal,
  onDeleteTest,
  onToggleTestStatus
}) => {
  const [selectedTestForRoster, setSelectedTestForRoster] = useState<AssessmentTestConfig | null>(null);
  const [rosterSearch, setRosterSearch] = useState('');
  const [rosterProgFilter, setRosterProgFilter] = useState('ALL');
  const [downloadingTestId, setDownloadingTestId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Primary active test tracking
  const [liveTest, setLiveTest] = useState<AssessmentTestConfig>(() => getActiveAssessmentTest());
  const [activeSubView, setActiveSubView] = useState<'tests' | 'departments'>('tests');

  // Dynamic Departments Management
  const [configuredDepts, setConfiguredDepts] = useState<ConfiguredDepartment[]>(() => getConfiguredDepartments());
  const [deptSearchTerm, setDeptSearchTerm] = useState('');
  const [newDeptName, setNewDeptName] = useState('');
  const [newDeptCode, setNewDeptCode] = useState('');
  const [deptError, setDeptError] = useState('');
  const [showAddDeptForm, setShowAddDeptForm] = useState(false);
  const [notificationToast, setNotificationToast] = useState<string | null>(null);

  // Set a test as Live Active Test
  const handleMakeLiveTest = (test: AssessmentTestConfig) => {
    setActiveAssessmentTest(test);
    setLiveTest(test);
    setNotificationToast(`Test "${test.title}" is now the Live Active Test across student logins and cognitive evaluation.`);
    setTimeout(() => setNotificationToast(null), 4500);
  };

  // Add department handler
  const handleAddDepartment = () => {
    setDeptError('');
    if (!newDeptName.trim()) {
      setDeptError('Please enter a department name.');
      return;
    }
    const updated = addCustomDepartment(newDeptName.trim(), newDeptCode.trim() || undefined);
    setConfiguredDepts(updated);
    setNewDeptName('');
    setNewDeptCode('');
    setShowAddDeptForm(false);
    setNotificationToast(`Department "${newDeptName.trim()}" added to the institution catalog.`);
    setTimeout(() => setNotificationToast(null), 3500);
  };

  // Remove custom department
  const handleRemoveDepartment = (name: string) => {
    if (confirm(`Are you sure you want to remove department "${name}"?`)) {
      const updated = removeCustomDepartment(name);
      setConfiguredDepts(updated);
      setNotificationToast(`Department "${name}" removed.`);
      setTimeout(() => setNotificationToast(null), 3000);
    }
  };

  // Reset departments
  const handleResetDepartments = () => {
    if (confirm('Reset to the 9 standard CIT engineering departments?')) {
      const updated = resetConfiguredDepartments();
      setConfiguredDepts(updated);
      setNotificationToast('Departments reset to CIT standard catalog.');
      setTimeout(() => setNotificationToast(null), 3000);
    }
  };

  // Download Excel for a test
  const handleDownloadRosterExcel = async (test: AssessmentTestConfig) => {
    setDownloadingTestId(test.id);
    try {
      await generateAndDownloadStudentCredentialsExcel(test);
    } catch (err) {
      console.error('Error exporting credentials excel:', err);
      alert('Failed to generate Excel file.');
    } finally {
      setDownloadingTestId(null);
    }
  };

  const filteredTests = tests.filter(t => 
    !searchTerm.trim() ||
    t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.testCode.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredDepts = useMemo(() => {
    if (!deptSearchTerm.trim()) return configuredDepts;
    const q = deptSearchTerm.toLowerCase();
    return configuredDepts.filter(d => 
      d.name.toLowerCase().includes(q) ||
      (d.code && d.code.toLowerCase().includes(q))
    );
  }, [configuredDepts, deptSearchTerm]);

  return (
    <div className="space-y-6">
      
      {/* TOP BANNER & NEW TEST CTA */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-100 text-blue-700 rounded-lg">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-slate-900 uppercase">
                Assessment Tests & Candidate Allocation
              </h2>
              <p className="text-xs text-slate-600 mt-0.5">
                Configure test parameters, domain allocations, cognitive difficulty tiers, and manage student rosters with programmatic User IDs.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onOpenNewTestModal}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs shadow-md flex items-center gap-2 transition-all cursor-pointer ring-2 ring-blue-400/40"
          >
            <PlusCircle className="w-4 h-4 text-blue-100" />
            <span>New Test</span>
          </button>
        </div>
      </div>

      {/* SEARCH & METRICS SUMMARY */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase">Total Tests Configured</p>
            <p className="text-xl font-black text-slate-900 font-mono">{tests.length}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase">Total Enrolled Candidates</p>
            <p className="text-xl font-black text-emerald-700 font-mono">
              {tests.reduce((acc, t) => acc + (t.enrolledStudents?.length || 0), 0)}
            </p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-600">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase">Available Programmes</p>
            <p className="text-xl font-black text-purple-700 font-mono">
              {configuredDepts.length} Departments
            </p>
          </div>
        </div>
      </div>

      {/* NOTIFICATION TOAST */}
      {notificationToast && (
        <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-900 text-xs font-bold flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{notificationToast}</span>
          </div>
          <button
            type="button"
            onClick={() => setNotificationToast(null)}
            className="text-emerald-700 hover:text-emerald-900 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* SUB-VIEW TABS */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-2 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveSubView('tests')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeSubView === 'tests'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Assessment Tests ({tests.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubView('departments')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeSubView === 'departments'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Departments Directory ({configuredDepts.length})</span>
          </button>
        </div>

        {activeSubView === 'departments' && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowAddDeptForm(prev => !prev)}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Include Department</span>
            </button>
            <button
              type="button"
              onClick={handleResetDepartments}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs border border-slate-300 flex items-center gap-1 cursor-pointer"
              title="Reset departments list to the 9 standard CIT programmes"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
              <span>Reset Standard ({STANDARD_PROGRAMMES.length})</span>
            </button>
          </div>
        )}
      </div>

      {/* ===================== TAB 1: TESTS ===================== */}
      {activeSubView === 'tests' && (
        <div className="space-y-4">
          {/* SEARCH BAR */}
          <div className="flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search configured tests by Title or Test Code..."
                className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-blue-500 font-medium"
              />
            </div>

            {tests.length === 0 && (
              <button
                onClick={onOpenNewTestModal}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Create First Test</span>
              </button>
            )}
          </div>

          {/* TESTS LIST */}
          {filteredTests.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-12 text-center flex flex-col items-center justify-center gap-3 shadow-sm">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Layers className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">No Assessment Tests Found</h3>
              <p className="text-xs text-slate-500 max-w-md">
                Click the "New Test" button to specify domain details, question allocations, difficulty tiers, and upload student cohorts to generate User IDs.
              </p>
              <button
                onClick={onOpenNewTestModal}
                className="mt-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs shadow-md flex items-center gap-2 cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Create New Test</span>
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredTests.map((test) => {
                const studentCount = test.enrolledStudents?.length || 0;
                const l1Count = test.levelDistribution?.level1Count ?? Math.round((test.totalQuestions * (test.levelDistribution?.level1Percentage || 40)) / 100);
                const l2Count = test.levelDistribution?.level2Count ?? Math.round((test.totalQuestions * (test.levelDistribution?.level2Percentage || 40)) / 100);
                const l3Count = test.levelDistribution?.level3Count ?? Math.max(0, test.totalQuestions - (l1Count + l2Count));
                const isCountMode = test.levelDistribution?.mode === 'count';
                const isDomainMode = test.levelDistribution?.mode === 'domain_wise';
                const isLive = liveTest?.id === test.id || liveTest?.testCode === test.testCode;

                return (
                  <div
                    key={test.id}
                    className={`bg-white border rounded-xl p-5 shadow-sm hover:shadow-md transition-all space-y-4 ${
                      isLive ? 'border-emerald-500 ring-2 ring-emerald-300/50 bg-emerald-50/10' : 'border-slate-200'
                    }`}
                  >
                    {/* Header Row */}
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <span className="font-mono text-xs font-black bg-blue-100 text-blue-800 px-2.5 py-0.5 rounded border border-blue-300">
                            {test.testCode}
                          </span>
                          
                          {isLive ? (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-600 text-white shadow-xs flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Live Active Test
                            </span>
                          ) : (
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                              test.status === 'active'
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                : 'bg-slate-100 text-slate-700'
                            }`}>
                              {test.status || 'active'}
                            </span>
                          )}

                          <span className="text-xs text-slate-500 flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            {test.durationMinutes} Minutes
                          </span>
                          <span className="text-xs text-slate-500 flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            {new Date(test.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </span>
                        </div>

                        <h3 className="text-base font-bold text-slate-900 mt-1.5 font-sans">
                          {test.title}
                        </h3>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2 shrink-0 flex-wrap">
                        {!isLive && (
                          <button
                            type="button"
                            onClick={() => handleMakeLiveTest(test)}
                            className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded text-xs border border-blue-300 flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                            title="Set as the active exam configuration across the entire portal"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                            <span>Set as Active</span>
                          </button>
                        )}

                        <button
                          onClick={() => handleDownloadRosterExcel(test)}
                          disabled={downloadingTestId === test.id || studentCount === 0}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold rounded text-xs shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                          title="Download the official Excel file with assigned User IDs and login credentials"
                        >
                          {downloadingTestId === test.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <FileSpreadsheet className="w-3.5 h-3.5" />
                          )}
                          <span>Download Roster (Excel)</span>
                        </button>

                        <button
                          onClick={() => setSelectedTestForRoster(test)}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded text-xs border border-slate-300 flex items-center gap-1.5 cursor-pointer transition-colors"
                          title="View enrolled candidates and assigned User IDs"
                        >
                          <Users className="w-3.5 h-3.5 text-blue-600" />
                          <span>View Candidates ({studentCount})</span>
                        </button>

                        <button
                          onClick={() => {
                            if (confirm(`Are you sure you want to delete test "${test.title}" (${test.testCode})?`)) {
                              onDeleteTest(test.id);
                            }
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                          title="Delete test"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Grid Info: Domains & Levels */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                      
                      {/* Domains Summary */}
                      <div className="space-y-1.5 bg-slate-50 p-3 rounded-lg border border-slate-200/80">
                        <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                          <span className="flex items-center gap-1.5">
                            <BookOpen className="w-3.5 h-3.5 text-blue-600" />
                            Domain Question Allocation:
                          </span>
                          <span className="font-mono text-blue-700 font-black">
                            {test.totalQuestions} Questions Total
                          </span>
                        </div>

                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {test.domains?.map((d) => (
                            <span
                              key={d.id}
                              className="inline-flex items-center gap-1 text-[11px] font-medium bg-white text-slate-800 px-2 py-0.5 rounded border border-slate-200 shadow-2xs"
                            >
                              <span className="font-semibold">{d.name}:</span>
                              <strong className="text-blue-700 font-mono">{d.questionCount} Qs</strong>
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Level Distribution Summary */}
                      <div className="space-y-1.5 bg-slate-50 p-3 rounded-lg border border-slate-200/80">
                        <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                          <span className="flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                            Cognitive Difficulty Levels:
                          </span>
                          <span className="font-mono text-purple-700 font-bold text-[11px]">
                            {isCountMode ? 'Admin Exact Counts' : isDomainMode ? 'Domain-Wise Mix' : 'Percentage Split'}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 pt-1">
                          <div className="flex-1 bg-emerald-100 border border-emerald-200 text-emerald-900 rounded px-2 py-1 text-center">
                            <span className="block text-[10px] uppercase font-black text-emerald-800">L1 Easy</span>
                            <span className="font-mono text-xs font-bold">
                              {isCountMode ? `${l1Count} Qs (${test.levelDistribution?.level1Percentage || 0}%)` : `${test.levelDistribution?.level1Percentage || 0}% (${l1Count} Qs)`}
                            </span>
                          </div>
                          <div className="flex-1 bg-amber-100 border border-amber-200 text-amber-900 rounded px-2 py-1 text-center">
                            <span className="block text-[10px] uppercase font-black text-amber-800">L2 Medium</span>
                            <span className="font-mono text-xs font-bold">
                              {isCountMode ? `${l2Count} Qs (${test.levelDistribution?.level2Percentage || 0}%)` : `${test.levelDistribution?.level2Percentage || 0}% (${l2Count} Qs)`}
                            </span>
                          </div>
                          <div className="flex-1 bg-purple-100 border border-purple-200 text-purple-900 rounded px-2 py-1 text-center">
                            <span className="block text-[10px] uppercase font-black text-purple-800">L3 Hard</span>
                            <span className="font-mono text-xs font-bold">
                              {isCountMode ? `${l3Count} Qs (${test.levelDistribution?.level3Percentage || 0}%)` : `${test.levelDistribution?.level3Percentage || 0}% (${l3Count} Qs)`}
                            </span>
                          </div>
                        </div>
                      </div>

                    </div>

                    {/* Bottom Bar: Programmatic User ID range preview */}
                    {studentCount > 0 && (
                      <div className="bg-blue-50/60 border border-blue-100 rounded-lg p-2.5 flex flex-wrap items-center justify-between text-xs text-blue-900">
                        <div className="flex items-center gap-2">
                          <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
                          <span>
                            <strong>{studentCount} Students Enrolled</strong> across {test.programmes?.length || 8} programmes.
                          </span>
                        </div>
                        <span className="text-[11px] text-blue-700 font-medium">
                          User IDs formatted by department (e.g. 26CS001, 26IT001) | PIN: cit@123
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ===================== TAB 2: DEPARTMENTS DIRECTORY ===================== */}
      {activeSubView === 'departments' && (
        <div className="space-y-4">
          
          {/* SEARCH & INFO */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={deptSearchTerm}
                onChange={(e) => setDeptSearchTerm(e.target.value)}
                placeholder="Search departments by name or short code..."
                className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-blue-500 font-medium"
              />
            </div>
            <p className="text-xs text-slate-500 font-medium">
              Departments configured here are available in Test Creation, Student Login, and Evaluation.
            </p>
          </div>

          {/* INLINE ADD DEPARTMENT FORM */}
          {showAddDeptForm && (
            <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-4 space-y-3 animate-fadeIn shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-blue-600" />
                  Include New Institutional Department / Programme
                </span>
                <button
                  type="button"
                  onClick={() => setShowAddDeptForm(false)}
                  className="text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                <div className="sm:col-span-7">
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Department / Programme Title *
                  </label>
                  <input
                    type="text"
                    value={newDeptName}
                    onChange={(e) => setNewDeptName(e.target.value)}
                    placeholder="e.g. B.Tech. Biotechnology or MSc Data Science"
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none font-medium text-slate-900"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Code (2-4 chars)
                  </label>
                  <input
                    type="text"
                    value={newDeptCode}
                    onChange={(e) => setNewDeptCode(e.target.value.toUpperCase())}
                    placeholder="e.g. BT"
                    maxLength={5}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg font-mono font-bold uppercase focus:ring-2 focus:ring-blue-500 focus:outline-none text-center text-slate-900"
                  />
                </div>

                <div className="sm:col-span-3">
                  <button
                    type="button"
                    onClick={handleAddDepartment}
                    className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors cursor-pointer"
                  >
                    Save & Include
                  </button>
                </div>
              </div>

              {deptError && (
                <p className="text-[11px] font-semibold text-rose-600 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {deptError}
                </p>
              )}
            </div>
          )}

          {/* DEPARTMENTS DIRECTORY TABLE */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                    <th className="py-2.5 px-4">#</th>
                    <th className="py-2.5 px-4">Department / Programme Name</th>
                    <th className="py-2.5 px-4">Programme Code</th>
                    <th className="py-2.5 px-4">Generated ID Prefix</th>
                    <th className="py-2.5 px-4">Type</th>
                    <th className="py-2.5 px-4 text-center">Enrolled Students</th>
                    <th className="py-2.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredDepts.map((dept, index) => {
                    const code = dept.code || getProgrammeCode(dept.name);
                    const enrolledCount = tests.reduce((total, t) => {
                      return total + (t.enrolledStudents?.filter(s => s.programme === dept.name).length || 0);
                    }, 0);

                    return (
                      <tr key={dept.name} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-mono text-slate-400 text-[11px]">
                          {index + 1}
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-900">
                          {dept.name}
                        </td>
                        <td className="py-3 px-4">
                          <span className="inline-block px-2 py-0.5 bg-slate-100 font-mono font-bold text-slate-800 rounded text-[11px]">
                            {code}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="inline-block px-2.5 py-0.5 bg-blue-50 text-blue-800 font-mono font-black border border-blue-200 rounded text-[11px]">
                            26{code}XXX
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {dept.isCustom ? (
                            <span className="inline-block px-2 py-0.5 bg-amber-100 text-amber-800 font-bold rounded-full text-[10px]">
                              Custom Added
                            </span>
                          ) : (
                            <span className="inline-block px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold rounded-full text-[10px]">
                              CIT Standard
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center font-mono font-bold text-slate-700">
                          {enrolledCount}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {dept.isCustom ? (
                            <button
                              type="button"
                              onClick={() => handleRemoveDepartment(dept.name)}
                              className="px-2.5 py-1 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded transition-colors font-bold text-[11px] cursor-pointer inline-flex items-center gap-1"
                              title="Delete custom department"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Remove</span>
                            </button>
                          ) : (
                            <span className="text-slate-400 text-[10px] italic">Permanent</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
              <span>Showing {filteredDepts.length} of {configuredDepts.length} departments</span>
              <span className="font-medium">Coimbatore Institute of Technology</span>
            </div>
          </div>

        </div>
      )}

      {/* ================= CANDIDATE ROSTER MODAL ================= */}
      {selectedTestForRoster && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden">
            
            {/* Roster Header */}
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div>
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-base font-bold text-white">
                    Candidate Allocation Roster: {selectedTestForRoster.testCode}
                  </h3>
                </div>
                <p className="text-xs text-slate-300 mt-0.5">
                  {selectedTestForRoster.title} — {selectedTestForRoster.enrolledStudents?.length || 0} Candidates
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDownloadRosterExcel(selectedTestForRoster)}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Download Excel (.xlsx)</span>
                </button>
                <button
                  onClick={() => setSelectedTestForRoster(null)}
                  className="p-1.5 text-slate-400 hover:text-white rounded"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={rosterSearch}
                  onChange={(e) => setRosterSearch(e.target.value)}
                  placeholder="Filter by student name, assigned User ID, or register number..."
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 font-medium"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <select
                  value={rosterProgFilter}
                  onChange={(e) => setRosterProgFilter(e.target.value)}
                  className="px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-800 font-medium"
                >
                  <option value="ALL">All Programmes</option>
                  {Array.from(new Set(selectedTestForRoster.enrolledStudents?.map(s => s.programme) || [])).map(prog => (
                    <option key={prog} value={prog}>{prog}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Table */}
            <div className="flex-1 overflow-y-auto p-4">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px] sticky top-0">
                  <tr>
                    <th className="py-2.5 px-3 w-12 text-center">#</th>
                    <th className="py-2.5 px-3">Assigned User ID</th>
                    <th className="py-2.5 px-3">Candidate Name</th>
                    <th className="py-2.5 px-3">Programme</th>
                    <th className="py-2.5 px-3">Original Reg No</th>
                    <th className="py-2.5 px-3 text-center">Access PIN</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {(selectedTestForRoster.enrolledStudents || [])
                    .filter(st => {
                      const matchesProg = rosterProgFilter === 'ALL' || st.programme === rosterProgFilter;
                      const matchesSearch = !rosterSearch.trim() ||
                        st.name.toLowerCase().includes(rosterSearch.toLowerCase()) ||
                        st.userId.toLowerCase().includes(rosterSearch.toLowerCase()) ||
                        (st.originalRegNo && st.originalRegNo.toLowerCase().includes(rosterSearch.toLowerCase()));
                      return matchesProg && matchesSearch;
                    })
                    .map((st, idx) => (
                      <tr key={st.userId} className="hover:bg-slate-50 transition-colors">
                        <td className="py-2 px-3 text-center font-mono text-slate-500">
                          {idx + 1}
                        </td>
                        <td className="py-2 px-3">
                          <span className="inline-block px-2.5 py-0.5 font-mono font-black text-blue-800 bg-blue-50 border border-blue-200 rounded">
                            {st.userId}
                          </span>
                        </td>
                        <td className="py-2 px-3 font-bold text-slate-900">
                          {st.name}
                        </td>
                        <td className="py-2 px-3 text-slate-700">
                          <span className="inline-block px-2 py-0.5 rounded text-[11px] bg-slate-100 border border-slate-200">
                            {st.programme}
                          </span>
                        </td>
                        <td className="py-2 px-3 font-mono text-slate-600">
                          {st.originalRegNo || '-'}
                        </td>
                        <td className="py-2 px-3 text-center font-mono font-bold text-emerald-700">
                          {st.assignedPassword || 'cit@123'}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
              <span className="text-xs text-slate-500 font-medium">
                Total Enrolled Candidates: {selectedTestForRoster.enrolledStudents?.length || 0}
              </span>
              <button
                onClick={() => setSelectedTestForRoster(null)}
                className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded text-xs cursor-pointer"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
