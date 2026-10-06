import React, { useState, useRef } from 'react';
import {
  X,
  FileSpreadsheet,
  Upload,
  Download,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  Users,
  Layers,
  Sparkles,
  Search,
  BookOpen,
  HelpCircle,
  Loader2,
  ArrowRight,
  ShieldCheck,
  RotateCcw,
  Sliders,
  Calculator,
  Hash,
  Grid3X3
} from 'lucide-react';
import { AssessmentTestConfig, TestDomainConfig, QuestionLevelDistribution, EnrolledStudent, ConfiguredDepartment } from '../types';
import {
  ELIGIBLE_PROGRAMMES,
  DEFAULT_DOMAINS,
  DEFAULT_LEVEL_DISTRIBUTION,
  getProgrammeCode,
  assignUserIdsToStudents,
  parseStudentRosterFile,
  downloadSampleStudentRosterTemplate,
  generateAndDownloadStudentCredentialsExcel,
  getPrepopulatedDemoStudents,
  generate800DemoStudentsCohort,
  getConfiguredDepartments,
  addConfiguredDepartment,
  removeConfiguredDepartment,
  resetConfiguredDepartments,
  normalizeProgrammeName,
  setActiveAssessmentTest
} from '../utils/testManagerUtils';

interface NewTestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveTest: (test: AssessmentTestConfig) => void;
  existingTestsCount?: number;
}

export const NewTestModal: React.FC<NewTestModalProps> = ({
  isOpen,
  onClose,
  onSaveTest,
  existingTestsCount = 0
}) => {
  // Wizard Steps: 1: Test & Domains, 2: Level Distribution, 3: Student Upload & User ID Assignment
  const [activeStep, setActiveStep] = useState<1 | 2 | 3>(1);

  // STEP 1: Basic & Domain Details
  const [testTitle, setTestTitle] = useState('Mathematics Competency Assessment');
  const [testCode, setTestCode] = useState(`CIT-MATH-2026-${String(existingTestsCount + 1).padStart(2, '0')}`);
  const [durationMinutes, setDurationMinutes] = useState(60);

  // Dynamic Departments Management
  const [configuredDepts, setConfiguredDepts] = useState<ConfiguredDepartment[]>(() => getConfiguredDepartments());
  const [selectedProgrammes, setSelectedProgrammes] = useState<string[]>(() => getConfiguredDepartments().map(d => d.name));
  const [showAddDeptModal, setShowAddDeptModal] = useState(false);
  const [newDeptName, setNewDeptName] = useState('');
  const [newDeptCode, setNewDeptCode] = useState('');
  const [deptAddError, setDeptAddError] = useState<string | null>(null);

  const [domains, setDomains] = useState<TestDomainConfig[]>([
    ...DEFAULT_DOMAINS.map(d => ({ ...d }))
  ]);
  const [newDomainName, setNewDomainName] = useState('');

  // Total questions derived from domains or set directly
  const totalQuestions = domains.reduce((acc, d) => acc + (Number(d.questionCount) || 0), 0);

  // STEP 2: Question Level Distribution Mode: 'percentage' | 'count' | 'domain_wise'
  const [levelMode, setLevelMode] = useState<'percentage' | 'count' | 'domain_wise'>('percentage');

  // Percentage mode state
  const [levelPercentages, setLevelPercentages] = useState<{ l1: number; l2: number; l3: number }>({
    l1: 40,
    l2: 40,
    l3: 20
  });

  // Direct count mode state
  const [levelCounts, setLevelCounts] = useState<{ l1: number; l2: number; l3: number }>({
    l1: Math.round(totalQuestions * 0.4),
    l2: Math.round(totalQuestions * 0.4),
    l3: Math.max(0, totalQuestions - (Math.round(totalQuestions * 0.4) * 2))
  });

  // STEP 3: Student Upload & User ID Assignment
  const [batchPrefix, setBatchPrefix] = useState('26');
  const [defaultPin, setDefaultPin] = useState('cit@123');
  const [rawStudents, setRawStudents] = useState<Array<{
    name: string;
    programme: string;
    originalRegNo?: string;
    email?: string;
    section?: string;
  }>>([]);
  const [assignedStudents, setAssignedStudents] = useState<EnrolledStudent[]>([]);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccessMsg, setUploadSuccessMsg] = useState<string | null>(null);
  const [previewFilterProg, setPreviewFilterProg] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isDownloadingExcel, setIsDownloadingExcel] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Paste raw text modal / toggle
  const [showPasteArea, setShowPasteArea] = useState(false);
  const [pastedText, setPastedText] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Domain-wise totals if domain_wise mode is selected
  const domainWiseL1Sum = domains.reduce((acc, d) => acc + (d.level1Count || 0), 0);
  const domainWiseL2Sum = domains.reduce((acc, d) => acc + (d.level2Count || 0), 0);
  const domainWiseL3Sum = domains.reduce((acc, d) => acc + (d.level3Count || 0), 0);
  const domainWiseTotalAllocated = domainWiseL1Sum + domainWiseL2Sum + domainWiseL3Sum;
  const isDomainWiseValid = totalQuestions > 0 && domainWiseTotalAllocated === totalQuestions && domains.every(d => ((d.level1Count || 0) + (d.level2Count || 0) + (d.level3Count || 0)) === d.questionCount);

  // Unified Level calculations & validation based on active mode
  let isLevelValid = false;
  let l1Count = 0;
  let l2Count = 0;
  let l3Count = 0;
  let l1Pct = 0;
  let l2Pct = 0;
  let l3Pct = 0;
  let validationMessage = '';

  const percentageSum = (Number(levelPercentages.l1) || 0) + (Number(levelPercentages.l2) || 0) + (Number(levelPercentages.l3) || 0);
  const directCountSum = (Number(levelCounts.l1) || 0) + (Number(levelCounts.l2) || 0) + (Number(levelCounts.l3) || 0);

  if (levelMode === 'percentage') {
    isLevelValid = percentageSum === 100 && totalQuestions > 0;
    l1Pct = levelPercentages.l1;
    l2Pct = levelPercentages.l2;
    l3Pct = levelPercentages.l3;
    l1Count = Math.round((totalQuestions * l1Pct) / 100);
    l2Count = Math.round((totalQuestions * l2Pct) / 100);
    l3Count = Math.max(0, totalQuestions - (l1Count + l2Count));
    validationMessage = isLevelValid
      ? `Allocated across ${totalQuestions} questions: Level 1 (${l1Count} Qs), Level 2 (${l2Count} Qs), Level 3 (${l3Count} Qs).`
      : `Sum of percentages is ${percentageSum}%. Adjust sliders or presets so that Level 1 + Level 2 + Level 3 = 100% (Difference: ${100 - percentageSum}%).`;
  } else if (levelMode === 'count') {
    isLevelValid = directCountSum === totalQuestions && totalQuestions > 0;
    l1Count = Number(levelCounts.l1) || 0;
    l2Count = Number(levelCounts.l2) || 0;
    l3Count = Number(levelCounts.l3) || 0;
    l1Pct = totalQuestions > 0 ? Math.round((l1Count / totalQuestions) * 100) : 0;
    l2Pct = totalQuestions > 0 ? Math.round((l2Count / totalQuestions) * 100) : 0;
    l3Pct = totalQuestions > 0 ? Math.max(0, 100 - (l1Pct + l2Pct)) : 0;
    validationMessage = isLevelValid
      ? `Accurately matches total test size: ${l1Count} + ${l2Count} + ${l3Count} = ${totalQuestions} questions.`
      : `Current question count sum is ${directCountSum} of ${totalQuestions} required questions. (${totalQuestions > directCountSum ? `${totalQuestions - directCountSum} remaining to allocate` : `${directCountSum - totalQuestions} questions over-allocated`}).`;
  } else {
    // domain_wise
    isLevelValid = isDomainWiseValid;
    l1Count = domainWiseL1Sum;
    l2Count = domainWiseL2Sum;
    l3Count = domainWiseL3Sum;
    l1Pct = totalQuestions > 0 ? Math.round((l1Count / totalQuestions) * 100) : 0;
    l2Pct = totalQuestions > 0 ? Math.round((l2Count / totalQuestions) * 100) : 0;
    l3Pct = totalQuestions > 0 ? Math.max(0, 100 - (l1Pct + l2Pct)) : 0;
    validationMessage = isLevelValid
      ? `All ${domains.length} domains have balanced level specifications totaling ${totalQuestions} questions.`
      : `Domain level allocation is incomplete or does not equal each domain's target question count. Allocated ${domainWiseTotalAllocated} of ${totalQuestions} questions.`;
  }

  // Prepared QuestionLevelDistribution object for saving and Excel
  const computedLevelDistribution: QuestionLevelDistribution = {
    level1Percentage: l1Pct,
    level2Percentage: l2Pct,
    level3Percentage: l3Pct,
    level1Count: l1Count,
    level2Count: l2Count,
    level3Count: l3Count,
    mode: levelMode
  };

  // Helper to update specific domain levels in domain_wise mode
  const handleDomainLevelChange = (domainId: string, levelField: 'level1Count' | 'level2Count' | 'level3Count', valStr: string) => {
    const val = Math.max(0, parseInt(valStr, 10) || 0);
    setDomains(prev => prev.map(d => {
      if (d.id !== domainId) return d;
      return { ...d, [levelField]: val };
    }));
  };

  // Auto distribute levels for a specific domain evenly or by default 40-40-20
  const handleAutoDistributeDomainLevels = (domainId: string) => {
    setDomains(prev => prev.map(d => {
      if (d.id !== domainId) return d;
      const count = d.questionCount || 0;
      const dL1 = Math.round(count * 0.4);
      const dL2 = Math.round(count * 0.4);
      const dL3 = Math.max(0, count - (dL1 + dL2));
      return {
        ...d,
        level1Count: dL1,
        level2Count: dL2,
        level3Count: dL3
      };
    }));
  };

  // Auto distribute across all domains
  const handleAutoDistributeAllDomains = () => {
    setDomains(prev => prev.map(d => {
      const count = d.questionCount || 0;
      const dL1 = Math.round(count * 0.4);
      const dL2 = Math.round(count * 0.4);
      const dL3 = Math.max(0, count - (dL1 + dL2));
      return {
        ...d,
        level1Count: dL1,
        level2Count: dL2,
        level3Count: dL3
      };
    }));
  };

  // Handle domain question changes
  const handleDomainCountChange = (id: string, countStr: string) => {
    const val = Math.max(1, parseInt(countStr, 10) || 0);
    setDomains(prev => prev.map(d => d.id === id ? { ...d, questionCount: val } : d));
  };

  const handleDomainNameChange = (id: string, newName: string) => {
    setDomains(prev => prev.map(d => d.id === id ? { ...d, name: newName } : d));
  };

  const handleAddDomain = () => {
    if (!newDomainName.trim()) return;
    const newId = `domain_${Date.now()}`;
    setDomains(prev => [
      ...prev,
      { id: newId, name: newDomainName.trim(), questionCount: 10 }
    ]);
    setNewDomainName('');
  };

  const handleRemoveDomain = (id: string) => {
    if (domains.length <= 1) return;
    setDomains(prev => prev.filter(d => d.id !== id));
  };

  const handleDistributeQuestionsEvenly = (targetTotal: number) => {
    if (domains.length === 0 || targetTotal <= 0) return;
    const base = Math.floor(targetTotal / domains.length);
    const remainder = targetTotal % domains.length;
    setDomains(prev => prev.map((d, i) => ({
      ...d,
      questionCount: base + (i < remainder ? 1 : 0)
    })));
  };

  // Dynamic Department Handlers
  const handleAddDepartment = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newDeptName.trim()) {
      setDeptAddError('Department name is required.');
      return;
    }
    try {
      const added = addConfiguredDepartment(newDeptName.trim(), newDeptCode.trim() || undefined);
      const updated = getConfiguredDepartments();
      setConfiguredDepts(updated);
      setSelectedProgrammes(prev => prev.includes(added.name) ? prev : [...prev, added.name]);
      setNewDeptName('');
      setNewDeptCode('');
      setShowAddDeptModal(false);
      setDeptAddError(null);
    } catch (err: any) {
      setDeptAddError(err.message || 'Failed to add department.');
    }
  };

  const handleRemoveCustomDept = (deptName: string) => {
    removeConfiguredDepartment(deptName);
    const updated = getConfiguredDepartments();
    setConfiguredDepts(updated);
    setSelectedProgrammes(prev => prev.filter(p => p !== deptName));
  };

  const handleResetDepartments = () => {
    const std = resetConfiguredDepartments();
    setConfiguredDepts(std);
    setSelectedProgrammes(std.map(d => d.name));
  };

  // Re-run User ID assignment whenever rawStudents or batchPrefix / defaultPin changes
  const recomputeAssignedStudents = (studentsList: typeof rawStudents, prefix = batchPrefix, pin = defaultPin) => {
    const assigned = assignUserIdsToStudents(studentsList, {
      batchPrefix: prefix,
      startingNumber: 1,
      defaultPassword: pin
    });
    setAssignedStudents(assigned);
  };

  // File Upload Handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingFile(true);
    setUploadError(null);
    setUploadSuccessMsg(null);

    try {
      const parsed = await parseStudentRosterFile(file);
      setRawStudents(parsed);
      recomputeAssignedStudents(parsed, batchPrefix, defaultPin);

      // Refresh dynamic departments (in case file introduced new departments)
      const refreshedDepts = getConfiguredDepartments();
      setConfiguredDepts(refreshedDepts);
      setSelectedProgrammes(prev => Array.from(new Set([...prev, ...refreshedDepts.map(d => d.name)])));

      setUploadSuccessMsg(`✅ Successfully uploaded and parsed ${parsed.length} student records from "${file.name}"! Unique User IDs assigned.`);
    } catch (err: any) {
      setUploadError(err.message || 'Failed to parse student roster file. Please verify columns.');
    } finally {
      setIsProcessingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Handle Drag & Drop
  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    setIsProcessingFile(true);
    setUploadError(null);
    setUploadSuccessMsg(null);

    try {
      const parsed = await parseStudentRosterFile(file);
      setRawStudents(parsed);
      recomputeAssignedStudents(parsed, batchPrefix, defaultPin);

      const refreshedDepts = getConfiguredDepartments();
      setConfiguredDepts(refreshedDepts);
      setSelectedProgrammes(prev => Array.from(new Set([...prev, ...refreshedDepts.map(d => d.name)])));

      setUploadSuccessMsg(`✅ Successfully processed ${parsed.length} student records from "${file.name}"!`);
    } catch (err: any) {
      setUploadError(err.message || 'Failed to read dropped file.');
    } finally {
      setIsProcessingFile(false);
    }
  };

  // Prepopulate Demo Students
  const handleLoadDemoStudents = () => {
    const demo = getPrepopulatedDemoStudents();
    setRawStudents(demo);
    recomputeAssignedStudents(demo, batchPrefix, defaultPin);
    setUploadSuccessMsg(`✅ Pre-populated ${demo.length} realistic student candidates across engineering programmes! Assigned User IDs generated.`);
    setUploadError(null);
  };

  // Prepopulate 800 Concurrent Candidates Cohort
  const handleLoad800StudentsCohort = () => {
    const cohort800 = generate800DemoStudentsCohort();
    setRawStudents(cohort800);
    recomputeAssignedStudents(cohort800, batchPrefix, defaultPin);
    const refreshedDepts = getConfiguredDepartments();
    setConfiguredDepts(refreshedDepts);
    setSelectedProgrammes(Array.from(new Set(cohort800.map(s => s.programme))));
    setUploadSuccessMsg(`⚡ Successfully allocated full institutional cohort of 800 candidates across all 8 CIT departments! Unique User IDs and Credentials generated.`);
    setUploadError(null);
  };

  // Parse Pasted Text
  const handleProcessPastedText = () => {
    if (!pastedText.trim()) return;
    const lines = pastedText.trim().split('\n');
    const parsed: Array<{ name: string; programme: string; originalRegNo?: string }> = [];

    lines.forEach(line => {
      const parts = line.split(/[,\t|]/).map(p => p.trim()).filter(Boolean);
      if (parts.length >= 1) {
        const name = parts[0];
        const rawProg = parts[1] || 'B.E. Computer Science & Engineering';
        const regNo = parts[2] || '';
        if (name.toLowerCase() !== 'name' && name.toLowerCase() !== 'student name') {
          // Auto-register department if not already present
          try {
            const normalized = normalizeProgrammeName(rawProg);
            const current = getConfiguredDepartments();
            if (!current.some(d => d.name.toLowerCase() === normalized.toLowerCase())) {
              addConfiguredDepartment(normalized);
            }
          } catch {}
          parsed.push({ name, programme: rawProg, originalRegNo: regNo });
        }
      }
    });

    if (parsed.length === 0) {
      setUploadError('No valid rows found in pasted text. Expected format: Name, Programme, RegNo.');
      return;
    }

    setRawStudents(parsed);
    recomputeAssignedStudents(parsed, batchPrefix, defaultPin);

    const refreshedDepts = getConfiguredDepartments();
    setConfiguredDepts(refreshedDepts);
    setSelectedProgrammes(prev => Array.from(new Set([...prev, ...refreshedDepts.map(d => d.name)])));

    setUploadSuccessMsg(`✅ Parsed ${parsed.length} candidates from pasted text!`);
    setShowPasteArea(false);
    setPastedText('');
  };

  // Download Excel Workbook
  const handleDownloadExcel = async () => {
    if (assignedStudents.length === 0) {
      setUploadError('Please upload or load student details before downloading the credentials Excel.');
      return;
    }

    setIsDownloadingExcel(true);
    try {
      const testConfig: AssessmentTestConfig = {
        id: `test_${Date.now()}`,
        testCode: testCode.trim() || 'CIT-TEST',
        title: testTitle.trim() || 'Engineering Mathematics Assessment',
        durationMinutes,
        totalQuestions,
        domains,
        levelDistribution: computedLevelDistribution,
        programmes: selectedProgrammes,
        enrolledStudents: assignedStudents,
        status: 'active',
        createdAt: new Date().toISOString()
      };

      await generateAndDownloadStudentCredentialsExcel(testConfig);
    } catch (err: any) {
      setUploadError('Failed to generate Excel file: ' + err.message);
    } finally {
      setIsDownloadingExcel(false);
    }
  };

  // Final Save & Activate
  const handleFinalSave = () => {
    if (!testTitle.trim()) {
      setActiveStep(1);
      return;
    }
    if (totalQuestions <= 0) {
      setActiveStep(1);
      return;
    }
    if (!isLevelValid) {
      setActiveStep(2);
      return;
    }

    setIsSaving(true);
    const newTest: AssessmentTestConfig = {
      id: `test_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      testCode: testCode.trim().toUpperCase() || 'CIT-MATH-2026',
      title: testTitle.trim(),
      durationMinutes: Number(durationMinutes) || 60,
      totalQuestions,
      domains,
      levelDistribution: computedLevelDistribution,
      programmes: selectedProgrammes,
      enrolledStudents: assignedStudents,
      status: 'active',
      createdAt: new Date().toISOString(),
      createdBy: 'CIT Examination Administration'
    };

    setActiveAssessmentTest(newTest);
    onSaveTest(newTest);
    setIsSaving(false);
    onClose();
  };

  // Filter assigned students for preview
  const filteredAssignedStudents = assignedStudents.filter(st => {
    const matchesProg = previewFilterProg === 'ALL' || st.programme === previewFilterProg;
    const matchesQuery = !searchQuery.trim() || 
      st.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      st.userId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (st.originalRegNo && st.originalRegNo.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesProg && matchesQuery;
  });

  // Programme stats
  const programmeCounts: Record<string, number> = {};
  assignedStudents.forEach(st => {
    programmeCounts[st.programme] = (programmeCounts[st.programme] || 0) + 1;
  });

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden">
        
        {/* MODAL HEADER */}
        <div className="px-6 py-4.5 bg-linear-to-r from-blue-700 via-indigo-700 to-blue-800 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-white shadow-inner">
              <Layers className="w-5 h-5 text-blue-200" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-wide flex items-center gap-2">
                <span>Configure New Assessment Test</span>
                <span className="text-xs bg-blue-500/40 text-blue-100 font-semibold px-2 py-0.5 rounded-full border border-blue-300/30">
                  Admin Setup
                </span>
              </h2>
              <p className="text-xs text-blue-100/80 mt-0.5">
                Specify domain distribution, question difficulty levels, upload student cohorts, and assign programmatic User IDs.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* STEP PROGRESS BAR */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-3 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 sm:gap-6 w-full max-w-3xl mx-auto">
            {/* Step 1 Button */}
            <button
              onClick={() => setActiveStep(1)}
              className={`flex items-center gap-2 text-xs font-bold transition-colors cursor-pointer ${
                activeStep === 1
                  ? 'text-blue-700'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${
                activeStep === 1
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-200 text-slate-700'
              }`}>
                1
              </span>
              <span>1. Domains & Question Counts</span>
            </button>

            <div className="flex-1 h-0.5 bg-slate-200" />

            {/* Step 2 Button */}
            <button
              onClick={() => setActiveStep(2)}
              className={`flex items-center gap-2 text-xs font-bold transition-colors cursor-pointer ${
                activeStep === 2
                  ? 'text-blue-700'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${
                activeStep === 2
                  ? 'bg-blue-600 text-white shadow-xs'
                  : isLevelValid
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-200 text-slate-700'
              }`}>
                2
              </span>
              <span>2. Difficulty Levels</span>
            </button>

            <div className="flex-1 h-0.5 bg-slate-200" />

            {/* Step 3 Button */}
            <button
              onClick={() => setActiveStep(3)}
              className={`flex items-center gap-2 text-xs font-bold transition-colors cursor-pointer ${
                activeStep === 3
                  ? 'text-blue-700'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${
                activeStep === 3
                  ? 'bg-blue-600 text-white shadow-xs'
                  : assignedStudents.length > 0
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-200 text-slate-700'
              }`}>
                3
              </span>
              <span>3. Student Upload & User IDs</span>
            </button>
          </div>
        </div>

        {/* MODAL BODY (SCROLLABLE) */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">

          {/* ================= STEP 1: TEST METADATA & DOMAINS ================= */}
          {activeStep === 1 && (
            <div className="space-y-6 animate-in fade-in duration-150">
              
              {/* Test Identification Header */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Test Title / Assessment Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={testTitle}
                    onChange={(e) => setTestTitle(e.target.value)}
                    placeholder="e.g. Mathematics Competency Assessment"
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Test Code / Identifier <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={testCode}
                    onChange={(e) => setTestCode(e.target.value.toUpperCase())}
                    placeholder="e.g. CIT-MATH-2026-01"
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Test Duration (Minutes)
                  </label>
                  <input
                    type="number"
                    min="15"
                    max="180"
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(Math.max(10, parseInt(e.target.value, 10) || 60))}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                  />
                </div>

                <div className="md:col-span-2">
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700">
                      Total Questions in Assessment
                    </label>
                    <span className="text-xs text-blue-700 font-bold">
                      Calculated Sum: {totalQuestions} Questions
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg text-blue-900 text-sm font-bold flex items-center justify-between">
                      <span>Total Questions:</span>
                      <span className="text-base font-black font-mono text-blue-700">{totalQuestions}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDistributeQuestionsEvenly(50)}
                      className="px-3 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
                      title="Distribute 50 questions equally across all domains (10 per domain)"
                    >
                      Reset to 50 (10/Domain)
                    </button>
                  </div>
                </div>
              </div>

              {/* Target Programmes Selector */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                      <span>Target Programmes & Departments</span>
                      <span className="text-[10px] font-mono font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                        {configuredDepts.length} Available ({selectedProgrammes.length} Included)
                      </span>
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Admin can include standard or new institutional departments based on testing requirements.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setShowAddDeptModal(prev => !prev)}
                      className="px-2.5 py-1 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors cursor-pointer flex items-center gap-1 shadow-xs"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Include Department</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedProgrammes(configuredDepts.map(d => d.name))}
                      className="text-[11px] font-bold text-blue-600 hover:text-blue-800 cursor-pointer"
                    >
                      Select All
                    </button>
                    <span className="text-slate-300">|</span>
                    <button
                      type="button"
                      onClick={() => setSelectedProgrammes([])}
                      className="text-[11px] font-bold text-slate-500 hover:text-slate-700 cursor-pointer"
                    >
                      Clear
                    </button>
                    <span className="text-slate-300">|</span>
                    <button
                      type="button"
                      onClick={handleResetDepartments}
                      className="text-[11px] font-bold text-amber-700 hover:text-amber-900 cursor-pointer"
                      title="Reset departments list to the 9 standard CIT engineering programmes"
                    >
                      Reset Standard
                    </button>
                  </div>
                </div>

                {/* INLINE ADD DEPARTMENT FORM */}
                {showAddDeptModal && (
                  <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl space-y-2.5 animate-fadeIn">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                        Add New Department / Programme to System
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowAddDeptModal(false)}
                        className="text-slate-400 hover:text-slate-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end">
                      <div className="sm:col-span-8">
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Full Programme / Department Name *
                        </label>
                        <input
                          type="text"
                          value={newDeptName}
                          onChange={(e) => setNewDeptName(e.target.value)}
                          placeholder="e.g. B.Tech Artificial Intelligence & Machine Learning or MSc DCS"
                          className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
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
                          placeholder="e.g. AIML"
                          maxLength={5}
                          className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg font-mono font-bold uppercase focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        />
                      </div>

                      <div className="sm:col-span-2 flex gap-1.5">
                        <button
                          type="button"
                          onClick={handleAddDepartment}
                          className="w-full px-3 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors cursor-pointer"
                        >
                          Save & Add
                        </button>
                      </div>
                    </div>

                    {deptAddError && (
                      <p className="text-[11px] font-semibold text-rose-600 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" />
                        {deptAddError}
                      </p>
                    )}
                  </div>
                )}

                {/* DEPARTMENTS GRID */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
                  {configuredDepts.map(dept => {
                    const isSelected = selectedProgrammes.includes(dept.name);
                    const code = dept.code || getProgrammeCode(dept.name);
                    return (
                      <div
                        key={dept.name}
                        className={`group relative flex items-start justify-between gap-2 p-2.5 rounded-lg border text-xs transition-all ${
                          isSelected
                            ? 'bg-blue-50/90 border-blue-300 text-blue-950 shadow-xs'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <label className="flex items-start gap-2.5 min-w-0 flex-1 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedProgrammes(prev => [...prev, dept.name]);
                              } else {
                                setSelectedProgrammes(prev => prev.filter(p => p !== dept.name));
                              }
                            }}
                            className="mt-0.5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                          />
                          <div className="min-w-0 flex-1">
                            <span className="block font-medium truncate" title={dept.name}>
                              {dept.name}
                            </span>
                            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                              <span className="inline-block px-1.5 py-0.2 bg-slate-200/90 text-slate-700 text-[10px] font-mono font-bold rounded">
                                ID: 26{code}
                              </span>
                              {dept.isCustom && (
                                <span className="inline-block px-1.5 py-0.2 bg-amber-100 text-amber-800 text-[9px] font-semibold rounded">
                                  Custom
                                </span>
                              )}
                            </div>
                          </div>
                        </label>

                        {dept.isCustom && (
                          <button
                            type="button"
                            onClick={() => handleRemoveCustomDept(dept.name)}
                            className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-600 transition-opacity cursor-pointer rounded"
                            title="Remove custom department"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* DOMAINS & NUMBER OF QUESTIONS FOR EACH DOMAIN */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-blue-600" />
                      Domain Details & Question Allocation
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Mention domain names and specify the exact number of questions allocated to each domain.
                    </p>
                  </div>
                  <span className="text-xs font-mono font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
                    {domains.length} Domains Configured
                  </span>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                      <tr>
                        <th className="py-2.5 px-4 w-12 text-center">#</th>
                        <th className="py-2.5 px-4">Domain Name</th>
                        <th className="py-2.5 px-4 w-36 text-center">No. of Questions</th>
                        <th className="py-2.5 px-4 w-28 text-center">Weightage</th>
                        <th className="py-2.5 px-4 w-16 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {domains.map((dom, idx) => {
                        const weightage = totalQuestions > 0 ? Math.round((dom.questionCount / totalQuestions) * 100) : 0;
                        return (
                          <tr key={dom.id} className="hover:bg-slate-50 transition-colors">
                            <td className="py-2.5 px-4 text-center font-mono text-slate-500 font-bold">
                              {idx + 1}
                            </td>
                            <td className="py-2.5 px-4">
                              <input
                                type="text"
                                value={dom.name}
                                onChange={(e) => handleDomainNameChange(dom.id, e.target.value)}
                                className="w-full px-2.5 py-1.5 text-xs font-medium border border-slate-200 rounded focus:border-blue-500 focus:outline-none bg-white text-slate-800"
                                placeholder="Enter domain title"
                              />
                            </td>
                            <td className="py-2.5 px-4 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                <input
                                  type="number"
                                  min="1"
                                  max="100"
                                  value={dom.questionCount}
                                  onChange={(e) => handleDomainCountChange(dom.id, e.target.value)}
                                  className="w-20 px-2 py-1.5 text-xs text-center font-bold font-mono border border-slate-300 rounded focus:border-blue-500 focus:outline-none bg-white text-slate-900"
                                />
                                <span className="text-slate-400 font-normal">Qs</span>
                              </div>
                            </td>
                            <td className="py-2.5 px-4 text-center">
                              <span className="inline-block px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                {weightage}%
                              </span>
                            </td>
                            <td className="py-2.5 px-4 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveDomain(dom.id)}
                                disabled={domains.length <= 1}
                                className="p-1.5 text-slate-400 hover:text-red-600 disabled:opacity-30 transition-colors cursor-pointer"
                                title="Remove domain"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="bg-slate-50 font-bold text-xs text-slate-800 border-t border-slate-200">
                      <tr>
                        <td colSpan={2} className="py-3 px-4 text-right uppercase tracking-wider text-slate-600">
                          Total Configured Questions:
                        </td>
                        <td className="py-3 px-4 text-center font-mono font-black text-sm text-blue-700">
                          {totalQuestions} Questions
                        </td>
                        <td className="py-3 px-4 text-center font-mono font-black text-sm text-blue-700">
                          100%
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Add Custom Domain Row */}
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="text"
                    value={newDomainName}
                    onChange={(e) => setNewDomainName(e.target.value)}
                    placeholder="Add an additional domain (e.g., Vector Calculus, Differential Equations)..."
                    className="flex-1 px-3 py-2 text-xs border border-slate-300 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 bg-white"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddDomain();
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleAddDomain}
                    disabled={!newDomainName.trim()}
                    className="px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Domain</span>
                  </button>
                </div>
              </div>

            </div>
          )}

          {/* ================= STEP 2: QUESTION LEVEL DISTRIBUTION ================= */}
          {activeStep === 2 && (
            <div className="space-y-6 animate-in fade-in duration-150">
              
              {/* Context & Mode Selection Header */}
              <div className="bg-blue-50/80 border border-blue-200 p-4.5 rounded-xl space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-blue-900 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-blue-600" />
                      Question Level Distribution (Level 1, Level 2, Level 3)
                    </h3>
                    <p className="text-xs text-blue-800 mt-1">
                      Choose how you prefer to distribute difficulty levels across the <span className="font-bold underline">{totalQuestions} total questions</span>.
                    </p>
                  </div>

                  {/* Mode Selector Tabs */}
                  <div className="inline-flex p-1 bg-white border border-blue-300 rounded-lg shadow-xs shrink-0">
                    <button
                      type="button"
                      onClick={() => setLevelMode('percentage')}
                      className={`px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                        levelMode === 'percentage'
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'text-slate-600 hover:text-blue-700 hover:bg-blue-50'
                      }`}
                    >
                      <Sliders className="w-3.5 h-3.5" />
                      <span>Percentage Mode (%)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setLevelMode('count');
                        // Ensure counts start with valid numbers matching totalQuestions if needed
                        if (levelCounts.l1 + levelCounts.l2 + levelCounts.l3 !== totalQuestions) {
                          const c1 = Math.round(totalQuestions * 0.4);
                          const c2 = Math.round(totalQuestions * 0.4);
                          const c3 = Math.max(0, totalQuestions - (c1 + c2));
                          setLevelCounts({ l1: c1, l2: c2, l3: c3 });
                        }
                      }}
                      className={`px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                        levelMode === 'count'
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'text-slate-600 hover:text-blue-700 hover:bg-blue-50'
                      }`}
                    >
                      <Calculator className="w-3.5 h-3.5" />
                      <span>Exact Question Counts</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setLevelMode('domain_wise');
                        // Initialize domain level counts if any domain lacks them
                        setDomains(prev => prev.map(d => {
                          const currentSum = (d.level1Count || 0) + (d.level2Count || 0) + (d.level3Count || 0);
                          if (currentSum === d.questionCount) return d;
                          const c1 = Math.round(d.questionCount * 0.4);
                          const c2 = Math.round(d.questionCount * 0.4);
                          const c3 = Math.max(0, d.questionCount - (c1 + c2));
                          return {
                            ...d,
                            level1Count: c1,
                            level2Count: c2,
                            level3Count: c3
                          };
                        }));
                      }}
                      className={`px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                        levelMode === 'domain_wise'
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'text-slate-600 hover:text-blue-700 hover:bg-blue-50'
                      }`}
                    >
                      <Grid3X3 className="w-3.5 h-3.5" />
                      <span>Domain-Wise Counts</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Status Banner */}
              <div className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                isLevelValid
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                  : 'bg-rose-50 border-rose-300 text-rose-900'
              }`}>
                <div className="flex items-center gap-3">
                  {isLevelValid ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                  )}
                  <div>
                    <p className="font-bold text-xs">
                      {isLevelValid
                        ? `Valid Distribution (${levelMode === 'percentage' ? '100% Split' : `${totalQuestions} Questions Matched`})`
                        : `Distribution Incomplete`}
                    </p>
                    <p className="text-[11px] opacity-80 mt-0.5">
                      {validationMessage}
                    </p>
                  </div>
                </div>

                {/* Quick Presets / Auto-fill Buttons */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {levelMode === 'percentage' && (
                    <>
                      <button
                        type="button"
                        onClick={() => setLevelPercentages({ l1: 40, l2: 40, l3: 20 })}
                        className="px-2.5 py-1 text-[11px] font-bold bg-white text-slate-700 border border-slate-300 rounded hover:bg-slate-50 transition-colors cursor-pointer"
                      >
                        Preset: 40-40-20
                      </button>
                      <button
                        type="button"
                        onClick={() => setLevelPercentages({ l1: 30, l2: 50, l3: 20 })}
                        className="px-2.5 py-1 text-[11px] font-bold bg-white text-slate-700 border border-slate-300 rounded hover:bg-slate-50 transition-colors cursor-pointer"
                      >
                        Preset: 30-50-20
                      </button>
                      <button
                        type="button"
                        onClick={() => setLevelPercentages({ l1: 50, l2: 30, l3: 20 })}
                        className="px-2.5 py-1 text-[11px] font-bold bg-white text-slate-700 border border-slate-300 rounded hover:bg-slate-50 transition-colors cursor-pointer"
                      >
                        Preset: 50-30-20
                      </button>
                    </>
                  )}

                  {levelMode === 'count' && (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          const c1 = Math.round(totalQuestions * 0.4);
                          const c2 = Math.round(totalQuestions * 0.4);
                          const c3 = Math.max(0, totalQuestions - (c1 + c2));
                          setLevelCounts({ l1: c1, l2: c2, l3: c3 });
                        }}
                        className="px-2.5 py-1 text-[11px] font-bold bg-white text-slate-700 border border-slate-300 rounded hover:bg-slate-50 transition-colors cursor-pointer"
                      >
                        Auto: 40-40-20 Split
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const third = Math.floor(totalQuestions / 3);
                          const rem = totalQuestions % 3;
                          setLevelCounts({
                            l1: third + (rem > 0 ? 1 : 0),
                            l2: third + (rem > 1 ? 1 : 0),
                            l3: third
                          });
                        }}
                        className="px-2.5 py-1 text-[11px] font-bold bg-white text-slate-700 border border-slate-300 rounded hover:bg-slate-50 transition-colors cursor-pointer"
                      >
                        Auto: Equal 1/3 Split
                      </button>
                    </>
                  )}

                  {levelMode === 'domain_wise' && (
                    <button
                      type="button"
                      onClick={handleAutoDistributeAllDomains}
                      className="px-2.5 py-1 text-[11px] font-bold bg-white text-slate-700 border border-slate-300 rounded hover:bg-slate-50 transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <RotateCcw className="w-3 h-3 text-slate-500" />
                      <span>Auto-fill All Domains (40-40-20)</span>
                    </button>
                  )}
                </div>
              </div>

              {/* MODE 1: PERCENTAGE MODE */}
              {levelMode === 'percentage' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* LEVEL 1 */}
                  <div className="bg-emerald-50/70 border-2 border-emerald-200 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-[10px] uppercase font-black tracking-wider text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                          Tier 1
                        </span>
                        <h4 className="text-sm font-extrabold text-emerald-950 mt-1">
                          Level 1 (Easy / Fundamental)
                        </h4>
                      </div>
                      <div className="w-10 h-10 rounded-full bg-emerald-100 border border-emerald-300 flex items-center justify-center font-mono font-black text-emerald-800 text-sm">
                        {levelPercentages.l1}%
                      </div>
                    </div>

                    <p className="text-[11px] text-emerald-800">
                      Basic recall, core definitions, direct formulas, and elementary procedural computation.
                    </p>

                    <div className="space-y-1.5 pt-2">
                      <div className="flex items-center justify-between text-xs font-bold text-emerald-900">
                        <span>Percentage</span>
                        <span>{levelPercentages.l1}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="5"
                        value={levelPercentages.l1}
                        onChange={(e) => setLevelPercentages(prev => ({ ...prev, l1: parseInt(e.target.value, 10) || 0 }))}
                        className="w-full accent-emerald-600"
                      />
                    </div>

                    <div className="p-2.5 bg-white rounded-lg border border-emerald-200 flex items-center justify-between text-xs font-mono font-bold text-emerald-900">
                      <span>Questions Count:</span>
                      <span className="text-base text-emerald-700">{l1Count} Qs</span>
                    </div>
                  </div>

                  {/* LEVEL 2 */}
                  <div className="bg-amber-50/70 border-2 border-amber-200 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-[10px] uppercase font-black tracking-wider text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
                          Tier 2
                        </span>
                        <h4 className="text-sm font-extrabold text-amber-950 mt-1">
                          Level 2 (Medium / Application)
                        </h4>
                      </div>
                      <div className="w-10 h-10 rounded-full bg-amber-100 border border-amber-300 flex items-center justify-center font-mono font-black text-amber-800 text-sm">
                        {levelPercentages.l2}%
                      </div>
                    </div>

                    <p className="text-[11px] text-amber-800">
                      Multi-step application, analytical reasoning, contextual interpretation, and intermediate calculus.
                    </p>

                    <div className="space-y-1.5 pt-2">
                      <div className="flex items-center justify-between text-xs font-bold text-amber-900">
                        <span>Percentage</span>
                        <span>{levelPercentages.l2}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="5"
                        value={levelPercentages.l2}
                        onChange={(e) => setLevelPercentages(prev => ({ ...prev, l2: parseInt(e.target.value, 10) || 0 }))}
                        className="w-full accent-amber-600"
                      />
                    </div>

                    <div className="p-2.5 bg-white rounded-lg border border-amber-200 flex items-center justify-between text-xs font-mono font-bold text-amber-900">
                      <span>Questions Count:</span>
                      <span className="text-base text-amber-700">{l2Count} Qs</span>
                    </div>
                  </div>

                  {/* LEVEL 3 */}
                  <div className="bg-purple-50/70 border-2 border-purple-200 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-[10px] uppercase font-black tracking-wider text-purple-800 bg-purple-100 px-2 py-0.5 rounded">
                          Tier 3
                        </span>
                        <h4 className="text-sm font-extrabold text-purple-950 mt-1">
                          Level 3 (Hard / Advanced)
                        </h4>
                      </div>
                      <div className="w-10 h-10 rounded-full bg-purple-100 border border-purple-300 flex items-center justify-center font-mono font-black text-purple-800 text-sm">
                        {levelPercentages.l3}%
                      </div>
                    </div>

                    <p className="text-[11px] text-purple-800">
                      Advanced synthesis, non-routine scenarios, higher-order abstraction, and rigorous mathematical proofs.
                    </p>

                    <div className="space-y-1.5 pt-2">
                      <div className="flex items-center justify-between text-xs font-bold text-purple-900">
                        <span>Percentage</span>
                        <span>{levelPercentages.l3}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="5"
                        value={levelPercentages.l3}
                        onChange={(e) => setLevelPercentages(prev => ({ ...prev, l3: parseInt(e.target.value, 10) || 0 }))}
                        className="w-full accent-purple-600"
                      />
                    </div>

                    <div className="p-2.5 bg-white rounded-lg border border-purple-200 flex items-center justify-between text-xs font-mono font-bold text-purple-900">
                      <span>Questions Count:</span>
                      <span className="text-base text-purple-700">{l3Count} Qs</span>
                    </div>
                  </div>
                </div>
              )}

              {/* MODE 2: EXACT QUESTION COUNTS */}
              {levelMode === 'count' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* LEVEL 1 COUNT */}
                    <div className="bg-emerald-50/70 border-2 border-emerald-200 rounded-xl p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-[10px] uppercase font-black tracking-wider text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                            Tier 1
                          </span>
                          <h4 className="text-sm font-extrabold text-emerald-950 mt-1">
                            Level 1 (Easy)
                          </h4>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-emerald-100 border border-emerald-300 flex items-center justify-center font-mono font-black text-emerald-800 text-sm">
                          {l1Pct}%
                        </div>
                      </div>

                      <p className="text-[11px] text-emerald-800">
                        Core definitions, basic formulas, direct computation.
                      </p>

                      <div className="space-y-1.5 pt-1">
                        <label className="text-xs font-bold text-emerald-950 flex items-center justify-between">
                          <span>Number of Questions:</span>
                          <span className="font-mono text-emerald-700">{l1Pct}% of total</span>
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="0"
                            max={totalQuestions}
                            value={levelCounts.l1}
                            onChange={(e) => {
                              const val = Math.max(0, parseInt(e.target.value, 10) || 0);
                              setLevelCounts(prev => ({ ...prev, l1: val }));
                            }}
                            className="w-full bg-white border border-emerald-300 rounded-lg px-3 py-2 text-sm font-mono font-black text-emerald-950 focus:ring-2 focus:ring-emerald-500 outline-none"
                            placeholder="e.g. 16"
                          />
                          <span className="text-xs font-bold text-emerald-800 shrink-0">Questions</span>
                        </div>
                      </div>

                      {/* Quick Adjuster Buttons */}
                      <div className="flex items-center gap-1 pt-1">
                        <button
                          type="button"
                          onClick={() => setLevelCounts(prev => ({ ...prev, l1: Math.max(0, prev.l1 - 1) }))}
                          className="px-2 py-0.5 bg-white border border-emerald-200 text-emerald-800 text-xs font-bold rounded hover:bg-emerald-100"
                        >
                          -1
                        </button>
                        <button
                          type="button"
                          onClick={() => setLevelCounts(prev => ({ ...prev, l1: prev.l1 + 1 }))}
                          className="px-2 py-0.5 bg-white border border-emerald-200 text-emerald-800 text-xs font-bold rounded hover:bg-emerald-100"
                        >
                          +1
                        </button>
                        <button
                          type="button"
                          onClick={() => setLevelCounts(prev => ({ ...prev, l1: Math.max(0, prev.l1 - 5) }))}
                          className="px-2 py-0.5 bg-white border border-emerald-200 text-emerald-800 text-xs font-bold rounded hover:bg-emerald-100"
                        >
                          -5
                        </button>
                        <button
                          type="button"
                          onClick={() => setLevelCounts(prev => ({ ...prev, l1: prev.l1 + 5 }))}
                          className="px-2 py-0.5 bg-white border border-emerald-200 text-emerald-800 text-xs font-bold rounded hover:bg-emerald-100"
                        >
                          +5
                        </button>
                      </div>
                    </div>

                    {/* LEVEL 2 COUNT */}
                    <div className="bg-amber-50/70 border-2 border-amber-200 rounded-xl p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-[10px] uppercase font-black tracking-wider text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
                            Tier 2
                          </span>
                          <h4 className="text-sm font-extrabold text-amber-950 mt-1">
                            Level 2 (Medium)
                          </h4>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-amber-100 border border-amber-300 flex items-center justify-center font-mono font-black text-amber-800 text-sm">
                          {l2Pct}%
                        </div>
                      </div>

                      <p className="text-[11px] text-amber-800">
                        Multi-step application, analytical reasoning, contextual interpretation.
                      </p>

                      <div className="space-y-1.5 pt-1">
                        <label className="text-xs font-bold text-amber-950 flex items-center justify-between">
                          <span>Number of Questions:</span>
                          <span className="font-mono text-amber-700">{l2Pct}% of total</span>
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="0"
                            max={totalQuestions}
                            value={levelCounts.l2}
                            onChange={(e) => {
                              const val = Math.max(0, parseInt(e.target.value, 10) || 0);
                              setLevelCounts(prev => ({ ...prev, l2: val }));
                            }}
                            className="w-full bg-white border border-amber-300 rounded-lg px-3 py-2 text-sm font-mono font-black text-amber-950 focus:ring-2 focus:ring-amber-500 outline-none"
                            placeholder="e.g. 16"
                          />
                          <span className="text-xs font-bold text-amber-800 shrink-0">Questions</span>
                        </div>
                      </div>

                      {/* Quick Adjuster Buttons */}
                      <div className="flex items-center gap-1 pt-1">
                        <button
                          type="button"
                          onClick={() => setLevelCounts(prev => ({ ...prev, l2: Math.max(0, prev.l2 - 1) }))}
                          className="px-2 py-0.5 bg-white border border-amber-200 text-amber-800 text-xs font-bold rounded hover:bg-amber-100"
                        >
                          -1
                        </button>
                        <button
                          type="button"
                          onClick={() => setLevelCounts(prev => ({ ...prev, l2: prev.l2 + 1 }))}
                          className="px-2 py-0.5 bg-white border border-amber-200 text-amber-800 text-xs font-bold rounded hover:bg-amber-100"
                        >
                          +1
                        </button>
                        <button
                          type="button"
                          onClick={() => setLevelCounts(prev => ({ ...prev, l2: Math.max(0, prev.l2 - 5) }))}
                          className="px-2 py-0.5 bg-white border border-amber-200 text-amber-800 text-xs font-bold rounded hover:bg-amber-100"
                        >
                          -5
                        </button>
                        <button
                          type="button"
                          onClick={() => setLevelCounts(prev => ({ ...prev, l2: prev.l2 + 5 }))}
                          className="px-2 py-0.5 bg-white border border-amber-200 text-amber-800 text-xs font-bold rounded hover:bg-amber-100"
                        >
                          +5
                        </button>
                      </div>
                    </div>

                    {/* LEVEL 3 COUNT */}
                    <div className="bg-purple-50/70 border-2 border-purple-200 rounded-xl p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-[10px] uppercase font-black tracking-wider text-purple-800 bg-purple-100 px-2 py-0.5 rounded">
                            Tier 3
                          </span>
                          <h4 className="text-sm font-extrabold text-purple-950 mt-1">
                            Level 3 (Hard)
                          </h4>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-purple-100 border border-purple-300 flex items-center justify-center font-mono font-black text-purple-800 text-sm">
                          {l3Pct}%
                        </div>
                      </div>

                      <p className="text-[11px] text-purple-800">
                        Advanced synthesis, non-routine scenarios, higher-order abstraction.
                      </p>

                      <div className="space-y-1.5 pt-1">
                        <label className="text-xs font-bold text-purple-950 flex items-center justify-between">
                          <span>Number of Questions:</span>
                          <span className="font-mono text-purple-700">{l3Pct}% of total</span>
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="0"
                            max={totalQuestions}
                            value={levelCounts.l3}
                            onChange={(e) => {
                              const val = Math.max(0, parseInt(e.target.value, 10) || 0);
                              setLevelCounts(prev => ({ ...prev, l3: val }));
                            }}
                            className="w-full bg-white border border-purple-300 rounded-lg px-3 py-2 text-sm font-mono font-black text-purple-950 focus:ring-2 focus:ring-purple-500 outline-none"
                            placeholder="e.g. 8"
                          />
                          <span className="text-xs font-bold text-purple-800 shrink-0">Questions</span>
                        </div>
                      </div>

                      {/* Quick Adjuster Buttons */}
                      <div className="flex items-center gap-1 pt-1">
                        <button
                          type="button"
                          onClick={() => setLevelCounts(prev => ({ ...prev, l3: Math.max(0, prev.l3 - 1) }))}
                          className="px-2 py-0.5 bg-white border border-purple-200 text-purple-800 text-xs font-bold rounded hover:bg-purple-100"
                        >
                          -1
                        </button>
                        <button
                          type="button"
                          onClick={() => setLevelCounts(prev => ({ ...prev, l3: prev.l3 + 1 }))}
                          className="px-2 py-0.5 bg-white border border-purple-200 text-purple-800 text-xs font-bold rounded hover:bg-purple-100"
                        >
                          +1
                        </button>
                        <button
                          type="button"
                          onClick={() => setLevelCounts(prev => ({ ...prev, l3: Math.max(0, prev.l3 - 5) }))}
                          className="px-2 py-0.5 bg-white border border-purple-200 text-purple-800 text-xs font-bold rounded hover:bg-purple-100"
                        >
                          -5
                        </button>
                        <button
                          type="button"
                          onClick={() => setLevelCounts(prev => ({ ...prev, l3: prev.l3 + 5 }))}
                          className="px-2 py-0.5 bg-white border border-purple-200 text-purple-800 text-xs font-bold rounded hover:bg-purple-100"
                        >
                          +5
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Helper calculation pill */}
                  <div className="bg-slate-100 border border-slate-300 rounded-lg p-3 flex flex-wrap items-center justify-between text-xs font-bold text-slate-700">
                    <span>
                      Allocation Sum: <span className="font-mono text-blue-700 font-extrabold">{directCountSum}</span> / <span className="font-mono">{totalQuestions} Questions</span>
                    </span>
                    <span className={directCountSum === totalQuestions ? 'text-emerald-700' : 'text-amber-700'}>
                      {directCountSum === totalQuestions
                        ? '✅ Perfect Match'
                        : `${Math.abs(totalQuestions - directCountSum)} Questions ${totalQuestions > directCountSum ? 'Short' : 'Over'}`}
                    </span>
                  </div>
                </div>
              )}

              {/* MODE 3: DOMAIN-WISE LEVEL SPECIFICATION */}
              {levelMode === 'domain_wise' && (
                <div className="space-y-4">
                  <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl text-xs text-indigo-900 flex items-start gap-2.5">
                    <BookOpen className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">Domain-Specific Difficulty Breakdown:</span> Configure exact Level 1, Level 2, and Level 3 question counts for each domain individually. The sum of levels in each row must match that domain's total questions.
                    </div>
                  </div>

                  <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                        <tr>
                          <th className="py-2.5 px-3">Domain Name</th>
                          <th className="py-2.5 px-3 text-center">Total Qs</th>
                          <th className="py-2.5 px-3 text-center bg-emerald-100/60 text-emerald-900">L1 (Easy)</th>
                          <th className="py-2.5 px-3 text-center bg-amber-100/60 text-amber-900">L2 (Medium)</th>
                          <th className="py-2.5 px-3 text-center bg-purple-100/60 text-purple-900">L3 (Hard)</th>
                          <th className="py-2.5 px-3 text-center">Status</th>
                          <th className="py-2.5 px-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white font-medium text-slate-800">
                        {domains.map((dom) => {
                          const domL1 = dom.level1Count || 0;
                          const domL2 = dom.level2Count || 0;
                          const domL3 = dom.level3Count || 0;
                          const domSum = domL1 + domL2 + domL3;
                          const isDomBalanced = domSum === dom.questionCount;

                          return (
                            <tr key={dom.id} className="hover:bg-slate-50/80 transition-colors">
                              <td className="py-2.5 px-3 font-bold text-slate-900">
                                {dom.name}
                              </td>
                              <td className="py-2.5 px-3 text-center font-mono font-bold text-blue-700">
                                {dom.questionCount}
                              </td>
                              <td className="py-2 px-2 text-center bg-emerald-50/40">
                                <input
                                  type="number"
                                  min="0"
                                  max={dom.questionCount}
                                  value={domL1}
                                  onChange={(e) => handleDomainLevelChange(dom.id, 'level1Count', e.target.value)}
                                  className="w-16 text-center border border-emerald-300 rounded py-1 px-1 text-xs font-mono font-bold text-emerald-900 focus:ring-1 focus:ring-emerald-500 outline-none"
                                />
                              </td>
                              <td className="py-2 px-2 text-center bg-amber-50/40">
                                <input
                                  type="number"
                                  min="0"
                                  max={dom.questionCount}
                                  value={domL2}
                                  onChange={(e) => handleDomainLevelChange(dom.id, 'level2Count', e.target.value)}
                                  className="w-16 text-center border border-amber-300 rounded py-1 px-1 text-xs font-mono font-bold text-amber-900 focus:ring-1 focus:ring-amber-500 outline-none"
                                />
                              </td>
                              <td className="py-2 px-2 text-center bg-purple-50/40">
                                <input
                                  type="number"
                                  min="0"
                                  max={dom.questionCount}
                                  value={domL3}
                                  onChange={(e) => handleDomainLevelChange(dom.id, 'level3Count', e.target.value)}
                                  className="w-16 text-center border border-purple-300 rounded py-1 px-1 text-xs font-mono font-bold text-purple-900 focus:ring-1 focus:ring-purple-500 outline-none"
                                />
                              </td>
                              <td className="py-2.5 px-3 text-center font-mono">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  isDomBalanced
                                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                    : 'bg-rose-100 text-rose-800 border border-rose-200'
                                }`}>
                                  {domSum} / {dom.questionCount}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-right">
                                <button
                                  type="button"
                                  onClick={() => handleAutoDistributeDomainLevels(dom.id)}
                                  className="text-[11px] font-bold text-blue-700 hover:text-blue-900 hover:underline cursor-pointer"
                                  title="Auto-fill 40% L1, 40% L2, 20% L3 for this domain"
                                >
                                  Auto (40-40-20)
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot className="bg-slate-100 text-slate-900 font-bold border-t border-slate-300">
                        <tr>
                          <td className="py-2 px-3 uppercase text-[10px]">Overall Totals:</td>
                          <td className="py-2 px-3 text-center font-mono text-blue-800">{totalQuestions}</td>
                          <td className="py-2 px-3 text-center font-mono text-emerald-800">{domainWiseL1Sum} Qs ({totalQuestions > 0 ? Math.round((domainWiseL1Sum/totalQuestions)*100) : 0}%)</td>
                          <td className="py-2 px-3 text-center font-mono text-amber-800">{domainWiseL2Sum} Qs ({totalQuestions > 0 ? Math.round((domainWiseL2Sum/totalQuestions)*100) : 0}%)</td>
                          <td className="py-2 px-3 text-center font-mono text-purple-800">{domainWiseL3Sum} Qs ({totalQuestions > 0 ? Math.round((domainWiseL3Sum/totalQuestions)*100) : 0}%)</td>
                          <td className="py-2 px-3 text-center font-mono">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                              isDomainWiseValid
                                ? 'bg-emerald-200 text-emerald-900'
                                : 'bg-rose-200 text-rose-900'
                            }`}>
                              {domainWiseTotalAllocated} / {totalQuestions}
                            </span>
                          </td>
                          <td className="py-2 px-3"></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )}

              {/* Visual Proportion Bar */}
              <div className="space-y-2 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                  <span className="flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-slate-500" />
                    Overall Difficulty Proportion Preview
                  </span>
                  <span className="font-mono text-slate-800">{totalQuestions} Total Questions</span>
                </div>
                <div className="h-4 w-full bg-slate-200 rounded-full overflow-hidden flex shadow-inner">
                  <div
                    style={{ width: `${totalQuestions > 0 ? (l1Count / totalQuestions) * 100 : 0}%` }}
                    className="bg-emerald-500 h-full transition-all"
                    title={`Level 1: ${l1Count} Qs (${l1Pct}%)`}
                  />
                  <div
                    style={{ width: `${totalQuestions > 0 ? (l2Count / totalQuestions) * 100 : 0}%` }}
                    className="bg-amber-500 h-full transition-all"
                    title={`Level 2: ${l2Count} Qs (${l2Pct}%)`}
                  />
                  <div
                    style={{ width: `${totalQuestions > 0 ? (l3Count / totalQuestions) * 100 : 0}%` }}
                    className="bg-purple-600 h-full transition-all"
                    title={`Level 3: ${l3Count} Qs (${l3Pct}%)`}
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600 flex-wrap gap-2">
                  <span className="flex items-center gap-1.5 text-emerald-700">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                    Level 1 (Easy): <span className="font-mono font-bold">{l1Count} Qs</span> ({l1Pct}%)
                  </span>
                  <span className="flex items-center gap-1.5 text-amber-700">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
                    Level 2 (Medium): <span className="font-mono font-bold">{l2Count} Qs</span> ({l2Pct}%)
                  </span>
                  <span className="flex items-center gap-1.5 text-purple-700">
                    <span className="w-2.5 h-2.5 rounded-full bg-purple-600 inline-block" />
                    Level 3 (Hard): <span className="font-mono font-bold">{l3Count} Qs</span> ({l3Pct}%)
                  </span>
                </div>
              </div>

            </div>
          )}

          {/* ================= STEP 3: STUDENT UPLOAD & USER ID ASSIGNMENT ================= */}
          {activeStep === 3 && (
            <div className="space-y-6 animate-in fade-in duration-150">
              
              {/* Context Description */}
              <div className="bg-indigo-50 border border-indigo-200 p-4 rounded-xl">
                <h3 className="text-sm font-bold text-indigo-950 flex items-center gap-2">
                  <Users className="w-4 h-4 text-indigo-600" />
                  Candidate Roster Upload & Programmatic User ID Assignment
                </h3>
                <p className="text-xs text-indigo-800 mt-1">
                  Upload student details across different engineering programmes. The system automatically assigns a standardized institutional User ID based on the programme (e.g., <strong>26CS001</strong> for CSE, <strong>26IT001</strong> for IT, <strong>26CE001</strong> for Civil) and generates a downloadable Excel file.
                </p>
              </div>

              {/* Upload Controls & Settings Bar */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Batch / Year Prefix
                  </label>
                  <input
                    type="text"
                    value={batchPrefix}
                    onChange={(e) => {
                      const val = e.target.value.toUpperCase();
                      setBatchPrefix(val);
                      recomputeAssignedStudents(rawStudents, val, defaultPin);
                    }}
                    placeholder="26"
                    className="w-full px-3 py-2 text-xs font-mono font-bold bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-blue-500"
                  />
                  <p className="text-[10px] text-slate-500 mt-0.5">e.g. 26 yields 26CS001, 26IT001</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Default Access PIN / Password
                  </label>
                  <input
                    type="text"
                    value={defaultPin}
                    onChange={(e) => {
                      setDefaultPin(e.target.value);
                      recomputeAssignedStudents(rawStudents, batchPrefix, e.target.value);
                    }}
                    placeholder="cit@123"
                    className="w-full px-3 py-2 text-xs font-mono font-bold bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-blue-500"
                  />
                  <p className="text-[10px] text-slate-500 mt-0.5">Assigned to students for login</p>
                </div>

                <div className="flex flex-col justify-end">
                  <button
                    type="button"
                    onClick={downloadSampleStudentRosterTemplate}
                    className="w-full px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-2xs"
                    title="Download pre-formatted Excel template with sample students from each branch"
                  >
                    <Download className="w-3.5 h-3.5 text-blue-600" />
                    <span>Download Excel Template</span>
                  </button>
                  <p className="text-[10px] text-center text-slate-500 mt-0.5">Pre-formatted .xlsx file</p>
                </div>
              </div>

              {/* Drag & Drop Upload Zone */}
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                className="border-2 border-dashed border-blue-300 hover:border-blue-500 bg-blue-50/40 hover:bg-blue-50/70 transition-all rounded-2xl p-6 sm:p-8 text-center flex flex-col items-center justify-center gap-3 cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />

                <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
                  {isProcessingFile ? (
                    <Loader2 className="w-6 h-6 animate-spin" />
                  ) : (
                    <Upload className="w-6 h-6" />
                  )}
                </div>

                <div>
                  <p className="text-sm font-extrabold text-slate-900">
                    Click to browse or drag & drop student details Excel / CSV
                  </p>
                  <p className="text-xs text-slate-600 mt-1 max-w-md">
                    Accepts <strong>.xlsx, .xls, or .csv</strong>. Columns can include: <em>Student Name, Programme / Department, Register No, Email</em>.
                  </p>
                </div>

                <div className="flex items-center gap-3 mt-1" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs shadow-xs transition-colors cursor-pointer"
                  >
                    Select File
                  </button>

                  <button
                    type="button"
                    onClick={handleLoadDemoStudents}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg text-xs shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                    title="Quickly populate with sample students across all 9 B.E./B.Tech branches for instant testing"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Load 27 Demo Students</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleLoad800StudentsCohort}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs shadow-xs transition-colors cursor-pointer flex items-center gap-1.5 ring-2 ring-emerald-400"
                    title="Generate complete 800-candidate cohort across all core CIT departments with unique User IDs and passwords"
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span>⚡ Allocate 800 Candidates Cohort (Full Batch)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowPasteArea(!showPasteArea)}
                    className="px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-bold rounded-lg text-xs transition-colors cursor-pointer"
                  >
                    {showPasteArea ? 'Hide Paste Area' : 'Paste Text'}
                  </button>
                </div>
              </div>

              {/* Paste Text Area */}
              {showPasteArea && (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700">
                      Paste Rows (e.g. from Excel or Google Sheets)
                    </label>
                    <span className="text-[11px] text-slate-500">Format: Name [Tab or Comma] Programme [Tab] RegNo</span>
                  </div>
                  <textarea
                    rows={4}
                    value={pastedText}
                    onChange={(e) => setPastedText(e.target.value)}
                    placeholder={"AARAV S\tB.E. Civil Engineering\t717624101001\nBHUVANESH M\tB.E. Computer Science & Engineering\t717624102001"}
                    className="w-full p-2.5 text-xs font-mono bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setPastedText('')}
                      className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-800"
                    >
                      Clear
                    </button>
                    <button
                      type="button"
                      onClick={handleProcessPastedText}
                      className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs"
                    >
                      Process Pasted Candidates
                    </button>
                  </div>
                </div>
              )}

              {/* Alerts */}
              {uploadError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span className="font-semibold">{uploadError}</span>
                </div>
              )}

              {uploadSuccessMsg && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span className="font-semibold">{uploadSuccessMsg}</span>
                </div>
              )}

              {/* ================= ASSIGNED CANDIDATES PREVIEW & DOWNLOAD ================= */}
              {assignedStudents.length > 0 && (
                <div className="space-y-4 pt-2">
                  
                  {/* Summary Header & Download Button */}
                  <div className="bg-slate-900 text-white p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-md">
                    <div>
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="w-5 h-5 text-emerald-400" />
                        <h4 className="text-sm font-extrabold text-white uppercase tracking-wider">
                          Assigned User IDs Generated ({assignedStudents.length} Students)
                        </h4>
                      </div>
                      <p className="text-xs text-slate-300 mt-0.5">
                        Students are assigned distinct IDs based on their programme. Download the roster excel below.
                      </p>
                    </div>

                    {/* Prominent Download Button */}
                    <button
                      type="button"
                      onClick={handleDownloadExcel}
                      disabled={isDownloadingExcel}
                      className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-extrabold rounded-lg text-xs shadow-lg flex items-center justify-center gap-2 transition-all cursor-pointer ring-2 ring-emerald-400/40 shrink-0"
                      title="Download the full credentials Excel workbook with User IDs, passwords, and test blueprint"
                    >
                      {isDownloadingExcel ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin text-white" />
                          <span>Generating Excel...</span>
                        </>
                      ) : (
                        <>
                          <FileSpreadsheet className="w-4 h-4 text-emerald-200" />
                          <span>Download Excel File (Assigned User IDs & Credentials)</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Programme Breakdown Chips */}
                  <div className="flex flex-wrap gap-2 items-center">
                    <span className="text-xs font-bold text-slate-700">Programme Breakdown:</span>
                    <button
                      type="button"
                      onClick={() => setPreviewFilterProg('ALL')}
                      className={`px-2.5 py-1 text-xs font-bold rounded-full transition-colors cursor-pointer ${
                        previewFilterProg === 'ALL'
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                      }`}
                    >
                      All ({assignedStudents.length})
                    </button>
                    {Object.entries(programmeCounts).map(([prog, count]) => {
                      const code = getProgrammeCode(prog);
                      const isSelected = previewFilterProg === prog;
                      return (
                        <button
                          key={prog}
                          type="button"
                          onClick={() => setPreviewFilterProg(prog)}
                          className={`px-2.5 py-1 text-xs font-bold rounded-full transition-colors cursor-pointer flex items-center gap-1.5 ${
                            isSelected
                              ? 'bg-indigo-600 text-white shadow-xs'
                              : 'bg-indigo-50 text-indigo-900 border border-indigo-200 hover:bg-indigo-100'
                          }`}
                        >
                          <span className="font-mono text-[10px] bg-white/20 px-1 rounded">{code}</span>
                          <span>{prog}</span>
                          <span className="bg-white text-indigo-900 px-1.5 py-0.2 rounded-full text-[10px] font-black">
                            {count}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Search & Filter */}
                  <div className="flex items-center gap-3">
                    <div className="relative flex-1">
                      <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search student by Name, Assigned User ID (e.g. 26CS001), or Reg No..."
                        className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-blue-500 font-medium"
                      />
                    </div>
                    <span className="text-xs text-slate-500 whitespace-nowrap">
                      Showing {filteredAssignedStudents.length} of {assignedStudents.length} candidates
                    </span>
                  </div>

                  {/* Assigned Students Table */}
                  <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs max-h-72 overflow-y-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px] sticky top-0 z-10">
                        <tr>
                          <th className="py-2.5 px-3 w-12 text-center">S.No</th>
                          <th className="py-2.5 px-3">Assigned User ID</th>
                          <th className="py-2.5 px-3">Student Name</th>
                          <th className="py-2.5 px-3">Programme / Department</th>
                          <th className="py-2.5 px-3">Original Reg No</th>
                          <th className="py-2.5 px-3 text-center">Access PIN</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {filteredAssignedStudents.map((st, idx) => (
                          <tr key={st.userId} className="hover:bg-slate-50 transition-colors">
                            <td className="py-2 px-3 text-center font-mono text-slate-500">
                              {idx + 1}
                            </td>
                            <td className="py-2 px-3">
                              <span className="inline-block px-2.5 py-0.5 font-mono font-black text-blue-800 bg-blue-100 border border-blue-300 rounded text-xs">
                                {st.userId}
                              </span>
                            </td>
                            <td className="py-2 px-3 font-bold text-slate-900">
                              {st.name}
                            </td>
                            <td className="py-2 px-3 text-slate-700">
                              <span className="inline-block px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-800 border border-slate-200">
                                {st.programme}
                              </span>
                            </td>
                            <td className="py-2 px-3 font-mono text-slate-600">
                              {st.originalRegNo || '-'}
                            </td>
                            <td className="py-2 px-3 text-center font-mono font-bold text-emerald-700">
                              {st.assignedPassword || defaultPin}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                </div>
              )}

            </div>
          )}

        </div>

        {/* MODAL FOOTER */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div>
            {activeStep > 1 ? (
              <button
                type="button"
                onClick={() => setActiveStep((prev) => (prev - 1) as 1 | 2)}
                className="px-4 py-2 text-xs font-bold text-slate-700 hover:text-slate-900 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Back to Step {activeStep - 1}
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            {activeStep < 3 ? (
              <button
                type="button"
                onClick={() => {
                  if (activeStep === 1) {
                    if (!testTitle.trim()) {
                      alert('Please provide a Test Title.');
                      return;
                    }
                    if (totalQuestions <= 0) {
                      alert('Please ensure total questions is greater than 0.');
                      return;
                    }
                    setActiveStep(2);
                  } else if (activeStep === 2) {
                    if (!isLevelValid) {
                      if (levelMode === 'percentage') {
                        alert(`Question level percentages must equal 100%. Currently it is ${percentageSum}%.`);
                      } else if (levelMode === 'count') {
                        alert(`Sum of questions across Level 1, 2, and 3 must equal total test questions (${totalQuestions}). Currently it is ${directCountSum}.`);
                      } else {
                        alert(`Please specify Level 1, 2, and 3 question counts for every domain so they equal total questions (${totalQuestions}).`);
                      }
                      return;
                    }
                    setActiveStep(3);
                  }
                }}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs shadow-md flex items-center gap-2 transition-colors cursor-pointer"
              >
                <span>Continue to Step {activeStep + 1}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <div className="flex items-center gap-2">
                {assignedStudents.length > 0 && (
                  <button
                    type="button"
                    onClick={handleDownloadExcel}
                    disabled={isDownloadingExcel}
                    className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download Excel</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleFinalSave}
                  disabled={isSaving || !isLevelValid || !testTitle.trim()}
                  className="px-5 py-2.5 bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-extrabold rounded-lg text-xs shadow-md flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-50 ring-2 ring-blue-400/30"
                >
                  <CheckCircle2 className="w-4 h-4 text-white" />
                  <span>Save & Activate Test ({totalQuestions} Qs, {assignedStudents.length} Students)</span>
                </button>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
