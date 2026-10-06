import React, { useState, useEffect, useRef } from 'react';
import { RefreshCw, Wifi, WifiOff } from 'lucide-react';
import {
  StudentInfo,
  Question,
  SectionId,
  StudentResponse,
  CognitiveProfileReport,
  SavedSubmission,
  FacultyCredential,
  StudentPinSchedule,
  AssessmentTestConfig,
  ActiveStudentSession,
  ActiveAssessmentSession
} from './types';
import { ALL_QUESTIONS, generateTestQuestions } from './data/questionsData';
import { getActiveAssessmentTest, generateQuestionsForTestConfig } from './utils/testManagerUtils';
import { calculateCognitiveProfile } from './utils/cognitiveEvaluator';
import { retrieveAndRestore49TodaySubmissions, seedSampleSubmissionsToFirestore } from './utils/sampleDataUtils';
import { getCurrentTimestamp, formatDateDisplay } from './utils/dateUtils';
import {
  saveSubmissionToFirestore,
  subscribeSubmissions,
  getAllSubmissionsFromFirestore,
  updateSubmissionInFirestore,
  updateSubmissionStudentDetailsInFirestore,
  saveGlobalSettingsToFirestore,
  subscribeGlobalSettings,
  saveQuestionBankToFirestore,
  subscribeQuestionBank,
  saveSecurityLogToFirestore,
  deleteSubmissionFromFirestore,
  deleteMultipleSubmissionsFromFirestore,
  clearAllSubmissionsFromFirestore,
  syncDcsDepartmentRenamesToFirestore,
  registerActiveStudentSession,
  updateSessionHeartbeat,
  releaseActiveStudentSession,
  subscribeActiveSessions,
  clearStaleActiveSessions,
  resumeStudentSessionInFirestore,
  saveAssessmentSavepointToFirestore
} from './lib/firebase';
import { Header } from './components/Header';
import { AuthGate } from './components/AuthGate';
import { CountdownModal } from './components/CountdownModal';
import { SecurityGuard } from './components/SecurityGuard';
import { ErrorBoundary } from './components/ErrorBoundary';

// Lazy load heavy components for fast build & instant client loading
const AssessmentView = React.lazy(() => import('./components/AssessmentView').then(m => ({ default: m.AssessmentView })));
const StudentSubmissionView = React.lazy(() => import('./components/StudentSubmissionView').then(m => ({ default: m.StudentSubmissionView })));
const CognitiveReportView = React.lazy(() => import('./components/CognitiveReportView').then(m => ({ default: m.CognitiveReportView })));
const AdminPortal = React.lazy(() => import('./components/AdminPortal').then(m => ({ default: m.AdminPortal })));
import {
  isOnline,
  saveActiveAssessmentSession,
  loadActiveAssessmentSession,
  hasResumableSavepoint,
  clearActiveAssessmentSession,
  queueOfflineSubmission,
  getPendingOfflineSubmissions,
  clearPendingOfflineSubmissions,
  syncPendingSubmissions
} from './utils/offlineSync';

const TEST_DURATION_SECONDS = 3600; // Exactly 1 hour = 3600 seconds
const SAVED_SESSION_KEY = 'CIT_ACTIVE_ASSESSMENT_SESSION';

export default function App() {
  // Parse any URL search parameters immediately on mount for instantaneous deep-linking
  const initialUrlParams = (() => {
    try {
      const searchParams = new URLSearchParams(window.location.search);
      const pathname = (window.location.pathname || '').toLowerCase();
      const hash = (window.location.hash || '').toLowerCase();
      let tabParam = searchParams.get('tab') || searchParams.get('role');
      if (!tabParam) {
        if (pathname.includes('student') || hash.includes('student')) tabParam = 'student';
        else if (pathname.includes('faculty') || hash.includes('faculty')) tabParam = 'faculty';
        else if (pathname.includes('admin') || hash.includes('admin')) tabParam = 'admin';
      }
      const viewParam = searchParams.get('view');
      return {
        tab: tabParam === 'admin' || tabParam === 'faculty' || tabParam === 'student' ? tabParam : null,
        view: viewParam === 'admin' || viewParam === 'auth' || viewParam === 'assessment' ? viewParam : null
      };
    } catch {
      return { tab: null, view: null };
    }
  })();

  // Check for existing saved assessment session on initial mount
  const savedSessionData = (() => {
    try {
      const saved = localStorage.getItem(SAVED_SESSION_KEY);
      if (saved) {
        const parsed: ActiveAssessmentSession = JSON.parse(saved);
        if (parsed && parsed.student && parsed.responses && parsed.currentTestQuestions) {
          const now = Date.now();
          const elapsedSec = Math.floor((now - (parsed.savedAt || now)) / 1000);
          const remainingSec = Math.max(0, parsed.timeRemainingSeconds - elapsedSec);
          // If interrupted (e.g. unknown reload or unexpected closure), increment attempt count (up to 3)
          const currentAttempt = parsed.attemptCount || 1;
          const wasInterrupted = parsed.status === 'interrupted' || (now - (parsed.savedAt || now)) > 4000;
          const nextAttempt = wasInterrupted ? Math.min(3, currentAttempt + 1) : currentAttempt;

          return {
            ...parsed,
            attemptCount: nextAttempt,
            timeRemainingSeconds: remainingSec
          };
        }
      }
    } catch (e) {
      console.error('Failed to parse saved session from localStorage:', e);
    }
    return null;
  })();

  const [viewState, setViewState] = useState<'auth' | 'assessment' | 'submission' | 'report' | 'admin'>(() => {
    if (initialUrlParams.view && initialUrlParams.view !== 'admin') return initialUrlParams.view as any;
    return savedSessionData && savedSessionData.timeRemainingSeconds > 0 ? 'assessment' : 'auth';
  });
  const [authInitialTab, setAuthInitialTab] = useState<'student' | 'faculty' | 'admin'>(() =>
    initialUrlParams.tab || 'student'
  );
  const [resumableStudentForLogin, setResumableStudentForLogin] = useState<StudentInfo | null>(null);
  const [userRole, setUserRole] = useState<'faculty' | 'admin'>(() =>
    initialUrlParams.tab === 'faculty' ? 'faculty' : 'admin'
  );
  const [student, setStudent] = useState<StudentInfo | null>(() => savedSessionData?.student || null);

  // Attempt tracking (allowing up to 3 attempts during tab switch or unknown termination)
  const [attemptCount, setAttemptCount] = useState<number>(() => {
    return savedSessionData?.attemptCount || 1;
  });
  const [resumeNotice, setResumeNotice] = useState<string | null>(() => {
    if (savedSessionData && (savedSessionData.attemptCount || 1) > 1) {
      return `Assessment Resumed: Attempt ${savedSessionData.attemptCount} of 3 in progress. Resumed from last savepoint.`;
    }
    return null;
  });

  // Instant Launch State (0 delay)
  const [isLaunchingCountdown, setIsLaunchingCountdown] = useState(false);
  const [pendingStudent, setPendingStudent] = useState<StudentInfo | null>(null);

  // Active Question Bank (Custom Excel Uploaded or Default 100-Question CIT Master Bank)
  const [activeQuestionBank, setActiveQuestionBank] = useState<Question[]>(() => {
    try {
      const custom = localStorage.getItem('CIT_CUSTOM_QUESTION_BANK');
      if (custom) {
        const parsed = JSON.parse(custom);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error('Failed to parse custom question bank:', e);
    }
    return ALL_QUESTIONS;
  });

  // Active Assessment Test Configuration
  const [activeAssessmentTest, setActiveAssessmentTest] = useState<AssessmentTestConfig | null>(() => getActiveAssessmentTest());

  // Current Assessment Sampled Questions based on active test configuration
  const [currentTestQuestions, setCurrentTestQuestions] = useState<Question[]>(() => {
    if (savedSessionData?.currentTestQuestions) return savedSessionData.currentTestQuestions;
    const initialTest = getActiveAssessmentTest();
    return initialTest ? generateQuestionsForTestConfig(initialTest, activeQuestionBank) : generateTestQuestions(activeQuestionBank);
  });

  // Assessment Navigation
  const [currentSection, setCurrentSection] = useState<SectionId>(() => {
    if (savedSessionData?.currentSection) return savedSessionData.currentSection;
    if (currentTestQuestions.length > 0 && currentTestQuestions[0].sectionId) return currentTestQuestions[0].sectionId;
    return 'calculus';
  });
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(() => savedSessionData?.currentQuestionIndex || 0); // 0..9
  const [responses, setResponses] = useState<Record<string, StudentResponse>>(() => savedSessionData?.responses || {});

  // Timer state
  const [timeRemainingSeconds, setTimeRemainingSeconds] = useState(() => {
    if (savedSessionData?.timeRemainingSeconds !== undefined) return savedSessionData.timeRemainingSeconds;
    const initialTest = getActiveAssessmentTest();
    return (initialTest?.durationMinutes || 60) * 60;
  });
  const [isTimerActive, setIsTimerActive] = useState(() => !!(savedSessionData && savedSessionData.timeRemainingSeconds > 0));
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Completed Profile Report
  const [report, setReport] = useState<CognitiveProfileReport | null>(null);

  // Home Auth Refresh Key (forces home page form re-initialization on entry)
  const [authKey, setAuthKey] = useState(0);

  // Examiner Saved Submissions History (Primary Source: Cloud Storage - Firestore with Instant Local Recovery)
  const [savedSubmissions, setSavedSubmissions] = useState<SavedSubmission[]>(() => {
    try {
      const localKeys = ['CIT_COGNITIVE_SUBMISSIONS', 'CIT_PENDING_OFFLINE_SUBMISSIONS', 'CIT_OFFLINE_SUBMISSIONS', 'CIT_ASSESSMENT_SUBMISSIONS'];
      const unique = new Map<string, SavedSubmission>();
      for (const k of localKeys) {
        const raw = localStorage.getItem(k);
        if (raw) {
          const list = JSON.parse(raw);
          if (Array.isArray(list)) {
            list.forEach((s) => {
              if (s && (s.id || s.student?.registerNo)) {
                const sid = s.id || `SUB-LOCAL-${s.student?.registerNo}`;
                unique.set(sid, { ...s, id: sid });
              }
            });
          }
        }
      }
      return Array.from(unique.values());
    } catch {
      return [];
    }
  });

  // Real-time Active Concurrent Student Sessions (Tuned for 800+ Students)
  const [activeSessions, setActiveSessions] = useState<ActiveStudentSession[]>([]);

  // Mirror savedSubmissions to local storage whenever updated so local recovery is always 100% up-to-date
  useEffect(() => {
    if (savedSubmissions && savedSubmissions.length > 0) {
      try {
        localStorage.setItem('CIT_COGNITIVE_SUBMISSIONS', JSON.stringify(savedSubmissions));
      } catch (err) {
        console.warn('Failed to mirror savedSubmissions to localStorage:', err);
      }
    }
  }, [savedSubmissions]);

  // Migration Effect: Attempt to upload local submissions to Cloud Storage and synchronize department mappings
  useEffect(() => {
    // Immediate sync of DCS Register Numbers (26DCS014, 26DCS016, 26DCS024, 26DCS025, 26DCS038, 26DCS047) to "MSc Decision and Computing Sciences"
    syncDcsDepartmentRenamesToFirestore().catch((err) => console.warn('Initial DCS department sync:', err));

    try {
      const legacyKeys = ['CIT_COGNITIVE_SUBMISSIONS', 'CIT_ASSESSMENT_SUBMISSIONS', 'CIT_OFFLINE_SUBMISSIONS', 'CIT_PENDING_OFFLINE_SUBMISSIONS'];
      const localSubsToMigrate: SavedSubmission[] = [];
      for (const key of legacyKeys) {
        const item = localStorage.getItem(key);
        if (item) {
          try {
            const parsed = JSON.parse(item);
            if (Array.isArray(parsed)) {
              localSubsToMigrate.push(...parsed);
            }
          } catch (e) {}
        }
      }
      if (localSubsToMigrate.length > 0) {
        const uniqueMap = new Map<string, SavedSubmission>();
        localSubsToMigrate.forEach((s) => {
          if (s && s.id) uniqueMap.set(s.id, s);
        });
        uniqueMap.forEach((sub) => {
          saveSubmissionToFirestore(sub).catch(() => {});
        });
      }
    } catch (e) {
      console.error('Error synchronizing local submissions with Cloud Storage:', e);
    }
  }, []);

  // Global Portal Access & Lock States Controlled by Admin
  const [isStudentLoginLocked, setIsStudentLoginLocked] = useState<boolean>(() => {
    try {
      return localStorage.getItem('CIT_STUDENT_LOGIN_LOCKED') === 'true';
    } catch (e) {
      return false;
    }
  });

  const [isFacultyLoginLocked, setIsFacultyLoginLocked] = useState<boolean>(() => {
    try {
      return localStorage.getItem('CIT_FACULTY_LOGIN_LOCKED') === 'true';
    } catch (e) {
      return false;
    }
  });

  const [lockedStudentRegNos, setLockedStudentRegNos] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('CIT_LOCKED_STUDENTS');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  // Network Connectivity & Offline Queue States
  const [isOnlineState, setIsOnlineState] = useState<boolean>(() => isOnline());
  const [pendingSyncCount, setPendingSyncCount] = useState<number>(() => getPendingOfflineSubmissions().length);
  const [syncBannerMessage, setSyncBannerMessage] = useState<string | null>(null);

  // Network connectivity listener & Automatic Sync Engine
  useEffect(() => {
    const handleOnline = async () => {
      setIsOnlineState(true);
      console.log('Device reconnected online. Triggering automatic offline sync...');
      const result = await syncPendingSubmissions();
      setPendingSyncCount(getPendingOfflineSubmissions().length);
      if (result.syncedCount > 0) {
        setSyncBannerMessage(`🌐 Network Connection Restored: Successfully synchronized ${result.syncedCount} offline submission(s) to Firestore database!`);
        setTimeout(() => setSyncBannerMessage(null), 7000);
      }
    };

    const handleOffline = () => {
      setIsOnlineState(false);
      console.warn('Device lost network connection. Switching to real-time offline local mode.');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial check for unsynced offline submissions on load
    if (isOnline()) {
      syncPendingSubmissions().then((result) => {
        setPendingSyncCount(getPendingOfflineSubmissions().length);
        if (result.syncedCount > 0) {
          setSyncBannerMessage(`🌐 Auto-synced ${result.syncedCount} offline submission(s) with database.`);
          setTimeout(() => setSyncBannerMessage(null), 5000);
        }
      });
    }

    // Periodic sync attempt every 20 seconds if online
    const syncInterval = setInterval(() => {
      if (isOnline()) {
        const pending = getPendingOfflineSubmissions();
        setPendingSyncCount(pending.length);
        if (pending.length > 0) {
          syncPendingSubmissions().then((res) => {
            setPendingSyncCount(getPendingOfflineSubmissions().length);
            if (res.syncedCount > 0) {
              setSyncBannerMessage(`🌐 Auto-synced ${res.syncedCount} pending submission(s) with database.`);
              setTimeout(() => setSyncBannerMessage(null), 5000);
            }
          });
        }
      }
    }, 20000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(syncInterval);
    };
  }, []);

  // Sync active test configuration in real time when changed by admin
  useEffect(() => {
    const handleActiveTestChange = () => {
      const current = getActiveAssessmentTest();
      setActiveAssessmentTest(current);
    };
    window.addEventListener('cit_active_test_updated', handleActiveTestChange);
    window.addEventListener('storage', handleActiveTestChange);
    return () => {
      window.removeEventListener('cit_active_test_updated', handleActiveTestChange);
      window.removeEventListener('storage', handleActiveTestChange);
    };
  }, []);

  // Helper to generate questions according to active test configuration
  const sampleTestQuestions = (bank: Question[] = activeQuestionBank) => {
    const testConfig = getActiveAssessmentTest();
    if (testConfig) {
      return generateQuestionsForTestConfig(testConfig, bank);
    }
    return generateTestQuestions(bank);
  };

  // Custom Access PINs Controlled by Admin
  const [studentAccessPin, setStudentAccessPin] = useState<string>(() => {
    try {
      return localStorage.getItem('CIT_STUDENT_ACCESS_PIN') || 'cit@123';
    } catch (e) {
      return 'cit@123';
    }
  });

  const [facultyAccessPin, setFacultyAccessPin] = useState<string>(() => {
    try {
      return localStorage.getItem('CIT_FACULTY_ACCESS_PIN') || 'cit@123';
    } catch (e) {
      return 'cit@123';
    }
  });

  const [adminAccessPin, setAdminAccessPin] = useState<string>(() => {
    try {
      return localStorage.getItem('CIT_ADMIN_ACCESS_PIN') || 'cit@123';
    } catch (e) {
      return 'cit@123';
    }
  });

  const [adminId, setAdminId] = useState<string>(() => {
    try {
      return localStorage.getItem('CIT_ADMIN_ID') || 'admin';
    } catch (e) {
      return 'admin';
    }
  });

  const [adminResetEmail, setAdminResetEmail] = useState<string>(() => {
    try {
      return localStorage.getItem('CIT_ADMIN_RESET_EMAIL') || 'admin@cit.edu.in';
    } catch (e) {
      return 'admin@cit.edu.in';
    }
  });

  const [adminMobile, setAdminMobile] = useState<string>(() => {
    try {
      return localStorage.getItem('CIT_ADMIN_MOBILE') || '+91 9876543210';
    } catch (e) {
      return '+91 9876543210';
    }
  });

  const [adminSecretRecoveryPin, setAdminSecretRecoveryPin] = useState<string>(() => {
    try {
      return localStorage.getItem('CIT_ADMIN_SECRET_RECOVERY_PIN') || '7777';
    } catch (e) {
      return '7777';
    }
  });

  const [studentPinSchedule, setStudentPinSchedule] = useState<StudentPinSchedule>(() => {
    try {
      const saved = localStorage.getItem('CIT_STUDENT_PIN_SCHEDULE');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Failed to parse student PIN schedule:', e);
    }
    return {
      isEnabled: false,
      type: 'datetime',
      startTime: '',
      endTime: ''
    };
  });

  const [assessmentExtraMinutes, setAssessmentExtraMinutes] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('CIT_EXTRA_TIMER_MINUTES');
      if (saved !== null) return parseInt(saved, 10) || 0;
    } catch (e) {
      console.error(e);
    }
    return 0;
  });

  const [assessmentExtraWarningMsg, setAssessmentExtraWarningMsg] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('CIT_EXTRA_TIMER_WARNING_MSG');
      if (saved !== null) return saved;
    } catch (e) {
      console.error(e);
    }
    return '⚠️ Notice: Extra time has been granted by the Admin for this assessment session. Please manage your time effectively.';
  });

  const [authorizedFaculty, setAuthorizedFaculty] = useState<FacultyCredential[]>(() => {
    try {
      const saved = localStorage.getItem('CIT_AUTHORIZED_FACULTY');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Failed to parse authorized faculty:', e);
    }
    return [
      {
        id: 'fac_default_1',
        facultyId: 'FAC101',
        facultyName: 'Dr. R. Ramanathan',
        department: 'B.E. Computer Science & Engineering',
        password: 'cit@123',
        createdAt: '2026-01-15'
      },
      {
        id: 'fac_default_2',
        facultyId: 'FAC102',
        facultyName: 'Prof. S. Priya',
        department: 'B.Tech. Information Technology',
        password: 'cit@123',
        createdAt: '2026-01-15'
      }
    ];
  });

  // Firestore Realtime Subscriptions (Optimized for 250+ concurrent users)
  useEffect(() => {
    let unsubscribeSubs: (() => void) | null = null;
    // Direct initial fetch, sync department renames, and live subscription to all submissions in Firestore
    if (viewState === 'admin' || userRole === 'admin' || userRole === 'faculty') {
      // Auto-migrate any DCS Register Numbers to "MSc Decision and Computing Sciences"
      syncDcsDepartmentRenamesToFirestore().catch((err) => console.warn('DCS rename sync error:', err));

      getAllSubmissionsFromFirestore().then((initialSubs) => {
        if (Array.isArray(initialSubs) && initialSubs.length > 0) {
          setSavedSubmissions(initialSubs);
        }
      }).catch((err) => console.warn('Initial submissions fetch error:', err));

      unsubscribeSubs = subscribeSubmissions((firestoreSubs) => {
        if (Array.isArray(firestoreSubs)) {
          setSavedSubmissions(firestoreSubs);
        }
      });
    }

    const unsubscribeSettings = subscribeGlobalSettings((settings) => {
      if (settings) {
        if (typeof settings.isStudentLoginLocked === 'boolean') {
          setIsStudentLoginLocked(settings.isStudentLoginLocked);
        }
        if (typeof settings.isFacultyLoginLocked === 'boolean') {
          setIsFacultyLoginLocked(settings.isFacultyLoginLocked);
        }
        if (Array.isArray(settings.lockedStudentRegNos)) {
          setLockedStudentRegNos(settings.lockedStudentRegNos);
        }
        if (settings.studentAccessPin) {
          setStudentAccessPin(settings.studentAccessPin);
        }
        if (settings.facultyAccessPin) {
          setFacultyAccessPin(settings.facultyAccessPin);
        }
        if (settings.adminAccessPin) {
          setAdminAccessPin(settings.adminAccessPin);
        }
        if (settings.adminId) {
          setAdminId(settings.adminId);
        }
        if (settings.adminResetEmail) {
          setAdminResetEmail(settings.adminResetEmail);
        }
        if (settings.adminMobile) {
          setAdminMobile(settings.adminMobile);
        }
        if (settings.adminSecretRecoveryPin) {
          setAdminSecretRecoveryPin(settings.adminSecretRecoveryPin);
        }
        if (Array.isArray(settings.authorizedFaculty)) {
          setAuthorizedFaculty(settings.authorizedFaculty);
        }
        if (settings.studentPinSchedule) {
          setStudentPinSchedule(settings.studentPinSchedule);
        }
        if (typeof settings.assessmentExtraMinutes === 'number') {
          setAssessmentExtraMinutes(settings.assessmentExtraMinutes);
        }
        if (typeof settings.assessmentExtraWarningMsg === 'string') {
          setAssessmentExtraWarningMsg(settings.assessmentExtraWarningMsg);
        }
      }
    });

    const unsubscribeQuestions = subscribeQuestionBank((customQuestions) => {
      if (customQuestions !== null && Array.isArray(customQuestions) && customQuestions.length > 0) {
        setActiveQuestionBank(customQuestions);
        try {
          localStorage.setItem('CIT_CUSTOM_QUESTION_BANK', JSON.stringify(customQuestions));
        } catch (e) {}
        setCurrentTestQuestions(sampleTestQuestions(customQuestions));
      } else if (customQuestions === null) {
        // If Firestore document is not present, check local storage before defaulting
        try {
          const cached = localStorage.getItem('CIT_CUSTOM_QUESTION_BANK');
          if (cached) {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setActiveQuestionBank(parsed);
              setCurrentTestQuestions(sampleTestQuestions(parsed));
              return;
            }
          }
        } catch (e) {}
        setActiveQuestionBank(ALL_QUESTIONS);
        setCurrentTestQuestions(sampleTestQuestions(ALL_QUESTIONS));
      }
    });

    const unsubscribeActiveSessions = subscribeActiveSessions((sessions) => {
      setActiveSessions(sessions);
    });

    return () => {
      if (unsubscribeSubs) unsubscribeSubs();
      unsubscribeSettings();
      unsubscribeQuestions();
      unsubscribeActiveSessions();
    };
  }, [viewState, userRole]);

  // Ref holding current assessment session state for synchronous save on interrupts
  const currentSessionRef = useRef<ActiveAssessmentSession | null>(null);

  useEffect(() => {
    if (viewState === 'assessment' && student) {
      currentSessionRef.current = {
        student,
        currentTestQuestions,
        responses,
        timeRemainingSeconds,
        currentSection,
        currentQuestionIndex,
        attemptCount,
        maxAttempts: 3,
        status: 'active',
        savedAt: Date.now()
      };
    } else {
      currentSessionRef.current = null;
    }
  }, [viewState, student, currentTestQuestions, responses, timeRemainingSeconds, currentSection, currentQuestionIndex, attemptCount]);

  // Real-time continuous auto-save of active assessment session to localStorage and Firestore
  useEffect(() => {
    if (viewState === 'assessment' && student && isTimerActive) {
      const activeSession: ActiveAssessmentSession = {
        student,
        currentTestQuestions,
        responses,
        timeRemainingSeconds,
        currentSection,
        currentQuestionIndex,
        attemptCount,
        maxAttempts: 3,
        status: 'active',
        savedAt: Date.now()
      };
      saveActiveAssessmentSession(activeSession);

      // Save savepoint asynchronously to Firestore
      saveAssessmentSavepointToFirestore(student.registerNo, {
        studentName: student.name,
        department: student.department,
        currentSection,
        currentQuestionIndex,
        timeRemainingSeconds,
        attemptCount,
        maxAttempts: 3,
        answeredCount: Object.keys(responses).length,
        responses,
        savedAt: Date.now()
      });
    }
  }, [viewState, student, isTimerActive, responses, timeRemainingSeconds, currentSection, currentQuestionIndex, currentTestQuestions, attemptCount]);

  // Auto-Save Assessment State on Application Interrupts (reload, tab close, window hide, offline, freeze)
  useEffect(() => {
    if (viewState !== 'assessment' || !student || !isTimerActive) {
      return;
    }

    const saveOnInterrupt = () => {
      if (currentSessionRef.current) {
        saveActiveAssessmentSession({
          ...currentSessionRef.current,
          status: 'interrupted',
          savedAt: Date.now()
        });
        console.log('Assessment answers auto-saved due to application interrupt.');
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        saveOnInterrupt();
      }
    };

    window.addEventListener('beforeunload', saveOnInterrupt);
    window.addEventListener('pagehide', saveOnInterrupt);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('offline', saveOnInterrupt);
    window.addEventListener('freeze', saveOnInterrupt);

    return () => {
      window.removeEventListener('beforeunload', saveOnInterrupt);
      window.removeEventListener('pagehide', saveOnInterrupt);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('offline', saveOnInterrupt);
      window.removeEventListener('freeze', saveOnInterrupt);
    };
  }, [viewState, student, isTimerActive]);

  // Periodic Heartbeat for Active Assessment Session to prevent concurrent logins
  useEffect(() => {
    if (viewState !== 'assessment' || !student?.registerNo || !isTimerActive) {
      return;
    }

    const regNo = student.registerNo.trim().toUpperCase();
    const deviceId = student.deviceId || 'browser';
    const sessionId = student.sessionId || deviceId;

    // Register active session immediately
    registerActiveStudentSession({
      registerNo: regNo,
      studentName: student.name,
      department: student.department,
      sessionId,
      loginTimestamp: Date.now(),
      startedAt: Date.now(),
      lastHeartbeat: Date.now(),
      deviceId,
      status: 'active'
    }).catch((err) => console.warn('Active session initial registration warning:', err));

    // High-Concurrency Heartbeat Engine (Tuned for 800+ Concurrent Student Logins):
    // Staggered heartbeat every 60s with 0-30s random jitter per client (averaging 75s)
    // to smoothly distribute write traffic across all 800 concurrent workstations
    const jitter = Math.floor(Math.random() * 30000);
    const heartbeatInterval = setInterval(() => {
      updateSessionHeartbeat(regNo, sessionId).catch(() => {});
    }, 60000 + jitter);

    return () => {
      clearInterval(heartbeatInterval);
    };
  }, [viewState, student, isTimerActive]);

  // Timer Tick Handler
  useEffect(() => {
    if (isTimerActive && timeRemainingSeconds > 0) {
      timerRef.current = setInterval(() => {
        setTimeRemainingSeconds((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            setIsTimerActive(false);
            handleFinalSubmission(); // Auto-submit when 1 hour expires!
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isTimerActive, timeRemainingSeconds]);

  // Onboarding Student Handler - Refresh & Shuffle Questions, or Resume Active Saved Session
  const handleAuthenticateStudent = (authenticatedStudent: StudentInfo) => {
    const trimmedRegNo = authenticatedStudent.registerNo.trim().toUpperCase();

    // Check if an active saved session exists in localStorage for this student
    const activeSaved = loadActiveAssessmentSession(trimmedRegNo);

    if (activeSaved && activeSaved.responses && activeSaved.currentTestQuestions) {
      const prevAttempt = activeSaved.attemptCount || 1;
      // When re-authenticating after an interruption or window termination, advance to next attempt (up to 3)
      const nextAttempt = activeSaved.status === 'interrupted' ? Math.min(3, prevAttempt + 1) : Math.min(3, prevAttempt);

      if (prevAttempt >= 3 && activeSaved.status === 'interrupted') {
        alert(`🔒 MAXIMUM ATTEMPTS EXCEEDED: Student ${authenticatedStudent.name} (${authenticatedStudent.registerNo}) has already utilized all 3 permitted attempts for this assessment. Re-attempts are strictly barred.`);
        return;
      }

      // Resume student session with saved responses, questions, remaining time, and attempt count
      setAttemptCount(nextAttempt);
      setStudent(activeSaved.student);
      setCurrentTestQuestions(activeSaved.currentTestQuestions);
      setResponses(activeSaved.responses);

      const now = Date.now();
      const elapsedSec = Math.floor((now - (activeSaved.savedAt || now)) / 1000);
      const remainingSec = Math.max(10, activeSaved.timeRemainingSeconds - elapsedSec);
      setTimeRemainingSeconds(remainingSec);
      setCurrentSection(activeSaved.currentSection || 'calculus');
      setCurrentQuestionIndex(activeSaved.currentQuestionIndex || 0);

      // Save updated active status to savepoint
      saveActiveAssessmentSession({
        ...activeSaved,
        attemptCount: nextAttempt,
        status: 'active',
        savedAt: Date.now()
      });

      setResumeNotice(`Assessment Resumed: Attempt ${nextAttempt} of 3 in progress. Resumed from last savepoint (${Object.keys(activeSaved.responses).length} saved answers).`);
      setTimeout(() => setResumeNotice(null), 8000);

      setIsTimerActive(true);
      setViewState('assessment');
      setResumableStudentForLogin(null);
      return;
    }

    const existingSub = savedSubmissions.find(
      (s) => s.student && s.student.registerNo && s.student.registerNo.trim().toUpperCase() === trimmedRegNo
    );

    if (existingSub) {
      alert(`⚠️ ATTEMPT LIMIT EXCEEDED: Student ${authenticatedStudent.name} (Register Number: ${authenticatedStudent.registerNo}) has already completed and submitted this assessment on ${formatDateDisplay(existingSub.submittedAt)}. Each candidate is strictly permitted ONLY ONE attempt.`);
      return;
    }

    clearActiveAssessmentSession(trimmedRegNo);
    setAttemptCount(1);
    const currentActiveTest = getActiveAssessmentTest();
    const testDurationSec = (currentActiveTest?.durationMinutes || 60) * 60;
    const freshSampledTest = currentActiveTest
      ? generateQuestionsForTestConfig(currentActiveTest, activeQuestionBank)
      : generateTestQuestions(activeQuestionBank);
    setCurrentTestQuestions(freshSampledTest);
    setStudent(authenticatedStudent);
    setPendingStudent(null);
    setResponses({});
    setTimeRemainingSeconds(testDurationSec + (assessmentExtraMinutes * 60));
    if (freshSampledTest.length > 0 && freshSampledTest[0].sectionId) {
      setCurrentSection(freshSampledTest[0].sectionId);
    } else {
      setCurrentSection('calculus');
    }
    setCurrentQuestionIndex(0);
    setIsLaunchingCountdown(false);
    setIsTimerActive(true); // Starts the assessment timer immediately
    setViewState('assessment');
  };

  // Called if countdown completes
  const handleCountdownComplete = () => {
    setIsLaunchingCountdown(false);
    setPendingStudent(null);
    setIsTimerActive(true);
    setViewState('assessment');
  };

  // Update individual student Register Number, Department and Name
  const handleUpdateSubmissionStudentDetails = async (
    submissionId: string,
    newRegNo: string,
    newDept: string,
    newName?: string
  ): Promise<boolean> => {
    try {
      const regNoUpper = newRegNo.trim().toUpperCase();
      const dept = newDept.trim();
      const updatedName = newName ? newName.trim() : undefined;

      // 1. Update in Cloud Firestore
      await updateSubmissionStudentDetailsInFirestore(submissionId, {
        registerNo: regNoUpper,
        department: dept,
        name: updatedName
      });

      // 2. Update local state
      setSavedSubmissions((prev) =>
        prev.map((sub) => {
          if (sub.id === submissionId) {
            const finalName = updatedName || sub.student?.name || 'Student Candidate';
            const updatedStudent: StudentInfo = {
              ...sub.student,
              name: finalName,
              registerNo: regNoUpper,
              department: dept
            };
            const updatedReport = sub.report ? {
              ...sub.report,
              student: {
                ...sub.report.student,
                name: finalName,
                registerNo: regNoUpper,
                department: dept
              }
            } : sub.report;

            return {
              ...sub,
              student: updatedStudent,
              report: updatedReport
            };
          }
          return sub;
        })
      );

      // 3. Update localStorage cache
      try {
        const localSubsStr = localStorage.getItem('CIT_COGNITIVE_SUBMISSIONS');
        if (localSubsStr) {
          const localSubs: SavedSubmission[] = JSON.parse(localSubsStr);
          if (Array.isArray(localSubs)) {
            const updated = localSubs.map((sub) => {
              if (sub.id === submissionId) {
                const finalName = updatedName || sub.student?.name || 'Student Candidate';
                return {
                  ...sub,
                  student: {
                    ...sub.student,
                    name: finalName,
                    registerNo: regNoUpper,
                    department: dept
                  },
                  report: sub.report ? {
                    ...sub.report,
                    student: {
                      ...sub.report.student,
                      name: finalName,
                      registerNo: regNoUpper,
                      department: dept
                    }
                  } : sub.report
                };
              }
              return sub;
            });
            localStorage.setItem('CIT_COGNITIVE_SUBMISSIONS', JSON.stringify(updated));
          }
        }
      } catch (_) {}

      return true;
    } catch (err) {
      console.error('Failed to update submission student details:', err);
      return false;
    }
  };

  // Delete individual student submission record
  const handleDeleteSubmission = async (submissionId: string) => {
    setSavedSubmissions((prev) => prev.filter((s) => s.id !== submissionId));
    try {
      await deleteSubmissionFromFirestore(submissionId);
    } catch (e) {
      console.error('Failed to delete submission from Firestore:', e);
    }
  };

  // Delete multiple selected student submission records
  const handleDeleteMultipleSubmissions = async (submissionIds: string[]) => {
    const idsSet = new Set(submissionIds);
    setSavedSubmissions((prev) => prev.filter((s) => !idsSet.has(s.id)));
    try {
      await deleteMultipleSubmissionsFromFirestore(submissionIds);
    } catch (e) {
      console.error('Failed to delete submissions from Firestore:', e);
    }
  };

  // Delete all student submission records
  const handleDeleteAllSubmissions = async () => {
    setSavedSubmissions([]);
    clearPendingOfflineSubmissions();
    try {
      localStorage.removeItem('CIT_COGNITIVE_SUBMISSIONS');
      localStorage.removeItem('CIT_ASSESSMENT_SUBMISSIONS');
      localStorage.removeItem('CIT_OFFLINE_SUBMISSIONS');
      localStorage.removeItem('CIT_ACTIVE_ASSESSMENT_SESSION');
      const result = await clearAllSubmissionsFromFirestore();
      setSyncBannerMessage(`🗑️ Database Cleared: Successfully cleared ${result.deletedCount} student submissions from Firestore database.`);
      setTimeout(() => setSyncBannerMessage(null), 6000);
    } catch (e) {
      console.error('Failed to delete all submissions from Firestore:', e);
    }
  };

  // Select a student record to resume from save point for re-attempt
  const handleResumeStudentSession = (
    submission: SavedSubmission,
    launchMode: 'student_login' | 'direct_launch' = 'student_login',
    stayInAdmin: boolean = true
  ) => {
    const studentInfo: StudentInfo = submission.student;

    let restoredResponses: Record<string, StudentResponse> = {};
    let restoredQuestions: Question[] = [];

    // Check if an active session exists in localStorage for this student
    const activeSavedRaw = localStorage.getItem(SAVED_SESSION_KEY);
    let activeSaved: ActiveAssessmentSession | null = null;
    if (activeSavedRaw) {
      try {
        const parsed = JSON.parse(activeSavedRaw);
        if (parsed?.student?.registerNo === studentInfo.registerNo) {
          activeSaved = parsed;
        }
      } catch (e) {
        console.error('Error parsing saved active session:', e);
      }
    }

    if (activeSaved && activeSaved.responses && activeSaved.currentTestQuestions) {
      restoredResponses = activeSaved.responses;
      restoredQuestions = activeSaved.currentTestQuestions;
    } else if (submission.report && submission.report.detailedItemAnalysis) {
      // Reconstruct from submission report item analysis
      submission.report.detailedItemAnalysis.forEach((item) => {
        restoredResponses[item.questionId] = {
          questionId: item.questionId,
          selectedOption: item.userAnswer,
          timeSpentSeconds: item.timeSpent || 15,
          isMarkedForReview: false,
          visited: true
        };

        const bankQ = activeQuestionBank.find((q) => q.id === item.questionId);
        if (bankQ && !restoredQuestions.some((q) => q.id === bankQ.id)) {
          restoredQuestions.push(bankQ);
        }
      });
    }

    if (restoredQuestions.length === 0) {
      restoredQuestions = sampleTestQuestions(activeQuestionBank);
    }

    // Unlock student account if locked
    handleUnlockStudent(studentInfo.registerNo);

    // Release any lingering active session lock in Firestore so student can log in cleanly
    resumeStudentSessionInFirestore(studentInfo.registerNo).catch((err) =>
      console.warn('Failed to release active session lock in Firestore:', err)
    );

    // Save active assessment session to localStorage
    const currentActiveTest = getActiveAssessmentTest();
    const baseDuration = (currentActiveTest?.durationMinutes || 60) * 60;
    const duration = baseDuration + (assessmentExtraMinutes * 60);
    const newActiveSession: ActiveAssessmentSession = {
      student: studentInfo,
      currentTestQuestions: restoredQuestions,
      responses: restoredResponses,
      timeRemainingSeconds: duration,
      currentSection: 'calculus',
      currentQuestionIndex: 0,
      savedAt: Date.now()
    };
    saveActiveAssessmentSession(newActiveSession);

    // If deleting old submission record to allow fresh re-attempt
    if (submission.id && submission.id !== 'active_session') {
      handleDeleteSubmission(submission.id);
    }

    setResumableStudentForLogin(studentInfo);

    if (stayInAdmin) {
      // Admin remains logged in in the Admin Portal!
      return;
    }

    if (launchMode === 'direct_launch') {
      // Activate timer & open live assessment view directly on this device
      setStudent(studentInfo);
      setCurrentTestQuestions(restoredQuestions);
      setResponses(restoredResponses);
      setTimeRemainingSeconds(duration);
      setCurrentSection('calculus');
      setCurrentQuestionIndex(0);
      setIsTimerActive(true);
      setViewState('assessment');
    } else {
      // Allow student to log in and resume on Student Login portal
      setAuthInitialTab('student');
      setViewState('auth');
    }
  };

  // Authorize and resume multiple student sessions at once from Admin Portal
  const handleResumeMultipleStudentSessions = (
    submissionsToResume: SavedSubmission[]
  ) => {
    submissionsToResume.forEach((sub) => {
      handleResumeStudentSession(sub, 'student_login', true);
    });
  };

  // Upload Custom Question Bank
  const handleUploadQuestionBank = (uploadedQuestions: Question[]) => {
    try {
      localStorage.setItem('CIT_CUSTOM_QUESTION_BANK', JSON.stringify(uploadedQuestions));
      setActiveQuestionBank(uploadedQuestions);
      saveQuestionBankToFirestore(uploadedQuestions);
      // Immediately regenerate assessment test questions using the uploaded custom question bank
      const freshQuestions = sampleTestQuestions(uploadedQuestions);
      setCurrentTestQuestions(freshQuestions);
    } catch (e) {
      console.error('Failed to save custom question bank to localStorage:', e);
    }
  };

  // Reset Question Bank to Default
  const handleResetQuestionBank = () => {
    try {
      localStorage.removeItem('CIT_CUSTOM_QUESTION_BANK');
      setActiveQuestionBank(ALL_QUESTIONS);
      saveQuestionBankToFirestore(ALL_QUESTIONS);
      // Immediately update the custom question bank for the assessment back to standard CIT 100-Question Master Bank
      const freshDefaultQuestions = sampleTestQuestions(ALL_QUESTIONS);
      setCurrentTestQuestions(freshDefaultQuestions);
    } catch (e) {
      console.error('Failed to reset question bank:', e);
    }
  };

  // Option selection
  const handleSelectOption = (questionId: string, optionIndex: number) => {
    setResponses((prev) => ({
      ...prev,
      [questionId]: {
        questionId,
        selectedOption: optionIndex,
        timeSpentSeconds: (prev[questionId]?.timeSpentSeconds || 0) + 5,
        isMarkedForReview: prev[questionId]?.isMarkedForReview || false,
        visited: true
      }
    }));
  };

  // Clear selected option
  const handleClearOption = (questionId: string) => {
    setResponses((prev) => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        selectedOption: null
      }
    }));
  };

  // Toggle Mark For Review
  const handleToggleMarkForReview = (questionId: string) => {
    setResponses((prev) => ({
      ...prev,
      [questionId]: {
        questionId,
        selectedOption: prev[questionId]?.selectedOption ?? null,
        timeSpentSeconds: prev[questionId]?.timeSpentSeconds || 0,
        isMarkedForReview: !prev[questionId]?.isMarkedForReview,
        visited: true
      }
    }));
  };

  // Evaluate & Submit Assessment
  const handleFinalSubmission = async () => {
    const currentSession = currentSessionRef.current;
    const currentStudent = student || currentSession?.student;
    if (!currentStudent) return;

    const activeResponses = currentSession?.responses || responses;
    const activeQuestions = currentSession?.currentTestQuestions || currentTestQuestions;
    const activeTimeRemaining = currentSession?.timeRemainingSeconds ?? timeRemainingSeconds;

    clearActiveAssessmentSession();
    setIsTimerActive(false);
    if (timerRef.current) clearInterval(timerRef.current);

    if (currentStudent?.registerNo) {
      releaseActiveStudentSession(currentStudent.registerNo.trim().toUpperCase(), currentStudent.deviceId).catch(() => {});
    }

    const currentActiveTest = getActiveAssessmentTest();
    const baseDuration = (currentActiveTest?.durationMinutes || 60) * 60;
    const totalTestDuration = baseDuration + (assessmentExtraMinutes * 60);
    const durationTaken = Math.max(0, totalTestDuration - activeTimeRemaining);
    const generatedReport = calculateCognitiveProfile(currentStudent, activeResponses, durationTaken, activeQuestions);

    setReport(generatedReport);

    const newSavedSub: SavedSubmission = {
      id: `SUB-${Date.now()}`,
      student: currentStudent,
      submittedAt: getCurrentTimestamp(),
      report: generatedReport
    };

    // 1. Immediately persist to localStorage backup
    try {
      const raw = localStorage.getItem('CIT_COGNITIVE_SUBMISSIONS');
      const list: SavedSubmission[] = raw ? JSON.parse(raw) : [];
      const updated = [newSavedSub, ...list.filter((s) => s.id !== newSavedSub.id)];
      localStorage.setItem('CIT_COGNITIVE_SUBMISSIONS', JSON.stringify(updated));
    } catch (_) {}

    // 2. Update React application state
    setSavedSubmissions((prev) => [newSavedSub, ...prev]);

    // 3. Attempt cloud persistence; smoothly fallback if Quota Exceeded or Offline
    if (isOnline()) {
      try {
        await saveSubmissionToFirestore(newSavedSub);
        setSyncBannerMessage('✅ Assessment Submitted Successfully & Synchronized with Cloud Database.');
        setTimeout(() => setSyncBannerMessage(null), 5000);
      } catch (err) {
        console.warn('Firestore write failed (Quota Exceeded or Offline). Queuing locally:', err);
        queueOfflineSubmission(newSavedSub);
        setPendingSyncCount(getPendingOfflineSubmissions().length);
        setSyncBannerMessage('📡 Assessment Saved Successfully in Local Browser Storage (Cloud Quota Reached). Your score and answers are 100% safe!');
        setTimeout(() => setSyncBannerMessage(null), 8000);
      }
    } else {
      queueOfflineSubmission(newSavedSub);
      setPendingSyncCount(getPendingOfflineSubmissions().length);
      setSyncBannerMessage('📡 Assessment Saved Locally (Offline Mode). Answers and score report are securely stored on this device.');
      setTimeout(() => setSyncBannerMessage(null), 8000);
    }

    setViewState('submission');
  };

  // Security lockout state message for AuthGate home page
  const [securityLockoutBanner, setSecurityLockoutBanner] = useState<string | null>(null);
  const [securityExitWarningModal, setSecurityExitWarningModal] = useState<{
    isOpen: boolean;
    title: string;
    violationType: 'TAB_SWITCH' | 'SCREENSHOT' | 'WINDOW_SWITCH';
    reason: string;
    message: string;
    studentName: string;
    registerNo: string;
    department: string;
    timestamp: string;
  } | null>(null);

  // Security Lockout Triggered (Student switched window/tab or took screenshot during test)
  const handleSecurityLockout = (reason: string = 'UNAUTHORIZED_WINDOW_SWITCH') => {
    const currentSession = currentSessionRef.current;
    const currentStudent = student || currentSession?.student;
    if (!currentStudent) return;

    const activeResponses = currentSession?.responses || responses;
    const activeQuestions = currentSession?.currentTestQuestions || currentTestQuestions;
    const activeTimeRemaining = currentSession?.timeRemainingSeconds ?? timeRemainingSeconds;

    const nowStr = getCurrentTimestamp();
    const currentActiveTest = getActiveAssessmentTest();
    const baseDuration = (currentActiveTest?.durationMinutes || 60) * 60;
    const durationTaken = Math.max(0, baseDuration - activeTimeRemaining);
    const generatedReport = calculateCognitiveProfile(currentStudent, activeResponses, durationTaken, activeQuestions);

    const isScreenshot = reason === 'SCREENSHOT_DETECTED' || reason.includes('SCREENSHOT') || reason.includes('PRINT');
    const isTabSwitch = reason === 'TAB_SWITCH_DETECTED' || reason.includes('TAB');
    const isMaxAttempts = reason === 'MAX_ATTEMPTS_EXCEEDED_TAB_SWITCH' || reason.includes('MAX_ATTEMPTS');

    let violationType: 'TAB_SWITCH' | 'SCREENSHOT' | 'WINDOW_SWITCH' = 'WINDOW_SWITCH';
    let violationTitle = 'PROCTORING VIOLATION: WINDOW SWITCH DETECTED';
    let violationReasonText = 'Moved to another application or window during live assessment';
    let bannerText = '⚠️ ASSESSMENT TERMINATED & WINDOW EXITED: Switching windows or moving away from the assessment is strictly prohibited. Your session has been exited with a security warning.';
    let modalMsg = 'You moved to another window or external application while your assessment was in progress. In accordance with strict examination regulations, navigating away from the assessment is prohibited and your window has been automatically exited.';

    if (isMaxAttempts) {
      violationType = 'TAB_SWITCH';
      violationTitle = 'PROCTORING CONCLUDED: MAXIMUM 3 ATTEMPTS EXCEEDED';
      violationReasonText = 'All 3 permitted attempts exhausted due to tab switch overs or interruptions';
      bannerText = '⚠️ ASSESSMENT CONCLUDED: All 3 permitted attempts have been utilized. Your assessment has been finalized from your last savepoint.';
      modalMsg = 'You have utilized all 3 permitted attempts during tab switches or unexpected interruptions. In accordance with examination regulations, your assessment has been automatically finalized from your last savepoint.';
    } else if (isScreenshot) {
      violationType = 'SCREENSHOT';
      violationTitle = 'PROCTORING VIOLATION: SCREENSHOT CAPTURE ATTEMPT';
      violationReasonText = 'Screenshot capture (PrintScreen / Snipping Tool / OS shortcut) attempted during live assessment';
      bannerText = '⚠️ ASSESSMENT TERMINATED & WINDOW EXITED: Taking screenshots during assessment is strictly prohibited. You have been exited from the exam window with a security violation warning.';
      modalMsg = 'You attempted to take a screenshot or use a screen capture tool (PrintScreen / Snipping shortcut) while your assessment was in progress. In accordance with institutional anti-cheating regulations, capturing questions is strictly forbidden and your window has been immediately exited.';
    } else if (isTabSwitch) {
      violationType = 'TAB_SWITCH';
      violationTitle = 'PROCTORING VIOLATION: TAB SWITCH DETECTED';
      violationReasonText = 'Browser tab switch or window minimization detected during live assessment';
      bannerText = '⚠️ ASSESSMENT TERMINATED & WINDOW EXITED: Switching browser tabs during assessment is strictly prohibited. You have been exited from the exam window with a security violation warning.';
      modalMsg = 'You switched browser tabs or minimized the assessment window while your examination was in progress. In accordance with strict examination regulations, switching tabs is forbidden and your window has been immediately exited.';
    }

    const terminatedSubmission: SavedSubmission = {
      id: `SUB-LOCK-${Date.now()}`,
      student: currentStudent,
      submittedAt: nowStr,
      report: {
        ...generatedReport,
        cognitionLevel: {
          ...generatedReport.cognitionLevel,
          grade: 'C',
          summary: `TEST TERMINATED & WINDOW EXITED: ${violationReasonText}. Account locked due to security violation.`
        }
      },
      isLockedOut: true,
      securityViolation: {
        isViolated: true,
        reason: violationReasonText,
        timestamp: nowStr
      }
    };

    // Persist Register Number to locked list in localStorage and Firestore
    const regUpper = currentStudent.registerNo.trim().toUpperCase();
    let updatedLocked = lockedStudentRegNos;
    if (!lockedStudentRegNos.includes(regUpper)) {
      updatedLocked = [...lockedStudentRegNos, regUpper];
      setLockedStudentRegNos(updatedLocked);
      try {
        localStorage.setItem('CIT_LOCKED_STUDENTS', JSON.stringify(updatedLocked));
      } catch (e) {
        console.error('Failed to update locked student storage:', e);
      }
    }

    if (isOnline()) {
      saveSubmissionToFirestore(terminatedSubmission).catch(() => {
        queueOfflineSubmission(terminatedSubmission);
        setPendingSyncCount(getPendingOfflineSubmissions().length);
      });
    } else {
      queueOfflineSubmission(terminatedSubmission);
      setPendingSyncCount(getPendingOfflineSubmissions().length);
    }

    saveGlobalSettingsToFirestore({
      isStudentLoginLocked,
      isFacultyLoginLocked,
      lockedStudentRegNos: updatedLocked,
      studentAccessPin,
      facultyAccessPin,
      adminAccessPin
    });

    setSavedSubmissions((prev) => [terminatedSubmission, ...prev]);

    clearActiveAssessmentSession(currentStudent.registerNo);
    setIsTimerActive(false);
    if (timerRef.current) clearInterval(timerRef.current);
    if (currentStudent?.registerNo) {
      releaseActiveStudentSession(currentStudent.registerNo.trim().toUpperCase(), currentStudent.deviceId).catch(() => {});
    }
    setStudent(null);
    setResponses({});
    setReport(null);
    setTimeRemainingSeconds(baseDuration + (assessmentExtraMinutes * 60));

    setSecurityLockoutBanner(bannerText);
    setSecurityExitWarningModal({
      isOpen: true,
      title: violationTitle,
      violationType,
      reason: violationReasonText,
      message: modalMsg,
      studentName: currentStudent.name,
      registerNo: currentStudent.registerNo,
      department: currentStudent.department,
      timestamp: nowStr
    });
    setAuthKey((prev) => prev + 1);
    setViewState('auth');
  };

  // Handle tab switch interrupted event from SecurityGuard (allows up to 3 attempts, auto-saving savepoint)
  const handleTabSwitchInterrupted = (usedAttempt: number, nextAttempt: number) => {
    setAttemptCount(nextAttempt);
    const curStudent = student || currentSessionRef.current?.student;
    if (curStudent) {
      const updatedSession: ActiveAssessmentSession = {
        student: curStudent,
        currentTestQuestions: currentSessionRef.current?.currentTestQuestions || currentTestQuestions,
        responses: currentSessionRef.current?.responses || responses,
        timeRemainingSeconds: currentSessionRef.current?.timeRemainingSeconds ?? timeRemainingSeconds,
        currentSection: currentSessionRef.current?.currentSection || currentSection,
        currentQuestionIndex: currentSessionRef.current?.currentQuestionIndex ?? currentQuestionIndex,
        savedAt: Date.now(),
        attemptCount: nextAttempt,
        maxAttempts: 3,
        status: 'interrupted',
        lastTerminationReason: 'TAB_SWITCH_OVER'
      };
      saveActiveAssessmentSession(updatedSession);
      saveAssessmentSavepointToFirestore(curStudent.registerNo, {
        studentName: curStudent.name,
        department: curStudent.department,
        currentSection: updatedSession.currentSection,
        currentQuestionIndex: updatedSession.currentQuestionIndex,
        timeRemainingSeconds: updatedSession.timeRemainingSeconds,
        attemptCount: nextAttempt,
        maxAttempts: 3,
        answeredCount: Object.keys(updatedSession.responses).length,
        responses: updatedSession.responses,
        savedAt: Date.now()
      });
    }
    // Pause timer while the student reviews the interruption warning modal
    setIsTimerActive(false);
  };

  const handleResumeAssessmentFromSavepoint = () => {
    setIsTimerActive(true);
    setResumeNotice(`Assessment Resumed: Attempt ${attemptCount} of 3 in progress. Resumed from last savepoint.`);
    setTimeout(() => setResumeNotice(null), 8000);
  };

  const handleToggleStudentLoginLock = (locked: boolean) => {
    setIsStudentLoginLocked(locked);
    try {
      localStorage.setItem('CIT_STUDENT_LOGIN_LOCKED', String(locked));
    } catch (e) {
      console.error('Failed to set student login lock in storage:', e);
    }
    saveGlobalSettingsToFirestore({
      isStudentLoginLocked: locked,
      isFacultyLoginLocked,
      lockedStudentRegNos,
      studentAccessPin,
      facultyAccessPin,
      adminAccessPin
    });
  };

  const handleToggleFacultyLoginLock = (locked: boolean) => {
    setIsFacultyLoginLocked(locked);
    try {
      localStorage.setItem('CIT_FACULTY_LOGIN_LOCKED', String(locked));
    } catch (e) {
      console.error('Failed to set faculty login lock in storage:', e);
    }
    saveGlobalSettingsToFirestore({
      isStudentLoginLocked,
      isFacultyLoginLocked: locked,
      lockedStudentRegNos,
      studentAccessPin,
      facultyAccessPin,
      adminAccessPin
    });
  };

  const handleSetStudentAccessPin = (newPin: string) => {
    const pin = newPin.trim() || 'cit@123';
    setStudentAccessPin(pin);
    try {
      localStorage.setItem('CIT_STUDENT_ACCESS_PIN', pin);
    } catch (e) {
      console.error('Failed to save student PIN:', e);
    }
    saveGlobalSettingsToFirestore({
      isStudentLoginLocked,
      isFacultyLoginLocked,
      lockedStudentRegNos,
      studentAccessPin: pin,
      facultyAccessPin,
      adminAccessPin
    });
  };

  const handleSetFacultyAccessPin = (newPin: string) => {
    const pin = newPin.trim() || 'cit@123';
    setFacultyAccessPin(pin);
    try {
      localStorage.setItem('CIT_FACULTY_ACCESS_PIN', pin);
    } catch (e) {
      console.error('Failed to save faculty PIN:', e);
    }
    saveGlobalSettingsToFirestore({
      isStudentLoginLocked,
      isFacultyLoginLocked,
      lockedStudentRegNos,
      studentAccessPin,
      facultyAccessPin: pin,
      adminAccessPin
    });
  };

  const handleSetAdminId = (newId: string) => {
    const id = newId.trim() || 'admin';
    setAdminId(id);
    try {
      localStorage.setItem('CIT_ADMIN_ID', id);
    } catch (e) {
      console.error('Failed to save admin ID:', e);
    }
    saveGlobalSettingsToFirestore({
      isStudentLoginLocked,
      isFacultyLoginLocked,
      lockedStudentRegNos,
      studentAccessPin,
      facultyAccessPin,
      adminAccessPin,
      adminId: id,
      adminResetEmail,
      adminMobile
    });
  };

  const handleSetAdminAccessPin = (newPin: string) => {
    const pin = newPin.trim() || 'cit@123';
    setAdminAccessPin(pin);
    try {
      localStorage.setItem('CIT_ADMIN_ACCESS_PIN', pin);
    } catch (e) {
      console.error('Failed to save admin PIN:', e);
    }
    saveGlobalSettingsToFirestore({
      isStudentLoginLocked,
      isFacultyLoginLocked,
      lockedStudentRegNos,
      studentAccessPin,
      facultyAccessPin,
      adminAccessPin: pin,
      adminId,
      adminResetEmail,
      adminMobile
    });
  };

  const handleSetAdminResetEmail = (newEmail: string) => {
    const email = newEmail.trim() || 'admin@cit.edu.in';
    setAdminResetEmail(email);
    try {
      localStorage.setItem('CIT_ADMIN_RESET_EMAIL', email);
    } catch (e) {
      console.error('Failed to save admin reset email:', e);
    }
    saveGlobalSettingsToFirestore({
      isStudentLoginLocked,
      isFacultyLoginLocked,
      lockedStudentRegNos,
      studentAccessPin,
      facultyAccessPin,
      adminAccessPin,
      adminId,
      adminResetEmail: email,
      adminMobile
    });
  };

  const handleSetAdminMobile = (newMobile: string) => {
    const mobile = newMobile.trim() || '+91 9876543210';
    setAdminMobile(mobile);
    try {
      localStorage.setItem('CIT_ADMIN_MOBILE', mobile);
    } catch (e) {
      console.error('Failed to save admin mobile:', e);
    }
    saveGlobalSettingsToFirestore({
      isStudentLoginLocked,
      isFacultyLoginLocked,
      lockedStudentRegNos,
      studentAccessPin,
      facultyAccessPin,
      adminAccessPin,
      adminId,
      adminResetEmail,
      adminMobile: mobile,
      adminSecretRecoveryPin
    });
  };

  const handleSetAdminSecretRecoveryPin = (newRecoveryPin: string) => {
    const pin = newRecoveryPin.trim() || '7777';
    setAdminSecretRecoveryPin(pin);
    try {
      localStorage.setItem('CIT_ADMIN_SECRET_RECOVERY_PIN', pin);
    } catch (e) {
      console.error('Failed to save admin secret recovery pin:', e);
    }
    saveGlobalSettingsToFirestore({
      isStudentLoginLocked,
      isFacultyLoginLocked,
      lockedStudentRegNos,
      studentAccessPin,
      facultyAccessPin,
      adminAccessPin,
      adminId,
      adminResetEmail,
      adminMobile,
      adminSecretRecoveryPin: pin,
      authorizedFaculty
    });
  };

  const handleSetAuthorizedFaculty = (facultyList: FacultyCredential[]) => {
    setAuthorizedFaculty(facultyList);
    try {
      localStorage.setItem('CIT_AUTHORIZED_FACULTY', JSON.stringify(facultyList));
    } catch (e) {
      console.error('Failed to save authorized faculty to localStorage:', e);
    }
    saveGlobalSettingsToFirestore({
      isStudentLoginLocked,
      isFacultyLoginLocked,
      lockedStudentRegNos,
      studentAccessPin,
      facultyAccessPin,
      adminAccessPin,
      adminId,
      adminResetEmail,
      adminMobile,
      adminSecretRecoveryPin,
      authorizedFaculty: facultyList,
      studentPinSchedule
    });
  };

  const handleSetStudentPinSchedule = (schedule: StudentPinSchedule) => {
    setStudentPinSchedule(schedule);
    try {
      localStorage.setItem('CIT_STUDENT_PIN_SCHEDULE', JSON.stringify(schedule));
    } catch (e) {
      console.error('Failed to save student PIN schedule:', e);
    }
    saveGlobalSettingsToFirestore({
      isStudentLoginLocked,
      isFacultyLoginLocked,
      lockedStudentRegNos,
      studentAccessPin,
      facultyAccessPin,
      adminAccessPin,
      adminId,
      adminResetEmail,
      adminMobile,
      adminSecretRecoveryPin,
      authorizedFaculty,
      studentPinSchedule: schedule,
      assessmentExtraMinutes,
      assessmentExtraWarningMsg
    });
  };

  const handleSetAssessmentExtraTimer = (extraMins: number, warningMsg: string) => {
    const validMins = Math.max(0, extraMins);
    const deltaMins = validMins - assessmentExtraMinutes;

    setAssessmentExtraMinutes(validMins);
    setAssessmentExtraWarningMsg(warningMsg);

    if (deltaMins !== 0 && viewState === 'assessment' && isTimerActive) {
      setTimeRemainingSeconds((prev) => Math.max(1, prev + deltaMins * 60));
    }

    try {
      localStorage.setItem('CIT_EXTRA_TIMER_MINUTES', validMins.toString());
      localStorage.setItem('CIT_EXTRA_TIMER_WARNING_MSG', warningMsg);
    } catch (e) {
      console.error('Failed to save extra timer settings:', e);
    }

    saveSecurityLogToFirestore({
      id: `sec_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: getCurrentTimestamp(),
      eventType: 'EXTRA_TIMER_CONFIG_UPDATED',
      severity: 'HIGH',
      details: `Admin updated assessment extra timer configuration: +${validMins} extra minutes (Total duration: ${60 + validMins} minutes). Custom warning message: "${warningMsg.substring(0, 100)}".`,
      userName: 'Administrator',
      userRole: 'admin'
    });

    saveGlobalSettingsToFirestore({
      isStudentLoginLocked,
      isFacultyLoginLocked,
      lockedStudentRegNos,
      studentAccessPin,
      facultyAccessPin,
      adminAccessPin,
      adminId,
      adminResetEmail,
      adminMobile,
      adminSecretRecoveryPin,
      authorizedFaculty,
      studentPinSchedule,
      assessmentExtraMinutes: validMins,
      assessmentExtraWarningMsg: warningMsg
    });
  };

  const handleLockStudent = (registerNoToLock: string) => {
    const regUpper = registerNoToLock.trim().toUpperCase();
    if (!regUpper) return;

    let updatedLocked = lockedStudentRegNos;
    if (!lockedStudentRegNos.includes(regUpper)) {
      updatedLocked = [...lockedStudentRegNos, regUpper];
      setLockedStudentRegNos(updatedLocked);
      try {
        localStorage.setItem('CIT_LOCKED_STUDENTS', JSON.stringify(updatedLocked));
      } catch (e) {
        console.error('Failed to update locked list in localStorage:', e);
      }
    }

    saveGlobalSettingsToFirestore({
      isStudentLoginLocked,
      isFacultyLoginLocked,
      lockedStudentRegNos: updatedLocked,
      studentAccessPin,
      facultyAccessPin,
      adminAccessPin
    });

    setSavedSubmissions((prev) =>
      prev.map((sub) => {
        if (sub.student && sub.student.registerNo.trim().toUpperCase() === regUpper) {
          const updatedSub = {
            ...sub,
            isLockedOut: true,
            securityViolation: {
              isViolated: true,
              reason: 'Account locked manually by Examination Admin',
              timestamp: getCurrentTimestamp()
            }
          };
          updateSubmissionInFirestore(sub.id, updatedSub);
          return updatedSub;
        }
        return sub;
      })
    );
  };

  // Admin Unlock Student Account Action
  const handleUnlockStudent = (registerNoToUnlock: string) => {
    const regUpper = registerNoToUnlock.trim().toUpperCase();
    if (!regUpper) return;

    const updatedLocked = lockedStudentRegNos.filter((r) => r !== regUpper);
    setLockedStudentRegNos(updatedLocked);
    try {
      localStorage.setItem('CIT_LOCKED_STUDENTS', JSON.stringify(updatedLocked));
    } catch (e) {
      console.error('Failed to update locked list in localStorage:', e);
    }

    saveGlobalSettingsToFirestore({
      isStudentLoginLocked,
      isFacultyLoginLocked,
      lockedStudentRegNos: updatedLocked,
      studentAccessPin,
      facultyAccessPin,
      adminAccessPin
    });

    // Update savedSubmissions
    setSavedSubmissions((prev) =>
      prev.map((sub) => {
        if (sub.student && sub.student.registerNo.trim().toUpperCase() === regUpper) {
          const updatedSub = {
            ...sub,
            isLockedOut: false,
            securityViolation: undefined
          };
          updateSubmissionInFirestore(sub.id, { isLockedOut: false, securityViolation: undefined });
          return updatedSub;
        }
        return sub;
      })
    );
  };

  const handleRefreshSubmissions = async () => {
    try {
      await syncDcsDepartmentRenamesToFirestore().catch(() => {});
      const liveSubs = await getAllSubmissionsFromFirestore();
      if (Array.isArray(liveSubs) && liveSubs.length > 0) {
        setSavedSubmissions(liveSubs);
      }
      return liveSubs;
    } catch (err) {
      console.warn('Manual refresh of Firestore submissions failed:', err);
      return [];
    }
  };

  const handleSeedDemoRecords = async () => {
    try {
      const seeded = await seedSampleSubmissionsToFirestore();
      setSavedSubmissions((prev) => {
        const existingIds = new Set(prev.map((s) => s.id));
        const newSubs = seeded.filter((s) => !existingIds.has(s.id));
        return [...newSubs, ...prev];
      });
      setSyncBannerMessage('✅ Retrieved & synchronized 49 student assessment records for today (2:00 PM - 6:00 PM) into Firestore!');
      setTimeout(() => setSyncBannerMessage(null), 8000);
    } catch (err) {
      console.error('Failed to retrieve/seed records:', err);
    }
  };

  // Logout / Return to Auth (Refresh Home Page)
  const handleLogout = () => {
    localStorage.removeItem(SAVED_SESSION_KEY);
    setIsTimerActive(false);
    if (timerRef.current) clearInterval(timerRef.current);
    setStudent(null);
    setResponses({});
    setReport(null);
    const currentActiveTest = getActiveAssessmentTest();
    const baseDuration = (currentActiveTest?.durationMinutes || 60) * 60;
    setTimeRemainingSeconds(baseDuration + (assessmentExtraMinutes * 60));
    setAuthInitialTab('student');
    setAuthKey((prev) => prev + 1);
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete('tab');
      url.searchParams.delete('role');
      url.searchParams.delete('view');
      window.history.replaceState({}, '', url.pathname);
    } catch {}
    setViewState('auth');
  };

  const handleGoHome = () => {
    handleLogout();
  };

  const answeredCount = (Object.values(responses) as StudentResponse[]).filter((r) => r.selectedOption !== null).length;

  return (
    <SecurityGuard
      isActive={viewState === 'assessment'}
      studentInfo={student}
      userRole={userRole}
      attemptCount={attemptCount}
      maxAttempts={3}
      savepointSummary={{
        answeredCount,
        totalQuestions: currentTestQuestions.length,
        timeRemainingText: `${Math.floor(timeRemainingSeconds / 60)}m ${timeRemainingSeconds % 60}s`
      }}
      onTabSwitchInterrupted={(usedAttempt, nextAttempt) => {
        handleTabSwitchInterrupted(usedAttempt, nextAttempt);
      }}
      onResumeAssessment={() => {
        handleResumeAssessmentFromSavepoint();
      }}
      onSecurityLockout={handleSecurityLockout}
    >
      <div className={`min-h-screen text-slate-900 font-sans security-protected selection:bg-blue-600 selection:text-white ${viewState === 'auth' ? 'bg-yellow-50' : 'bg-slate-100/90'}`}>
        
        {/* Global Header */}
        <Header
          student={student}
          timeRemainingSeconds={timeRemainingSeconds}
          isTimerActive={isTimerActive}
          answeredCount={answeredCount}
          totalQuestions={currentTestQuestions.length}
          onLogout={handleLogout}
          onGoHome={handleGoHome}
          onSubmitEarly={viewState === 'assessment' ? handleFinalSubmission : undefined}
          onToggleAdminView={
            viewState === 'admin'
              ? handleGoHome
              : undefined
          }
          isAdminView={viewState === 'admin'}
          isAssessmentView={viewState === 'assessment'}
          isOnline={isOnlineState}
          pendingSyncCount={pendingSyncCount}
          extraMinutes={assessmentExtraMinutes}
        />

        {/* Savepoint Resume Toast / Alert */}
        {resumeNotice && (
          <div className="bg-amber-600 text-white px-4 py-2.5 text-xs font-bold shadow-md flex items-center justify-between gap-3 animate-fade-in z-50 sticky top-[65px] border-b border-amber-700">
            <div className="flex items-center gap-2 max-w-7xl mx-auto w-full">
              <span className="inline-block w-2 h-2 rounded-full bg-white animate-pulse" />
              <span>{resumeNotice}</span>
            </div>
            <button
              onClick={() => setResumeNotice(null)}
              className="text-white hover:text-amber-100 font-bold px-2 py-0.5 text-xs rounded cursor-pointer shrink-0"
              title="Dismiss"
            >
              ✕
            </button>
          </div>
        )}

        {/* Sync Notification Banner Toast */}
        {syncBannerMessage && (
          <div className="bg-emerald-600 text-white px-4 py-2.5 text-xs font-bold shadow-md flex items-center justify-between gap-3 animate-fade-in z-50 sticky top-[65px] border-b border-emerald-700">
            <div className="flex items-center gap-2 max-w-7xl mx-auto w-full">
              <RefreshCw className="w-4 h-4 shrink-0 animate-spin" />
              <span>{syncBannerMessage}</span>
            </div>
            <button
              onClick={() => setSyncBannerMessage(null)}
              className="text-white hover:text-emerald-100 font-bold px-2 py-0.5 text-xs rounded cursor-pointer shrink-0"
              title="Dismiss"
            >
              ✕
            </button>
          </div>
        )}

        {/* 5-Second Launch Countdown Modal Overlay */}
        {isLaunchingCountdown && pendingStudent && (
          <CountdownModal
            student={pendingStudent}
            onCountdownComplete={handleCountdownComplete}
          />
        )}

        {/* Main Container Views */}
        <main>
          <ErrorBoundary onReset={() => setViewState('auth')}>
            <React.Suspense
              fallback={
                <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
                  <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-sm font-semibold text-slate-600">Loading Assessment Portal...</p>
                </div>
              }
            >
            {viewState === 'auth' && (
            <AuthGate
              key={authKey}
              initialTab={authInitialTab}
              onAuthenticateStudent={handleAuthenticateStudent}
              onOpenAdminPortal={(role = 'admin') => {
                setUserRole(role);
                setViewState('admin');
              }}
              savedSubmissions={savedSubmissions}
              securityLockoutBanner={securityLockoutBanner}
              onClearLockoutBanner={() => setSecurityLockoutBanner(null)}
              securityExitWarningModal={securityExitWarningModal}
              onCloseSecurityExitWarningModal={() => setSecurityExitWarningModal(null)}
              isStudentLoginLocked={isStudentLoginLocked}
              isFacultyLoginLocked={isFacultyLoginLocked}
              lockedStudentRegNos={lockedStudentRegNos}
              studentAccessPin={studentAccessPin}
              studentPinSchedule={studentPinSchedule}
              facultyAccessPin={facultyAccessPin}
              adminAccessPin={adminAccessPin}
              adminId={adminId}
              adminResetEmail={adminResetEmail}
              adminMobile={adminMobile}
              adminSecretRecoveryPin={adminSecretRecoveryPin}
              authorizedFaculty={authorizedFaculty}
              resumableStudentForLogin={resumableStudentForLogin}
              onResetAdminPin={handleSetAdminAccessPin}
              onSetAdminId={handleSetAdminId}
              onSetAdminResetEmail={handleSetAdminResetEmail}
              onSetAdminMobile={handleSetAdminMobile}
              onSetAdminSecretRecoveryPin={handleSetAdminSecretRecoveryPin}
            />
          )}

          {viewState === 'assessment' && (
            <AssessmentView
              questions={currentTestQuestions}
              currentSection={currentSection}
              currentQuestionIndex={currentQuestionIndex}
              responses={responses}
              onSelectOption={handleSelectOption}
              onClearOption={handleClearOption}
              onToggleMarkForReview={handleToggleMarkForReview}
              onChangeSection={setCurrentSection}
              onChangeQuestionIndex={setCurrentQuestionIndex}
              onSubmitAssessment={handleFinalSubmission}
              isOnline={isOnlineState}
              timeRemainingSeconds={timeRemainingSeconds}
              extraMinutes={assessmentExtraMinutes}
              extraWarningMsg={assessmentExtraWarningMsg}
              testTitle={activeAssessmentTest?.title}
              testCode={activeAssessmentTest?.testCode}
              student={student}
              attemptCount={attemptCount}
              maxAttempts={3}
            />
          )}

          {viewState === 'submission' && student && report && (
            <StudentSubmissionView
              student={student}
              report={report}
              onFacultyUnlock={() => setViewState('report')}
              onRetakeOrExit={handleGoHome}
            />
          )}

          {viewState === 'report' && report && (
            <CognitiveReportView
              report={report}
              onRetake={handleGoHome}
              onBackToAdmin={() => setViewState('admin')}
              onBackToFacultyLogin={() => {
                setAuthInitialTab('faculty');
                setViewState('auth');
              }}
              allSubmissions={savedSubmissions}
            />
          )}

          {viewState === 'admin' && (
            <AdminPortal
              userRole={userRole}
              submissions={savedSubmissions}
              questionBank={activeQuestionBank}
              onUploadQuestionBank={handleUploadQuestionBank}
              onResetQuestionBank={handleResetQuestionBank}
              onSelectSubmission={(sub) => {
                setReport(sub.report);
                setViewState('report');
              }}
              onClearSubmissions={() => setSavedSubmissions([])}
              isStudentLoginLocked={isStudentLoginLocked}
              isFacultyLoginLocked={isFacultyLoginLocked}
              lockedStudentRegNos={lockedStudentRegNos}
              onToggleStudentLoginLock={handleToggleStudentLoginLock}
              onToggleFacultyLoginLock={handleToggleFacultyLoginLock}
              onLockStudent={handleLockStudent}
              onUnlockStudent={handleUnlockStudent}
              studentAccessPin={studentAccessPin}
              facultyAccessPin={facultyAccessPin}
              adminAccessPin={adminAccessPin}
              adminId={adminId}
              adminResetEmail={adminResetEmail}
              adminMobile={adminMobile}
              adminSecretRecoveryPin={adminSecretRecoveryPin}
              authorizedFaculty={authorizedFaculty}
              studentPinSchedule={studentPinSchedule}
              assessmentExtraMinutes={assessmentExtraMinutes}
              assessmentExtraWarningMsg={assessmentExtraWarningMsg}
              onSetStudentAccessPin={handleSetStudentAccessPin}
              onSetStudentPinSchedule={handleSetStudentPinSchedule}
              onSetAssessmentExtraTimer={handleSetAssessmentExtraTimer}
              onSetFacultyAccessPin={handleSetFacultyAccessPin}
              onSetAdminAccessPin={handleSetAdminAccessPin}
              onSetAdminId={handleSetAdminId}
              onSetAdminResetEmail={handleSetAdminResetEmail}
              onSetAdminMobile={handleSetAdminMobile}
              onSetAdminSecretRecoveryPin={handleSetAdminSecretRecoveryPin}
              onSetAuthorizedFaculty={handleSetAuthorizedFaculty}
              onDeleteSubmission={handleDeleteSubmission}
              onDeleteMultipleSubmissions={handleDeleteMultipleSubmissions}
              onDeleteAllSubmissions={handleDeleteAllSubmissions}
              onUpdateSubmissionStudentDetails={handleUpdateSubmissionStudentDetails}
              onResumeStudentSession={handleResumeStudentSession}
              onResumeMultipleStudentSessions={handleResumeMultipleStudentSessions}
              onSeedDemoRecords={handleSeedDemoRecords}
              onRefreshSubmissions={handleRefreshSubmissions}
              activeSessions={activeSessions}
              onClearStaleSessions={clearStaleActiveSessions}
            />
          )}
          </React.Suspense>
          </ErrorBoundary>
        </main>

      </div>
    </SecurityGuard>
  );
}
