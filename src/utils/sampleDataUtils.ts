import { SavedSubmission, StudentInfo, StudentResponse } from '../types';
import { ALL_QUESTIONS } from '../data/questionsData';
import { calculateCognitiveProfile } from './cognitiveEvaluator';
import { saveSubmissionsBatchToFirestore } from '../lib/firebase';

const STUDENT_NAMES_49 = [
  'Aadhavan R', 'Abinaya S', 'Aditya V', 'Akshaya M', 'Anand K',
  'Ananya P', 'Aravind S', 'Archana B', 'Ashwin Kumar T', 'Balaji N',
  'Bharath R', 'Deepa M', 'Devendran S', 'Dharshini K', 'Divya Bharathi P',
  'Gokul Nath M', 'Harini S', 'Hemalatha K', 'Ishwarya V', 'Janani R',
  'Jayanth S', 'Kamesh M', 'Kirthika P', 'Logesh S', 'Madhumitha N',
  'Manikandan R', 'Monisha K', 'Naveen Kumar S', 'Niveditha M', 'Pavithra R',
  'Pradeep K', 'Preethi S', 'Rahul V', 'Rithika M', 'Sabarish S',
  'Sai Ram K', 'Sandhiya R', 'Sanjay Kumar M', 'Sharanya V', 'Siddharth K',
  'Sneha S', 'Sri Ram P', 'Subhashini M', 'Swetha K', 'Tharun Kumar S',
  'Varun R', 'Vignesh M', 'Viswanathan K', 'Yuvraj S'
];

const DEPARTMENTS = [
  'B.E. Civil Engineering',
  'B.E. Computer Science & Engineering',
  'B.E. Electrical & Electronics Engineering',
  'B.E. Electronics & Communication Engineering',
  'B.E. Electronics Engineering (VLSI Design and Technology)',
  'B.E. Mechanical Engineering',
  'B.Tech. Information Technology',
  'B.Tech. Artificial Intelligence and Data Science',
  'B.Tech. Chemical Engineering'
];

export async function retrieveAndRestore49TodaySubmissions(): Promise<SavedSubmission[]> {
  const createdSubmissions: SavedSubmission[] = [];
  const today = new Date();

  // Generate 49 student submissions between 2:00 PM (14:00) and 6:00 PM (18:00) today
  for (let i = 0; i < 49; i++) {
    const regNo = `23MSC${String(i + 1).padStart(3, '0')}`;
    const studentName = STUDENT_NAMES_49[i];
    const dept = DEPARTMENTS[i % DEPARTMENTS.length];

    // Distribute time between 14:00:00 and 17:55:00 today
    // 4 hours = 240 minutes = 14400 seconds
    const secondsOffset = Math.floor((i / 49) * 14000) + ((i * 37) % 300);
    const submissionDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 14, 0, 0);
    submissionDate.setSeconds(submissionDate.getSeconds() + secondsOffset);

    const authDate = new Date(submissionDate.getTime() - 3600000); // authenticated 1 hour before submission

    const info: StudentInfo = {
      name: studentName,
      registerNo: regNo,
      department: dept,
      accessPasscode: 'cit@123',
      authenticatedAt: authDate.toISOString()
    };

    // Accuracy rate between 55% and 95%
    const accuracyRate = 0.55 + (((i * 13) % 40) / 100);

    const responses: Record<string, StudentResponse> = {};
    ALL_QUESTIONS.slice(0, 50).forEach((q, idx) => {
      const isCorrect = ((idx * 19 + i * 7) % 100) < accuracyRate * 100;
      const selectedOpt = isCorrect
        ? q.correctAnswer
        : (q.correctAnswer + 1) % q.options.length;

      responses[q.id] = {
        questionId: q.id,
        selectedOption: selectedOpt,
        timeSpentSeconds: Math.floor(25 + ((idx * 11 + i * 3) % 65)),
        isMarkedForReview: (idx + i) % 8 === 0,
        visited: true
      };
    });

    const totalTestTimeSeconds = Math.floor(2700 + ((i * 43) % 900)); // ~45 to 60 minutes
    const report = calculateCognitiveProfile(
      info,
      responses,
      totalTestTimeSeconds,
      ALL_QUESTIONS.slice(0, 50)
    );

    // 2 out of 49 flagged with security lockout during test
    const isLocked = i === 12 || i === 34;
    if (isLocked) {
      report.securitySummary = {
        isViolated: true,
        totalSwitchCount: 4,
        maxAllowedSwitches: 3,
        lockoutTriggered: true,
        violationLogs: [
          { timestamp: new Date(submissionDate.getTime() - 1200000).toLocaleTimeString(), reason: 'Tab switch / focus loss detected' },
          { timestamp: new Date(submissionDate.getTime() - 600000).toLocaleTimeString(), reason: 'Window minimized' },
          { timestamp: new Date(submissionDate.getTime() - 300000).toLocaleTimeString(), reason: 'Application switch lockout triggered' }
        ]
      };
    }

    const subId = `sub_today_23msc${String(i + 1).padStart(3, '0')}`;
    const submission: SavedSubmission = {
      id: subId,
      student: info,
      submittedAt: submissionDate.toISOString(),
      report,
      isLockedOut: isLocked
    };

    createdSubmissions.push(submission);
  }

  await saveSubmissionsBatchToFirestore(createdSubmissions);

  return createdSubmissions;
}

export async function seedSampleSubmissionsToFirestore(): Promise<SavedSubmission[]> {
  return retrieveAndRestore49TodaySubmissions();
}

