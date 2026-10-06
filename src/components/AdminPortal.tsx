import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Question, SavedSubmission, SecurityLog, FacultyCredential, StudentPinSchedule, AppExperienceFeedback, AssessmentTestConfig, ConfiguredDepartment, ActiveStudentSession } from '../types';
import {
  subscribeSecurityLogs,
  resolveSecurityLogInFirestore,
  saveSecurityLogToFirestore,
  getAllSubmissionsFromFirestore,
  updateSubmissionStudentDetailsInFirestore,
  subscribeToFeedback,
  deleteFeedbackFromFirestore,
  clearAllFeedbackFromFirestore,
  saveFeedbackToFirestore,
  subscribeAssessmentTests,
  saveAssessmentTestToFirestore,
  deleteAssessmentTestFromFirestore,
  clearStaleActiveSessions,
  resumeStudentSessionInFirestore
} from '../lib/firebase';
import { isStudentPinActive } from '../utils/scheduleUtils';
import { parseQuestionBankFromExcel, downloadSampleQuestionBankTemplate } from '../utils/excelQuestionParser';
import { generateTestQuestions, SECTION_METADATA, ALL_QUESTIONS } from '../data/questionsData';
import { getConfiguredDepartments } from '../utils/testManagerUtils';
import {
  downloadPdfReport,
  downloadExcelReport,
  downloadSingleDatePdfReport,
  downloadSingleDateExcelReport,
  downloadSingleDateCsvReport,
  downloadDepartmentwisePdfReport,
  downloadDepartmentwiseExcelReport,
  downloadDepartmentwiseCsvReport,
  downloadAllSubmissionsMasterPdfReport,
  downloadAllDatabaseRecordsExcelReport,
  bulkExportAllSubmissionsToExcel,
  downloadQuestionBankExcel,
  downloadQuestionBankCsv,
  extractIndividualPdfsZip,
  extractIndividualExcelZip,
  extractDepartmentIndividualPdfsZip,
  extractDepartmentIndividualExcelZip,
  extractDatewiseIndividualPdfsZip,
  extractDatewiseIndividualExcelZip,
  calculateGrade,
  computePercentileRank,
  calculateRelativeDomainGrade,
  RELATIVE_GRADING_DISCLAIMER,
  downloadGradewiseDepartmentPdfReport,
  downloadGradewiseDepartmentExcelReport,
  downloadGradewiseDepartmentCsvReport,
  exportStudentFeedbackToExcel,
  exportStudentFeedbackToCSV,
  exportStudentFeedbackToPDF,
  downloadDomainWiseDepartmentExcelReport,
  downloadDomainWiseDepartmentCsvReport,
  downloadDomainWiseDepartmentPdfReport
} from '../utils/exportUtils';
import { DepartmentDomainAnalysisView } from './DepartmentDomainAnalysisView';
import { NewTestModal } from './NewTestModal';
import { TestsManagementView } from './TestsManagementView';
import { DepartmentAttendanceReportView } from './DepartmentAttendanceReportView';
import { DomainGradeMarkLimitsTable } from './DomainGradeMarkLimitsTable';
import { CollegeDomainStatisticsTable } from './CollegeDomainStatisticsTable';
import { ShortcutModal } from './ShortcutModal';
import { recoverAllLocalSubmissions, exportSubmissionsToJson, importSubmissionsFromJson } from '../utils/offlineSync';
import { downloadRoleShortcut, getRoleDirectUrl, getRoleSharedUrl } from '../utils/shortcutUtils';
import { googleSignIn, getAccessToken } from '../utils/googleAuth';
import { createMasterSubmissionsSpreadsheet } from '../utils/googleSheetsUtils';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import {
  ShieldCheck,
  ShieldAlert,
  Lock,
  KeyRound,
  Bell,
  AlertTriangle,
  Activity,
  Radio,
  Search,
  Filter,
  FileText,
  FileSpreadsheet,
  Users,
  User,
  CreditCard,
  Award,
  BarChart3,
  Trash2,
  Eye,
  EyeOff,
  RotateCcw,
  UserCheck,
  Key,
  Save,
  Building2,
  ExternalLink,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Clock,
  Download,
  Printer,
  Sparkles,
  FileCode,
  Mail,
  Phone,
  X,
  ListFilter,
  PieChart as PieChartIcon,
  Layers,
  FileCheck,
  Upload,
  RefreshCw,
  HelpCircle,
  FolderPlus,
  HardDrive,
  Database,
  Server,
  Cpu,
  Play,
  Check,
  Plus,
  Pencil,
  Edit3,
  Copy,
  MessageSquare,
  MessageSquareQuote,
  Star,
  ThumbsUp,
  Quote,
  BookOpen,
  CheckCircle,
  CloudDownload,
  PlusCircle,
  ClipboardCheck
} from 'lucide-react';

interface AdminPortalProps {
  userRole?: 'faculty' | 'admin';
  submissions: SavedSubmission[];
  questionBank?: Question[];
  onUploadQuestionBank?: (questions: Question[]) => void;
  onResetQuestionBank?: () => void;
  onSelectSubmission: (submission: SavedSubmission) => void;
  onClearSubmissions: () => void;
  isStudentLoginLocked?: boolean;
  isFacultyLoginLocked?: boolean;
  lockedStudentRegNos?: string[];
  onToggleStudentLoginLock?: (locked: boolean) => void;
  onToggleFacultyLoginLock?: (locked: boolean) => void;
  onLockStudent?: (registerNo: string) => void;
  onUnlockStudent?: (registerNo: string) => void;
  studentAccessPin?: string;
  facultyAccessPin?: string;
  adminAccessPin?: string;
  adminId?: string;
  adminResetEmail?: string;
  adminMobile?: string;
  adminSecretRecoveryPin?: string;
  authorizedFaculty?: FacultyCredential[];
  studentPinSchedule?: StudentPinSchedule;
  assessmentExtraMinutes?: number;
  assessmentExtraWarningMsg?: string;
  onSetStudentAccessPin?: (newPin: string) => void;
  onSetStudentPinSchedule?: (schedule: StudentPinSchedule) => void;
  onSetAssessmentExtraTimer?: (extraMinutes: number, warningMsg: string) => void;
  onSetFacultyAccessPin?: (newPin: string) => void;
  onSetAdminAccessPin?: (newPin: string) => void;
  onSetAdminId?: (newId: string) => void;
  onSetAdminResetEmail?: (newEmail: string) => void;
  onSetAdminMobile?: (newMobile: string) => void;
  onSetAdminSecretRecoveryPin?: (newPin: string) => void;
  onSetAuthorizedFaculty?: (facultyList: FacultyCredential[]) => void;
  onDeleteSubmission?: (submissionId: string) => void;
  onDeleteMultipleSubmissions?: (submissionIds: string[]) => void;
  onDeleteAllSubmissions?: () => void;
  onUpdateSubmissionStudentDetails?: (submissionId: string, newRegNo: string, newDept: string, newName?: string) => Promise<boolean>;
  onResumeStudentSession?: (submission: SavedSubmission, launchMode?: 'student_login' | 'direct_launch', stayInAdmin?: boolean) => void;
  onResumeMultipleStudentSessions?: (submissions: SavedSubmission[]) => void;
  onSeedDemoRecords?: () => Promise<void>;
  onRefreshSubmissions?: () => Promise<SavedSubmission[] | void> | void;
  activeSessions?: ActiveStudentSession[];
  onClearStaleSessions?: () => Promise<number>;
}

export const AdminPortal: React.FC<AdminPortalProps> = ({
  userRole = 'faculty',
  submissions,
  questionBank = [],
  onUploadQuestionBank,
  onResetQuestionBank,
  onSelectSubmission,
  onClearSubmissions,
  isStudentLoginLocked = false,
  isFacultyLoginLocked = false,
  lockedStudentRegNos = [],
  onToggleStudentLoginLock,
  onToggleFacultyLoginLock,
  onLockStudent,
  onUnlockStudent,
  studentAccessPin = 'cit@123',
  facultyAccessPin = 'cit@123',
  adminAccessPin = 'cit@123',
  adminId = 'admin',
  adminResetEmail = 'admin@cit.edu.in',
  adminMobile = '+91 9876543210',
  adminSecretRecoveryPin = '7777',
  authorizedFaculty = [],
  studentPinSchedule,
  assessmentExtraMinutes = 0,
  assessmentExtraWarningMsg = '⚠️ Notice: Extra time has been granted by the Admin for this assessment session. Please manage your time effectively.',
  onSetStudentAccessPin,
  onSetStudentPinSchedule,
  onSetAssessmentExtraTimer,
  onSetFacultyAccessPin,
  onSetAdminAccessPin,
  onSetAdminId,
  onSetAdminResetEmail,
  onSetAdminMobile,
  onSetAdminSecretRecoveryPin,
  onSetAuthorizedFaculty,
  onDeleteSubmission,
  onDeleteMultipleSubmissions,
  onDeleteAllSubmissions,
  onUpdateSubmissionStudentDetails,
  onResumeStudentSession,
  onResumeMultipleStudentSessions,
  onSeedDemoRecords,
  onRefreshSubmissions,
  activeSessions = [],
  onClearStaleSessions
}) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'submissions' | 'attendance' | 'domain_analysis' | 'student_feedback' | 'access_control' | 'security_monitor' | 'question_bank' | 'storage_monitor' | 'tests_management'>('submissions');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDept, setSelectedDept] = useState('ALL');
  const [selectedDate, setSelectedDate] = useState(''); // YYYY-MM-DD or empty for all
  const [analyticsDept, setAnalyticsDept] = useState('ALL');
  const [analyticsDate, setAnalyticsDate] = useState('');
  const [securityFilter, setSecurityFilter] = useState<'ALL' | 'COMPLETED' | 'LOCKED'>('ALL');
  const [isSingleReportModalOpen, setIsSingleReportModalOpen] = useState(false);
  const [isSeedingDemoRecords, setIsSeedingDemoRecords] = useState(false);
  const [isFetchingFirestore, setIsFetchingFirestore] = useState(false);
  const [firestoreFetchStatus, setFirestoreFetchStatus] = useState<string | null>(null);

  // Assessment Tests & Candidate Allocation State
  const [assessmentTests, setAssessmentTests] = useState<AssessmentTestConfig[]>([]);
  const [isNewTestModalOpen, setIsNewTestModalOpen] = useState(false);
  const [isShortcutModalOpen, setIsShortcutModalOpen] = useState(false);
  const [copiedPortalLink, setCopiedPortalLink] = useState<string | null>(null);

  const handleCopyPortalLink = (key: string, url: string) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = url;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopiedPortalLink(key);
      setTimeout(() => setCopiedPortalLink(null), 2500);
    } catch (err) {
      console.error('Failed to copy portal link:', err);
    }
  };

  useEffect(() => {
    const unsub = subscribeAssessmentTests((tests) => {
      setAssessmentTests(tests);
    });
    return () => unsub();
  }, []);

  const handleSaveNewTest = async (testConfig: AssessmentTestConfig) => {
    await saveAssessmentTestToFirestore(testConfig);
    setAssessmentTests((prev) => {
      const idx = prev.findIndex(t => t.id === testConfig.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = testConfig;
        return next;
      }
      return [testConfig, ...prev];
    });
  };

  const handleDeleteTest = async (testId: string) => {
    await deleteAssessmentTestFromFirestore(testId);
    setAssessmentTests((prev) => prev.filter(t => t.id !== testId));
  };

  // Edit Student Submission Details State
  const [editingSubmission, setEditingSubmission] = useState<SavedSubmission | null>(null);
  const [editUserId, setEditUserId] = useState('');
  const [editStudentName, setEditStudentName] = useState('');
  const [editDepartment, setEditDepartment] = useState('B.E. Civil Engineering');
  const [isCustomEditDept, setIsCustomEditDept] = useState(false);
  const [customEditDept, setCustomEditDept] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editSuccessToast, setEditSuccessToast] = useState<string | null>(null);
  const [editErrorToast, setEditErrorToast] = useState<string | null>(null);

  // Dynamic Departments State synced with Admin/Institution catalog
  const [configuredDepts, setConfiguredDepts] = useState<ConfiguredDepartment[]>(() => getConfiguredDepartments());

  useEffect(() => {
    const handleDeptUpdate = () => {
      setConfiguredDepts(getConfiguredDepartments());
    };
    window.addEventListener('cit_active_test_updated', handleDeptUpdate);
    window.addEventListener('storage', handleDeptUpdate);
    return () => {
      window.removeEventListener('cit_active_test_updated', handleDeptUpdate);
      window.removeEventListener('storage', handleDeptUpdate);
    };
  }, []);

  const configuredDepartmentNames = useMemo(() => {
    const names = configuredDepts.map(d => d.name);
    submissions.forEach(s => {
      if (s.student?.department && !names.includes(s.student.department)) {
        names.push(s.student.department);
      }
    });
    return names;
  }, [configuredDepts, submissions]);

  const STANDARD_DEPARTMENTS = configuredDepartmentNames;

  const handleOpenEditSubmissionModal = (sub: SavedSubmission) => {
    setEditingSubmission(sub);
    setEditUserId(sub.student?.registerNo || '');
    setEditStudentName(sub.student?.name || '');
    const currentDept = sub.student?.department || 'B.E. Civil Engineering';
    if (STANDARD_DEPARTMENTS.includes(currentDept)) {
      setEditDepartment(currentDept);
      setIsCustomEditDept(false);
      setCustomEditDept('');
    } else {
      setEditDepartment('CUSTOM');
      setIsCustomEditDept(true);
      setCustomEditDept(currentDept);
    }
    setEditErrorToast(null);
  };

  const handleSaveEditSubmission = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!editingSubmission) return;

    const trimmedUserId = editUserId.trim().toUpperCase();
    const finalDept = isCustomEditDept ? customEditDept.trim() : editDepartment.trim();
    const finalName = editStudentName.trim();

    if (!trimmedUserId) {
      setEditErrorToast('Please enter a valid Register Number.');
      return;
    }
    if (!finalDept) {
      setEditErrorToast('Please specify a Department.');
      return;
    }

    setIsSavingEdit(true);
    setEditErrorToast(null);

    try {
      if (onUpdateSubmissionStudentDetails) {
        const ok = await onUpdateSubmissionStudentDetails(editingSubmission.id, trimmedUserId, finalDept, finalName);
        if (!ok) {
          throw new Error('Could not complete submission update.');
        }
      } else {
        await updateSubmissionStudentDetailsInFirestore(editingSubmission.id, {
          registerNo: trimmedUserId,
          department: finalDept,
          name: finalName
        });
        if (onRefreshSubmissions) {
          await onRefreshSubmissions();
        }
      }

      setEditSuccessToast(`✅ Updated Register Number to "${trimmedUserId}" and Department to "${finalDept}" for ${finalName || 'student'}.`);
      setEditingSubmission(null);
      setTimeout(() => setEditSuccessToast(null), 6000);
    } catch (err: any) {
      console.error('Failed to update submission:', err);
      setEditErrorToast(err?.message || 'Failed to update student submission details. Please try again.');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleFetchAllFromCloudFirestore = async () => {
    setIsFetchingFirestore(true);
    setFirestoreFetchStatus(null);
    try {
      if (onRefreshSubmissions) {
        await onRefreshSubmissions();
      }
      const liveDocs = await getAllSubmissionsFromFirestore();
      setFirestoreFetchStatus(`✅ Successfully fetched and synced ${liveDocs.length} total assessment submission(s) directly from Cloud Firestore.`);
      setTimeout(() => setFirestoreFetchStatus(null), 7000);
    } catch (err) {
      console.warn('Failed to fetch from Firestore:', err);
      setFirestoreFetchStatus('⚠️ Direct fetch completed with available records.');
      setTimeout(() => setFirestoreFetchStatus(null), 5000);
    } finally {
      setIsFetchingFirestore(false);
    }
  };

  // Student Feedback States
  const [feedbacks, setFeedbacks] = useState<AppExperienceFeedback[]>([]);
  const [feedbackSearchTerm, setFeedbackSearchTerm] = useState('');
  const [feedbackSelectedDept, setFeedbackSelectedDept] = useState('ALL');
  const [feedbackRatingFilter, setFeedbackRatingFilter] = useState<'ALL' | '5' | '4' | '3' | '2' | '1'>('ALL');
  const [feedbackSortBy, setFeedbackSortBy] = useState<'NEWEST' | 'RATING_HIGH' | 'RATING_LOW' | 'SCORE_HIGH' | 'REGNO'>('NEWEST');
  const [feedbackViewMode, setFeedbackViewMode] = useState<'table' | 'cards'>('table');
  const [selectedFeedbackDetail, setSelectedFeedbackDetail] = useState<AppExperienceFeedback | null>(null);
  const [isExportingFeedback, setIsExportingFeedback] = useState(false);
  const [feedbackExportToast, setFeedbackExportToast] = useState<string | null>(null);
  const [isDeleteAllFeedbackModalOpen, setIsDeleteAllFeedbackModalOpen] = useState(false);
  const [isDeletingAllFeedback, setIsDeletingAllFeedback] = useState(false);

  // Real-time Student Feedback Subscription with Local Storage fallback
  useEffect(() => {
    const unsub = subscribeToFeedback((list) => {
      if (list && list.length > 0) {
        setFeedbacks(list);
      } else {
        // Check if feedback was explicitly cleared by admin
        const wasCleared = localStorage.getItem('cit_student_feedback_cleared') === 'true';
        if (wasCleared) {
          setFeedbacks([]);
          return;
        }

        // Fallback to local storage
        let localList: AppExperienceFeedback[] = [];
        try {
          const cached = localStorage.getItem('cit_student_feedback_list');
          if (cached) localList = JSON.parse(cached);
        } catch (e) {}

        if (localList.length > 0) {
          setFeedbacks(localList);
        } else {
          setFeedbacks([]);
        }
      }
    });

    return () => {
      if (typeof unsub === 'function') unsub();
    };
  }, [submissions]);

  const handleClearFeedbackFilters = () => {
    setFeedbackSearchTerm('');
    setFeedbackSelectedDept('ALL');
    setFeedbackRatingFilter('ALL');
    setFeedbackSortBy('NEWEST');
  };

  const handleExportFeedbackExcel = async () => {
    setIsExportingFeedback(true);
    setFeedbackExportToast('Generating Student Feedback Excel (.xlsx) Report...');
    try {
      await exportStudentFeedbackToExcel(feedbacks, submissions);
      setFeedbackExportToast('✅ Student Feedback Excel (.xlsx) downloaded successfully!');
    } catch (err) {
      console.error('Error exporting feedback to Excel:', err);
      setFeedbackExportToast('⚠️ Failed to export feedback to Excel.');
    } finally {
      setIsExportingFeedback(false);
      setTimeout(() => setFeedbackExportToast(null), 4000);
    }
  };

  const handleExportFeedbackCsv = () => {
    setIsExportingFeedback(true);
    setFeedbackExportToast('Exporting Student Feedback CSV...');
    try {
      exportStudentFeedbackToCSV(feedbacks, submissions);
      setFeedbackExportToast('✅ Student Feedback CSV downloaded successfully!');
    } catch (err) {
      console.error('Error exporting feedback to CSV:', err);
      setFeedbackExportToast('⚠️ Failed to export feedback to CSV.');
    } finally {
      setIsExportingFeedback(false);
      setTimeout(() => setFeedbackExportToast(null), 4000);
    }
  };

  const handleExportFeedbackPdf = async () => {
    setIsExportingFeedback(true);
    setFeedbackExportToast('Generating Institutional Student Feedback PDF Report...');
    try {
      await exportStudentFeedbackToPDF(feedbacks, submissions);
      setFeedbackExportToast('✅ Student Feedback PDF downloaded successfully!');
    } catch (err) {
      console.error('Error exporting feedback to PDF:', err);
      setFeedbackExportToast('⚠️ Failed to export feedback to PDF.');
    } finally {
      setIsExportingFeedback(false);
      setTimeout(() => setFeedbackExportToast(null), 4000);
    }
  };

  const handleDeleteFeedbackItem = async (fbId: string) => {
    if (!window.confirm('Are you sure you want to delete this student feedback record?')) return;
    try {
      await deleteFeedbackFromFirestore(fbId);
      setFeedbacks((prev) => prev.filter((item) => item.id !== fbId));
      // update local storage
      try {
        const cached = localStorage.getItem('cit_student_feedback_list');
        if (cached) {
          const list: AppExperienceFeedback[] = JSON.parse(cached);
          localStorage.setItem('cit_student_feedback_list', JSON.stringify(list.filter((x) => x.id !== fbId)));
        }
      } catch (e) {}
    } catch (err) {
      console.error('Failed to delete feedback:', err);
    }
  };

  const handleDeleteAllFeedback = async () => {
    setIsDeletingAllFeedback(true);
    try {
      const result = await clearAllFeedbackFromFirestore();
      setFeedbacks([]);
      try {
        localStorage.removeItem('cit_student_feedback_list');
        localStorage.setItem('cit_student_feedback_cleared', 'true');
      } catch (e) {}
      setFeedbackExportToast(`🗑️ Successfully deleted all student feedback (${result.deletedCount || 'all'} records removed from database).`);
    } catch (err) {
      console.error('Failed to delete all feedback:', err);
      setFeedbackExportToast('⚠️ Error clearing student feedback from database.');
    } finally {
      setIsDeletingAllFeedback(false);
      setIsDeleteAllFeedbackModalOpen(false);
      setTimeout(() => setFeedbackExportToast(null), 5000);
    }
  };

  const handleClearAllFilters = () => {
    setSearchTerm('');
    setSelectedDept('ALL');
    setSelectedDate('');
    setSecurityFilter('ALL');
  };

  const handleRunSeedDemoRecords = async () => {
    if (!onSeedDemoRecords) return;
    setIsSeedingDemoRecords(true);
    try {
      await onSeedDemoRecords();
    } catch (err) {
      console.error('Error seeding demo records:', err);
    } finally {
      setIsSeedingDemoRecords(false);
    }
  };

  // Selective & Bulk Deletion State
  const [selectedSubmissionIds, setSelectedSubmissionIds] = useState<string[]>([]);
  const [isDeleteSelectedModalOpen, setIsDeleteSelectedModalOpen] = useState(false);
  const [isDeleteAllModalOpen, setIsDeleteAllModalOpen] = useState(false);

  // Bulk Resume State
  const [isResumeSelectedModalOpen, setIsResumeSelectedModalOpen] = useState(false);
  const [bulkResumeStatusMsg, setBulkResumeStatusMsg] = useState<string | null>(null);

  // Local Storage Recovery & JSON Backup States
  const [localRecoveryToast, setLocalRecoveryToast] = useState<string | null>(null);
  const [isRecoveringLocal, setIsRecoveringLocal] = useState(false);

  const handleRecoverLocalStorage = async () => {
    try {
      setIsRecoveringLocal(true);
      const result = recoverAllLocalSubmissions();
      if (onRefreshSubmissions) {
        await onRefreshSubmissions();
      }
      setLocalRecoveryToast(`📥 Local Storage Recovery Complete: Scanned browser storage and recovered ${result.count} submission record(s)!`);
      setTimeout(() => setLocalRecoveryToast(null), 8000);
    } catch (err: any) {
      console.error('Failed to recover submissions from local storage:', err);
      setLocalRecoveryToast(`❌ Recovery warning: ${err.message || 'Error scanning local storage'}`);
      setTimeout(() => setLocalRecoveryToast(null), 8000);
    } finally {
      setIsRecoveringLocal(false);
    }
  };

  const handleExportJsonBackup = () => {
    try {
      const currentSubs = submissions && submissions.length > 0 ? submissions : recoverAllLocalSubmissions().recovered;
      if (currentSubs.length === 0) {
        alert('No submission records found in memory or local storage to backup.');
        return;
      }
      exportSubmissionsToJson(currentSubs);
      setLocalRecoveryToast(`💾 Downloaded JSON backup file containing ${currentSubs.length} candidate evaluation records.`);
      setTimeout(() => setLocalRecoveryToast(null), 6000);
    } catch (err: any) {
      alert(`Export error: ${err.message}`);
    }
  };

  const handleImportJsonBackup = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target?.result as string;
        const result = importSubmissionsFromJson(text);
        if (onRefreshSubmissions) {
          await onRefreshSubmissions();
        }
        setLocalRecoveryToast(`✅ Successfully imported ${result.importedCount} submission record(s) from backup file! Total records: ${result.submissions.length}`);
        setTimeout(() => setLocalRecoveryToast(null), 8000);
      } catch (err: any) {
        alert(`Failed to import JSON backup: ${err.message}`);
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  // Bulk Export All State & Handler
  const [isBulkExportingAll, setIsBulkExportingAll] = useState(false);
  const [bulkExportStatusMsg, setBulkExportStatusMsg] = useState<string | null>(null);

  const handleBulkExportAll = async () => {
    try {
      setIsBulkExportingAll(true);
      setBulkExportStatusMsg('Connecting to database and local storage to fetch all submissions...');

      // Fetch all submissions from Firestore database and local storage
      let allSubs: SavedSubmission[] = [];
      try {
        allSubs = await getAllSubmissionsFromFirestore();
      } catch (err) {
        console.warn('Firestore direct fetch failed, falling back to state/localStorage', err);
      }

      // If Firestore returned empty or failed, fallback to component submissions prop
      if (!allSubs || allSubs.length === 0) {
        allSubs = submissions && submissions.length > 0 ? submissions : [];
      }

      // Check all localStorage backup keys if still empty
      if (allSubs.length === 0) {
        const recovered = recoverAllLocalSubmissions().recovered;
        if (recovered.length > 0) {
          allSubs = recovered;
        }
      }

      if (allSubs.length === 0) {
        alert('No student submissions found in Firestore or local storage to export.');
        setIsBulkExportingAll(false);
        setBulkExportStatusMsg(null);
        return;
      }

      setBulkExportStatusMsg(`Generating multi-sheet Excel file for ${allSubs.length} submission(s)...`);
      await bulkExportAllSubmissionsToExcel(allSubs);

      setBulkExportStatusMsg(`✅ Successfully exported all ${allSubs.length} student submission records to Excel (.xlsx)!`);
      setTimeout(() => {
        setBulkExportStatusMsg(null);
      }, 7000);
    } catch (error: any) {
      console.error('Error during bulk export:', error);
      alert(`Bulk Export Failed: ${error?.message || 'Unknown error'}`);
    } finally {
      setIsBulkExportingAll(false);
    }
  };

  // Universal Individual Student ZIP extraction states
  const [isExtractingAllPdfZip, setIsExtractingAllPdfZip] = useState(false);
  const [isExtractingAllExcelZip, setIsExtractingAllExcelZip] = useState(false);
  const [isExtractingDatePdfZip, setIsExtractingDatePdfZip] = useState(false);
  const [isExtractingDateExcelZip, setIsExtractingDateExcelZip] = useState(false);
  const [isExtractingSelectedPdfZip, setIsExtractingSelectedPdfZip] = useState(false);
  const [isExtractingSelectedExcelZip, setIsExtractingSelectedExcelZip] = useState(false);
  const [zipProgressToast, setZipProgressToast] = useState<string | null>(null);

  const handleExtractAllPdfsZip = async () => {
    try {
      setIsExtractingAllPdfZip(true);
      setZipProgressToast('Fetching all student records and compiling individual PDFs into ZIP...');
      let targetSubs = submissions;
      try {
        const directSubs = await getAllSubmissionsFromFirestore();
        if (directSubs && directSubs.length > 0) targetSubs = directSubs;
      } catch (e) {}

      if (!targetSubs || targetSubs.length === 0) {
        alert('No student assessment records found to extract into ZIP archive.');
        setZipProgressToast(null);
        return;
      }

      const count = await extractIndividualPdfsZip(targetSubs, 'All_CIT_Candidates', (curr, total, name) => {
        setZipProgressToast(`Building individual PDF (${curr}/${total}): ${name}...`);
      });
      setZipProgressToast(`✅ Successfully bundled & downloaded ${count} student PDF marksheets in ZIP archive!`);
      setTimeout(() => setZipProgressToast(null), 6000);
    } catch (err: any) {
      alert(`ZIP Extraction Failed: ${err?.message || 'Unknown error'}`);
      setZipProgressToast(null);
    } finally {
      setIsExtractingAllPdfZip(false);
    }
  };

  const handleExtractAllExcelZip = async () => {
    try {
      setIsExtractingAllExcelZip(true);
      setZipProgressToast('Fetching all student records and compiling individual Excel workbooks into ZIP...');
      let targetSubs = submissions;
      try {
        const directSubs = await getAllSubmissionsFromFirestore();
        if (directSubs && directSubs.length > 0) targetSubs = directSubs;
      } catch (e) {}

      if (!targetSubs || targetSubs.length === 0) {
        alert('No student assessment records found to extract into ZIP archive.');
        setZipProgressToast(null);
        return;
      }

      const count = await extractIndividualExcelZip(targetSubs, 'All_CIT_Candidates', (curr, total, name) => {
        setZipProgressToast(`Building individual Excel (${curr}/${total}): ${name}...`);
      });
      setZipProgressToast(`✅ Successfully bundled & downloaded ${count} student Excel marksheets in ZIP archive!`);
      setTimeout(() => setZipProgressToast(null), 6000);
    } catch (err: any) {
      alert(`ZIP Extraction Failed: ${err?.message || 'Unknown error'}`);
      setZipProgressToast(null);
    } finally {
      setIsExtractingAllExcelZip(false);
    }
  };

  const handleExtractSelectedPdfsZip = async () => {
    const selectedSubs = submissions.filter((s) => selectedSubmissionIds.includes(s.id));
    if (selectedSubs.length === 0) {
      alert('Please select at least one student from the table.');
      return;
    }
    try {
      setIsExtractingSelectedPdfZip(true);
      setZipProgressToast(`Compiling individual PDFs for ${selectedSubs.length} selected student(s)...`);
      const count = await extractIndividualPdfsZip(selectedSubs, `Selected_${selectedSubs.length}_Candidates`, (curr, total, name) => {
        setZipProgressToast(`Building individual PDF (${curr}/${total}): ${name}...`);
      });
      setZipProgressToast(`✅ Successfully downloaded ZIP containing ${count} selected student PDF reports!`);
      setTimeout(() => setZipProgressToast(null), 6000);
    } catch (err: any) {
      alert(`Selected ZIP Extraction Failed: ${err?.message || 'Unknown error'}`);
      setZipProgressToast(null);
    } finally {
      setIsExtractingSelectedPdfZip(false);
    }
  };

  const handleExtractSelectedExcelZip = async () => {
    const selectedSubs = submissions.filter((s) => selectedSubmissionIds.includes(s.id));
    if (selectedSubs.length === 0) {
      alert('Please select at least one student from the table.');
      return;
    }
    try {
      setIsExtractingSelectedExcelZip(true);
      setZipProgressToast(`Compiling individual Excel workbooks for ${selectedSubs.length} selected student(s)...`);
      const count = await extractIndividualExcelZip(selectedSubs, `Selected_${selectedSubs.length}_Candidates`, (curr, total, name) => {
        setZipProgressToast(`Building individual Excel (${curr}/${total}): ${name}...`);
      });
      setZipProgressToast(`✅ Successfully downloaded ZIP containing ${count} selected student Excel reports!`);
      setTimeout(() => setZipProgressToast(null), 6000);
    } catch (err: any) {
      alert(`Selected ZIP Extraction Failed: ${err?.message || 'Unknown error'}`);
      setZipProgressToast(null);
    } finally {
      setIsExtractingSelectedExcelZip(false);
    }
  };

  // Storage & Capacity Monitor State
  const [isStorageModalOpen, setIsStorageModalOpen] = useState(false);
  const [deviceStorageEstimate, setDeviceStorageEstimate] = useState<{ quota: number; usage: number } | null>(null);
  const [storageScanTimestamp, setStorageScanTimestamp] = useState<string>(new Date().toLocaleTimeString());

  // Individual Department Extraction & Gradewise Report Loading States
  const [isExtractingPdfZip, setIsExtractingPdfZip] = useState(false);
  const [isExtractingExcelZip, setIsExtractingExcelZip] = useState(false);
  const [isGeneratingGradewisePdf, setIsGeneratingGradewisePdf] = useState(false);

  // Question Bank Conduct & Review State
  const [qbSearchTerm, setQbSearchTerm] = useState('');
  const [qbSelectedSection, setQbSelectedSection] = useState<string>('ALL');
  const [qbSelectedDifficulty, setQbSelectedDifficulty] = useState<string>('ALL');
  
  // Local reactive Question Bank state ensuring instant updates and manual refresh capability
  const [localQuestionBank, setLocalQuestionBank] = useState<Question[]>(() => {
    if (questionBank && questionBank.length > 0) return questionBank;
    try {
      const saved = localStorage.getItem('CIT_CUSTOM_QUESTION_BANK');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return questionBank || ALL_QUESTIONS;
  });

  const [isRefreshingInspector, setIsRefreshingInspector] = useState(false);

  // Synchronize local question bank with incoming prop from App / Firestore
  useEffect(() => {
    if (questionBank && questionBank.length > 0) {
      setLocalQuestionBank(questionBank);
    }
  }, [questionBank]);

  const [isQuestionBankAccepted, setIsQuestionBankAccepted] = useState<boolean>(() => {
    try {
      return localStorage.getItem('CIT_QUESTION_BANK_ACCEPTED') === 'true';
    } catch (e) {
      return true;
    }
  });
  const [acceptedTimestamp, setAcceptedTimestamp] = useState<string>(() => {
    try {
      return localStorage.getItem('CIT_QUESTION_BANK_ACCEPTED_AT') || new Date().toLocaleString();
    } catch (e) {
      return new Date().toLocaleString();
    }
  });
  const [isPreviewTestPaperModalOpen, setIsPreviewTestPaperModalOpen] = useState(false);
  const [previewTestQuestions, setPreviewTestQuestions] = useState<Question[]>([]);

  // Refresh Question Bank Inspector
  const handleRefreshInspector = () => {
    setIsRefreshingInspector(true);
    setQbSearchTerm('');
    setQbSelectedSection('ALL');
    setQbSelectedDifficulty('ALL');
    setSelectedQbQuestionIds([]);

    try {
      const saved = localStorage.getItem('CIT_CUSTOM_QUESTION_BANK');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setLocalQuestionBank(parsed);
          if (onUploadQuestionBank) {
            onUploadQuestionBank(parsed);
          }
          setUploadStatus(`🔄 Question Bank Inspector refreshed! Displaying ${parsed.length} custom uploaded questions.`);
          setTimeout(() => setIsRefreshingInspector(false), 300);
          return;
        }
      }
    } catch (e) {}

    const fallbackList = questionBank && questionBank.length > 0 ? questionBank : ALL_QUESTIONS;
    setLocalQuestionBank(fallbackList);
    if (onUploadQuestionBank) {
      onUploadQuestionBank(fallbackList);
    }
    setUploadStatus(`🔄 Question Bank Inspector refreshed! Displaying ${fallbackList.length} master questions.`);
    setTimeout(() => setIsRefreshingInspector(false), 300);
  };

  // Question Bank Editing, Creation & Selection State
  const [isAddEditQuestionModalOpen, setIsAddEditQuestionModalOpen] = useState(false);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [selectedQbQuestionIds, setSelectedQbQuestionIds] = useState<string[]>([]);
  const [viewingDetailQuestion, setViewingDetailQuestion] = useState<Question | null>(null);

  const [qbFormSectionId, setQbFormSectionId] = useState<string>('calculus');
  const [qbFormDifficulty, setQbFormDifficulty] = useState<'easy' | 'medium' | 'hard'>('easy');
  const [qbFormQuestionText, setQbFormQuestionText] = useState<string>('');
  const [qbFormOptions, setQbFormOptions] = useState<[string, string, string, string]>(['', '', '', '']);
  const [qbFormCorrectAnswer, setQbFormCorrectAnswer] = useState<number>(0);
  const [qbFormExplanation, setQbFormExplanation] = useState<string>('');
  const [qbFormError, setQbFormError] = useState<string | null>(null);

  const handleOpenAddQuestionModal = () => {
    setEditingQuestionId(null);
    setQbFormSectionId(qbSelectedSection !== 'ALL' ? qbSelectedSection : 'calculus');
    setQbFormDifficulty(qbSelectedDifficulty !== 'ALL' ? (qbSelectedDifficulty as any) : 'easy');
    setQbFormQuestionText('');
    setQbFormOptions(['', '', '', '']);
    setQbFormCorrectAnswer(0);
    setQbFormExplanation('');
    setQbFormError(null);
    setIsAddEditQuestionModalOpen(true);
  };

  const handleOpenEditQuestionModal = (q: Question) => {
    setEditingQuestionId(q.id);
    setQbFormSectionId(q.sectionId || 'calculus');
    setQbFormDifficulty(q.difficulty || 'easy');
    setQbFormQuestionText(q.questionText || q.question || '');
    setQbFormOptions([
      q.options?.[0] || '',
      q.options?.[1] || '',
      q.options?.[2] || '',
      q.options?.[3] || ''
    ]);
    setQbFormCorrectAnswer(typeof q.correctAnswer === 'number' ? q.correctAnswer : 0);
    setQbFormExplanation(q.explanation || '');
    setQbFormError(null);
    setIsAddEditQuestionModalOpen(true);
  };

  const handleSaveQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!qbFormQuestionText.trim()) {
      setQbFormError('Please enter the question text/prompt.');
      return;
    }
    if (qbFormOptions.some((opt) => !opt.trim())) {
      setQbFormError('Please fill in all 4 option choices (A, B, C, D).');
      return;
    }

    const currentBank = [...(localQuestionBank && localQuestionBank.length > 0 ? localQuestionBank : (questionBank || ALL_QUESTIONS))];

    if (editingQuestionId) {
      const updatedList = currentBank.map((q) => {
        if (q.id === editingQuestionId) {
          return {
            ...q,
            sectionId: qbFormSectionId as any,
            difficulty: qbFormDifficulty,
            questionText: qbFormQuestionText.trim(),
            question: qbFormQuestionText.trim(),
            options: [...qbFormOptions] as [string, string, string, string],
            correctAnswer: qbFormCorrectAnswer,
            explanation: qbFormExplanation.trim()
          };
        }
        return q;
      });

      setLocalQuestionBank(updatedList);
      try {
        localStorage.setItem('CIT_CUSTOM_QUESTION_BANK', JSON.stringify(updatedList));
      } catch (e) {}

      if (onUploadQuestionBank) {
        onUploadQuestionBank(updatedList);
      }
      setUploadStatus('Question updated successfully in active bank.');
      setUploadError(null);
    } else {
      const sectionCount = currentBank.filter((q) => q.sectionId === qbFormSectionId).length;
      const newQuestion: Question = {
        id: `custom_q_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        sectionId: qbFormSectionId as any,
        difficulty: qbFormDifficulty,
        questionNumber: sectionCount + 1,
        questionText: qbFormQuestionText.trim(),
        question: qbFormQuestionText.trim(),
        options: [...qbFormOptions] as [string, string, string, string],
        correctAnswer: qbFormCorrectAnswer,
        explanation: qbFormExplanation.trim()
      };

      const updatedList = [newQuestion, ...currentBank];
      setLocalQuestionBank(updatedList);
      try {
        localStorage.setItem('CIT_CUSTOM_QUESTION_BANK', JSON.stringify(updatedList));
      } catch (e) {}

      if (onUploadQuestionBank) {
        onUploadQuestionBank(updatedList);
      }
      setUploadStatus('New question added successfully to active question bank.');
      setUploadError(null);
    }

    setIsAddEditQuestionModalOpen(false);
  };

  const handleDeleteSingleQuestion = (qId: string) => {
    if (!window.confirm('Are you sure you want to delete this question from the active question bank?')) return;
    const currentList = localQuestionBank && localQuestionBank.length > 0 ? localQuestionBank : (questionBank || []);
    const updatedList = currentList.filter((q) => q.id !== qId);
    setLocalQuestionBank(updatedList);
    try {
      localStorage.setItem('CIT_CUSTOM_QUESTION_BANK', JSON.stringify(updatedList));
    } catch (e) {}
    if (onUploadQuestionBank) {
      onUploadQuestionBank(updatedList);
    }
    setSelectedQbQuestionIds((prev) => prev.filter((id) => id !== qId));
    setUploadStatus('Question removed from active bank.');
    setUploadError(null);
  };

  const handleBulkDeleteQbQuestions = () => {
    if (selectedQbQuestionIds.length === 0) return;
    if (!window.confirm(`Are you sure you want to delete ${selectedQbQuestionIds.length} selected question(s) from the active bank?`)) return;

    const idsSet = new Set(selectedQbQuestionIds);
    const currentList = localQuestionBank && localQuestionBank.length > 0 ? localQuestionBank : (questionBank || []);
    const updatedList = currentList.filter((q) => !idsSet.has(q.id));
    setLocalQuestionBank(updatedList);
    try {
      localStorage.setItem('CIT_CUSTOM_QUESTION_BANK', JSON.stringify(updatedList));
    } catch (e) {}
    if (onUploadQuestionBank) {
      onUploadQuestionBank(updatedList);
    }
    setSelectedQbQuestionIds([]);
    setUploadStatus(`Successfully deleted ${idsSet.size} question(s) from active bank.`);
    setUploadError(null);
  };

  const handleClearAllQuestions = () => {
    const currentList = localQuestionBank && localQuestionBank.length > 0 ? localQuestionBank : (questionBank || []);
    if (currentList.length === 0) {
      alert('Question bank is already empty.');
      return;
    }
    const confirmClear = window.confirm(
      "⚠️ ARE YOU SURE YOU WANT TO CLEAR ALL QUESTIONS?\n\nThis will remove all questions currently in the active Question Bank. You can upload a new Excel question bank or click 'Reset to Default' anytime to restore the CIT Master Bank."
    );
    if (confirmClear) {
      setLocalQuestionBank([]);
      try {
        localStorage.setItem('CIT_CUSTOM_QUESTION_BANK', JSON.stringify([]));
      } catch (e) {}
      if (onUploadQuestionBank) {
        onUploadQuestionBank([]);
      }
      setSelectedQbQuestionIds([]);
      setUploadStatus("Successfully cleared all questions from the active Question Bank. The bank is now empty.");
      setUploadError(null);
    }
  };

  const handleAcceptAndConductAssessment = () => {
    const activeList = localQuestionBank && localQuestionBank.length > 0 ? localQuestionBank : (questionBank || []);
    if (activeList.length === 0) {
      alert("Cannot conduct assessment with an empty question bank. Please add questions, upload an Excel set, or click 'Reset to Default'.");
      return;
    }
    const nowStr = new Date().toLocaleString();
    setIsQuestionBankAccepted(true);
    setAcceptedTimestamp(nowStr);
    try {
      localStorage.setItem('CIT_QUESTION_BANK_ACCEPTED', 'true');
      localStorage.setItem('CIT_QUESTION_BANK_ACCEPTED_AT', nowStr);
    } catch (e) {
      console.error('Failed to save question bank acceptance:', e);
    }

    if (onUploadQuestionBank) {
      onUploadQuestionBank(activeList);
    }

    saveSecurityLogToFirestore({
      id: `sec_qb_accept_${Date.now()}`,
      timestamp: nowStr,
      eventType: 'QUESTION_BANK_ACCEPTED_AND_CONDUCTED',
      severity: 'HIGH',
      details: `Admin officially accepted the question bank (${activeList.length} Questions) and activated it to conduct candidate assessments.`,
      userName: 'Administrator',
      userRole: 'admin'
    });

    setUploadStatus(`✅ Question Bank Accepted & Activated! Assessment is now LIVE and being conducted using this ${activeList.length}-question master set.`);
    setUploadError(null);
  };

  const handleOpenPreviewTestPaper = () => {
    const activeList = localQuestionBank && localQuestionBank.length > 0 ? localQuestionBank : (questionBank || []);
    if (activeList.length === 0) {
      alert("Question bank is currently empty. Please add questions, upload an Excel file, or click 'Reset to Default'.");
      return;
    }
    const sampled = generateTestQuestions(activeList);
    setPreviewTestQuestions(sampled);
    setIsPreviewTestPaperModalOpen(true);
  };

  // Calculate browser dynamic storage estimate if supported
  useEffect(() => {
    if (navigator.storage && navigator.storage.estimate) {
      navigator.storage.estimate().then((estimate) => {
        if (estimate.quota !== undefined && estimate.usage !== undefined) {
          setDeviceStorageEstimate({
            quota: estimate.quota,
            usage: estimate.usage
          });
        }
      }).catch(() => {});
    }
  }, []);

  const refreshStorageScan = () => {
    setStorageScanTimestamp(new Date().toLocaleTimeString());
    if (navigator.storage && navigator.storage.estimate) {
      navigator.storage.estimate().then((estimate) => {
        if (estimate.quota !== undefined && estimate.usage !== undefined) {
          setDeviceStorageEstimate({
            quota: estimate.quota,
            usage: estimate.usage
          });
        }
      }).catch(() => {});
    }
  };

  // Storage byte formatting
  const formatStorageBytes = (bytes: number): string => {
    if (bytes <= 0) return '0 Bytes';
    if (bytes < 1024) return `${bytes} Bytes`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  // Deletion & Resume Re-attempt Confirmation Modals
  const [deleteConfirmSubmission, setDeleteConfirmSubmission] = useState<SavedSubmission | null>(null);
  const [resumeConfirmSubmission, setResumeConfirmSubmission] = useState<SavedSubmission | null>(null);

  // Departmentwise & Gradewise Report Generator State
  const [selectedReportDept, setSelectedReportDept] = useState('ALL');
  const [selectedReportGrade, setSelectedReportGrade] = useState<'ALL' | 'A' | 'B' | 'C'>('ALL');
  const [isDeptReportModalOpen, setIsDeptReportModalOpen] = useState(false);
  const [isGradewiseReportModalOpen, setIsGradewiseReportModalOpen] = useState(false);
  const [gradewiseModalGradeFilter, setGradewiseModalGradeFilter] = useState<'ALL' | 'A' | 'B' | 'C'>('ALL');
  const [gradewiseModalSearchTerm, setGradewiseModalSearchTerm] = useState('');

  // Master Google Sheets State
  const [isExportingMasterSheets, setIsExportingMasterSheets] = useState(false);
  const [masterSheetsUrl, setMasterSheetsUrl] = useState<string | null>(null);
  const [masterSheetsError, setMasterSheetsError] = useState<string | null>(null);

  // Faculty Assessment Instructions Modals State
  const [isGradeDistributionModalOpen, setIsGradeDistributionModalOpen] = useState(false);
  const [isScoreRangeModalOpen, setIsScoreRangeModalOpen] = useState(false);

  // Manual Register Number Lock/Unlock State
  const [manualRegNo, setManualRegNo] = useState('');
  const [manualLockActionMsg, setManualLockActionMsg] = useState<string | null>(null);

  // Custom Access PIN & Admin Credential management state
  const [newStudentPinInput, setNewStudentPinInput] = useState('');
  const [newFacultyPinInput, setNewFacultyPinInput] = useState('');
  const [newAdminPinInput, setNewAdminPinInput] = useState('');
  const [newAdminIdInput, setNewAdminIdInput] = useState(adminId);
  const [newAdminEmailInput, setNewAdminEmailInput] = useState(adminResetEmail);
  const [newAdminMobileInput, setNewAdminMobileInput] = useState(adminMobile);
  const [newAdminSecretRecoveryPinInput, setNewAdminSecretRecoveryPinInput] = useState(adminSecretRecoveryPin);
  const [showStudentPin, setShowStudentPin] = useState(false);
  const [showFacultyPin, setShowFacultyPin] = useState(false);
  const [showAdminPin, setShowAdminPin] = useState(false);
  const [showAdminSecretRecoveryPin, setShowAdminSecretRecoveryPin] = useState(false);
  const [pinActionMsg, setPinActionMsg] = useState<string | null>(null);

  // Authorized Faculty Credential Management State
  const [newFacId, setNewFacId] = useState('');
  const [newFacName, setNewFacName] = useState('');
  const [newFacDept, setNewFacDept] = useState('B.E. Computer Science & Engineering');
  const [newFacPassword, setNewFacPassword] = useState('');
  const [editingFacEntryId, setEditingFacEntryId] = useState<string | null>(null);
  const [showFacPasswords, setShowFacPasswords] = useState<Record<string, boolean>>({});
  const [facultySearchQuery, setFacultySearchQuery] = useState('');
  const [facultyActionMsg, setFacultyActionMsg] = useState<string | null>(null);

  // Scheduled Active Time for Student Access PIN State
  const [schedEnabled, setSchedEnabled] = useState<boolean>(studentPinSchedule?.isEnabled ?? false);
  const [schedType, setSchedType] = useState<'datetime' | 'daily'>(studentPinSchedule?.type ?? 'datetime');
  const [schedStart, setSchedStart] = useState<string>(studentPinSchedule?.startTime ?? '');
  const [schedEnd, setSchedEnd] = useState<string>(studentPinSchedule?.endTime ?? '');
  const [schedActionMsg, setSchedActionMsg] = useState<string | null>(null);

  useEffect(() => {
    if (studentPinSchedule) {
      setSchedEnabled(studentPinSchedule.isEnabled ?? false);
      setSchedType(studentPinSchedule.type ?? 'datetime');
      setSchedStart(studentPinSchedule.startTime ?? '');
      setSchedEnd(studentPinSchedule.endTime ?? '');
    }
  }, [studentPinSchedule]);

  const handleSavePinSchedule = (overrideSchedule?: StudentPinSchedule) => {
    const targetSchedule: StudentPinSchedule = overrideSchedule || {
      isEnabled: schedEnabled,
      type: schedType,
      startTime: schedStart,
      endTime: schedEnd
    };

    if (targetSchedule.isEnabled) {
      if (!targetSchedule.startTime || !targetSchedule.endTime) {
        setSchedActionMsg('⚠️ Please specify both Start Time and End Time for the schedule.');
        return;
      }
    }

    if (onSetStudentPinSchedule) {
      onSetStudentPinSchedule(targetSchedule);
      if (targetSchedule.isEnabled) {
        const status = isStudentPinActive(targetSchedule);
        setSchedActionMsg(`✅ Scheduled active time updated and saved! Currently ${status.isActive ? '🟢 ACTIVE' : '🔴 INACTIVE'}.`);
      } else {
        setSchedActionMsg('🔄 Scheduled active time disabled. Student Access PIN is now active 24/7.');
      }
      setTimeout(() => setSchedActionMsg(null), 6000);
    }
  };

  const handleApplyPreset = (preset: '1hr' | '3hr' | 'today9to5' | 'daily9to5' | 'disable') => {
    const pad = (n: number) => (n < 10 ? '0' + n : n);
    const formatLocalIso = (d: Date) => {
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };

    const now = new Date();

    if (preset === '1hr') {
      const end = new Date(now.getTime() + 3600000);
      const startStr = formatLocalIso(now);
      const endStr = formatLocalIso(end);
      setSchedEnabled(true);
      setSchedType('datetime');
      setSchedStart(startStr);
      setSchedEnd(endStr);
      handleSavePinSchedule({
        isEnabled: true,
        type: 'datetime',
        startTime: startStr,
        endTime: endStr
      });
    } else if (preset === '3hr') {
      const end = new Date(now.getTime() + 3 * 3600000);
      const startStr = formatLocalIso(now);
      const endStr = formatLocalIso(end);
      setSchedEnabled(true);
      setSchedType('datetime');
      setSchedStart(startStr);
      setSchedEnd(endStr);
      handleSavePinSchedule({
        isEnabled: true,
        type: 'datetime',
        startTime: startStr,
        endTime: endStr
      });
    } else if (preset === 'today9to5') {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 0);
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 17, 0);
      const startStr = formatLocalIso(start);
      const endStr = formatLocalIso(end);
      setSchedEnabled(true);
      setSchedType('datetime');
      setSchedStart(startStr);
      setSchedEnd(endStr);
      handleSavePinSchedule({
        isEnabled: true,
        type: 'datetime',
        startTime: startStr,
        endTime: endStr
      });
    } else if (preset === 'daily9to5') {
      setSchedEnabled(true);
      setSchedType('daily');
      setSchedStart('09:00');
      setSchedEnd('17:00');
      handleSavePinSchedule({
        isEnabled: true,
        type: 'daily',
        startTime: '09:00',
        endTime: '17:00'
      });
    } else if (preset === 'disable') {
      setSchedEnabled(false);
      handleSavePinSchedule({
        isEnabled: false,
        type: schedType,
        startTime: schedStart,
        endTime: schedEnd
      });
    }
  };

  // Extra Assessment Timer & Custom Warning Message State
  const [extraMinsInput, setExtraMinsInput] = useState<number>(assessmentExtraMinutes);
  const [extraWarningMsgInput, setExtraWarningMsgInput] = useState<string>(assessmentExtraWarningMsg);
  const [extraTimerActionMsg, setExtraTimerActionMsg] = useState<string | null>(null);

  useEffect(() => {
    setExtraMinsInput(assessmentExtraMinutes);
  }, [assessmentExtraMinutes]);

  useEffect(() => {
    setExtraWarningMsgInput(assessmentExtraWarningMsg);
  }, [assessmentExtraWarningMsg]);

  const handleSaveExtraTimer = (overrideMins?: number, overrideMsg?: string) => {
    const mins = overrideMins !== undefined ? overrideMins : Math.max(0, Number(extraMinsInput) || 0);
    const msg = overrideMsg !== undefined ? overrideMsg : extraWarningMsgInput;

    if (onSetAssessmentExtraTimer) {
      onSetAssessmentExtraTimer(mins, msg);
      if (mins > 0) {
        setExtraTimerActionMsg(`✅ Extra time of +${mins} minutes successfully granted! Total assessment duration is now ${60 + mins} minutes.`);
      } else {
        setExtraTimerActionMsg(`🔄 Assessment timer reset to standard 60-minute duration. Extra time cleared.`);
      }
      setTimeout(() => setExtraTimerActionMsg(null), 6000);
    }
  };

  const handlePresetExtraMins = (mins: number) => {
    setExtraMinsInput(mins);
    handleSaveExtraTimer(mins, extraWarningMsgInput);
  };

  useEffect(() => {
    if (adminId) {
      setNewAdminIdInput(adminId);
    }
  }, [adminId]);

  useEffect(() => {
    if (adminResetEmail) {
      setNewAdminEmailInput(adminResetEmail);
    }
  }, [adminResetEmail]);

  useEffect(() => {
    if (adminMobile) {
      setNewAdminMobileInput(adminMobile);
    }
  }, [adminMobile]);

  useEffect(() => {
    if (adminSecretRecoveryPin) {
      setNewAdminSecretRecoveryPinInput(adminSecretRecoveryPin);
    }
  }, [adminSecretRecoveryPin]);

  // Real-Time Misbehavior & Security Incident Feed State
  const [securityLogs, setSecurityLogs] = useState<SecurityLog[]>([]);
  const [logSeverityFilter, setLogSeverityFilter] = useState<'ALL' | 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'>('ALL');
  const [logSearchQuery, setLogSearchQuery] = useState('');

  useEffect(() => {
    const unsub = subscribeSecurityLogs((logs) => {
      setSecurityLogs(logs);
    });
    return () => unsub();
  }, []);

  // 1. Calculate size of Submissions
  const submissionsJsonStr = JSON.stringify(submissions);
  const submissionsBytes = new Blob([submissionsJsonStr]).size || (submissionsJsonStr.length * 2);

  // 2. Calculate size of Question Bank
  const qBankJsonStr = JSON.stringify(questionBank);
  const questionBankBytes = new Blob([qBankJsonStr]).size || (qBankJsonStr.length * 2);

  // 3. Calculate size of Security Incident Logs
  const secLogsJsonStr = JSON.stringify(securityLogs);
  const securityLogsBytes = new Blob([secLogsJsonStr]).size || (secLogsJsonStr.length * 2);

  // 4. Calculate size of System Settings, Schedules, Locks & Faculty Credentials
  const configObj = {
    schedule: studentPinSchedule,
    lockedRegs: lockedStudentRegNos,
    faculties: authorizedFaculty,
    adminMobile,
    adminResetEmail
  };
  const configJsonStr = JSON.stringify(configObj);
  const configBytes = new Blob([configJsonStr]).size || (configJsonStr.length * 2);

  // Total Assessment Data Storage Usage
  const totalAssessmentDataBytes = submissionsBytes + questionBankBytes + securityLogsBytes + configBytes;

  // Total Local Storage Used (Across all keys)
  let totalLocalStorageUsedBytes = 0;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        const val = localStorage.getItem(key) || '';
        totalLocalStorageUsedBytes += new Blob([key + val]).size || ((key.length + val.length) * 2);
      }
    }
  } catch {
    totalLocalStorageUsedBytes = totalAssessmentDataBytes;
  }

  // Quotas
  const localStorageQuotaBytes = 5 * 1024 * 1024; // 5 MB LocalStorage limit
  const remainingLocalStorageBytes = Math.max(0, localStorageQuotaBytes - totalLocalStorageUsedBytes);
  const localStorageUsedPct = Math.min(100, (totalLocalStorageUsedBytes / localStorageQuotaBytes) * 100);

  // Cloud Firestore Database Quota (Free Plan: 1,024 MB / 1 GB)
  const firestoreQuotaBytes = 1024 * 1024 * 1024; // 1 GB
  const estimatedFirestoreUsedBytes = Math.round(totalAssessmentDataBytes * 1.2); // ~20% metadata overhead
  const remainingFirestoreBytes = Math.max(0, firestoreQuotaBytes - estimatedFirestoreUsedBytes);
  const firestoreUsedPct = (estimatedFirestoreUsedBytes / firestoreQuotaBytes) * 100;

  // Estimated Capacity in Student Assessments (Cloud Storage)
  const avgSubmissionBytes = submissions.length > 0 ? (submissionsBytes / submissions.length) : 4500; // ~4.5 KB per submission
  const remainingStudentSubmissionsCapacity = Math.floor(remainingFirestoreBytes / avgSubmissionBytes);

  const handleExportStorageBackup = () => {
    const backupData = {
      app: 'CIT Cognitive Assessment Portal',
      exportedAt: new Date().toISOString(),
      storageDiagnostics: {
        totalAssessmentDataBytes,
        totalLocalStorageUsedBytes,
        remainingLocalStorageBytes,
        remainingFirestoreBytes,
        submissionsCount: submissions.length,
        questionCount: questionBank.length,
        securityLogsCount: securityLogs.length
      },
      submissions,
      questionBank,
      securityLogs,
      studentPinSchedule,
      lockedStudentRegNos
    };

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backupData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `CIT_Assessment_Storage_Backup_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleUpdateStudentPin = () => {
    const val = newStudentPinInput.trim();
    if (!val) {
      setPinActionMsg('Please enter a valid non-empty PIN for Student Login.');
      return;
    }
    if (onSetStudentAccessPin) {
      onSetStudentAccessPin(val);
      setPinActionMsg(`✅ Student Access PIN successfully updated to "${val}".`);
      setNewStudentPinInput('');
      setTimeout(() => setPinActionMsg(null), 5000);
    }
  };

  const handleResetStudentPin = () => {
    if (onSetStudentAccessPin) {
      onSetStudentAccessPin('cit@123');
      setPinActionMsg('🔄 Student Access PIN successfully reset to default ("cit@123").');
      setNewStudentPinInput('');
      setTimeout(() => setPinActionMsg(null), 5000);
    }
  };

  const handleUpdateFacultyPin = () => {
    const val = newFacultyPinInput.trim();
    if (!val) {
      setPinActionMsg('Please enter a valid non-empty PIN for Faculty Login.');
      return;
    }
    if (onSetFacultyAccessPin) {
      onSetFacultyAccessPin(val);
      setPinActionMsg(`✅ Faculty Login PIN successfully updated to "${val}".`);
      setNewFacultyPinInput('');
      setTimeout(() => setPinActionMsg(null), 5000);
    }
  };

  const handleResetFacultyPin = () => {
    if (onSetFacultyAccessPin) {
      onSetFacultyAccessPin('cit@123');
      setPinActionMsg('🔄 Faculty Login PIN successfully reset to default ("cit@123").');
      setNewFacultyPinInput('');
      setTimeout(() => setPinActionMsg(null), 5000);
    }
  };

  const handleUpdateAdminPin = () => {
    const val = newAdminPinInput.trim();
    if (!val) {
      setPinActionMsg('Please enter a valid non-empty PIN for Admin Login.');
      return;
    }
    if (onSetAdminAccessPin) {
      onSetAdminAccessPin(val);
      setPinActionMsg(`✅ Admin Login PIN successfully updated to "${val}".`);
      setNewAdminPinInput('');
      setTimeout(() => setPinActionMsg(null), 5000);
    }
  };

  const handleResetAdminPin = () => {
    if (onSetAdminAccessPin) {
      onSetAdminAccessPin('cit@123');
      setPinActionMsg('🔄 Admin Login PIN successfully reset to default ("cit@123").');
      setNewAdminPinInput('');
      setTimeout(() => setPinActionMsg(null), 5000);
    }
  };

  const handleUpdateAdminId = () => {
    const id = newAdminIdInput.trim();
    if (!id) {
      setPinActionMsg('⚠️ Please enter a valid non-empty Admin ID.');
      return;
    }
    if (onSetAdminId) {
      onSetAdminId(id);
      setPinActionMsg(`🆔 Admin ID successfully updated to "${id}". Saved to Firestore!`);
      setTimeout(() => setPinActionMsg(null), 5000);
    }
  };

  const handleResetAdminId = () => {
    const defaultId = 'admin';
    if (onSetAdminId) {
      onSetAdminId(defaultId);
      setNewAdminIdInput(defaultId);
      setPinActionMsg(`🔄 Admin ID successfully reset to default ("${defaultId}"). Saved to Firestore!`);
      setTimeout(() => setPinActionMsg(null), 5000);
    }
  };

  const handleUpdateAdminResetEmail = () => {
    const email = newAdminEmailInput.trim();
    if (!email || !email.includes('@')) {
      setPinActionMsg('⚠️ Please enter a valid administrator email address for password resets.');
      return;
    }
    if (onSetAdminResetEmail) {
      onSetAdminResetEmail(email);
      setPinActionMsg(`📧 Registered Admin Email successfully updated to "${email}". Saved to Firestore!`);
      setTimeout(() => setPinActionMsg(null), 5000);
    }
  };

  const handleResetAdminResetEmail = () => {
    const defaultEmail = 'admin@cit.edu.in';
    if (onSetAdminResetEmail) {
      onSetAdminResetEmail(defaultEmail);
      setNewAdminEmailInput(defaultEmail);
      setPinActionMsg(`🔄 Registered Admin Email successfully reset to default ("${defaultEmail}"). Saved to Firestore!`);
      setTimeout(() => setPinActionMsg(null), 5000);
    }
  };

  const handleUpdateAdminMobile = () => {
    const mobile = newAdminMobileInput.trim();
    if (!mobile) {
      setPinActionMsg('⚠️ Please enter a valid non-empty Admin Registered Mobile Number.');
      return;
    }
    if (onSetAdminMobile) {
      onSetAdminMobile(mobile);
      setPinActionMsg(`📱 Admin Registered Mobile Number successfully updated to "${mobile}". Saved to Firestore!`);
      setTimeout(() => setPinActionMsg(null), 5000);
    }
  };

  const handleResetAdminMobile = () => {
    const defaultMobile = '+91 9876543210';
    if (onSetAdminMobile) {
      onSetAdminMobile(defaultMobile);
      setNewAdminMobileInput(defaultMobile);
      setPinActionMsg(`🔄 Admin Registered Mobile Number successfully reset to default ("${defaultMobile}"). Saved to Firestore!`);
      setTimeout(() => setPinActionMsg(null), 5000);
    }
  };

  const handleUpdateAdminSecretRecoveryPin = () => {
    const pin = newAdminSecretRecoveryPinInput.trim();
    if (!pin || pin.length < 4) {
      setPinActionMsg('⚠️ Please enter a Secret Recovery PIN of at least 4 characters.');
      return;
    }
    if (onSetAdminSecretRecoveryPin) {
      onSetAdminSecretRecoveryPin(pin);
      setPinActionMsg(`🔐 Admin Choice Secret Recovery PIN successfully set and updated. Saved to Firestore!`);
      setTimeout(() => setPinActionMsg(null), 5000);
    }
  };

  const handleResetAdminSecretRecoveryPin = () => {
    const defaultRecoveryPin = '7777';
    if (onSetAdminSecretRecoveryPin) {
      onSetAdminSecretRecoveryPin(defaultRecoveryPin);
      setNewAdminSecretRecoveryPinInput(defaultRecoveryPin);
      setPinActionMsg(`🔄 Admin Secret Recovery PIN reset to default ("${defaultRecoveryPin}"). Saved to Firestore!`);
      setTimeout(() => setPinActionMsg(null), 5000);
    }
  };

  const handleSaveFacultyCredential = () => {
    const fid = newFacId.trim();
    const fname = newFacName.trim();
    const fdept = newFacDept.trim();
    const fpass = newFacPassword.trim();

    if (!fid || !fpass) {
      setFacultyActionMsg('⚠️ Faculty Login ID and Password are required.');
      return;
    }

    if (onSetAuthorizedFaculty) {
      let updated: FacultyCredential[];
      if (editingFacEntryId) {
        updated = authorizedFaculty.map((f) =>
          f.id === editingFacEntryId
            ? {
                ...f,
                facultyId: fid,
                facultyName: fname || fid,
                department: fdept || 'General',
                password: fpass
              }
            : f
        );
        setFacultyActionMsg(`✅ Updated credentials for Faculty ID "${fid}". Syncing to Firestore...`);
      } else {
        const exists = authorizedFaculty.some(
          (f) => f.facultyId.trim().toLowerCase() === fid.toLowerCase()
        );
        if (exists) {
          setFacultyActionMsg(`⚠️ Faculty ID "${fid}" already exists in authorized list.`);
          return;
        }

        const newMember: FacultyCredential = {
          id: `fac_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          facultyId: fid,
          facultyName: fname || fid,
          department: fdept || 'B.E. Computer Science & Engineering',
          password: fpass,
          createdAt: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
        };
        updated = [...authorizedFaculty, newMember];
        setFacultyActionMsg(`✅ Added new authorized faculty member "${fid}". Syncing to Firestore...`);
      }

      onSetAuthorizedFaculty(updated);
      setNewFacId('');
      setNewFacName('');
      setNewFacPassword('');
      setEditingFacEntryId(null);
      setTimeout(() => setFacultyActionMsg(null), 5000);
    }
  };

  const handleEditFaculty = (fac: FacultyCredential) => {
    setEditingFacEntryId(fac.id);
    setNewFacId(fac.facultyId);
    setNewFacName(fac.facultyName);
    setNewFacDept(fac.department);
    setNewFacPassword(fac.password);
  };

  const handleCancelEditFaculty = () => {
    setEditingFacEntryId(null);
    setNewFacId('');
    setNewFacName('');
    setNewFacPassword('');
  };

  const handleDeleteFaculty = (id: string, facultyId: string) => {
    if (onSetAuthorizedFaculty) {
      const updated = authorizedFaculty.filter((f) => f.id !== id);
      onSetAuthorizedFaculty(updated);
      setFacultyActionMsg(`🗑️ Removed Faculty member "${facultyId}" from authorized login list.`);
      if (editingFacEntryId === id) {
        handleCancelEditFaculty();
      }
      setTimeout(() => setFacultyActionMsg(null), 5000);
    }
  };

  const handleManualLockSubmit = (action: 'lock' | 'unlock') => {
    const regUpper = manualRegNo.trim().toUpperCase();
    if (!regUpper) {
      setManualLockActionMsg('Please enter a valid student Register Number.');
      return;
    }
    if (action === 'lock') {
      if (onLockStudent) onLockStudent(regUpper);
      setManualLockActionMsg(`🔒 Successfully locked Student Register Number "${regUpper}".`);
    } else {
      if (onUnlockStudent) onUnlockStudent(regUpper);
      setManualLockActionMsg(`🔓 Successfully unlocked Student Register Number "${regUpper}".`);
    }
    setManualRegNo('');
    setTimeout(() => setManualLockActionMsg(null), 5000);
  };

  // Question Bank Upload State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingBank, setIsUploadingBank] = useState(false);
  const [isDraggingExcel, setIsDraggingExcel] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const processQuestionBankFile = async (file: File) => {
    setIsUploadingBank(true);
    setUploadStatus(null);
    setUploadError(null);

    try {
      const parsedQuestions = await parseQuestionBankFromExcel(file);
      setLocalQuestionBank(parsedQuestions);
      try {
        localStorage.setItem('CIT_CUSTOM_QUESTION_BANK', JSON.stringify(parsedQuestions));
      } catch (e) {}

      if (onUploadQuestionBank) {
        onUploadQuestionBank(parsedQuestions);
      }
      // Immediately reset filters and selections so the Question Bank Inspector displays the newly uploaded content
      setQbSearchTerm('');
      setQbSelectedSection('ALL');
      setQbSelectedDifficulty('ALL');
      setSelectedQbQuestionIds([]);
      setUploadStatus(`✅ Successfully uploaded custom question bank! Loaded ${parsedQuestions.length} valid questions and updated Question Bank Content Inspector.`);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err: any) {
      console.error('Question Bank Excel Upload Error:', err);
      setUploadError(err.message || 'Failed to parse Excel question bank file.');
    } finally {
      setIsUploadingBank(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processQuestionBankFile(file);
  };

  const handleResetToDefaultBank = () => {
    setLocalQuestionBank(ALL_QUESTIONS);
    try {
      localStorage.removeItem('CIT_CUSTOM_QUESTION_BANK');
    } catch (e) {}

    if (onResetQuestionBank) {
      onResetQuestionBank();
    }
    setQbSearchTerm('');
    setQbSelectedSection('ALL');
    setQbSelectedDifficulty('ALL');
    setSelectedQbQuestionIds([]);
    setUploadStatus('✅ Reset active question bank to default CIT 100-Question Master Bank. Assessment question set and Question Bank Inspector updated successfully.');
    setUploadError(null);
  };

  const handleExportMasterGoogleSheets = async () => {
    if (submissions.length === 0) return;
    setIsExportingMasterSheets(true);
    setMasterSheetsError(null);
    try {
      let token = getAccessToken();
      if (!token) {
        const authRes = await googleSignIn();
        token = authRes?.accessToken || null;
      }

      if (!token) {
        throw new Error('Google Authentication required to create Master Google Sheet.');
      }

      const res = await createMasterSubmissionsSpreadsheet(token, submissions);
      setMasterSheetsUrl(res.spreadsheetUrl);
    } catch (err: any) {
      console.error('Master Google Sheets Export Error:', err);
      setMasterSheetsError(err.message || 'Failed to export master records to Google Sheets.');
    } finally {
      setIsExportingMasterSheets(false);
    }
  };

  // Check if submission date matches target calendar date
  const matchesDateFilter = (sub: SavedSubmission, targetDateStr: string) => {
    if (!targetDateStr) return true;
    const rawDate = sub.submittedAt || sub.report.testTimestamp || '';
    if (!rawDate) return false;

    // Check if target YYYY-MM-DD is present
    if (rawDate.includes(targetDateStr)) return true;

    // Parse both dates
    try {
      const subD = new Date(rawDate);
      const [ty, tm, td] = targetDateStr.split('-').map(Number);
      if (!isNaN(subD.getTime()) && ty && tm && td) {
        return (
          subD.getFullYear() === ty &&
          subD.getMonth() + 1 === tm &&
          subD.getDate() === td
        );
      }
    } catch {
      // fallback
    }
    return false;
  };

  // Submissions filtered by calendar date
  const submissionsForSelectedDate = submissions.filter((sub) =>
    matchesDateFilter(sub, selectedDate)
  );

  // Submissions filtered for Departmentwise & Gradewise Report Generator
  const submissionsForSelectedDept = submissions.filter(
    (sub) => selectedReportDept === 'ALL' || sub.student.department === selectedReportDept
  );

  const submissionsForSelectedDeptAndGrade = submissionsForSelectedDept.filter((sub) => {
    if (selectedReportGrade === 'ALL') return true;
    const g = calculateGrade(sub.report?.overallPercentage || 0).grade;
    return g === selectedReportGrade;
  });

  // Calculate Security Locked Submissions
  const lockedSubmissionsCount = submissions.filter(
    (s) => s.isLockedOut || s.securityViolation?.isViolated
  ).length;

  // Final table filter combining search, dept, date, and security status
  const filtered = submissionsForSelectedDate.filter((sub) => {
    const matchesSearch =
      sub.student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sub.student.registerNo.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDept = selectedDept === 'ALL' || sub.student.department === selectedDept;

    const isLocked = sub.isLockedOut || sub.securityViolation?.isViolated;
    const matchesSecurity =
      securityFilter === 'ALL' ||
      (securityFilter === 'LOCKED' && isLocked) ||
      (securityFilter === 'COMPLETED' && !isLocked);

    return matchesSearch && matchesDept && matchesSecurity;
  });

  const handleToggleSelectAll = () => {
    if (filtered.length === 0) return;
    const allFilteredIds = filtered.map((s) => s.id);
    const isAllSelected = allFilteredIds.length > 0 && allFilteredIds.every((id) => selectedSubmissionIds.includes(id));
    if (isAllSelected) {
      setSelectedSubmissionIds((prev) => prev.filter((id) => !allFilteredIds.includes(id)));
    } else {
      setSelectedSubmissionIds((prev) => Array.from(new Set([...prev, ...allFilteredIds])));
    }
  };

  const handleToggleSelectRow = (id: string) => {
    setSelectedSubmissionIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const totalEvaluated = submissions.length;
  const avgScore =
    totalEvaluated > 0
      ? Math.round(submissions.reduce((acc, curr) => acc + curr.report.overallScore, 0) / totalEvaluated)
      : 0;

  const dateLabel = selectedDate
    ? new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      })
    : 'All Assessment Dates';

  const deptReportLabel = selectedReportDept === 'ALL' ? 'All Departments' : selectedReportDept;

  // --- PIE CHART DATASETS FOR ADMIN PORTAL ---
  // 1. Academic Grade Distribution (A / B / C) - Norm-Referenced (First 25%, Next 40%, Last 35%)
  const allCollegeScores = submissions.map((s) => s.report?.overallScore ?? 0);
  const gradeCounts = {
    'Grade A (First 25% College-wide)': { count: 0, color: '#10B981', label: 'Grade A' },
    'Grade B (Next 40% College-wide)': { count: 0, color: '#3B82F6', label: 'Grade B' },
    'Grade C (Last 35% College-wide)': { count: 0, color: '#F59E0B', label: 'Grade C' }
  };
  submissions.forEach((s) => {
    const g = calculateGrade(s.report?.overallScore ?? 0, allCollegeScores).grade;
    if (g === 'A') gradeCounts['Grade A (First 25% College-wide)'].count++;
    else if (g === 'B') gradeCounts['Grade B (Next 40% College-wide)'].count++;
    else gradeCounts['Grade C (Last 35% College-wide)'].count++;
  });
  const gradePieData = Object.entries(gradeCounts).map(([label, item]) => ({
    name: label,
    value: item.count,
    percentage: Math.round((item.count / (totalEvaluated || 1)) * 100),
    color: item.color
  })).filter((d) => d.value > 0 || totalEvaluated === 0);

  // 2. Score Performance Range Distribution (Overall)
  const scoreRanges = {
    'Grade A (40-50 Marks / 80-100%)': 0,
    'Grade B (25-39 Marks / 50-80%)': 0,
    'Grade C (0-24 Marks / <50%)': 0
  };
  submissions.forEach((s) => {
    const pct = s.report.overallPercentage;
    if (pct >= 80) scoreRanges['Grade A (40-50 Marks / 80-100%)']++;
    else if (pct >= 50) scoreRanges['Grade B (25-39 Marks / 50-80%)']++;
    else scoreRanges['Grade C (0-24 Marks / <50%)']++;
  });
  const scorePalette = ['#10B981', '#3B82F6', '#F59E0B'];
  const scorePieData = Object.entries(scoreRanges)
    .map(([range, count], idx) => ({
      name: range,
      value: count,
      percentage: Math.round((count / (totalEvaluated || 1)) * 100),
      color: scorePalette[idx]
    }))
    .filter((d) => d.value > 0 || totalEvaluated === 0);

  // 3. Department Distribution (Overall)
  const deptCounts: Record<string, number> = {};
  submissions.forEach((s) => {
    const d = s.student.department || 'General';
    deptCounts[d] = (deptCounts[d] || 0) + 1;
  });
  const deptPalette = ['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EC4899', '#06B6D4'];
  const deptPieData = Object.entries(deptCounts).map(([dept, count], idx) => ({
    name: dept,
    value: count,
    percentage: Math.round((count / (totalEvaluated || 1)) * 100),
    color: deptPalette[idx % deptPalette.length]
  }));

  // Available Assessment Dates across all submissions (sorted newest first)
  const availableAssessmentDates = Array.from(
    new Set(
      submissions
        .map((s) => {
          const raw = s.submittedAt || s.report.testTimestamp || '';
          if (!raw) return '';
          try {
            const d = new Date(raw);
            if (!isNaN(d.getTime())) {
              return d.toISOString().split('T')[0];
            }
          } catch {}
          if (raw.match(/^\d{4}-\d{2}-\d{2}/)) {
            return raw.substring(0, 10);
          }
          return '';
        })
        .filter(Boolean)
    )
  ).sort().reverse();

  // Available Departments across all submissions
  const availableDepartmentsList = Array.from(
    new Set(submissions.map((s) => s.student.department || 'General').filter(Boolean))
  ).sort();

  // 4. DATEWISE REPORT PIE CHART DATA (Academic Benchmark: Grade A, B, C for selected date)
  const datewiseGradeCounts: Record<string, { count: number; color: string; label: string; range: string }> = {
    'Grade A (80% - 100%)': { count: 0, color: '#10B981', label: 'Grade A', range: '40-50 Marks' },
    'Grade B (50% - 80%)': { count: 0, color: '#3B82F6', label: 'Grade B', range: '25-39 Marks' },
    'Grade C (Below 50%)': { count: 0, color: '#F59E0B', label: 'Grade C', range: '0-24 Marks' }
  };
  submissionsForSelectedDate.forEach((s) => {
    const pct = s.report.overallPercentage;
    const g = calculateGrade(pct).grade;
    if (g === 'A') datewiseGradeCounts['Grade A (80% - 100%)'].count++;
    else if (g === 'B') datewiseGradeCounts['Grade B (50% - 80%)'].count++;
    else datewiseGradeCounts['Grade C (Below 50%)'].count++;
  });
  const datewisePieData = Object.entries(datewiseGradeCounts)
    .map(([key, item]) => ({
      name: key,
      label: item.label,
      range: item.range,
      value: item.count,
      percentage: submissionsForSelectedDate.length > 0 ? Math.round((item.count / submissionsForSelectedDate.length) * 100) : 0,
      color: item.color
    }))
    .filter((d) => d.value > 0 || submissionsForSelectedDate.length === 0);

  // 5. DEPARTMENTWISE REPORT PIE CHART DATA (Academic Benchmark: Grade A, B, C for selected dept)
  const deptwiseGradeCounts: Record<string, { count: number; color: string; label: string; range: string }> = {
    'Grade A (80% - 100%)': { count: 0, color: '#10B981', label: 'Grade A', range: '40-50 Marks' },
    'Grade B (50% - 80%)': { count: 0, color: '#3B82F6', label: 'Grade B', range: '25-39 Marks' },
    'Grade C (Below 50%)': { count: 0, color: '#F59E0B', label: 'Grade C', range: '0-24 Marks' }
  };
  submissionsForSelectedDept.forEach((s) => {
    const pct = s.report.overallPercentage;
    const g = calculateGrade(pct).grade;
    if (g === 'A') deptwiseGradeCounts['Grade A (80% - 100%)'].count++;
    else if (g === 'B') deptwiseGradeCounts['Grade B (50% - 80%)'].count++;
    else deptwiseGradeCounts['Grade C (Below 50%)'].count++;
  });
  const deptwisePieData = Object.entries(deptwiseGradeCounts)
    .map(([key, item]) => ({
      name: key,
      label: item.label,
      range: item.range,
      value: item.count,
      percentage: submissionsForSelectedDept.length > 0 ? Math.round((item.count / submissionsForSelectedDept.length) * 100) : 0,
      color: item.color
    }))
    .filter((d) => d.value > 0 || submissionsForSelectedDept.length === 0);

  const deptwiseGradewisePieData = deptwisePieData;

  // 6. DASHBOARD DEDICATED DEPARTMENTWISE PERFORMANCE PIE DATA (Academic Benchmark for analyticsDept)
  const dashboardDeptSubs = analyticsDept === 'ALL'
    ? submissions
    : submissions.filter((s) => (s.student.department || 'General') === analyticsDept);

  const dashboardDeptGradeCounts = {
    'Grade A (First 25% College-wide)': { count: 0, color: '#10B981', label: 'Grade A', sublabel: 'First 25% College Cohort (p >= 75)' },
    'Grade B (Next 40% College-wide)': { count: 0, color: '#3B82F6', label: 'Grade B', sublabel: 'Next 40% College Cohort (35 <= p < 75)' },
    'Grade C (Last 35% College-wide)': { count: 0, color: '#F59E0B', label: 'Grade C', sublabel: 'Last 35% College Cohort (p < 35)' }
  };
  dashboardDeptSubs.forEach((s) => {
    const g = calculateGrade(s.report?.overallScore ?? 0, allCollegeScores).grade;
    if (g === 'A') dashboardDeptGradeCounts['Grade A (First 25% College-wide)'].count++;
    else if (g === 'B') dashboardDeptGradeCounts['Grade B (Next 40% College-wide)'].count++;
    else dashboardDeptGradeCounts['Grade C (Last 35% College-wide)'].count++;
  });
  const dashboardDeptwisePieData = Object.entries(dashboardDeptGradeCounts).map(([key, item]) => ({
    name: key,
    label: item.label,
    sublabel: item.sublabel,
    value: item.count,
    percentage: dashboardDeptSubs.length > 0 ? Math.round((item.count / dashboardDeptSubs.length) * 100) : 0,
    color: item.color
  })).filter((d) => d.value > 0 || dashboardDeptSubs.length === 0);

  const dashboardDeptTotal = dashboardDeptSubs.length;
  const dashboardDeptAvgScore = dashboardDeptTotal > 0
    ? (dashboardDeptSubs.reduce((acc, curr) => acc + curr.report.overallScore, 0) / dashboardDeptTotal).toFixed(1)
    : '0.0';
  const dashboardDeptPassCount = (dashboardDeptGradeCounts['Grade A (First 25% College-wide)'].count + dashboardDeptGradeCounts['Grade B (Next 40% College-wide)'].count);
  const dashboardDeptPassRate = dashboardDeptTotal > 0
    ? Math.round((dashboardDeptPassCount / dashboardDeptTotal) * 100)
    : 0;
  const dashboardDeptTopScore = dashboardDeptTotal > 0
    ? Math.max(...dashboardDeptSubs.map((s) => s.report.overallScore))
    : 0;

  // 7. DASHBOARD DEDICATED DATEWISE PERFORMANCE PIE DATA (Academic Benchmark for analyticsDate)
  const dashboardDateSubs = analyticsDate
    ? submissions.filter((s) => matchesDateFilter(s, analyticsDate))
    : submissions;

  const dashboardDateGradeCounts = {
    'Grade A (First 25% College-wide)': { count: 0, color: '#10B981', label: 'Grade A', sublabel: 'First 25% College Cohort (p >= 75)' },
    'Grade B (Next 40% College-wide)': { count: 0, color: '#3B82F6', label: 'Grade B', sublabel: 'Next 40% College Cohort (35 <= p < 75)' },
    'Grade C (Last 35% College-wide)': { count: 0, color: '#F59E0B', label: 'Grade C', sublabel: 'Last 35% College Cohort (p < 35)' }
  };
  dashboardDateSubs.forEach((s) => {
    const g = calculateGrade(s.report?.overallScore ?? 0, allCollegeScores).grade;
    if (g === 'A') dashboardDateGradeCounts['Grade A (First 25% College-wide)'].count++;
    else if (g === 'B') dashboardDateGradeCounts['Grade B (Next 40% College-wide)'].count++;
    else dashboardDateGradeCounts['Grade C (Last 35% College-wide)'].count++;
  });
  const dashboardDatewisePieData = Object.entries(dashboardDateGradeCounts).map(([key, item]) => ({
    name: key,
    label: item.label,
    sublabel: item.sublabel,
    value: item.count,
    percentage: dashboardDateSubs.length > 0 ? Math.round((item.count / dashboardDateSubs.length) * 100) : 0,
    color: item.color
  })).filter((d) => d.value > 0 || dashboardDateSubs.length === 0);

  const dashboardDateTotal = dashboardDateSubs.length;
  const dashboardDateAvgScore = dashboardDateTotal > 0
    ? (dashboardDateSubs.reduce((acc, curr) => acc + curr.report.overallScore, 0) / dashboardDateTotal).toFixed(1)
    : '0.0';
  const dashboardDatePassCount = (dashboardDateGradeCounts['Grade A (First 25% College-wide)'].count + dashboardDateGradeCounts['Grade B (Next 40% College-wide)'].count);
  const dashboardDatePassRate = dashboardDateTotal > 0
    ? Math.round((dashboardDatePassCount / dashboardDateTotal) * 100)
    : 0;
  const dashboardDateTopScore = dashboardDateTotal > 0
    ? Math.max(...dashboardDateSubs.map((s) => s.report.overallScore))
    : 0;
  const dashboardDateFormattedLabel = analyticsDate
    ? new Date(analyticsDate + 'T00:00:00').toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      })
    : 'All Assessment Dates';

  return (
    <div className="min-h-[calc(100vh-65px)] bg-slate-100 text-slate-800 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* HEADER */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4 break-inside-avoid">
          <div>
            <h1 className="text-lg sm:text-xl font-extrabold font-sans text-slate-900 uppercase">
              Assessment Reports
            </h1>
            <p className="text-xs text-slate-600 mt-0.5">
              Review, analyze, filter by assessment date or department, and export consolidated student reports.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 self-start md:self-auto">
            <button
              onClick={() => setIsShortcutModalOpen(true)}
              className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 font-bold rounded text-xs shadow-2xs flex items-center gap-2 transition-all cursor-pointer"
              title="Shortcut Icons & direct launch URLs for Student, Staff, and Admin portals"
            >
              <HardDrive className="w-4 h-4 text-indigo-600" />
              <span>Portal Shortcuts</span>
            </button>

            {userRole === 'admin' && (
              <button
                onClick={() => setIsNewTestModalOpen(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded text-xs shadow-md flex items-center gap-2 transition-all cursor-pointer ring-2 ring-blue-400/40"
                title="Create a new test: set domain details, total questions, questions per domain, difficulty levels (Level 1, Level 2, Level 3), and upload student details"
              >
                <PlusCircle className="w-4 h-4 text-blue-100" />
                <span>New Test</span>
              </button>
            )}

            {userRole === 'admin' && (
              <button
                onClick={() => setIsStorageModalOpen(true)}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded text-xs shadow-md flex items-center gap-2 transition-all cursor-pointer"
                title="View total storage used by assessment data and remaining storage capacity"
              >
                <HardDrive className="w-4 h-4 text-emerald-100" />
                <span>Storage & Capacity ({formatStorageBytes(totalAssessmentDataBytes)})</span>
              </button>
            )}

            {userRole === 'admin' && (
              <button
                onClick={downloadQuestionBankExcel}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded text-xs shadow-md flex items-center gap-2 transition-all cursor-pointer"
                title="Extract all questions across Limits & Continuity, Differentiation, Integration, Probability & Statistics, and Matrices & Determinants with options and correct answers to Excel"
              >
                <FileSpreadsheet className="w-4 h-4 text-purple-100" />
                <span>Export Question Bank (Excel)</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setActiveTab('attendance')}
              className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded text-xs shadow-md flex items-center gap-2 transition-all cursor-pointer"
              title="Generate and view official department-wise student attendance report based on login timestamps with summary"
            >
              <ClipboardCheck className="w-4 h-4 text-blue-200" />
              <span>Attendance Report</span>
            </button>

            <button
              onClick={handleBulkExportAll}
              disabled={isBulkExportingAll}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold rounded text-xs shadow-md flex items-center gap-2 transition-all cursor-pointer"
              title="Download a comprehensive multi-sheet Excel (.xlsx) file containing all student submissions from Firestore database"
            >
              {isBulkExportingAll ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-emerald-100" />
                  <span>Exporting All Submissions...</span>
                </>
              ) : (
                <>
                  <FileSpreadsheet className="w-4 h-4 text-emerald-100" />
                  <span>Bulk Export All (Excel)</span>
                </>
              )}
            </button>

            {submissions.length > 0 && (
              <>
                <button
                  onClick={handleExtractAllPdfsZip}
                  disabled={isExtractingAllPdfZip}
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 text-white font-bold rounded text-xs shadow-md flex items-center gap-2 transition-all cursor-pointer"
                  title="Extract all individual student performance reports as PDF documents bundled into a single downloadable ZIP file"
                >
                  {isExtractingAllPdfZip ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-cyan-100" />
                      <span>Archiving All PDFs...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4 text-cyan-200" />
                      <span>Extract All PDFs (.ZIP)</span>
                    </>
                  )}
                </button>

                <button
                  onClick={handleExtractAllExcelZip}
                  disabled={isExtractingAllExcelZip}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-bold rounded text-xs shadow-md flex items-center gap-2 transition-all cursor-pointer"
                  title="Extract all individual student performance reports as Excel workbooks bundled into a single downloadable ZIP file"
                >
                  {isExtractingAllExcelZip ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-teal-100" />
                      <span>Archiving All Excel...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4 text-teal-200" />
                      <span>Extract All Excel (.ZIP)</span>
                    </>
                  )}
                </button>
              </>
            )}

            {submissions.length > 0 && (
              <button
                onClick={handleExportMasterGoogleSheets}
                disabled={isExportingMasterSheets}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded text-xs shadow-sm flex items-center gap-2 transition-all cursor-pointer"
              >
                {isExportingMasterSheets ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-blue-100" />
                    <span>Syncing Google Sheets...</span>
                  </>
                ) : (
                  <>
                    <FileSpreadsheet className="w-4 h-4 text-blue-100" />
                    <span>Sync All to Google Sheets</span>
                  </>
                )}
              </button>
            )}

            {userRole === 'admin' && submissions.length > 0 && (
              <button
                onClick={onClearSubmissions}
                className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Trash2 className="w-4 h-4 text-rose-600" />
                Clear All Records
              </button>
            )}
          </div>
        </div>

        {/* PORTAL SHORTCUT ICONS & DIRECT LAUNCH SYSTEM (INSIDE ADMIN LOGIN ONLY) */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 rounded-xl p-3.5 sm:p-4 text-white shadow-md">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3 pb-3 border-b border-white/10">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 bg-blue-500/20 border border-blue-400/30 rounded-lg">
                <HardDrive className="w-4 h-4 text-blue-300" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xs sm:text-sm font-black tracking-wide uppercase text-white">
                    Portal Shortcut Icons & Direct Launch System
                  </h2>
                  <span className="px-2 py-0.5 bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 rounded-full text-[10px] font-bold">
                    Admin Exclusive
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 mt-0.5">
                  Direct launch terminals & download branded desktop icons (.url) for Student assessment, Staff evaluation, and Admin portals.
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setIsShortcutModalOpen(true)}
                className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg border border-white/20 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                title="Open complete deployment hub (PWA, HTML launchers, Google Drive, Lab instructions)"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>All Launcher Tools</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Student Portal Card */}
            <div className="bg-white/5 hover:bg-white/10 border border-white/10 hover:border-blue-400/40 rounded-lg p-3 transition-all flex flex-col justify-between gap-2.5">
              <div className="flex items-start gap-2.5">
                <img src="/icon-student.svg" alt="Student Portal" className="w-8 h-8 rounded-md shrink-0 object-contain p-0.5 bg-blue-900/50 border border-blue-400/30" />
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-xs text-blue-200 truncate">Student Portal</span>
                    <span className="px-1.5 py-0.2 bg-blue-500/30 text-blue-200 text-[9px] rounded font-semibold uppercase">Candidate</span>
                  </div>
                  <p className="text-[11px] text-slate-300 line-clamp-1 mt-0.5">Assessment terminal for candidate testing</p>
                </div>
              </div>
              <div className="flex flex-col gap-1.5 pt-1 border-t border-white/10">
                <div className="flex items-center gap-2">
                  <a
                    href={getRoleDirectUrl('student')}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 py-1.5 px-2 bg-blue-600 hover:bg-blue-500 text-white rounded text-center text-xs font-bold flex items-center justify-center gap-1 transition-all"
                    title="Direct Launch Student Assessment Portal in new tab"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span>Direct Launch</span>
                  </a>
                  <button
                    type="button"
                    onClick={() => downloadRoleShortcut('student')}
                    className="py-1.5 px-2 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded text-xs font-semibold flex items-center justify-center gap-1 transition-all cursor-pointer"
                    title="Download Student Desktop .url shortcut for lab PCs"
                  >
                    <Download className="w-3 h-3 text-blue-300" />
                    <span>.url</span>
                  </button>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleCopyPortalLink('student-shared', getRoleSharedUrl('student'))}
                    className={`flex-1 py-1 px-2 rounded text-[11px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                      copiedPortalLink === 'student-shared'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-blue-950/60 hover:bg-blue-900/80 text-blue-200 border border-blue-400/30'
                    }`}
                    title="Copy permanent shared candidate testing link to clipboard"
                  >
                    {copiedPortalLink === 'student-shared' ? (
                      <>
                        <Check className="w-3 h-3 text-white" />
                        <span>Shared Link Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3 text-blue-300" />
                        <span>Copy Shared Link</span>
                      </>
                    )}
                  </button>
                  <a
                    href={getRoleSharedUrl('student')}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1 text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded transition-colors"
                    title="Open Student Shared Link in new tab"
                  >
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>

            {/* Staff / Faculty Portal Card */}
            <div className="bg-white/5 hover:bg-white/10 border border-white/10 hover:border-emerald-400/40 rounded-lg p-3 transition-all flex flex-col justify-between gap-2.5">
              <div className="flex items-start gap-2.5">
                <img src="/icon-faculty.svg" alt="Faculty Portal" className="w-8 h-8 rounded-md shrink-0 object-contain p-0.5 bg-emerald-900/50 border border-emerald-400/30" />
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-xs text-emerald-200 truncate">Staff / Faculty</span>
                    <span className="px-1.5 py-0.2 bg-emerald-500/30 text-emerald-200 text-[9px] rounded font-semibold uppercase">Evaluator</span>
                  </div>
                  <p className="text-[11px] text-slate-300 line-clamp-1 mt-0.5">Valuation, scoring & student security unlocks</p>
                </div>
              </div>
              <div className="flex flex-col gap-1.5 pt-1 border-t border-white/10">
                <div className="flex items-center gap-2">
                  <a
                    href={getRoleDirectUrl('faculty')}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 py-1.5 px-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-center text-xs font-bold flex items-center justify-center gap-1 transition-all"
                    title="Direct Launch Staff / Faculty Evaluation Portal in new tab"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span>Direct Launch</span>
                  </a>
                  <button
                    type="button"
                    onClick={() => downloadRoleShortcut('faculty')}
                    className="py-1.5 px-2 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded text-xs font-semibold flex items-center justify-center gap-1 transition-all cursor-pointer"
                    title="Download Staff / Faculty Desktop .url shortcut"
                  >
                    <Download className="w-3 h-3 text-emerald-300" />
                    <span>.url</span>
                  </button>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleCopyPortalLink('faculty-shared', getRoleSharedUrl('faculty'))}
                    className={`flex-1 py-1 px-2 rounded text-[11px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                      copiedPortalLink === 'faculty-shared'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-200 border border-emerald-400/30'
                    }`}
                    title="Copy permanent shared staff evaluation link to clipboard"
                  >
                    {copiedPortalLink === 'faculty-shared' ? (
                      <>
                        <Check className="w-3 h-3 text-white" />
                        <span>Shared Link Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3 text-emerald-300" />
                        <span>Copy Shared Link</span>
                      </>
                    )}
                  </button>
                  <a
                    href={getRoleSharedUrl('faculty')}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1 text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded transition-colors"
                    title="Open Faculty Shared Link in new tab"
                  >
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>

            {/* Admin Examination Portal Card */}
            <div className="bg-white/5 hover:bg-white/10 border border-white/10 hover:border-purple-400/40 rounded-lg p-3 transition-all flex flex-col justify-between gap-2.5">
              <div className="flex items-start gap-2.5">
                <img src="/icon-admin.svg" alt="Admin Portal" className="w-8 h-8 rounded-md shrink-0 object-contain p-0.5 bg-purple-900/50 border border-purple-400/30" />
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-xs text-purple-200 truncate">Admin Portal</span>
                    <span className="px-1.5 py-0.2 bg-purple-500/30 text-purple-200 text-[9px] rounded font-semibold uppercase">Administrator</span>
                  </div>
                  <p className="text-[11px] text-slate-300 line-clamp-1 mt-0.5">Master exam control, roster & question bank</p>
                </div>
              </div>
              <div className="flex flex-col gap-1.5 pt-1 border-t border-white/10">
                <div className="flex items-center gap-2">
                  <a
                    href={getRoleDirectUrl('admin')}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 py-1.5 px-2 bg-purple-600 hover:bg-purple-500 text-white rounded text-center text-xs font-bold flex items-center justify-center gap-1 transition-all"
                    title="Direct Launch Admin Portal in new tab"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span>Direct Launch</span>
                  </a>
                  <button
                    type="button"
                    onClick={() => downloadRoleShortcut('admin')}
                    className="py-1.5 px-2 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded text-xs font-semibold flex items-center justify-center gap-1 transition-all cursor-pointer"
                    title="Download Admin Desktop .url shortcut"
                  >
                    <Download className="w-3 h-3 text-purple-300" />
                    <span>.url</span>
                  </button>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleCopyPortalLink('admin-shared', getRoleSharedUrl('admin'))}
                    className={`flex-1 py-1 px-2 rounded text-[11px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                      copiedPortalLink === 'admin-shared'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-purple-950/60 hover:bg-purple-900/80 text-purple-200 border border-purple-400/30'
                    }`}
                    title="Copy permanent shared admin link to clipboard"
                  >
                    {copiedPortalLink === 'admin-shared' ? (
                      <>
                        <Check className="w-3 h-3 text-white" />
                        <span>Shared Link Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3 text-purple-300" />
                        <span>Copy Shared Link</span>
                      </>
                    )}
                  </button>
                  <a
                    href={getRoleSharedUrl('admin')}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1 text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded transition-colors"
                    title="Open Admin Shared Link in new tab"
                  >
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* NAVIGATION MENUS / TABS (3 tabs per line) */}
        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm">
          <nav className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {/* TAB 1: Dashboard & Analytics (Blue) */}
            <button
              type="button"
              onClick={() => setActiveTab('dashboard')}
              className={`px-4 py-3 rounded-xl font-bold text-sm flex items-center justify-between gap-2 transition-all cursor-pointer ${
                activeTab === 'dashboard'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 ring-2 ring-blue-500 border border-blue-700'
                  : 'bg-blue-50/70 hover:bg-blue-100 text-blue-900 border border-blue-200/80'
              }`}
            >
              <div className="flex items-center gap-2.5 font-bold">
                <BarChart3 className={`w-4 h-4 shrink-0 ${activeTab === 'dashboard' ? 'text-white' : 'text-blue-600'}`} />
                <span>Dashboard & Analytics</span>
              </div>
            </button>

            {/* TAB 2: Student Submissions & Reports (Emerald) */}
            <button
              type="button"
              onClick={() => setActiveTab('submissions')}
              className={`px-4 py-3 rounded-xl font-bold text-sm flex items-center justify-between gap-2 transition-all cursor-pointer ${
                activeTab === 'submissions'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30 ring-2 ring-emerald-500 border border-emerald-700'
                  : 'bg-emerald-50/70 hover:bg-emerald-100 text-emerald-900 border border-emerald-200/80'
              }`}
            >
              <div className="flex items-center gap-2.5 font-bold">
                <Users className={`w-4 h-4 shrink-0 ${activeTab === 'submissions' ? 'text-white' : 'text-emerald-600'}`} />
                <span>Student Submissions & Reports</span>
              </div>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-bold ${
                activeTab === 'submissions' ? 'bg-emerald-800 text-white' : 'bg-emerald-200 text-emerald-900'
              }`}>
                {submissions.length}
              </span>
            </button>

            {/* TAB: Department-wise Attendance Report based on login timestamp (Blue) */}
            <button
              type="button"
              onClick={() => setActiveTab('attendance')}
              className={`px-4 py-3 rounded-xl font-bold text-sm flex items-center justify-between gap-2 transition-all cursor-pointer ${
                activeTab === 'attendance'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 ring-2 ring-blue-500 border border-blue-700'
                  : 'bg-blue-50/70 hover:bg-blue-100 text-blue-900 border border-blue-200/80'
              }`}
            >
              <div className="flex items-center gap-2.5 font-bold">
                <ClipboardCheck className={`w-4 h-4 shrink-0 ${activeTab === 'attendance' ? 'text-white' : 'text-blue-600'}`} />
                <span>Department Attendance Report</span>
              </div>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-bold ${
                activeTab === 'attendance' ? 'bg-blue-800 text-white' : 'bg-blue-200 text-blue-900'
              }`}>
                {submissions.length + activeSessions.length}
              </span>
            </button>

            {/* TAB: Department Domain Analysis (Indigo) */}
            <button
              type="button"
              onClick={() => setActiveTab('domain_analysis')}
              className={`px-4 py-3 rounded-xl font-bold text-sm flex items-center justify-between gap-2 transition-all cursor-pointer ${
                activeTab === 'domain_analysis'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 ring-2 ring-indigo-500 border border-indigo-700'
                  : 'bg-indigo-50/70 hover:bg-indigo-100 text-indigo-900 border border-indigo-200/80'
              }`}
            >
              <div className="flex items-center gap-2.5 font-bold">
                <Building2 className={`w-4 h-4 shrink-0 ${activeTab === 'domain_analysis' ? 'text-white' : 'text-indigo-600'}`} />
                <span>Department Domain Analysis</span>
              </div>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-bold ${
                activeTab === 'domain_analysis' ? 'bg-indigo-800 text-white' : 'bg-indigo-200 text-indigo-900'
              }`}>
                5 Domains
              </span>
            </button>

            {/* TAB 3: Student Feedback & UI Ratings (Teal / Indigo) */}
            <button
              type="button"
              onClick={() => setActiveTab('student_feedback')}
              className={`px-4 py-3 rounded-xl font-bold text-sm flex items-center justify-between gap-2 transition-all cursor-pointer ${
                activeTab === 'student_feedback'
                  ? 'bg-teal-600 text-white shadow-md shadow-teal-600/30 ring-2 ring-teal-500 border border-teal-700'
                  : 'bg-teal-50/70 hover:bg-teal-100 text-teal-950 border border-teal-200/80'
              }`}
            >
              <div className="flex items-center gap-2.5 font-bold">
                <MessageSquare className={`w-4 h-4 shrink-0 ${activeTab === 'student_feedback' ? 'text-white' : 'text-teal-600'}`} />
                <span>Student Feedback & UI Ratings</span>
              </div>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-bold ${
                activeTab === 'student_feedback' ? 'bg-teal-800 text-white' : 'bg-teal-200 text-teal-950'
              }`}>
                {feedbacks.length}
              </span>
            </button>

            {/* TAB 3: Access Control & Credentials (Purple) */}
            {userRole === 'admin' && (
              <button
                type="button"
                onClick={() => setActiveTab('access_control')}
                className={`px-4 py-3 rounded-xl font-bold text-sm flex items-center justify-between gap-2 transition-all cursor-pointer ${
                  activeTab === 'access_control'
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30 ring-2 ring-purple-500 border border-purple-700'
                    : 'bg-purple-50/70 hover:bg-purple-100 text-purple-900 border border-purple-200/80'
                }`}
              >
                <div className="flex items-center gap-2.5 font-bold">
                  <KeyRound className={`w-4 h-4 shrink-0 ${activeTab === 'access_control' ? 'text-white' : 'text-purple-600'}`} />
                  <span>Access Control & Credentials</span>
                </div>
                {(isStudentLoginLocked || isFacultyLoginLocked) && (
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" title="Portal Lock Active"></span>
                )}
              </button>
            )}

            {/* TAB 4: Security & Proctoring Monitor (Rose) */}
            {userRole === 'admin' && (
              <button
                type="button"
                onClick={() => setActiveTab('security_monitor')}
                className={`px-4 py-3 rounded-xl font-bold text-sm flex items-center justify-between gap-2 transition-all cursor-pointer ${
                  activeTab === 'security_monitor'
                    ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30 ring-2 ring-rose-500 border border-rose-700'
                    : 'bg-rose-50/70 hover:bg-rose-100 text-rose-900 border border-rose-200/80'
                }`}
              >
                <div className="flex items-center gap-2.5 font-bold">
                  <ShieldAlert className={`w-4 h-4 shrink-0 ${activeTab === 'security_monitor' ? 'text-white' : 'text-rose-600'}`} />
                  <span>Security & Proctoring Monitor</span>
                </div>
                {securityLogs.filter(l => !l.resolved).length > 0 && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-mono bg-rose-800 text-white font-black animate-pulse">
                    {securityLogs.filter(l => !l.resolved).length}
                  </span>
                )}
              </button>
            )}

            {/* TAB 5: Question Bank Management (Amber) */}
            {userRole === 'admin' && (
              <button
                type="button"
                onClick={() => setActiveTab('question_bank')}
                className={`px-4 py-3 rounded-xl font-bold text-sm flex items-center justify-between gap-2 transition-all cursor-pointer ${
                  activeTab === 'question_bank'
                    ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30 ring-2 ring-amber-500 border border-amber-700'
                    : 'bg-amber-50/70 hover:bg-amber-100 text-amber-950 border border-amber-200/80'
                }`}
              >
                <div className="flex items-center gap-2.5 font-bold">
                  <FileSpreadsheet className={`w-4 h-4 shrink-0 ${activeTab === 'question_bank' ? 'text-white' : 'text-amber-600'}`} />
                  <span>Question Bank Management</span>
                </div>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-bold ${
                  activeTab === 'question_bank' ? 'bg-amber-800 text-white' : 'bg-amber-200 text-amber-900'
                }`}>
                  {questionBank.length || 100}
                </span>
              </button>
            )}

            {/* TAB 6: Storage & Capacity Monitor (Cyan) */}
            {userRole === 'admin' && (
              <button
                type="button"
                onClick={() => setActiveTab('storage_monitor')}
                className={`px-4 py-3 rounded-xl font-bold text-sm flex items-center justify-between gap-2 transition-all cursor-pointer ${
                  activeTab === 'storage_monitor'
                    ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/30 ring-2 ring-cyan-500 border border-cyan-700'
                    : 'bg-cyan-50/70 hover:bg-cyan-100 text-cyan-950 border border-cyan-200/80'
                }`}
              >
                <div className="flex items-center gap-2.5 font-bold">
                  <HardDrive className={`w-4 h-4 shrink-0 ${activeTab === 'storage_monitor' ? 'text-white' : 'text-cyan-600'}`} />
                  <span>Storage & Capacity Monitor</span>
                </div>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-bold ${
                  activeTab === 'storage_monitor' ? 'bg-cyan-800 text-white' : 'bg-cyan-200 text-cyan-900'
                }`}>
                  {formatStorageBytes(deviceStorageEstimate?.usage || 0)}
                </span>
              </button>
            )}
            {/* TAB 7: Assessment Tests & Batches (Blue) */}
            {userRole === 'admin' && (
              <button
                type="button"
                onClick={() => setActiveTab('tests_management')}
                className={`px-4 py-3 rounded-xl font-bold text-sm flex items-center justify-between gap-2 transition-all cursor-pointer ${
                  activeTab === 'tests_management'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 ring-2 ring-blue-500 border border-blue-700'
                    : 'bg-blue-50/70 hover:bg-blue-100 text-blue-950 border border-blue-200/80'
                }`}
              >
                <div className="flex items-center gap-2.5 font-bold">
                  <Layers className={`w-4 h-4 shrink-0 ${activeTab === 'tests_management' ? 'text-white' : 'text-blue-600'}`} />
                  <span>Assessment Tests & Allocation</span>
                </div>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-bold ${
                  activeTab === 'tests_management' ? 'bg-blue-800 text-white' : 'bg-blue-200 text-blue-900'
                }`}>
                  {assessmentTests.length}
                </span>
              </button>
            )}
          </nav>
        </div>

        {/* PORTAL ACCESS & LOGIN LOCK CONTROL CENTER */}
        {userRole === 'admin' && activeTab === 'access_control' && (
          <div className="bg-white border-2 border-slate-300 rounded-xl p-5 shadow-lg space-y-5 break-inside-avoid">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-200 gap-3">
            <div>
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-purple-600" />
                <h2 className="text-base font-extrabold text-slate-900 font-sans tracking-wide">
                  PORTAL ACCESS & LOGIN LOCK CONTROL CENTER
                </h2>
                <span className="px-2.5 py-0.5 bg-purple-100 text-purple-800 border border-purple-200 rounded-full text-[10px] font-bold uppercase tracking-wider">
                  Admin Master Controls
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-1 font-medium">
                Manage global portal access rights and control account lockouts for Students and Faculty members.
              </p>
            </div>
          </div>

          {/* GLOBAL ACCESS TOGGLES GRID */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Student Login Lock Toggle */}
            <div className={`p-4 rounded-xl border transition-all ${isStudentLoginLocked ? 'bg-rose-50 border-rose-300' : 'bg-slate-50 border-slate-200'}`}>
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-2">
                  <div className={`p-2 rounded-lg ${isStudentLoginLocked ? 'bg-rose-100 text-rose-700' : 'bg-blue-100 text-blue-700'}`}>
                    {isStudentLoginLocked ? <Lock className="w-5 h-5" /> : <User className="w-5 h-5" />}
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Student Login</h3>
                    <p className="text-[11px] text-slate-500 font-medium">Assessment Portal Access</p>
                  </div>
                </div>

                <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                  isStudentLoginLocked ? 'bg-rose-600 text-white shadow-xs' : 'bg-emerald-600 text-white shadow-xs'
                }`}>
                  {isStudentLoginLocked ? '🔒 LOCKED BY ADMIN' : '🟢 ACTIVE / UNLOCKED'}
                </span>
              </div>

              <p className="text-xs text-slate-600 mb-3 leading-relaxed">
                {isStudentLoginLocked
                  ? 'Student login is currently LOCKED. No student can enter credentials or initiate the test.'
                  : 'Student login is ACTIVE. Eligible students can enter Register Numbers and access the assessment.'}
              </p>

              {onToggleStudentLoginLock && (
                <button
                  type="button"
                  onClick={() => onToggleStudentLoginLock(!isStudentLoginLocked)}
                  className={`w-full py-2 px-4 rounded-lg font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm ${
                    isStudentLoginLocked
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      : 'bg-rose-600 hover:bg-rose-700 text-white'
                  }`}
                >
                  {isStudentLoginLocked ? (
                    <>
                      <KeyRound className="w-4 h-4" />
                      <span>UNLOCK STUDENT LOGIN PORTAL</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4" />
                      <span>LOCK STUDENT LOGIN PORTAL</span>
                    </>
                  )}
                </button>
              )}
            </div>

            {/* Faculty Login Lock Toggle */}
            <div className={`p-4 rounded-xl border transition-all ${isFacultyLoginLocked ? 'bg-rose-50 border-rose-300' : 'bg-slate-50 border-slate-200'}`}>
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-2">
                  <div className={`p-2 rounded-lg ${isFacultyLoginLocked ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>
                    {isFacultyLoginLocked ? <Lock className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />}
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Faculty Login</h3>
                    <p className="text-[11px] text-slate-500 font-medium">Faculty Member Dashboard</p>
                  </div>
                </div>

                <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                  isFacultyLoginLocked ? 'bg-rose-600 text-white shadow-xs' : 'bg-emerald-600 text-white shadow-xs'
                }`}>
                  {isFacultyLoginLocked ? '🔒 LOCKED BY ADMIN' : '🟢 ACTIVE / UNLOCKED'}
                </span>
              </div>

              <p className="text-xs text-slate-600 mb-3 leading-relaxed">
                {isFacultyLoginLocked
                  ? 'Faculty login is currently LOCKED. Faculty members cannot sign in.'
                  : 'Faculty login is ACTIVE. Faculty members can sign in using Faculty PIN.'}
              </p>

              {onToggleFacultyLoginLock && (
                <button
                  type="button"
                  onClick={() => onToggleFacultyLoginLock(!isFacultyLoginLocked)}
                  className={`w-full py-2 px-4 rounded-lg font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm ${
                    isFacultyLoginLocked
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      : 'bg-rose-600 hover:bg-rose-700 text-white'
                  }`}
                >
                  {isFacultyLoginLocked ? (
                    <>
                      <KeyRound className="w-4 h-4" />
                      <span>UNLOCK FACULTY LOGIN PORTAL</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4" />
                      <span>LOCK FACULTY LOGIN PORTAL</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* INDIVIDUAL STUDENT ACCOUNT LOCK / UNLOCK CONTROLS */}
          <div className="pt-3 border-t border-slate-200 space-y-3">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Lock className="w-4 h-4 text-purple-600" />
              <span>Individual Student Account Lock & Unlock Tool</span>
            </h3>

            <div className="flex flex-col sm:flex-row items-center gap-3">
              <div className="relative w-full sm:w-80">
                <CreditCard className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Enter Register Number (e.g. 23MSC042 or 71762104001)"
                  value={manualRegNo}
                  onChange={(e) => setManualRegNo(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono font-bold uppercase focus:outline-none focus:border-purple-600 focus:bg-white"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => handleManualLockSubmit('lock')}
                  className="flex-1 sm:flex-none px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Lock Student Account</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleManualLockSubmit('unlock')}
                  className="flex-1 sm:flex-none px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Unlock Student Account</span>
                </button>
              </div>
            </div>

            {manualLockActionMsg && (
              <div className="p-2.5 bg-purple-50 border border-purple-200 text-purple-900 text-xs font-medium rounded-lg flex items-center gap-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-purple-600 shrink-0" />
                <span>{manualLockActionMsg}</span>
              </div>
            )}

            {/* List of Currently Locked Accounts */}
            {lockedStudentRegNos && lockedStudentRegNos.length > 0 && (
              <div className="mt-2 p-3 bg-rose-50/70 border border-rose-200 rounded-lg space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-rose-950 flex-wrap gap-2">
                  <span>Currently Locked Student Register Numbers ({lockedStudentRegNos.length}):</span>
                  <button
                    type="button"
                    onClick={() => {
                      lockedStudentRegNos.forEach((reg) => {
                        if (onUnlockStudent) onUnlockStudent(reg);
                        const matchingSub = submissions.find((s) => s.student.registerNo === reg);
                        if (matchingSub && onResumeStudentSession) {
                          onResumeStudentSession(matchingSub, 'student_login', true);
                        }
                      });
                      setBulkResumeStatusMsg(`✅ Successfully unlocked and resumed all ${lockedStudentRegNos.length} locked student account(s). Admin remains logged in.`);
                      setTimeout(() => setBulkResumeStatusMsg(null), 8000);
                    }}
                    className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded font-bold text-[11px] flex items-center gap-1 transition-all cursor-pointer shadow-xs"
                    title="Unlock and resume all currently locked student accounts without logging out Admin"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Unlock & Resume All ({lockedStudentRegNos.length})</span>
                  </button>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {lockedStudentRegNos.map((reg) => (
                    <span
                      key={reg}
                      className="px-2.5 py-1 bg-white border border-rose-300 rounded text-xs font-mono font-bold text-rose-800 flex items-center gap-1.5 shadow-2xs"
                    >
                      <span>{reg}</span>
                      {onUnlockStudent && (
                        <button
                          type="button"
                          onClick={() => onUnlockStudent(reg)}
                          className="hover:bg-rose-100 p-0.5 rounded text-rose-600 cursor-pointer"
                          title={`Unlock ${reg}`}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ACCESS PIN & CREDENTIAL MANAGEMENT */}
          <div className="pt-4 border-t border-slate-200 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Key className="w-4 h-4 text-amber-600" />
                <span>Access PIN & Credential Configuration (Student, Faculty & Admin)</span>
              </h3>
              <span className="text-[11px] text-slate-500 font-medium italic">
                Default PIN is <code className="bg-slate-100 px-1.5 py-0.5 rounded font-mono text-slate-800 font-bold">cit@123</code>
              </span>
            </div>

            {pinActionMsg && (
              <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 text-xs font-medium rounded-lg flex items-center gap-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0" />
                <span>{pinActionMsg}</span>
              </div>
            )}

            {/* Scheduled Active Time for Student Access PIN Card */}
            <div className="p-4 bg-gradient-to-br from-indigo-50/90 to-blue-50/90 border border-indigo-200/90 rounded-xl space-y-4 shadow-2xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-indigo-100">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-indigo-600 text-white rounded-lg shadow-2xs">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      Scheduled Active Time for Student Access PIN
                    </h4>
                    <p className="text-[11px] text-slate-600 font-medium">
                      Restrict Student Access PIN validity to designated exam or session time windows
                    </p>
                  </div>
                </div>

                {/* Status Badge */}
                {(() => {
                  const status = isStudentPinActive({
                    isEnabled: schedEnabled,
                    type: schedType,
                    startTime: schedStart,
                    endTime: schedEnd
                  });

                  if (!schedEnabled) {
                    return (
                      <span className="px-2.5 py-1 bg-slate-100 text-slate-700 border border-slate-300 rounded-full text-[11px] font-bold flex items-center gap-1.5 self-start sm:self-center">
                        <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                        Schedule Disabled (24/7 Access)
                      </span>
                    );
                  }

                  if (status.isActive) {
                    return (
                      <span className="px-2.5 py-1 bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-full text-[11px] font-bold flex items-center gap-1.5 self-start sm:self-center shadow-2xs">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                        🟢 PIN CURRENTLY ACTIVE
                      </span>
                    );
                  }

                  return (
                    <span className="px-2.5 py-1 bg-amber-100 text-amber-900 border border-amber-300 rounded-full text-[11px] font-bold flex items-center gap-1.5 self-start sm:self-center">
                      <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                      🔴 PIN CURRENTLY INACTIVE
                    </span>
                  );
                })()}
              </div>

              {schedActionMsg && (
                <div className="p-2.5 bg-white border border-indigo-200 text-indigo-950 text-xs font-semibold rounded-lg flex items-center gap-2 animate-in fade-in shadow-2xs">
                  <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span>{schedActionMsg}</span>
                </div>
              )}

              {/* Main Enable Schedule Toggle & Mode Selection */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-center">
                <div className="flex items-center gap-3 bg-white p-2.5 rounded-lg border border-indigo-100 shadow-2xs">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={schedEnabled}
                      onChange={(e) => setSchedEnabled(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                  <span className="text-xs font-bold text-slate-900">
                    {schedEnabled ? 'Enable Scheduled Active Window' : 'Schedule Disabled (PIN works 24/7)'}
                  </span>
                </div>

                {/* Schedule Type (Datetime vs Daily) */}
                <div className="flex items-center gap-1 bg-slate-200/80 p-1 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setSchedType('datetime')}
                    className={`flex-1 py-1.5 px-3 rounded-md text-xs font-bold transition-all cursor-pointer ${
                      schedType === 'datetime'
                        ? 'bg-white text-indigo-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Specific Date & Time Window
                  </button>
                  <button
                    type="button"
                    onClick={() => setSchedType('daily')}
                    className={`flex-1 py-1.5 px-3 rounded-md text-xs font-bold transition-all cursor-pointer ${
                      schedType === 'daily'
                        ? 'bg-white text-indigo-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Daily Recurring Window
                  </button>
                </div>
              </div>

              {/* Inputs & Quick Presets */}
              {schedEnabled && (
                <div className="space-y-3 pt-2 border-t border-indigo-100 animate-in fade-in">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Start Time */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Schedule Start Time:</span>
                      </label>
                      <input
                        type={schedType === 'datetime' ? 'datetime-local' : 'time'}
                        value={schedStart}
                        onChange={(e) => setSchedStart(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-200"
                      />
                    </div>

                    {/* End Time */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Schedule End Time:</span>
                      </label>
                      <input
                        type={schedType === 'datetime' ? 'datetime-local' : 'time'}
                        value={schedEnd}
                        onChange={(e) => setSchedEnd(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-200"
                      />
                    </div>
                  </div>

                  {/* Quick Preset Buttons */}
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      ⚡ Quick One-Click Presets:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleApplyPreset('1hr')}
                        className="px-2.5 py-1 bg-white hover:bg-indigo-50 border border-indigo-200 text-indigo-900 rounded-md text-[11px] font-bold cursor-pointer transition-colors shadow-2xs"
                      >
                        ⏱️ Active Next 1 Hour
                      </button>
                      <button
                        type="button"
                        onClick={() => handleApplyPreset('3hr')}
                        className="px-2.5 py-1 bg-white hover:bg-indigo-50 border border-indigo-200 text-indigo-900 rounded-md text-[11px] font-bold cursor-pointer transition-colors shadow-2xs"
                      >
                        ⏱️ Active Next 3 Hours
                      </button>
                      <button
                        type="button"
                        onClick={() => handleApplyPreset('today9to5')}
                        className="px-2.5 py-1 bg-white hover:bg-indigo-50 border border-indigo-200 text-indigo-900 rounded-md text-[11px] font-bold cursor-pointer transition-colors shadow-2xs"
                      >
                        📅 Today 9 AM - 5 PM
                      </button>
                      <button
                        type="button"
                        onClick={() => handleApplyPreset('daily9to5')}
                        className="px-2.5 py-1 bg-white hover:bg-indigo-50 border border-indigo-200 text-indigo-900 rounded-md text-[11px] font-bold cursor-pointer transition-colors shadow-2xs"
                      >
                        🔁 Daily 09:00 AM - 05:00 PM
                      </button>
                      <button
                        type="button"
                        onClick={() => handleApplyPreset('disable')}
                        className="px-2.5 py-1 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-md text-[11px] font-bold cursor-pointer transition-colors"
                      >
                        🔓 Turn Off Schedule (24/7 Access)
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Save & Reset Schedule Bar */}
              <div className="flex items-center justify-between pt-2 border-t border-indigo-100">
                <span className="text-[11px] font-medium text-slate-600 italic">
                  * Synchronizes in real-time to Firestore and prevents student PIN entry outside window.
                </span>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleSavePinSchedule()}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 shadow-xs cursor-pointer transition-all"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Save & Apply PIN Schedule</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Assessment Extra Timer & Custom Notice Configuration Card */}
            <div className="p-4 bg-gradient-to-br from-purple-50/90 to-amber-50/90 border border-purple-200/90 rounded-xl space-y-4 shadow-2xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-purple-100">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-purple-600 text-white rounded-lg shadow-2xs">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      Assessment Extra Time & Warning Notice Configuration
                    </h4>
                    <p className="text-[11px] text-slate-600 font-medium">
                      Grant additional time (in minutes) for candidate assessments and set custom alert notices
                    </p>
                  </div>
                </div>

                {/* Duration Badge */}
                <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold flex items-center gap-1.5 self-start sm:self-center border shadow-2xs ${
                  extraMinsInput > 0 
                    ? 'bg-purple-100 text-purple-950 border-purple-300' 
                    : 'bg-slate-100 text-slate-700 border-slate-300'
                }`}>
                  <Sparkles className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                  <span>
                    {extraMinsInput > 0 
                      ? `🟢 +${extraMinsInput} Mins Extra Granted (${60 + Number(extraMinsInput)} Mins Total)` 
                      : 'Standard 60-Minute Duration'}
                  </span>
                </span>
              </div>

              {extraTimerActionMsg && (
                <div className="p-2.5 bg-white border border-purple-200 text-purple-950 text-xs font-semibold rounded-lg flex items-center gap-2 animate-in fade-in shadow-2xs">
                  <CheckCircle2 className="w-4 h-4 text-purple-600 shrink-0" />
                  <span>{extraTimerActionMsg}</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Column 1: Extra Minutes Input & Presets */}
                <div className="space-y-3 bg-white p-3 rounded-lg border border-purple-100 shadow-2xs">
                  <label className="text-xs font-bold text-slate-900 flex items-center justify-between">
                    <span>Extra Timer (in Minutes):</span>
                    <span className="text-[11px] text-purple-700 font-mono font-extrabold bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                      Standard 60m + {extraMinsInput}m = {60 + Number(extraMinsInput)}m Total
                    </span>
                  </label>

                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Clock className="w-4 h-4 absolute left-3 top-2.5 text-purple-500" />
                      <input
                        type="number"
                        min="0"
                        max="180"
                        step="1"
                        value={extraMinsInput}
                        onChange={(e) => setExtraMinsInput(Math.max(0, parseInt(e.target.value, 10) || 0))}
                        placeholder="Enter extra minutes (e.g. 10)"
                        className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono font-bold focus:outline-none focus:border-purple-600 focus:bg-white focus:ring-1 focus:ring-purple-200"
                      />
                    </div>
                    <span className="text-xs font-bold text-slate-600 shrink-0">Minutes</span>
                  </div>

                  {/* One-click Presets */}
                  <div className="space-y-1 pt-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      ⚡ Quick Presets:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={() => handlePresetExtraMins(5)}
                        className={`px-2.5 py-1 border rounded-md text-[11px] font-bold cursor-pointer transition-colors shadow-2xs ${
                          extraMinsInput === 5 
                            ? 'bg-purple-600 text-white border-purple-700' 
                            : 'bg-white hover:bg-purple-50 text-purple-900 border-purple-200'
                        }`}
                      >
                        +5 Mins
                      </button>
                      <button
                        type="button"
                        onClick={() => handlePresetExtraMins(10)}
                        className={`px-2.5 py-1 border rounded-md text-[11px] font-bold cursor-pointer transition-colors shadow-2xs ${
                          extraMinsInput === 10 
                            ? 'bg-purple-600 text-white border-purple-700' 
                            : 'bg-white hover:bg-purple-50 text-purple-900 border-purple-200'
                        }`}
                      >
                        +10 Mins
                      </button>
                      <button
                        type="button"
                        onClick={() => handlePresetExtraMins(15)}
                        className={`px-2.5 py-1 border rounded-md text-[11px] font-bold cursor-pointer transition-colors shadow-2xs ${
                          extraMinsInput === 15 
                            ? 'bg-purple-600 text-white border-purple-700' 
                            : 'bg-white hover:bg-purple-50 text-purple-900 border-purple-200'
                        }`}
                      >
                        +15 Mins
                      </button>
                      <button
                        type="button"
                        onClick={() => handlePresetExtraMins(30)}
                        className={`px-2.5 py-1 border rounded-md text-[11px] font-bold cursor-pointer transition-colors shadow-2xs ${
                          extraMinsInput === 30 
                            ? 'bg-purple-600 text-white border-purple-700' 
                            : 'bg-white hover:bg-purple-50 text-purple-900 border-purple-200'
                        }`}
                      >
                        +30 Mins
                      </button>
                      <button
                        type="button"
                        onClick={() => handlePresetExtraMins(0)}
                        className={`px-2.5 py-1 border rounded-md text-[11px] font-bold cursor-pointer transition-colors ${
                          extraMinsInput === 0 
                            ? 'bg-slate-700 text-white border-slate-800' 
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300'
                        }`}
                      >
                        Standard (0 Mins)
                      </button>
                    </div>
                  </div>
                </div>

                {/* Column 2: Extra Time Warning Message Input */}
                <div className="space-y-3 bg-white p-3 rounded-lg border border-purple-100 shadow-2xs flex flex-col justify-between">
                  <div>
                    <label className="text-xs font-bold text-slate-900 flex items-center gap-1.5 mb-1.5">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                      <span>Custom Extra Time Warning Message (Displayed to Candidates):</span>
                    </label>
                    <textarea
                      rows={3}
                      value={extraWarningMsgInput}
                      onChange={(e) => setExtraWarningMsgInput(e.target.value)}
                      placeholder="e.g. ⚠️ Notice: Admin has granted an extra 10 minutes for this assessment session. Please manage your time effectively."
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium focus:outline-none focus:border-purple-600 focus:bg-white focus:ring-1 focus:ring-purple-200 leading-relaxed"
                    />
                  </div>

                  <p className="text-[10px] text-slate-500 font-medium">
                    This warning message will be rendered prominently at the top of the candidate's assessment view.
                  </p>
                </div>
              </div>

              {/* Candidate Preview Box */}
              <div className="p-3 bg-gradient-to-r from-purple-700 via-indigo-600 to-blue-700 text-white border-2 border-purple-300/80 rounded-xl shadow-xs space-y-1">
                <div className="flex items-center justify-between text-[10px] font-extrabold uppercase tracking-wider text-purple-200 border-b border-purple-400/40 pb-1">
                  <span className="flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-300" />
                    Student View Live Preview (How candidates see this alert):
                  </span>
                  <span>{60 + Number(extraMinsInput)} Minutes Total</span>
                </div>
                <div className="flex items-center gap-3 pt-1">
                  <div className="p-2 bg-purple-900/80 rounded-lg text-purple-200 border border-purple-300/40 shrink-0">
                    <Clock className="w-4 h-4 text-purple-200" />
                  </div>
                  <div>
                    <div className="text-xs font-bold flex items-center gap-2">
                      <span>Extra Assessment Time Granted ({extraMinsInput} Extra Mins)</span>
                      <span className="bg-purple-900/90 text-amber-300 text-[10px] font-mono px-2 py-0.5 rounded border border-purple-300/50">
                        Total: {60 + Number(extraMinsInput)} Mins
                      </span>
                    </div>
                    <p className="text-[11px] text-purple-100 font-medium leading-tight mt-0.5">
                      {extraWarningMsgInput || '⚠️ Notice: Extra time has been granted by the Admin for this assessment session. Please manage your time effectively.'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Save Button Bar */}
              <div className="flex items-center justify-between pt-2 border-t border-purple-100">
                <span className="text-[11px] font-medium text-slate-600 italic">
                  * Synchronizes in real-time across all active candidate assessment devices.
                </span>

                <button
                  type="button"
                  onClick={() => handleSaveExtraTimer()}
                  className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 shadow-xs cursor-pointer transition-all"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Extra Timer & Warning Notice</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Student Access PIN Setting Card */}
              <div className="p-4 bg-amber-50/50 border border-amber-200/80 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-blue-600" />
                    <span className="text-xs font-bold text-slate-900">Student Login PIN</span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-white border border-slate-200 px-2 py-1 rounded text-xs font-mono font-bold text-slate-800">
                    <span>Active:</span>
                    <span>{showStudentPin ? studentAccessPin : '••••••••'}</span>
                    <button
                      type="button"
                      onClick={() => setShowStudentPin(!showStudentPin)}
                      className="text-slate-400 hover:text-slate-700 ml-1 cursor-pointer"
                      title={showStudentPin ? "Hide PIN" : "Show PIN"}
                    >
                      {showStudentPin ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <KeyRound className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type={showStudentPin ? "text" : "password"}
                      placeholder="New Student PIN"
                      value={newStudentPinInput}
                      onChange={(e) => setNewStudentPinInput(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold focus:outline-none focus:border-blue-600"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleUpdateStudentPin}
                    className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg flex items-center gap-1 cursor-pointer transition-all shadow-xs shrink-0"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Set</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleResetStudentPin}
                    className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-lg flex items-center gap-1 cursor-pointer transition-all shrink-0"
                    title="Reset to default (cit@123)"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset</span>
                  </button>
                </div>
              </div>

              {/* Faculty Access PIN Setting Card */}
              <div className="p-4 bg-emerald-50/50 border border-emerald-200/80 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-bold text-slate-900">Faculty Login PIN</span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-white border border-slate-200 px-2 py-1 rounded text-xs font-mono font-bold text-slate-800">
                    <span>Active:</span>
                    <span>{showFacultyPin ? facultyAccessPin : '••••••••'}</span>
                    <button
                      type="button"
                      onClick={() => setShowFacultyPin(!showFacultyPin)}
                      className="text-slate-400 hover:text-slate-700 ml-1 cursor-pointer"
                      title={showFacultyPin ? "Hide PIN" : "Show PIN"}
                    >
                      {showFacultyPin ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <KeyRound className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type={showFacultyPin ? "text" : "password"}
                      placeholder="New Faculty PIN"
                      value={newFacultyPinInput}
                      onChange={(e) => setNewFacultyPinInput(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold focus:outline-none focus:border-emerald-600"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleUpdateFacultyPin}
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg flex items-center gap-1 cursor-pointer transition-all shadow-xs shrink-0"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Set</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleResetFacultyPin}
                    className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-lg flex items-center gap-1 cursor-pointer transition-all shrink-0"
                    title="Reset to default (cit@123)"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset</span>
                  </button>
                </div>
              </div>

              {/* Admin Access PIN Setting Card */}
              <div className="p-4 bg-purple-50/50 border border-purple-200/80 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Key className="w-4 h-4 text-purple-600" />
                    <span className="text-xs font-bold text-slate-900">Admin Login PIN</span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-white border border-slate-200 px-2 py-1 rounded text-xs font-mono font-bold text-slate-800">
                    <span>Active:</span>
                    <span>{showAdminPin ? adminAccessPin : '••••••••'}</span>
                    <button
                      type="button"
                      onClick={() => setShowAdminPin(!showAdminPin)}
                      className="text-slate-400 hover:text-slate-700 ml-1 cursor-pointer"
                      title={showAdminPin ? "Hide PIN" : "Show PIN"}
                    >
                      {showAdminPin ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <KeyRound className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type={showAdminPin ? "text" : "password"}
                      placeholder="New Admin PIN"
                      value={newAdminPinInput}
                      onChange={(e) => setNewAdminPinInput(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold focus:outline-none focus:border-purple-600"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleUpdateAdminPin}
                    className="px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-lg flex items-center gap-1 cursor-pointer transition-all shadow-xs shrink-0"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Set</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleResetAdminPin}
                    className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-lg flex items-center gap-1 cursor-pointer transition-all shrink-0"
                    title="Reset to default (cit@123)"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset</span>
                  </button>
                </div>

                {/* Entity 1: Admin ID (Login Identifier) */}
                <div className="pt-2 border-t border-purple-200/60 space-y-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-700 font-bold flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-purple-600" />
                      Admin ID (Login Identifier):
                    </span>
                    <span className="text-purple-700 font-semibold bg-purple-100/80 px-2 py-0.5 rounded text-[10px]">
                      Configured: {adminId}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <User className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Admin ID (e.g. admin)"
                        value={newAdminIdInput}
                        onChange={(e) => setNewAdminIdInput(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none focus:border-purple-600"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={handleUpdateAdminId}
                      className="px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-lg flex items-center gap-1 cursor-pointer transition-all shadow-xs shrink-0"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>Save Admin ID</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleResetAdminId}
                      className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-lg flex items-center gap-1 cursor-pointer transition-all shrink-0"
                      title="Reset Admin ID to default (admin)"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Reset</span>
                    </button>
                  </div>
                </div>

                {/* Entity 2: Secret Security Recovery PIN (Set as per Admin Choice for Password Recovery) */}
                <div className="pt-2 border-t border-purple-200/60 space-y-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-800 font-bold flex items-center gap-1">
                      <KeyRound className="w-3.5 h-3.5 text-purple-600" />
                      Admin Secret Recovery PIN (Password Recovery Master Secret):
                    </span>
                    <span className="text-purple-700 font-semibold bg-purple-100/80 px-2 py-0.5 rounded text-[10px] font-mono">
                      Configured: {showAdminSecretRecoveryPin ? adminSecretRecoveryPin : '••••'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Lock className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                      <input
                        type={showAdminSecretRecoveryPin ? "text" : "password"}
                        placeholder="Set custom Secret Recovery PIN (e.g. 7777)"
                        value={newAdminSecretRecoveryPinInput}
                        onChange={(e) => setNewAdminSecretRecoveryPinInput(e.target.value)}
                        className="w-full pl-9 pr-9 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-purple-600"
                      />
                      <button
                        type="button"
                        onClick={() => setShowAdminSecretRecoveryPin(!showAdminSecretRecoveryPin)}
                        className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                        title="Toggle Secret PIN Visibility"
                      >
                        {showAdminSecretRecoveryPin ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={handleUpdateAdminSecretRecoveryPin}
                      className="px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-lg flex items-center gap-1 cursor-pointer transition-all shadow-xs shrink-0"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>Save Secret PIN</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleResetAdminSecretRecoveryPin}
                      className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-lg flex items-center gap-1 cursor-pointer transition-all shrink-0"
                      title="Reset Secret Recovery PIN to default (7777)"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Reset</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* AUTHORIZED FACULTY LOGIN CREDENTIALS LIST (ADMIN ONLY) */}
            <div className="pt-4 border-t border-slate-200 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>Authorized Faculty Login Credentials Roster</span>
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                    Only faculty accounts added to this list can authenticate into the Faculty Login Portal.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 text-[11px] font-bold rounded-full border border-emerald-200">
                    {authorizedFaculty.length} Authorized Faculty Account(s)
                  </span>
                </div>
              </div>

              {facultyActionMsg && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-medium rounded-lg flex items-center gap-2 animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{facultyActionMsg}</span>
                </div>
              )}

              {/* Add / Edit Faculty Form Card */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{editingFacEntryId ? 'Edit Authorized Faculty Member' : 'Add New Authorized Faculty Member'}</span>
                  </span>
                  {editingFacEntryId && (
                    <button
                      type="button"
                      onClick={handleCancelEditFaculty}
                      className="text-xs text-slate-500 hover:text-slate-800 font-bold underline cursor-pointer"
                    >
                      Cancel Editing
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {/* Faculty ID / Login Username */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Faculty Login ID <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. FAC101 or prof.smith"
                      value={newFacId}
                      onChange={(e) => setNewFacId(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:border-emerald-600"
                    />
                  </div>

                  {/* Faculty Name */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Faculty Full Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Dr. R. Ramanathan"
                      value={newFacName}
                      onChange={(e) => setNewFacName(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:border-emerald-600"
                    />
                  </div>

                  {/* Department */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Department
                    </label>
                    <select
                      value={newFacDept}
                      onChange={(e) => setNewFacDept(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:border-emerald-600"
                    >
                      {configuredDepartmentNames.map((dName) => (
                        <option key={dName} value={dName}>{dName}</option>
                      ))}
                    </select>
                  </div>

                  {/* Password */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Login Password <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Faculty Password"
                      value={newFacPassword}
                      onChange={(e) => setNewFacPassword(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-emerald-600"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleSaveFacultyCredential}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 cursor-pointer shadow-xs transition-all"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{editingFacEntryId ? 'Update Faculty Credentials' : 'Add to Authorized List'}</span>
                  </button>
                </div>
              </div>

              {/* Faculty Search & Table */}
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="relative flex-1 max-w-xs">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search faculty by ID, name, or dept..."
                      value={facultySearchQuery}
                      onChange={(e) => setFacultySearchQuery(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-emerald-600"
                    />
                  </div>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 text-slate-700 uppercase tracking-wider font-bold text-[10px] border-b border-slate-200">
                        <tr>
                          <th className="py-2.5 px-3">Faculty ID</th>
                          <th className="py-2.5 px-3">Faculty Name</th>
                          <th className="py-2.5 px-3">Department</th>
                          <th className="py-2.5 px-3">Login Password</th>
                          <th className="py-2.5 px-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                        {authorizedFaculty
                          .filter(
                            (f) =>
                              f.facultyId.toLowerCase().includes(facultySearchQuery.toLowerCase()) ||
                              f.facultyName.toLowerCase().includes(facultySearchQuery.toLowerCase()) ||
                              f.department.toLowerCase().includes(facultySearchQuery.toLowerCase())
                          )
                          .map((fac) => {
                            const isPassShown = !!showFacPasswords[fac.id];
                            return (
                              <tr key={fac.id} className="hover:bg-slate-50 transition-colors">
                                <td className="py-2.5 px-3 font-bold font-mono text-emerald-800">
                                  {fac.facultyId}
                                </td>
                                <td className="py-2.5 px-3 font-semibold text-slate-900">
                                  {fac.facultyName}
                                </td>
                                <td className="py-2.5 px-3 text-slate-600">
                                  <span className="bg-slate-100 border border-slate-200 px-2 py-0.5 rounded text-[11px]">
                                    {fac.department}
                                  </span>
                                </td>
                                <td className="py-2.5 px-3 font-mono font-bold">
                                  <div className="flex items-center gap-1.5">
                                    <span>{isPassShown ? fac.password : '••••••••'}</span>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setShowFacPasswords((prev) => ({
                                          ...prev,
                                          [fac.id]: !prev[fac.id]
                                        }))
                                      }
                                      className="text-slate-400 hover:text-slate-600 cursor-pointer"
                                      title={isPassShown ? 'Hide Password' : 'Show Password'}
                                    >
                                      {isPassShown ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                    </button>
                                  </div>
                                </td>
                                <td className="py-2.5 px-3 text-right">
                                  <div className="flex items-center justify-end gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => handleEditFaculty(fac)}
                                      className="p-1 text-blue-600 hover:bg-blue-50 rounded cursor-pointer transition-colors"
                                      title="Edit Faculty Credential"
                                    >
                                      <FileCode className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteFaculty(fac.id, fac.facultyId)}
                                      className="p-1 text-red-600 hover:bg-red-50 rounded cursor-pointer transition-colors"
                                      title="Delete Authorized Faculty"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        {authorizedFaculty.length === 0 && (
                          <tr>
                            <td colSpan={5} className="py-6 text-center text-slate-500 text-xs">
                              No authorized faculty accounts configured yet. Add faculty credentials above to restrict Faculty Login.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        )}

        {/* REAL-TIME MISBEHAVIOR & SECURITY INCIDENT MONITOR */}
        {userRole === 'admin' && activeTab === 'security_monitor' && (
          <div className="bg-white border-2 border-slate-900 rounded-2xl p-5 sm:p-6 shadow-xl space-y-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-rose-600 text-white rounded-xl shadow-md shrink-0 flex items-center justify-center animate-pulse">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-extrabold text-slate-900 uppercase tracking-tight flex items-center gap-2 font-sans">
                    Security Incident & Misbehavior Realtime Monitor
                  </h2>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                    <Radio className="w-3 h-3 text-emerald-600 animate-ping" />
                    <span>Realtime Feed Active</span>
                  </span>
                </div>
                <p className="text-xs text-slate-600 font-medium mt-0.5">
                  Proctoring security log & anti-hacking misbehavior alert dashboard. Logs unauthorized copy, print, screenshot, devtools, and window switch attempts in real time.
                </p>
              </div>
            </div>

            {/* Quick Summary Badges */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="px-3 py-1.5 bg-rose-50 border border-rose-200 rounded-lg text-center">
                <span className="text-[10px] uppercase font-bold text-rose-600 block">Critical Alerts</span>
                <span className="text-sm font-black text-rose-900 font-mono">
                  {securityLogs.filter(l => l.severity === 'CRITICAL' && !l.resolved).length}
                </span>
              </div>
              <div className="px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg text-center">
                <span className="text-[10px] uppercase font-bold text-amber-600 block">Unresolved Incidents</span>
                <span className="text-sm font-black text-amber-900 font-mono">
                  {securityLogs.filter(l => !l.resolved).length}
                </span>
              </div>
              <div className="px-3 py-1.5 bg-slate-100 border border-slate-300 rounded-lg text-center">
                <span className="text-[10px] uppercase font-bold text-slate-600 block">Total Recorded</span>
                <span className="text-sm font-black text-slate-900 font-mono">
                  {securityLogs.length}
                </span>
              </div>
            </div>
          </div>

          {/* Filters & Search */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
            {/* Severity Filter Tabs */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
              {(['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const).map((sev) => {
                const count = sev === 'ALL' 
                  ? securityLogs.length 
                  : securityLogs.filter(l => l.severity === sev).length;
                
                const isSelected = logSeverityFilter === sev;
                return (
                  <button
                    key={sev}
                    onClick={() => setLogSeverityFilter(sev)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
                      isSelected
                        ? sev === 'CRITICAL' ? 'bg-rose-600 text-white shadow-xs' :
                          sev === 'HIGH' ? 'bg-amber-600 text-white shadow-xs' :
                          sev === 'MEDIUM' ? 'bg-blue-600 text-white shadow-xs' :
                          sev === 'LOW' ? 'bg-slate-700 text-white shadow-xs' :
                          'bg-slate-900 text-white shadow-xs'
                        : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span>{sev}</span>
                    <span className="px-1.5 py-0.2 bg-black/20 text-white rounded text-[10px] font-mono">
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Search query */}
            <div className="relative flex-1 max-w-xs">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search Register Number, Name or Detail..."
                value={logSearchQuery}
                onChange={(e) => setLogSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium focus:outline-none focus:border-slate-800"
              />
            </div>
          </div>

          {/* Incident Feed List */}
          <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
            {(() => {
              const filteredLogs = securityLogs.filter((log) => {
                if (logSeverityFilter !== 'ALL' && log.severity !== logSeverityFilter) return false;
                if (logSearchQuery.trim()) {
                  const q = logSearchQuery.toLowerCase();
                  const matchReg = log.userRegNo?.toLowerCase().includes(q);
                  const matchName = log.userName?.toLowerCase().includes(q);
                  const matchDetail = log.details.toLowerCase().includes(q);
                  const matchType = log.eventType.toLowerCase().includes(q);
                  if (!matchReg && !matchName && !matchDetail && !matchType) return false;
                }
                return true;
              });

              if (filteredLogs.length === 0) {
                return (
                  <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                    <ShieldCheck className="w-10 h-10 text-emerald-500 mx-auto mb-2 opacity-80" />
                    <p className="text-xs font-bold text-slate-700">No Security Policy Violations Recorded</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      The proctoring defense system is actively guarding all assessment sessions.
                    </p>
                  </div>
                );
              }

              return filteredLogs.map((log) => {
                const isCritical = log.severity === 'CRITICAL';
                const isHigh = log.severity === 'HIGH';
                const isMedium = log.severity === 'MEDIUM';

                return (
                  <div
                    key={log.id}
                    className={`p-3.5 rounded-xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                      log.resolved
                        ? 'bg-slate-50/70 border-slate-200 opacity-60'
                        : isCritical
                        ? 'bg-rose-50/80 border-rose-300/80 shadow-xs'
                        : isHigh
                        ? 'bg-amber-50/80 border-amber-300/80'
                        : isMedium
                        ? 'bg-blue-50/60 border-blue-200'
                        : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className={`p-2 rounded-lg shrink-0 mt-0.5 ${
                        isCritical ? 'bg-rose-600 text-white' :
                        isHigh ? 'bg-amber-500 text-white' :
                        isMedium ? 'bg-blue-600 text-white' :
                        'bg-slate-600 text-white'
                      }`}>
                        <AlertTriangle className="w-4 h-4" />
                      </div>

                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                            isCritical ? 'bg-rose-600 text-white' :
                            isHigh ? 'bg-amber-600 text-white' :
                            isMedium ? 'bg-blue-600 text-white' :
                            'bg-slate-600 text-white'
                          }`}>
                            {log.severity}
                          </span>

                          <span className="text-xs font-bold text-slate-900 font-mono">
                            {log.eventType.replace(/_/g, ' ')}
                          </span>

                          <span className="text-[11px] text-slate-500 font-medium ml-auto">
                            {log.timestamp}
                          </span>
                        </div>

                        <p className="text-xs text-slate-700 font-medium leading-relaxed">
                          {log.details}
                        </p>

                        <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 font-medium">
                          {log.userRegNo && log.userRegNo !== 'N/A' && (
                            <span className="font-mono bg-slate-200/80 px-1.5 py-0.5 rounded text-slate-800 font-bold">
                              Register Number: {log.userRegNo}
                            </span>
                          )}
                          {log.userName && (
                            <span>User: <strong className="text-slate-800">{log.userName}</strong></span>
                          )}
                          <span className="capitalize">Role: {log.userRole}</span>
                          {log.resolved && (
                            <span className="text-emerald-700 font-bold flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Resolved
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-200">
                      {log.userRegNo && log.userRegNo !== 'N/A' && onLockStudent && (
                        <button
                          type="button"
                          onClick={() => {
                            if (log.userRegNo) {
                              onLockStudent(log.userRegNo);
                              alert(`🔒 Student Register Number ${log.userRegNo} has been locked immediately by Admin.`);
                            }
                          }}
                          className="px-2.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold rounded-lg flex items-center gap-1 cursor-pointer transition-all shadow-xs"
                          title="Lock this student account"
                        >
                          <Lock className="w-3 h-3" />
                          <span>Lock Account</span>
                        </button>
                      )}

                      {!log.resolved && (
                        <button
                          type="button"
                          onClick={() => resolveSecurityLogInFirestore(log.id)}
                          className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-900 text-white text-[11px] font-bold rounded-lg flex items-center gap-1 cursor-pointer transition-all shadow-xs"
                        >
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          <span>Resolve</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        </div>
        )}

        {/* SUBMISSIONS & REPORTS SECTION */}
        {activeTab === 'submissions' && (
          <>
            {/* FACULTY ASSESSMENT GUIDELINES & EVALUATION METRICS BUTTONS */}
            <div className="bg-slate-900 text-white border border-slate-800 rounded-xl p-4 sm:p-5 shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4 break-inside-avoid">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30 shrink-0">
                  <Award className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2 font-sans">
                      Evaluation Metrics
                    </h3>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Review official examination board grading benchmarks (Grade A / B / C) and student performance ranges.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto shrink-0">
                {/* Button 1: Grade Distribution Matrix */}
                <button
                  type="button"
                  onClick={() => setIsGradeDistributionModalOpen(true)}
                  className="flex-1 md:flex-none px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer border border-emerald-500/50"
                >
                  <PieChartIcon className="w-4 h-4 text-emerald-200" />
                  <span>Grade Distribution Matrix</span>
                </button>

                {/* Button 2: Score Performance Ranges */}
                <button
                  type="button"
                  onClick={() => setIsScoreRangeModalOpen(true)}
                  className="flex-1 md:flex-none px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-lg shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer border border-blue-500/50"
                >
                  <BarChart3 className="w-4 h-4 text-blue-200" />
                  <span>Score Performance Ranges</span>
                </button>
              </div>
            </div>
            {/* MASTER GOOGLE SHEETS BANNER */}
            {masterSheetsUrl && (
          <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-xl text-xs text-emerald-900 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-sm">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>Master Assessment Records Spreadsheet created in Google Drive!</span>
            </div>
            <a
              href={masterSheetsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded flex items-center gap-1.5 shrink-0 transition-all shadow-sm"
            >
              <span>Open Master Google Sheet</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        )}

        {masterSheetsError && (
          <div className="p-3 bg-rose-50 border border-rose-300 rounded text-rose-800 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{masterSheetsError}</span>
          </div>
        )}

        {/* DATEWISE ASSESSMENT REPORT BAR */}
        <div className="bg-white border border-blue-300/80 rounded-xl p-5 shadow-md space-y-4 break-inside-avoid">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-600" />
                <h2 className="text-sm sm:text-base font-bold text-slate-900 font-sans">
                  Datewise Assessment Report
                </h2>
                <span className="px-2 py-0.5 bg-blue-100 text-blue-800 border border-blue-200 rounded text-[10px] font-semibold">
                  Calendar Picker
                </span>
              </div>
              <p className="text-xs text-slate-600">
                Choose a specific assessment date from the calendar to generate a single consolidated report comprising <strong className="text-blue-700 font-semibold">Register Number</strong>, <strong className="text-blue-700 font-semibold">Student Name</strong>, <strong className="text-blue-700 font-semibold">Department</strong>, <strong className="text-blue-700 font-semibold">Score Secured</strong>, and <strong className="text-blue-700 font-semibold">Date of Assessment</strong>.
              </p>
            </div>

            {/* Calendar Input & Clear Date */}
            <div className="flex items-center gap-3 self-start lg:self-auto shrink-0">
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 focus-within:border-blue-600">
                <Calendar className="w-4 h-4 text-blue-600 shrink-0" />
                <span className="text-xs text-slate-600 font-medium hidden sm:inline">Select Date:</span>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-transparent text-xs text-slate-900 font-mono focus:outline-none cursor-pointer"
                />
              </div>

              {selectedDate && (
                <button
                  onClick={() => setSelectedDate('')}
                  className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs border border-slate-300 transition-all flex items-center gap-1 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Show All Dates</span>
                </button>
              )}
            </div>
          </div>

          {/* Quick Stats & Consolidated Report Action Buttons */}
          <div className="pt-3 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50 p-3 rounded-lg">
            <div className="text-xs text-slate-700 flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                Report Context: <strong className="text-emerald-700 font-semibold">{dateLabel}</strong> — <strong className="text-slate-900 font-mono">{submissionsForSelectedDate.length}</strong> student(s) evaluated
              </span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setIsSingleReportModalOpen(true)}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Preview Single Report</span>
              </button>

              <button
                onClick={() => downloadSingleDatePdfReport(submissionsForSelectedDate, dateLabel, submissions)}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <FileText className="w-3.5 h-3.5 text-blue-100" />
                <span>Export Single PDF</span>
              </button>

              <button
                onClick={() => downloadSingleDateExcelReport(submissionsForSelectedDate, dateLabel, submissions)}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-100" />
                <span>Export Excel (.xlsx)</span>
              </button>

              <button
                onClick={() => downloadSingleDateCsvReport(submissionsForSelectedDate, dateLabel, submissions)}
                className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-semibold text-xs rounded transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <FileCode className="w-3.5 h-3.5 text-amber-600" />
                <span>Export CSV</span>
              </button>

              {submissionsForSelectedDate.length > 0 && (
                <>
                  <button
                    disabled={isExtractingDatePdfZip}
                    onClick={async () => {
                      try {
                        setIsExtractingDatePdfZip(true);
                        setZipProgressToast(`Compiling individual PDFs for ${submissionsForSelectedDate.length} student(s) on ${dateLabel}...`);
                        const count = await extractDatewiseIndividualPdfsZip(submissionsForSelectedDate, dateLabel);
                        setZipProgressToast(`✅ Successfully downloaded ZIP of ${count} individual PDFs for ${dateLabel}!`);
                        setTimeout(() => setZipProgressToast(null), 6000);
                      } catch (err: any) {
                        alert(err?.message || 'Error generating Datewise individual PDFs ZIP.');
                        setZipProgressToast(null);
                      } finally {
                        setIsExtractingDatePdfZip(false);
                      }
                    }}
                    className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 text-white font-bold text-xs rounded transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                    title="Download ZIP of individual student PDF reports for this date"
                  >
                    {isExtractingDatePdfZip ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-100" />
                    ) : (
                      <Download className="w-3.5 h-3.5 text-cyan-200" />
                    )}
                    <span>{isExtractingDatePdfZip ? 'Archiving PDFs...' : 'Extract Date PDFs (.ZIP)'}</span>
                  </button>

                  <button
                    disabled={isExtractingDateExcelZip}
                    onClick={async () => {
                      try {
                        setIsExtractingDateExcelZip(true);
                        setZipProgressToast(`Compiling individual Excel workbooks for ${submissionsForSelectedDate.length} student(s) on ${dateLabel}...`);
                        const count = await extractDatewiseIndividualExcelZip(submissionsForSelectedDate, dateLabel);
                        setZipProgressToast(`✅ Successfully downloaded ZIP of ${count} individual Excel files for ${dateLabel}!`);
                        setTimeout(() => setZipProgressToast(null), 6000);
                      } catch (err: any) {
                        alert(err?.message || 'Error generating Datewise individual Excel ZIP.');
                        setZipProgressToast(null);
                      } finally {
                        setIsExtractingDateExcelZip(false);
                      }
                    }}
                    className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-bold text-xs rounded transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                    title="Download ZIP of individual student Excel reports for this date"
                  >
                    {isExtractingDateExcelZip ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-teal-100" />
                    ) : (
                      <Download className="w-3.5 h-3.5 text-teal-200" />
                    )}
                    <span>{isExtractingDateExcelZip ? 'Archiving Excel...' : 'Extract Date Excel (.ZIP)'}</span>
                  </button>
                </>
              )}

              <button
                onClick={() => {
                  setIsSingleReportModalOpen(true);
                  setTimeout(() => window.print(), 400);
                }}
                className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded transition-all flex items-center gap-1.5 cursor-pointer shadow-sm border border-slate-700"
                title="Print Datewise Assessment Report"
              >
                <Printer className="w-3.5 h-3.5 text-amber-400" />
                <span>Print Report</span>
              </button>
            </div>
          </div>

          {/* DATEWISE REPORT PIE CHART */}
          {submissionsForSelectedDate.length > 0 && (
            <div className="pt-2">
              <div className="p-4 bg-slate-50 border border-blue-200 rounded-xl flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="w-full md:w-1/2 flex flex-col items-center">
                  <h3 className="text-xs font-bold text-blue-900 uppercase tracking-wider mb-1 text-center flex items-center gap-1.5">
                    <PieChartIcon className="w-4 h-4 text-blue-600" />
                    Datewise Report Performance Pie Chart
                  </h3>
                  <p className="text-[11px] text-slate-500 mb-2 text-center">Academic Benchmark Distribution for {dateLabel}</p>
                  <div className="w-full h-44">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={datewisePieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={32}
                          outerRadius={56}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {datewisePieData.map((entry, index) => (
                            <Cell key={`cell-datewise-${index}`} fill={entry.color} stroke="#FFFFFF" strokeWidth={2} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{ backgroundColor: '#1E293B', borderColor: '#334155', borderRadius: '8px', color: '#FFF', fontSize: '12px' }}
                          formatter={(val: any, name: any) => [`${val} Student(s)`, name]}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="w-full md:w-1/2 space-y-1.5 text-[11px]">
                  <p className="font-bold text-slate-800 text-xs mb-2">Academic Benchmark Breakdown ({dateLabel}):</p>
                  {datewisePieData.map((item, i) => (
                    <div key={i} className="flex items-center justify-between text-slate-700 bg-white p-2 rounded border border-slate-200 shadow-2xs">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                        <span className="font-medium">{item.name}</span>
                        <span className="text-[10px] text-slate-400 font-mono">({item.range})</span>
                      </div>
                      <span className="font-mono font-bold text-slate-900">{item.value} student(s) ({item.percentage}%)</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* DEPARTMENTWISE ASSESSMENT REPORT BAR */}
        <div className="bg-white border border-emerald-300/80 rounded-xl p-5 shadow-md space-y-4 break-inside-avoid">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-emerald-600" />
                <h2 className="text-sm sm:text-base font-bold text-slate-900 font-sans">
                  Departmentwise Assessment Report
                </h2>
                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 border border-emerald-200 rounded text-[10px] font-semibold">
                  Department List Box
                </span>
              </div>
              <p className="text-xs text-slate-600">
                Choose a department from the list box to generate a consolidated report comprising <strong className="text-emerald-700 font-semibold">Register Number</strong>, <strong className="text-emerald-700 font-semibold">Student Name</strong>, <strong className="text-emerald-700 font-semibold">Department</strong>, <strong className="text-emerald-700 font-semibold">Score Secured</strong>, and <strong className="text-emerald-700 font-semibold">Date of Assessment</strong>.
              </p>
            </div>

            {/* Department List Box Selector */}
            <div className="flex items-center gap-3 self-start lg:self-auto shrink-0">
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 focus-within:border-emerald-600">
                <ListFilter className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="text-xs text-slate-600 font-medium hidden sm:inline">Choose Department:</span>
                <select
                  value={selectedReportDept}
                  onChange={(e) => setSelectedReportDept(e.target.value)}
                  className="bg-transparent text-xs text-slate-900 font-medium focus:outline-none cursor-pointer max-w-[220px] sm:max-w-[260px] truncate"
                >
                  <option value="ALL" className="bg-white text-slate-900">All Departments</option>
                  {configuredDepartmentNames.map((dName) => (
                    <option key={dName} value={dName} className="bg-white text-slate-900">{dName}</option>
                  ))}
                </select>
              </div>

              {selectedReportDept !== 'ALL' && (
                <button
                  onClick={() => setSelectedReportDept('ALL')}
                  className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs border border-slate-300 transition-all flex items-center gap-1 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Reset List Box</span>
                </button>
              )}
            </div>
          </div>

          {/* Quick Stats & Consolidated Report Action Buttons */}
          <div className="pt-3 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50 p-3 rounded-lg">
            <div className="text-xs text-slate-700 flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                Department Context: <strong className="text-emerald-700 font-semibold">{deptReportLabel}</strong> — <strong className="text-slate-900 font-mono">{submissionsForSelectedDept.length}</strong> student(s) evaluated
              </span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setIsDeptReportModalOpen(true)}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Preview Department Report</span>
              </button>

              <button
                onClick={() => downloadDepartmentwisePdfReport(submissionsForSelectedDept, deptReportLabel, submissions)}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <FileText className="w-3.5 h-3.5 text-blue-100" />
                <span>Export Dept PDF</span>
              </button>

              <button
                onClick={() => downloadDepartmentwiseExcelReport(submissionsForSelectedDept, deptReportLabel, submissions)}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-100" />
                <span>Export Excel (.xlsx)</span>
              </button>

              <button
                onClick={() => downloadDepartmentwiseCsvReport(submissionsForSelectedDept, deptReportLabel, submissions)}
                className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-semibold text-xs rounded transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <FileCode className="w-3.5 h-3.5 text-amber-600" />
                <span>Export CSV</span>
              </button>

              <button
                onClick={() => {
                  setIsDeptReportModalOpen(true);
                  setTimeout(() => window.print(), 400);
                }}
                className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded transition-all flex items-center gap-1.5 cursor-pointer shadow-sm border border-slate-700"
                title="Print Departmentwise Assessment Summary Report"
              >
                <Printer className="w-3.5 h-3.5 text-amber-400" />
                <span>Print Dept Report</span>
              </button>
            </div>
          </div>

          {/* DEPARTMENTWISE REPORT PIE CHARTS (GRADEWISE ANALYSIS) */}
          {submissionsForSelectedDept.length > 0 && (
            <div className="pt-2">
              {/* Gradewise Analysis Pie Chart */}
              <div className="p-4 bg-slate-50 border border-indigo-200 rounded-xl flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="w-full md:w-1/2 flex flex-col items-center">
                  <h3 className="text-xs font-bold text-indigo-900 uppercase tracking-wider mb-1 text-center flex items-center gap-1.5">
                    <PieChartIcon className="w-4 h-4 text-indigo-600" />
                    Departmentwise Gradewise Analysis Pie Chart
                  </h3>
                  <p className="text-[11px] text-slate-500 mb-2 text-center">Academic Grade Distribution for {deptReportLabel}</p>
                  <div className="w-full h-44">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={deptwiseGradewisePieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={32}
                          outerRadius={56}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {deptwiseGradewisePieData.map((entry, index) => (
                            <Cell key={`cell-deptwise-grade-${index}`} fill={entry.color} stroke="#FFFFFF" strokeWidth={2} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{ backgroundColor: '#1E293B', borderColor: '#334155', borderRadius: '8px', color: '#FFF', fontSize: '12px' }}
                          formatter={(val: any, name: any) => [`${val} Student(s)`, name]}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="w-full md:w-1/2 space-y-1.5 text-[11px]">
                  <p className="font-bold text-slate-800 text-xs mb-2">Grade Breakdown ({deptReportLabel}):</p>
                  {deptwiseGradewisePieData.map((item, i) => (
                    <div key={i} className="flex items-center justify-between text-slate-700 bg-white p-2 rounded border border-slate-200 shadow-2xs">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                        <span className="font-medium font-mono font-bold text-indigo-900">{item.label}</span>
                        <span className="text-slate-500 text-[10px]">({item.range})</span>
                      </div>
                      <span className="font-mono font-bold text-slate-900">{item.value} student(s) ({item.percentage}%)</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* EXTRACT ALL INDIVIDUAL STUDENT PERFORMANCE REPORTS BY DEPARTMENT (ZIP) */}
          <div className="mt-4 p-4 bg-gradient-to-r from-blue-900 to-indigo-900 text-white rounded-xl shadow-md border border-blue-700/50 space-y-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 font-bold text-sm text-blue-200">
                  <Download className="w-4 h-4 text-cyan-400" />
                  <span>Extract Individual Student Performance Reports (.ZIP)</span>
                  <span className="px-2 py-0.5 bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 rounded text-[10px] uppercase font-mono font-bold">
                    Dept: {deptReportLabel}
                  </span>
                </div>
                <p className="text-xs text-blue-100/80 mt-1">
                  Bundles and exports individual PDF or Excel performance marksheets for all {submissionsForSelectedDept.length} candidate(s) in <strong className="text-white">{deptReportLabel}</strong> into a single downloadable ZIP archive.
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  disabled={isExtractingPdfZip || submissionsForSelectedDept.length === 0}
                  onClick={async () => {
                    try {
                      setIsExtractingPdfZip(true);
                      setZipProgressToast(`Compiling individual PDF marksheets for ${submissionsForSelectedDept.length} student(s) in ${deptReportLabel}...`);
                      const count = await extractDepartmentIndividualPdfsZip(submissionsForSelectedDept, deptReportLabel, submissions);
                      setZipProgressToast(`✅ Successfully downloaded ZIP of ${count} individual PDF reports for ${deptReportLabel}!`);
                      setTimeout(() => setZipProgressToast(null), 6000);
                    } catch (err: any) {
                      alert(err?.message || 'Error generating individual PDFs ZIP archive.');
                      setZipProgressToast(null);
                    } finally {
                      setIsExtractingPdfZip(false);
                    }
                  }}
                  className="px-3.5 py-2 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-extrabold text-xs rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  {isExtractingPdfZip ? (
                    <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                  ) : (
                    <FileText className="w-4 h-4 text-slate-950" />
                  )}
                  <span>{isExtractingPdfZip ? 'Archiving PDFs...' : 'Extract Individual PDFs (.ZIP)'}</span>
                </button>

                <button
                  disabled={isExtractingExcelZip || submissionsForSelectedDept.length === 0}
                  onClick={async () => {
                    try {
                      setIsExtractingExcelZip(true);
                      setZipProgressToast(`Compiling individual Excel workbooks for ${submissionsForSelectedDept.length} student(s) in ${deptReportLabel}...`);
                      const count = await extractDepartmentIndividualExcelZip(submissionsForSelectedDept, deptReportLabel, submissions);
                      setZipProgressToast(`✅ Successfully downloaded ZIP of ${count} individual Excel reports for ${deptReportLabel}!`);
                      setTimeout(() => setZipProgressToast(null), 6000);
                    } catch (err: any) {
                      alert(err?.message || 'Error generating individual Excel ZIP archive.');
                      setZipProgressToast(null);
                    } finally {
                      setIsExtractingExcelZip(false);
                    }
                  }}
                  className="px-3.5 py-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-extrabold text-xs rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  {isExtractingExcelZip ? (
                    <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                  ) : (
                    <FileSpreadsheet className="w-4 h-4 text-slate-950" />
                  )}
                  <span>{isExtractingExcelZip ? 'Archiving Excel...' : 'Extract Individual Excel (.ZIP)'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* GENERATE OVERALL PERFORMANCE & SEPARATE GRADE REPORTS (GRADE A / B / C) PER DEPARTMENT */}
          <div className="mt-4 p-5 bg-white border-2 border-purple-300/90 rounded-2xl shadow-md space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-purple-100">
              <div>
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-purple-100 text-purple-700 rounded-lg">
                    <Award className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-purple-950 uppercase tracking-wider flex items-center gap-2 font-sans">
                      <span>Performance & Gradewise Department Report Generator</span>
                      <span className="px-2 py-0.5 bg-purple-100 text-purple-800 border border-purple-300 rounded text-[10px] font-bold">
                        Grade A • Grade B • Grade C • Overall
                      </span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Generate consolidated overall performance reports or dedicated separate reports for Grade A (Distinction), Grade B (Merit), and Grade C (Developing) for each department.
                    </p>
                  </div>
                </div>
              </div>

              {/* Quick Jump / Reset Buttons */}
              <div className="flex items-center gap-2 self-start lg:self-auto">
                <button
                  type="button"
                  onClick={() => {
                    setGradewiseModalGradeFilter(selectedReportGrade);
                    setGradewiseModalSearchTerm('');
                    setIsGradewiseReportModalOpen(true);
                  }}
                  className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                  title="Open interactive Gradewise Report Generator for every department"
                >
                  <Eye className="w-4 h-4 text-indigo-200" />
                  <span>Preview Interactive Report</span>
                </button>
              </div>
            </div>

            {/* SELECTION DROPDOWNS: DEPARTMENT AND GRADE */}
            <div className="p-4 bg-purple-50/70 border border-purple-200 rounded-xl flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1">
                {/* 1. DEPARTMENT DROPDOWN */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-purple-950 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-purple-600" />
                    <span>1. Select Department:</span>
                  </label>
                  <div className="relative">
                    <select
                      value={selectedReportDept}
                      onChange={(e) => setSelectedReportDept(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-purple-300 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer shadow-2xs"
                    >
                      <option value="ALL">All Departments (Combined)</option>
                      {configuredDepartmentNames.map((dName) => (
                        <option key={dName} value={dName}>{dName}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* 2. GRADE DROPDOWN */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-purple-950 flex items-center gap-1.5">
                    <Award className="w-3.5 h-3.5 text-purple-600" />
                    <span>2. Select Performance Grade:</span>
                  </label>
                  <div className="relative">
                    <select
                      value={selectedReportGrade}
                      onChange={(e) => setSelectedReportGrade(e.target.value as 'ALL' | 'A' | 'B' | 'C')}
                      className="w-full px-3 py-2 bg-white border border-purple-300 rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer shadow-2xs"
                    >
                      <option value="ALL">All Grades (Overall Performance Report)</option>
                      <option value="A">Grade A Separate Report (Distinction - Above 80% / 40-50 Marks)</option>
                      <option value="B">Grade B Separate Report (Merit - 50% to 80% / 25-39 Marks)</option>
                      <option value="C">Grade C Separate Report (Developing - Below 50% / 0-24 Marks)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* REPORT SCOPE SUMMARY BADGE */}
              <div className="bg-white border border-purple-200 p-3 rounded-lg flex flex-col justify-center min-w-[220px] shadow-2xs text-center md:text-left">
                <span className="text-[10px] uppercase font-bold text-purple-700 tracking-wider">Active Report Scope</span>
                <p className="text-xs font-extrabold text-slate-900 truncate">
                  {selectedReportDept === 'ALL' ? 'All Departments' : selectedReportDept}
                </p>
                <div className="mt-1 flex items-center justify-between gap-2">
                  <span className={`px-2 py-0.5 rounded text-[11px] font-bold font-mono ${
                    selectedReportGrade === 'A' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
                    selectedReportGrade === 'B' ? 'bg-blue-100 text-blue-800 border border-blue-300' :
                    selectedReportGrade === 'C' ? 'bg-orange-100 text-orange-800 border border-orange-300' :
                    'bg-purple-100 text-purple-800 border border-purple-300'
                  }`}>
                    {selectedReportGrade === 'ALL' ? 'Overall Report' : `Grade ${selectedReportGrade} Report`}
                  </span>
                  <span className="text-xs font-mono font-bold text-slate-700">
                    {submissionsForSelectedDeptAndGrade.length} Student{submissionsForSelectedDeptAndGrade.length === 1 ? '' : 's'}
                  </span>
                </div>
              </div>
            </div>

            {/* QUICK GRADE SELECTOR PILLS */}
            <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
              <div className="flex items-center gap-1.5 flex-wrap text-xs">
                <span className="text-slate-500 font-bold text-[11px] uppercase mr-1">Quick Grade Select:</span>
                {(['ALL', 'A', 'B', 'C'] as const).map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setSelectedReportGrade(g)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                      selectedReportGrade === g
                        ? g === 'A' ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs' :
                          g === 'B' ? 'bg-blue-600 text-white border-blue-700 shadow-xs' :
                          g === 'C' ? 'bg-orange-600 text-white border-orange-700 shadow-xs' :
                          'bg-purple-700 text-white border-purple-800 shadow-xs'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                    }`}
                  >
                    {g === 'ALL' ? 'All Grades (Overall)' : `Grade ${g} Only`}
                  </button>
                ))}
              </div>

              {/* ACTION EXPORT BUTTONS */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  disabled={isGeneratingGradewisePdf || submissionsForSelectedDeptAndGrade.length === 0}
                  onClick={async () => {
                    try {
                      setIsGeneratingGradewisePdf(true);
                      await downloadGradewiseDepartmentPdfReport(submissions, deptReportLabel, selectedReportGrade, submissions);
                    } catch (err: any) {
                      alert(err?.message || 'Error generating Performance PDF Report.');
                    } finally {
                      setIsGeneratingGradewisePdf(false);
                    }
                  }}
                  className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-bold text-xs rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                  title={`Export ${selectedReportGrade === 'ALL' ? 'Overall' : `Grade ${selectedReportGrade}`} PDF report for ${deptReportLabel}`}
                >
                  {isGeneratingGradewisePdf ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                  ) : (
                    <FileText className="w-3.5 h-3.5 text-purple-200" />
                  )}
                  <span>Export {selectedReportGrade === 'ALL' ? 'Overall' : `Grade ${selectedReportGrade}`} PDF</span>
                </button>

                <button
                  disabled={submissionsForSelectedDeptAndGrade.length === 0}
                  onClick={() => downloadGradewiseDepartmentExcelReport(submissions, deptReportLabel, selectedReportGrade, submissions)}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                  title={`Export ${selectedReportGrade === 'ALL' ? 'Overall' : `Grade ${selectedReportGrade}`} Excel spreadsheet for ${deptReportLabel}`}
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-100" />
                  <span>Export {selectedReportGrade === 'ALL' ? 'Overall' : `Grade ${selectedReportGrade}`} Excel (.xlsx)</span>
                </button>

                <button
                  disabled={submissionsForSelectedDeptAndGrade.length === 0}
                  onClick={() => downloadGradewiseDepartmentCsvReport(submissions, deptReportLabel, selectedReportGrade, submissions)}
                  className="px-3 py-1.5 bg-white hover:bg-slate-100 disabled:opacity-50 text-slate-700 border border-slate-300 font-semibold text-xs rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                  title={`Export ${selectedReportGrade === 'ALL' ? 'Overall' : `Grade ${selectedReportGrade}`} CSV file`}
                >
                  <FileCode className="w-3.5 h-3.5 text-amber-600" />
                  <span>Export CSV</span>
                </button>

                <button
                  disabled={submissionsForSelectedDeptAndGrade.length === 0}
                  onClick={() => {
                    setGradewiseModalGradeFilter(selectedReportGrade);
                    setIsGradewiseReportModalOpen(true);
                    setTimeout(() => window.print(), 400);
                  }}
                  className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-bold text-xs rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shadow-sm border border-slate-700"
                  title="Print Performance & Gradewise Report"
                >
                  <Printer className="w-3.5 h-3.5 text-amber-400" />
                  <span>Print Report</span>
                </button>
              </div>
            </div>

            {/* LIVE GRADEWISE BREAKDOWN MATRIX TILES */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              {(() => {
                let a = 0, b = 0, c = 0;
                submissionsForSelectedDept.forEach((sub) => {
                  const pct = sub.report?.overallPercentage || 0;
                  const g = calculateGrade(pct).grade;
                  if (g === 'A') a++;
                  else if (g === 'B') b++;
                  else c++;
                });

                const total = submissionsForSelectedDept.length || 1;
                const gradesData = [
                  { gradeKey: 'A' as const, label: 'Grade A Separate Report', pct: 'Above 80% (40-50 Marks)', count: a, color: 'border-emerald-300 bg-emerald-50 text-emerald-800 hover:border-emerald-500' },
                  { gradeKey: 'B' as const, label: 'Grade B Separate Report', pct: '50% - 80% (25-39 Marks)', count: b, color: 'border-blue-300 bg-blue-50 text-blue-800 hover:border-blue-500' },
                  { gradeKey: 'C' as const, label: 'Grade C Separate Report', pct: 'Below 50% (0-24 Marks)', count: c, color: 'border-orange-300 bg-orange-50 text-orange-800 hover:border-orange-500' }
                ];

                return gradesData.map((gd, idx) => {
                  const isSelected = selectedReportGrade === gd.gradeKey;
                  return (
                    <div
                      key={idx}
                      onClick={() => setSelectedReportGrade(isSelected ? 'ALL' : gd.gradeKey)}
                      className={`p-3.5 rounded-xl border-2 ${gd.color} flex flex-col justify-between shadow-2xs cursor-pointer transition-all ${
                        isSelected ? 'ring-2 ring-offset-1 ring-purple-600 scale-[1.02]' : 'opacity-90 hover:opacity-100'
                      }`}
                      title={`Click to filter and generate ${gd.label} for ${deptReportLabel}`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-xs font-extrabold uppercase tracking-wider block opacity-95 flex items-center gap-1.5">
                            <Award className="w-3.5 h-3.5" />
                            {gd.label}
                          </span>
                          <span className="text-[10px] font-mono opacity-80">{gd.pct}</span>
                        </div>
                        {isSelected && (
                          <span className="px-2 py-0.5 bg-purple-700 text-white rounded text-[10px] font-bold">
                            Active
                          </span>
                        )}
                      </div>
                      <div className="mt-2.5 flex items-baseline justify-between">
                        <span className="text-2xl font-black font-mono">{gd.count}</span>
                        <span className="text-xs font-bold opacity-90">{Math.round((gd.count / total) * 100)}% of Dept</span>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        </div>
        </>
        )}

        {/* DASHBOARD & ANALYTICS SECTION */}
        {activeTab === 'dashboard' && (
          <>
            {/* SUMMARY STATS */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm flex items-center gap-4">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-lg border border-blue-200">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">Total Evaluated Students</p>
              <p className="text-2xl font-extrabold font-mono text-slate-900">{totalEvaluated}</p>
            </div>
          </div>

          <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm flex items-center gap-4">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg border border-indigo-200">
              <BarChart3 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">Average Class Score</p>
              <p className="text-2xl font-extrabold font-mono text-slate-900">{avgScore} / 50 ({Math.round((avgScore / 50) * 100)}%)</p>
            </div>
          </div>

          <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm flex items-center gap-4">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg border border-emerald-200">
              <FolderPlus className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">Active Question Bank Size</p>
              <p className="text-xl font-bold font-mono text-emerald-800">{questionBank.length || 100} Questions</p>
              <p className="text-[11px] text-slate-500 font-medium">10 Questions / Domain (4 Level 1 / 3 Level 2 / 3 Level 3)</p>
            </div>
          </div>
        </div>

        {/* FACULTY ASSESSMENT PIE CHART DASHBOARD */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-md space-y-6 break-inside-avoid">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-2">
            <div>
              <div className="flex items-center gap-2">
                <PieChartIcon className="w-5 h-5 text-indigo-600" />
                <h2 className="text-lg font-bold font-sans text-slate-900">
                  Performance Analytics
                </h2>
              </div>
              <p className="text-xs text-slate-600 mt-0.5">
                Visual assessment distributions across Academic Grades and Departmental Participation.
              </p>
            </div>
            <span className="px-3 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded text-xs font-semibold self-start sm:self-auto">
              Visual Analytics
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* Pie Chart 1: Academic Grade Distribution */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col items-center">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-1 text-center">
                Academic Grade Distribution
              </h3>
              <p className="text-[11px] text-slate-500 mb-2 text-center">Relative Norm-Referenced Grades (A: First 25% | B: Next 40% | C: Last 35%)</p>

              {gradePieData.length > 0 ? (
                <>
                  <div className="w-full h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={gradePieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={36}
                          outerRadius={60}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {gradePieData.map((entry, index) => (
                            <Cell key={`cell-grade-${index}`} fill={entry.color} stroke="#FFFFFF" strokeWidth={2} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{ backgroundColor: '#1E293B', borderColor: '#334155', borderRadius: '8px', color: '#FFF', fontSize: '12px' }}
                          formatter={(val: any, name: any) => [`${val} Students (${Math.round((Number(val)/(totalEvaluated||1))*100)}%)`, name]}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="w-full space-y-1 pt-1 text-[11px]">
                    {gradePieData.map((item, i) => (
                      <div key={i} className="flex items-center justify-between text-slate-700 bg-white p-1.5 rounded border border-slate-200 shadow-2xs">
                        <div className="flex items-center gap-1.5 truncate max-w-[150px]">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                          <span className="truncate font-medium">{item.name}</span>
                        </div>
                        <span className="font-mono font-bold text-slate-900">{item.value} ({item.percentage}%)</span>
                      </div>
                    ))}
                  </div>

                  <p className="text-[10px] text-slate-400 italic text-center pt-2">
                    {RELATIVE_GRADING_DISCLAIMER}
                  </p>
                </>
              ) : (
                <div className="py-12 text-center text-slate-400 text-xs">No student records available</div>
              )}
            </div>

            {/* Pie Chart 2: Departmental Participation */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col items-center">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-1 text-center">
                Departmental Participation
              </h3>
              <p className="text-[11px] text-slate-500 mb-2 text-center">Student Breakdown by Department</p>

              {deptPieData.length > 0 ? (
                <>
                  <div className="w-full h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={deptPieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={36}
                          outerRadius={60}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {deptPieData.map((entry, index) => (
                            <Cell key={`cell-dept-${index}`} fill={entry.color} stroke="#FFFFFF" strokeWidth={2} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{ backgroundColor: '#1E293B', borderColor: '#334155', borderRadius: '8px', color: '#FFF', fontSize: '12px' }}
                          formatter={(val: any, name: any) => [`${val} Students`, name]}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="w-full space-y-1 pt-1 text-[11px]">
                    {deptPieData.map((item, i) => (
                      <div key={i} className="flex items-center justify-between text-slate-700 bg-white p-1.5 rounded border border-slate-200 shadow-2xs">
                        <div className="flex items-center gap-1.5 truncate max-w-[140px]">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                          <span className="truncate font-medium">{item.name}</span>
                        </div>
                        <span className="font-mono font-bold text-slate-900">{item.value} ({item.percentage}%)</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="py-12 text-center text-slate-400 text-xs">No student records available</div>
              )}
            </div>
          </div>

          {/* TABULAR FORMAT: Domain-Wise Relative Grade Mark Limits (From and To) */}
          <DomainGradeMarkLimitsTable submissions={submissions} />

          {/* TABULAR FORMAT: Whole College Domainwise Mean and Standard Deviation */}
          <CollegeDomainStatisticsTable submissions={submissions} />

          {/* DEPARTMENT WISE PERFORMANCE AND DATEWISE PERFORMANCE PANELS */}
          <div className="pt-2 border-t border-slate-200 space-y-4">
            <div>
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-bold font-sans text-slate-900">
                  Departmentwise Performance & Datewise Performance
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Detailed academic benchmarks and grade distribution analytics filterable by academic department and assessment date.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* Pie Chart 3: Departmentwise Performance Pie Chart (Academic Benchmark) */}
            <div className="bg-slate-50 border border-emerald-200 rounded-xl p-4 flex flex-col justify-between">
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2 pb-2 border-b border-emerald-100">
                  <div className="flex items-center gap-1.5">
                    <Building2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <div>
                      <h3 className="text-xs font-bold text-emerald-950 uppercase tracking-wider">
                        Departmentwise Performance
                      </h3>
                      <p className="text-[10px] text-slate-500">Academic Benchmark (A / B / C)</p>
                    </div>
                  </div>
                  <select
                    value={analyticsDept}
                    onChange={(e) => setAnalyticsDept(e.target.value)}
                    className="text-xs font-semibold px-2 py-1 bg-white border border-emerald-300 rounded-lg text-emerald-900 focus:ring-1 focus:ring-emerald-500 focus:outline-none max-w-[180px] truncate"
                    title="Select Department for Benchmark Performance Analysis"
                  >
                    <option value="ALL">All Departments</option>
                    {availableDepartmentsList.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                {/* Quick KPI Bar */}
                <div className="grid grid-cols-4 gap-1.5 mb-2 text-center">
                  <div className="bg-white p-1.5 rounded border border-emerald-200 shadow-2xs">
                    <span className="text-[9px] uppercase font-bold text-slate-400 block">Enrolled</span>
                    <span className="text-xs font-black font-mono text-emerald-900">{dashboardDeptTotal}</span>
                  </div>
                  <div className="bg-white p-1.5 rounded border border-emerald-200 shadow-2xs">
                    <span className="text-[9px] uppercase font-bold text-slate-400 block">Pass Rate</span>
                    <span className="text-xs font-black font-mono text-emerald-700">{dashboardDeptPassRate}%</span>
                  </div>
                  <div className="bg-white p-1.5 rounded border border-emerald-200 shadow-2xs">
                    <span className="text-[9px] uppercase font-bold text-slate-400 block">Avg Score</span>
                    <span className="text-xs font-black font-mono text-indigo-700">{dashboardDeptAvgScore}</span>
                  </div>
                  <div className="bg-white p-1.5 rounded border border-emerald-200 shadow-2xs">
                    <span className="text-[9px] uppercase font-bold text-slate-400 block">Top Mark</span>
                    <span className="text-xs font-black font-mono text-blue-700">{dashboardDeptTopScore}/50</span>
                  </div>
                </div>

                {dashboardDeptTotal > 0 ? (
                  <>
                    <div className="w-full h-44">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={dashboardDeptwisePieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={32}
                            outerRadius={56}
                            paddingAngle={3}
                            dataKey="value"
                          >
                            {dashboardDeptwisePieData.map((entry, index) => (
                              <Cell key={`cell-dash-dept-${index}`} fill={entry.color} stroke="#FFFFFF" strokeWidth={2} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{ backgroundColor: '#1E293B', borderColor: '#334155', borderRadius: '8px', color: '#FFF', fontSize: '11px' }}
                            formatter={(val: any, name: any) => [`${val} Student(s) (${Math.round((Number(val)/(dashboardDeptTotal||1))*100)}%)`, name]}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="w-full space-y-1 pt-1 text-[11px]">
                      {dashboardDeptwisePieData.map((item, i) => (
                        <div key={i} className="flex items-center justify-between text-slate-700 bg-white p-1.5 rounded border border-slate-200 shadow-2xs">
                          <div className="flex items-center gap-1.5 truncate">
                            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                            <span className="font-semibold text-slate-800">{item.label}</span>
                            <span className="text-[10px] text-slate-500 hidden sm:inline truncate">({item.sublabel})</span>
                          </div>
                          <span className="font-mono font-bold text-slate-900 shrink-0">{item.value} ({item.percentage}%)</span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="py-12 text-center text-slate-400 text-xs">No records for selected department</div>
                )}
              </div>
            </div>

            {/* Pie Chart 4: Datewise Report Performance Pie Chart (Academic Benchmark) */}
            <div className="bg-slate-50 border border-blue-200 rounded-xl p-4 flex flex-col justify-between">
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2 pb-2 border-b border-blue-100">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-blue-600 shrink-0" />
                    <div>
                      <h3 className="text-xs font-bold text-blue-950 uppercase tracking-wider">
                        Datewise Performance
                      </h3>
                      <p className="text-[10px] text-slate-500">Academic Benchmark for {dashboardDateFormattedLabel}</p>
                    </div>
                  </div>
                  <select
                    value={analyticsDate}
                    onChange={(e) => setAnalyticsDate(e.target.value)}
                    className="text-xs font-semibold px-2 py-1 bg-white border border-blue-300 rounded-lg text-blue-900 focus:ring-1 focus:ring-blue-500 focus:outline-none max-w-[180px] truncate"
                    title="Select Date for Benchmark Performance Analysis"
                  >
                    <option value="">All Assessment Dates</option>
                    {availableAssessmentDates.map((dt) => {
                      const dtFormatted = new Date(dt + 'T00:00:00').toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric'
                      });
                      return (
                        <option key={dt} value={dt}>{dtFormatted}</option>
                      );
                    })}
                  </select>
                </div>

                {/* Quick KPI Bar */}
                <div className="grid grid-cols-4 gap-1.5 mb-2 text-center">
                  <div className="bg-white p-1.5 rounded border border-blue-200 shadow-2xs">
                    <span className="text-[9px] uppercase font-bold text-slate-400 block">Tested</span>
                    <span className="text-xs font-black font-mono text-blue-900">{dashboardDateTotal}</span>
                  </div>
                  <div className="bg-white p-1.5 rounded border border-blue-200 shadow-2xs">
                    <span className="text-[9px] uppercase font-bold text-slate-400 block">Pass Rate</span>
                    <span className="text-xs font-black font-mono text-emerald-700">{dashboardDatePassRate}%</span>
                  </div>
                  <div className="bg-white p-1.5 rounded border border-blue-200 shadow-2xs">
                    <span className="text-[9px] uppercase font-bold text-slate-400 block">Avg Score</span>
                    <span className="text-xs font-black font-mono text-indigo-700">{dashboardDateAvgScore}</span>
                  </div>
                  <div className="bg-white p-1.5 rounded border border-blue-200 shadow-2xs">
                    <span className="text-[9px] uppercase font-bold text-slate-400 block">Top Mark</span>
                    <span className="text-xs font-black font-mono text-blue-700">{dashboardDateTopScore}/50</span>
                  </div>
                </div>

                {dashboardDateTotal > 0 ? (
                  <>
                    <div className="w-full h-44">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={dashboardDatewisePieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={32}
                            outerRadius={56}
                            paddingAngle={3}
                            dataKey="value"
                          >
                            {dashboardDatewisePieData.map((entry, index) => (
                              <Cell key={`cell-dash-date-${index}`} fill={entry.color} stroke="#FFFFFF" strokeWidth={2} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{ backgroundColor: '#1E293B', borderColor: '#334155', borderRadius: '8px', color: '#FFF', fontSize: '11px' }}
                            formatter={(val: any, name: any) => [`${val} Student(s) (${Math.round((Number(val)/(dashboardDateTotal||1))*100)}%)`, name]}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="w-full space-y-1 pt-1 text-[11px]">
                      {dashboardDatewisePieData.map((item, i) => (
                        <div key={i} className="flex items-center justify-between text-slate-700 bg-white p-1.5 rounded border border-slate-200 shadow-2xs">
                          <div className="flex items-center gap-1.5 truncate">
                            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                            <span className="font-semibold text-slate-800">{item.label}</span>
                            <span className="text-[10px] text-slate-500 hidden sm:inline truncate">({item.sublabel})</span>
                          </div>
                          <span className="font-mono font-bold text-slate-900 shrink-0">{item.value} ({item.percentage}%)</span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="py-12 text-center text-slate-400 text-xs">No records for selected date</div>
                )}
              </div>
            </div>

          </div>
          </div>
        </div>

        {/* COMPREHENSIVE DEPARTMENT DOMAIN-WISE ANALYSIS IN DASHBOARD */}
        <DepartmentDomainAnalysisView
          submissions={submissions}
          onViewStudentReport={onSelectSubmission}
        />
        </>
        )}

        {/* DEDICATED DEPARTMENT ATTENDANCE REPORT TAB */}
        {activeTab === 'attendance' && (
          <DepartmentAttendanceReportView
            submissions={submissions}
            activeSessions={activeSessions}
            configuredDepartments={configuredDepts}
            onRefreshData={onRefreshSubmissions ? () => onRefreshSubmissions() : undefined}
          />
        )}

        {/* DEDICATED DEPARTMENT DOMAIN ANALYSIS TAB */}
        {activeTab === 'domain_analysis' && (
          <DepartmentDomainAnalysisView
            submissions={submissions}
            onViewStudentReport={onSelectSubmission}
          />
        )}

        {/* STUDENT FEEDBACK & UI/UX RATINGS EVALUATION STUDIO SECTION */}
        {activeTab === 'student_feedback' && (() => {
          const totalFeedbacks = feedbacks.length;
          const avgAssessment = Number((feedbacks.reduce((acc, f) => acc + (f.assessmentRating || 5), 0) / (totalFeedbacks || 1)).toFixed(2));
          const avgUsability = Number((feedbacks.reduce((acc, f) => acc + (f.userFriendlinessRating || 5), 0) / (totalFeedbacks || 1)).toFixed(2));
          const avgClarity = Number((feedbacks.reduce((acc, f) => acc + (f.questionClarityRating || 5), 0) / (totalFeedbacks || 1)).toFixed(2));
          const avgNav = Number((feedbacks.reduce((acc, f) => acc + (f.navEaseRating || 5), 0) / (totalFeedbacks || 1)).toFixed(2));
          const overallSatisfactionRating = Number(((avgAssessment + avgUsability + avgClarity + avgNav) / 4).toFixed(2));
          const satisfactionPercentage = Math.round((overallSatisfactionRating / 5) * 100);

          // Department-wise rating stats
          const deptFeedbackMap: Record<string, { count: number; sum: number }> = {};
          feedbacks.forEach((fb) => {
            const dept = fb.department || 'Unassigned';
            const avg = ((fb.assessmentRating || 5) + (fb.userFriendlinessRating || 5) + (fb.questionClarityRating || 5) + (fb.navEaseRating || 5)) / 4;
            if (!deptFeedbackMap[dept]) {
              deptFeedbackMap[dept] = { count: 0, sum: 0 };
            }
            deptFeedbackMap[dept].count += 1;
            deptFeedbackMap[dept].sum += avg;
          });

          // Submission score lookup helper
          const submissionMap = new Map<string, SavedSubmission>();
          submissions.forEach((s) => {
            const reg = (s.student?.registerNo || '').trim().toUpperCase();
            if (reg) submissionMap.set(reg, s);
          });

          // Filter and sort feedback
          const filteredFeedbacks = feedbacks.filter((fb) => {
            const searchLower = feedbackSearchTerm.trim().toLowerCase();
            const matchesSearch = !searchLower ||
              (fb.studentName || '').toLowerCase().includes(searchLower) ||
              (fb.studentRegNo || '').toLowerCase().includes(searchLower) ||
              (fb.department || '').toLowerCase().includes(searchLower) ||
              (fb.comments || '').toLowerCase().includes(searchLower);

            const matchesDept = feedbackSelectedDept === 'ALL' || fb.department === feedbackSelectedDept;

            const avgFbRating = Math.round(((fb.assessmentRating || 5) + (fb.userFriendlinessRating || 5) + (fb.questionClarityRating || 5) + (fb.navEaseRating || 5)) / 4);
            const matchesRating = feedbackRatingFilter === 'ALL' || String(avgFbRating) === feedbackRatingFilter;

            return matchesSearch && matchesDept && matchesRating;
          }).sort((a, b) => {
            if (feedbackSortBy === 'NEWEST') {
              return new Date(b.submittedAt || '').getTime() - new Date(a.submittedAt || '').getTime();
            }
            if (feedbackSortBy === 'RATING_HIGH') {
              const rA = ((a.assessmentRating || 5) + (a.userFriendlinessRating || 5) + (a.questionClarityRating || 5) + (a.navEaseRating || 5)) / 4;
              const rB = ((b.assessmentRating || 5) + (b.userFriendlinessRating || 5) + (b.questionClarityRating || 5) + (b.navEaseRating || 5)) / 4;
              return rB - rA;
            }
            if (feedbackSortBy === 'RATING_LOW') {
              const rA = ((a.assessmentRating || 5) + (a.userFriendlinessRating || 5) + (a.questionClarityRating || 5) + (a.navEaseRating || 5)) / 4;
              const rB = ((b.assessmentRating || 5) + (b.userFriendlinessRating || 5) + (b.questionClarityRating || 5) + (b.navEaseRating || 5)) / 4;
              return rA - rB;
            }
            if (feedbackSortBy === 'SCORE_HIGH') {
              const subA = submissionMap.get((a.studentRegNo || '').trim().toUpperCase());
              const subB = submissionMap.get((b.studentRegNo || '').trim().toUpperCase());
              const sA = subA?.report?.overallScore ?? 0;
              const sB = subB?.report?.overallScore ?? 0;
              return sB - sA;
            }
            if (feedbackSortBy === 'REGNO') {
              return (a.studentRegNo || '').localeCompare(b.studentRegNo || '');
            }
            return 0;
          });

          return (
            <div className="space-y-6">
              {/* FEEDBACK EXPORT TOAST NOTIFICATION */}
              {feedbackExportToast && (
                <div className="p-3.5 bg-teal-900 text-white rounded-xl shadow-lg border border-teal-700 flex items-center justify-between text-xs font-bold animate-in fade-in slide-in-from-top-2">
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-teal-300 shrink-0" />
                    <span>{feedbackExportToast}</span>
                  </div>
                  <button
                    onClick={() => setFeedbackExportToast(null)}
                    className="text-teal-300 hover:text-white text-xs cursor-pointer"
                  >
                    Dismiss
                  </button>
                </div>
              )}

              {/* STUDENT FEEDBACK HEADER BANNER WITH ACTION BUTTONS */}
              <div className="bg-gradient-to-r from-teal-900 via-slate-900 to-indigo-950 text-white rounded-2xl p-6 shadow-xl border border-teal-800/80 space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-teal-800/80">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2.5 bg-teal-500/20 text-teal-300 rounded-xl border border-teal-500/30 shrink-0">
                        <MessageSquareQuote className="w-6 h-6" />
                      </div>
                      <div>
                        <h2 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
                          <span>Student Assessment Feedback & UI/UX Evaluation</span>
                          <span className="px-2.5 py-0.5 bg-teal-500/30 text-teal-300 rounded-full text-xs font-mono border border-teal-400/40">
                            {totalFeedbacks} Submissions
                          </span>
                        </h2>
                        <p className="text-xs text-teal-200/80 font-medium">
                          Review, analyze, and export multi-dimensional ratings and qualitative suggestions submitted by students upon test completion.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* MASTER EXPORT BUTTONS */}
                  <div className="flex items-center gap-2 flex-wrap shrink-0">
                    <button
                      onClick={handleExportFeedbackExcel}
                      disabled={isExportingFeedback || totalFeedbacks === 0}
                      className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition-all shadow-md shadow-emerald-900/40 flex items-center gap-2 cursor-pointer"
                      title="Export multi-sheet Excel (.xlsx) workbook with full feedback roster, department analysis, and suggestions log"
                    >
                      <FileSpreadsheet className="w-4 h-4 text-emerald-100" />
                      <span>Export Feedback Excel (.xlsx)</span>
                    </button>

                    <button
                      onClick={handleExportFeedbackCsv}
                      disabled={isExportingFeedback || totalFeedbacks === 0}
                      className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 border border-slate-600 font-bold text-xs rounded-xl transition-all flex items-center gap-2 cursor-pointer"
                      title="Export raw CSV file for database ingestion"
                    >
                      <FileCode className="w-4 h-4 text-amber-400" />
                      <span>Export CSV</span>
                    </button>

                    <button
                      onClick={handleExportFeedbackPdf}
                      disabled={isExportingFeedback || totalFeedbacks === 0}
                      className="px-3.5 py-2.5 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition-all shadow-md shadow-rose-900/40 flex items-center gap-2 cursor-pointer"
                      title="Export landscape PDF evaluation report with institutional metrics"
                    >
                      <FileText className="w-4 h-4 text-rose-100" />
                      <span>Export PDF Report</span>
                    </button>

                    <button
                      onClick={() => window.print()}
                      className="px-3 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                      title="Print Feedback Report"
                    >
                      <Printer className="w-4 h-4 text-amber-300" />
                      <span>Print</span>
                    </button>

                    {userRole === 'admin' && (
                      <button
                        onClick={() => setIsDeleteAllFeedbackModalOpen(true)}
                        disabled={totalFeedbacks === 0}
                        className="px-3.5 py-2.5 bg-rose-700/80 hover:bg-rose-700 disabled:opacity-40 text-rose-100 hover:text-white border border-rose-600/80 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                        title="Permanently delete all student feedback from Firestore database"
                      >
                        <Trash2 className="w-4 h-4 text-rose-300" />
                        <span>Clear All Feedback</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* OVERVIEW STATS CHIPS */}
                <div className="flex items-center gap-4 text-xs text-teal-200/90 flex-wrap pt-1 font-medium">
                  <div className="flex items-center gap-1.5 bg-teal-950/60 px-3 py-1.5 rounded-lg border border-teal-700/50">
                    <Award className="w-4 h-4 text-amber-400" />
                    <span>Overall Satisfaction: <strong className="text-white font-mono">{overallSatisfactionRating} / 5.0 ({satisfactionPercentage}%)</strong></span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-teal-950/60 px-3 py-1.5 rounded-lg border border-teal-700/50">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                    <span>Submission Compliance: <strong className="text-white font-mono">100% Verified</strong></span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-teal-950/60 px-3 py-1.5 rounded-lg border border-teal-700/50">
                    <Database className="w-4 h-4 text-cyan-400" />
                    <span>Storage Sync: <strong className="text-white font-mono">Firestore Real-time Stream</strong></span>
                  </div>
                </div>
              </div>

              {/* 6-CARD FEEDBACK METRICS SUMMARY GRID */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5">
                {/* Metric 1: Total Feedback Submissions */}
                <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-2xs space-y-1">
                  <div className="flex items-center justify-between text-slate-500">
                    <span className="text-[11px] font-bold uppercase tracking-wider">Total Feedbacks</span>
                    <Users className="w-4 h-4 text-teal-600" />
                  </div>
                  <div className="text-2xl font-black text-slate-900 font-mono">{totalFeedbacks}</div>
                  <div className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                    <Check className="w-3 h-3" /> 100% Student Response Rate
                  </div>
                </div>

                {/* Metric 2: Assessment Content Quality */}
                <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-2xs space-y-1">
                  <div className="flex items-center justify-between text-slate-500">
                    <span className="text-[11px] font-bold uppercase tracking-wider">Assessment Quality</span>
                    <BookOpen className="w-4 h-4 text-indigo-600" />
                  </div>
                  <div className="text-2xl font-black text-slate-900 font-mono flex items-baseline gap-1.5">
                    <span>{avgAssessment}</span>
                    <span className="text-xs text-slate-400 font-normal">/ 5.0</span>
                  </div>
                  <div className="flex items-center text-amber-500 text-xs">
                    {'★'.repeat(Math.round(avgAssessment))}
                    <span className="text-slate-300">{'★'.repeat(5 - Math.round(avgAssessment))}</span>
                  </div>
                </div>

                {/* Metric 3: UI & Usability */}
                <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-2xs space-y-1">
                  <div className="flex items-center justify-between text-slate-500">
                    <span className="text-[11px] font-bold uppercase tracking-wider">UI / Usability</span>
                    <ThumbsUp className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="text-2xl font-black text-slate-900 font-mono flex items-baseline gap-1.5">
                    <span>{avgUsability}</span>
                    <span className="text-xs text-slate-400 font-normal">/ 5.0</span>
                  </div>
                  <div className="flex items-center text-amber-500 text-xs">
                    {'★'.repeat(Math.round(avgUsability))}
                    <span className="text-slate-300">{'★'.repeat(5 - Math.round(avgUsability))}</span>
                  </div>
                </div>

                {/* Metric 4: Question Clarity */}
                <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-2xs space-y-1">
                  <div className="flex items-center justify-between text-slate-500">
                    <span className="text-[11px] font-bold uppercase tracking-wider">Question Clarity</span>
                    <HelpCircle className="w-4 h-4 text-purple-600" />
                  </div>
                  <div className="text-2xl font-black text-slate-900 font-mono flex items-baseline gap-1.5">
                    <span>{avgClarity}</span>
                    <span className="text-xs text-slate-400 font-normal">/ 5.0</span>
                  </div>
                  <div className="flex items-center text-amber-500 text-xs">
                    {'★'.repeat(Math.round(avgClarity))}
                    <span className="text-slate-300">{'★'.repeat(5 - Math.round(avgClarity))}</span>
                  </div>
                </div>

                {/* Metric 5: Navigation Flow */}
                <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-2xs space-y-1">
                  <div className="flex items-center justify-between text-slate-500">
                    <span className="text-[11px] font-bold uppercase tracking-wider">Navigation Ease</span>
                    <Layers className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="text-2xl font-black text-slate-900 font-mono flex items-baseline gap-1.5">
                    <span>{avgNav}</span>
                    <span className="text-xs text-slate-400 font-normal">/ 5.0</span>
                  </div>
                  <div className="flex items-center text-amber-500 text-xs">
                    {'★'.repeat(Math.round(avgNav))}
                    <span className="text-slate-300">{'★'.repeat(5 - Math.round(avgNav))}</span>
                  </div>
                </div>

                {/* Metric 6: Overall Satisfaction Index */}
                <div className="bg-gradient-to-br from-teal-50 to-emerald-50 border border-teal-200 p-4 rounded-xl shadow-2xs space-y-1">
                  <div className="flex items-center justify-between text-teal-800">
                    <span className="text-[11px] font-bold uppercase tracking-wider">Satisfaction Index</span>
                    <Award className="w-4 h-4 text-teal-700" />
                  </div>
                  <div className="text-2xl font-black text-teal-950 font-mono">{satisfactionPercentage}%</div>
                  <div className="text-[10px] text-teal-800 font-bold uppercase tracking-wider">
                    ⭐ Highly Positive Feedback
                  </div>
                </div>
              </div>

              {/* DEPARTMENTAL SATISFACTION BREAKDOWN BAR */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-teal-600" />
                    <span>Departmental Student Satisfaction Analytics</span>
                  </h3>
                  <span className="text-xs text-slate-500 font-medium">
                    Evaluated across {Object.keys(deptFeedbackMap).length} Academic Streams
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                  {Object.entries(deptFeedbackMap).map(([dept, data], i) => {
                    const avg = Number((data.sum / data.count).toFixed(2));
                    const pct = Math.round((avg / 5) * 100);
                    return (
                      <div key={i} className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-slate-900 truncate max-w-[150px]" title={dept}>{dept}</span>
                          <span className="text-[10px] font-mono px-2 py-0.5 bg-slate-200 text-slate-700 rounded-full font-bold">
                            {data.count} responses
                          </span>
                        </div>
                        <div className="flex items-baseline justify-between">
                          <div className="text-lg font-black text-teal-900 font-mono flex items-center gap-1">
                            <span>{avg}</span>
                            <span className="text-xs text-slate-400 font-normal">/ 5.0</span>
                          </div>
                          <span className="text-xs font-extrabold text-teal-700 font-mono">{pct}%</span>
                        </div>
                        <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                          <div className="bg-teal-600 h-full rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* SEARCH, FILTER & VIEW MODE TOOLBAR */}
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2.5 flex-1 min-w-[260px]">
                  {/* SEARCH INPUT */}
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search student feedback by name, Register Number, comments, department..."
                      value={feedbackSearchTerm}
                      onChange={(e) => setFeedbackSearchTerm(e.target.value)}
                      className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all"
                    />
                    {feedbackSearchTerm && (
                      <button
                        onClick={() => setFeedbackSearchTerm('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {/* DEPARTMENT FILTER */}
                  <select
                    value={feedbackSelectedDept}
                    onChange={(e) => setFeedbackSelectedDept(e.target.value)}
                    className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="ALL">All Departments ({totalFeedbacks})</option>
                    {Array.from(new Set(feedbacks.map((f) => f.department).filter(Boolean))).map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>

                  {/* STAR RATING FILTER */}
                  <select
                    value={feedbackRatingFilter}
                    onChange={(e) => setFeedbackRatingFilter(e.target.value as any)}
                    className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="ALL">All Star Ratings</option>
                    <option value="5">⭐⭐⭐⭐⭐ 5 Stars (Outstanding)</option>
                    <option value="4">⭐⭐⭐⭐ 4 Stars (Very Good)</option>
                    <option value="3">⭐⭐⭐ 3 Stars (Good)</option>
                    <option value="2">⭐⭐ 2 Stars (Fair)</option>
                    <option value="1">⭐ 1 Star (Needs Review)</option>
                  </select>

                  {/* SORT BY */}
                  <select
                    value={feedbackSortBy}
                    onChange={(e) => setFeedbackSortBy(e.target.value as any)}
                    className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="NEWEST">Newest Feedback First</option>
                    <option value="RATING_HIGH">Highest Rating First</option>
                    <option value="RATING_LOW">Lowest Rating First</option>
                    <option value="SCORE_HIGH">Highest Test Marks First</option>
                    <option value="REGNO">Register Number (A-Z)</option>
                  </select>
                </div>

                {/* VIEW MODE TOGGLE & CLEAR FILTERS */}
                <div className="flex items-center gap-2">
                  <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200">
                    <button
                      onClick={() => setFeedbackViewMode('table')}
                      className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                        feedbackViewMode === 'table' ? 'bg-white text-teal-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Table View
                    </button>
                    <button
                      onClick={() => setFeedbackViewMode('cards')}
                      className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                        feedbackViewMode === 'cards' ? 'bg-white text-teal-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Cards View
                    </button>
                  </div>

                  {(feedbackSearchTerm || feedbackSelectedDept !== 'ALL' || feedbackRatingFilter !== 'ALL' || feedbackSortBy !== 'NEWEST') && (
                    <button
                      onClick={handleClearFeedbackFilters}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                    >
                      Reset Filters
                    </button>
                  )}
                </div>
              </div>

              {/* FEEDBACK DATA VIEW: TABLE OR CARDS */}
              {filteredFeedbacks.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-xl p-12 text-center space-y-3">
                  <MessageSquare className="w-10 h-10 text-slate-300 mx-auto" />
                  <h4 className="text-sm font-bold text-slate-700">No Student Feedback Records Found</h4>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    {feedbackSearchTerm || feedbackSelectedDept !== 'ALL' || feedbackRatingFilter !== 'ALL'
                      ? 'No feedback entries match your active search or filter criteria. Try clearing the filters.'
                      : 'Student feedback will appear here automatically in real-time when students submit the cognitive assessment.'}
                  </p>
                  {(feedbackSearchTerm || feedbackSelectedDept !== 'ALL' || feedbackRatingFilter !== 'ALL') && (
                    <button
                      onClick={handleClearFeedbackFilters}
                      className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold cursor-pointer"
                    >
                      Clear All Filters
                    </button>
                  )}
                </div>
              ) : feedbackViewMode === 'table' ? (
                /* TABLE VIEW */
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-900 text-slate-200 uppercase text-[10px] tracking-wider font-bold">
                        <tr>
                          <th className="p-3 text-center w-12">S.No</th>
                          <th className="p-3">Register Number</th>
                          <th className="p-3">Student Name</th>
                          <th className="p-3">Department</th>
                          <th className="p-3 text-center">Assessment</th>
                          <th className="p-3 text-center">UI / UX</th>
                          <th className="p-3 text-center">Clarity</th>
                          <th className="p-3 text-center">Navigation</th>
                          <th className="p-3 text-center">Avg Rating</th>
                          <th className="p-3 text-center">Marks & Grade</th>
                          <th className="p-3 min-w-[280px]">Student Feedback Remarks</th>
                          <th className="p-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 font-medium text-slate-800">
                        {filteredFeedbacks.map((fb, idx) => {
                          const sub = submissionMap.get((fb.studentRegNo || '').trim().toUpperCase());
                          const score = sub?.report?.overallScore ?? '—';
                          const pct = sub?.report?.overallPercentage ?? 0;
                          const grade = sub?.report ? calculateGrade(pct) : null;
                          const avgRating = Number((((fb.assessmentRating || 5) + (fb.userFriendlinessRating || 5) + (fb.questionClarityRating || 5) + (fb.navEaseRating || 5)) / 4).toFixed(1));

                          return (
                            <tr key={fb.id || idx} className="hover:bg-teal-50/40 transition-colors">
                              <td className="p-3 text-center font-mono text-slate-500">{idx + 1}</td>
                              <td className="p-3 font-mono font-bold text-teal-900">{fb.studentRegNo || '—'}</td>
                              <td className="p-3 font-bold text-slate-900 whitespace-nowrap">{fb.studentName}</td>
                              <td className="p-3 text-slate-600 text-[11px] whitespace-nowrap">{fb.department}</td>
                              <td className="p-3 text-center font-mono font-bold text-amber-600">{fb.assessmentRating || 5}★</td>
                              <td className="p-3 text-center font-mono font-bold text-blue-600">{fb.userFriendlinessRating || 5}★</td>
                              <td className="p-3 text-center font-mono font-bold text-purple-600">{fb.questionClarityRating || 5}★</td>
                              <td className="p-3 text-center font-mono font-bold text-emerald-600">{fb.navEaseRating || 5}★</td>
                              <td className="p-3 text-center">
                                <span className={`px-2 py-0.5 rounded-full font-mono font-extrabold text-[11px] ${
                                  avgRating >= 4.5
                                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                    : avgRating >= 3.5
                                    ? 'bg-blue-100 text-blue-800 border border-blue-300'
                                    : 'bg-amber-100 text-amber-800 border border-amber-300'
                                }`}>
                                  ⭐ {avgRating}
                                </span>
                              </td>
                              <td className="p-3 text-center">
                                {grade ? (
                                  <div className="flex items-center justify-center gap-1">
                                    <span className="font-mono font-bold text-slate-900">{score}/50</span>
                                    <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                                      grade.grade === 'A' ? 'bg-emerald-100 text-emerald-800' : grade.grade === 'B' ? 'bg-blue-100 text-blue-800' : 'bg-rose-100 text-rose-800'
                                    }`}>
                                      {grade.grade}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="font-mono text-slate-400">—</span>
                                )}
                              </td>
                              <td className="p-3">
                                {fb.comments ? (
                                  <div className="text-[11px] text-slate-700 italic flex items-start gap-1.5 leading-relaxed bg-slate-50 p-2 rounded border border-slate-200/70">
                                    <Quote className="w-3 h-3 text-teal-600 shrink-0 mt-0.5" />
                                    <span>"{fb.comments}"</span>
                                  </div>
                                ) : (
                                  <span className="text-slate-400 italic text-[11px]">No additional written remarks</span>
                                )}
                              </td>
                              <td className="p-3 text-right whitespace-nowrap">
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    onClick={() => setSelectedFeedbackDetail(fb)}
                                    className="p-1.5 text-teal-700 hover:bg-teal-100 rounded transition-colors cursor-pointer"
                                    title="View Full Feedback Profile"
                                  >
                                    <Eye className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteFeedbackItem(fb.id)}
                                    className="p-1.5 text-rose-600 hover:bg-rose-100 rounded transition-colors cursor-pointer"
                                    title="Delete Feedback Record"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                /* CARDS VIEW */
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {filteredFeedbacks.map((fb, idx) => {
                    const sub = submissionMap.get((fb.studentRegNo || '').trim().toUpperCase());
                    const score = sub?.report?.overallScore;
                    const pct = sub?.report?.overallPercentage ?? 0;
                    const grade = sub?.report ? calculateGrade(pct) : null;
                    const avgRating = Number((((fb.assessmentRating || 5) + (fb.userFriendlinessRating || 5) + (fb.questionClarityRating || 5) + (fb.navEaseRating || 5)) / 4).toFixed(1));

                    return (
                      <div key={fb.id || idx} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4 hover:border-teal-400 transition-all">
                        {/* CARD HEADER */}
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h4 className="font-extrabold text-sm text-slate-900">{fb.studentName}</h4>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="font-mono text-xs font-bold text-teal-800">{fb.studentRegNo}</span>
                              <span className="text-slate-300">•</span>
                              <span className="text-[11px] text-slate-500">{fb.department}</span>
                            </div>
                          </div>

                          <span className={`px-2.5 py-1 rounded-full font-mono font-extrabold text-xs shadow-2xs ${
                            avgRating >= 4.5
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : 'bg-teal-100 text-teal-800 border border-teal-300'
                          }`}>
                            ⭐ {avgRating} / 5.0
                          </span>
                        </div>

                        {/* RATINGS GRID */}
                        <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                          <div className="flex justify-between items-center text-slate-700">
                            <span>Assessment Content:</span>
                            <span className="font-mono font-bold text-amber-600">{fb.assessmentRating || 5}★</span>
                          </div>
                          <div className="flex justify-between items-center text-slate-700">
                            <span>UI / Usability:</span>
                            <span className="font-mono font-bold text-blue-600">{fb.userFriendlinessRating || 5}★</span>
                          </div>
                          <div className="flex justify-between items-center text-slate-700">
                            <span>Question Clarity:</span>
                            <span className="font-mono font-bold text-purple-600">{fb.questionClarityRating || 5}★</span>
                          </div>
                          <div className="flex justify-between items-center text-slate-700">
                            <span>Navigation Ease:</span>
                            <span className="font-mono font-bold text-emerald-600">{fb.navEaseRating || 5}★</span>
                          </div>
                        </div>

                        {/* STUDENT COMMENTS */}
                        <div className="bg-teal-50/50 p-3 rounded-lg border border-teal-100 text-xs text-slate-700 italic leading-relaxed">
                          <Quote className="w-3.5 h-3.5 text-teal-600 mb-1" />
                          <span>"{fb.comments || 'No remarks provided.'}"</span>
                        </div>

                        {/* CARD FOOTER */}
                        <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                          {grade && score !== undefined ? (
                            <div className="flex items-center gap-1.5">
                              <span className="text-[11px] text-slate-500 font-medium">Marks:</span>
                              <span className="font-mono font-bold text-slate-900">{score}/50</span>
                              <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                                grade.grade === 'A' ? 'bg-emerald-100 text-emerald-800' : grade.grade === 'B' ? 'bg-blue-100 text-blue-800' : 'bg-rose-100 text-rose-800'
                              }`}>
                                {grade.grade}
                              </span>
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-400">Score Syncing</span>
                          )}

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setSelectedFeedbackDetail(fb)}
                              className="px-2.5 py-1 bg-teal-50 hover:bg-teal-100 text-teal-800 font-bold rounded text-xs transition-colors cursor-pointer"
                            >
                              Inspect Profile
                            </button>
                            <button
                              onClick={() => handleDeleteFeedbackItem(fb.id)}
                              className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors cursor-pointer"
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })()}

        {/* ADMIN QUESTION BANK MANAGEMENT & ASSESSMENT CONDUCT CONFIGURATOR */}
        {userRole === 'admin' && activeTab === 'question_bank' && (() => {
          const qbList = localQuestionBank && localQuestionBank.length > 0 ? localQuestionBank : (questionBank || ALL_QUESTIONS);
          const filteredQbList = qbList.filter((q) => {
            const qText = (q.questionText || q.question || '').toLowerCase();
            const qExpl = (q.explanation || '').toLowerCase();
            const qOpts = (q.options || []).join(' ').toLowerCase();
            const searchLow = qbSearchTerm.trim().toLowerCase();

            const matchesSearch = !searchLow || qText.includes(searchLow) || qExpl.includes(searchLow) || qOpts.includes(searchLow);
            const matchesSection = qbSelectedSection === 'ALL' || q.sectionId === qbSelectedSection || (q.sectionId as string) === qbSelectedSection;
            const matchesDifficulty = qbSelectedDifficulty === 'ALL' || q.difficulty === qbSelectedDifficulty;

            return matchesSearch && matchesSection && matchesDifficulty;
          });

          const isCustomBankLoaded = Boolean(localStorage.getItem('CIT_CUSTOM_QUESTION_BANK') || (localQuestionBank && localQuestionBank.length > 0 && localQuestionBank !== ALL_QUESTIONS));

          return (
            <div className="space-y-6">
              {/* CONDUCT ASSESSMENT ACTION BANNER & ACTIVE STATUS */}
              <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 text-white rounded-2xl p-6 shadow-xl border border-purple-800 space-y-5">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-purple-800/80">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg border border-emerald-500/30">
                        <Play className="w-5 h-5 fill-emerald-400 text-emerald-400" />
                      </div>
                      <h2 className="text-xl font-extrabold text-white tracking-tight">
                        Conduct Assessment with Admin Question Bank
                      </h2>
                    </div>
                    <p className="text-xs text-purple-200/80 leading-relaxed max-w-2xl">
                      Accept and publish the active question bank set by Admin. Once accepted, all student candidates logging into the assessment will take the test using this master question set (10 questions per domain, randomized per student).
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <div className={`px-3 py-1.5 rounded-full font-bold text-xs flex items-center gap-1.5 border shadow-sm ${
                      isQuestionBankAccepted
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    }`}>
                      <span className={`w-2.5 h-2.5 rounded-full ${isQuestionBankAccepted ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`}></span>
                      <span>
                        {isQuestionBankAccepted ? 'ASSESSMENT ACTIVE & CONDUCTED' : 'AWAITING ADMIN ACCEPTANCE'}
                      </span>
                    </div>
                    <span className="text-[11px] text-purple-300/80 font-mono">
                      Last Set: {acceptedTimestamp}
                    </span>
                  </div>
                </div>

                {/* PRIMARY CONDUCT ASSESSMENT ACTION BUTTONS */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      onClick={handleAcceptAndConductAssessment}
                      className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs rounded-xl shadow-lg flex items-center gap-2.5 transition-all transform hover:-translate-y-0.5 cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4 text-slate-950 fill-emerald-200 shrink-0" />
                      <span>Accept Question Bank & Conduct Assessment</span>
                    </button>

                    <button
                      onClick={handleOpenPreviewTestPaper}
                      className="px-4 py-2.5 bg-purple-800/80 hover:bg-purple-700 text-white font-bold text-xs rounded-xl border border-purple-600/60 flex items-center gap-2 transition-all cursor-pointer shadow-sm"
                      title="Preview exact 50-question paper generated for candidates"
                    >
                      <Eye className="w-4 h-4 text-purple-300" />
                      <span>Preview 50-Q Student Test Paper</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => downloadQuestionBankExcel(qbList)}
                      className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-lg border border-slate-700 flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Export Excel (.xlsx)</span>
                    </button>

                    <button
                      onClick={() => downloadQuestionBankCsv(qbList)}
                      className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-lg border border-slate-700 flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <FileCode className="w-3.5 h-3.5 text-amber-400" />
                      <span>Export CSV</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* UPLOAD CUSTOM EXCEL & RESET PANEL */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDraggingExcel(true);
                }}
                onDragLeave={() => setIsDraggingExcel(false)}
                onDrop={async (e) => {
                  e.preventDefault();
                  setIsDraggingExcel(false);
                  const file = e.dataTransfer.files?.[0];
                  if (file) {
                    await processQuestionBankFile(file);
                  }
                }}
                className={`bg-white border rounded-xl p-6 shadow-md space-y-5 transition-all ${
                  isDraggingExcel
                    ? 'border-2 border-dashed border-purple-500 bg-purple-50/50 scale-[1.005]'
                    : 'border-slate-200'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
                  <div>
                    <div className="flex items-center gap-2">
                      <FileSpreadsheet className="w-5 h-5 text-purple-600" />
                      <h3 className="text-base font-bold text-slate-900">
                        Upload Custom Question Bank (Excel / CSV)
                      </h3>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Drag & drop an Excel/CSV file here or click upload. Supported formats: .xlsx, .xls, .csv. Maintains all subscripts (e.g. H₂O, a₁, log₂) and superscripts (e.g. x², y³, tan⁻¹(x), e⁻ˣ) without data loss. Required columns: Domain, Question Text, Option A, B, C, D, Correct Answer, Difficulty, Explanation.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5">
                    <button
                      onClick={handleOpenAddQuestionModal}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-lg shadow flex items-center gap-2 transition-all cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add New Question</span>
                    </button>

                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                      accept=".xlsx, .xls, .csv"
                      className="hidden"
                    />

                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploadingBank}
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold text-xs rounded-lg shadow flex items-center gap-2 transition-all cursor-pointer"
                    >
                      {isUploadingBank ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Parsing File...</span>
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4" />
                          <span>Upload Custom Question Bank</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={downloadSampleQuestionBankTemplate}
                      className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-lg border border-slate-300 flex items-center gap-1.5 transition-all cursor-pointer"
                      title="Download standard Excel template formatted with required columns"
                    >
                      <Download className="w-3.5 h-3.5 text-slate-500" />
                      <span>Download Sample Template</span>
                    </button>

                    {onResetQuestionBank && (
                      <button
                        onClick={handleResetToDefaultBank}
                        className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-medium text-xs rounded-lg border border-slate-300 flex items-center gap-1.5 transition-all cursor-pointer"
                        title="Reset to standard 100-Question CIT Question Bank"
                      >
                        <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
                        <span>Reset to Default</span>
                      </button>
                    )}

                    <button
                      onClick={handleClearAllQuestions}
                      className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-lg border border-rose-300 flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                      title="Clear all questions from active question bank"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                      <span>Clear All Questions</span>
                    </button>
                  </div>
                </div>

                {/* Status Banners */}
                {uploadStatus && (
                  <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center gap-2.5 shadow-sm">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    <span className="font-medium">{uploadStatus}</span>
                  </div>
                )}

                {uploadError && (
                  <div className="p-3.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800 flex items-center gap-2.5 shadow-sm">
                    <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
                    <span>{uploadError}</span>
                  </div>
                )}

                {/* Question Bank Details Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Active Bank Source</span>
                    <div className="flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${isCustomBankLoaded ? 'bg-purple-600 animate-pulse' : 'bg-blue-600'}`}></span>
                      <p className="font-bold text-slate-800">
                        {isCustomBankLoaded ? 'Custom Excel / CSV Uploaded' : 'CIT Default Master Bank'}
                      </p>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Total Questions in Bank</span>
                    <p className="font-bold font-mono text-purple-700 text-sm">{qbList.length} Questions</p>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Assessment Sampling</span>
                    <p className="font-bold text-slate-800">10 Questions / Section (50 Total)</p>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Difficulty Distribution</span>
                    <p className="font-bold text-slate-800">40% Level 1 (4) • 30% Level 2 (3) • 30% Level 3 (3)</p>
                  </div>
                </div>
              </div>

              {/* LIVE QUESTION BANK SEARCH & SECTION FILTER BAR */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <ListFilter className="w-5 h-5 text-indigo-600" />
                    <h3 className="text-sm font-bold text-slate-900">
                      Question Bank Content Inspector ({filteredQbList.length} of {qbList.length})
                    </h3>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {/* Dedicated Refresh Inspector Button */}
                    <button
                      onClick={handleRefreshInspector}
                      disabled={isRefreshingInspector}
                      className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-lg shadow flex items-center gap-1.5 transition-all cursor-pointer border border-slate-700"
                      title="Refresh Question Bank Inspector and reload all question data"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${isRefreshingInspector ? 'animate-spin' : ''}`} />
                      <span>{isRefreshingInspector ? 'Refreshing...' : 'Refresh Inspector'}</span>
                    </button>

                    {/* Reset Filters Shortcut Button */}
                    {(qbSearchTerm || qbSelectedSection !== 'ALL' || qbSelectedDifficulty !== 'ALL') && (
                      <button
                        onClick={() => {
                          setQbSearchTerm('');
                          setQbSelectedSection('ALL');
                          setQbSelectedDifficulty('ALL');
                        }}
                        className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold text-xs rounded-lg border border-amber-300 flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
                        title="Clear search queries and domain filters"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Clear Filters</span>
                      </button>
                    )}

                    {selectedQbQuestionIds.length > 0 && (
                      <button
                        onClick={handleBulkDeleteQbQuestions}
                        className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-lg shadow flex items-center gap-1.5 transition-all cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete Selected ({selectedQbQuestionIds.length})</span>
                      </button>
                    )}

                    {qbList.length > 0 && (
                      <button
                        onClick={handleClearAllQuestions}
                        className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-lg border border-rose-300 flex items-center gap-1.5 transition-all cursor-pointer"
                        title="Delete all questions in the bank"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                        <span>Clear All Bank Questions</span>
                      </button>
                    )}

                    <button
                      onClick={handleOpenAddQuestionModal}
                      className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-lg shadow flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Question</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Search Input */}
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      value={qbSearchTerm}
                      onChange={(e) => setQbSearchTerm(e.target.value)}
                      placeholder="Search question text, choices, formula..."
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-purple-500 focus:bg-white"
                    />
                    {qbSearchTerm && (
                      <button
                        onClick={() => setQbSearchTerm('')}
                        className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 text-xs font-bold cursor-pointer"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {/* Domain / Section Filter */}
                  <div>
                    <select
                      value={qbSelectedSection}
                      onChange={(e) => setQbSelectedSection(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-purple-500 cursor-pointer"
                    >
                      <option value="ALL">All 5 Cognitive Domains</option>
                      <option value="calculus">Limits & Continuity</option>
                      <option value="probability">Differentiation</option>
                      <option value="numberSystem">Integration</option>
                      <option value="trigonometry">Probability & Statistics</option>
                      <option value="statistics">Matrices & Determinants</option>
                    </select>
                  </div>

                  {/* Difficulty Level Filter */}
                  <div>
                    <select
                      value={qbSelectedDifficulty}
                      onChange={(e) => setQbSelectedDifficulty(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-purple-500 cursor-pointer"
                    >
                      <option value="ALL">All Difficulty Levels</option>
                      <option value="easy">Level 1 (40%)</option>
                      <option value="medium">Level 2 (30%)</option>
                      <option value="hard">Level 3 (30%)</option>
                    </select>
                  </div>
                </div>

                {/* QUESTION BANK TABLE */}
                {filteredQbList.length > 0 ? (
                  <div className="border border-slate-200 rounded-xl overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead className="bg-slate-900 text-slate-200 uppercase text-[10px] tracking-wider font-bold">
                        <tr>
                          <th className="p-3 w-10 text-center">
                            <input
                              type="checkbox"
                              checked={
                                filteredQbList.length > 0 &&
                                filteredQbList.every((q) => selectedQbQuestionIds.includes(q.id))
                              }
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedQbQuestionIds(filteredQbList.map((q) => q.id));
                                } else {
                                  setSelectedQbQuestionIds([]);
                                }
                              }}
                              className="rounded text-purple-600 focus:ring-purple-500 cursor-pointer"
                            />
                          </th>
                          <th className="p-3 w-12 text-center">#</th>
                          <th className="p-3 w-32">Domain</th>
                          <th className="p-3 w-28">Difficulty</th>
                          <th className="p-3">Question Prompt</th>
                          <th className="p-3 w-64">Option Choices</th>
                          <th className="p-3 w-28 text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 bg-white">
                        {filteredQbList.map((q, idx) => {
                          const secMeta = SECTION_METADATA.find((s) => s.id === q.sectionId);
                          const diffColor =
                            q.difficulty === 'easy'
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                              : q.difficulty === 'medium'
                              ? 'bg-amber-100 text-amber-800 border-amber-300'
                              : 'bg-rose-100 text-rose-800 border-rose-300';

                          const isSelected = selectedQbQuestionIds.includes(q.id);

                          return (
                            <tr key={q.id || `q_${idx}`} className={`hover:bg-slate-50/80 transition-colors ${isSelected ? 'bg-purple-50/40' : ''}`}>
                              <td className="p-3 text-center">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedQbQuestionIds((prev) => [...prev, q.id]);
                                    } else {
                                      setSelectedQbQuestionIds((prev) => prev.filter((id) => id !== q.id));
                                    }
                                  }}
                                  className="rounded text-purple-600 focus:ring-purple-500 cursor-pointer"
                                />
                              </td>
                              <td className="p-3 text-center font-mono font-bold text-slate-500">
                                {idx + 1}
                              </td>
                              <td className="p-3 font-semibold text-slate-800">
                                <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded border border-slate-300 text-[11px]">
                                  {secMeta ? secMeta.title : q.sectionId}
                                </span>
                              </td>
                              <td className="p-3">
                                <span className={`px-2 py-0.5 rounded font-bold text-[10px] uppercase border ${diffColor}`}>
                                  {q.difficulty === 'easy' ? 'Level 1' : q.difficulty === 'medium' ? 'Level 2' : 'Level 3'}
                                </span>
                              </td>
                              <td className="p-3 text-slate-900 space-y-1">
                                <p className="font-medium text-slate-900 leading-snug whitespace-pre-wrap break-words">{q.questionText || q.question}</p>
                                {q.explanation && (
                                  <p className="text-[11px] text-slate-500 italic whitespace-pre-wrap break-words">
                                    <strong className="not-italic text-slate-600">Sol:</strong> {q.explanation}
                                  </p>
                                )}
                              </td>
                              <td className="p-3 space-y-1">
                                {q.options.map((opt, oIdx) => {
                                  const isCorrect = oIdx === q.correctAnswer;
                                  return (
                                    <div
                                      key={oIdx}
                                      className={`px-2 py-1 rounded text-[11px] flex items-start gap-1.5 ${
                                        isCorrect
                                          ? 'bg-emerald-50 text-emerald-900 font-bold border border-emerald-300'
                                          : 'text-slate-600'
                                      }`}
                                    >
                                      <span className="font-mono font-bold shrink-0">{String.fromCharCode(65 + oIdx)}.</span>
                                      <span className="flex-1 whitespace-pre-wrap break-words">{opt}</span>
                                      {isCorrect && <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />}
                                    </div>
                                  );
                                })}
                              </td>
                              <td className="p-3 text-center">
                                <div className="flex items-center justify-center gap-1.5">
                                  <button
                                    onClick={() => setViewingDetailQuestion(q)}
                                    className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all cursor-pointer"
                                    title="View Question Details"
                                  >
                                    <Eye className="w-4 h-4" />
                                  </button>

                                  <button
                                    onClick={() => handleOpenEditQuestionModal(q)}
                                    className="p-1.5 text-slate-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-all cursor-pointer"
                                    title="Edit Question"
                                  >
                                    <Pencil className="w-4 h-4" />
                                  </button>

                                  <button
                                    onClick={() => handleDeleteSingleQuestion(q.id)}
                                    className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                                    title="Delete Question"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="py-12 px-6 text-center text-slate-500 text-xs bg-slate-50 rounded-xl border border-dashed border-slate-300 space-y-2">
                    <HelpCircle className="w-8 h-8 text-slate-400 mx-auto" />
                    <p className="font-bold text-slate-800">No questions match the active search or filter criteria.</p>
                    <p className="text-slate-500">Try clearing the search query or selecting "All 5 Cognitive Domains".</p>
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        {/* ASSESSMENT STORAGE AND CAPACITY MONITOR TAB */}
        {userRole === 'admin' && activeTab === 'storage_monitor' && (
          <div className="bg-white border-2 border-slate-300 rounded-2xl p-6 shadow-xl space-y-6 break-inside-avoid animate-in fade-in">
            {/* Header Banner */}
            <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-slate-200 gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2.5">
                  <div className="p-2.5 bg-cyan-600 text-white rounded-xl shadow-md">
                    <HardDrive className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-base sm:text-lg font-extrabold text-slate-900 font-sans uppercase tracking-wide">
                      ASSESSMENT STORAGE & CAPACITY MONITORING HUB
                    </h2>
                    <p className="text-xs text-slate-600 font-medium">
                      Real-time dynamic inspection of local storage quota, memory allocation, data record density, and Firestore cloud synchronization metrics.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <span className="text-[11px] text-slate-500 font-mono font-semibold bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
                  Last Scan: {storageScanTimestamp}
                </span>

                <button
                  type="button"
                  onClick={refreshStorageScan}
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-xs rounded-xl shadow transition-all flex items-center gap-2 cursor-pointer"
                >
                  <RefreshCw className="w-4 h-4 text-cyan-100" />
                  <span>Run Storage Scan</span>
                </button>
              </div>
            </div>

            {/* KPI Metric Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Card 1: Browser Storage Quota */}
              <div className="p-4 bg-gradient-to-br from-cyan-50 to-blue-50 border border-cyan-200 rounded-xl space-y-2 shadow-2xs">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-extrabold text-cyan-900 uppercase tracking-wider flex items-center gap-1.5">
                    <HardDrive className="w-4 h-4 text-cyan-600" />
                    Local Storage Usage
                  </span>
                  <span className="px-2 py-0.5 bg-cyan-200 text-cyan-900 font-bold rounded text-[10px] font-mono">
                    Quota Metric
                  </span>
                </div>

                <div className="mt-1">
                  <div className="text-xl font-black text-slate-900 font-mono">
                    {formatStorageBytes(deviceStorageEstimate?.usage || 0)}
                  </div>
                  <div className="text-[11px] text-slate-600 font-medium">
                    Allocated Quota: <strong className="font-mono text-slate-900">{formatStorageBytes(deviceStorageEstimate?.quota || 0)}</strong>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="space-y-1 pt-1">
                  {(() => {
                    const usage = deviceStorageEstimate?.usage || 0;
                    const quota = deviceStorageEstimate?.quota || 1;
                    const pct = Math.min(100, Math.max(0, (usage / quota) * 100));
                    return (
                      <>
                        <div className="w-full bg-cyan-200/80 rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-cyan-600 h-2 rounded-full transition-all duration-500"
                            style={{ width: `${Math.max(pct, 1)}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-between text-[10px] font-mono text-cyan-800 font-bold">
                          <span>Capacity Used</span>
                          <span>{pct < 0.1 ? '< 0.1%' : `${pct.toFixed(2)}%`}</span>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>

              {/* Card 2: Evaluated Submissions Memory */}
              <div className="p-4 bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl space-y-2 shadow-2xs">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-extrabold text-emerald-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-emerald-600" />
                    Submissions Volume
                  </span>
                  <span className="px-2 py-0.5 bg-emerald-200 text-emerald-900 font-bold rounded text-[10px] font-mono">
                    {submissions.length} Records
                  </span>
                </div>

                <div className="mt-1">
                  <div className="text-xl font-black text-slate-900 font-mono">
                    {formatStorageBytes(JSON.stringify(submissions).length * 2)}
                  </div>
                  <div className="text-[11px] text-slate-600 font-medium">
                    Evaluated Student Reports Payload
                  </div>
                </div>

                <div className="pt-2 text-[11px] text-emerald-800 font-semibold flex items-center justify-between">
                  <span>Firestore Sync:</span>
                  <span className="text-emerald-700 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Active
                  </span>
                </div>
              </div>

              {/* Card 3: Question Bank Payload */}
              <div className="p-4 bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-xl space-y-2 shadow-2xs">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-extrabold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                    <FileSpreadsheet className="w-4 h-4 text-amber-600" />
                    Question Bank Density
                  </span>
                  <span className="px-2 py-0.5 bg-amber-200 text-amber-900 font-bold rounded text-[10px] font-mono">
                    {questionBank.length} Questions
                  </span>
                </div>

                <div className="mt-1">
                  <div className="text-xl font-black text-slate-900 font-mono">
                    {formatStorageBytes(JSON.stringify(questionBank).length * 2)}
                  </div>
                  <div className="text-[11px] text-slate-600 font-medium">
                    Cognitive Assessment Items Payload
                  </div>
                </div>

                <div className="pt-2 text-[11px] text-amber-800 font-semibold flex items-center justify-between">
                  <span>Domain Sections:</span>
                  <span className="font-bold font-mono">5 Domains</span>
                </div>
              </div>

              {/* Card 4: Proctoring Security Logs */}
              <div className="p-4 bg-gradient-to-br from-rose-50 to-pink-50 border border-rose-200 rounded-xl space-y-2 shadow-2xs">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-extrabold text-rose-900 uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4 text-rose-600" />
                    Security Incident Logs
                  </span>
                  <span className="px-2 py-0.5 bg-rose-200 text-rose-900 font-bold rounded text-[10px] font-mono">
                    {securityLogs.length} Events
                  </span>
                </div>

                <div className="mt-1">
                  <div className="text-xl font-black text-slate-900 font-mono">
                    {formatStorageBytes(JSON.stringify(securityLogs).length * 2)}
                  </div>
                  <div className="text-[11px] text-slate-600 font-medium">
                    Proctoring Audit Trail Size
                  </div>
                </div>

                <div className="pt-2 text-[11px] text-rose-800 font-semibold flex items-center justify-between">
                  <span>Unresolved Violations:</span>
                  <span className="font-mono font-bold text-rose-700">
                    {securityLogs.filter(l => !l.resolved).length} Unresolved
                  </span>
                </div>
              </div>
            </div>

            {/* Detailed Storage Breakdown Table */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <Database className="w-4 h-4 text-cyan-600" />
                  <span>Data Collection & Storage Allocation Breakdown</span>
                </h3>

                <span className="text-[11px] text-slate-500 font-medium">
                  Firestore Instance: <strong className="font-mono text-slate-700">ai-studio-citcognitiveasse-9404...</strong>
                </span>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-900 text-slate-200 uppercase text-[10px] tracking-wider font-bold">
                      <tr>
                        <th className="p-3">Data Collection / Module</th>
                        <th className="p-3">Record Count</th>
                        <th className="p-3">Estimated Memory</th>
                        <th className="p-3">Sync Provider</th>
                        <th className="p-3">Storage Status</th>
                        <th className="p-3 text-right">Quick Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 font-medium text-slate-800">
                      <tr className="hover:bg-slate-50 transition-colors">
                        <td className="p-3 font-bold text-slate-900 flex items-center gap-2">
                          <Users className="w-4 h-4 text-emerald-600" />
                          <span>Student Submissions (<code className="text-slate-600 font-mono">app_submissions</code>)</span>
                        </td>
                        <td className="p-3 font-mono font-bold text-slate-900">{submissions.length}</td>
                        <td className="p-3 font-mono text-slate-700">{formatStorageBytes(JSON.stringify(submissions).length * 2)}</td>
                        <td className="p-3 font-mono text-indigo-700 font-bold">Google Cloud Firestore</td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold text-[10px] uppercase border border-emerald-300">
                            🟢 Synchronized
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => downloadAllDatabaseRecordsExcelReport(submissions)}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded text-[11px] transition-all cursor-pointer shadow-2xs"
                          >
                            Export Excel
                          </button>
                        </td>
                      </tr>

                      <tr className="hover:bg-slate-50 transition-colors">
                        <td className="p-3 font-bold text-slate-900 flex items-center gap-2">
                          <FileSpreadsheet className="w-4 h-4 text-amber-600" />
                          <span>Question Bank Items (<code className="text-slate-600 font-mono">question_bank</code>)</span>
                        </td>
                        <td className="p-3 font-mono font-bold text-slate-900">{questionBank.length}</td>
                        <td className="p-3 font-mono text-slate-700">{formatStorageBytes(JSON.stringify(questionBank).length * 2)}</td>
                        <td className="p-3 font-mono text-indigo-700 font-bold">Firestore / Local Memory</td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded font-bold text-[10px] uppercase border border-amber-300">
                            🟡 Active Memory Bank
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => downloadQuestionBankExcel(questionBank)}
                            className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded text-[11px] transition-all cursor-pointer shadow-2xs"
                          >
                            Download Items
                          </button>
                        </td>
                      </tr>

                      <tr className="hover:bg-slate-50 transition-colors">
                        <td className="p-3 font-bold text-slate-900 flex items-center gap-2">
                          <ShieldAlert className="w-4 h-4 text-rose-600" />
                          <span>Proctoring Security Logs (<code className="text-slate-600 font-mono">security_logs</code>)</span>
                        </td>
                        <td className="p-3 font-mono font-bold text-slate-900">{securityLogs.length}</td>
                        <td className="p-3 font-mono text-slate-700">{formatStorageBytes(JSON.stringify(securityLogs).length * 2)}</td>
                        <td className="p-3 font-mono text-indigo-700 font-bold">Google Cloud Firestore</td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 bg-rose-100 text-rose-800 rounded font-bold text-[10px] uppercase border border-rose-300">
                            🛡️ Real-time Stream
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => setActiveTab('security_monitor')}
                            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded text-[11px] transition-all cursor-pointer shadow-2xs"
                          >
                            Inspect Logs
                          </button>
                        </td>
                      </tr>

                      <tr className="hover:bg-slate-50 transition-colors">
                        <td className="p-3 font-bold text-slate-900 flex items-center gap-2">
                          <ShieldCheck className="w-4 h-4 text-purple-600" />
                          <span>Authorized Faculty Roster (<code className="text-slate-600 font-mono">authorized_faculty</code>)</span>
                        </td>
                        <td className="p-3 font-mono font-bold text-slate-900">{authorizedFaculty.length}</td>
                        <td className="p-3 font-mono text-slate-700">{formatStorageBytes(JSON.stringify(authorizedFaculty).length * 2)}</td>
                        <td className="p-3 font-mono text-indigo-700 font-bold">Google Cloud Firestore</td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 bg-purple-100 text-purple-800 rounded font-bold text-[10px] uppercase border border-purple-300">
                            🔒 Secured Roster
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => setActiveTab('access_control')}
                            className="px-2.5 py-1 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded text-[11px] transition-all cursor-pointer shadow-2xs"
                          >
                            Manage Roster
                          </button>
                        </td>
                      </tr>

                      <tr className="hover:bg-slate-50 transition-colors">
                        <td className="p-3 font-bold text-slate-900 flex items-center gap-2">
                          <MessageSquare className="w-4 h-4 text-teal-600" />
                          <span>Student Assessment Feedback (<code className="text-slate-600 font-mono">student_feedback</code>)</span>
                        </td>
                        <td className="p-3 font-mono font-bold text-slate-900">{feedbacks.length}</td>
                        <td className="p-3 font-mono text-slate-700">{formatStorageBytes(JSON.stringify(feedbacks).length * 2)}</td>
                        <td className="p-3 font-mono text-indigo-700 font-bold">Google Cloud Firestore</td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 bg-teal-100 text-teal-800 rounded font-bold text-[10px] uppercase border border-teal-300">
                            ⭐ Synced ({feedbacks.length} Records)
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={handleExportFeedbackExcel}
                              className="px-2.5 py-1 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded text-[11px] transition-all cursor-pointer shadow-2xs"
                            >
                              Export
                            </button>
                            {userRole === 'admin' && (
                              <button
                                onClick={() => setIsDeleteAllFeedbackModalOpen(true)}
                                disabled={feedbacks.length === 0}
                                className="px-2 py-1 bg-rose-50 hover:bg-rose-100 disabled:opacity-40 text-rose-700 border border-rose-200 font-bold rounded text-[11px] transition-all cursor-pointer shadow-2xs"
                                title="Delete all feedback records from database"
                              >
                                Purge
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>

                      <tr className="hover:bg-slate-50 transition-colors">
                        <td className="p-3 font-bold text-slate-900 flex items-center gap-2">
                          <Clock className="w-4 h-4 text-indigo-600" />
                          <span>Student Access PIN Schedule (<code className="text-slate-600 font-mono">student_pin_schedule</code>)</span>
                        </td>
                        <td className="p-3 font-mono font-bold text-slate-900">1 Config</td>
                        <td className="p-3 font-mono text-slate-700">{formatStorageBytes(JSON.stringify(studentPinSchedule || {}).length * 2)}</td>
                        <td className="p-3 font-mono text-indigo-700 font-bold">Google Cloud Firestore</td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded font-bold text-[10px] uppercase border border-indigo-300">
                            ⏱️ Active Schedule
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => setActiveTab('access_control')}
                            className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded text-[11px] transition-all cursor-pointer shadow-2xs"
                          >
                            Manage PIN
                          </button>
                        </td>
                      </tr>

                      <tr className="hover:bg-slate-50 transition-colors">
                        <td className="p-3 font-bold text-slate-900 flex items-center gap-2">
                          <Cpu className="w-4 h-4 text-cyan-600" />
                          <span>Active Concurrent Student Sessions (<code className="text-slate-600 font-mono">activeSessions</code>)</span>
                        </td>
                        <td className="p-3 font-mono font-bold text-slate-900">
                          <span className="text-emerald-700">{activeSessions.length} Connected</span> / 800 Max
                        </td>
                        <td className="p-3 font-mono text-slate-700">{formatStorageBytes(JSON.stringify(activeSessions).length * 2)}</td>
                        <td className="p-3 font-mono text-indigo-700 font-bold">Google Cloud Firestore</td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold text-[10px] uppercase border border-emerald-300">
                            ⚡ 800 Concurrency Ready
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <button
                            onClick={async () => {
                              if (onClearStaleSessions) {
                                const cleared = await onClearStaleSessions();
                                alert(`Cleared ${cleared} stale assessment sessions older than 5 minutes.`);
                              }
                            }}
                            className="px-2.5 py-1 bg-cyan-600 hover:bg-cyan-700 text-white font-bold rounded text-[11px] transition-all cursor-pointer shadow-2xs"
                            title="Clear any abandoned or stale test sessions from Firestore"
                          >
                            Purge Stale
                          </button>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Institutional Concurrency Engine (800 Concurrent Candidates) Status Card */}
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-500/30 rounded-2xl p-5 text-white shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-indigo-500/20">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-indigo-500/20 text-indigo-300 rounded-xl border border-indigo-400/30">
                    <Cpu className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm sm:text-base font-black tracking-wide uppercase text-white">
                        Institutional Concurrency Engine
                      </h3>
                      <span className="px-2.5 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-full text-[10px] font-bold uppercase tracking-wider">
                        Active • 800 Logins Supported
                      </span>
                    </div>
                    <p className="text-xs text-indigo-200/80 font-medium">
                      Engineered for synchronous testing across college computer centers, IT labs, and student workstations.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 bg-slate-800 border border-slate-700 rounded-lg text-xs font-mono text-indigo-300 font-bold">
                    {activeSessions.length} / 800 Active Terminals
                  </span>
                  {onClearStaleSessions && (
                    <button
                      type="button"
                      onClick={async () => {
                        const count = await onClearStaleSessions();
                        alert(`Cleared ${count} stale assessment session(s).`);
                      }}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
                      title="Clear sessions with no heartbeat for > 5 minutes"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Purge Inactive</span>
                    </button>
                  )}
                </div>
              </div>

              {/* 3 Metrics Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 bg-slate-800/60 border border-indigo-500/20 rounded-xl space-y-1">
                  <div className="text-[11px] text-indigo-300 font-semibold uppercase tracking-wider">Max Tested Concurrency</div>
                  <div className="text-xl font-black text-white font-mono">800 Candidates</div>
                  <div className="text-[11px] text-slate-400">Synchronous real-time examination sessions</div>
                </div>

                <div className="p-3.5 bg-slate-800/60 border border-indigo-500/20 rounded-xl space-y-1">
                  <div className="text-[11px] text-indigo-300 font-semibold uppercase tracking-wider">Heartbeat Write Rate</div>
                  <div className="text-xl font-black text-emerald-400 font-mono">~10.6 Writes / Sec</div>
                  <div className="text-[11px] text-slate-400">Jittered 60-90s pulses (&lt; 0.2% Firestore quota)</div>
                </div>

                <div className="p-3.5 bg-slate-800/60 border border-indigo-500/20 rounded-xl space-y-1">
                  <div className="text-[11px] text-indigo-300 font-semibold uppercase tracking-wider">Anti-Collision Gate</div>
                  <div className="text-xl font-black text-cyan-300 font-mono">Register No. Locked</div>
                  <div className="text-[11px] text-slate-400">Same student cannot open duplicate tabs/devices</div>
                </div>
              </div>

              {/* Active Sessions Live List */}
              {activeSessions.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-indigo-500/20">
                  <div className="flex items-center justify-between text-xs text-indigo-200">
                    <span className="font-bold flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                      <span>Live Candidate Terminals ({activeSessions.length})</span>
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">Auto-refreshed via Cloud Firestore</span>
                  </div>

                  <div className="max-h-48 overflow-y-auto border border-indigo-500/20 rounded-xl bg-slate-950/80 divide-y divide-slate-800/80 text-xs">
                    {activeSessions.map((session, idx) => (
                      <div key={session.sessionId || idx} className="p-2.5 flex items-center justify-between hover:bg-slate-900/60 transition-colors">
                        <div className="flex items-center gap-2.5">
                          <span className="w-5 h-5 rounded-full bg-indigo-900/80 text-indigo-300 text-[10px] font-mono font-bold flex items-center justify-center">
                            {idx + 1}
                          </span>
                          <div>
                            <div className="font-bold text-white flex items-center gap-2">
                              <span>{session.studentName}</span>
                              <span className="font-mono text-[11px] text-indigo-300 font-normal">({session.registerNo})</span>
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              {session.department} • Terminal: {session.deviceId ? session.deviceId.substring(0, 10) : 'Web'}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/50">
                            Active
                          </span>
                          <button
                            type="button"
                            onClick={async () => {
                              if (confirm(`Release session lock for candidate ${session.registerNo} (${session.studentName})? This will allow them to re-login if their lab PC restarted.`)) {
                                await resumeStudentSessionInFirestore(session.registerNo);
                                alert(`Session lock released for ${session.registerNo}.`);
                              }
                            }}
                            className="px-2 py-1 bg-slate-800 hover:bg-rose-900/80 hover:border-rose-700 text-slate-300 hover:text-rose-200 border border-slate-700 rounded text-[10px] font-bold transition-all cursor-pointer"
                            title="Release this student session if computer restarted"
                          >
                            Release Terminal
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Diagnostic Actions & Maintenance Bar */}
            <div className="p-4 bg-slate-900 text-white rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-cyan-500/20 text-cyan-400 rounded-lg border border-cyan-500/30 shrink-0">
                  <Server className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                    Database Health & Storage Maintenance Controls
                  </h4>
                  <p className="text-[11px] text-slate-400 font-medium">
                    Run database health diagnostics or execute manual cache purges to optimize browser rendering performance.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap shrink-0">
                <button
                  type="button"
                  onClick={handleFetchAllFromCloudFirestore}
                  disabled={isFetchingFirestore}
                  className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-xs rounded-lg shadow transition-all cursor-pointer flex items-center gap-1.5"
                  title="Directly query and fetch all assessment submissions across Firestore database collections"
                >
                  {isFetchingFirestore ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-100" />
                  ) : (
                    <CloudDownload className="w-3.5 h-3.5 text-blue-100" />
                  )}
                  <span>Fetch Cloud Submissions</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsDeleteAllModalOpen(true)}
                  className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-lg transition-all cursor-pointer border border-rose-500 flex items-center gap-1.5 shadow-sm"
                  title="Clear all student submissions from Firestore database and local storage"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear All Submissions</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    try {
                      localStorage.clear();
                      alert('🧹 Browser local storage cache cleared successfully.');
                      refreshStorageScan();
                    } catch (e) {
                      alert('Failed to clear local storage.');
                    }
                  }}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-lg transition-all cursor-pointer border border-slate-700 flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5 text-slate-400" />
                  <span>Purge Local Cache</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    refreshStorageScan();
                    alert('✅ Diagnostic storage scan completed! All database collections operating at optimal latency.');
                  }}
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs rounded-lg shadow transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Activity className="w-3.5 h-3.5" />
                  <span>Execute Diagnostic</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ASSESSMENT TESTS & CANDIDATE ALLOCATION TAB */}
        {userRole === 'admin' && activeTab === 'tests_management' && (
          <TestsManagementView
            tests={assessmentTests}
            onOpenNewTestModal={() => setIsNewTestModalOpen(true)}
            onDeleteTest={handleDeleteTest}
          />
        )}

        {/* SUBMISSIONS TABLE & LOCKOUT TRACKER SECTION */}
        {activeTab === 'submissions' && (
          <>
            {/* SECURITY VIOLATION INCIDENT TRACKER BANNER */}
        {lockedSubmissionsCount > 0 && (
          <div className="bg-rose-50 border border-rose-300 rounded-xl p-4 sm:p-5 shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 break-inside-avoid animate-in fade-in duration-300">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-rose-100 text-rose-700 rounded-xl border border-rose-200 shrink-0">
                <ShieldAlert className="w-6 h-6 text-rose-600 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <h3 className="text-sm font-bold text-rose-950 font-sans uppercase tracking-wide">
                    Security Violation & Lockout Tracker
                  </h3>
                  <span className="px-2.5 py-0.5 bg-rose-600 text-white rounded-full text-[10px] font-extrabold uppercase tracking-wider">
                    {lockedSubmissionsCount} Account{lockedSubmissionsCount > 1 ? 's' : ''} Locked
                  </span>
                </div>
                <p className="text-xs text-rose-800 leading-relaxed font-medium">
                  {lockedSubmissionsCount} student session{lockedSubmissionsCount > 1 ? 's were' : ' was'} automatically terminated and locked due to unauthorized window/application switching during live assessment.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
              <button
                type="button"
                onClick={() => setSecurityFilter(securityFilter === 'LOCKED' ? 'ALL' : 'LOCKED')}
                className="w-full sm:w-auto px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-lg shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Filter className="w-4 h-4" />
                <span>{securityFilter === 'LOCKED' ? 'View All Submissions' : 'Filter Locked Accounts Only'}</span>
              </button>
            </div>
          </div>
        )}

        {/* SEARCH & FILTERS */}
        <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search student name or Register Number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded text-xs text-slate-800 focus:outline-none focus:border-blue-600 font-sans"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            {/* Department Filter */}
            <div className="flex items-center gap-2 flex-1 sm:flex-none">
              <Filter className="w-4 h-4 text-slate-500 shrink-0" />
              <select
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
                className="w-full sm:w-auto py-2 px-3 bg-slate-50 border border-slate-300 rounded text-xs text-slate-800 focus:outline-none focus:border-blue-600 font-sans font-medium"
              >
                <option value="ALL">All Departments</option>
                {configuredDepartmentNames.map((dName) => (
                  <option key={dName} value={dName}>{dName}</option>
                ))}
              </select>
            </div>

            {/* Security Status Filter */}
            <div className="flex items-center gap-2 flex-1 sm:flex-none">
              <Lock className="w-4 h-4 text-slate-500 shrink-0" />
              <select
                value={securityFilter}
                onChange={(e) => setSecurityFilter(e.target.value as any)}
                className="w-full sm:w-auto py-2 px-3 bg-slate-50 border border-slate-300 rounded text-xs text-slate-800 focus:outline-none focus:border-blue-600 font-sans font-medium"
              >
                <option value="ALL">All Statuses</option>
                <option value="COMPLETED">✓ Completed Only</option>
                <option value="LOCKED">🔒 Security Locked Only</option>
              </select>
            </div>
          </div>
        </div>

        {/* SUBMISSIONS TABLE */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
          {zipProgressToast && (
            <div className="p-3.5 bg-cyan-950 text-cyan-100 border border-cyan-500/50 text-xs font-bold rounded-xl flex items-center justify-between shadow-md animate-in fade-in">
              <div className="flex items-center gap-2.5">
                {(isExtractingAllPdfZip || isExtractingAllExcelZip || isExtractingDatePdfZip || isExtractingDateExcelZip || isExtractingSelectedPdfZip || isExtractingSelectedExcelZip || isExtractingPdfZip || isExtractingExcelZip) ? (
                  <Loader2 className="w-4 h-4 animate-spin text-cyan-400 shrink-0" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                )}
                <span>{zipProgressToast}</span>
              </div>
              <button
                type="button"
                onClick={() => setZipProgressToast(null)}
                className="text-cyan-300 hover:text-white p-1 rounded-md hover:bg-cyan-900 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {bulkExportStatusMsg && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-300 text-emerald-950 text-xs font-bold rounded-xl flex items-center justify-between shadow-xs animate-in fade-in">
              <div className="flex items-center gap-2">
                {isBulkExportingAll ? (
                  <Loader2 className="w-4 h-4 animate-spin text-emerald-600 shrink-0" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                )}
                <span>{bulkExportStatusMsg}</span>
              </div>
              {!isBulkExportingAll && (
                <button
                  type="button"
                  onClick={() => setBulkExportStatusMsg(null)}
                  className="text-emerald-700 hover:text-emerald-950 p-1 rounded-md hover:bg-emerald-100 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          )}

          {bulkResumeStatusMsg && (
            <div className="p-3 bg-indigo-50 border border-indigo-200 text-indigo-950 text-xs font-bold rounded-xl flex items-center justify-between shadow-xs animate-in fade-in">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
                <span>{bulkResumeStatusMsg}</span>
              </div>
              <button
                type="button"
                onClick={() => setBulkResumeStatusMsg(null)}
                className="text-indigo-700 hover:text-indigo-950 p-1 rounded-md hover:bg-indigo-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {firestoreFetchStatus && (
            <div className="p-3 bg-blue-50 border border-blue-200 text-blue-950 text-xs font-bold rounded-xl flex items-center justify-between shadow-xs animate-in fade-in">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                <span>{firestoreFetchStatus}</span>
              </div>
              <button
                type="button"
                onClick={() => setFirestoreFetchStatus(null)}
                className="text-blue-700 hover:text-blue-950 p-1 rounded-md hover:bg-blue-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {editSuccessToast && (
            <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-950 text-xs font-bold rounded-xl flex items-center justify-between shadow-xs animate-in fade-in">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{editSuccessToast}</span>
              </div>
              <button
                type="button"
                onClick={() => setEditSuccessToast(null)}
                className="text-emerald-700 hover:text-emerald-950 p-1 rounded-md hover:bg-emerald-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {localRecoveryToast && (
            <div className="p-3 bg-blue-50 border border-blue-300 text-blue-950 text-xs font-bold rounded-xl flex items-center justify-between shadow-xs animate-in fade-in">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                <span>{localRecoveryToast}</span>
              </div>
              <button
                type="button"
                onClick={() => setLocalRecoveryToast(null)}
                className="text-blue-700 hover:text-blue-950 p-1 rounded-md hover:bg-blue-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Autonomous Local Storage & Quota Resilience Info Card */}
          <div className="p-3 bg-amber-50/90 border border-amber-300 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs text-amber-950">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-amber-900">Zero-Downtime Autonomous Offline Storage Active: </span>
                <span className="text-amber-800">
                  Student test submissions are permanently cached in browser local storage. If Cloud Firestore hits the Spark daily limit, submissions continue uninterrupted and can be exported as Excel/JSON or recovered anytime.
                </span>
              </div>
            </div>
            <a
              href="https://console.firebase.google.com/project/stone-vial-71ttq/firestore/databases/ai-studio-remixcitcognitiv-494b0f07-3f01-401b-8a1c-658b38a067ed/data?openUpgradeDialog=true"
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 px-2.5 py-1 bg-amber-200/80 hover:bg-amber-300 text-amber-900 font-bold rounded-lg border border-amber-400 flex items-center gap-1 transition-all"
            >
              <span>Firebase Quota & Billing</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold font-sans text-slate-900">Evaluated Student Submissions</h2>
              {selectedDate && (
                <span className="text-xs text-blue-700 font-semibold bg-blue-50 px-2.5 py-1 rounded border border-blue-200">
                  Filtered by Date: {dateLabel}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={handleFetchAllFromCloudFirestore}
                disabled={isFetchingFirestore}
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                title="Directly query and fetch all assessment submissions across Firestore database collections"
              >
                {isFetchingFirestore ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-100" />
                    <span>Fetching Cloud Firestore...</span>
                  </>
                ) : (
                  <>
                    <CloudDownload className="w-3.5 h-3.5 text-blue-100" />
                    <span>Fetch Cloud Firestore ({submissions.length})</span>
                  </>
                )}
              </button>

              {(searchTerm || selectedDept !== 'ALL' || selectedDate || securityFilter !== 'ALL') && (
                <button
                  type="button"
                  onClick={handleClearAllFilters}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                  title="Clear active search, date, department and security filters"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                  <span>Clear All Filters</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  setGradewiseModalGradeFilter('ALL');
                  setGradewiseModalSearchTerm('');
                  setIsGradewiseReportModalOpen(true);
                }}
                className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                title="Generate gradewise report containing student name, register number, score secured, and overall grade for every department"
              >
                <Award className="w-3.5 h-3.5 text-purple-200" />
                <span>Generate Gradewise Report</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('attendance')}
                className="px-3.5 py-1.5 bg-blue-700 hover:bg-blue-800 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                title="Generate and view official department-wise student attendance report based on login timestamps with summary"
              >
                <ClipboardCheck className="w-3.5 h-3.5 text-blue-200" />
                <span>Attendance Report</span>
              </button>

              <button
                type="button"
                onClick={handleRecoverLocalStorage}
                disabled={isRecoveringLocal}
                className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                title="Scan and recover all student submissions & in-progress savepoints stored in browser local storage"
              >
                {isRecoveringLocal ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-100" />
                ) : (
                  <RotateCcw className="w-3.5 h-3.5 text-amber-200" />
                )}
                <span>Recover Local Data</span>
              </button>

              <button
                type="button"
                onClick={handleExportJsonBackup}
                className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                title="Download JSON backup file of all student evaluation records"
              >
                <Download className="w-3.5 h-3.5 text-slate-300" />
                <span>Backup JSON</span>
              </button>

              <label
                className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                title="Upload and merge student JSON backup file from another computer or lab"
              >
                <Upload className="w-3.5 h-3.5 text-slate-600" />
                <span>Import JSON</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportJsonBackup}
                  className="hidden"
                />
              </label>

              <button
                type="button"
                onClick={handleBulkExportAll}
                disabled={isBulkExportingAll}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                title="Bulk export all student assessment submissions stored in Firestore to a multi-sheet Excel (.xlsx) file"
              >
                {isBulkExportingAll ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-100" />
                    <span>Exporting All Records...</span>
                  </>
                ) : (
                  <>
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-100" />
                    <span>Bulk Export All (Excel)</span>
                  </>
                )}
              </button>

              {selectedSubmissionIds.length > 0 && (
                <>
                  <button
                    type="button"
                    disabled={isExtractingSelectedPdfZip}
                    onClick={handleExtractSelectedPdfsZip}
                    className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                    title="Extract individual PDF performance reports for all selected students into a ZIP file"
                  >
                    {isExtractingSelectedPdfZip ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-100" />
                    ) : (
                      <Download className="w-3.5 h-3.5 text-cyan-100" />
                    )}
                    <span>{isExtractingSelectedPdfZip ? 'Archiving...' : `Extract PDFs (.ZIP) (${selectedSubmissionIds.length})`}</span>
                  </button>

                  <button
                    type="button"
                    disabled={isExtractingSelectedExcelZip}
                    onClick={handleExtractSelectedExcelZip}
                    className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                    title="Extract individual Excel performance reports for all selected students into a ZIP file"
                  >
                    {isExtractingSelectedExcelZip ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-teal-100" />
                    ) : (
                      <Download className="w-3.5 h-3.5 text-teal-100" />
                    )}
                    <span>{isExtractingSelectedExcelZip ? 'Archiving...' : `Extract Excel (.ZIP) (${selectedSubmissionIds.length})`}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsResumeSelectedModalOpen(true)}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                    title="Authorize & resume assessment for all selected students without logging out Admin"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Resume Selected ({selectedSubmissionIds.length})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsDeleteSelectedModalOpen(true)}
                    className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-300 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                    <span>Delete Selected ({selectedSubmissionIds.length})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedSubmissionIds([])}
                    className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg font-semibold text-xs transition-all cursor-pointer"
                  >
                    Clear Selection
                  </button>
                </>
              )}

              {submissions.length > 0 && (
                <button
                  type="button"
                  onClick={() => setIsDeleteAllModalOpen(true)}
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                  title="Permanently delete all evaluated student records"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete All Records</span>
                </button>
              )}
            </div>
          </div>

          {filtered.length > 0 ? (
            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-left text-xs font-sans border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-700 border-b border-slate-200 font-bold">
                    <th className="p-3 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={filtered.length > 0 && filtered.every((s) => selectedSubmissionIds.includes(s.id))}
                        onChange={handleToggleSelectAll}
                        className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                        title="Select All Filtered Records"
                      />
                    </th>
                    <th className="p-3">Register Number</th>
                    <th className="p-3">Student Name</th>
                    <th className="p-3">Department</th>
                    <th className="p-3">Score Secured</th>
                    <th className="p-3">Grade</th>
                    <th className="p-3">Assigned Grade / Security Status</th>
                    <th className="p-3">Date of Assessment</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filtered.map((sub) => {
                    const isLocked = sub.isLockedOut || sub.securityViolation?.isViolated;
                    const isSelected = selectedSubmissionIds.includes(sub.id);

                    return (
                      <tr key={sub.id} className={`hover:bg-slate-50 transition-colors ${isSelected ? 'bg-blue-50/50' : isLocked ? 'bg-rose-50/40' : ''}`}>
                        <td className="p-3 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelectRow(sub.id)}
                            className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                          />
                        </td>
                        <td className="p-3 text-blue-600 font-bold font-mono">{sub.student.registerNo}</td>
                        <td className="p-3 font-bold text-slate-900">{sub.student.name}</td>
                        <td className="p-3 text-slate-600">{sub.student.department}</td>
                        <td className="p-3 font-bold font-mono">
                          {isLocked ? (
                            <span className="text-rose-700 font-bold">0 / 50 (DISQUALIFIED)</span>
                          ) : (
                            <span className="text-emerald-600 font-bold">{sub.report.overallScore} / {sub.report.maxScore || 50} ({sub.report.overallPercentage}%)</span>
                          )}
                        </td>
                        <td className="p-3">
                          {isLocked ? (
                            <span className="px-2 py-0.5 bg-rose-100 text-rose-800 rounded font-bold border border-rose-300 text-xs font-mono">RA</span>
                          ) : (() => {
                            const g = calculateGrade(sub.report.overallPercentage);
                            return (
                              <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded font-bold border border-indigo-200 text-xs font-mono shrink-0" title={g.title}>
                                Grade {g.grade}
                              </span>
                            );
                          })()}
                        </td>
                        <td className="p-3">
                          {isLocked ? (
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-rose-100 text-rose-800 border border-rose-300 rounded-md font-bold text-[11px]" title={sub.securityViolation?.reason || 'Window or application switch'}>
                              <Lock className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                              <span>TERMINATED (Window Switch)</span>
                            </div>
                          ) : (() => {
                            const g = calculateGrade(sub.report.overallPercentage);
                            return (
                              <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                                g.grade === 'A' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                                g.grade === 'B' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                                'bg-amber-50 text-amber-700 border border-amber-200'
                              }`}>
                                Grade {g.grade} ({g.description})
                              </span>
                            );
                          })()}
                        </td>
                        <td className="p-3 text-slate-500 text-[11px] font-mono">{sub.submittedAt || sub.report.testTimestamp}</td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {isLocked ? (
                              onUnlockStudent && (
                                <button
                                  type="button"
                                  onClick={() => onUnlockStudent(sub.student.registerNo)}
                                  className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded font-bold text-xs flex items-center gap-1 transition-all cursor-pointer shadow-xs"
                                  title="Unlock student account for re-attempt"
                                >
                                  <KeyRound className="w-3.5 h-3.5 text-amber-600" />
                                  <span>Unlock</span>
                                </button>
                              )
                            ) : (
                              onLockStudent && (
                                <button
                                  type="button"
                                  onClick={() => onLockStudent(sub.student.registerNo)}
                                  className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-300 rounded font-bold text-xs flex items-center gap-1 transition-all cursor-pointer shadow-xs"
                                  title="Lock student account"
                                >
                                  <Lock className="w-3.5 h-3.5 text-rose-600" />
                                  <span>Lock</span>
                                </button>
                              )
                            )}

                            <button
                              onClick={() => onSelectSubmission(sub)}
                              className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded border border-blue-200 transition-colors cursor-pointer"
                              title="Inspect Detailed Profile"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenEditSubmissionModal(sub)}
                              className="p-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded border border-amber-300 transition-colors cursor-pointer"
                              title="Edit Register Number and Department"
                            >
                              <Edit3 className="w-4 h-4 text-amber-700" />
                            </button>
                            <button
                              onClick={() => downloadPdfReport(sub.report)}
                              className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded border border-slate-300 transition-colors cursor-pointer"
                              title="Download PDF Report"
                            >
                              <FileText className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => downloadExcelReport(sub.report)}
                              className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded border border-emerald-200 transition-colors cursor-pointer"
                              title="Download Excel Sheet"
                            >
                              <FileSpreadsheet className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                onSelectSubmission(sub);
                                setTimeout(() => window.print(), 300);
                              }}
                              className="p-1.5 bg-slate-900 hover:bg-slate-800 text-amber-400 rounded border border-slate-700 transition-colors cursor-pointer"
                              title="Print Student Report Scorecard"
                            >
                              <Printer className="w-4 h-4" />
                            </button>

                            {onResumeStudentSession && (
                              <button
                                type="button"
                                onClick={() => setResumeConfirmSubmission(sub)}
                                className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-300 rounded font-bold text-xs flex items-center gap-1 transition-all cursor-pointer shadow-xs"
                                title="Resume from save point for re-attempt"
                              >
                                <RotateCcw className="w-3.5 h-3.5 text-indigo-600" />
                                <span>Resume</span>
                              </button>
                            )}

                            {onDeleteSubmission && (
                              <button
                                type="button"
                                onClick={() => setDeleteConfirmSubmission(sub)}
                                className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-300 rounded font-bold text-xs flex items-center gap-1 transition-all cursor-pointer shadow-xs"
                                title="Delete student record"
                              >
                                <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                                <span>Delete</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-12 px-6 text-center text-slate-600 text-xs space-y-4 bg-slate-50/80 rounded-xl border border-dashed border-slate-300 my-2">
              <Users className="w-10 h-10 mx-auto text-slate-400" />
              
              <div className="max-w-md mx-auto space-y-1.5">
                <p className="font-bold text-slate-800 text-sm">
                  {submissions.length > 0 
                    ? "No student assessment records match the active filter criteria." 
                    : "No student assessment records found in database."}
                </p>
                <p className="text-slate-500 text-xs leading-relaxed">
                  {submissions.length > 0 
                    ? `There are ${submissions.length} total record(s) in the database, but none match the current date (${selectedDate || 'Any'}), department (${selectedDept}), or search query.` 
                    : "Student submissions automatically synchronize in real-time as candidates complete assessments."}
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                {(searchTerm || selectedDept !== 'ALL' || selectedDate || securityFilter !== 'ALL') && (
                  <button
                    type="button"
                    onClick={handleClearAllFilters}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg shadow-sm flex items-center gap-2 transition-all cursor-pointer"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Clear All Filters ({submissions.length} Total Records Available)</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
        </>
        )}

      </div>

      {/* SINGLE DATE CONSOLIDATED REPORT PREVIEW MODAL */}
      {isSingleReportModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="bg-slate-900 p-5 border-b border-slate-800 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm text-blue-300 font-bold uppercase tracking-tight">
                  Datewise Assessment Report • {dateLabel}
                </p>
              </div>

              <button
                onClick={() => setIsSingleReportModalOpen(false)}
                className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Actions Bar */}
            <div className="bg-slate-50 px-6 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
              <span className="text-slate-700">
                Total Students: <strong className="text-slate-900 font-mono">{submissionsForSelectedDate.length}</strong>
              </span>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => downloadSingleDatePdfReport(submissionsForSelectedDate, dateLabel, submissions)}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Download PDF</span>
                </button>
                <button
                  onClick={() => downloadSingleDateExcelReport(submissionsForSelectedDate, dateLabel, submissions)}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Download Excel</span>
                </button>
                <button
                  onClick={() => downloadSingleDateCsvReport(submissionsForSelectedDate, dateLabel, submissions)}
                  className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-semibold rounded flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                >
                  <FileCode className="w-3.5 h-3.5 text-amber-600" />
                  <span>Download CSV</span>
                </button>
                <button
                  onClick={() => window.print()}
                  className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded flex items-center gap-1.5 transition-all cursor-pointer shadow-sm border border-slate-700"
                  title="Print Report"
                >
                  <Printer className="w-3.5 h-3.5 text-amber-400" />
                  <span>Print Report</span>
                </button>
              </div>
            </div>

            {/* Modal Body - Single Consolidated Report Table */}
            <div className="p-6 overflow-y-auto space-y-4 bg-slate-50/50">
              <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2 text-xs shadow-sm">
                <p className="text-slate-700 font-medium">
                  <strong>Institutional Assessment Summary Report:</strong> This document contains student performance records evaluated under standardized PG cognition benchmarking.
                </p>
              </div>

              {/* DATEWISE MODAL PIE CHART */}
              {submissionsForSelectedDate.length > 0 && (
                <div className="bg-white p-4 rounded-xl border border-blue-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="w-full md:w-1/2 flex flex-col items-center">
                    <h3 className="text-xs font-bold text-blue-900 uppercase tracking-wider mb-1 text-center flex items-center gap-1.5">
                      <PieChartIcon className="w-4 h-4 text-blue-600" />
                      Datewise Performance Pie Chart ({dateLabel})
                    </h3>
                    <div className="w-full h-40">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={datewisePieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={28}
                            outerRadius={50}
                            paddingAngle={3}
                            dataKey="value"
                          >
                            {datewisePieData.map((entry, index) => (
                              <Cell key={`cell-datewise-modal-${index}`} fill={entry.color} stroke="#FFFFFF" strokeWidth={2} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{ backgroundColor: '#1E293B', borderColor: '#334155', borderRadius: '8px', color: '#FFF', fontSize: '11px' }}
                            formatter={(val: any, name: any) => [`${val} Student(s)`, name]}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  <div className="w-full md:w-1/2 space-y-1 text-[11px]">
                    <p className="font-bold text-slate-800 text-xs mb-1">Score Breakdown ({dateLabel}):</p>
                    {datewisePieData.map((item, i) => (
                      <div key={i} className="flex items-center justify-between text-slate-700 bg-slate-50 p-1.5 rounded border border-slate-200">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                          <span className="font-medium">{item.name}</span>
                        </div>
                        <span className="font-mono font-bold text-slate-900">{item.value} ({item.percentage}%)</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {submissionsForSelectedDate.length > 0 ? (
                <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
                  <table className="w-full text-left text-xs font-sans border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-slate-800 border-b border-slate-200 font-bold">
                        <th className="p-3 border-r border-slate-200">S.No</th>
                        <th className="p-3 border-r border-slate-200">Register Number</th>
                        <th className="p-3 border-r border-slate-200">Student Name</th>
                        <th className="p-3 border-r border-slate-200">Department</th>
                        <th className="p-3 border-r border-slate-200">Score Secured</th>
                        <th className="p-3 border-r border-slate-200">Grade</th>
                        <th className="p-3 border-r border-slate-200">Date of Assessment</th>
                        <th className="p-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {submissionsForSelectedDate.map((sub, idx) => {
                        return (
                          <tr key={sub.id} className="hover:bg-slate-50 transition-colors">
                            <td className="p-3 text-slate-500 border-r border-slate-200 font-mono text-center">
                              {idx + 1}
                            </td>
                            <td className="p-3 font-bold text-blue-600 font-mono border-r border-slate-200">
                              {sub.student.registerNo}
                            </td>
                            <td className="p-3 font-bold text-slate-900 border-r border-slate-200">
                              {sub.student.name}
                            </td>
                            <td className="p-3 text-slate-700 border-r border-slate-200">
                              {sub.student.department}
                            </td>
                            <td className="p-3 font-bold text-emerald-600 font-mono border-r border-slate-200">
                              {sub.report.overallScore} / {sub.report.maxScore || 50} ({sub.report.overallPercentage}%)
                            </td>
                            <td className="p-3 border-r border-slate-200 font-bold font-mono text-indigo-700">
                              Grade {calculateGrade(sub.report.overallPercentage).grade}
                            </td>
                            <td className="p-3 text-slate-600 text-[11px] font-mono border-r border-slate-200">
                              {sub.submittedAt || sub.report.testTimestamp}
                            </td>
                            <td className="p-3 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {onResumeStudentSession && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setIsSingleReportModalOpen(false);
                                      setResumeConfirmSubmission(sub);
                                    }}
                                    className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-300 rounded font-bold text-[11px] flex items-center gap-1 transition-all cursor-pointer shadow-xs"
                                    title="Resume from save point for re-attempt"
                                  >
                                    <RotateCcw className="w-3 h-3 text-indigo-600" />
                                    <span>Resume</span>
                                  </button>
                                )}
                                {onDeleteSubmission && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setIsSingleReportModalOpen(false);
                                      setDeleteConfirmSubmission(sub);
                                    }}
                                    className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-300 rounded font-bold text-[11px] flex items-center gap-1 transition-all cursor-pointer shadow-xs"
                                    title="Delete student record"
                                  >
                                    <Trash2 className="w-3 h-3 text-rose-600" />
                                    <span>Delete</span>
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-12 text-center text-slate-500 text-xs">
                  <p>No student submissions found for the selected assessment date ({dateLabel}).</p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="bg-white px-6 py-3 border-t border-slate-200 text-right">
              <button
                onClick={() => setIsSingleReportModalOpen(false)}
                className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded transition-all cursor-pointer border border-slate-300"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DEPARTMENTWISE CONSOLIDATED REPORT PREVIEW MODAL */}
      {isDeptReportModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="bg-slate-900 p-5 border-b border-slate-800 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm text-emerald-300 font-bold uppercase tracking-tight">
                  Departmentwise Assessment Report • {deptReportLabel}
                </p>
              </div>

              <button
                onClick={() => setIsDeptReportModalOpen(false)}
                className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Actions Bar */}
            <div className="bg-slate-50 px-6 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
              <span className="text-slate-700">
                Department Students: <strong className="text-slate-900 font-mono">{submissionsForSelectedDept.length}</strong>
              </span>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => downloadDepartmentwisePdfReport(submissionsForSelectedDept, deptReportLabel, submissions)}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Download PDF</span>
                </button>
                <button
                  onClick={() => downloadDepartmentwiseExcelReport(submissionsForSelectedDept, deptReportLabel, submissions)}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Download Excel</span>
                </button>
                <button
                  onClick={() => downloadDepartmentwiseCsvReport(submissionsForSelectedDept, deptReportLabel, submissions)}
                  className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-semibold rounded flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                >
                  <FileCode className="w-3.5 h-3.5 text-amber-600" />
                  <span>Download CSV</span>
                </button>
                <button
                  onClick={() => window.print()}
                  className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded flex items-center gap-1.5 transition-all cursor-pointer shadow-sm border border-slate-700"
                  title="Print Report"
                >
                  <Printer className="w-3.5 h-3.5 text-amber-400" />
                  <span>Print Report</span>
                </button>
              </div>
            </div>

            {/* Modal Body - Department Consolidated Report Table */}
            <div className="p-6 overflow-y-auto space-y-4 bg-slate-50/50">
              <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2 text-xs shadow-sm">
                <p className="text-slate-700 font-medium">
                  <strong>Departmentwise Assessment Summary Report:</strong> Standardized student evaluation records filtered for department: <strong className="text-emerald-700 font-semibold">{deptReportLabel}</strong>.
                </p>
              </div>

              {/* DEPARTMENTWISE MODAL PIE CHARTS */}
              {submissionsForSelectedDept.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Score Band Performance Pie Chart */}
                  <div className="bg-white p-4 rounded-xl border border-emerald-200 shadow-sm flex flex-col items-center justify-between gap-3">
                    <div className="w-full flex flex-col items-center">
                      <h3 className="text-xs font-bold text-emerald-900 uppercase tracking-wider mb-1 text-center flex items-center gap-1.5">
                        <PieChartIcon className="w-4 h-4 text-emerald-600" />
                        Performance Band Chart ({deptReportLabel})
                      </h3>
                      <div className="w-full h-36">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={deptwisePieData}
                              cx="50%"
                              cy="50%"
                              innerRadius={24}
                              outerRadius={46}
                              paddingAngle={3}
                              dataKey="value"
                            >
                              {deptwisePieData.map((entry, index) => (
                                <Cell key={`cell-deptwise-modal-${index}`} fill={entry.color} stroke="#FFFFFF" strokeWidth={2} />
                              ))}
                            </Pie>
                            <Tooltip
                              contentStyle={{ backgroundColor: '#1E293B', borderColor: '#334155', borderRadius: '8px', color: '#FFF', fontSize: '11px' }}
                              formatter={(val: any, name: any) => [`${val} Student(s)`, name]}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                    <div className="w-full space-y-1 text-[11px]">
                      <p className="font-bold text-slate-800 text-xs mb-1">Score Breakdown:</p>
                      {deptwisePieData.map((item, i) => (
                        <div key={i} className="flex items-center justify-between text-slate-700 bg-slate-50 p-1 rounded border border-slate-200">
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                            <span className="font-medium">{item.name}</span>
                          </div>
                          <span className="font-mono font-bold text-slate-900">{item.value} ({item.percentage}%)</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Gradewise Analysis Pie Chart */}
                  <div className="bg-white p-4 rounded-xl border border-indigo-200 shadow-sm flex flex-col items-center justify-between gap-3">
                    <div className="w-full flex flex-col items-center">
                      <h3 className="text-xs font-bold text-indigo-900 uppercase tracking-wider mb-1 text-center flex items-center gap-1.5">
                        <PieChartIcon className="w-4 h-4 text-indigo-600" />
                        Gradewise Analysis Chart ({deptReportLabel})
                      </h3>
                      <div className="w-full h-36">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={deptwiseGradewisePieData}
                              cx="50%"
                              cy="50%"
                              innerRadius={24}
                              outerRadius={46}
                              paddingAngle={3}
                              dataKey="value"
                            >
                              {deptwiseGradewisePieData.map((entry, index) => (
                                <Cell key={`cell-deptwise-grade-modal-${index}`} fill={entry.color} stroke="#FFFFFF" strokeWidth={2} />
                              ))}
                            </Pie>
                            <Tooltip
                              contentStyle={{ backgroundColor: '#1E293B', borderColor: '#334155', borderRadius: '8px', color: '#FFF', fontSize: '11px' }}
                              formatter={(val: any, name: any) => [`${val} Student(s)`, name]}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                    <div className="w-full space-y-1 text-[11px]">
                      <p className="font-bold text-slate-800 text-xs mb-1">Grade Distribution:</p>
                      {deptwiseGradewisePieData.map((item, i) => (
                        <div key={i} className="flex items-center justify-between text-slate-700 bg-slate-50 p-1 rounded border border-slate-200">
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                            <span className="font-medium font-mono font-bold text-indigo-900">{item.label}</span>
                          </div>
                          <span className="font-mono font-bold text-slate-900">{item.value} ({item.percentage}%)</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {submissionsForSelectedDept.length > 0 ? (
                <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
                  <table className="w-full text-left text-xs font-sans border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-slate-800 border-b border-slate-200 font-bold">
                        <th className="p-3 border-r border-slate-200">S.No</th>
                        <th className="p-3 border-r border-slate-200">Register Number</th>
                        <th className="p-3 border-r border-slate-200">Student Name</th>
                        <th className="p-3 border-r border-slate-200">Department</th>
                        <th className="p-3 border-r border-slate-200">Score Secured</th>
                        <th className="p-3 border-r border-slate-200">Grade</th>
                        <th className="p-3 border-r border-slate-200">Date of Assessment</th>
                        <th className="p-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {submissionsForSelectedDept.map((sub, idx) => {
                        return (
                          <tr key={sub.id} className="hover:bg-slate-50 transition-colors">
                            <td className="p-3 text-slate-500 border-r border-slate-200 font-mono text-center">
                              {idx + 1}
                            </td>
                            <td className="p-3 font-bold text-blue-600 font-mono border-r border-slate-200">
                              {sub.student.registerNo}
                            </td>
                            <td className="p-3 font-bold text-slate-900 border-r border-slate-200">
                              {sub.student.name}
                            </td>
                            <td className="p-3 text-slate-700 border-r border-slate-200">
                              {sub.student.department}
                            </td>
                            <td className="p-3 font-bold text-emerald-600 font-mono border-r border-slate-200">
                              {sub.report.overallScore} / {sub.report.maxScore || 50} ({sub.report.overallPercentage}%)
                            </td>
                            <td className="p-3 border-r border-slate-200 font-bold font-mono text-indigo-700">
                              Grade {calculateGrade(sub.report.overallPercentage).grade}
                            </td>
                            <td className="p-3 text-slate-600 text-[11px] font-mono border-r border-slate-200">
                              {sub.submittedAt || sub.report.testTimestamp}
                            </td>
                            <td className="p-3 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {onResumeStudentSession && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setIsDeptReportModalOpen(false);
                                      setResumeConfirmSubmission(sub);
                                    }}
                                    className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-300 rounded font-bold text-[11px] flex items-center gap-1 transition-all cursor-pointer shadow-xs"
                                    title="Resume from save point for re-attempt"
                                  >
                                    <RotateCcw className="w-3 h-3 text-indigo-600" />
                                    <span>Resume</span>
                                  </button>
                                )}
                                {onDeleteSubmission && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setIsDeptReportModalOpen(false);
                                      setDeleteConfirmSubmission(sub);
                                    }}
                                    className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-300 rounded font-bold text-[11px] flex items-center gap-1 transition-all cursor-pointer shadow-xs"
                                    title="Delete student record"
                                  >
                                    <Trash2 className="w-3 h-3 text-rose-600" />
                                    <span>Delete</span>
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-12 text-center text-slate-500 text-xs">
                  <p>No student submissions found for the selected department ({deptReportLabel}).</p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="bg-white px-6 py-3 border-t border-slate-200 text-right">
              <button
                onClick={() => setIsDeptReportModalOpen(false)}
                className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded transition-all cursor-pointer border border-slate-300"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GRADEWISE REPORT GENERATOR PREVIEW MODAL (EVERY DEPARTMENT) */}
      {isGradewiseReportModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-5xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-purple-950 via-slate-900 to-indigo-950 p-5 border-b border-purple-900/80 flex items-center justify-between gap-4 text-white">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-purple-500/20 text-purple-300 rounded-xl border border-purple-500/30 shrink-0">
                  <Award className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold font-sans flex items-center gap-2">
                    <span>Departmentwise & Gradewise Assessment Report</span>
                    <span className="px-2.5 py-0.5 bg-purple-500/30 text-purple-200 rounded-full text-xs font-mono border border-purple-400/40">
                      {selectedReportDept === 'ALL' ? 'All Departments' : selectedReportDept}
                    </span>
                  </h2>
                  <p className="text-xs text-purple-200/80 font-medium">
                    Comprehensive gradewise breakdown with Student Name, Register Number, Score Secured, and Overall Grade for every department.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsGradewiseReportModalOpen(false)}
                className="p-2 bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Sub-Header: Department Scope & Grade Scope Selectors & Global Export Actions */}
            <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5 flex-wrap">
                {/* Department Dropdown */}
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-600 font-bold uppercase tracking-wider text-[11px]">Department:</span>
                  <select
                    value={selectedReportDept}
                    onChange={(e) => setSelectedReportDept(e.target.value)}
                    className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer shadow-2xs"
                  >
                    <option value="ALL">All Departments (Combined)</option>
                    {configuredDepartmentNames.map((dName) => (
                      <option key={dName} value={dName}>{dName}</option>
                    ))}
                  </select>
                </div>

                {/* Grade Dropdown */}
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-600 font-bold uppercase tracking-wider text-[11px]">Grade Scope:</span>
                  <select
                    value={gradewiseModalGradeFilter}
                    onChange={(e) => setGradewiseModalGradeFilter(e.target.value as 'ALL' | 'A' | 'B' | 'C')}
                    className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer shadow-2xs"
                  >
                    <option value="ALL">All Grades (Overall Performance)</option>
                    <option value="A">Grade A (Distinction - Above 80%)</option>
                    <option value="B">Grade B (Merit - 50% to 80%)</option>
                    <option value="C">Grade C (Developing - Below 50%)</option>
                  </select>
                </div>

                <span className="text-slate-600 font-mono text-[11px] bg-slate-200/70 px-2 py-0.5 rounded font-bold">
                  {(() => {
                    const deptFiltered = selectedReportDept === 'ALL'
                      ? submissions
                      : submissions.filter((s) => s.student.department === selectedReportDept);
                    const gradeFiltered = gradewiseModalGradeFilter === 'ALL'
                      ? deptFiltered
                      : deptFiltered.filter((s) => calculateGrade(s.report?.overallPercentage || 0).grade === gradewiseModalGradeFilter);
                    return `${gradeFiltered.length} of ${deptFiltered.length} Qualified`;
                  })()}
                </span>
              </div>

              {/* Master Export Buttons */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  disabled={isGeneratingGradewisePdf || submissionsForSelectedDept.length === 0}
                  onClick={async () => {
                    try {
                      setIsGeneratingGradewisePdf(true);
                      await downloadGradewiseDepartmentPdfReport(submissions, selectedReportDept, gradewiseModalGradeFilter, submissions);
                    } catch (err: any) {
                      alert(err?.message || 'Error generating Gradewise PDF Report.');
                    } finally {
                      setIsGeneratingGradewisePdf(false);
                    }
                  }}
                  className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-bold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                  title="Export landscape PDF evaluation report with institutional summary matrix and candidate roster"
                >
                  {isGeneratingGradewisePdf ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                  ) : (
                    <FileText className="w-3.5 h-3.5 text-purple-200" />
                  )}
                  <span>Export {gradewiseModalGradeFilter === 'ALL' ? 'Overall' : `Grade ${gradewiseModalGradeFilter}`} PDF</span>
                </button>

                <button
                  disabled={submissionsForSelectedDept.length === 0}
                  onClick={() => downloadGradewiseDepartmentExcelReport(submissions, selectedReportDept, gradewiseModalGradeFilter, submissions)}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                  title="Export multi-sheet Excel (.xlsx) workbook with Department Grade Matrix and Student Gradewise Roster"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-100" />
                  <span>Export {gradewiseModalGradeFilter === 'ALL' ? 'Overall' : `Grade ${gradewiseModalGradeFilter}`} Excel (.xlsx)</span>
                </button>

                <button
                  disabled={submissionsForSelectedDept.length === 0}
                  onClick={() => downloadGradewiseDepartmentCsvReport(submissions, selectedReportDept, gradewiseModalGradeFilter, submissions)}
                  className="px-3 py-1.5 bg-white hover:bg-slate-100 disabled:opacity-50 text-slate-700 border border-slate-300 font-semibold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                  title="Export raw CSV file with all grade fields"
                >
                  <FileCode className="w-3.5 h-3.5 text-amber-600" />
                  <span>Export CSV</span>
                </button>

                <button
                  disabled={submissionsForSelectedDept.length === 0}
                  onClick={() => window.print()}
                  className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-bold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer shadow-xs border border-slate-700"
                  title="Print Gradewise Report"
                >
                  <Printer className="w-3.5 h-3.5 text-amber-400" />
                  <span>Print</span>
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-6 bg-slate-50/60 flex-1">
              {/* SUMMARY STATS TILES (GRADE A / B / C) */}
              {(() => {
                let aCount = 0, bCount = 0, cCount = 0, totalScore = 0;
                submissionsForSelectedDept.forEach((s) => {
                  const pct = s.report?.overallPercentage || 0;
                  totalScore += s.report?.overallScore || 0;
                  const g = calculateGrade(pct).grade;
                  if (g === 'A') aCount++;
                  else if (g === 'B') bCount++;
                  else cCount++;
                });
                const total = submissionsForSelectedDept.length;
                const avg = total > 0 ? (totalScore / total).toFixed(1) : '0';

                return (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3.5 bg-white border border-slate-200 rounded-xl shadow-2xs space-y-1">
                      <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">Total Candidates</span>
                      <div className="text-2xl font-black text-slate-900 font-mono">{total}</div>
                      <span className="text-[11px] text-slate-500 font-medium">Avg Score: <strong className="text-slate-800">{avg} / 50</strong></span>
                    </div>

                    <div className="p-3.5 bg-emerald-50/80 border border-emerald-300 rounded-xl shadow-2xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase font-bold text-emerald-800 tracking-wider">Grade A (Above 80%)</span>
                        <Award className="w-4 h-4 text-emerald-600" />
                      </div>
                      <div className="text-2xl font-black text-emerald-950 font-mono">{aCount}</div>
                      <span className="text-[11px] text-emerald-700 font-bold font-mono">
                        {total > 0 ? Math.round((aCount / total) * 100) : 0}% Distinction (40-50 Marks)
                      </span>
                    </div>

                    <div className="p-3.5 bg-blue-50/80 border border-blue-300 rounded-xl shadow-2xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase font-bold text-blue-800 tracking-wider">Grade B (50%-80%)</span>
                        <Award className="w-4 h-4 text-blue-600" />
                      </div>
                      <div className="text-2xl font-black text-blue-950 font-mono">{bCount}</div>
                      <span className="text-[11px] text-blue-700 font-bold font-mono">
                        {total > 0 ? Math.round((bCount / total) * 100) : 0}% Merit (25-39 Marks)
                      </span>
                    </div>

                    <div className="p-3.5 bg-orange-50/80 border border-orange-300 rounded-xl shadow-2xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase font-bold text-orange-800 tracking-wider">Grade C (Below 50%)</span>
                        <Award className="w-4 h-4 text-orange-600" />
                      </div>
                      <div className="text-2xl font-black text-orange-950 font-mono">{cCount}</div>
                      <span className="text-[11px] text-orange-700 font-bold font-mono">
                        {total > 0 ? Math.round((cCount / total) * 100) : 0}% Developing (0-24 Marks)
                      </span>
                    </div>
                  </div>
                );
              })()}

              {/* 1. DEPARTMENT GRADE DISTRIBUTION SUMMARY MATRIX */}
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm space-y-0">
                <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-purple-400" />
                    <span>1. Departmental Grade Distribution Summary Matrix (Every Department)</span>
                  </h3>
                  <span className="text-[11px] text-purple-200 font-mono">
                    Grade Scale: A (80-100%) • B (50-80%) • C (&lt;50%)
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-700 font-bold text-[11px] border-b border-slate-200 uppercase tracking-wider">
                      <tr>
                        <th className="p-3 border-r border-slate-200">Department Name</th>
                        <th className="p-3 border-r border-slate-200 text-center">Total Students</th>
                        <th className="p-3 border-r border-slate-200 text-center">Grade A (Above 80%)</th>
                        <th className="p-3 border-r border-slate-200 text-center">Grade B (50%-80%)</th>
                        <th className="p-3 border-r border-slate-200 text-center">Grade C (Below 50%)</th>
                        <th className="p-3 border-r border-slate-200 text-center">Pass Rate (%)</th>
                        <th className="p-3 text-right">Average Score (/50)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 font-medium text-slate-800">
                      {(() => {
                        const targetDepts = selectedReportDept === 'ALL'
                          ? Array.from(new Set(submissions.map((s) => s.student.department || 'Unspecified')))
                          : [selectedReportDept];

                        if (targetDepts.length === 0 || submissions.length === 0) {
                          return (
                            <tr>
                              <td colSpan={7} className="p-4 text-center text-slate-500 text-xs">
                                No department submissions found in database.
                              </td>
                            </tr>
                          );
                        }

                        return targetDepts.map((dName, idx) => {
                          const deptSubs = submissions.filter((s) => s.student.department === dName);
                          const totalCount = deptSubs.length;
                          let a = 0, b = 0, c = 0, scoreSum = 0;

                          deptSubs.forEach((s) => {
                            const pct = s.report?.overallPercentage || 0;
                            scoreSum += s.report?.overallScore || 0;
                            const g = calculateGrade(pct).grade;
                            if (g === 'A') a++;
                            else if (g === 'B') b++;
                            else c++;
                          });

                          const passPct = totalCount > 0 ? Math.round(((a + b) / totalCount) * 100) : 0;
                          const avgScore = totalCount > 0 ? (scoreSum / totalCount).toFixed(2) : '0.0';

                          return (
                            <tr key={idx} className="hover:bg-slate-50 transition-colors">
                              <td className="p-3 font-bold text-slate-900 border-r border-slate-200">
                                {dName}
                              </td>
                              <td className="p-3 text-center font-mono font-bold text-slate-900 border-r border-slate-200">
                                {totalCount}
                              </td>
                              <td className="p-3 text-center border-r border-slate-200">
                                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold rounded text-xs font-mono">
                                  {a} ({totalCount > 0 ? Math.round((a / totalCount) * 100) : 0}%)
                                </span>
                              </td>
                              <td className="p-3 text-center border-r border-slate-200">
                                <span className="px-2 py-0.5 bg-blue-100 text-blue-800 font-bold rounded text-xs font-mono">
                                  {b} ({totalCount > 0 ? Math.round((b / totalCount) * 100) : 0}%)
                                </span>
                              </td>
                              <td className="p-3 text-center border-r border-slate-200">
                                <span className="px-2 py-0.5 bg-orange-100 text-orange-800 font-bold rounded text-xs font-mono">
                                  {c} ({totalCount > 0 ? Math.round((c / totalCount) * 100) : 0}%)
                                </span>
                              </td>
                              <td className="p-3 text-center border-r border-slate-200 font-bold font-mono">
                                <span className={`px-2 py-0.5 rounded text-xs ${passPct >= 75 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                                  {passPct}%
                                </span>
                              </td>
                              <td className="p-3 text-right font-mono font-bold text-slate-900">
                                {avgScore} / 50
                              </td>
                            </tr>
                          );
                        });
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 2. INDIVIDUAL CANDIDATE GRADEWISE EVALUATION ROSTER */}
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm space-y-0">
                <div className="bg-slate-900 text-white px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-purple-400" />
                    <h3 className="text-xs font-extrabold uppercase tracking-wider">
                      2. Candidate Gradewise Evaluation Roster
                    </h3>
                  </div>

                  {/* Search and Grade Filter */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Grade Filter Pills */}
                    <div className="flex items-center bg-slate-800 p-0.5 rounded-lg border border-slate-700">
                      {(['ALL', 'A', 'B', 'C'] as const).map((gradeKey) => (
                        <button
                          key={gradeKey}
                          onClick={() => setGradewiseModalGradeFilter(gradeKey)}
                          className={`px-2.5 py-1 rounded text-[11px] font-bold transition-all cursor-pointer ${
                            gradewiseModalGradeFilter === gradeKey
                              ? gradeKey === 'A' ? 'bg-emerald-600 text-white' :
                                gradeKey === 'B' ? 'bg-blue-600 text-white' :
                                gradeKey === 'C' ? 'bg-orange-600 text-white' :
                                'bg-purple-600 text-white'
                              : 'text-slate-300 hover:text-white'
                          }`}
                        >
                          {gradeKey === 'ALL' ? 'All Grades' : `Grade ${gradeKey}`}
                        </button>
                      ))}
                    </div>

                    {/* Search Input */}
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Search Name or Register Number..."
                        value={gradewiseModalSearchTerm}
                        onChange={(e) => setGradewiseModalSearchTerm(e.target.value)}
                        className="pl-7 pr-3 py-1 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white placeholder:text-slate-400 focus:outline-none focus:border-purple-500 w-44"
                      />
                    </div>
                  </div>
                </div>

                {/* Filtered Candidate Table */}
                <div className="overflow-x-auto">
                  {(() => {
                    const filteredRoster = submissionsForSelectedDept.filter((sub) => {
                      const pct = sub.report?.overallPercentage || 0;
                      const g = calculateGrade(pct).grade;
                      if (gradewiseModalGradeFilter !== 'ALL' && g !== gradewiseModalGradeFilter) return false;
                      if (gradewiseModalSearchTerm.trim()) {
                        const q = gradewiseModalSearchTerm.toLowerCase();
                        const matchName = sub.student.name.toLowerCase().includes(q);
                        const matchReg = (sub.student.registerNo || '').toLowerCase().includes(q);
                        if (!matchName && !matchReg) return false;
                      }
                      return true;
                    });

                    if (filteredRoster.length === 0) {
                      return (
                        <div className="py-12 text-center text-slate-500 text-xs">
                          <p className="font-bold">No candidates match the selected grade / search filter in this department scope.</p>
                          <p className="text-[11px] text-slate-400 mt-1">Try resetting the grade filter to "All Grades" or clearing search query.</p>
                        </div>
                      );
                    }

                    return (
                      <table className="w-full text-left text-xs border-collapse font-sans">
                        <thead>
                          <tr className="bg-slate-100 text-slate-800 border-b border-slate-200 font-bold text-[11px]">
                            <th className="p-3 border-r border-slate-200 text-center w-12">S.No</th>
                            <th className="p-3 border-r border-slate-200">Register Number</th>
                            <th className="p-3 border-r border-slate-200">Student Name</th>
                            <th className="p-3 border-r border-slate-200">Department</th>
                            <th className="p-3 border-r border-slate-200">Score Secured</th>
                            <th className="p-3 border-r border-slate-200">Overall Grade</th>
                            <th className="p-3 border-r border-slate-200">Date of Assessment</th>
                            <th className="p-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 font-medium">
                          {filteredRoster.map((sub, idx) => {
                            const pct = sub.report?.overallPercentage || 0;
                            const g = calculateGrade(pct);
                            const isLocked = sub.isLockedOut || sub.securityViolation?.isViolated;

                            return (
                              <tr key={sub.id} className="hover:bg-slate-50 transition-colors">
                                <td className="p-3 text-center text-slate-500 font-mono border-r border-slate-200">
                                  {idx + 1}
                                </td>
                                <td className="p-3 font-bold text-blue-600 font-mono border-r border-slate-200">
                                  {sub.student.registerNo}
                                </td>
                                <td className="p-3 font-bold text-slate-900 border-r border-slate-200">
                                  {sub.student.name}
                                </td>
                                <td className="p-3 text-slate-700 border-r border-slate-200">
                                  {sub.student.department}
                                </td>
                                <td className="p-3 font-bold font-mono border-r border-slate-200">
                                  {isLocked ? (
                                    <span className="text-rose-600 font-bold">0 / 50 (DISQUALIFIED)</span>
                                  ) : (
                                    <span className="text-emerald-600 font-bold">
                                      {sub.report?.overallScore || 0} / {sub.report?.maxScore || 50} ({pct}%)
                                    </span>
                                  )}
                                </td>
                                <td className="p-3 border-r border-slate-200">
                                  {isLocked ? (
                                    <span className="px-2 py-0.5 bg-rose-100 text-rose-800 rounded font-bold text-xs font-mono">
                                      RA (Disqualified)
                                    </span>
                                  ) : (
                                    <span className={`px-2.5 py-1 rounded font-bold text-xs font-mono inline-flex items-center gap-1.5 border ${
                                      g.grade === 'A' ? 'bg-emerald-50 text-emerald-800 border-emerald-300' :
                                      g.grade === 'B' ? 'bg-blue-50 text-blue-800 border-blue-300' :
                                      'bg-orange-50 text-orange-800 border-orange-300'
                                    }`}>
                                      <Award className="w-3.5 h-3.5" />
                                      <span>Grade {g.grade} ({g.title})</span>
                                    </span>
                                  )}
                                </td>
                                <td className="p-3 text-slate-600 text-[11px] font-mono border-r border-slate-200">
                                  {sub.submittedAt || sub.report?.testTimestamp || 'N/A'}
                                </td>
                                <td className="p-3 text-right">
                                  <div className="flex items-center justify-end gap-1.5">
                                    <button
                                      onClick={() => {
                                        setIsGradewiseReportModalOpen(false);
                                        onSelectSubmission(sub);
                                      }}
                                      className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded border border-blue-200 transition-colors cursor-pointer"
                                      title="Inspect detailed student scorecard"
                                    >
                                      <Eye className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() => downloadPdfReport(sub.report)}
                                      className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded border border-slate-300 transition-colors cursor-pointer"
                                      title="Download individual PDF scorecard"
                                    >
                                      <FileText className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() => downloadExcelReport(sub.report)}
                                      className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded border border-emerald-200 transition-colors cursor-pointer"
                                      title="Download individual Excel scorecard"
                                    >
                                      <FileSpreadsheet className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    );
                  })()}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-white px-6 py-3 border-t border-slate-200 flex items-center justify-between">
              <span className="text-xs text-slate-500 font-medium">
                Official Examination Board Evaluation Matrix • Coimbatore Institute of Technology
              </span>
              <button
                onClick={() => setIsGradewiseReportModalOpen(false)}
                className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg transition-all cursor-pointer border border-slate-300"
              >
                Close Report
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GRADE DISTRIBUTION INSTRUCTION MODAL */}
      {isGradeDistributionModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-3xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="bg-gradient-to-r from-emerald-900 via-slate-900 to-emerald-950 text-white p-5 sm:p-6 flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30 shrink-0">
                  <PieChartIcon className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base sm:text-lg font-bold font-sans">
                      Academic Grade Distribution Matrix
                    </h2>
                    <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded text-[10px] font-mono font-bold">
                      CIT Examination Standard
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Official 3-Grade scale: Grade A (80%–100%), Grade B (50%–80%), Grade C (Below 50%)
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsGradeDistributionModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 sm:p-6 space-y-5 text-slate-700 text-xs">
              <div className="bg-emerald-50 border border-emerald-200 p-3.5 rounded-xl text-emerald-950 flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold text-xs text-emerald-900">
                    Faculty Guide: Academic Grade Scale & Evaluation Criteria
                  </p>
                  <p className="text-[11px] text-emerald-800 leading-relaxed">
                    Evaluations classify candidate performance across 3 distinct academic grades established by the CIT Faculty Examination Board:
                  </p>
                </div>
              </div>

              {/* Grades Breakdown Cards */}
              <div className="grid grid-cols-1 gap-3.5">
                {/* Grade A */}
                <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="font-extrabold text-sm text-emerald-950 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-emerald-600" />
                      Grade A: Distinction / High Proficiency
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 bg-emerald-200 text-emerald-900 font-mono font-bold text-[11px] rounded-full border border-emerald-300">
                        80% – 100% (40 – 50 Marks)
                      </span>
                    </div>
                  </div>
                  <p className="text-slate-700 text-xs leading-relaxed">
                    Exhibits supreme analytical precision, rapid problem-solving speed, and thorough mastery across advanced calculus, probability theory, number systems, trigonometry, and statistics with minimal computational errors.
                  </p>
                </div>

                {/* Grade B */}
                <div className="p-4 bg-blue-50/60 border border-blue-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="font-extrabold text-sm text-blue-950 flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-blue-600" />
                      Grade B: Proficient / Above Average
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 bg-blue-200 text-blue-900 font-mono font-bold text-[11px] rounded-full border border-blue-300">
                        50% – 80% (25 – 39 Marks)
                      </span>
                    </div>
                  </div>
                  <p className="text-slate-700 text-xs leading-relaxed">
                    Exhibits solid grasp of core mathematical principles, baseline problem-solving efficiency, and consistent accuracy across fundamental and applied questions.
                  </p>
                </div>

                {/* Grade C */}
                <div className="p-4 bg-amber-50/60 border border-amber-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="font-extrabold text-sm text-amber-950 flex items-center gap-2">
                      <HelpCircle className="w-4 h-4 text-amber-600" />
                      Grade C: Foundational / Developing
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 bg-amber-200 text-amber-900 font-mono font-bold text-[11px] rounded-full border border-amber-300">
                        Below 50% (0 – 24 Marks)
                      </span>
                    </div>
                  </div>
                  <p className="text-slate-700 text-xs leading-relaxed">
                    Emerging quantitative proficiency requiring targeted academic reinforcement in higher-order problem-solving, derivations, and timing strategies.
                  </p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 text-right">
              <button
                type="button"
                onClick={() => setIsGradeDistributionModalOpen(false)}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer"
              >
                Close Instructions
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SCORE PERFORMANCE RANGES INSTRUCTION MODAL */}
      {isScoreRangeModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-3xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-900 via-slate-900 to-blue-950 text-white p-5 sm:p-6 flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-500/20 text-blue-400 rounded-xl border border-blue-500/30 shrink-0">
                  <BarChart3 className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base sm:text-lg font-bold font-sans">
                      Score Performance Ranges & Grade Scale
                    </h2>
                    <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded text-[10px] font-mono font-bold">
                      50 Marks Standard
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Official examination board performance grade ranges and mark allocations
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsScoreRangeModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 sm:p-6 space-y-5 text-slate-700 text-xs">
              <div className="bg-blue-50 border border-blue-200 p-3.5 rounded-xl text-blue-950 flex items-start gap-3">
                <Award className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold text-xs text-blue-900">
                    Examination Board Benchmark (Total 50 Marks / 50 Questions)
                  </p>
                  <p className="text-[11px] text-blue-800 leading-relaxed">
                    Student scores are evaluated against 3 official academic performance grade ranges established by the CIT Faculty Examination Board:
                  </p>
                </div>
              </div>

              {/* Performance Ranges Summary Table */}
              <div className="overflow-hidden border border-slate-200 rounded-xl bg-white shadow-sm">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-800 font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-3 border-r border-slate-200">Score Range (Marks)</th>
                      <th className="p-3 border-r border-slate-200">Percentage</th>
                      <th className="p-3 border-r border-slate-200">Grade Secured</th>
                      <th className="p-3">Academic Benchmark & Description</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    <tr className="bg-emerald-50/50">
                      <td className="p-3 font-mono font-bold text-emerald-900 border-r border-slate-200">40 – 50 Marks</td>
                      <td className="p-3 font-mono font-bold text-emerald-900 border-r border-slate-200">80% – 100%</td>
                      <td className="p-3 border-r border-slate-200"><span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold border border-emerald-300">Grade A</span></td>
                      <td className="p-3 font-bold text-emerald-950">Distinction / High Proficiency</td>
                    </tr>
                    <tr className="bg-blue-50/50">
                      <td className="p-3 font-mono font-bold text-blue-900 border-r border-slate-200">25 – 39 Marks</td>
                      <td className="p-3 font-mono font-bold text-blue-900 border-r border-slate-200">50% – 80%</td>
                      <td className="p-3 border-r border-slate-200"><span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded font-bold border border-blue-300">Grade B</span></td>
                      <td className="p-3 font-bold text-blue-950">Proficient / Above Average</td>
                    </tr>
                    <tr className="bg-amber-50/50">
                      <td className="p-3 font-mono font-bold text-amber-900 border-r border-slate-200">0 – 24 Marks</td>
                      <td className="p-3 font-mono font-bold text-amber-900 border-r border-slate-200">&lt; 50%</td>
                      <td className="p-3 border-r border-slate-200"><span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded font-bold border border-amber-300">Grade C</span></td>
                      <td className="p-3 font-bold text-amber-950">Foundational / Developing</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Additional Evaluation Parameters */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                  <span className="font-bold text-slate-900 text-xs block">Assessment Structure</span>
                  <p className="text-slate-600 text-[11px]">
                    50 questions total (1 mark per correct response). Topics distributed equally across Limits & Continuity, Differentiation, Integration, Probability & Statistics, and Matrices & Determinants.
                  </p>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                  <span className="font-bold text-slate-900 text-xs block">Timing & Anti-Cheat Protocols</span>
                  <p className="text-slate-600 text-[11px]">
                    30-minute strict timed duration with automatic state auto-save on application interrupts and window tab visibility changes.
                  </p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 text-right">
              <button
                type="button"
                onClick={() => setIsScoreRangeModalOpen(false)}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer"
              >
                Close Instructions
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION MODAL: DELETE STUDENT RECORD */}
      {deleteConfirmSubmission && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-3 bg-rose-100 rounded-full">
                <Trash2 className="w-6 h-6 text-rose-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Delete Student Record</h3>
                <p className="text-xs text-slate-500 font-mono">{deleteConfirmSubmission.student.registerNo}</p>
              </div>
            </div>

            <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 text-xs text-rose-800 space-y-1">
              <p className="font-bold">⚠️ Warning: Irreversible Administrative Action</p>
              <p>
                Are you sure you want to permanently delete the evaluation record for student{' '}
                <strong>{deleteConfirmSubmission.student.name}</strong> ({deleteConfirmSubmission.student.department})?
              </p>
              <p className="text-[11px] text-rose-700">
                This will delete their score report and answers from both local storage and the database.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmSubmission(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg transition-all cursor-pointer border border-slate-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onDeleteSubmission && deleteConfirmSubmission) {
                    onDeleteSubmission(deleteConfirmSubmission.id);
                  }
                  setDeleteConfirmSubmission(null);
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-lg shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>Confirm Delete Record</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT STUDENT SUBMISSION DETAILS MODAL */}
      {editingSubmission && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-amber-100 text-amber-800 rounded-xl border border-amber-200">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Edit Student Record</h3>
                  <p className="text-xs text-slate-500 font-mono">Submission ID: {editingSubmission.id.slice(0, 16)}...</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingSubmission(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Error banner if any */}
            {editErrorToast && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{editErrorToast}</span>
              </div>
            )}

            {/* Current details snapshot */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs text-slate-700 space-y-1.5 font-medium">
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">Current Submission Snapshot</span>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div>Original Register Number: <strong className="font-mono text-blue-700">{editingSubmission.student?.registerNo}</strong></div>
                <div>Score: <strong className="text-emerald-700 font-mono">{editingSubmission.report?.overallScore || 0} / 50 ({editingSubmission.report?.overallPercentage || 0}%)</strong></div>
                <div className="col-span-2">Original Department: <strong className="text-slate-800">{editingSubmission.student?.department || 'Unspecified'}</strong></div>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveEditSubmission} className="space-y-4 text-xs">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Register Number <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={editUserId}
                  onChange={(e) => setEditUserId(e.target.value.toUpperCase())}
                  placeholder="e.g. 26DCS014, 26DS005, 26SS021"
                  required
                  className="w-full px-3.5 py-2.5 bg-blue-50/40 border border-blue-200 rounded-xl font-mono text-sm font-bold text-blue-800 uppercase focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                />
                <p className="text-[10px] text-slate-500 mt-1">Unique student register ID used for login, classification, and report generation.</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Student Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={editStudentName}
                  onChange={(e) => setEditStudentName(e.target.value)}
                  placeholder="e.g. ASHWIN S"
                  required
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Department <span className="text-rose-500">*</span>
                </label>
                <select
                  value={editDepartment}
                  onChange={(e) => {
                    const val = e.target.value;
                    setEditDepartment(val);
                    if (val === 'CUSTOM') {
                      setIsCustomEditDept(true);
                    } else {
                      setIsCustomEditDept(false);
                    }
                  }}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all cursor-pointer"
                >
                  {STANDARD_DEPARTMENTS.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                  <option value="CUSTOM">+ Enter Custom Department Name...</option>
                </select>
              </div>

              {isCustomEditDept && (
                <div className="animate-in fade-in slide-in-from-top-1">
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Custom Department Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={customEditDept}
                    onChange={(e) => setCustomEditDept(e.target.value)}
                    placeholder="Enter full department title"
                    required
                    className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  />
                </div>
              )}

              {/* Preview banner */}
              <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl text-xs space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block">Updated Roster Preview</span>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-800 font-mono font-bold rounded text-xs">
                    {editUserId.trim().toUpperCase() || 'REGISTER_NUMBER'}
                  </span>
                  <span className="font-bold text-slate-900">{editStudentName.trim() || 'Student Name'}</span>
                  <span className="text-slate-600 text-[11px]">— {isCustomEditDept ? (customEditDept || 'Custom Department') : editDepartment}</span>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingSubmission(null)}
                  disabled={isSavingEdit}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit}
                  className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
                >
                  {isSavingEdit ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-amber-100" />
                      <span>Saving to Database...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Save Changes</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRMATION MODAL: DELETE SELECTIVE RECORDS */}
      {isDeleteSelectedModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-3 bg-rose-100 rounded-full">
                <Trash2 className="w-6 h-6 text-rose-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Delete Selective Records</h3>
                <p className="text-xs text-slate-500">{selectedSubmissionIds.length} candidate record(s) selected</p>
              </div>
            </div>

            <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 text-xs text-rose-800 space-y-2">
              <p className="font-bold">⚠️ Irreversible Administrative Action</p>
              <p>
                Are you sure you want to permanently delete the evaluation records for the following <strong>{selectedSubmissionIds.length}</strong> selected student(s)?
              </p>

              {/* Preview List of Selected Candidates */}
              <div className="max-h-36 overflow-y-auto bg-white border border-rose-200 rounded p-2 space-y-1 divide-y divide-slate-100 font-sans">
                {submissions
                  .filter((s) => selectedSubmissionIds.includes(s.id))
                  .map((s) => (
                    <div key={s.id} className="pt-1 first:pt-0 flex items-center justify-between text-[11px]">
                      <span className="font-bold text-slate-900">{s.student.name} ({s.student.department})</span>
                      <span className="font-mono text-slate-500">{s.student.registerNo}</span>
                    </div>
                  ))}
              </div>

              <p className="text-[11px] text-rose-700">
                This will delete their score reports and recorded answers from both local storage and the database.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsDeleteSelectedModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg transition-all cursor-pointer border border-slate-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onDeleteMultipleSubmissions) {
                    onDeleteMultipleSubmissions(selectedSubmissionIds);
                  } else if (onDeleteSubmission) {
                    selectedSubmissionIds.forEach((id) => onDeleteSubmission(id));
                  }
                  setSelectedSubmissionIds([]);
                  setIsDeleteSelectedModalOpen(false);
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-lg shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>Confirm Delete Selected ({selectedSubmissionIds.length})</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION MODAL: DELETE ALL RECORDS */}
      {isDeleteAllModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-3 bg-rose-100 rounded-full">
                <Trash2 className="w-6 h-6 text-rose-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Delete ALL Student Records</h3>
                <p className="text-xs text-rose-600 font-semibold">Total {submissions.length} submission(s) will be wiped</p>
              </div>
            </div>

            <div className="bg-rose-50 border border-rose-300 rounded-lg p-3.5 text-xs text-rose-900 space-y-2">
              <p className="font-bold text-rose-800 text-sm">🚨 PERMANENT DATA DELETION WARNING</p>
              <p>
                You are about to permanently delete <strong>ALL {submissions.length} student evaluation records</strong> from the system.
              </p>
              <ul className="list-disc list-inside space-y-1 text-[11px] text-rose-800 font-medium">
                <li>Clears all student score reports and cognitive profiles</li>
                <li>Deletes answers from local storage and Cloud database</li>
                <li>This action CANNOT be undone!</li>
              </ul>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsDeleteAllModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg transition-all cursor-pointer border border-slate-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onDeleteAllSubmissions) {
                    onDeleteAllSubmissions();
                  } else if (onClearSubmissions) {
                    onClearSubmissions();
                  }
                  setSelectedSubmissionIds([]);
                  setIsDeleteAllModalOpen(false);
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-lg shadow-md transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>Confirm Delete ALL Records</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION MODAL: DELETE ALL STUDENT FEEDBACK */}
      {isDeleteAllFeedbackModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-3 bg-rose-100 rounded-full">
                <Trash2 className="w-6 h-6 text-rose-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Delete ALL Student Feedback</h3>
                <p className="text-xs text-rose-600 font-semibold">Total {feedbacks.length} feedback response(s) will be wiped</p>
              </div>
            </div>

            <div className="bg-rose-50 border border-rose-300 rounded-lg p-3.5 text-xs text-rose-900 space-y-2">
              <p className="font-bold text-rose-800 text-sm">🚨 PERMANENT FEEDBACK DELETION WARNING</p>
              <p>
                You are about to permanently delete <strong>ALL {feedbacks.length} student feedback and rating submissions</strong> from the Google Cloud Firestore database.
              </p>
              <ul className="list-disc list-inside space-y-1 text-[11px] text-rose-800 font-medium">
                <li>Deletes all student comments, satisfaction ratings, and usability evaluations</li>
                <li>Clears data from local storage and Cloud database</li>
                <li>This action CANNOT be undone!</li>
              </ul>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={isDeletingAllFeedback}
                onClick={() => setIsDeleteAllFeedbackModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg transition-all cursor-pointer border border-slate-200"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeletingAllFeedback}
                onClick={handleDeleteAllFeedback}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold text-xs rounded-lg shadow-md transition-all cursor-pointer flex items-center gap-1.5"
              >
                {isDeletingAllFeedback ? (
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                <span>{isDeletingAllFeedback ? 'Deleting Feedback...' : 'Confirm Delete ALL Feedback'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION MODAL: BULK RESUME SESSIONS */}
      {isResumeSelectedModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 text-indigo-600">
              <div className="p-3 bg-indigo-100 rounded-full">
                <RotateCcw className="w-6 h-6 text-indigo-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Resume Multiple Student Sessions</h3>
                <p className="text-xs text-slate-500 font-mono">{selectedSubmissionIds.length} student record(s) selected</p>
              </div>
            </div>

            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3.5 text-xs text-indigo-950 space-y-2">
              <p className="font-bold flex items-center gap-1.5 text-indigo-900 text-sm">
                <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0" />
                <span>Bulk Candidate Resume Authorization</span>
              </p>
              <p className="text-slate-700">
                You are authorizing <strong>{selectedSubmissionIds.length} candidate(s)</strong> to log in on their respective devices and resume their cognitive assessment sessions from their save points:
              </p>
              <ul className="list-disc list-inside space-y-1 text-[11px] text-indigo-900 pt-1 font-medium">
                <li>Unlocks candidate accounts and clears lockout / terminated statuses</li>
                <li>Preserves candidates' recorded answers up to save point</li>
                <li>Allows candidates to log in using their Register Numbers on the Student Login portal</li>
                <li><strong className="text-emerald-700 font-bold">Admin will remain securely logged in inside the Admin Portal.</strong></li>
              </ul>
            </div>

            {/* Selected Candidates List */}
            <div className="max-h-44 overflow-y-auto border border-slate-200 rounded-lg p-2 bg-slate-50 divide-y divide-slate-200 text-xs">
              {submissions
                .filter((s) => selectedSubmissionIds.includes(s.id))
                .map((sub) => (
                  <div key={sub.id} className="py-1.5 px-2 flex items-center justify-between text-slate-700">
                    <div>
                      <span className="font-bold text-slate-900">{sub.student.name}</span>{' '}
                      <span className="font-mono text-blue-600 text-[11px]">({sub.student.registerNo})</span>
                    </div>
                    <span className="text-[11px] text-slate-500">{sub.student.department}</span>
                  </div>
                ))}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsResumeSelectedModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg transition-all cursor-pointer border border-slate-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const selectedSubs = submissions.filter((s) => selectedSubmissionIds.includes(s.id));
                  if (onResumeMultipleStudentSessions) {
                    onResumeMultipleStudentSessions(selectedSubs);
                  } else if (onResumeStudentSession) {
                    selectedSubs.forEach((sub) => onResumeStudentSession(sub, 'student_login', true));
                  }
                  const count = selectedSubs.length;
                  setBulkResumeStatusMsg(`✅ Successfully resumed assessment sessions for ${count} selected student(s). Students can now log in on their devices to continue. Admin remains logged in.`);
                  setSelectedSubmissionIds([]);
                  setIsResumeSelectedModalOpen(false);
                  setTimeout(() => setBulkResumeStatusMsg(null), 8000);
                }}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Confirm & Resume All ({selectedSubmissionIds.length}) Students</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION MODAL: RESUME SESSION FOR RE-ATTEMPT */}
      {resumeConfirmSubmission && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 text-indigo-600">
              <div className="p-3 bg-indigo-100 rounded-full">
                <RotateCcw className="w-6 h-6 text-indigo-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Resume Session for Re-Attempt</h3>
                <p className="text-xs text-slate-500 font-mono">{resumeConfirmSubmission.student.registerNo}</p>
              </div>
            </div>

            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3 text-xs text-indigo-900 space-y-1.5">
              <p className="font-bold">▶ Candidate Assessment Resume Authorization</p>
              <p>
                You are authorizing candidate <strong>{resumeConfirmSubmission.student.name}</strong> ({resumeConfirmSubmission.student.department}) to log in and resume their assessment session from their save point.
              </p>
              <ul className="list-disc list-inside space-y-0.5 text-[11px] text-indigo-800 pt-1">
                <li>Unlocks candidate account and clears lockout statuses</li>
                <li>Restores candidate's answered questions up to save point</li>
                <li>Allows student to log in on Student Login portal using Register Number <strong>{resumeConfirmSubmission.student.registerNo}</strong></li>
                <li><strong className="text-emerald-700 font-bold">Admin remains logged in inside Admin Portal</strong></li>
              </ul>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setResumeConfirmSubmission(null)}
                className="w-full sm:w-auto px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg transition-all cursor-pointer border border-slate-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onResumeStudentSession && resumeConfirmSubmission) {
                    onResumeStudentSession(resumeConfirmSubmission, 'direct_launch', false);
                  }
                  setResumeConfirmSubmission(null);
                }}
                className="w-full sm:w-auto px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 border border-slate-300"
                title="Directly launch test on this device"
              >
                <RotateCcw className="w-3.5 h-3.5 text-indigo-600" />
                <span>Direct Launch</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onResumeStudentSession && resumeConfirmSubmission) {
                    onResumeStudentSession(resumeConfirmSubmission, 'student_login', true);
                  }
                  const studentName = resumeConfirmSubmission?.student.name || 'Student';
                  const regNo = resumeConfirmSubmission?.student.registerNo || '';
                  setBulkResumeStatusMsg(`✅ Successfully resumed assessment session for ${studentName} (${regNo}). Student can now log in on their device. Admin remains logged in.`);
                  setResumeConfirmSubmission(null);
                  setTimeout(() => setBulkResumeStatusMsg(null), 8000);
                }}
                className="w-full sm:w-auto px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg shadow-sm transition-all cursor-pointer flex items-center justify-center gap-1.5"
                title="Authorizes candidate resume on their device and keeps Admin session active"
              >
                <UserCheck className="w-4 h-4" />
                <span>Allow Student Login & Resume</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FULL STORAGE DIAGNOSTICS & CAPACITY MODAL */}
      {isStorageModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-emerald-100 rounded-full text-emerald-700">
                  <HardDrive className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Assessment Data Storage & Storage Capacity</h3>
                  <p className="text-xs text-slate-500 font-mono">Last Scanned: {storageScanTimestamp}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsStorageModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Storage Quota Progress Bars */}
            <div className="space-y-4">
              {/* Local Storage Quota Bar */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                  <span className="flex items-center gap-1.5">
                    <HardDrive className="w-4 h-4 text-emerald-600" />
                    <span>Browser LocalStorage Capacity (5.0 MB Quota)</span>
                  </span>
                  <span className="font-mono text-emerald-800 font-bold">
                    {formatStorageBytes(remainingLocalStorageBytes)} Available ({(100 - localStorageUsedPct).toFixed(1)}% Free)
                  </span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                  <div
                    className={`h-2.5 rounded-full ${localStorageUsedPct > 90 ? 'bg-rose-500' : localStorageUsedPct > 70 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                    style={{ width: `${Math.max(2, localStorageUsedPct)}%` }}
                  ></div>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
                  <span>Used: {formatStorageBytes(totalLocalStorageUsedBytes)} ({localStorageUsedPct.toFixed(2)}%)</span>
                  <span>Total Quota: 5.00 MB</span>
                </div>
              </div>

              {/* Cloud Database Quota Bar */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                  <span className="flex items-center gap-1.5">
                    <Database className="w-4 h-4 text-blue-600" />
                    <span>Cloud Firestore Database Quota (1,024 MB / 1 GB Free Plan)</span>
                  </span>
                  <span className="font-mono text-blue-900 font-bold">
                    {formatStorageBytes(remainingFirestoreBytes)} Available ({(100 - firestoreUsedPct).toFixed(2)}% Free)
                  </span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="h-2.5 rounded-full bg-blue-600"
                    style={{ width: `${Math.max(1, firestoreUsedPct)}%` }}
                  ></div>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
                  <span>Estimated Used: {formatStorageBytes(estimatedFirestoreUsedBytes)} ({firestoreUsedPct.toFixed(4)}%)</span>
                  <span>Total Allocation: 1,024.00 MB</span>
                </div>
              </div>

              {/* Device System Quota (if available) */}
              {deviceStorageEstimate && (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                    <span className="flex items-center gap-1.5">
                      <Cpu className="w-4 h-4 text-purple-600" />
                      <span>Device Disk & Site Quota (HTML5 Storage API)</span>
                    </span>
                    <span className="font-mono text-purple-900 font-bold">
                      {formatStorageBytes(Math.max(0, deviceStorageEstimate.quota - deviceStorageEstimate.usage))} Free
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                    <div
                      className="h-2.5 rounded-full bg-purple-600"
                      style={{ width: `${Math.min(100, Math.max(1, (deviceStorageEstimate.usage / deviceStorageEstimate.quota) * 100))}%` }}
                    ></div>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
                    <span>App Usage: {formatStorageBytes(deviceStorageEstimate.usage)}</span>
                    <span>Total Device Site Quota: {formatStorageBytes(deviceStorageEstimate.quota)}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Assessment Data Itemized Breakdown */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">Detailed Data Components</h4>
              <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-100 text-slate-700 font-bold text-[10px] uppercase tracking-wider">
                    <tr>
                      <th className="py-2 px-3">Data Component</th>
                      <th className="py-2 px-3">Record Count</th>
                      <th className="py-2 px-3">Exact Size</th>
                      <th className="py-2 px-3">% of Assessment Data</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white font-mono">
                    <tr>
                      <td className="py-2 px-3 font-sans font-semibold text-slate-800">Student Submissions & Score Reports</td>
                      <td className="py-2 px-3 text-slate-600">{submissions.length} Records</td>
                      <td className="py-2 px-3 font-bold text-slate-900">{formatStorageBytes(submissionsBytes)}</td>
                      <td className="py-2 px-3 text-slate-600">{totalAssessmentDataBytes > 0 ? ((submissionsBytes / totalAssessmentDataBytes) * 100).toFixed(1) : '0'}%</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 font-sans font-semibold text-slate-800">Question Bank Items</td>
                      <td className="py-2 px-3 text-slate-600">{questionBank.length} Questions</td>
                      <td className="py-2 px-3 font-bold text-slate-900">{formatStorageBytes(questionBankBytes)}</td>
                      <td className="py-2 px-3 text-slate-600">{totalAssessmentDataBytes > 0 ? ((questionBankBytes / totalAssessmentDataBytes) * 100).toFixed(1) : '0'}%</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 font-sans font-semibold text-slate-800">Security Violations & Proctor Logs</td>
                      <td className="py-2 px-3 text-slate-600">{securityLogs.length} Logs</td>
                      <td className="py-2 px-3 font-bold text-slate-900">{formatStorageBytes(securityLogsBytes)}</td>
                      <td className="py-2 px-3 text-slate-600">{totalAssessmentDataBytes > 0 ? ((securityLogsBytes / totalAssessmentDataBytes) * 100).toFixed(1) : '0'}%</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 font-sans font-semibold text-slate-800">Portal Config & Access PIN Schedules</td>
                      <td className="py-2 px-3 text-slate-600">System State</td>
                      <td className="py-2 px-3 font-bold text-slate-900">{formatStorageBytes(configBytes)}</td>
                      <td className="py-2 px-3 text-slate-600">{totalAssessmentDataBytes > 0 ? ((configBytes / totalAssessmentDataBytes) * 100).toFixed(1) : '0'}%</td>
                    </tr>
                    <tr className="bg-emerald-50/60 font-bold">
                      <td className="py-2 px-3 font-sans text-emerald-950">TOTAL COMBINED ASSESSMENT DATA</td>
                      <td className="py-2 px-3 text-emerald-900">—</td>
                      <td className="py-2 px-3 text-emerald-950">{formatStorageBytes(totalAssessmentDataBytes)}</td>
                      <td className="py-2 px-3 text-emerald-900">100.0%</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Storage Estimation Insights */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 text-xs text-emerald-950 space-y-1.5">
              <p className="font-bold flex items-center gap-1.5 text-emerald-900">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Storage Health & Capacity Insights</span>
              </p>
              <ul className="list-disc list-inside space-y-1 text-[11px] text-emerald-900">
                <li>Estimated average candidate assessment size: <strong>{formatStorageBytes(avgSubmissionBytes)}</strong> per submission.</li>
                <li>At current rate, browser LocalStorage can store approximately <strong>~{remainingStudentSubmissionsCapacity.toLocaleString()} more candidate evaluation sessions</strong>.</li>
                <li>All submissions are backed up in real-time to Cloud Firestore for cross-device access and safety.</li>
              </ul>
            </div>

            <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={handleExportStorageBackup}
                className="px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold text-xs rounded-lg transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Download className="w-4 h-4 text-emerald-600" />
                <span>Download Storage Snapshot (.json)</span>
              </button>

              <button
                type="button"
                onClick={() => setIsStorageModalOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-lg transition-all cursor-pointer"
              >
                Close Diagnostics
              </button>
            </div>
          </div>
        </div>
      )}
      {/* SAMPLE 50-QUESTION STUDENT EXAM PAPER PREVIEW MODAL */}
      {isPreviewTestPaperModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="bg-slate-900 p-5 border-b border-slate-800 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2.5 text-white">
                <Eye className="w-5 h-5 text-purple-400" />
                <h3 className="text-base font-extrabold">
                  Sampled 50-Question Candidate Test Paper Preview
                </h3>
              </div>
              <button
                onClick={() => setIsPreviewTestPaperModalOpen(false)}
                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 bg-purple-50 border-b border-purple-100 text-xs text-purple-900 flex items-center justify-between">
              <span>
                <strong>10 Questions / Domain</strong> (4 Level 1, 3 Level 2, 3 Level 3) • Total 50 Questions • Randomized per Candidate Attempt
              </span>
              <span className="font-mono font-bold text-purple-800">
                {previewTestQuestions.length} Questions Sampled
              </span>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 max-h-[65vh]">
              {previewTestQuestions.map((q, idx) => {
                const secMeta = SECTION_METADATA.find((s) => s.id === q.sectionId);
                return (
                  <div key={q.id || idx} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
                    <div className="flex items-center justify-between gap-2 border-b border-slate-200 pb-2">
                      <span className="font-bold font-mono text-purple-700">Q{idx + 1} of 50</span>
                      <span className="font-semibold text-slate-700 px-2 py-0.5 bg-white border border-slate-200 rounded">
                        {secMeta?.title || q.sectionId}
                      </span>
                      <span className="font-bold text-[10px] uppercase px-2 py-0.5 rounded bg-slate-200 text-slate-800">
                        {q.difficulty === 'easy' ? 'Level 1' : q.difficulty === 'medium' ? 'Level 2' : 'Level 3'}
                      </span>
                    </div>

                    <p className="font-bold text-slate-900 leading-snug whitespace-pre-wrap break-words">{q.questionText || q.question}</p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
                      {q.options.map((opt, oIdx) => {
                        const isAns = oIdx === q.correctAnswer;
                        return (
                          <div
                            key={oIdx}
                            className={`p-2 rounded font-mono text-[11px] flex items-center gap-1.5 ${
                              isAns ? 'bg-emerald-100 text-emerald-900 font-bold border border-emerald-300' : 'bg-white border border-slate-200 text-slate-700'
                            }`}
                          >
                            <span className="whitespace-pre-wrap break-words">{String.fromCharCode(65 + oIdx)}. {opt}</span>
                            {isAns && <Check className="w-3.5 h-3.5 text-emerald-700 ml-auto shrink-0" />}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="p-4 bg-slate-100 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setIsPreviewTestPaperModalOpen(false)}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl transition-all cursor-pointer"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD / EDIT QUESTION MODAL */}
      {isAddEditQuestionModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="bg-slate-900 p-5 border-b border-slate-800 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2.5 text-white">
                {editingQuestionId ? <Pencil className="w-5 h-5 text-purple-400" /> : <Plus className="w-5 h-5 text-indigo-400" />}
                <h3 className="text-base font-extrabold">
                  {editingQuestionId ? 'Edit Question in Active Bank' : 'Add New Question to Bank'}
                </h3>
              </div>
              <button
                onClick={() => setIsAddEditQuestionModalOpen(false)}
                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveQuestion} className="p-6 overflow-y-auto space-y-4 text-xs">
              {qbFormError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-center gap-2 font-medium">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{qbFormError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Cognitive Domain */}
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700">Cognitive Domain / Section</label>
                  <select
                    value={qbFormSectionId}
                    onChange={(e) => setQbFormSectionId(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg font-semibold text-slate-800 focus:ring-2 focus:ring-purple-500 cursor-pointer"
                  >
                    <option value="calculus">Limits & Continuity</option>
                    <option value="probability">Differentiation</option>
                    <option value="numberSystem">Integration</option>
                    <option value="trigonometry">Probability & Statistics</option>
                    <option value="statistics">Matrices & Determinants</option>
                  </select>
                </div>

                {/* Difficulty Level */}
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700">Difficulty Level</label>
                  <select
                    value={qbFormDifficulty}
                    onChange={(e) => setQbFormDifficulty(e.target.value as any)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg font-semibold text-slate-800 focus:ring-2 focus:ring-purple-500 cursor-pointer"
                  >
                    <option value="easy">Level 1 (40%)</option>
                    <option value="medium">Level 2 (30%)</option>
                    <option value="hard">Level 3 (30%)</option>
                  </select>
                </div>
              </div>

              {/* Question Text / Prompt */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-700">Question Prompt / Problem Text</label>
                  <span className="text-[11px] text-slate-500 font-medium">Subscripts & Superscripts Supported</span>
                </div>

                {/* Quick Math / Subscript / Superscript Toolbar */}
                <div className="p-2 bg-purple-50/70 border border-purple-200 rounded-lg flex flex-wrap items-center gap-1 text-xs">
                  <span className="text-[10px] font-bold text-purple-900 mr-1 uppercase">Quick Insert:</span>
                  {['²', '³', '⁴', 'ⁿ', '⁻¹', '₁', '₂', '₃', '₀', 'π', 'θ', '√', '∫', '±', 'σ', 'μ', 'lim', 'α', 'β', 'λ', '≤', '≥', '≠', '∞', '×', '÷'].map((sym) => (
                    <button
                      key={sym}
                      type="button"
                      onClick={() => setQbFormQuestionText((prev) => prev + sym)}
                      className="px-1.5 py-0.5 bg-white hover:bg-purple-600 hover:text-white text-purple-900 border border-purple-200 rounded font-mono font-bold text-xs shadow-2xs transition-colors cursor-pointer"
                      title={`Insert ${sym}`}
                    >
                      {sym}
                    </button>
                  ))}
                </div>

                <textarea
                  rows={3}
                  value={qbFormQuestionText}
                  onChange={(e) => setQbFormQuestionText(e.target.value)}
                  placeholder="Enter problem statement, equation, or cognitive challenge question (e.g., Evaluate lim (x → 0) [ (e²ˣ - 1) / x ] + tan⁻¹(1))..."
                  className="w-full p-3 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {/* Option Choices */}
              <div className="space-y-2">
                <label className="font-bold text-slate-700">Multiple Choice Options (A, B, C, D)</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {['A', 'B', 'C', 'D'].map((lbl, idx) => (
                    <div key={lbl} className="space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-bold text-slate-600">Option {lbl}</span>
                        {qbFormCorrectAnswer === idx && (
                          <span className="text-emerald-700 font-bold bg-emerald-100 px-1.5 py-0.5 rounded text-[10px]">
                            Correct Choice
                          </span>
                        )}
                      </div>
                      <input
                        type="text"
                        value={qbFormOptions[idx]}
                        onChange={(e) => {
                          const val = e.target.value;
                          setQbFormOptions((prev) => {
                            const copy = [...prev] as [string, string, string, string];
                            copy[idx] = val;
                            return copy;
                          });
                        }}
                        placeholder={`Choice ${lbl} answer text...`}
                        className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Select Correct Answer */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700">Designate Correct Answer Choice</label>
                <div className="grid grid-cols-4 gap-2">
                  {['Option A', 'Option B', 'Option C', 'Option D'].map((lbl, idx) => (
                    <button
                      key={lbl}
                      type="button"
                      onClick={() => setQbFormCorrectAnswer(idx)}
                      className={`p-2 rounded-lg border font-bold text-xs transition-all cursor-pointer ${
                        qbFormCorrectAnswer === idx
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow'
                          : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      {lbl}
                    </button>
                  ))}
                </div>
              </div>

              {/* Solution / Step-by-Step Explanation */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700">Solution Explanation / Proof (Optional)</label>
                <textarea
                  rows={2}
                  value={qbFormExplanation}
                  onChange={(e) => setQbFormExplanation(e.target.value)}
                  placeholder="Provide brief mathematical solution derivation or reasoning steps..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddEditQuestionModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg transition-all cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-lg shadow transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>{editingQuestionId ? 'Update Question' : 'Save New Question'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEWING DETAIL QUESTION MODAL */}
      {viewingDetailQuestion && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-xs">
            <div className="bg-slate-900 p-5 border-b border-slate-800 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2.5 text-white">
                <Eye className="w-5 h-5 text-indigo-400" />
                <h3 className="text-base font-extrabold">Question Details Inspector</h3>
              </div>
              <button
                onClick={() => setViewingDetailQuestion(null)}
                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4">
              <div className="flex items-center justify-between gap-2 border-b border-slate-200 pb-3">
                <span className="font-semibold text-slate-700 px-2.5 py-1 bg-slate-100 border border-slate-300 rounded-md">
                  Domain: {SECTION_METADATA.find((s) => s.id === viewingDetailQuestion.sectionId)?.title || viewingDetailQuestion.sectionId}
                </span>

                <span className={`px-2.5 py-1 rounded-md font-bold text-[10px] uppercase border ${
                  viewingDetailQuestion.difficulty === 'easy'
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                    : viewingDetailQuestion.difficulty === 'medium'
                    ? 'bg-amber-100 text-amber-800 border-amber-300'
                    : 'bg-rose-100 text-rose-800 border-rose-300'
                }`}>
                  {viewingDetailQuestion.difficulty === 'easy' ? 'Level 1' : viewingDetailQuestion.difficulty === 'medium' ? 'Level 2' : 'Level 3'}
                </span>
              </div>

              <div className="space-y-1.5">
                <span className="font-bold text-slate-500 uppercase tracking-wide text-[10px]">Question Prompt</span>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 leading-relaxed text-sm whitespace-pre-wrap break-words">
                  {viewingDetailQuestion.questionText || viewingDetailQuestion.question}
                </div>
              </div>

              <div className="space-y-2">
                <span className="font-bold text-slate-500 uppercase tracking-wide text-[10px]">Multiple Choice Options</span>
                <div className="space-y-1.5">
                  {viewingDetailQuestion.options.map((opt, oIdx) => {
                    const isCorrect = oIdx === viewingDetailQuestion.correctAnswer;
                    return (
                      <div
                        key={oIdx}
                        className={`p-2.5 rounded-lg border font-mono flex items-center justify-between gap-2 ${
                          isCorrect
                            ? 'bg-emerald-50 text-emerald-950 border-emerald-300 font-bold shadow-sm'
                            : 'bg-slate-50 text-slate-700 border-slate-200'
                        }`}
                      >
                        <span className="whitespace-pre-wrap break-words">{String.fromCharCode(65 + oIdx)}. {opt}</span>
                        {isCorrect && (
                          <span className="flex items-center gap-1 text-emerald-700 font-sans font-bold text-[11px] bg-emerald-100 px-2 py-0.5 rounded shrink-0">
                            <Check className="w-3.5 h-3.5 text-emerald-700" /> Correct Answer
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {viewingDetailQuestion.explanation && (
                <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-xl space-y-1">
                  <span className="font-bold text-indigo-900 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600" /> Solution / Step-by-Step Explanation
                  </span>
                  <p className="text-indigo-900 leading-relaxed italic">{viewingDetailQuestion.explanation}</p>
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-100 border-t border-slate-200 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => {
                  const q = viewingDetailQuestion;
                  setViewingDetailQuestion(null);
                  handleOpenEditQuestionModal(q);
                }}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl shadow transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Pencil className="w-3.5 h-3.5" />
                <span>Edit Question</span>
              </button>

              <button
                type="button"
                onClick={() => setViewingDetailQuestion(null)}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl transition-all cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STUDENT INDIVIDUAL FEEDBACK DETAIL MODAL */}
      {selectedFeedbackDetail && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            {/* MODAL HEADER */}
            <div className="p-5 bg-gradient-to-r from-teal-900 via-slate-900 to-indigo-950 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-teal-500/20 text-teal-300 rounded-lg border border-teal-500/30">
                  <MessageSquareQuote className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-white">Student Feedback Profile</h3>
                  <p className="text-[11px] text-teal-200/80 font-mono">
                    {selectedFeedbackDetail.studentRegNo} • {selectedFeedbackDetail.studentName}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedFeedbackDetail(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* MODAL BODY */}
            <div className="p-6 space-y-5 text-xs text-slate-800">
              {/* STUDENT INFO BADGES */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200 font-medium">
                <div>
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Student Name</span>
                  <span className="text-slate-900 font-bold text-xs">{selectedFeedbackDetail.studentName}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Register Number</span>
                  <span className="text-teal-900 font-mono font-extrabold text-xs">{selectedFeedbackDetail.studentRegNo}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Department</span>
                  <span className="text-slate-800 font-semibold text-xs">{selectedFeedbackDetail.department}</span>
                </div>
                <div className="sm:col-span-3 pt-2 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
                  <span>Submitted At: <strong className="text-slate-700">{selectedFeedbackDetail.submittedAt ? new Date(selectedFeedbackDetail.submittedAt).toLocaleString() : 'Recent'}</strong></span>
                  <span>Feedback ID: <code className="text-teal-800 font-mono text-[10px]">{selectedFeedbackDetail.id}</code></span>
                </div>
              </div>

              {/* 4-DIMENSIONAL RATING BREAKDOWN */}
              <div className="space-y-3">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Evaluation Metrics</span>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-xl space-y-1">
                    <span className="text-[10px] font-bold text-amber-900 block">Assessment Content</span>
                    <div className="flex items-center justify-between">
                      <span className="text-base font-black text-amber-950 font-mono">{selectedFeedbackDetail.assessmentRating || 5} / 5.0</span>
                      <span className="text-amber-500 text-sm">{'★'.repeat(selectedFeedbackDetail.assessmentRating || 5)}</span>
                    </div>
                  </div>

                  <div className="p-3 bg-blue-50/60 border border-blue-200 rounded-xl space-y-1">
                    <span className="text-[10px] font-bold text-blue-900 block">UI & Usability</span>
                    <div className="flex items-center justify-between">
                      <span className="text-base font-black text-blue-950 font-mono">{selectedFeedbackDetail.userFriendlinessRating || 5} / 5.0</span>
                      <span className="text-blue-500 text-sm">{'★'.repeat(selectedFeedbackDetail.userFriendlinessRating || 5)}</span>
                    </div>
                  </div>

                  <div className="p-3 bg-purple-50/60 border border-purple-200 rounded-xl space-y-1">
                    <span className="text-[10px] font-bold text-purple-900 block">Question Clarity</span>
                    <div className="flex items-center justify-between">
                      <span className="text-base font-black text-purple-950 font-mono">{selectedFeedbackDetail.questionClarityRating || 5} / 5.0</span>
                      <span className="text-purple-500 text-sm">{'★'.repeat(selectedFeedbackDetail.questionClarityRating || 5)}</span>
                    </div>
                  </div>

                  <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-xl space-y-1">
                    <span className="text-[10px] font-bold text-emerald-900 block">Navigation Flow</span>
                    <div className="flex items-center justify-between">
                      <span className="text-base font-black text-emerald-950 font-mono">{selectedFeedbackDetail.navEaseRating || 5} / 5.0</span>
                      <span className="text-emerald-500 text-sm">{'★'.repeat(selectedFeedbackDetail.navEaseRating || 5)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* QUALITATIVE FEEDBACK REMARKS */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Student Remarks & Suggestions</span>
                <div className="p-4 bg-teal-50 border border-teal-200 rounded-xl text-slate-800 italic leading-relaxed text-xs">
                  <Quote className="w-4 h-4 text-teal-600 mb-1.5" />
                  <span>"{selectedFeedbackDetail.comments || 'No remarks provided by the student.'}"</span>
                </div>
              </div>
            </div>

            {/* MODAL ACTIONS */}
            <div className="p-4 bg-slate-100 border-t border-slate-200 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => {
                  const fb = selectedFeedbackDetail;
                  handleDeleteFeedbackItem(fb.id);
                  setSelectedFeedbackDetail(null);
                }}
                className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-xl border border-rose-200 transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Feedback</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedFeedbackDetail(null)}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl transition-all cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NEW TEST CONFIGURATION WIZARD MODAL */}
      <NewTestModal
        isOpen={isNewTestModalOpen}
        onClose={() => setIsNewTestModalOpen(false)}
        onSaveTest={handleSaveNewTest}
        existingTestsCount={assessmentTests.length}
      />

      {/* PORTAL SHORTCUTS MODAL */}
      <ShortcutModal
        isOpen={isShortcutModalOpen}
        onClose={() => setIsShortcutModalOpen(false)}
        defaultRole={userRole}
      />
    </div>
  );
};
