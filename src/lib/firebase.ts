import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  getFirestore,
  doc,
  getDoc,
  getDocFromServer,
  getDocs,
  collection,
  onSnapshot,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  writeBatch,
  serverTimestamp,
  Firestore
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { SavedSubmission, StudentInfo, CognitiveProfileReport, Question, SecurityLog, FacultyCredential, StudentPinSchedule, AppExperienceFeedback, AssessmentTestConfig, EnrolledStudent, ActiveStudentSession } from '../types';

export type { ActiveStudentSession };

// Initialize Firebase App safely (singleton)
const app = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);

// Initialize Firestore with fast non-blocking Persistent Local Cache
let firestoreInstance: Firestore;
try {
  firestoreInstance = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager(),
    }),
  }, firebaseConfig.firestoreDatabaseId);
} catch {
  // If already initialized or fallback needed
  firestoreInstance = getFirestore(app, firebaseConfig.firestoreDatabaseId);
}

export const db = firestoreInstance;
export const auth = getAuth(app);

// Test Firestore Connection (Non-blocking async call)
export async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && (error.message.includes('the client is offline') || error.message.includes('unavailable'))) {
      console.info('Firestore operating with offline cache and auto-sync.');
    }
  }
}
testConnection();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const isOfflineOrUnavailable = isNetworkUnavailableError(error);
  const isQuota = isQuotaExceededError(error);

  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid || null,
      email: auth.currentUser?.email || null,
    },
    operationType,
    path
  };

  if (isQuota) {
    console.warn(`[Firestore Quota] Daily quota limit reached during ${operationType} on ${path}. Utilizing local offline storage.`);
  } else if (isOfflineOrUnavailable) {
    console.info(`[Firestore Sync] Network offline/unavailable during ${operationType} on ${path}. Queued to persistent offline cache.`);
  } else {
    console.warn(`[Firestore Info] ${operationType} on ${path}:`, JSON.stringify(errInfo));
  }
  return new Error(JSON.stringify(errInfo));
}

function isQuotaExceededError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error);
  return (
    msg.includes('Quota exceeded') ||
    msg.includes('resource-exhausted') ||
    msg.includes('quota') ||
    msg.includes('Quota')
  );
}

function isNetworkUnavailableError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error);
  return (
    msg.includes('unavailable') ||
    msg.includes('offline') ||
    msg.includes('Failed to get document because the client is offline') ||
    msg.includes('Could not reach Cloud Firestore backend') ||
    (typeof error === 'object' && error !== null && 'code' in error && (error as { code: string }).code === 'unavailable')
  );
}

// -------------------------------------------------------------
// SUBMISSIONS FIRESTORE REALTIME SYNC
// -------------------------------------------------------------

// Known Department and Name mappings for specific Student Register Numbers
export const DCS_SPECIFIC_STUDENTS: Record<string, { name: string; dept: string }> = {
  '26DCS014': { name: 'ASHWIN S', dept: 'MSc Decision and Computing Sciences' },
  '26DCS016': { name: 'BALAMURUGAN', dept: 'MSc Decision and Computing Sciences' },
  '26DCS024': { name: 'HASSINI S', dept: 'MSc Decision and Computing Sciences' },
  '26DCS025': { name: 'ILAKKYA S', dept: 'MSc Decision and Computing Sciences' },
  '26DCS038': { name: 'PRADIKSHA', dept: 'MSc Decision and Computing Sciences' },
  '26DCS047': { name: 'THANISHA', dept: 'MSc Decision and Computing Sciences' },
};

function normalizeSubmission(raw: any, docId: string): SavedSubmission {
  const id = raw?.id || docId;
  const rawRegNo = raw?.student?.regNo || raw?.student?.registerNo || raw?.studentRegNo || raw?.regNo || raw?.registerNo || 'N/A';
  const regNoUpper = String(rawRegNo).trim().toUpperCase();

  let studentName = raw?.student?.name || raw?.studentName || raw?.name || 'Student Candidate';
  let studentDept = raw?.student?.dept || raw?.student?.department || raw?.department || raw?.dept || 'B.E. Civil Engineering';

  // Apply VLSI department normalization
  if (studentDept.toLowerCase().includes('vlsi') || regNoUpper.includes('VLSI') || regNoUpper.includes('26VL') || regNoUpper.includes('24VL')) {
    studentDept = 'B.E. Electronics Engineering (VLSI Design and Technology)';
  } else if (DCS_SPECIFIC_STUDENTS[regNoUpper]) {
    studentDept = 'MSc Decision and Computing Sciences';
    // If student name is placeholder or contains register number, use official student name
    if (!studentName || studentName === 'Student Candidate' || studentName.toUpperCase().includes('STUDENT') || studentName.toUpperCase() === regNoUpper) {
      studentName = DCS_SPECIFIC_STUDENTS[regNoUpper].name;
    }
  } else if (regNoUpper.includes('DCS')) {
    studentDept = 'MSc Decision and Computing Sciences';
  }

  const student: StudentInfo = {
    name: studentName,
    registerNo: regNoUpper,
    department: studentDept,
    accessPasscode: raw?.student?.accessPasscode || raw?.accessPasscode || 'CIT-PASS',
    authenticatedAt: raw?.student?.authenticatedAt || raw?.authenticatedAt || new Date().toISOString()
  };

  let submittedAt = raw?.submittedAt || raw?.createdAt;
  if (!submittedAt && raw?.timestamp) {
    if (typeof raw?.timestamp?.toDate === 'function') {
      submittedAt = raw.timestamp.toDate().toLocaleString();
    } else {
      submittedAt = String(raw.timestamp);
    }
  }
  if (!submittedAt) {
    submittedAt = new Date().toLocaleString();
  }

  const rawScore = typeof raw?.totalScore === 'number' ? raw.totalScore : (typeof raw?.score === 'number' ? raw.score : 0);
  const rawMax = typeof raw?.maxScore === 'number' ? raw.maxScore : 50;
  const rawPct = typeof raw?.percentage === 'number' ? raw.percentage : (rawMax > 0 ? Math.round((rawScore / rawMax) * 100) : 0);

  const rawReport = raw?.report || {};
  const reportStudent: StudentInfo = rawReport?.student ? {
    ...rawReport.student,
    name: studentName,
    registerNo: regNoUpper,
    department: studentDept,
    accessPasscode: rawReport.student.accessPasscode || student.accessPasscode,
    authenticatedAt: rawReport.student.authenticatedAt || student.authenticatedAt
  } : student;

  const report: CognitiveProfileReport = {
    student: reportStudent,
    testTimestamp: rawReport?.testTimestamp || submittedAt,
    totalDurationSeconds: rawReport?.totalDurationSeconds || rawReport?.timeSpentSeconds || raw?.timeSpentSeconds || 0,
    overallScore: typeof rawReport?.overallScore === 'number' ? rawReport.overallScore : (typeof rawReport?.totalScore === 'number' ? rawReport.totalScore : rawScore),
    maxScore: typeof rawReport?.maxScore === 'number' ? rawReport.maxScore : (typeof rawReport?.maxPossibleScore === 'number' ? rawReport.maxPossibleScore : rawMax),
    overallPercentage: typeof rawReport?.overallPercentage === 'number' ? rawReport.overallPercentage : (typeof rawReport?.percentage === 'number' ? rawReport.percentage : rawPct),
    difficultyBreakdown: rawReport?.difficultyBreakdown || {
      easy: { attempted: 0, correct: 0, accuracy: 0, timeSpentSeconds: 0 },
      medium: { attempted: 0, correct: 0, accuracy: 0, timeSpentSeconds: 0 },
      hard: { attempted: 0, correct: 0, accuracy: 0, timeSpentSeconds: 0 }
    },
    sectionScores: rawReport?.sectionScores || raw?.sectionScores || raw?.scores || ({} as any),
    cognitionLevel: rawReport?.cognitionLevel || {
      tier: rawReport?.grade || 'Proficient',
      grade: rawPct >= 80 ? 'A' : rawPct >= 50 ? 'B' : 'C',
      analyticalIndex: rawPct,
      logicPurity: rawPct,
      speedAccuracyFactor: rawPct,
      summary: rawReport?.overallSummary || 'Completed cognitive assessment successfully.'
    },
    behavioralTraits: rawReport?.behavioralTraits || {
      focusIndex: 85,
      adaptabilityFactor: 80,
      systematicApproach: 85,
      riskAccuracyBalance: 'Balanced'
    },
    personalityProfile: rawReport?.personalityProfile || {
      primaryArchetype: 'Analytical Strategist',
      traits: ['Methodical Problem Solving', 'High Cognitive Focus'],
      workStyle: 'Systematic & Data-Driven'
    },
    computationalCapabilities: rawReport?.computationalCapabilities || {
      abstractReasoning: 'Proficient',
      algorithmicThinking: 'Proficient',
      patternSynthesis: 'Proficient',
      quantitativeAptitude: 'Proficient'
    },
    recommendedCareerPaths: rawReport?.recommendedCareerPaths || [
      { role: 'Decision Analyst', alignmentScore: 92, keyStrengths: ['Data Logic'] },
      { role: 'Data Scientist', alignmentScore: 88, keyStrengths: ['Quantitative Analysis'] }
    ],
    studentFeedback: rawReport?.studentFeedback || {
      overallRating: 5,
      systemExperience: 'Smooth',
      clarityOfQuestions: 5,
      platformEase: 5
    },
    aiEnrichment: rawReport?.aiEnrichment || raw?.aiEnrichment,
    securitySummary: rawReport?.securitySummary || {
      isViolated: !!raw?.isLockedOut,
      totalSwitchCount: 0,
      maxAllowedSwitches: 3,
      lockoutTriggered: !!raw?.isLockedOut,
      violationLogs: []
    },
    detailedItemAnalysis: rawReport?.detailedItemAnalysis || []
  };

  return {
    id,
    student,
    submittedAt: typeof submittedAt === 'string' ? submittedAt : new Date().toLocaleString(),
    report,
    isLockedOut: !!raw?.isLockedOut,
    securityViolation: raw?.securityViolation,
    feedback: raw?.feedback,
    createdAt: raw?.createdAt || (typeof submittedAt === 'string' ? submittedAt : new Date().toISOString())
  };
}

export async function saveSubmissionToFirestore(submission: SavedSubmission, maxRetries = 3) {
  const path = `submissions/${submission.id}`;

  // Always mirror write to local cache first so candidate data is never lost under any circumstance
  try {
    const raw = localStorage.getItem('CIT_COGNITIVE_SUBMISSIONS');
    const list: SavedSubmission[] = raw ? JSON.parse(raw) : [];
    const filtered = list.filter((s) => s.id !== submission.id);
    localStorage.setItem('CIT_COGNITIVE_SUBMISSIONS', JSON.stringify([submission, ...filtered]));
  } catch (_) {}

  let attempt = 0;
  while (attempt < maxRetries) {
    try {
      const docRef = doc(db, 'submissions', submission.id);
      await setDoc(docRef, {
        ...submission,
        createdAt: submission.submittedAt || new Date().toISOString()
      });
      return; // Write succeeded
    } catch (err) {
      if (isQuotaExceededError(err)) {
        console.warn('Firestore write hit Quota Exceeded. Saved safely to local browser storage.');
        throw err;
      }
      attempt++;
      if (attempt >= maxRetries) {
        console.warn(`Failed to save submission to Firestore after ${maxRetries} attempts (offline fallback used):`, err);
        handleFirestoreError(err, OperationType.WRITE, path);
        throw err;
      } else {
        // Exponential backoff with random jitter: 200ms, 400ms, 800ms
        const delay = Math.pow(2, attempt) * 100 + Math.random() * 100;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }
}

export async function saveSubmissionsBatchToFirestore(submissions: SavedSubmission[]) {
  if (!submissions || submissions.length === 0) return;
  const path = 'submissions/batch';
  try {
    const batch = writeBatch(db);
    const nowISO = new Date().toISOString();
    submissions.forEach((submission) => {
      const docRef = doc(db, 'submissions', submission.id);
      batch.set(docRef, {
        ...submission,
        createdAt: submission.submittedAt || nowISO
      });
    });
    await batch.commit();
  } catch (err) {
    console.warn('Failed to save submissions batch to Firestore:', err);
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export function subscribeSubmissions(callback: (subs: SavedSubmission[]) => void) {
  const path = 'submissions';
  try {
    const q = query(collection(db, 'submissions'));
    return onSnapshot(
      q,
      async (snapshot) => {
        const subsMap = new Map<string, SavedSubmission>();
        snapshot.forEach((docSnap) => {
          const parsed = normalizeSubmission(docSnap.data(), docSnap.id);
          subsMap.set(parsed.id, parsed);
        });

        // Also check if any additional records exist in 'assessmentSubmissions'
        try {
          const secondarySnap = await getDocs(collection(db, 'assessmentSubmissions'));
          secondarySnap.forEach((docSnap) => {
            const parsed = normalizeSubmission(docSnap.data(), docSnap.id);
            if (!subsMap.has(parsed.id)) {
              subsMap.set(parsed.id, parsed);
            }
          });
        } catch (_) {
          // secondary collection might not exist, ignore
        }

        // Merge any local submissions that haven't synced yet
        try {
          const raw = localStorage.getItem('CIT_COGNITIVE_SUBMISSIONS');
          if (raw) {
            const localList: SavedSubmission[] = JSON.parse(raw);
            if (Array.isArray(localList)) {
              localList.forEach((s) => {
                if (s && s.id && !subsMap.has(s.id)) {
                  subsMap.set(s.id, s);
                }
              });
            }
          }
        } catch (_) {}

        const subs = Array.from(subsMap.values());
        // Sort descending by submittedAt / createdAt / id
        subs.sort((a, b) => {
          const timeA = a.submittedAt || a.createdAt || a.id;
          const timeB = b.submittedAt || b.createdAt || b.id;
          return timeB.localeCompare(timeA);
        });

        // Cache latest merged list
        try {
          localStorage.setItem('CIT_COGNITIVE_SUBMISSIONS', JSON.stringify(subs));
        } catch (_) {}

        callback(subs);
      },
      (error) => {
        if (isQuotaExceededError(error)) {
          console.warn('Submissions snapshot: Quota limit reached, loading local storage cache.');
        } else {
          console.warn('Submissions snapshot info:', error.message || error);
        }

        // Fallback: Read all local storage submissions and supply them to the callback
        try {
          const localKeys = ['CIT_COGNITIVE_SUBMISSIONS', 'CIT_PENDING_OFFLINE_SUBMISSIONS', 'CIT_OFFLINE_SUBMISSIONS', 'CIT_ASSESSMENT_SUBMISSIONS'];
          const subsMap = new Map<string, SavedSubmission>();
          localKeys.forEach((key) => {
            const raw = localStorage.getItem(key);
            if (raw) {
              const list: SavedSubmission[] = JSON.parse(raw);
              if (Array.isArray(list)) {
                list.forEach((s) => {
                  if (s && (s.id || s.student?.registerNo)) {
                    const sid = s.id || `SUB-LOCAL-${s.student?.registerNo}`;
                    subsMap.set(sid, { ...s, id: sid });
                  }
                });
              }
            }
          });
          const localSubs = Array.from(subsMap.values());
          localSubs.sort((a, b) => {
            const timeA = a.submittedAt || a.createdAt || a.id;
            const timeB = b.submittedAt || b.createdAt || b.id;
            return timeB.localeCompare(timeA);
          });
          if (localSubs.length > 0) {
            callback(localSubs);
          }
        } catch (e) {
          console.warn('Failed to supply local storage fallback submissions:', e);
        }

        handleFirestoreError(error, OperationType.GET, path);
      }
    );
  } catch (err) {
    console.warn('Failed to subscribe to submissions:', err);
    return () => {};
  }
}

export async function getAllSubmissionsFromFirestore(): Promise<SavedSubmission[]> {
  const path = 'submissions';
  const subsMap = new Map<string, SavedSubmission>();
  
  try {
    const q = query(collection(db, 'submissions'));
    const snapshot = await getDocs(q);
    snapshot.forEach((docSnap) => {
      const parsed = normalizeSubmission(docSnap.data(), docSnap.id);
      subsMap.set(parsed.id, parsed);
    });
  } catch (err) {
    console.warn('Failed to fetch from submissions in Firestore (falling back to local cache):', err);
    handleFirestoreError(err, OperationType.GET, path);
  }

  try {
    const q2 = query(collection(db, 'assessmentSubmissions'));
    const snapshot2 = await getDocs(q2);
    snapshot2.forEach((docSnap) => {
      const parsed = normalizeSubmission(docSnap.data(), docSnap.id);
      if (!subsMap.has(parsed.id)) {
        subsMap.set(parsed.id, parsed);
      }
    });
  } catch (_) {
    // optional secondary collection
  }

  // Always merge local storage submissions so offline/quota data is preserved
  try {
    const localKeys = ['CIT_COGNITIVE_SUBMISSIONS', 'CIT_PENDING_OFFLINE_SUBMISSIONS', 'CIT_OFFLINE_SUBMISSIONS', 'CIT_ASSESSMENT_SUBMISSIONS', 'CIT_MATH_ASSESSMENT_SUBMISSIONS'];
    localKeys.forEach((key) => {
      const item = localStorage.getItem(key);
      if (item) {
        const parsed = JSON.parse(item);
        if (Array.isArray(parsed)) {
          parsed.forEach((s) => {
            if (s && (s.id || s.student?.registerNo)) {
              const sid = s.id || `SUB-LOCAL-${s.student?.registerNo}`;
              if (!subsMap.has(sid)) {
                subsMap.set(sid, { ...s, id: sid });
              }
            }
          });
        }
      }
    });
  } catch (localErr) {
    console.warn('Local storage fallback error in getAllSubmissions:', localErr);
  }

  const subs = Array.from(subsMap.values());
  // Sort descending by submittedAt / createdAt / id
  subs.sort((a, b) => {
    const timeA = a.submittedAt || a.createdAt || a.id;
    const timeB = b.submittedAt || b.createdAt || b.id;
    return timeB.localeCompare(timeA);
  });
  return subs;
}

export async function updateSubmissionInFirestore(submissionId: string, updates: Partial<SavedSubmission>) {
  const path = `submissions/${submissionId}`;
  try {
    const docRef = doc(db, 'submissions', submissionId);
    await updateDoc(docRef, updates);
  } catch (err) {
    console.warn('Failed to update submission in Firestore:', err);
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

/**
 * Updates a student's Register Number (registerNo), Department, and optional Name for a submission
 * across Firestore collections ('submissions', 'assessmentSubmissions', and 'studentFeedback').
 */
export async function updateSubmissionStudentDetailsInFirestore(
  submissionId: string,
  details: {
    registerNo: string;
    department: string;
    name?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const regUpper = String(details.registerNo || '').trim().toUpperCase();
    const dept = String(details.department || '').trim();
    const name = details.name ? String(details.name).trim() : undefined;

    const collectionsToSearch = ['submissions', 'assessmentSubmissions'];

    for (const colName of collectionsToSearch) {
      try {
        const docRef = doc(db, colName, submissionId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const raw = docSnap.data();
          const studentObj = {
            ...(raw?.student || {}),
            regNo: regUpper,
            registerNo: regUpper,
            dept: dept,
            department: dept,
            ...(name ? { name } : {})
          };

          const reportObj = raw?.report ? {
            ...raw.report,
            student: {
              ...(raw.report.student || {}),
              regNo: regUpper,
              registerNo: regUpper,
              dept: dept,
              department: dept,
              ...(name ? { name } : {})
            }
          } : undefined;

          const updatePayload: Record<string, any> = {
            student: studentObj,
            department: dept,
            regNo: regUpper,
            registerNo: regUpper
          };
          if (name) {
            updatePayload.studentName = name;
            updatePayload.name = name;
          }
          if (reportObj) {
            updatePayload.report = reportObj;
          }

          await updateDoc(docRef, updatePayload);
        }
      } catch (colErr) {
        console.warn(`Error updating submission details in collection ${colName}:`, colErr);
      }
    }

    // Also update any matching document in 'studentFeedback' collection
    try {
      const fbSnap = await getDocs(collection(db, 'studentFeedback'));
      const fbBatch = writeBatch(db);
      let fbOps = 0;
      fbSnap.forEach((docSnap) => {
        const fbData = docSnap.data();
        const fbReg = String(fbData.regNo || fbData.studentRegNo || '').trim().toUpperCase();
        if (fbReg === regUpper || docSnap.id === submissionId || fbData.submissionId === submissionId) {
          fbBatch.set(docSnap.ref, {
            studentRegNo: regUpper,
            regNo: regUpper,
            department: dept,
            ...(name ? { studentName: name } : {})
          }, { merge: true });
          fbOps++;
        }
      });
      if (fbOps > 0) {
        await fbBatch.commit();
      }
    } catch (_) {}

    return { success: true };
  } catch (err: any) {
    console.error('Failed to update submission student details in Firestore:', err);
    return { success: false, error: err?.message || 'Update failed' };
  }
}

/**
 * Synchronizes department renaming from "MSc Data Science" to "MSc Decision and Computing Sciences"
 * for Register Numbers: 26DCS014, 26DCS016, 26DCS024, 26DCS025, 26DCS038, 26DCS047 (and any DCS Register Numbers)
 * directly in Cloud Firestore collections (submissions, assessmentSubmissions, studentFeedback)
 * as well as browser local storage caches.
 */
export async function syncDcsDepartmentRenamesToFirestore(): Promise<number> {
  let updatedCount = 0;
  try {
    const collectionsToUpdate = ['submissions', 'assessmentSubmissions'];
    for (const colName of collectionsToUpdate) {
      const snap = await getDocs(collection(db, colName));
      const batch = writeBatch(db);
      let batchOps = 0;

      snap.forEach((docSnap) => {
        const raw = docSnap.data();
        const rawRegNo = raw?.student?.regNo || raw?.student?.registerNo || raw?.studentRegNo || raw?.regNo || raw?.registerNo || '';
        const regNoUpper = String(rawRegNo).trim().toUpperCase();

        if (DCS_SPECIFIC_STUDENTS[regNoUpper] || regNoUpper.includes('DCS')) {
          const currentDept = raw?.student?.dept || raw?.student?.department || raw?.department || raw?.dept;
          const targetDept = 'MSc Decision and Computing Sciences';
          const targetName = DCS_SPECIFIC_STUDENTS[regNoUpper]?.name || raw?.student?.name || raw?.studentName || raw?.name || 'Student Candidate';

          if (currentDept !== targetDept || (DCS_SPECIFIC_STUDENTS[regNoUpper] && raw?.student?.name !== targetName)) {
            const docRef = doc(db, colName, docSnap.id);
            const studentUpdates = {
              ...(raw?.student || {}),
              name: targetName,
              regNo: regNoUpper,
              registerNo: regNoUpper,
              dept: targetDept,
              department: targetDept
            };
            const reportUpdates = raw?.report ? {
              ...raw.report,
              student: {
                ...(raw.report.student || {}),
                name: targetName,
                regNo: regNoUpper,
                registerNo: regNoUpper,
                dept: targetDept,
                department: targetDept
              }
            } : undefined;

            const docUpdates: any = {
              student: studentUpdates,
              department: targetDept,
              dept: targetDept,
              studentName: targetName
            };
            if (reportUpdates) {
              docUpdates.report = reportUpdates;
            }

            batch.set(docRef, docUpdates, { merge: true });
            batchOps++;
            updatedCount++;
          }
        }
      });

      if (batchOps > 0) {
        await batch.commit();
      }
    }

    // Also update studentFeedback collection if present
    try {
      const feedbackSnap = await getDocs(collection(db, 'studentFeedback'));
      const fbBatch = writeBatch(db);
      let fbOps = 0;
      feedbackSnap.forEach((docSnap) => {
        const data = docSnap.data();
        const rawReg = data.regNo || data.studentRegNo || '';
        const regUpper = String(rawReg).trim().toUpperCase();
        if (DCS_SPECIFIC_STUDENTS[regUpper] || regUpper.includes('DCS')) {
          const targetDept = 'MSc Decision and Computing Sciences';
          const targetName = DCS_SPECIFIC_STUDENTS[regUpper]?.name || data.studentName;
          if (data.department !== targetDept || (DCS_SPECIFIC_STUDENTS[regUpper] && data.studentName !== targetName)) {
            fbBatch.set(docSnap.ref, { department: targetDept, studentName: targetName }, { merge: true });
            fbOps++;
          }
        }
      });
      if (fbOps > 0) {
        await fbBatch.commit();
      }
    } catch (_) {}

    // Also update local storage cached submissions across all storage keys
    try {
      const storageKeys = ['CIT_SAVED_SUBMISSIONS', 'CIT_COGNITIVE_SUBMISSIONS', 'CIT_ASSESSMENT_SUBMISSIONS'];
      for (const storageKey of storageKeys) {
        const localSubsStr = localStorage.getItem(storageKey);
        if (localSubsStr) {
          const localSubs = JSON.parse(localSubsStr);
          if (Array.isArray(localSubs)) {
            let modified = false;
            const updatedLocal = localSubs.map((sub: any) => {
              const regNoUpper = (sub.student?.registerNo || (sub.student as any)?.regNo || sub.regNo || '').toUpperCase();
              if (DCS_SPECIFIC_STUDENTS[regNoUpper] || regNoUpper.includes('DCS')) {
                modified = true;
                const targetDept = 'MSc Decision and Computing Sciences';
                const targetName = DCS_SPECIFIC_STUDENTS[regNoUpper]?.name || sub.student?.name || sub.name;
                return {
                  ...sub,
                  department: targetDept,
                  dept: targetDept,
                  studentName: targetName,
                  student: {
                    ...(sub.student || {}),
                    name: targetName,
                    department: targetDept,
                    dept: targetDept
                  },
                  report: sub.report ? {
                    ...sub.report,
                    student: {
                      ...(sub.report.student || {}),
                      name: targetName,
                      department: targetDept,
                      dept: targetDept
                    }
                  } : sub.report
                };
              }
              return sub;
            });
            if (modified) {
              localStorage.setItem(storageKey, JSON.stringify(updatedLocal));
            }
          }
        }
      }
    } catch (_) {}

  } catch (err) {
    console.warn('Failed to sync DCS department renames to Firestore:', err);
  }
  return updatedCount;
}

export async function deleteSubmissionFromFirestore(submissionId: string) {
  const path = `submissions/${submissionId}`;
  try {
    const docRef = doc(db, 'submissions', submissionId);
    await deleteDoc(docRef);
  } catch (err) {
    console.warn('Failed to delete submission from Firestore:', err);
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export async function deleteMultipleSubmissionsFromFirestore(submissionIds: string[]): Promise<number> {
  if (!submissionIds || submissionIds.length === 0) return 0;
  const path = 'submissions/batch-delete';
  let deletedCount = 0;
  try {
    const batchSize = 400;
    for (let i = 0; i < submissionIds.length; i += batchSize) {
      const chunk = submissionIds.slice(i, i + batchSize);
      const batch = writeBatch(db);
      chunk.forEach((id) => {
        const docRef = doc(db, 'submissions', id);
        batch.delete(docRef);
        deletedCount++;
      });
      await batch.commit();
    }
    return deletedCount;
  } catch (err) {
    console.warn('Failed to delete submissions batch from Firestore:', err);
    handleFirestoreError(err, OperationType.DELETE, path);
    return deletedCount;
  }
}

export async function clearAllSubmissionsFromFirestore(): Promise<{ deletedCount: number }> {
  const path = 'submissions';
  try {
    const q = query(collection(db, 'submissions'));
    const snapshot = await getDocs(q);

    const docs = snapshot.docs;
    let deletedCount = 0;
    const batchSize = 400;

    for (let i = 0; i < docs.length; i += batchSize) {
      const chunk = docs.slice(i, i + batchSize);
      const batch = writeBatch(db);
      chunk.forEach((docItem) => {
        batch.delete(docItem.ref);
        deletedCount++;
      });
      await batch.commit();
    }

    // Also clean up any lingering assessment savepoints so fresh attempts start cleanly
    try {
      const spSnap = await getDocs(query(collection(db, 'assessmentSavepoints')));
      if (!spSnap.empty) {
        for (let i = 0; i < spSnap.docs.length; i += batchSize) {
          const chunk = spSnap.docs.slice(i, i + batchSize);
          const batch = writeBatch(db);
          chunk.forEach((docItem) => batch.delete(docItem.ref));
          await batch.commit();
        }
      }
    } catch (spErr) {
      console.warn('Note: assessmentSavepoints cleanup skipped:', spErr);
    }

    // Also clean up active sessions
    try {
      const sessSnap = await getDocs(query(collection(db, 'activeStudentSessions')));
      if (!sessSnap.empty) {
        for (let i = 0; i < sessSnap.docs.length; i += batchSize) {
          const chunk = sessSnap.docs.slice(i, i + batchSize);
          const batch = writeBatch(db);
          chunk.forEach((docItem) => batch.delete(docItem.ref));
          await batch.commit();
        }
      }
    } catch (sessErr) {
      console.warn('Note: activeStudentSessions cleanup skipped:', sessErr);
    }

    console.log(`Successfully cleared ${deletedCount} student submissions from Firestore.`);
    return { deletedCount };
  } catch (err) {
    console.warn('Failed to clear all submissions from Firestore:', err);
    handleFirestoreError(err, OperationType.DELETE, path);
    return { deletedCount: 0 };
  }
}

/**
 * Clears all student login timestamp attendance records from Firestore and local storage.
 */
export async function clearAllStudentLoginsFromFirestore(): Promise<{ deletedCount: number }> {
  const path = STUDENT_LOGINS_COLLECTION;
  try {
    const q = query(collection(db, STUDENT_LOGINS_COLLECTION));
    const snapshot = await getDocs(q);
    let deletedCount = 0;
    const batchSize = 400;

    for (let i = 0; i < snapshot.docs.length; i += batchSize) {
      const chunk = snapshot.docs.slice(i, i + batchSize);
      const batch = writeBatch(db);
      chunk.forEach((docItem) => {
        batch.delete(docItem.ref);
        deletedCount++;
      });
      await batch.commit();
    }

    try {
      localStorage.removeItem('CIT_STUDENT_LOGINS');
    } catch {}

    return { deletedCount };
  } catch (err) {
    console.warn('Failed to clear student logins from Firestore:', err);
    handleFirestoreError(err, OperationType.DELETE, path);
    return { deletedCount: 0 };
  }
}

// -------------------------------------------------------------
// GLOBAL SETTINGS REALTIME SYNC (PINs, Lock Statuses, Locked Students)
// -------------------------------------------------------------

export interface GlobalSettingsData {
  isStudentLoginLocked?: boolean;
  isFacultyLoginLocked?: boolean;
  lockedStudentRegNos?: string[];
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
  updatedAt?: string;
}

export async function saveGlobalSettingsToFirestore(settings: GlobalSettingsData) {
  const path = 'settings/global';
  try {
    const docRef = doc(db, 'settings', 'global');
    await setDoc(
      docRef,
      {
        ...settings,
        updatedAt: new Date().toISOString()
      },
      { merge: true }
    );
  } catch (err) {
    console.warn('Failed to save global settings to Firestore:', err);
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export function subscribeGlobalSettings(callback: (settings: GlobalSettingsData | null) => void) {
  const path = 'settings/global';
  try {
    const docRef = doc(db, 'settings', 'global');
    return onSnapshot(
      docRef,
      (snapshot) => {
        if (snapshot.exists()) {
          callback(snapshot.data() as GlobalSettingsData);
        } else {
          callback(null);
        }
      },
      (error) => {
        if (isQuotaExceededError(error)) {
          console.warn('Settings snapshot: Quota limit reached, using local storage cache.');
        } else {
          console.warn('Settings snapshot info:', error.message || error);
        }
        handleFirestoreError(error, OperationType.GET, path);
      }
    );
  } catch (err) {
    console.warn('Failed to subscribe to global settings:', err);
    return () => {};
  }
}

// -------------------------------------------------------------
// QUESTION BANK REALTIME SYNC
// -------------------------------------------------------------

export async function saveQuestionBankToFirestore(questions: Question[]) {
  const path = 'questionBank/custom';
  try {
    const docRef = doc(db, 'questionBank', 'custom');
    await setDoc(docRef, {
      questions,
      updatedAt: new Date().toISOString()
    });
  } catch (err) {
    console.warn('Failed to save custom question bank to Firestore:', err);
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export function subscribeQuestionBank(callback: (questions: Question[] | null) => void) {
  const path = 'questionBank/custom';
  try {
    const docRef = doc(db, 'questionBank', 'custom');
    return onSnapshot(
      docRef,
      (snapshot) => {
        if (snapshot.exists() && Array.isArray(snapshot.data()?.questions)) {
          callback(snapshot.data()?.questions as Question[]);
        } else {
          callback(null);
        }
      },
      (error) => {
        if (isQuotaExceededError(error)) {
          console.warn('Question bank snapshot: Quota limit reached, using local storage cache.');
        } else {
          console.warn('Question bank snapshot info:', error.message || error);
        }
        handleFirestoreError(error, OperationType.GET, path);
      }
    );
  } catch (err) {
    console.warn('Failed to subscribe to question bank:', err);
    return () => {};
  }
}

// -------------------------------------------------------------
// SECURITY LOGS & MISBEHAVIOR INCIDENT REALTIME SYNC
// -------------------------------------------------------------

export async function saveSecurityLogToFirestore(logItem: SecurityLog) {
  const path = `securityLogs/${logItem.id}`;
  try {
    const docRef = doc(db, 'securityLogs', logItem.id);
    await setDoc(docRef, {
      ...logItem,
      createdAt: new Date().toISOString()
    });
  } catch (err) {
    console.warn('Failed to log security incident to Firestore:', err);
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export function subscribeSecurityLogs(callback: (logs: SecurityLog[]) => void) {
  const path = 'securityLogs';
  try {
    const q = query(collection(db, 'securityLogs'));
    return onSnapshot(
      q,
      (snapshot) => {
        const logs: SecurityLog[] = [];
        snapshot.forEach((doc) => {
          logs.push(doc.data() as SecurityLog);
        });
        // Sort descending by timestamp / id
        logs.sort((a, b) => (b.timestamp > a.timestamp ? 1 : -1));
        callback(logs);
      },
      (error) => {
        if (isQuotaExceededError(error)) {
          console.warn('Security logs snapshot: Quota limit reached, using local storage cache.');
        } else {
          console.warn('Security logs snapshot info:', error.message || error);
        }
        handleFirestoreError(error, OperationType.GET, path);
      }
    );
  } catch (err) {
    console.warn('Failed to subscribe to security logs:', err);
    return () => {};
  }
}

export async function resolveSecurityLogInFirestore(logId: string) {
  const path = `securityLogs/${logId}`;
  try {
    const docRef = doc(db, 'securityLogs', logId);
    await updateDoc(docRef, { resolved: true });
  } catch (err) {
    console.warn('Failed to resolve security log:', err);
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function saveFeedbackToFirestore(feedback: AppExperienceFeedback) {
  const feedbackId = feedback.id || `FB-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const path = `studentFeedback/${feedbackId}`;
  try {
    const docRef = doc(db, 'studentFeedback', feedbackId);
    await setDoc(docRef, {
      ...feedback,
      id: feedbackId,
      createdAt: new Date().toISOString()
    });
  } catch (err) {
    console.warn('Failed to save student feedback to Firestore:', err);
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export function subscribeToFeedback(callback: (feedbacks: AppExperienceFeedback[]) => void) {
  const path = 'studentFeedback';
  try {
    const q = query(collection(db, 'studentFeedback'), orderBy('createdAt', 'desc'));
    return onSnapshot(
      q,
      (snapshot) => {
        const list: AppExperienceFeedback[] = [];
        snapshot.forEach((doc) => {
          list.push(doc.data() as AppExperienceFeedback);
        });
        callback(list);
      },
      (error) => {
        if (isQuotaExceededError(error)) {
          console.warn('Feedback snapshot: Quota limit reached, using local storage cache.');
        } else {
          console.warn('Failed to subscribe to student feedback:', error);
        }
        // Fallback to local storage
        try {
          const cached = localStorage.getItem('cit_student_feedback_list');
          if (cached) callback(JSON.parse(cached));
        } catch {
          callback([]);
        }
      }
    );
  } catch (err) {
    console.warn('Failed to setup feedback subscription:', err);
    return () => {};
  }
}

export async function deleteFeedbackFromFirestore(feedbackId: string) {
  const path = `studentFeedback/${feedbackId}`;
  try {
    const docRef = doc(db, 'studentFeedback', feedbackId);
    await deleteDoc(docRef);
  } catch (err) {
    console.warn('Failed to delete student feedback from Firestore:', err);
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export async function clearAllFeedbackFromFirestore(): Promise<{ deletedCount: number }> {
  const path = 'studentFeedback';
  try {
    const q = query(collection(db, 'studentFeedback'));
    const snapshot = await getDocs(q);
    if (snapshot.empty) {
      return { deletedCount: 0 };
    }

    const docs = snapshot.docs;
    let deletedCount = 0;
    const batchSize = 400;

    for (let i = 0; i < docs.length; i += batchSize) {
      const chunk = docs.slice(i, i + batchSize);
      const batch = writeBatch(db);
      chunk.forEach((docItem) => {
        batch.delete(docItem.ref);
        deletedCount++;
      });
      await batch.commit();
    }

    // Clear local storage cache
    try {
      localStorage.removeItem('cit_student_feedback_list');
      localStorage.removeItem('CIT_APP_FEEDBACK');
      localStorage.setItem('cit_student_feedback_cleared', 'true');
    } catch {}

    return { deletedCount };
  } catch (err) {
    console.warn('Failed to clear all student feedback from Firestore:', err);
    handleFirestoreError(err, OperationType.DELETE, path);
    // Still clear local storage
    try {
      localStorage.removeItem('cit_student_feedback_list');
      localStorage.removeItem('CIT_APP_FEEDBACK');
      localStorage.setItem('cit_student_feedback_cleared', 'true');
    } catch {}
    return { deletedCount: 0 };
  }
}

// -------------------------------------------------------------
// ASSESSMENT TESTS & ENROLLED STUDENTS PERSISTENCE
// -------------------------------------------------------------

export async function saveAssessmentTestToFirestore(test: AssessmentTestConfig): Promise<void> {
  const path = `tests/${test.id}`;
  
  // Save to local storage cache immediately
  try {
    const cachedRaw = localStorage.getItem('CIT_ASSESSMENT_TESTS');
    const existingList: AssessmentTestConfig[] = cachedRaw ? JSON.parse(cachedRaw) : [];
    const index = existingList.findIndex(t => t.id === test.id);
    if (index >= 0) {
      existingList[index] = test;
    } else {
      existingList.unshift(test);
    }
    // If this test is active, mark others as archived and update active test config
    if (test.status === 'active') {
      existingList.forEach(t => {
        if (t.id !== test.id && t.status === 'active') t.status = 'archived';
      });
      localStorage.setItem('CIT_ACTIVE_TEST_CONFIG', JSON.stringify(test));
      window.dispatchEvent(new Event('cit_active_test_updated'));
    }
    localStorage.setItem('CIT_ASSESSMENT_TESTS', JSON.stringify(existingList));

    // Also update enrolled students lookup cache
    const existingEnrolledRaw = localStorage.getItem('CIT_ENROLLED_STUDENTS');
    let allEnrolled: EnrolledStudent[] = existingEnrolledRaw ? JSON.parse(existingEnrolledRaw) : [];
    if (test.enrolledStudents && Array.isArray(test.enrolledStudents)) {
      test.enrolledStudents.forEach(st => {
        const idx = allEnrolled.findIndex(e => e.userId.toLowerCase() === st.userId.toLowerCase());
        if (idx >= 0) {
          allEnrolled[idx] = st;
        } else {
          allEnrolled.push(st);
        }
      });
    }
    localStorage.setItem('CIT_ENROLLED_STUDENTS', JSON.stringify(allEnrolled));
  } catch (e) {
    console.warn('Error caching test locally:', e);
  }

  // Persist to Firestore
  try {
    const docRef = doc(db, 'tests', test.id);
    await setDoc(docRef, {
      ...test,
      updatedAt: new Date().toISOString()
    });
  } catch (err) {
    console.warn('Failed to save assessment test to Firestore (using local storage):', err);
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export function subscribeAssessmentTests(callback: (tests: AssessmentTestConfig[]) => void) {
  const path = 'tests';
  try {
    const q = query(collection(db, 'tests'));
    return onSnapshot(
      q,
      (snapshot) => {
        const tests: AssessmentTestConfig[] = [];
        snapshot.forEach((docSnap) => {
          tests.push(docSnap.data() as AssessmentTestConfig);
        });

        // If firestore has items, update local storage
        if (tests.length > 0) {
          tests.sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1));
          try {
            localStorage.setItem('CIT_ASSESSMENT_TESTS', JSON.stringify(tests));
            const liveActive = tests.find(t => t.status === 'active');
            if (liveActive) {
              const currentActiveRaw = localStorage.getItem('CIT_ACTIVE_TEST_CONFIG');
              const currentActive = currentActiveRaw ? JSON.parse(currentActiveRaw) : null;
              if (!currentActive || currentActive.id !== liveActive.id || currentActive.updatedAt !== liveActive.updatedAt) {
                localStorage.setItem('CIT_ACTIVE_TEST_CONFIG', JSON.stringify(liveActive));
                window.dispatchEvent(new Event('cit_active_test_updated'));
              }
            }
          } catch {}
          callback(tests);
        } else {
          // Fallback to local storage
          try {
            const cached = localStorage.getItem('CIT_ASSESSMENT_TESTS');
            if (cached) {
              callback(JSON.parse(cached));
              return;
            }
          } catch {}
          callback([]);
        }
      },
      (error) => {
        if (isQuotaExceededError(error)) {
          console.warn('Assessment tests snapshot: Quota limit reached, using local storage cache.');
        } else {
          console.warn('Assessment tests snapshot info:', error.message || error);
        }
        // Fallback to local storage
        try {
          const cached = localStorage.getItem('CIT_ASSESSMENT_TESTS');
          if (cached) callback(JSON.parse(cached));
          else callback([]);
        } catch {
          callback([]);
        }
      }
    );
  } catch (err) {
    console.warn('Failed to subscribe to assessment tests:', err);
    try {
      const cached = localStorage.getItem('CIT_ASSESSMENT_TESTS');
      if (cached) callback(JSON.parse(cached));
      else callback([]);
    } catch {
      callback([]);
    }
    return () => {};
  }
}

export async function deleteAssessmentTestFromFirestore(testId: string): Promise<void> {
  const path = `tests/${testId}`;
  try {
    // Local storage delete
    const cachedRaw = localStorage.getItem('CIT_ASSESSMENT_TESTS');
    if (cachedRaw) {
      const existingList: AssessmentTestConfig[] = JSON.parse(cachedRaw);
      const filtered = existingList.filter(t => t.id !== testId);
      localStorage.setItem('CIT_ASSESSMENT_TESTS', JSON.stringify(filtered));
    }

    const docRef = doc(db, 'tests', testId);
    await deleteDoc(docRef);
  } catch (err) {
    console.warn('Failed to delete test from Firestore:', err);
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export function lookupEnrolledStudent(identifier: string): EnrolledStudent | null {
  if (!identifier) return null;
  const cleanId = identifier.trim().toUpperCase();

  try {
    const raw = localStorage.getItem('CIT_ENROLLED_STUDENTS');
    if (raw) {
      const list: EnrolledStudent[] = JSON.parse(raw);
      const found = list.find(s => 
        s.userId.toUpperCase() === cleanId || 
        (s.originalRegNo && s.originalRegNo.toUpperCase() === cleanId)
      );
      if (found) return found;
    }

    // Also check active test config
    const activeTestRaw = localStorage.getItem('CIT_ACTIVE_TEST_CONFIG');
    if (activeTestRaw) {
      const activeTest: AssessmentTestConfig = JSON.parse(activeTestRaw);
      if (activeTest?.enrolledStudents) {
        const found = activeTest.enrolledStudents.find(s =>
          s.userId.toUpperCase() === cleanId ||
          (s.originalRegNo && s.originalRegNo.toUpperCase() === cleanId)
        );
        if (found) return found;
      }
    }

    // Also check tests
    const testsRaw = localStorage.getItem('CIT_ASSESSMENT_TESTS');
    if (testsRaw) {
      const tests: AssessmentTestConfig[] = JSON.parse(testsRaw);
      for (const t of tests) {
        if (t.enrolledStudents) {
          const found = t.enrolledStudents.find(s => 
            s.userId.toUpperCase() === cleanId || 
            (s.originalRegNo && s.originalRegNo.toUpperCase() === cleanId)
          );
          if (found) return found;
        }
      }
    }
  } catch {}

  return null;
}

// -------------------------------------------------------------
// High-Concurrency Active Session Management (800+ Students)
// -------------------------------------------------------------
export const ACTIVE_SESSIONS_COLLECTION = 'activeSessions';
// 5 minutes without heartbeat is considered stale (optimally tuned for 800 concurrent candidates)
export const SESSION_STALE_THRESHOLD_MS = 5 * 60 * 1000;

export interface SessionCheckResult {
  isCurrentlyActive: boolean;
  isActiveOnAnotherDevice?: boolean;
  isAlreadyCompleted?: boolean;
  completedAt?: number;
  session?: ActiveStudentSession;
  reason?: string;
}

/**
 * Checks if a candidate is already actively logged in from another device/window,
 * or if they have already completed their one-time assessment.
 * Optimized with a 3.5s timeout for fast responsiveness under 800 simultaneous candidate logins.
 */
export async function checkActiveStudentSession(
  registerNo: string,
  currentSessionId?: string
): Promise<SessionCheckResult> {
  const cleanRegNo = registerNo.trim().toUpperCase();
  if (!cleanRegNo) return { isCurrentlyActive: false, isActiveOnAnotherDevice: false };

  try {
    const docRef = doc(db, ACTIVE_SESSIONS_COLLECTION, cleanRegNo);
    
    // Fast timeout wrapper to prevent login hangs during peak 800-student traffic surges
    const timeoutPromise = new Promise<null>((resolve) => 
      setTimeout(() => resolve(null), 3500)
    );
    const fetchPromise = getDoc(docRef);

    const snap = await Promise.race([fetchPromise, timeoutPromise]);

    if (snap && 'exists' in snap && snap.exists()) {
      const data = snap.data() as ActiveStudentSession;
      const now = Date.now();

      // If candidate already completed and submitted the assessment
      if (data.status === 'completed') {
        return {
          isCurrentlyActive: false,
          isActiveOnAnotherDevice: false,
          isAlreadyCompleted: true,
          completedAt: data.lastHeartbeat,
          session: data,
          reason: `Candidate ${cleanRegNo} has already completed and submitted this assessment.`
        };
      }

      // If it's the exact same session or device on this client, permit continuation
      if (currentSessionId && (data.sessionId === currentSessionId || data.deviceId === currentSessionId)) {
        return { isCurrentlyActive: false, isActiveOnAnotherDevice: false, session: data };
      }

      // Check if session status is explicitly active and heartbeat is fresh
      const isFresh = (now - (data.lastHeartbeat || data.loginTimestamp || 0)) < SESSION_STALE_THRESHOLD_MS;
      if (data.status === 'active' && isFresh) {
        return {
          isCurrentlyActive: true,
          isActiveOnAnotherDevice: true,
          session: data,
          reason: `Register Number ${cleanRegNo} is actively logged into an ongoing assessment session on another workstation.`
        };
      }
    }
  } catch (err) {
    console.warn('Active session verification fallback to local cache:', err);
  }

  // Fallback to local session check
  try {
    const localActive = localStorage.getItem(`CIT_ACTIVE_SESSION_${cleanRegNo}`);
    if (localActive) {
      const parsed: ActiveStudentSession = JSON.parse(localActive);
      const now = Date.now();

      if (parsed.status === 'completed') {
        return {
          isCurrentlyActive: false,
          isActiveOnAnotherDevice: false,
          isAlreadyCompleted: true,
          completedAt: parsed.lastHeartbeat,
          session: parsed,
          reason: `Candidate ${cleanRegNo} has already completed and submitted this assessment on this browser.`
        };
      }

      if (
        parsed.status === 'active' &&
        (!currentSessionId || (parsed.sessionId !== currentSessionId && parsed.deviceId !== currentSessionId)) &&
        (now - (parsed.lastHeartbeat || 0)) < SESSION_STALE_THRESHOLD_MS
      ) {
        return {
          isCurrentlyActive: true,
          isActiveOnAnotherDevice: true,
          session: parsed,
          reason: `Register Number ${cleanRegNo} has an active concurrent session recorded on this browser.`
        };
      }
    }
  } catch {}

  return { isCurrentlyActive: false, isActiveOnAnotherDevice: false };
}

/**
 * Checks if candidate has already completed an assessment across Firestore & local storage.
 */
export async function checkStudentPriorSubmission(
  registerNo: string
): Promise<{ hasCompleted: boolean; submittedAt?: string; submissionId?: string }> {
  const cleanRegNo = registerNo.trim().toUpperCase();
  if (!cleanRegNo) return { hasCompleted: false };

  // 1. Check activeSessions record for 'completed' flag
  try {
    const docRef = doc(db, ACTIVE_SESSIONS_COLLECTION, cleanRegNo);
    const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 3000));
    const snap = await Promise.race([getDoc(docRef), timeoutPromise]);
    if (snap && 'exists' in snap && snap.exists()) {
      const data = snap.data() as ActiveStudentSession;
      if (data.status === 'completed') {
        return {
          hasCompleted: true,
          submittedAt: new Date(data.lastHeartbeat || Date.now()).toLocaleString()
        };
      }
    }
  } catch (err) {
    console.warn('Point check for prior submission in activeSessions:', err);
  }

  // 2. Check local storage cache
  try {
    const local = localStorage.getItem(`CIT_ACTIVE_SESSION_${cleanRegNo}`);
    if (local) {
      const parsed = JSON.parse(local);
      if (parsed.status === 'completed') {
        return {
          hasCompleted: true,
          submittedAt: new Date(parsed.lastHeartbeat || Date.now()).toLocaleString()
        };
      }
    }
  } catch {}

  return { hasCompleted: false };
}

/**
 * Registers an active assessment session in Firestore and local storage.
 * Scaled for 800+ concurrent candidate logins with exponential retry & jitter.
 */
export async function registerActiveStudentSession(
  session: ActiveStudentSession,
  maxRetries = 3
): Promise<void> {
  const cleanRegNo = session.registerNo.trim().toUpperCase();
  const sessionData: ActiveStudentSession = {
    ...session,
    registerNo: cleanRegNo,
    status: 'active',
    lastHeartbeat: Date.now()
  };

  // Immediate local cache write so the student experience is instant
  try {
    localStorage.setItem(`CIT_ACTIVE_SESSION_${cleanRegNo}`, JSON.stringify(sessionData));
    sessionStorage.setItem('CIT_CURRENT_SESSION_ID', session.sessionId);
  } catch {}

  // Asynchronous write to studentLogins for attendance auditing
  recordStudentLoginToFirestore({
    registerNo: cleanRegNo,
    studentName: session.studentName,
    department: session.department,
    loginTimestamp: session.loginTimestamp || Date.now(),
    loginTimeFormatted: new Date(session.loginTimestamp || Date.now()).toLocaleString('en-IN'),
    deviceId: session.deviceId,
    status: 'ACTIVE'
  }).catch(() => {});

  // Asynchronous non-blocking Firestore write with jittered backoff
  let attempt = 0;
  while (attempt < maxRetries) {
    try {
      const docRef = doc(db, ACTIVE_SESSIONS_COLLECTION, cleanRegNo);
      await setDoc(docRef, sessionData);
      return;
    } catch (err) {
      attempt++;
      if (attempt >= maxRetries) {
        console.warn(`Firestore active session registration reached retry limit for ${cleanRegNo} (cached locally):`, err);
        return;
      }
      const delay = Math.pow(2, attempt) * 120 + Math.random() * 150;
      await new Promise((r) => setTimeout(r, delay));
    }
  }
}

/**
 * Updates the session heartbeat to keep the session alive.
 * Non-blocking write designed for low bandwidth impact during concurrent testing.
 */
export async function updateSessionHeartbeat(
  registerNo: string,
  sessionId: string
): Promise<void> {
  const cleanRegNo = registerNo.trim().toUpperCase();
  const now = Date.now();

  try {
    const local = localStorage.getItem(`CIT_ACTIVE_SESSION_${cleanRegNo}`);
    if (local) {
      const parsed = JSON.parse(local);
      if (parsed.sessionId === sessionId) {
        parsed.lastHeartbeat = now;
        localStorage.setItem(`CIT_ACTIVE_SESSION_${cleanRegNo}`, JSON.stringify(parsed));
      }
    }
  } catch {}

  try {
    const docRef = doc(db, ACTIVE_SESSIONS_COLLECTION, cleanRegNo);
    await updateDoc(docRef, {
      lastHeartbeat: now,
      status: 'active'
    });
  } catch {
    // Non-fatal if a single heartbeat packet drops under campus WiFi congestion
  }
}

/**
 * Marks session as completed or terminated.
 * Preserves completed state so duplicate logins from other workstations are securely blocked.
 */
export async function releaseActiveStudentSession(
  registerNo: string,
  sessionId?: string,
  finalStatus: 'completed' | 'terminated' | 'released' = 'completed'
): Promise<void> {
  const cleanRegNo = registerNo.trim().toUpperCase();

  try {
    if (finalStatus === 'released') {
      localStorage.removeItem(`CIT_ACTIVE_SESSION_${cleanRegNo}`);
    } else {
      const local = localStorage.getItem(`CIT_ACTIVE_SESSION_${cleanRegNo}`);
      if (local) {
        const parsed = JSON.parse(local);
        parsed.status = finalStatus;
        parsed.lastHeartbeat = Date.now();
        localStorage.setItem(`CIT_ACTIVE_SESSION_${cleanRegNo}`, JSON.stringify(parsed));
      }
    }
    sessionStorage.removeItem('CIT_CURRENT_SESSION_ID');
  } catch {}

  try {
    const docRef = doc(db, ACTIVE_SESSIONS_COLLECTION, cleanRegNo);
    if (finalStatus === 'released') {
      await deleteDoc(docRef);
    } else {
      await setDoc(
        docRef,
        {
          registerNo: cleanRegNo,
          status: finalStatus,
          lastHeartbeat: Date.now(),
          finishedAt: Date.now()
        },
        { merge: true }
      );
    }
  } catch (err) {
    console.warn('Failed to update active session state in Firestore:', err);
  }
}

/**
 * Real-time subscription to active candidate sessions for Examination Admin Portal.
 * Filters out stale sessions (> 5 minutes without heartbeat).
 */
export function subscribeActiveSessions(
  callback: (sessions: ActiveStudentSession[]) => void
) {
  const path = ACTIVE_SESSIONS_COLLECTION;
  try {
    const q = query(collection(db, ACTIVE_SESSIONS_COLLECTION));
    return onSnapshot(
      q,
      (snapshot) => {
        const now = Date.now();
        const activeList: ActiveStudentSession[] = [];
        snapshot.forEach((docSnap) => {
          const s = docSnap.data() as ActiveStudentSession;
          // Consider active if status is 'active' and heartbeat is within threshold
          if (s.status === 'active') {
            const isFresh = (now - (s.lastHeartbeat || s.loginTimestamp || 0)) < SESSION_STALE_THRESHOLD_MS;
            if (isFresh) {
              activeList.push(s);
            }
          }
        });
        activeList.sort((a, b) => (b.lastHeartbeat || 0) - (a.lastHeartbeat || 0));
        callback(activeList);
      },
      (error) => {
        if (isQuotaExceededError(error)) {
          console.warn('Active sessions snapshot: Quota limit, using local storage.');
        } else {
          console.warn('Active sessions snapshot info:', error.message || error);
        }
        handleFirestoreError(error, OperationType.GET, path);
      }
    );
  } catch (err) {
    console.warn('Failed to subscribe to active sessions:', err);
    return () => {};
  }
}

/**
 * Resumes or resets a candidate's session so they can re-login if their lab machine restarted.
 */
export async function resumeStudentSessionInFirestore(registerNo: string): Promise<void> {
  const cleanRegNo = registerNo.trim().toUpperCase();
  try {
    localStorage.removeItem(`CIT_ACTIVE_SESSION_${cleanRegNo}`);
  } catch {}

  try {
    const docRef = doc(db, ACTIVE_SESSIONS_COLLECTION, cleanRegNo);
    await deleteDoc(docRef);
  } catch (err) {
    console.warn('Failed to reset candidate session in Firestore:', err);
  }
}

/**
 * Clears abandoned or stale sessions older than 5 minutes from Firestore.
 */
export async function clearStaleActiveSessions(): Promise<number> {
  const now = Date.now();
  let clearedCount = 0;
  try {
    const q = query(collection(db, ACTIVE_SESSIONS_COLLECTION));
    const snap = await getDocs(q);
    const batch = writeBatch(db);
    let batchOperations = 0;

    snap.forEach((docSnap) => {
      const data = docSnap.data() as ActiveStudentSession;
      const isStale = (now - (data.lastHeartbeat || data.loginTimestamp || 0)) >= SESSION_STALE_THRESHOLD_MS;
      if (data.status !== 'completed' && isStale) {
        batch.delete(docSnap.ref);
        clearedCount++;
        batchOperations++;
      }
    });

    if (batchOperations > 0) {
      await batch.commit();
    }
  } catch (err) {
    console.warn('Failed to clear stale sessions:', err);
  }
  return clearedCount;
}

/**
 * Persists an assessment savepoint to Firestore for crash recovery across devices and unknown terminations.
 */
export async function saveAssessmentSavepointToFirestore(
  registerNo: string,
  savepointData: {
    studentName: string;
    department: string;
    currentSection: string;
    currentQuestionIndex: number;
    timeRemainingSeconds: number;
    attemptCount: number;
    maxAttempts: number;
    answeredCount: number;
    responses: Record<string, any>;
    savedAt: number;
  }
): Promise<void> {
  const cleanRegNo = registerNo.trim().toUpperCase();
  if (!cleanRegNo) return;

  try {
    const docRef = doc(db, ACTIVE_SESSIONS_COLLECTION, cleanRegNo);
    await setDoc(
      docRef,
      {
        registerNo: cleanRegNo,
        studentName: savepointData.studentName,
        department: savepointData.department,
        lastHeartbeat: Date.now(),
        status: 'active',
        attemptCount: savepointData.attemptCount || 1,
        timeRemainingSeconds: savepointData.timeRemainingSeconds,
        answeredCount: savepointData.answeredCount,
        savepoint: savepointData
      },
      { merge: true }
    );
  } catch (err) {
    console.warn('Non-blocking savepoint sync to Firestore skipped:', err);
  }
}

/**
 * Loads an assessment savepoint from Firestore if available.
 */
export async function loadAssessmentSavepointFromFirestore(
  registerNo: string
): Promise<any | null> {
  const cleanRegNo = registerNo.trim().toUpperCase();
  if (!cleanRegNo) return null;

  try {
    const docRef = doc(db, ACTIVE_SESSIONS_COLLECTION, cleanRegNo);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data();
      if (data && data.savepoint && data.status !== 'completed') {
        return data.savepoint;
      }
    }
  } catch (err) {
    console.warn('Failed to load assessment savepoint from Firestore:', err);
  }
  return null;
}

export const STUDENT_LOGINS_COLLECTION = 'studentLogins';

export interface StudentLoginRecord {
  id?: string;
  registerNo: string;
  studentName: string;
  department: string;
  loginTimestamp: number;
  loginTimeFormatted: string;
  deviceId?: string;
  sessionId?: string;
  status?: 'LOGGED_IN' | 'ACTIVE' | 'COMPLETED' | 'INTERRUPTED';
  createdAt?: any;
}

/**
 * Persists a student login timestamp record to Firestore and local storage.
 */
export async function recordStudentLoginToFirestore(record: StudentLoginRecord): Promise<void> {
  const cleanRegNo = record.registerNo.trim().toUpperCase();
  if (!cleanRegNo) return;

  const loginEntry: StudentLoginRecord = {
    ...record,
    registerNo: cleanRegNo,
    loginTimestamp: record.loginTimestamp || Date.now()
  };

  // Cache in localStorage
  try {
    const existing = localStorage.getItem('CIT_STUDENT_LOGINS');
    const list: StudentLoginRecord[] = existing ? JSON.parse(existing) : [];
    const idx = list.findIndex(l => l.registerNo.trim().toUpperCase() === cleanRegNo);
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...loginEntry };
    } else {
      list.push(loginEntry);
    }
    localStorage.setItem('CIT_STUDENT_LOGINS', JSON.stringify(list));
  } catch {}

  // Write to Firestore non-blocking
  try {
    const docRef = doc(db, STUDENT_LOGINS_COLLECTION, cleanRegNo);
    await setDoc(docRef, {
      ...loginEntry,
      createdAt: serverTimestamp()
    }, { merge: true });
  } catch (err) {
    console.warn('Non-blocking student login record to Firestore skipped:', err);
  }
}

/**
 * Fetches all student login records from Firestore.
 */
export async function fetchStudentLoginsFromFirestore(): Promise<StudentLoginRecord[]> {
  try {
    const q = query(collection(db, STUDENT_LOGINS_COLLECTION));
    const snap = await getDocs(q);
    const records: StudentLoginRecord[] = [];
    snap.forEach((docSnap) => {
      const data = docSnap.data() as StudentLoginRecord;
      if (data && data.registerNo) {
        records.push({
          ...data,
          id: docSnap.id
        });
      }
    });
    return records;
  } catch (err) {
    console.warn('Failed to fetch student logins from Firestore:', err);
    try {
      const existing = localStorage.getItem('CIT_STUDENT_LOGINS');
      return existing ? JSON.parse(existing) : [];
    } catch {
      return [];
    }
  }
}
