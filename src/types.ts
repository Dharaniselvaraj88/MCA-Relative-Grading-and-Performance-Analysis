export type Difficulty = 'easy' | 'medium' | 'hard';

export type SectionId = 
  | 'calculus'
  | 'probability'
  | 'numberSystem'
  | 'trigonometry'
  | 'statistics';

export interface SectionMeta {
  id: SectionId;
  title: string;
  subtitle: string;
  shortCode: string;
  questionCount: number;
  iconName: string;
}

export interface Question {
  id: string; // e.g. 'num-1', 'num-2'...
  sectionId: SectionId;
  difficulty: Difficulty;
  questionNumber: number; // 1..10
  questionText: string;
  question?: string;
  contextText?: string;
  codeSnippet?: string;
  visualData?: {
    type: 'sequence' | 'grid' | 'diagram' | 'chart' | 'matrix';
    content: any;
  };
  options: string[];
  correctAnswer: number; // 0..3 index
  explanation: string;
}

export interface StudentInfo {
  name: string;
  registerNo: string;
  department: string;
  accessPasscode: string;
  authenticatedAt: string;
  deviceId?: string;
  sessionId?: string;
}

export interface StudentResponse {
  questionId: string;
  selectedOption: number | null; // 0..3 or null
  timeSpentSeconds: number;
  isMarkedForReview: boolean;
  visited: boolean;
}

export interface DifficultyBreakdown {
  easy: { score: number; total: number; accuracy: number };
  medium: { score: number; total: number; accuracy: number };
  hard: { score: number; total: number; accuracy: number };
}

export interface SectionScore {
  sectionId: SectionId;
  title: string;
  score: number;
  total: number;
  percentage: number;
  easyScore: number;
  easyTotal: number;
  mediumScore: number;
  mediumTotal: number;
  hardScore: number;
  hardTotal: number;
  avgTimePerQuestion: number;
}

export interface BehavioralTraits {
  patienceScore: number; // 0 - 100
  focusIndex: number; // 0 - 100
  decisionSpeed: 'Methodical' | 'Balanced' | 'Rapid' | 'Impulsive';
  reflectivePauseRatio: number; // percentage
  reviewUtilization: number; // 0 - 100
  traitSummary: string;
}

export interface PersonalityProfile {
  archetype: string;
  tagline: string;
  primaryTrait: string;
  secondaryTrait: string;
  description: string;
  keyStrengths: string[];
  growthAreas: string[];
}

export interface ComputationalCapabilities {
  algorithmicEfficiency: number; // 0 - 100
  patternRecognition: number; // 0 - 100
  spatialReasoning: number; // 0 - 100
  quantitativeFluency: number; // 0 - 100
  workingMemoryRetention: number; // 0 - 100
}

export interface CareerPath {
  id: string;
  title: string;
  domain: string;
  suitabilityScore: number; // percentage
  matchRationale: string;
  targetRoles: string[];
  suggestedPGElectives: string[];
  recommendedTechnologies: string[];
}

export interface AppExperienceFeedback {
  id?: string;
  studentRegNo: string;
  studentName: string;
  department: string;
  submittedAt: string;
  assessmentRating: number; // 1 to 5
  userFriendlinessRating: number; // 1 to 5
  questionClarityRating: number; // 1 to 5
  navEaseRating: number; // 1 to 5
  comments: string;
}

export interface StudentFeedback {
  strengths: string[];
  weaknesses: string[];
  opportunities?: string[];
  threats?: string[];
  suggestions: string[];
}

export interface CognitiveProfileReport {
  student: StudentInfo;
  testTimestamp: string;
  totalDurationSeconds: number;
  overallScore: number;
  maxScore: number;
  overallPercentage: number;
  difficultyBreakdown: DifficultyBreakdown;
  sectionScores: Record<SectionId, SectionScore>;
  cognitionLevel: {
    tier?: string;
    grade?: 'A' | 'B' | 'C';
    analyticalIndex: number;
    logicPurity: number;
    speedAccuracyFactor: number;
    summary: string;
  };
  behavioralTraits: BehavioralTraits;
  personalityProfile: PersonalityProfile;
  computationalCapabilities: ComputationalCapabilities;
  recommendedCareerPaths: CareerPath[];
  studentFeedback: StudentFeedback;
  aiEnrichment?: string;
  securitySummary?: {
    isViolated: boolean;
    totalSwitchCount: number;
    maxAllowedSwitches: number;
    lockoutTriggered: boolean;
    violationLogs: Array<{ timestamp: string; reason: string }>;
  };
  detailedItemAnalysis: Array<{
    questionId: string;
    sectionId: SectionId;
    questionNumber: number;
    questionText: string;
    difficulty: Difficulty;
    userAnswer: number | null;
    correctAnswer: number;
    isCorrect: boolean;
    timeSpent: number;
  }>;
}

export interface SavedSubmission {
  id: string;
  student: StudentInfo;
  submittedAt: string;
  createdAt?: string;
  report: CognitiveProfileReport;
  isLockedOut?: boolean;
  securityViolation?: {
    isViolated: boolean;
    reason: string;
    timestamp: string;
  };
  feedback?: AppExperienceFeedback;
}

export interface SecurityLog {
  id: string;
  timestamp: string;
  eventType: 
    | 'CONTEXT_MENU_BLOCKED'
    | 'COPY_CUT_BLOCKED'
    | 'SCREENSHOT_SHORTCUT_BLOCKED'
    | 'PRINT_ATTEMPT_BLOCKED'
    | 'DEVTOOLS_SHORTCUT_BLOCKED'
    | 'UNAUTHORIZED_WINDOW_SWITCH'
    | 'INVALID_ADMIN_PIN_ATTEMPT'
    | 'INVALID_ADMIN_LOGIN_ATTEMPT'
    | 'INVALID_ADMIN_ID_ATTEMPT'
    | 'INVALID_FACULTY_PIN_ATTEMPT'
    | 'INVALID_STUDENT_PIN_ATTEMPT'
    | 'STUDENT_ACCOUNT_LOCKED'
    | 'UNAUTHORIZED_COLLABORATION_PREVENTED'
    | 'DEVTOOLS_OPENED_DETECTION'
    | 'ADMIN_PASSWORD_RESET_OTP_SENT'
    | 'ADMIN_SMS_OTP_SENT'
    | 'ADMIN_RECOVERY_PIN_VERIFIED'
    | 'ADMIN_SECRET_RECOVERY_PIN_UPDATED'
    | 'ADMIN_PASSWORD_RESET_COMPLETED'
    | 'STUDENT_PIN_SCHEDULE_UPDATED'
    | 'STUDENT_PIN_SCHEDULE_INACTIVE_ATTEMPT'
    | 'EXTRA_TIMER_CONFIG_UPDATED'
    | 'CONCURRENT_LOGIN_BLOCKED'
    | 'QUESTION_BANK_ACCEPTED_AND_CONDUCTED';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  details: string;
  userRegNo?: string;
  userName?: string;
  userRole?: 'student' | 'faculty' | 'admin' | 'guest';
  ipOrDevice?: string;
  resolved?: boolean;
}

export interface StudentPinSchedule {
  isEnabled: boolean;
  type: 'datetime' | 'daily';
  startTime: string;
  endTime: string;
}

export interface FacultyCredential {
  id: string;
  facultyId: string;
  facultyName: string;
  department: string;
  password: string;
  createdAt?: string;
}

export interface ActiveAssessmentSession {
  student: StudentInfo;
  currentTestQuestions: Question[];
  responses: Record<string, StudentResponse>;
  timeRemainingSeconds: number;
  currentSection: SectionId;
  currentQuestionIndex: number;
  savedAt: number;
  attemptCount?: number; // 1, 2, or 3 (Current attempt number out of max 3 allowed)
  maxAttempts?: number;  // Maximum permitted attempts (defaults to 3)
  tabSwitchCount?: number; // Count of tab switch violations detected
  interruptions?: {
    type: 'TAB_SWITCH' | 'UNKNOWN_TERMINATION' | 'WINDOW_SWITCH' | 'SCREENSHOT';
    timestamp: string;
    attemptNumber: number;
    details?: string;
  }[];
  lastTerminationReason?: string;
  status?: 'active' | 'interrupted' | 'completed' | 'terminated';
}

export interface TestDomainConfig {
  id: string;
  name: string;
  questionCount: number;
  level1Count?: number;
  level2Count?: number;
  level3Count?: number;
}

export interface QuestionLevelDistribution {
  level1Percentage: number; // e.g. 40%
  level2Percentage: number; // e.g. 40%
  level3Percentage: number; // e.g. 20%
  level1Count?: number;     // Direct question count for Level 1
  level2Count?: number;     // Direct question count for Level 2
  level3Count?: number;     // Direct question count for Level 3
  mode?: 'percentage' | 'count' | 'domain_wise'; // Mode of distribution chosen by admin
}

export interface EnrolledStudent {
  sNo: number;
  userId: string; // Assigned User ID based on programme e.g. 26CS001
  name: string;
  programme: string; // e.g. B.E. Computer Science & Engineering
  originalRegNo?: string;
  email?: string;
  section?: string;
  assignedPassword?: string;
  status?: 'pending' | 'completed';
}

export interface ConfiguredDepartment {
  name: string;
  code: string;
  isStandard?: boolean;
}

export interface AssessmentTestConfig {
  id: string;
  testCode: string;
  title: string;
  description?: string;
  durationMinutes: number;
  totalQuestions: number;
  domains: TestDomainConfig[];
  levelDistribution: QuestionLevelDistribution;
  programmes: string[];
  enrolledStudents: EnrolledStudent[];
  status: 'draft' | 'active' | 'archived';
  createdAt: string;
  updatedAt?: string;
  createdBy?: string;
}

export interface ActiveStudentSession {
  registerNo: string;
  studentName: string;
  department: string;
  sessionId: string;
  loginTimestamp: number;
  lastHeartbeat: number;
  startedAt?: number;
  finishedAt?: number;
  deviceId?: string;
  deviceInfo?: string;
  status: 'active' | 'completed' | 'terminated' | 'released';
}

