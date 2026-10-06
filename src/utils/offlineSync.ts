import { SavedSubmission, ActiveAssessmentSession } from '../types';
import { saveSubmissionToFirestore } from '../lib/firebase';

export const SAVED_SESSION_KEY = 'CIT_ACTIVE_ASSESSMENT_SESSION';
export const PENDING_SUBMISSIONS_KEY = 'CIT_PENDING_OFFLINE_SUBMISSIONS';

/**
 * Check whether the device currently has network connectivity.
 */
export function isOnline(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean'
    ? navigator.onLine
    : true;
}

/**
 * Continuously save active assessment session to localStorage.
 * Saves to both generic active key and candidate-specific key for durability across tab switches and reloads.
 */
export function saveActiveAssessmentSession(session: ActiveAssessmentSession): void {
  try {
    const payload = {
      ...session,
      attemptCount: session.attemptCount || 1,
      maxAttempts: session.maxAttempts || 3,
      savedAt: Date.now()
    };
    const jsonStr = JSON.stringify(payload);
    localStorage.setItem(SAVED_SESSION_KEY, jsonStr);

    if (session.student?.registerNo) {
      const cleanReg = session.student.registerNo.trim().toUpperCase();
      localStorage.setItem(`${SAVED_SESSION_KEY}_${cleanReg}`, jsonStr);
    }
  } catch (error) {
    console.error('Failed to save active assessment session to localStorage:', error);
  }
}

/**
 * Retrieve active assessment session from localStorage, optionally filtered by candidate Register Number.
 */
export function loadActiveAssessmentSession(registerNo?: string): ActiveAssessmentSession | null {
  try {
    if (registerNo) {
      const cleanReg = registerNo.trim().toUpperCase();
      const specific = localStorage.getItem(`${SAVED_SESSION_KEY}_${cleanReg}`);
      if (specific) {
        return JSON.parse(specific) as ActiveAssessmentSession;
      }
    }

    const raw = localStorage.getItem(SAVED_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ActiveAssessmentSession;

    if (registerNo && parsed.student?.registerNo) {
      if (parsed.student.registerNo.trim().toUpperCase() !== registerNo.trim().toUpperCase()) {
        return null;
      }
    }

    return parsed;
  } catch (error) {
    console.error('Failed to load active assessment session from localStorage:', error);
    return null;
  }
}

/**
 * Clear saved assessment session from localStorage once assessment is officially completed or reset.
 */
export function clearActiveAssessmentSession(registerNo?: string): void {
  try {
    localStorage.removeItem(SAVED_SESSION_KEY);
    if (registerNo) {
      const cleanReg = registerNo.trim().toUpperCase();
      localStorage.removeItem(`${SAVED_SESSION_KEY}_${cleanReg}`);
    }
  } catch (error) {
    console.error('Failed to clear active assessment session:', error);
  }
}

/**
 * Checks whether a student has an active, resumable savepoint with attempts remaining (< 3).
 */
export function hasResumableSavepoint(registerNo: string): boolean {
  if (!registerNo) return false;
  const session = loadActiveAssessmentSession(registerNo);
  if (!session || !session.currentTestQuestions || session.currentTestQuestions.length === 0) {
    return false;
  }
  const attempt = session.attemptCount || 1;
  return attempt <= 3 && session.timeRemainingSeconds > 0 && session.status !== 'completed';
}

/**
 * Get queued submissions awaiting sync to Firestore.
 */
export function getPendingOfflineSubmissions(): SavedSubmission[] {
  try {
    const raw = localStorage.getItem(PENDING_SUBMISSIONS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error('Failed to read pending offline submissions:', error);
    return [];
  }
}

/**
 * Add a submission to the offline pending queue.
 */
export function queueOfflineSubmission(submission: SavedSubmission): void {
  try {
    const existing = getPendingOfflineSubmissions();
    // Avoid duplicates
    const filtered = existing.filter((s) => s.id !== submission.id);
    const updated = [submission, ...filtered];
    localStorage.setItem(PENDING_SUBMISSIONS_KEY, JSON.stringify(updated));
    console.log(`Submission ${submission.id} queued for offline sync.`);
  } catch (error) {
    console.error('Failed to queue offline submission:', error);
  }
}

/**
 * Remove a specific submission from the offline queue.
 */
export function removePendingOfflineSubmission(submissionId: string): void {
  try {
    const existing = getPendingOfflineSubmissions();
    const updated = existing.filter((s) => s.id !== submissionId);
    localStorage.setItem(PENDING_SUBMISSIONS_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error('Failed to remove pending submission from queue:', error);
  }
}

/**
 * Clear all pending offline submissions from localStorage.
 */
export function clearPendingOfflineSubmissions(): void {
  try {
    localStorage.removeItem(PENDING_SUBMISSIONS_KEY);
  } catch (error) {
    console.error('Failed to clear pending offline submissions:', error);
  }
}

/**
 * Attempt to sync all pending offline submissions to Firestore.
 * Returns the count of successfully synced submissions.
 */
export async function syncPendingSubmissions(): Promise<{ syncedCount: number; totalCount: number }> {
  if (!isOnline()) {
    return { syncedCount: 0, totalCount: getPendingOfflineSubmissions().length };
  }

  const pending = getPendingOfflineSubmissions();
  if (pending.length === 0) {
    return { syncedCount: 0, totalCount: 0 };
  }

  let syncedCount = 0;
  console.log(`Attempting to auto-sync ${pending.length} pending offline submissions to Firestore...`);

  for (const submission of pending) {
    try {
      await saveSubmissionToFirestore(submission);
      removePendingOfflineSubmission(submission.id);
      syncedCount++;
      console.log(`Successfully synced offline submission ${submission.id} to Firestore.`);
    } catch (error) {
      console.error(`Failed to sync submission ${submission.id}:`, error);
    }
  }

  return { syncedCount, totalCount: pending.length };
}

/**
 * Recovers all student submissions stored anywhere in the browser's localStorage.
 * Searches all backup keys and active session savepoints.
 */
export function recoverAllLocalSubmissions(): { recovered: SavedSubmission[]; count: number } {
  const recoveredMap = new Map<string, SavedSubmission>();

  // 1. Scan primary and legacy submission keys
  const keys = [
    'CIT_COGNITIVE_SUBMISSIONS',
    'CIT_PENDING_OFFLINE_SUBMISSIONS',
    'CIT_OFFLINE_SUBMISSIONS',
    'CIT_ASSESSMENT_SUBMISSIONS',
    'CIT_MATH_ASSESSMENT_SUBMISSIONS'
  ];

  keys.forEach((key) => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          parsed.forEach((sub: any) => {
            if (sub && (sub.id || sub.student?.registerNo)) {
              const subId = sub.id || `SUB-RECOVERED-${sub.student?.registerNo}-${Date.now()}`;
              if (!recoveredMap.has(subId)) {
                recoveredMap.set(subId, { ...sub, id: subId });
              }
            }
          });
        }
      }
    } catch (e) {
      console.warn(`Local recovery scan error for key ${key}:`, e);
    }
  });

  // 2. Scan all localStorage keys for active session savepoints with answered questions
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && (k.startsWith('CIT_ACTIVE_SESSION') || k.startsWith('CIT_ACTIVE_ASSESSMENT_SESSION'))) {
        try {
          const val = localStorage.getItem(k);
          if (val) {
            const sess = JSON.parse(val);
            if (sess && sess.student?.registerNo && sess.responses && Object.keys(sess.responses).length > 0) {
              const regNo = sess.student.registerNo.trim().toUpperCase();
              const subId = `SUB-RECOVERED-${regNo}`;
              if (!recoveredMap.has(subId)) {
                const totalQ = sess.currentTestQuestions?.length || 50;
                const correctCount = Object.values(sess.responses).filter((r: any) => r?.isCorrect).length;
                const pct = Math.round((correctCount / totalQ) * 100);
                const synthesizedReport = sess.report || {
                  student: sess.student,
                  overallScore: correctCount,
                  totalQuestions: totalQ,
                  percentage: pct,
                  grade: pct >= 80 ? 'Distinction' : pct >= 50 ? 'Proficient' : 'Developing',
                  overallSummary: 'Recovered from local candidate test session savepoint.'
                };
                recoveredMap.set(subId, {
                  id: subId,
                  student: sess.student,
                  submittedAt: new Date(sess.savedAt || Date.now()).toLocaleString(),
                  report: synthesizedReport
                } as SavedSubmission);
              }
            }
          }
        } catch {}
      }
    }
  } catch {}

  const recoveredList = Array.from(recoveredMap.values());
  // Sort descending by date
  recoveredList.sort((a, b) => {
    const timeA = a.submittedAt || a.id;
    const timeB = b.submittedAt || b.id;
    return String(timeB).localeCompare(String(timeA));
  });

  // Persist consolidated list back to CIT_COGNITIVE_SUBMISSIONS
  try {
    localStorage.setItem('CIT_COGNITIVE_SUBMISSIONS', JSON.stringify(recoveredList));
  } catch (err) {
    console.warn('Failed to save consolidated recovered submissions:', err);
  }

  return { recovered: recoveredList, count: recoveredList.length };
}

/**
 * Exports submissions array as a downloadable JSON backup file.
 */
export function exportSubmissionsToJson(submissions: SavedSubmission[]): void {
  try {
    const dataStr = JSON.stringify(submissions, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const dateStr = new Date().toISOString().split('T')[0];
    const a = document.createElement('a');
    a.href = url;
    a.download = `CIT_Assessment_Submissions_Backup_${dateStr}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error('Failed to export submissions to JSON:', err);
  }
}

/**
 * Parses and merges an imported JSON string into the existing submissions.
 */
export function importSubmissionsFromJson(jsonString: string): { importedCount: number; submissions: SavedSubmission[] } {
  try {
    const parsed = JSON.parse(jsonString);
    if (!Array.isArray(parsed)) {
      throw new Error('Import file must contain an array of submission records.');
    }

    const current = recoverAllLocalSubmissions().recovered;
    const mergedMap = new Map<string, SavedSubmission>();

    // Put current
    current.forEach((s) => {
      if (s && s.id) mergedMap.set(s.id, s);
    });

    let count = 0;
    parsed.forEach((s: any) => {
      if (s && s.student?.registerNo) {
        const id = s.id || `SUB-IMPORTED-${s.student.registerNo}-${Date.now()}`;
        if (!mergedMap.has(id)) {
          mergedMap.set(id, { ...s, id });
          count++;
        }
      }
    });

    const mergedList = Array.from(mergedMap.values());
    localStorage.setItem('CIT_COGNITIVE_SUBMISSIONS', JSON.stringify(mergedList));
    return { importedCount: count, submissions: mergedList };
  } catch (err) {
    console.error('Failed to import submissions from JSON:', err);
    throw err;
  }
}
