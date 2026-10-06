import React, { useState, useEffect, useMemo } from 'react';
import { StudentInfo, SavedSubmission, FacultyCredential, StudentPinSchedule, AssessmentTestConfig, ConfiguredDepartment } from '../types';
import { saveSecurityLogToFirestore, DCS_SPECIFIC_STUDENTS, lookupEnrolledStudent, checkActiveStudentSession, checkStudentPriorSubmission, subscribeAssessmentTests, recordStudentLoginToFirestore } from '../lib/firebase';
import { getCurrentTimestamp } from '../utils/dateUtils';
import { isStudentPinActive } from '../utils/scheduleUtils';
import { getActiveAssessmentTest, getConfiguredDepartments } from '../utils/testManagerUtils';
import { hasResumableSavepoint, loadActiveAssessmentSession } from '../utils/offlineSync';
import { StudentConsentModal } from './StudentConsentModal';
import { StudentGuidelinesModal } from './StudentGuidelinesModal';
import { 
  ShieldCheck, ShieldAlert, AlertTriangle, User, CreditCard, Building2, Lock, ArrowRight, Brain, 
  AlertCircle, CheckCircle2, Clock, Sparkles, BookOpen, Compass, 
  HelpCircle, Flag, CheckSquare, ListOrdered, Navigation, Info, ChevronDown, ChevronUp,
  X, RefreshCw, Award, BarChart3, Download, FileText, Mail, Phone, KeyRound, Key, Check, Eye, EyeOff, Send, Save, RotateCcw,
  Layers, ExternalLink, Copy
} from 'lucide-react';
import cognitiveHeroImg from '../assets/images/math_brain_symbols.svg';

interface AuthGateProps {
  onAuthenticateStudent: (student: StudentInfo) => void;
  onOpenAdminPortal: (role?: 'faculty' | 'admin') => void;
  initialTab?: 'student' | 'faculty' | 'admin';
  savedSubmissions?: SavedSubmission[];
  securityLockoutBanner?: string | null;
  onClearLockoutBanner?: () => void;
  securityExitWarningModal?: {
    isOpen: boolean;
    title: string;
    violationType: 'TAB_SWITCH' | 'SCREENSHOT' | 'WINDOW_SWITCH';
    reason: string;
    message: string;
    studentName: string;
    registerNo: string;
    department: string;
    timestamp: string;
  } | null;
  onCloseSecurityExitWarningModal?: () => void;
  isStudentLoginLocked?: boolean;
  isFacultyLoginLocked?: boolean;
  lockedStudentRegNos?: string[];
  studentAccessPin?: string;
  studentPinSchedule?: StudentPinSchedule;
  facultyAccessPin?: string;
  adminAccessPin?: string;
  adminId?: string;
  adminResetEmail?: string;
  adminMobile?: string;
  adminSecretRecoveryPin?: string;
  authorizedFaculty?: FacultyCredential[];
  resumableStudentForLogin?: StudentInfo | null;
  onResetAdminPin?: (newPin: string) => void;
  onSetAdminId?: (newId: string) => void;
  onSetAdminResetEmail?: (newEmail: string) => void;
  onSetAdminMobile?: (newMobile: string) => void;
  onSetAdminSecretRecoveryPin?: (newPin: string) => void;
}

export const AuthGate: React.FC<AuthGateProps> = ({ 
  onAuthenticateStudent, 
  onOpenAdminPortal, 
  initialTab = 'student',
  savedSubmissions = [],
  securityLockoutBanner,
  onClearLockoutBanner,
  securityExitWarningModal,
  onCloseSecurityExitWarningModal,
  isStudentLoginLocked = false,
  isFacultyLoginLocked = false,
  lockedStudentRegNos = [],
  studentAccessPin = 'cit@123',
  studentPinSchedule,
  facultyAccessPin = 'cit@123',
  adminAccessPin = 'cit@123',
  adminId = 'admin',
  adminResetEmail = 'admin@cit.edu.in',
  adminMobile = '+91 9876543210',
  adminSecretRecoveryPin = '7777',
  authorizedFaculty = [],
  resumableStudentForLogin,
  onResetAdminPin,
  onSetAdminId,
  onSetAdminResetEmail,
  onSetAdminMobile,
  onSetAdminSecretRecoveryPin
}) => {
  // Active Assessment Test & Dynamic Departments
  const [activeTest, setActiveTest] = useState<AssessmentTestConfig>(() => getActiveAssessmentTest());
  const [configuredDepts, setConfiguredDepts] = useState<ConfiguredDepartment[]>(() => getConfiguredDepartments());

  useEffect(() => {
    const handleActiveTestChange = () => {
      setActiveTest(getActiveAssessmentTest());
      setConfiguredDepts(getConfiguredDepartments());
    };
    window.addEventListener('cit_active_test_updated', handleActiveTestChange);
    window.addEventListener('storage', handleActiveTestChange);

    // Subscribe to Firestore test updates in real-time
    const unsubTests = subscribeAssessmentTests((tests) => {
      const live = tests.find(t => t.status === 'active');
      if (live) {
        setActiveTest(live);
      }
      setConfiguredDepts(getConfiguredDepartments());
    });

    return () => {
      window.removeEventListener('cit_active_test_updated', handleActiveTestChange);
      window.removeEventListener('storage', handleActiveTestChange);
      unsubTests();
    };
  }, []);

  const [activeTab, setActiveTab] = useState<'student' | 'faculty' | 'admin'>(initialTab);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);
  const [showInstructions, setShowInstructions] = useState(false);
  const [isGuidelinesModalOpen, setIsGuidelinesModalOpen] = useState(false);

  // Attempt Blocked Modal state
  const [showAttemptBlockedModal, setShowAttemptBlockedModal] = useState(false);
  const [attemptBlockedDetails, setAttemptBlockedDetails] = useState<{
    studentName: string;
    registerNo: string;
    department: string;
    submittedAt: string;
    isSecurityLockout?: boolean;
    violationReason?: string;
    isConcurrentBlocked?: boolean;
  } | null>(null);

  // Password Recovery Modal & Secret Recovery PIN State
  const [showPasswordRecoveryModal, setShowPasswordRecoveryModal] = useState(false);
  const [recoveryStep, setRecoveryStep] = useState<'VERIFY' | 'SUCCESS'>('VERIFY');
  const [secretRecoveryPinInput, setSecretRecoveryPinInput] = useState('');
  const [showSecretRecoveryPinInput, setShowSecretRecoveryPinInput] = useState(false);
  const [recoveryErrorMsg, setRecoveryErrorMsg] = useState('');

  // Student Examination Consent Modal State
  const [isConsentModalOpen, setIsConsentModalOpen] = useState(false);
  const [pendingConsentStudent, setPendingConsentStudent] = useState<StudentInfo | null>(null);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  const defaultDeptName = configuredDepts[0]?.name || 'B.E. Computer Science & Engineering';

  useEffect(() => {
    if (resumableStudentForLogin) {
      setName(resumableStudentForLogin.name.toUpperCase());
      setRegisterNo(resumableStudentForLogin.registerNo);
      setDepartment(resumableStudentForLogin.department || defaultDeptName);
      setActiveTab('student');
    }
  }, [resumableStudentForLogin, defaultDeptName]);

  const [name, setName] = useState('');
  const [registerNo, setRegisterNo] = useState('');
  const [department, setDepartment] = useState(defaultDeptName);
  const [accessKey, setAccessKey] = useState('');

  // Level counts computation based on active test configuration
  const { totalQuestions, l1Count, l2Count, l3Count } = useMemo(() => {
    const total = activeTest.totalQuestions || 50;
    const dist = activeTest.levelDistribution;
    let l1 = 0;
    let l2 = 0;
    let l3 = 0;

    if (dist?.mode === 'count') {
      l1 = dist.level1Count ?? Math.round(total * 0.4);
      l2 = dist.level2Count ?? Math.round(total * 0.4);
      l3 = dist.level3Count ?? (total - (l1 + l2));
    } else if (dist?.mode === 'domain_wise') {
      const doms = activeTest.domains || [];
      l1 = doms.reduce((sum, d) => sum + (d.level1Count || 0), 0);
      l2 = doms.reduce((sum, d) => sum + (d.level2Count || 0), 0);
      l3 = doms.reduce((sum, d) => sum + (d.level3Count || 0), 0);
    } else {
      const p1 = dist?.level1Percentage ?? 40;
      const p2 = dist?.level2Percentage ?? 40;
      l1 = Math.round((total * p1) / 100);
      l2 = Math.round((total * p2) / 100);
      l3 = total - (l1 + l2);
    }

    return { totalQuestions: total, l1Count: l1, l2Count: l2, l3Count: l3 };
  }, [activeTest]);

  const l1Pct = totalQuestions > 0 ? Math.round((l1Count / totalQuestions) * 100) : 40;
  const l2Pct = totalQuestions > 0 ? Math.round((l2Count / totalQuestions) * 100) : 40;
  const l3Pct = totalQuestions > 0 ? Math.max(0, 100 - (l1Pct + l2Pct)) : 20;

  const availableProgrammes = useMemo(() => {
    const list = (activeTest.programmes && activeTest.programmes.length > 0)
      ? [...activeTest.programmes]
      : configuredDepts.map(d => d.name);

    if (!list.some(p => p.toLowerCase().includes('vlsi'))) {
      list.push('B.E. Electronics Engineering (VLSI Design and Technology)');
    }
    return list;
  }, [activeTest.programmes, configuredDepts]);
  const [facultyEmail, setFacultyEmail] = useState('');
  const [facultyPin, setFacultyPin] = useState('');
  const [adminIdInput, setAdminIdInput] = useState(adminId || 'admin');
  const [adminIdSavedMsg, setAdminIdSavedMsg] = useState(false);
  const [adminEmailInput, setAdminEmailInput] = useState(adminResetEmail || 'admin@cit.edu.in');
  const [adminEmailSavedMsg, setAdminEmailSavedMsg] = useState(false);
  const [adminMobileInput, setAdminMobileInput] = useState(adminMobile || '+91 9876543210');
  const [adminMobileSavedMsg, setAdminMobileSavedMsg] = useState(false);
  const [recoveryChannel, setRecoveryChannel] = useState<'SMS' | 'EMAIL'>('SMS');
  const [simulatedSmsNotification, setSimulatedSmsNotification] = useState<{
    mobile: string;
    otpCode: string;
    sentAt: string;
  } | null>(null);
  const [adminPin, setAdminPin] = useState('');
  const [showAdminPin, setShowAdminPin] = useState(false);
  const [showFacultyPin, setShowFacultyPin] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (adminId) {
      setAdminIdInput(adminId);
    }
  }, [adminId]);

  useEffect(() => {
    if (adminResetEmail) {
      setAdminEmailInput(adminResetEmail);
    }
  }, [adminResetEmail]);

  useEffect(() => {
    if (adminMobile) {
      setAdminMobileInput(adminMobile);
    }
  }, [adminMobile]);

  const getSubmissions = (): SavedSubmission[] => {
    const combined = savedSubmissions || [];
    const uniqueMap = new Map<string, SavedSubmission>();
    combined.forEach((sub) => {
      if (sub && sub.student && sub.student.registerNo) {
        uniqueMap.set(sub.student.registerNo.trim().toUpperCase(), sub);
      }
    });
    return Array.from(uniqueMap.values());
  };

  const handleStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (isStudentLoginLocked) {
      setErrorMsg('⛔ STUDENT LOGIN IS LOCKED BY ADMIN: Student assessment portal access is currently disabled by Examination Administration.');
      return;
    }

    const pinSchedStatus = isStudentPinActive(studentPinSchedule);
    if (!pinSchedStatus.isActive) {
      setErrorMsg(`🕒 SCHEDULED ACCESS PIN INACTIVE: ${pinSchedStatus.reason || 'Student Access PIN is currently inactive according to the scheduled active time.'}`);
      saveSecurityLogToFirestore({
        id: `sec_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        timestamp: new Date().toLocaleString(),
        eventType: 'STUDENT_PIN_SCHEDULE_INACTIVE_ATTEMPT',
        severity: 'MEDIUM',
        details: `Student attempted login outside scheduled active PIN window (${pinSchedStatus.formattedWindow || 'Scheduled'}). Register Number: ${registerNo.trim().toUpperCase() || 'N/A'}.`,
        userRegNo: registerNo.trim().toUpperCase() || 'N/A',
        userName: name.trim() || 'Unknown Student',
        userRole: 'student'
      });
      return;
    }

    if (!name.trim()) {
      setErrorMsg('Please enter student name (initial at the end).');
      return;
    }
    if (!registerNo.trim()) {
      setErrorMsg('Please enter student Register Number.');
      return;
    }

    const trimmedRegNo = registerNo.trim().toUpperCase();
    const enrolledRecord = lookupEnrolledStudent(trimmedRegNo);

    const isPinValid = accessKey.trim() === studentAccessPin || 
      (enrolledRecord?.assignedPassword && accessKey.trim() === enrolledRecord.assignedPassword) ||
      accessKey.trim() === 'cit@123';

    if (!isPinValid) {
      setErrorMsg('Invalid Access PIN. Please check your credentials.');
      saveSecurityLogToFirestore({
        id: `sec_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        timestamp: new Date().toLocaleString(),
        eventType: 'INVALID_STUDENT_PIN_ATTEMPT',
        severity: 'MEDIUM',
        details: `Failed Student PIN entry attempt for Register Number / User ID: ${trimmedRegNo}.`,
        userRegNo: trimmedRegNo,
        userName: name.trim() || 'Unknown Student',
        userRole: 'student'
      });
      return;
    }

    // Check if there is an active saved session authorized for this student
    let isResumingAuthorizedSession = false;
    let localDeviceId: string | undefined = undefined;
    try {
      const activeSavedRaw = localStorage.getItem('CIT_ACTIVE_ASSESSMENT_SESSION');
      if (activeSavedRaw) {
        const parsed = JSON.parse(activeSavedRaw);
        if (parsed?.student?.registerNo?.trim()?.toUpperCase() === trimmedRegNo) {
          isResumingAuthorizedSession = true;
          localDeviceId = parsed?.student?.deviceId;
        }
      }
    } catch (e) {}

    if (resumableStudentForLogin && resumableStudentForLogin.registerNo.trim().toUpperCase() === trimmedRegNo) {
      isResumingAuthorizedSession = true;
      if (resumableStudentForLogin.deviceId) {
        localDeviceId = resumableStudentForLogin.deviceId;
      }
    }

    // Enforce Unique Register Number & Block Concurrent Logins
    try {
      const activeSessionCheck = await checkActiveStudentSession(trimmedRegNo, localDeviceId);
      
      if (activeSessionCheck.isAlreadyCompleted) {
        const completedDate = activeSessionCheck.completedAt 
          ? new Date(activeSessionCheck.completedAt).toLocaleString()
          : 'Completed Earlier';
        const promptMsg = `Attention: Student with Register Number "${trimmedRegNo}" has already attended and submitted this assessment. Each student is strictly permitted only ONE attempt.`;
        setErrorMsg(promptMsg);
        setAttemptBlockedDetails({
          studentName: activeSessionCheck.session?.studentName || name.trim().toUpperCase(),
          registerNo: trimmedRegNo,
          department: activeSessionCheck.session?.department || department,
          submittedAt: completedDate,
          isSecurityLockout: false
        });
        setShowAttemptBlockedModal(true);
        return;
      }

      if (activeSessionCheck.isActiveOnAnotherDevice) {
        const promptMsg = `⚠️ CONCURRENT LOGIN BLOCKED: Register Number "${trimmedRegNo}" is currently active on another workstation or window. Concurrent logins for the same candidate are strictly forbidden.`;
        setErrorMsg(promptMsg);
        setAttemptBlockedDetails({
          studentName: activeSessionCheck.session?.studentName || name.trim().toUpperCase(),
          registerNo: trimmedRegNo,
          department: activeSessionCheck.session?.department || department,
          submittedAt: new Date(activeSessionCheck.session?.startedAt || Date.now()).toLocaleTimeString(),
          isSecurityLockout: false,
          isConcurrentBlocked: true,
          violationReason: `Active session already running on device [${activeSessionCheck.session?.deviceId?.substring(0, 8) || 'Another Device'}]. Concurrent multi-logins are prohibited.`
        });
        setShowAttemptBlockedModal(true);

        saveSecurityLogToFirestore({
          id: `sec_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          timestamp: new Date().toLocaleString(),
          eventType: 'CONCURRENT_LOGIN_BLOCKED',
          severity: 'HIGH',
          details: `Concurrent login blocked for Register Number ${trimmedRegNo}. Already active on device ${activeSessionCheck.session?.deviceId}.`,
          userRegNo: trimmedRegNo,
          userName: name.trim().toUpperCase(),
          userRole: 'student'
        });
        return;
      }
    } catch (err) {
      console.warn('Active session verification failed (offline fallback allowed):', err);
    }

    if (!isResumingAuthorizedSession) {
      // Direct point-check for prior submission across cloud and local storage
      try {
        const priorCheck = await checkStudentPriorSubmission(trimmedRegNo);
        if (priorCheck.hasCompleted) {
          const promptMsg = `Attention: Student with Register Number "${trimmedRegNo}" has already attended and submitted this assessment on ${priorCheck.submittedAt || 'an earlier session'}. Each student is permitted only ONE attempt.`;
          setErrorMsg(promptMsg);
          setAttemptBlockedDetails({
            studentName: name.trim().toUpperCase(),
            registerNo: trimmedRegNo,
            department,
            submittedAt: priorCheck.submittedAt || 'Completed',
            isSecurityLockout: false
          });
          setShowAttemptBlockedModal(true);
          return;
        }
      } catch (err) {
        console.warn('Prior submission check warning:', err);
      }

      const allSubs = getSubmissions();

      // Check CIT_LOCKED_STUDENTS from localStorage
      let lockedRegs: string[] = [];
      try {
        const savedLocked = localStorage.getItem('CIT_LOCKED_STUDENTS');
        if (savedLocked) lockedRegs = JSON.parse(savedLocked);
      } catch (e) {}

      const isLockedInProps = lockedStudentRegNos.map((r) => r.trim().toUpperCase()).includes(trimmedRegNo);
      const isLockedInStorage = lockedRegs.includes(trimmedRegNo);

      // Check if student has an existing submission or locked status
      const existingSub = allSubs.find(
        (sub) => sub.student && sub.student.registerNo && sub.student.registerNo.trim().toUpperCase() === trimmedRegNo
      );

      // Check if candidate has an active savepoint to resume from (allow up to 3 attempts)
      const hasSavepoint = hasResumableSavepoint(trimmedRegNo);
      const resumableSession = hasSavepoint ? loadActiveAssessmentSession(trimmedRegNo) : null;
      const currentAttempt = resumableSession?.attemptCount || 1;

      // If attempts limit of 3 is reached
      if (hasSavepoint && currentAttempt >= 3) {
        const promptMsg = `🔒 MAXIMUM ATTEMPTS EXCEEDED: Student Register Number "${trimmedRegNo}" has utilized all 3 permitted attempts for this assessment. Re-attempts are strictly barred.`;
        setErrorMsg(promptMsg);
        setAttemptBlockedDetails({
          studentName: existingSub?.student?.name || name.trim(),
          registerNo: trimmedRegNo,
          department: existingSub?.student?.department || department,
          submittedAt: existingSub?.submittedAt || new Date().toLocaleString(),
          isSecurityLockout: true,
          violationReason: 'Maximum 3 attempts exhausted during tab switches or interruptions'
        });
        setShowAttemptBlockedModal(true);

        saveSecurityLogToFirestore({
          id: `sec_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          timestamp: new Date().toLocaleString(),
          eventType: 'STUDENT_ACCOUNT_LOCKED',
          severity: 'HIGH',
          details: `Student account exceeded maximum 3 attempts: ${trimmedRegNo} (${name.trim()}).`,
          userRegNo: trimmedRegNo,
          userName: name.trim(),
          userRole: 'student'
        });
        return;
      }

      // If candidate has a valid savepoint and attempts remaining (< 3), allow resumption!
      const canResumeSavepoint = hasSavepoint && currentAttempt < 3;

      const isSecurityLocked = !canResumeSavepoint && (isLockedInProps || isLockedInStorage || existingSub?.isLockedOut || existingSub?.securityViolation?.isViolated);

      if (isSecurityLocked) {
        const promptMsg = `🔒 ACCOUNT LOCKED: Student Register Number "${trimmedRegNo}" has been locked out by Admin or due to a security violation. Re-attempts are strictly barred.`;
        setErrorMsg(promptMsg);
        setAttemptBlockedDetails({
          studentName: existingSub?.student?.name || name.trim(),
          registerNo: trimmedRegNo,
          department: existingSub?.student?.department || department,
          submittedAt: existingSub?.submittedAt || existingSub?.securityViolation?.timestamp || new Date().toLocaleString(),
          isSecurityLockout: true,
          violationReason: existingSub?.securityViolation?.reason || 'Account locked by Examination Admin'
        });
        setShowAttemptBlockedModal(true);

        saveSecurityLogToFirestore({
          id: `sec_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          timestamp: new Date().toLocaleString(),
          eventType: 'STUDENT_ACCOUNT_LOCKED',
          severity: 'HIGH',
          details: `Locked student account attempted re-entry: ${trimmedRegNo} (${name.trim()}).`,
          userRegNo: trimmedRegNo,
          userName: name.trim(),
          userRole: 'student'
        });
        return;
      }

      if (existingSub && !canResumeSavepoint) {
        const promptMsg = `Attention: Student with Register Number "${trimmedRegNo}" (${existingSub.student.name}) has already attended and submitted this assessment on ${existingSub.submittedAt}. Each student is permitted only ONE attempt.`;
        setErrorMsg(promptMsg);
        setAttemptBlockedDetails({
          studentName: existingSub.student.name,
          registerNo: existingSub.student.registerNo,
          department: existingSub.student.department,
          submittedAt: existingSub.submittedAt,
          isSecurityLockout: false
        });
        setShowAttemptBlockedModal(true);

        saveSecurityLogToFirestore({
          id: `sec_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          timestamp: new Date().toLocaleString(),
          eventType: 'UNAUTHORIZED_COLLABORATION_PREVENTED',
          severity: 'MEDIUM',
          details: `Duplicate assessment attempt blocked for student: ${trimmedRegNo} (${existingSub.student.name}).`,
          userRegNo: trimmedRegNo,
          userName: existingSub.student.name,
          userRole: 'student'
        });
        return;
      }
    }

    const candidatePayload: StudentInfo = {
      name: (name.trim() && name.trim().toUpperCase() !== 'STUDENT CANDIDATE')
        ? name.trim().toUpperCase()
        : (DCS_SPECIFIC_STUDENTS[trimmedRegNo]?.name || name.trim().toUpperCase()),
      registerNo: trimmedRegNo,
      department: (DCS_SPECIFIC_STUDENTS[trimmedRegNo] || trimmedRegNo.includes('DCS'))
        ? 'MSc Decision and Computing Sciences'
        : department,
      accessPasscode: accessKey.trim(),
      authenticatedAt: new Date().toISOString(),
      deviceId: localDeviceId || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `dev_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`)
    };

    setPendingConsentStudent(candidatePayload);
    setIsConsentModalOpen(true);
  };

  const handleProceedWithConsent = () => {
    if (pendingConsentStudent) {
      const studentToAuth = pendingConsentStudent;
      setIsConsentModalOpen(false);
      setPendingConsentStudent(null);
      // Persist student login record for department attendance report tracking
      recordStudentLoginToFirestore({
        registerNo: studentToAuth.registerNo,
        studentName: studentToAuth.name,
        department: studentToAuth.department,
        loginTimestamp: Date.now(),
        loginTimeFormatted: getCurrentTimestamp(true),
        deviceId: studentToAuth.deviceId,
        status: 'LOGGED_IN'
      }).catch((e) => console.warn('Could not record student login:', e));
      onAuthenticateStudent(studentToAuth);
    }
  };

  const handleFacultySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (isFacultyLoginLocked) {
      setErrorMsg('⛔ FACULTY LOGIN IS LOCKED BY ADMIN: Faculty portal access is currently disabled by Examination Administration.');
      saveSecurityLogToFirestore({
        id: `sec_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        timestamp: new Date().toLocaleString(),
        eventType: 'INVALID_FACULTY_PIN_ATTEMPT',
        severity: 'MEDIUM',
        details: 'Attempted faculty portal login while Faculty Login is locked by Admin.',
        userRole: 'faculty'
      });
      return;
    }

    const enteredId = facultyEmail.trim();
    const enteredPassword = facultyPin.trim();

    let isAuthorized = false;

    if (authorizedFaculty && authorizedFaculty.length > 0) {
      const match = authorizedFaculty.find(
        (fac) =>
          fac.facultyId.trim().toLowerCase() === enteredId.toLowerCase() &&
          fac.password === enteredPassword
      );
      if (match) {
        isAuthorized = true;
      }
    } else {
      if (enteredPassword === facultyAccessPin) {
        isAuthorized = true;
      }
    }

    if (isAuthorized) {
      onOpenAdminPortal('faculty');
    } else {
      setErrorMsg('Invalid Faculty Login ID or Password. Only authorized faculty members listed in the Admin Portal can log in.');
      saveSecurityLogToFirestore({
        id: `sec_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        timestamp: new Date().toLocaleString(),
        eventType: 'INVALID_FACULTY_PIN_ATTEMPT',
        severity: 'HIGH',
        details: `Unauthorized Faculty login attempt for ID "${enteredId}".`,
        userRole: 'faculty'
      });
    }
  };

  const handleAdminSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const enteredId = adminIdInput.trim();
    const configuredId = (adminId || 'admin').trim();

    const isIdMatch = enteredId.toLowerCase() === configuredId.toLowerCase();
    const isPinMatch = adminPin === adminAccessPin;

    if (isIdMatch && isPinMatch) {
      onOpenAdminPortal('admin');
    } else if (!isIdMatch && !isPinMatch) {
      setErrorMsg('Invalid Admin ID and Admin PIN. Please check your credentials.');
      saveSecurityLogToFirestore({
        id: `sec_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        timestamp: new Date().toLocaleString(),
        eventType: 'INVALID_ADMIN_LOGIN_ATTEMPT',
        severity: 'CRITICAL',
        details: `CRITICAL: Unauthorized Admin Login attempt with ID "${enteredId}" and invalid PIN!`,
        userRole: 'guest'
      });
    } else if (!isIdMatch) {
      setErrorMsg('Invalid Admin ID. Please check your Admin ID credentials.');
      saveSecurityLogToFirestore({
        id: `sec_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        timestamp: new Date().toLocaleString(),
        eventType: 'INVALID_ADMIN_ID_ATTEMPT',
        severity: 'HIGH',
        details: `Unauthorized Admin ID entry attempt ("${enteredId}") detected in Admin Portal login!`,
        userRole: 'guest'
      });
    } else {
      setErrorMsg('Invalid Admin PIN. Please check your credentials.');
      saveSecurityLogToFirestore({
        id: `sec_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        timestamp: new Date().toLocaleString(),
        eventType: 'INVALID_ADMIN_PIN_ATTEMPT',
        severity: 'CRITICAL',
        details: 'CRITICAL: Unauthorized Admin PIN entry attempt detected in Admin Portal login!',
        userRole: 'guest'
      });
    }
  };

  const handleVerifySecretRecoveryPin = (e: React.FormEvent) => {
    e.preventDefault();
    setRecoveryErrorMsg('');

    const enteredSecretPin = secretRecoveryPinInput.trim();
    const configuredSecretPin = (adminSecretRecoveryPin || '7777').trim();

    if (enteredSecretPin !== configuredSecretPin) {
      setRecoveryErrorMsg('Incorrect Admin Secret Security Recovery PIN. Please enter the Secret PIN set by the Administrator.');
      saveSecurityLogToFirestore({
        id: `sec_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        timestamp: new Date().toLocaleString(),
        eventType: 'INVALID_ADMIN_PIN_ATTEMPT',
        severity: 'HIGH',
        details: 'Failed Admin Secret Recovery PIN verification attempt.',
        userRole: 'guest'
      });
      return;
    }

    setAdminPin(adminAccessPin || 'cit@123');

    saveSecurityLogToFirestore({
      id: `sec_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toLocaleString(),
      eventType: 'ADMIN_RECOVERY_PIN_VERIFIED',
      severity: 'HIGH',
      details: 'Admin Secret Recovery PIN verified successfully. Admin PIN recovered and auto-filled.',
      userRole: 'admin'
    });

    setRecoveryStep('SUCCESS');
  };

  return (
    <div id="homepage-window-container" className="min-h-[calc(100vh-65px)] bg-yellow-50 text-slate-800 flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 transition-all">
      <div className="w-full max-w-5xl space-y-4">

        {/* Security Lockout Banner */}
        {securityLockoutBanner && (
          <div className="p-4 bg-rose-600 text-white rounded-xl shadow-lg border border-rose-700 flex items-center justify-between gap-3 animate-in fade-in duration-300">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-rose-700 rounded-lg shrink-0">
                <Lock className="w-5 h-5 text-rose-100" />
              </div>
              <p className="text-xs sm:text-sm font-bold leading-snug">{securityLockoutBanner}</p>
            </div>
            {onClearLockoutBanner && (
              <button
                onClick={onClearLockoutBanner}
                className="p-1.5 bg-rose-700 hover:bg-rose-800 text-rose-100 rounded-lg transition-colors shrink-0"
                title="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        )}

        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          
          {/* Left Column: Institutional Information & Test Specs */}
          <div className="lg:col-span-7 bg-yellow-100/60 border border-yellow-300/80 rounded-2xl p-6 sm:p-8 flex flex-col justify-between shadow-xl relative overflow-hidden">
          
          <div className="relative z-10 space-y-5">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-100 text-blue-800 text-xs font-bold rounded-full mb-2">
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                Active Examination Specification
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 font-sans tracking-tight">
                {activeTest.title || 'Mathematics Competency Assessment'}
              </h2>
              <p className="text-slate-600 text-xs sm:text-sm leading-relaxed font-medium mt-1">
                Comprehensive diagnostic assessment evaluating core concepts across various mathematics domains for B.E. and B.Tech. programmes.
              </p>
            </div>

            {/* Mathematics Assessment Hero Visual */}
            <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-white p-2 shadow-md group">
              <img
                src={cognitiveHeroImg}
                alt="Mathematics & Logic Evaluation"
                referrerPolicy="no-referrer"
                className="w-full h-44 sm:h-52 object-contain object-center transform group-hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-xs text-slate-800 bg-slate-900/90 text-white backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/20 shadow-sm">
                <div className="flex items-center gap-1.5 text-blue-200 font-medium">
                  <Sparkles className="w-3.5 h-3.5 text-blue-300 animate-pulse" />
                  <span>Interactive Mathematical Diagnostic Engine</span>
                </div>
                <span className="text-[10px] text-slate-300 font-mono font-bold">{activeTest.testCode || 'CIT-2026'}</span>
              </div>
            </div>

            {/* Test Specifications Grid */}
            <div className="grid grid-cols-2 gap-3.5 pt-1">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 shadow-xs">
                <div className="flex items-center gap-2 text-blue-600 font-bold text-xs mb-1">
                  <Clock className="w-4 h-4 text-blue-600" />
                  Time Limit
                </div>
                <p className="text-lg sm:text-xl font-extrabold text-slate-900 font-mono">{activeTest.durationMinutes || 60} Minutes</p>
                <p className="text-[11px] text-slate-500 mt-0.5 font-medium">
                  {Math.floor((activeTest.durationMinutes || 60) / 60) > 0 ? `${Math.floor((activeTest.durationMinutes || 60) / 60)} hr ` : ''}
                  {(activeTest.durationMinutes || 60) % 60 > 0 ? `${(activeTest.durationMinutes || 60) % 60} min ` : ''}
                  • Auto-submit timer
                </p>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 shadow-xs">
                <div className="flex items-center gap-2 text-indigo-600 font-bold text-xs mb-1">
                  <Brain className="w-4 h-4 text-indigo-600" />
                  Total Scope
                </div>
                <p className="text-lg sm:text-xl font-extrabold text-slate-900 font-mono">{totalQuestions} Questions</p>
                <p className="text-[11px] text-slate-500 mt-0.5 font-medium">{activeTest.domains?.length || 5} Domains • {totalQuestions} Marks</p>
              </div>
            </div>

            {/* Difficulty Breakdown Specs with visual bar */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-slate-700" />
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">Question Level Distribution</span>
                </div>
                <span className="text-[10px] font-semibold px-2 py-0.5 bg-slate-200 text-slate-700 rounded-full">
                  {activeTest.levelDistribution?.mode === 'count'
                    ? 'Direct Counts'
                    : activeTest.levelDistribution?.mode === 'domain_wise'
                    ? 'Domain-Wise Allocation'
                    : `Percentage (${l1Pct}% / ${l2Pct}% / ${l3Pct}%)`}
                </span>
              </div>

              {/* Visual Proportion Bar */}
              <div className="h-2.5 w-full bg-slate-200 rounded-full overflow-hidden flex shadow-inner">
                <div
                  style={{ width: `${l1Pct}%` }}
                  className="h-full bg-emerald-500 transition-all duration-500"
                  title={`Level 1: ${l1Pct}% (${l1Count} Questions)`}
                />
                <div
                  style={{ width: `${l2Pct}%` }}
                  className="h-full bg-amber-500 transition-all duration-500"
                  title={`Level 2: ${l2Pct}% (${l2Count} Questions)`}
                />
                <div
                  style={{ width: `${l3Pct}%` }}
                  className="h-full bg-rose-500 transition-all duration-500"
                  title={`Level 3: ${l3Pct}% (${l3Count} Questions)`}
                />
              </div>

              {/* Level Details */}
              <div className="space-y-1.5 text-xs">
                <div className="flex items-center justify-between p-2 bg-emerald-50/90 border border-emerald-200/80 rounded-lg">
                  <span className="text-emerald-900 font-semibold flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                    Level 1 (Foundational Knowledge)
                  </span>
                  <span className="text-emerald-950 font-mono font-bold">{l1Count} Qs ({l1Pct}%) • {l1Count} Marks</span>
                </div>
                <div className="flex items-center justify-between p-2 bg-amber-50/90 border border-amber-200/80 rounded-lg">
                  <span className="text-amber-900 font-semibold flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
                    Level 2 (Analytical & Procedural)
                  </span>
                  <span className="text-amber-950 font-mono font-bold">{l2Count} Qs ({l2Pct}%) • {l2Count} Marks</span>
                </div>
                <div className="flex items-center justify-between p-2 bg-rose-50/90 border border-rose-200/80 rounded-lg">
                  <span className="text-rose-900 font-semibold flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0" />
                    Level 3 (Advanced Synthesis)
                  </span>
                  <span className="text-rose-950 font-mono font-bold">{l3Count} Qs ({l3Pct}%) • {l3Count} Marks</span>
                </div>
              </div>
            </div>

            {/* Configured Domains Pill List */}
            <div className="space-y-2">
              <p className="text-xs text-slate-700 font-bold flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
                <span>Configured Curriculum Domains ({activeTest.domains?.length || 0}):</span>
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                {(activeTest.domains || []).map((d) => (
                  <div key={d.id || d.name} className="px-3 py-1.5 bg-indigo-50/80 text-indigo-950 font-medium rounded-lg border border-indigo-200/80 flex items-center justify-between shadow-2xs">
                    <span className="truncate pr-1 font-semibold">{d.name}</span>
                    <span className="font-mono font-bold text-indigo-700 shrink-0 bg-white/80 px-1.5 py-0.5 rounded text-[10px]">
                      {d.questionCount} Qs ({totalQuestions > 0 ? Math.round(((d.questionCount || 0) / totalQuestions) * 100) : 0}%)
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Department list badge */}
            <div className="space-y-2">
              <p className="text-xs text-slate-700 font-bold flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-blue-600" />
                <span>Target Eligible Programmes / Departments ({availableProgrammes.length}):</span>
              </p>
              <div className="flex flex-wrap gap-1.5 text-[11px]">
                {availableProgrammes.map((d) => (
                  <span key={d} className="px-2.5 py-1 bg-blue-50 text-blue-800 font-medium rounded-md border border-blue-200 shadow-2xs">
                    {d}
                  </span>
                ))}
              </div>
            </div>

          </div>

          <div className="relative z-10 pt-6 mt-6 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 font-mono">
            <span>© Coimbatore Institute of Technology</span>
            <span className="flex items-center gap-1.5 text-blue-600 font-semibold">
              Institutional Assessment Portal
            </span>
          </div>

        </div>

        {/* Right Column: Separate Login Tabs for Student & Faculty */}
        <div className={`lg:col-span-5 rounded-2xl p-6 sm:p-8 flex flex-col justify-between shadow-xl transition-all duration-300 ${
          activeTab === 'student'
            ? 'bg-orange-100/90 border-2 border-orange-300/90'
            : activeTab === 'faculty'
            ? 'bg-emerald-50 border-2 border-emerald-200'
            : 'bg-purple-50 border-2 border-purple-200'
        }`}>
          
          <div className="space-y-6">
            
            {/* SEPARATE LOGIN TABS HEADER */}
            <div>
              <p className="text-sm uppercase font-extrabold text-slate-600 tracking-wider mb-2.5">Select Portal Login</p>

              <div className="grid grid-cols-3 p-1.5 bg-slate-200/90 rounded-xl border border-slate-300 gap-1.5">
                {/* Student Tab */}
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('student');
                    setErrorMsg('');
                    try {
                      const url = new URL(window.location.href);
                      url.searchParams.set('role', 'student');
                      url.searchParams.delete('tab');
                      window.history.replaceState({}, '', url.toString());
                    } catch {}
                  }}
                  className={`py-2.5 px-2 rounded-lg text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    activeTab === 'student'
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 border border-blue-700 ring-2 ring-blue-400/40'
                      : 'bg-blue-50/80 hover:bg-blue-100/90 text-blue-900 border border-blue-200/80'
                  }`}
                >
                  <User className={`w-4 h-4 ${activeTab === 'student' ? 'text-white' : 'text-blue-600'}`} />
                  <span>Student</span>
                  {isStudentLoginLocked && (
                    <span className="ml-1 px-1.5 py-0.2 bg-rose-500 text-white text-[9px] rounded font-bold uppercase">Locked</span>
                  )}
                </button>

                {/* Faculty Tab */}
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('faculty');
                    setErrorMsg('');
                    try {
                      const url = new URL(window.location.href);
                      url.searchParams.set('role', 'faculty');
                      url.searchParams.delete('tab');
                      window.history.replaceState({}, '', url.toString());
                    } catch {}
                  }}
                  className={`py-2.5 px-2 rounded-lg text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    activeTab === 'faculty'
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30 border border-emerald-700 ring-2 ring-emerald-400/40'
                      : 'bg-emerald-50/80 hover:bg-emerald-100/90 text-emerald-900 border border-emerald-200/80'
                  }`}
                >
                  <ShieldCheck className={`w-4 h-4 ${activeTab === 'faculty' ? 'text-white' : 'text-emerald-600'}`} />
                  <span>Faculty</span>
                  {isFacultyLoginLocked && (
                    <span className="ml-1 px-1.5 py-0.2 bg-rose-500 text-white text-[9px] rounded font-bold uppercase">Locked</span>
                  )}
                </button>

                {/* Admin Tab */}
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('admin');
                    setErrorMsg('');
                    try {
                      const url = new URL(window.location.href);
                      url.searchParams.set('role', 'admin');
                      url.searchParams.delete('tab');
                      window.history.replaceState({}, '', url.toString());
                    } catch {}
                  }}
                  className={`py-2.5 px-2 rounded-lg text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    activeTab === 'admin'
                      ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30 border border-purple-700 ring-2 ring-purple-400/40'
                      : 'bg-purple-50/80 hover:bg-purple-100/90 text-purple-900 border border-purple-200/80'
                  }`}
                >
                  <Lock className={`w-4 h-4 ${activeTab === 'admin' ? 'text-white' : 'text-purple-600'}`} />
                  <span>Admin</span>
                </button>
              </div>
            </div>

            {errorMsg && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-start gap-2 shadow-2xs">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span className="font-medium">{errorMsg}</span>
              </div>
            )}

            {/* TAB 1: STUDENT LOGIN FORM */}
            {activeTab === 'student' && (
              <form onSubmit={handleStudentSubmit} className="space-y-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900 font-sans flex items-center gap-2">
                    <User className="w-4 h-4 text-blue-600" />
                    Student Login
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5 font-medium">
                    Enter student credentials to initiate or resume the 60-minute assessment.
                  </p>
                </div>

                {resumableStudentForLogin && (
                  <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl text-indigo-900 text-xs flex items-start gap-2.5 shadow-xs animate-in fade-in">
                    <RotateCcw className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">▶ Assessment Session Resumable</p>
                      <p className="text-[11px] text-indigo-800 mt-0.5">
                        Candidate <strong>{resumableStudentForLogin.name}</strong> (Register Number: {resumableStudentForLogin.registerNo}) is authorized by Admin to resume their assessment. Enter the Student Access PIN below to log in.
                      </p>
                    </div>
                  </div>
                )}

                {/* Name */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Student Name (Initial at the end) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. VAIDEHI SUNDARAM S"
                      value={name}
                      onChange={(e) => setName(e.target.value.toUpperCase())}
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 text-sm focus:outline-none focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-100 font-sans uppercase placeholder-slate-400 font-medium"
                    />
                  </div>
                </div>

                {/* Register Number */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Register Number <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <CreditCard className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. 26CS001, 26IT001 or 71762104001"
                      value={registerNo}
                      onChange={(e) => {
                        const val = e.target.value;
                        setRegisterNo(val);
                        const upper = val.trim().toUpperCase();
                        const enrolled = lookupEnrolledStudent(upper);
                        if (enrolled) {
                          if (enrolled.name) setName(enrolled.name.toUpperCase());
                          if (enrolled.programme) setDepartment(enrolled.programme);
                          if (enrolled.assignedPassword && !accessKey) setAccessKey(enrolled.assignedPassword);
                        } else if (DCS_SPECIFIC_STUDENTS[upper]) {
                          setDepartment('MSc Decision and Computing Sciences');
                          if (!name || name === 'STUDENT CANDIDATE') {
                            setName(DCS_SPECIFIC_STUDENTS[upper].name);
                          }
                        } else if (upper.includes('DCS')) {
                          setDepartment('MSc Decision and Computing Sciences');
                        }
                      }}
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 text-sm font-mono focus:outline-none focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-100 uppercase placeholder-slate-400 font-bold"
                    />
                  </div>
                </div>

                {/* Department */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Department / Program <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Building2 className="w-4 h-4 absolute left-3 top-3 text-slate-400 pointer-events-none" />
                    <select
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 text-sm focus:outline-none focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-100 appearance-none font-sans font-medium"
                    >
                      {availableProgrammes.map((progName) => (
                        <option key={progName} value={progName}>
                          {progName}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Institutional Key / Access PIN */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                    <span>Access PIN <span className="text-red-500">*</span></span>
                    {studentPinSchedule?.isEnabled && (
                      <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Scheduled Access
                      </span>
                    )}
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                    <input
                      type="password"
                      value={accessKey}
                      onChange={(e) => setAccessKey(e.target.value)}
                      placeholder="Enter Access PIN"
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 text-sm font-mono focus:outline-none focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-100 font-bold"
                    />
                  </div>

                  {studentPinSchedule && studentPinSchedule.isEnabled && (() => {
                    const schedStatus = isStudentPinActive(studentPinSchedule);
                    return (
                      <div className={`mt-2 p-2.5 rounded-lg border text-xs font-medium flex items-start gap-2 ${
                        schedStatus.isActive 
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
                          : 'bg-amber-50 border-amber-300 text-amber-900'
                      }`}>
                        <Clock className={`w-4 h-4 shrink-0 mt-0.5 ${schedStatus.isActive ? 'text-emerald-600' : 'text-amber-600 animate-pulse'}`} />
                        <div className="flex-1 space-y-0.5">
                          <div className="flex items-center justify-between font-bold text-[11px]">
                            <span>Scheduled PIN Window:</span>
                            <span className={`px-1.5 py-0.5 text-[9px] uppercase rounded font-bold tracking-wider ${
                              schedStatus.isActive ? 'bg-emerald-200 text-emerald-900' : 'bg-amber-200 text-amber-900'
                            }`}>
                              {schedStatus.isActive ? 'Active Now' : 'Currently Inactive'}
                            </span>
                          </div>
                          <p className="text-[11px] font-mono font-medium">{schedStatus.formattedWindow}</p>
                          {!schedStatus.isActive && schedStatus.reason && (
                            <p className="text-[10px] text-amber-800 font-medium italic mt-1 bg-amber-100/70 p-1.5 rounded">
                              ⚠️ {schedStatus.reason}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Student Instructions & Application Navigation Banner */}
                <div className="bg-blue-50/80 border border-blue-200 rounded-xl overflow-hidden shadow-2xs">
                  <div className="p-3 bg-blue-100/60 flex items-center justify-between text-xs font-bold text-blue-900">
                    <button
                      type="button"
                      onClick={() => setShowInstructions(!showInstructions)}
                      className="flex items-center gap-2 hover:text-blue-700 transition-colors cursor-pointer text-left"
                    >
                      <HelpCircle className="w-4 h-4 text-blue-600 shrink-0" />
                      <span>Student Guidelines & Navigation Instructions</span>
                      {showInstructions ? (
                        <ChevronUp className="w-4 h-4 text-blue-700 ml-1" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-blue-700 ml-1" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsGuidelinesModalOpen(true)}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 hover:text-blue-900 bg-white/80 hover:bg-white px-2.5 py-1 rounded-lg border border-blue-200 shadow-2xs transition-all cursor-pointer shrink-0 ml-2"
                      title="Open full guidelines dialog"
                    >
                      <span>Full View</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>

                  {showInstructions && (
                    <div className="p-3.5 space-y-3.5 text-xs text-slate-700 bg-white">
                      {/* Section 1: Assessment Specifications */}
                      <div>
                        <div className="flex items-center gap-1.5 font-bold text-blue-900 mb-1.5">
                          <BookOpen className="w-3.5 h-3.5 text-blue-600" />
                          <span>1. Assessment Specifications</span>
                        </div>
                        <ul className="space-y-1.5 pl-4 list-disc text-[11px] text-slate-600 font-medium">
                          <li><strong>Duration:</strong> 60 minutes automated countdown timer in header (starts upon login; auto-submits on expiry).</li>
                          <li><strong>Structure:</strong> 50 Multiple Choice Questions across 5 Mathematical Domains (10 Qs each).</li>
                          <li><strong>Topics:</strong> Limits & Continuity, Differentiation, Integration, Probability & Statistics, Matrices & Determinants.</li>
                          <li><strong>Marking:</strong> 1 mark per correct answer (Total 50 Marks). <em>No negative marking.</em></li>
                          <li><strong>Cognitive Levels:</strong> Level 1 - 40% (20 Questions), Level 2 - 30% (15 Questions), Level 3 - 30% (15 Questions).</li>
                        </ul>
                      </div>

                      {/* Section 2: Navigation in Application */}
                      <div className="pt-2 border-t border-slate-100">
                        <div className="flex items-center gap-1.5 font-bold text-indigo-900 mb-1.5">
                          <Compass className="w-3.5 h-3.5 text-indigo-600" />
                          <span>2. Navigation & Interface Controls</span>
                        </div>
                        <div className="space-y-1.5 text-[11px] text-slate-600">
                          <p><strong>• Domain Switcher Tabs:</strong> Click top domain tabs (Calculus, Probability, Number Systems, Trigonometry, Statistics) to switch topics at any time.</p>
                          <p><strong>• Question Palette Grid (Right Side):</strong> All 50 question numbers are displayed directly in the palette grid for instant jumping:</p>
                          <div className="grid grid-cols-3 gap-1 pl-3 text-[10px] font-medium">
                            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-blue-600 shrink-0"/> Blue: Answered</span>
                            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0"/> Yellow: Marked for Review</span>
                            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-slate-200 border border-slate-300 shrink-0"/> Gray: Unanswered</span>
                          </div>
                          <p><strong>• Navigation Controls:</strong> Click <em>Next Question</em> to proceed sequentially, or jump directly using any number in the <strong>Question Palette</strong>. On the 50th question, the next button concludes navigation.</p>
                          <p><strong>• Review & Clear:</strong> Use <em>Flag for Review</em> to mark questions to re-check, and <em>Clear</em> to reset chosen options.</p>
                          <p><strong>• Accessibility Mode:</strong> Use the accessibility toggle in the top bar to increase font size (Large / XL) as needed.</p>
                        </div>
                      </div>

                      {/* Section 3: Proctoring & Anti-Screenshot / Anti-Copy Rules */}
                      <div className="pt-2 border-t border-slate-100">
                        <div className="flex items-center gap-1.5 font-bold text-rose-900 mb-1.5">
                          <ShieldCheck className="w-3.5 h-3.5 text-rose-600" />
                          <span>3. Anti-Copy & Screenshot Prohibition Rules</span>
                        </div>
                        <ul className="space-y-1.5 pl-4 list-disc text-[11px] text-rose-900/90 font-medium">
                          <li><strong>Screenshots Prohibited:</strong> Screenshots, PrintScreen key, and screen snipping utilities are strictly intercepted and blocked.</li>
                          <li><strong>Copying Prohibited:</strong> Copying, cutting, text selection, and right-click context menus are completely disabled.</li>
                          <li><strong>Tab & Window Tracking:</strong> Navigating away from the assessment window is monitored. Students are allowed up to 3 attempts during tab switch overs or unexpected terminations, resuming from their last savepoint.</li>
                          <li><strong>Continuous Auto-Save:</strong> Answers are continuously saved in real time, enabling seamless offline resilience.</li>
                        </ul>
                      </div>

                      {/* Section 4: Final Submission */}
                      <div className="pt-2 border-t border-slate-100">
                        <div className="flex items-center gap-1.5 font-bold text-emerald-900 mb-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>4. Final Assessment Submission</span>
                        </div>
                        <p className="text-[11px] text-emerald-800 font-medium">
                          Click <strong>Submit Assessment</strong> in the bottom panel when completed. A confirmation prompt will display your total answered and unanswered counts before final evaluation.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Dynamic Savepoint Resumption Banner */}
                {(() => {
                  const regUpper = registerNo.trim().toUpperCase();
                  if (!regUpper) return null;
                  const hasSave = hasResumableSavepoint(regUpper);
                  if (!hasSave) return null;
                  const session = loadActiveAssessmentSession(regUpper);
                  const att = session?.attemptCount || 1;
                  if (att >= 3) return null;
                  const answered = Object.keys(session?.responses || {}).length;
                  return (
                    <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl flex items-start gap-2.5 shadow-2xs">
                      <RotateCcw className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-bold text-amber-900">
                          Active Assessment Savepoint Detected
                        </p>
                        <p className="text-[11px] text-amber-800 font-medium mt-0.5">
                          You have an active session with <strong>{answered}</strong> saved answer(s). Click below to resume your assessment from the last savepoint on <strong>Attempt {att + 1} of 3</strong>.
                        </p>
                      </div>
                    </div>
                  );
                })()}

                {/* Start / Resume Button */}
                {(() => {
                  const regUpper = registerNo.trim().toUpperCase();
                  const hasSave = regUpper ? hasResumableSavepoint(regUpper) : false;
                  const session = hasSave ? loadActiveAssessmentSession(regUpper) : null;
                  const att = session?.attemptCount || 1;
                  const isResuming = hasSave && att < 3;

                  return (
                    <button
                      type="submit"
                      className={`w-full mt-2 py-3 text-white font-bold text-sm rounded-lg transition-all shadow-lg flex items-center justify-center gap-2 group cursor-pointer ${
                        isResuming
                          ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/20'
                          : 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/20'
                      }`}
                    >
                      {isResuming ? (
                        <>
                          <RotateCcw className="w-4 h-4 group-hover:-rotate-45 transition-transform" />
                          <span>Resume Assessment (Attempt {att + 1} of 3)</span>
                        </>
                      ) : (
                        <>
                          <span>Start Assessment</span>
                          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </>
                      )}
                    </button>
                  );
                })()}
              </form>
            )}

            {/* TAB 2: FACULTY LOGIN FORM */}
            {activeTab === 'faculty' && (
              <form onSubmit={handleFacultySubmit} className="space-y-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900 font-sans flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    Faculty Login
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5 font-medium">
                    Authorized faculty members enter credentials to review student assessment records & reports.
                  </p>
                </div>

                {/* Faculty ID */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Faculty Login ID <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. FAC101"
                      value={facultyEmail}
                      onChange={(e) => setFacultyEmail(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 text-sm focus:outline-none focus:border-emerald-600 focus:bg-white focus:ring-2 focus:ring-emerald-100 font-sans placeholder-slate-400 font-medium"
                    />
                  </div>
                </div>

                {/* Faculty Password */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                    <span>Faculty Password <span className="text-red-500">*</span></span>
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                    <input
                      type={showFacultyPin ? "text" : "password"}
                      required
                      value={facultyPin}
                      onChange={(e) => setFacultyPin(e.target.value)}
                      placeholder="Enter Faculty Password"
                      className="w-full pl-9 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 text-sm font-mono focus:outline-none focus:border-emerald-600 focus:bg-white focus:ring-2 focus:ring-emerald-100 font-bold"
                    />
                    <button
                      type="button"
                      onClick={() => setShowFacultyPin(!showFacultyPin)}
                      className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                      title={showFacultyPin ? "Hide Password" : "Show Password"}
                    >
                      {showFacultyPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-lg transition-all shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Login</span>
                  <ShieldCheck className="w-4 h-4" />
                </button>
              </form>
            )}

            {/* TAB 3: ADMIN LOGIN FORM */}
            {activeTab === 'admin' && (
              <div className="space-y-5">
                <form onSubmit={handleAdminSubmit} className="space-y-4">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 font-sans flex items-center gap-2">
                      <Lock className="w-4 h-4 text-purple-600" />
                      Admin Login
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5 font-medium">
                      System administrators enter credentials for Assessment Reports, question bank upload & system administration.
                    </p>
                  </div>

                  {/* Admin ID Field */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Admin ID <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                      <input
                        type="text"
                        required
                        placeholder="e.g. admin"
                        value={adminIdInput}
                        onChange={(e) => setAdminIdInput(e.target.value)}
                        className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 text-sm focus:outline-none focus:border-purple-600 focus:bg-white focus:ring-2 focus:ring-purple-100 font-sans placeholder-slate-400 font-bold"
                      />
                    </div>
                  </div>

                  {/* Admin PIN Field */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-bold text-slate-700">
                        Admin PIN <span className="text-red-500">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setShowPasswordRecoveryModal(true);
                          setRecoveryStep('VERIFY');
                          setSecretRecoveryPinInput('');
                          setRecoveryErrorMsg('');
                        }}
                        className="text-[11px] font-bold text-purple-600 hover:text-purple-800 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <KeyRound className="w-3.5 h-3.5" />
                        <span>Password Recovery</span>
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                      <input
                        type={showAdminPin ? "text" : "password"}
                        required
                        value={adminPin}
                        onChange={(e) => setAdminPin(e.target.value)}
                        placeholder="Enter Admin PIN"
                        className="w-full pl-9 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 text-sm font-mono focus:outline-none focus:border-purple-600 focus:bg-white focus:ring-2 focus:ring-purple-100 font-bold"
                      />
                      <button
                        type="button"
                        onClick={() => setShowAdminPin(!showAdminPin)}
                        className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                        title={showAdminPin ? "Hide PIN" : "Show PIN"}
                      >
                        {showAdminPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Credential Helper Badge */}
                  <div className="p-2.5 bg-purple-50 border border-purple-200 rounded-lg flex items-center justify-between text-xs">
                    <span className="text-purple-900 font-medium">
                      Default: <code className="font-mono font-bold text-purple-800 bg-purple-100 px-1 py-0.5 rounded">{adminId || 'admin'}</code> / PIN: <code className="font-mono font-bold text-purple-800 bg-purple-100 px-1 py-0.5 rounded">{adminAccessPin || 'cit@123'}</code>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setAdminIdInput(adminId || 'admin');
                        setAdminPin(adminAccessPin || 'cit@123');
                        setErrorMsg('');
                      }}
                      className="text-purple-700 hover:text-purple-900 font-bold hover:underline cursor-pointer ml-2 text-[11px]"
                    >
                      Fill Default
                    </button>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold text-sm rounded-lg transition-all shadow-lg shadow-purple-600/20 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>Login</span>
                    <Lock className="w-4 h-4" />
                  </button>
                </form>
              </div>
            )}

          </div>

          <div className="pt-4 mt-6 border-t border-slate-200 text-center">
            <p className="text-[11px] text-slate-500 font-medium">
              Coimbatore Institute of Technology • Mathematics Competency Assessment System
            </p>
          </div>

        </div>

      </div>

      {/* Attempt Blocked / Security Lockout Modal Alert */}
      {showAttemptBlockedModal && attemptBlockedDetails && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-rose-300 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5 text-rose-600 font-extrabold text-base">
                <div className="p-2 bg-rose-100 rounded-xl">
                  <Lock className="w-5 h-5 text-rose-600" />
                </div>
                <span>
                  {attemptBlockedDetails.isConcurrentBlocked
                    ? 'CONCURRENT LOGIN BLOCKED - ACTIVE SESSION DETECTED'
                    : attemptBlockedDetails.isSecurityLockout
                    ? 'ACCOUNT LOCKED - SECURITY VIOLATION'
                    : 'Assessment Already Attended'}
                </span>
              </div>
              <button
                onClick={() => setShowAttemptBlockedModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-xs text-slate-700 leading-relaxed font-medium">
                {attemptBlockedDetails.isConcurrentBlocked ? (
                  <>
                    Student <strong className="text-slate-900 font-bold">{attemptBlockedDetails.studentName}</strong>: An active test session is <strong className="text-rose-700 font-bold uppercase">already running for Register Number {attemptBlockedDetails.registerNo}</strong> on another device or window. Multiple concurrent logins with the same Register Number are not allowed.
                  </>
                ) : attemptBlockedDetails.isSecurityLockout ? (
                  <>
                    Student <strong className="text-slate-900 font-bold">{attemptBlockedDetails.studentName}</strong>: Your login has been <strong className="text-rose-700 font-bold uppercase">locked out from further attempts</strong> due to a security violation during assessment.
                  </>
                ) : (
                  <>
                    Attention <strong className="text-slate-900 font-bold">{attemptBlockedDetails.studentName}</strong>: Our examination records confirm that you have already completed and submitted your assessment.
                  </>
                )}
              </p>

              <div className="p-3.5 bg-rose-50/80 border border-rose-200/80 rounded-xl space-y-2 text-xs">
                <div className="flex justify-between items-center text-slate-700">
                  <span className="font-semibold text-slate-500">Student Name:</span>
                  <span className="font-bold text-slate-900">{attemptBlockedDetails.studentName}</span>
                </div>
                <div className="flex justify-between items-center text-slate-700">
                  <span className="font-semibold text-slate-500">Register Number:</span>
                  <span className="font-mono font-bold text-rose-700">{attemptBlockedDetails.registerNo}</span>
                </div>
                <div className="flex justify-between items-center text-slate-700">
                  <span className="font-semibold text-slate-500">Department:</span>
                  <span className="font-medium text-slate-800">{attemptBlockedDetails.department}</span>
                </div>
                <div className="flex justify-between items-center text-slate-700 pt-1 border-t border-rose-200/60">
                  <span className="font-semibold text-slate-500">
                    {attemptBlockedDetails.isConcurrentBlocked
                      ? 'Session Active Since:'
                      : attemptBlockedDetails.isSecurityLockout
                      ? 'Incident Time:'
                      : 'Submission Date:'}
                  </span>
                  <span className="font-mono font-bold text-slate-900">{attemptBlockedDetails.submittedAt}</span>
                </div>
                <div className="flex justify-between items-center text-slate-700">
                  <span className="font-semibold text-slate-500">Attempt Status:</span>
                  <span className="px-2 py-0.5 bg-rose-600 text-white font-bold text-[10px] rounded-md">
                    {attemptBlockedDetails.isConcurrentBlocked
                      ? '🚫 BLOCKED (ALREADY LOGGED IN)'
                      : attemptBlockedDetails.isSecurityLockout
                      ? '🔒 LOCKED OUT (TERMINATED)'
                      : '1 / 1 (Max Chance Reached)'}
                  </span>
                </div>
                {(attemptBlockedDetails.isSecurityLockout || attemptBlockedDetails.isConcurrentBlocked) && (
                  <div className="flex justify-between items-center text-slate-700 pt-1 border-t border-rose-200/60">
                    <span className="font-semibold text-slate-500">Status Reason:</span>
                    <span className="font-bold text-rose-800 text-[11px]">{attemptBlockedDetails.violationReason || 'Moved to another application/window'}</span>
                  </div>
                )}
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-[11px] leading-snug flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  <strong>{attemptBlockedDetails.isConcurrentBlocked ? 'Single Login Policy:' : attemptBlockedDetails.isSecurityLockout ? 'Security Enforcement:' : 'Institutional Policy:'}</strong>{' '}
                  {attemptBlockedDetails.isConcurrentBlocked
                    ? 'Each student is assigned a unique Register Number and can only be signed into one active testing session at any given time. If you got disconnected from your previous session, please wait a moment or notify your invigilator.'
                    : attemptBlockedDetails.isSecurityLockout
                    ? 'Switching applications or leaving the assessment window is strictly forbidden. This incident has been recorded in the Admin portal. Contact examination administration for queries.'
                    : 'Each student is strictly permitted only one attempt for the Mathematics Competency Assessment. Repeat attempts are not permitted.'}
                </span>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={() => setShowAttemptBlockedModal(false)}
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all shadow-md cursor-pointer"
              >
                Understood & Return
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Password Recovery Modal */}
      {showPasswordRecoveryModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-purple-200 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-purple-900 via-slate-900 to-purple-950 text-white p-5 flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-purple-500/20 text-purple-300 rounded-xl border border-purple-500/30 shrink-0">
                  <KeyRound className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold font-sans">
                    Admin Password Recovery
                  </h3>
                  <p className="text-xs text-purple-200 mt-0.5">
                    Coimbatore Institute of Technology • Portal Security
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPasswordRecoveryModal(false)}
                className="p-1 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5">
              {recoveryErrorMsg && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{recoveryErrorMsg}</span>
                </div>
              )}

              {recoveryStep === 'VERIFY' && (
                <form onSubmit={handleVerifySecretRecoveryPin} className="space-y-4">
                  <div className="bg-purple-50 border border-purple-200 p-3.5 rounded-xl text-xs text-purple-950 space-y-1">
                    <p className="font-bold flex items-center gap-1.5 text-purple-900">
                      <KeyRound className="w-4 h-4 text-purple-700" />
                      Secret Recovery PIN Authorization
                    </p>
                    <p className="text-[11px] text-purple-800 leading-relaxed">
                      Enter the Admin Secret Security Recovery PIN to verify your identity and recover your Admin Login PIN.
                    </p>
                  </div>

                  {/* Field: Admin Secret Recovery PIN (Hidden/Masked) */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Admin Secret Security Recovery PIN <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Key className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                      <input
                        type={showSecretRecoveryPinInput ? "text" : "password"}
                        required
                        value={secretRecoveryPinInput}
                        onChange={(e) => setSecretRecoveryPinInput(e.target.value)}
                        placeholder="Enter Secret Recovery PIN"
                        className="w-full pl-9 pr-9 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 text-sm font-mono font-bold focus:outline-none focus:border-purple-600 focus:bg-white focus:ring-2 focus:ring-purple-100"
                      />
                      <button
                        type="button"
                        onClick={() => setShowSecretRecoveryPinInput(!showSecretRecoveryPinInput)}
                        className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                        title={showSecretRecoveryPinInput ? "Hide Secret PIN" : "Show Secret PIN"}
                      >
                        {showSecretRecoveryPinInput ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="pt-3 flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setShowPasswordRecoveryModal(false)}
                      className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg border border-slate-300 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-2 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-lg shadow-md shadow-purple-600/20 flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <KeyRound className="w-4 h-4" />
                      <span>Verify Secret PIN & Recover PIN</span>
                    </button>
                  </div>
                </form>
              )}

              {recoveryStep === 'SUCCESS' && (
                <div className="space-y-4 text-center py-2">
                  <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto border border-emerald-200">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-base font-bold text-slate-900">
                      Secret Recovery PIN Verified!
                    </h4>
                    <p className="text-xs text-slate-600 leading-relaxed max-w-sm mx-auto">
                      Your Secret Security Recovery PIN was verified. Here is your configured Admin password:
                    </p>
                  </div>

                  {/* Display Configured Password Box */}
                  <div className="p-4 bg-purple-50 border border-purple-200 rounded-xl space-y-2 text-left">
                    <div className="flex items-center justify-between text-xs font-bold text-purple-900">
                      <span className="flex items-center gap-1.5">
                        <Key className="w-4 h-4 text-purple-700" />
                        Configured Admin Password:
                      </span>
                      <span className="text-[10px] bg-purple-200/80 text-purple-800 px-2 py-0.5 rounded font-semibold">
                        Active Password
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2 bg-white border border-purple-300 rounded-lg p-2.5 font-mono font-bold text-sm text-purple-950">
                      <span>{adminAccessPin || 'cit@123'}</span>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(adminAccessPin || 'cit@123');
                        }}
                        className="text-xs bg-purple-100 hover:bg-purple-200 text-purple-800 px-3 py-1 rounded border border-purple-300 transition-colors cursor-pointer shrink-0 font-sans font-bold flex items-center gap-1"
                        title="Copy Password to Clipboard"
                      >
                        <span>Copy Password</span>
                      </button>
                    </div>
                    <p className="text-[11px] text-slate-600">
                      This password has also been auto-filled into the Admin Login Password field.
                    </p>
                  </div>

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowPasswordRecoveryModal(false);
                        setRecoveryStep('VERIFY');
                        setSecretRecoveryPinInput('');
                        setRecoveryErrorMsg('');
                      }}
                      className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-lg shadow-md cursor-pointer"
                    >
                      Proceed to Admin Login
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* STUDENT EXAMINATION CONSENT & SECURITY ASSURANCE MODAL */}
      {pendingConsentStudent && (
        <StudentConsentModal
          student={pendingConsentStudent}
          isOpen={isConsentModalOpen}
          onConsentAndProceed={handleProceedWithConsent}
          onCancel={() => {
            setIsConsentModalOpen(false);
            setPendingConsentStudent(null);
          }}
        />
      )}

      {/* STUDENT GUIDELINES & NAVIGATION FULL MODAL */}
      <StudentGuidelinesModal
        isOpen={isGuidelinesModalOpen}
        onClose={() => setIsGuidelinesModalOpen(false)}
      />

      {/* SECURITY VIOLATION EXIT WARNING MODAL */}
      {securityExitWarningModal?.isOpen && (
        <div className="fixed inset-0 z-[99999] bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border-2 border-rose-500 max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Red Alert Header */}
            <div className="bg-rose-600 px-6 py-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-rose-700 rounded-xl shrink-0">
                  <ShieldAlert className="w-6 h-6 text-white animate-pulse" />
                </div>
                <div>
                  <span className="text-[10px] font-mono tracking-widest uppercase bg-rose-700/80 px-2 py-0.5 rounded font-bold">
                    PROCTORING SECURITY SYSTEM
                  </span>
                  <h3 className="text-base font-black tracking-tight leading-tight mt-0.5">
                    {securityExitWarningModal.title}
                  </h3>
                </div>
              </div>
              {onCloseSecurityExitWarningModal && (
                <button
                  type="button"
                  onClick={onCloseSecurityExitWarningModal}
                  className="p-1.5 hover:bg-rose-700 rounded-lg text-rose-100 transition-colors cursor-pointer"
                  title="Close Warning"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Warning Body */}
            <div className="p-6 space-y-4">
              {/* Alert Callout */}
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl space-y-1.5">
                <div className="flex items-center gap-2 text-rose-800 font-bold text-xs sm:text-sm">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>Assessment Exited with Immediate Warning</span>
                </div>
                <p className="text-xs text-rose-900 leading-relaxed font-medium">
                  {securityExitWarningModal.message}
                </p>
              </div>

              {/* Student Incident Details Box */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Incident Audit & Candidate Record
                </div>
                <div className="grid grid-cols-2 gap-2.5 text-xs">
                  <div>
                    <span className="text-slate-500 text-[11px] block">Candidate:</span>
                    <span className="font-bold text-slate-900">{securityExitWarningModal.studentName}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[11px] block">Register No:</span>
                    <span className="font-bold text-slate-900 font-mono">{securityExitWarningModal.registerNo}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[11px] block">Department:</span>
                    <span className="font-bold text-slate-900">{securityExitWarningModal.department}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[11px] block">Timestamp:</span>
                    <span className="font-bold text-slate-900 font-mono text-[11px]">{securityExitWarningModal.timestamp}</span>
                  </div>
                </div>
                <div className="pt-2 border-t border-slate-200 flex flex-col gap-1 text-xs">
                  <span className="text-slate-500 text-[11px]">Proctoring Reason:</span>
                  <span className="font-semibold text-rose-700 bg-rose-50 px-2 py-1 rounded border border-rose-200 font-mono text-[11px] leading-tight">
                    {securityExitWarningModal.reason}
                  </span>
                </div>
              </div>

              {/* Institutional Policy Notice */}
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-xs text-amber-900 leading-relaxed">
                <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <span>
                  Coimbatore Institute of Technology enforces strict anti-cheating regulations. Tab switching and screenshot capture are prohibited. This incident has been logged into the audit trail.
                </span>
              </div>

              {/* Action Button */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={onCloseSecurityExitWarningModal}
                  className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs sm:text-sm rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Lock className="w-4 h-4 text-rose-400" />
                  <span>Acknowledge Warning & Close</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  </div>
);
};
