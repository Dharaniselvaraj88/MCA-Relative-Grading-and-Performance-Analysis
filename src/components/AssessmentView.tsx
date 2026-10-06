import React, { useState, useEffect, useMemo } from 'react';
import {
  Question,
  SectionId,
  StudentResponse,
  SectionMeta,
  StudentInfo
} from '../types';
import { SECTION_METADATA } from '../data/questionsData';
import { StudentGuidelinesModal } from './StudentGuidelinesModal';
import { ConfirmSubmissionModal, SectionCompletionSummary } from './ConfirmSubmissionModal';
import {
  Sigma,
  Dices,
  Binary,
  Triangle,
  BarChart3,
  Bookmark,
  ChevronRight,
  RotateCcw,
  ShieldAlert,
  Clock,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  LogOut,
  WifiOff,
  HelpCircle,
  Type,
  X
} from 'lucide-react';

interface AssessmentViewProps {
  questions: Question[];
  currentSection: SectionId;
  currentQuestionIndex: number; // 0..19 index within section
  responses: Record<string, StudentResponse>;
  onSelectOption: (questionId: string, optionIndex: number) => void;
  onClearOption: (questionId: string) => void;
  onToggleMarkForReview: (questionId: string) => void;
  onChangeSection: (sectionId: SectionId) => void;
  onChangeQuestionIndex: (index: number) => void;
  onSubmitAssessment: () => void;
  isOnline?: boolean;
  timeRemainingSeconds?: number;
  extraMinutes?: number;
  extraWarningMsg?: string;
  testTitle?: string;
  testCode?: string;
  student?: StudentInfo | null;
  attemptCount?: number;
  maxAttempts?: number;
}

const SECTION_ICONS: Record<SectionId, React.ReactNode> = {
  calculus: <Sigma className="w-4 h-4" />,
  probability: <Dices className="w-4 h-4" />,
  numberSystem: <Binary className="w-4 h-4" />,
  trigonometry: <Triangle className="w-4 h-4" />,
  statistics: <BarChart3 className="w-4 h-4" />
};

interface SectionTheme {
  tabActiveBg: string;
  tabActiveText: string;
  tabActiveBorder: string;
  tabInactiveBg: string;
  tabInactiveBorder: string;
  tabBadgeBg: string;
  pageContainerBg: string;
  cardBorder: string;
  accentText: string;
  badgeBorder: string;
  buttonColor: string;
  subtextActive: string;
  subtextInactive: string;
  iconActiveBg: string;
  iconInactiveBg: string;
}

const SECTION_THEMES: Record<SectionId, SectionTheme> = {
  calculus: {
    tabActiveBg: 'bg-white',
    tabActiveText: 'text-blue-950 font-extrabold',
    tabActiveBorder: 'border-blue-600 ring-2 ring-blue-500/20',
    tabInactiveBg: 'bg-white',
    tabInactiveBorder: 'border-slate-200 hover:border-blue-300',
    tabBadgeBg: 'bg-blue-500/10 text-blue-700 font-bold',
    pageContainerBg: 'bg-blue-500/10',
    cardBorder: 'border-blue-200/90',
    accentText: 'text-blue-700',
    badgeBorder: 'border-blue-300',
    buttonColor: 'bg-blue-700 hover:bg-blue-800',
    subtextActive: 'text-blue-800 font-bold',
    subtextInactive: 'text-slate-500 font-medium',
    iconActiveBg: 'bg-blue-600 text-white',
    iconInactiveBg: 'bg-blue-500/10 text-blue-700'
  },
  probability: {
    tabActiveBg: 'bg-white',
    tabActiveText: 'text-rose-950 font-extrabold',
    tabActiveBorder: 'border-rose-600 ring-2 ring-rose-500/20',
    tabInactiveBg: 'bg-white',
    tabInactiveBorder: 'border-slate-200 hover:border-rose-300',
    tabBadgeBg: 'bg-rose-500/10 text-rose-700 font-bold',
    pageContainerBg: 'bg-rose-500/10',
    cardBorder: 'border-rose-200/90',
    accentText: 'text-rose-700',
    badgeBorder: 'border-rose-300',
    buttonColor: 'bg-rose-700 hover:bg-rose-800',
    subtextActive: 'text-rose-800 font-bold',
    subtextInactive: 'text-slate-500 font-medium',
    iconActiveBg: 'bg-rose-600 text-white',
    iconInactiveBg: 'bg-rose-500/10 text-rose-700'
  },
  numberSystem: {
    tabActiveBg: 'bg-white',
    tabActiveText: 'text-purple-950 font-extrabold',
    tabActiveBorder: 'border-purple-600 ring-2 ring-purple-500/20',
    tabInactiveBg: 'bg-white',
    tabInactiveBorder: 'border-slate-200 hover:border-purple-300',
    tabBadgeBg: 'bg-purple-500/10 text-purple-700 font-bold',
    pageContainerBg: 'bg-purple-500/10',
    cardBorder: 'border-purple-200/90',
    accentText: 'text-purple-700',
    badgeBorder: 'border-purple-300',
    buttonColor: 'bg-purple-700 hover:bg-purple-800',
    subtextActive: 'text-purple-800 font-bold',
    subtextInactive: 'text-slate-500 font-medium',
    iconActiveBg: 'bg-purple-600 text-white',
    iconInactiveBg: 'bg-purple-500/10 text-purple-700'
  },
  trigonometry: {
    tabActiveBg: 'bg-white',
    tabActiveText: 'text-amber-950 font-extrabold',
    tabActiveBorder: 'border-amber-600 ring-2 ring-amber-500/20',
    tabInactiveBg: 'bg-white',
    tabInactiveBorder: 'border-slate-200 hover:border-amber-300',
    tabBadgeBg: 'bg-amber-500/10 text-amber-700 font-bold',
    pageContainerBg: 'bg-amber-500/10',
    cardBorder: 'border-amber-200/90',
    accentText: 'text-amber-700',
    badgeBorder: 'border-amber-300',
    buttonColor: 'bg-amber-700 hover:bg-amber-800',
    subtextActive: 'text-amber-800 font-bold',
    subtextInactive: 'text-slate-500 font-medium',
    iconActiveBg: 'bg-amber-600 text-white',
    iconInactiveBg: 'bg-amber-500/10 text-amber-700'
  },
  statistics: {
    tabActiveBg: 'bg-white',
    tabActiveText: 'text-teal-950 font-extrabold',
    tabActiveBorder: 'border-teal-600 ring-2 ring-teal-500/20',
    tabInactiveBg: 'bg-white',
    tabInactiveBorder: 'border-slate-200 hover:border-teal-300',
    tabBadgeBg: 'bg-teal-500/10 text-teal-700 font-bold',
    pageContainerBg: 'bg-teal-500/10',
    cardBorder: 'border-teal-200/90',
    accentText: 'text-teal-700',
    badgeBorder: 'border-teal-300',
    buttonColor: 'bg-teal-700 hover:bg-teal-800',
    subtextActive: 'text-teal-800 font-bold',
    subtextInactive: 'text-slate-500 font-medium',
    iconActiveBg: 'bg-teal-600 text-white',
    iconInactiveBg: 'bg-teal-500/10 text-teal-700'
  }
};

export const AssessmentView: React.FC<AssessmentViewProps> = ({
  questions,
  currentSection,
  currentQuestionIndex,
  responses,
  onSelectOption,
  onClearOption,
  onToggleMarkForReview,
  onChangeSection,
  onChangeQuestionIndex,
  onSubmitAssessment,
  isOnline = true,
  timeRemainingSeconds,
  extraMinutes = 0,
  extraWarningMsg,
  testTitle,
  testCode,
  student,
  attemptCount = 1,
  maxAttempts = 3
}) => {
  const [submissionWarning, setSubmissionWarning] = useState<string | null>(null);
  const [isConfirmingSubmit, setIsConfirmingSubmit] = useState(false);

  // Dynamic sections: only show domains that exist in questions (or default to all)
  const availableSections = useMemo(() => {
    const matched = SECTION_METADATA.filter(meta => questions.some(q => q.sectionId === meta.id));
    return matched.length > 0 ? matched : SECTION_METADATA;
  }, [questions]);

  // Section completion summaries for confirmation modal and overview
  const sectionSummaries: SectionCompletionSummary[] = useMemo(() => {
    return availableSections.map((sec) => {
      const secQs = questions.filter((q) => q.sectionId === sec.id);
      const secAns = secQs.filter(
        (q) => responses[q.id]?.selectedOption !== undefined && responses[q.id]?.selectedOption !== null
      ).length;
      return {
        id: sec.id,
        title: sec.title,
        answered: secAns,
        total: secQs.length
      };
    });
  }, [availableSections, questions, responses]);

  // Accessibility Mode Font Size State (Allows students to scale question text font size)
  const [isAccessibilityMode, setIsAccessibilityMode] = useState(false);
  const [fontSizeLevel, setFontSizeLevel] = useState<'large' | 'xlarge'>('large');
  const [isGuidelinesOpen, setIsGuidelinesOpen] = useState(false);

  // Filter questions for current section
  const sectionQuestions = questions.filter((q) => q.sectionId === currentSection);
  const activeQuestion = sectionQuestions[currentQuestionIndex] || sectionQuestions[0];

  const currentResponse = activeQuestion ? responses[activeQuestion.id] : null;
  const selectedOption = currentResponse?.selectedOption ?? null;
  const isMarked = currentResponse?.isMarkedForReview ?? false;

  // Counts across entire test (50 total)
  const totalQuestionsCount = questions.length || 50;
  const totalAnswered = (Object.values(responses) as StudentResponse[]).filter((r) => r.selectedOption !== null && r.selectedOption !== undefined).length;
  const totalMarked = (Object.values(responses) as StudentResponse[]).filter((r) => r.isMarkedForReview).length;
  const totalProgressPercentage = Math.round((totalAnswered / totalQuestionsCount) * 100);
  const isAllAnswered = totalAnswered === totalQuestionsCount;
  const unansweredCount = totalQuestionsCount - totalAnswered;

  // Strictly disable right-click context menu and right mouse buttons during assessment
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      return false;
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (e.button === 2) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    };

    const handleAuxClick = (e: MouseEvent) => {
      if (e.button === 2) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    };

    window.addEventListener('contextmenu', handleContextMenu, true);
    document.addEventListener('contextmenu', handleContextMenu, true);
    window.addEventListener('mousedown', handleMouseDown, true);
    document.addEventListener('mousedown', handleMouseDown, true);
    window.addEventListener('auxclick', handleAuxClick, true);
    document.addEventListener('auxclick', handleAuxClick, true);

    return () => {
      window.removeEventListener('contextmenu', handleContextMenu, true);
      document.removeEventListener('contextmenu', handleContextMenu, true);
      window.removeEventListener('mousedown', handleMouseDown, true);
      document.removeEventListener('mousedown', handleMouseDown, true);
      window.removeEventListener('auxclick', handleAuxClick, true);
      document.removeEventListener('auxclick', handleAuxClick, true);
    };
  }, []);

  const isLastSection = currentSection === availableSections[availableSections.length - 1]?.id;
  const isLastQuestion = isLastSection && currentQuestionIndex >= sectionQuestions.length - 1;

  // Calculate overall global question index (0 to totalQuestionsCount - 1)
  const overallQuestionIndex = (() => {
    let index = 0;
    for (const meta of availableSections) {
      if (meta.id === currentSection) {
        return index + currentQuestionIndex;
      }
      const count = questions.filter((q) => q.sectionId === meta.id).length;
      index += count;
    }
    return index;
  })();

  const globalQuestionNumber = overallQuestionIndex + 1;
  const isQuestion50 = globalQuestionNumber === totalQuestionsCount || (isLastSection && currentQuestionIndex >= sectionQuestions.length - 1);

  const handleNext = () => {
    setSubmissionWarning(null);
    setIsConfirmingSubmit(false);
    if (isQuestion50) return;
    if (currentQuestionIndex < sectionQuestions.length - 1) {
      onChangeQuestionIndex(currentQuestionIndex + 1);
    } else {
      // Move to next section if available
      const secIdx = availableSections.findIndex((s) => s.id === currentSection);
      if (secIdx < availableSections.length - 1) {
        onChangeSection(availableSections[secIdx + 1].id);
        onChangeQuestionIndex(0);
      }
    }
  };

  const handleAttemptSubmit = () => {
    if (!isAllAnswered) {
      setSubmissionWarning(`Please answer all ${totalQuestionsCount} questions before submitting. You have ${unansweredCount} unanswered question(s) remaining.`);
      setIsConfirmingSubmit(false);
      // Auto-jump to the first section with unanswered question
      for (const meta of availableSections) {
        const secQs = questions.filter((q) => q.sectionId === meta.id);
        const firstUnansIdx = secQs.findIndex((q) => responses[q.id]?.selectedOption === undefined || responses[q.id]?.selectedOption === null);
        if (firstUnansIdx !== -1) {
          if (meta.id !== currentSection) {
            onChangeSection(meta.id);
          }
          onChangeQuestionIndex(firstUnansIdx);
          break;
        }
      }
    } else {
      setSubmissionWarning(null);
      setIsConfirmingSubmit(true);
    }
  };

  // Keyboard Navigation: allow left/right keys to navigate smoothly
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const getDifficultyBadge = (diff: Question['difficulty']) => {
    switch (diff) {
      case 'easy':
        return (
          <span className="px-2.5 py-1 rounded bg-green-500/20 text-green-400 border border-green-500/30 text-[10px] font-bold uppercase tracking-wider inline-block">
            Level 1
          </span>
        );
      case 'medium':
        return (
          <span className="px-2.5 py-1 rounded bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 text-[10px] font-bold uppercase tracking-wider inline-block">
            Level 2
          </span>
        );
      case 'hard':
        return (
          <span className="px-2.5 py-1 rounded bg-red-500/20 text-red-400 border border-red-500/30 text-[10px] font-bold uppercase tracking-wider inline-block">
            Level 3
          </span>
        );
    }
  };

  const currentTheme = SECTION_THEMES[currentSection] || SECTION_THEMES.calculus;

  return (
    <div
      id="live-assessment-container"
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }}
      className={`min-h-[calc(100vh-65px)] ${currentTheme.pageContainerBg} text-slate-900 p-4 sm:p-6 lg:p-8 transition-colors duration-500 select-none`}
    >
      <div className="max-w-7xl mx-auto space-y-6">

        {/* EXTRA ASSESSMENT TIME & ADMIN WARNING NOTIFICATION BANNER */}
        {extraMinutes > 0 && (
          <div className="bg-gradient-to-r from-purple-800 via-indigo-700 to-blue-800 text-white border-2 border-purple-300/90 rounded-2xl p-4 shadow-xl flex flex-wrap items-center justify-between gap-3 text-xs animate-in fade-in slide-from-top duration-300">
            <div className="flex items-center gap-3.5 font-bold">
              <div className="p-2.5 bg-purple-950/80 rounded-xl text-purple-200 border border-purple-300/50 shrink-0">
                <Clock className="w-5 h-5 text-purple-200" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-extrabold uppercase tracking-wide flex items-center gap-1.5 text-white">
                    <Sparkles className="w-4 h-4 text-amber-300 animate-spin" />
                    Extra Assessment Time Granted (+{extraMinutes} Extra Mins)
                  </span>
                  <span className="bg-purple-950/90 text-amber-300 text-[11px] font-mono font-extrabold px-2.5 py-0.5 rounded-md border border-purple-300/60 shadow-2xs">
                    Total Duration: {60 + extraMinutes} Minutes
                  </span>
                </div>
                <p className="text-[11px] text-purple-100 font-medium mt-1 leading-relaxed">
                  {extraWarningMsg || `⚠️ Notice: Admin has granted an extra ${extraMinutes} minutes for this assessment session. Please manage your time effectively.`}
                </p>
              </div>
            </div>
            <span className="px-3 py-1 bg-white/10 text-purple-100 text-[10px] font-mono font-bold rounded-lg uppercase tracking-wider shrink-0 border border-purple-300/40">
              Admin Extended Timer
            </span>
          </div>
        )}

        {/* OFFLINE MODE NOTIFICATION BANNER */}
        {!isOnline && (
          <div className="bg-amber-500 text-white border border-amber-600 rounded-xl p-3.5 shadow-md flex flex-wrap items-center justify-between gap-3 text-xs animate-pulse">
            <div className="flex items-center gap-2.5 font-bold">
              <WifiOff className="w-5 h-5 shrink-0" />
              <span>
                Offline Mode Active — Network connection lost. Your test progress and answers are being continuously auto-saved locally in real time. You can safely complete the assessment offline!
              </span>
            </div>
            <span className="bg-amber-700/80 text-amber-100 text-[10px] font-mono font-extrabold px-2.5 py-1 rounded uppercase tracking-wider shrink-0 border border-amber-400">
              Auto-Saving Locally
            </span>
          </div>
        )}

        {/* 5-MINUTE TIME REMAINING WARNING BANNER (INLINE - NO POPUP) */}
        {timeRemainingSeconds !== undefined && timeRemainingSeconds > 0 && timeRemainingSeconds <= 300 && (
          <div className="bg-gradient-to-r from-red-700 via-amber-600 to-orange-600 text-white border-2 border-amber-300 rounded-2xl p-4 sm:p-5 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs animate-in fade-in slide-from-top duration-300">
            <div className="flex items-start sm:items-center gap-3.5 font-bold">
              <div className="p-3 bg-red-950/80 rounded-xl text-amber-200 border border-amber-300/60 shrink-0 shadow-inner">
                <Clock className="w-6 h-6 text-amber-300 animate-spin" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm sm:text-base font-extrabold uppercase tracking-wide flex items-center gap-1.5 text-white">
                    <AlertCircle className="w-4 h-4 text-amber-300 animate-bounce" />
                    5-Minute Time Warning: Final Assessment Notice
                  </span>
                  <span className="bg-red-950/90 text-amber-300 text-xs font-mono font-black px-3 py-0.5 rounded-lg border border-amber-300/70 shadow-sm animate-pulse">
                    ⏱️ {Math.floor(timeRemainingSeconds / 60)}:{(timeRemainingSeconds % 60).toString().padStart(2, '0')} Remaining
                  </span>
                </div>
                <p className="text-xs text-amber-100 font-medium leading-relaxed">
                  {unansweredCount > 0
                    ? `⚠️ You have ${unansweredCount} unanswered question(s) remaining! Assessment will automatically close and save your answers when the timer reaches 00:00.`
                    : `✅ All ${totalQuestionsCount} questions completed! You may review your answers or click Submit Assessment.`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 shrink-0 self-end md:self-center">
              {unansweredCount > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    const firstUnansQ = questions.find((q) => responses[q.id]?.selectedOption === undefined || responses[q.id]?.selectedOption === null);
                    if (firstUnansQ) {
                      onChangeSection(firstUnansQ.sectionId);
                      const secQs = questions.filter((q) => q.sectionId === firstUnansQ.sectionId);
                      const idx = secQs.findIndex((q) => q.id === firstUnansQ.id);
                      if (idx !== -1) {
                        onChangeQuestionIndex(idx);
                      }
                    }
                  }}
                  className="px-3.5 py-2 bg-white hover:bg-amber-50 text-red-800 font-extrabold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <span>Jump to Pending ({unansweredCount})</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              )}
              <div className="px-3 py-2 bg-black/30 text-amber-200 text-[11px] font-bold rounded-xl font-mono border border-white/20">
                Auto-Save Active
              </div>
            </div>
          </div>
        )}

        {/* OVERALL ASSESSMENT PROGRESS BAR */}
        <div className={`bg-white/95 border ${currentTheme.cardBorder} rounded-xl p-4 shadow-sm`}>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
            <div className="flex flex-wrap items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-blue-600 shrink-0" />
              {testCode && (
                <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded font-mono font-black text-[11px] border border-blue-200">
                  {testCode}
                </span>
              )}
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                {testTitle || 'Overall Mathematics Assessment Progress'}
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-[10px] font-semibold shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Savepoint Auto-Saved</span>
              </span>

              {/* ATTEMPT COUNTER BADGE (MAX 3 ATTEMPTS) */}
              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-2xs border ${
                attemptCount === 1
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                  : attemptCount === 2
                    ? 'bg-amber-50 text-amber-800 border-amber-300'
                    : 'bg-rose-50 text-rose-800 border-rose-300 animate-pulse'
              }`}>
                <span>Attempt {attemptCount} of {maxAttempts}</span>
              </span>

              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-2xs">
                <ShieldAlert className="w-3 h-3 text-blue-600" />
                <span>Proctored Live Session</span>
              </span>

              {/* GUIDELINES & INSTRUCTIONS BUTTON */}
              <button
                type="button"
                onClick={() => setIsGuidelinesOpen(true)}
                className="inline-flex items-center gap-1 bg-blue-50/90 hover:bg-blue-100/90 border border-blue-200 text-blue-700 hover:text-blue-900 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider cursor-pointer shadow-2xs transition-all"
                title="View Student Guidelines & Navigation Instructions"
              >
                <HelpCircle className="w-3 h-3 text-blue-600 shrink-0" />
                <span>Guidelines</span>
              </button>

              {/* ACCESSIBILITY MODE TOGGLE IN HEADER */}
              <div className="inline-flex items-center gap-1.5 bg-indigo-50/90 border border-indigo-200 rounded-full px-2.5 py-0.5 shadow-2xs">
                <button
                  type="button"
                  onClick={() => setIsAccessibilityMode((prev) => !prev)}
                  className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider cursor-pointer transition-all ${
                    isAccessibilityMode ? 'text-indigo-900 font-extrabold' : 'text-indigo-700 hover:text-indigo-900'
                  }`}
                >
                  <Type className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                  <span>Accessibility Mode</span>
                  <span className={`px-1.5 py-0.2 rounded text-[9px] font-extrabold transition-all ${
                    isAccessibilityMode ? 'bg-indigo-600 text-white shadow-2xs' : 'bg-indigo-200/80 text-indigo-800'
                  }`}>
                    {isAccessibilityMode ? 'ON' : 'OFF'}
                  </span>
                </button>

                {isAccessibilityMode && (
                  <div className="inline-flex items-center gap-1 pl-1.5 border-l border-indigo-300/80 animate-in fade-in duration-200">
                    <button
                      type="button"
                      onClick={() => setFontSizeLevel('large')}
                      className={`px-1.5 py-0.2 text-[9px] font-bold rounded cursor-pointer transition-colors ${
                        fontSizeLevel === 'large' ? 'bg-indigo-600 text-white' : 'bg-indigo-100 text-indigo-800 hover:bg-indigo-200'
                      }`}
                    >
                      Large
                    </button>
                    <button
                      type="button"
                      onClick={() => setFontSizeLevel('xlarge')}
                      className={`px-1.5 py-0.2 text-[9px] font-bold rounded cursor-pointer transition-colors ${
                        fontSizeLevel === 'xlarge' ? 'bg-indigo-600 text-white' : 'bg-indigo-100 text-indigo-800 hover:bg-indigo-200'
                      }`}
                    >
                      XL
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="text-xs font-mono font-bold text-slate-600">
              <span className="text-blue-600">{totalAnswered}</span> / {totalQuestionsCount} Questions Answered ({totalProgressPercentage}%)
            </div>
          </div>
          <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
            <div
              className="h-full bg-gradient-to-r from-blue-600 via-emerald-500 to-purple-600 transition-all duration-500"
              style={{ width: `${totalProgressPercentage}%` }}
            />
          </div>
        </div>

        {/* TOP SECTION TABS BAR FOR THE 5 MATHEMATICS DOMAINS */}
        <div className={`border border-slate-200/90 rounded-2xl p-2.5 shadow-sm transition-colors duration-300 overflow-x-auto ${currentTheme.pageContainerBg}`}>
          <div className="flex items-center gap-2.5 min-w-max">
            {availableSections.map((meta) => {
              const isActive = meta.id === currentSection;
              const secTheme = SECTION_THEMES[meta.id];
              const sectionQs = questions.filter((q) => q.sectionId === meta.id);
              const answeredSecCount = sectionQs.filter((q) => responses[q.id]?.selectedOption !== undefined && responses[q.id]?.selectedOption !== null).length;

              return (
                <button
                  key={meta.id}
                  type="button"
                  onClick={() => {
                    onChangeSection(meta.id);
                    onChangeQuestionIndex(0);
                    setSubmissionWarning(null);
                    setIsConfirmingSubmit(false);
                  }}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs transition-all cursor-pointer border ${
                    isActive
                      ? `${secTheme.tabActiveBg} ${secTheme.tabActiveBorder} ${secTheme.tabActiveText} border-2 shadow-md scale-[1.02]`
                      : `${secTheme.tabInactiveBg} ${secTheme.tabInactiveBorder} text-slate-900 hover:scale-[1.01]`
                  }`}
                >
                  <span className={`p-1.5 rounded-lg ${isActive ? secTheme.iconActiveBg : secTheme.iconInactiveBg}`}>
                    {SECTION_ICONS[meta.id]}
                  </span>
                  <div className="text-left">
                    <p className="font-extrabold text-xs whitespace-nowrap">{meta.title}</p>
                    <p className={`text-[10px] ${isActive ? secTheme.subtextActive : secTheme.subtextInactive}`}>
                      Progress: {answeredSecCount}/{sectionQs.length}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* COMPLETION NOTIFICATION BANNER WHEN ALL QUESTIONS ARE ANSWERED */}
        {isAllAnswered && (
          <div className="p-4 bg-emerald-50 border-2 border-emerald-400 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-sm animate-in fade-in duration-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-extrabold text-xs sm:text-sm text-emerald-950">
                    All {totalQuestionsCount} Questions Completed!
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-200/80 text-emerald-900 text-[10px] font-mono font-bold uppercase">
                    100% Finished
                  </span>
                </div>
                <p className="text-xs text-emerald-800 mt-0.5 font-medium">
                  You have answered every question in this assessment. Click below to review your answers or confirm final submission.
                </p>
              </div>
            </div>
            <button
              id="btn-trigger-confirm-submission-banner"
              type="button"
              onClick={() => setIsConfirmingSubmit(true)}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1.5 hover:scale-105 active:scale-95"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Confirm &amp; Submit Assessment</span>
            </button>
          </div>
        )}

        {/* MAIN LAYOUT GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

          {/* LEFT: Active Question Area */}
          <div className={`lg:col-span-8 bg-white/95 border ${currentTheme.cardBorder} rounded-xl p-6 sm:p-8 shadow-sm flex flex-col justify-between min-h-[520px]`}>
            
            {activeQuestion ? (
              <div className="space-y-6">
                
                {/* Question Header Status */}
                <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-200">
                  <div>
                    {getDifficultyBadge(activeQuestion.difficulty)}
                    <h2 className="text-lg font-bold text-slate-900 mt-1 flex items-center gap-2 flex-wrap">
                      <span>Question {globalQuestionNumber} of {totalQuestionsCount}</span>
                      <span className="text-xs font-semibold px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md border border-slate-200">
                        {SECTION_METADATA.find((s) => s.id === currentSection)?.title} Q{currentQuestionIndex + 1}/{sectionQuestions.length}
                      </span>
                    </h2>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {/* ACCESSIBILITY FONT SIZE QUICK TOGGLE */}
                    <button
                      type="button"
                      onClick={() => setIsAccessibilityMode(!isAccessibilityMode)}
                      className={`px-2.5 py-1.5 rounded-lg border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                        isAccessibilityMode
                          ? 'bg-indigo-600 text-white border-indigo-700 shadow-xs'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <Type className={`w-3.5 h-3.5 ${isAccessibilityMode ? 'text-white' : 'text-slate-500'}`} />
                      <span>{isAccessibilityMode ? (fontSizeLevel === 'xlarge' ? 'Text: XL (+50%)' : 'Text: Large (+25%)') : 'Text Size'}</span>
                    </button>

                    <button
                      onClick={() => onToggleMarkForReview(activeQuestion.id)}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                        isMarked
                          ? 'bg-amber-50 text-amber-800 border-amber-300'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <Bookmark className={`w-3.5 h-3.5 ${isMarked ? 'fill-amber-500 text-amber-500' : ''}`} />
                      <span>{isMarked ? 'Flagged for Review' : 'Flag for Review'}</span>
                    </button>

                    {selectedOption !== null && (
                      <button
                        onClick={() => onClearOption(activeQuestion.id)}
                        className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 text-slate-600 hover:text-red-600 rounded-lg text-xs font-mono font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Clear</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Question Text */}
                <div className="space-y-4">
                  <div className={`text-slate-900 font-sans whitespace-pre-wrap break-words transition-all duration-200 ${
                    isAccessibilityMode
                      ? fontSizeLevel === 'xlarge'
                        ? 'text-xl sm:text-2xl font-semibold leading-loose tracking-wide bg-indigo-50/40 p-4 rounded-xl border border-indigo-100'
                        : 'text-lg sm:text-xl font-medium leading-relaxed bg-indigo-50/30 p-3.5 rounded-xl border border-indigo-100/80'
                      : 'text-base sm:text-md leading-relaxed font-medium'
                  }`}>
                    {activeQuestion.questionText || activeQuestion.question}
                  </div>

                  {/* Context / Formula if present */}
                  {activeQuestion.codeSnippet && (
                    <div className={`bg-slate-900 text-slate-100 border border-slate-800 rounded-lg p-4 font-mono overflow-x-auto shadow-inner transition-all duration-200 ${
                      isAccessibilityMode
                        ? fontSizeLevel === 'xlarge' ? 'text-base sm:text-lg' : 'text-sm sm:text-base'
                        : 'text-xs'
                    }`}>
                      <pre className="whitespace-pre-wrap break-words font-mono">{activeQuestion.codeSnippet}</pre>
                    </div>
                  )}
                </div>

                {/* Answer Options Choices */}
                <div className="grid grid-cols-1 gap-3 pt-2">
                  {activeQuestion.options.map((optText, optIdx) => {
                    const isSelected = selectedOption === optIdx;
                    const optionLetter = String.fromCharCode(65 + optIdx);

                    return (
                      <label
                        key={optIdx}
                        onClick={() => {
                          onSelectOption(activeQuestion.id, optIdx);
                          setSubmissionWarning(null);
                        }}
                        className={`flex items-start sm:items-center p-4 rounded-xl border cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-blue-50/80 border-blue-600 text-slate-900 shadow-sm font-semibold'
                            : 'bg-slate-50/80 border-slate-200 text-slate-800 hover:bg-slate-100/80'
                        }`}
                      >
                        <div className={`w-5 h-5 rounded-full border-2 mr-3 flex items-center justify-center shrink-0 mt-0.5 sm:mt-0 ${
                          isSelected ? 'border-blue-600 bg-blue-600' : 'border-slate-300'
                        }`}>
                          {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                        </div>

                        <div className="flex items-center gap-2 mr-3 shrink-0 mt-0.5 sm:mt-0">
                          <span className="text-xs font-mono font-bold text-slate-600">[{optionLetter}]</span>
                        </div>

                        <span className={`leading-relaxed font-sans whitespace-pre-wrap break-words transition-all duration-200 ${
                          isAccessibilityMode
                            ? fontSizeLevel === 'xlarge' ? 'text-lg sm:text-xl font-medium' : 'text-base sm:text-lg font-medium'
                            : 'text-sm'
                        }`}>{optText}</span>
                      </label>
                    );
                  })}
                </div>

              </div>
            ) : null}

            {/* INLINE SUBMISSION STATUS & WARNING BANNER (NO POPUPS) */}
            {submissionWarning && (
              <div className="mt-6 p-4 bg-rose-50 border-2 border-rose-300 rounded-xl space-y-3 animate-in fade-in duration-200">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-rose-800 font-bold text-xs">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>Incomplete Assessment ({unansweredCount} Questions Remaining)</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSubmissionWarning(null)}
                    className="text-rose-500 hover:text-rose-800 p-1 text-xs cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-xs text-rose-900 font-medium">
                  {submissionWarning}
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  {SECTION_METADATA.map((meta) => {
                    const secQs = questions.filter((q) => q.sectionId === meta.id);
                    const secUnans = secQs.filter((q) => responses[q.id]?.selectedOption === undefined || responses[q.id]?.selectedOption === null).length;
                    if (secUnans === 0) return null;
                    return (
                      <button
                        key={meta.id}
                        type="button"
                        onClick={() => {
                          onChangeSection(meta.id);
                          const firstUnans = secQs.findIndex((q) => responses[q.id]?.selectedOption === undefined || responses[q.id]?.selectedOption === null);
                          if (firstUnans !== -1) {
                            onChangeQuestionIndex(firstUnans);
                          }
                        }}
                        className="px-2.5 py-1 bg-rose-100 hover:bg-rose-200 text-rose-900 text-[11px] font-bold rounded-lg border border-rose-300 flex items-center gap-1.5 cursor-pointer transition-colors"
                      >
                        <span>{meta.title}: {secUnans} Pending</span>
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Bottom Controls Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-6 mt-8 border-t border-slate-200">
              <div className="text-xs font-semibold text-slate-500 flex items-center gap-2">
                <span className="font-mono font-bold text-slate-800">Question {globalQuestionNumber} of {totalQuestionsCount}</span>
                <span className="text-slate-300">•</span>
                <span>Select an answer and click Next Question to proceed</span>
              </div>

              <div className="flex items-center gap-2">
                {/* Submit Assessment button */}
                <button
                  id="btn-submit-assessment-bottom"
                  onClick={handleAttemptSubmit}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer shadow-sm flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Submit Assessment</span>
                </button>

                {/* Next Question button: Hidden on Question 50 */}
                {!isQuestion50 && (
                  <button
                    id="btn-next-question-bottom"
                    onClick={handleNext}
                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-md flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <span>Next Question</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

          </div>

          {/* RIGHT: Quick Stats & Palette Panel */}
          <div className="lg:col-span-4 space-y-5">
            
            {/* Question Palette (All Questions across all domains) */}
            <div className={`bg-white/95 border ${currentTheme.cardBorder} rounded-xl p-5 shadow-sm space-y-4`}>
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase font-bold text-slate-600 tracking-wider">
                    Question Palette
                  </span>
                  <span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded text-[9px] font-mono font-bold border border-blue-200">
                    All {totalQuestionsCount} Questions
                  </span>
                </div>
                <span className="text-xs font-mono text-blue-600 font-bold">
                  {totalAnswered} / {totalQuestionsCount} Answered
                </span>
              </div>

              {/* Grid 1 to N for All Questions irrespective of domain */}
              <div className="grid grid-cols-5 gap-2 max-h-[440px] overflow-y-auto pr-1">
                {questions.map((q, globalIdx) => {
                  const resp = responses[q.id];
                  const isAns = resp?.selectedOption !== undefined && resp?.selectedOption !== null;
                  const isMkd = resp?.isMarkedForReview ?? false;
                  const isCurrent = q.id === activeQuestion?.id;

                  let btnBg = 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100';
                  if (isMkd) {
                    btnBg = 'bg-amber-100 text-amber-900 border-amber-300 hover:bg-amber-200';
                  } else if (isAns) {
                    btnBg = 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700';
                  }

                  const secMeta = availableSections.find((s) => s.id === q.sectionId);

                  return (
                    <button
                      key={q.id || globalIdx}
                      type="button"
                      title={`Question ${globalIdx + 1}${secMeta ? ` • ${secMeta.title}` : ''}${isAns ? ' (Answered)' : ' (Unanswered)'}${isMkd ? ' [Flagged]' : ''}`}
                      onClick={() => {
                        if (q.sectionId && q.sectionId !== currentSection) {
                          onChangeSection(q.sectionId);
                        }
                        const targetSecQuestions = questions.filter((item) => item.sectionId === q.sectionId);
                        const targetIdx = targetSecQuestions.findIndex((item) => item.id === q.id);
                        onChangeQuestionIndex(targetIdx !== -1 ? targetIdx : 0);
                        setSubmissionWarning(null);
                        setIsConfirmingSubmit(false);
                      }}
                      className={`h-9 rounded-lg font-mono font-bold text-xs transition-all relative flex items-center justify-center cursor-pointer border ${btnBg} ${
                        isCurrent ? 'ring-2 ring-blue-600 ring-offset-2 scale-105 shadow-sm font-black' : ''
                      }`}
                    >
                      {globalIdx + 1}
                      {isMkd && (
                        <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-amber-500 shadow-xs" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Palette Legend */}
              <div className="pt-3 border-t border-slate-200 space-y-2 text-[10px]">
                <div className="flex items-center justify-between text-slate-600 font-medium">
                  <span className="flex items-center gap-1.5">
                    <i className="w-2.5 h-2.5 rounded-full bg-blue-600" /> Answered ({totalAnswered})
                  </span>
                  <span className="flex items-center gap-1.5">
                    <i className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Flagged ({totalMarked})
                  </span>
                  <span className="flex items-center gap-1.5">
                    <i className="w-2.5 h-2.5 rounded-full bg-slate-300" /> Unanswered ({unansweredCount})
                  </span>
                </div>
              </div>
            </div>

          </div>

        </div>

      </div>

      {/* CONFIRM SUBMISSION MODAL (DISPLAYED IN DEDICATED NEW SPACE) */}
      <ConfirmSubmissionModal
        isOpen={isConfirmingSubmit}
        onClose={() => setIsConfirmingSubmit(false)}
        onConfirmSubmit={onSubmitAssessment}
        student={student}
        testTitle={testTitle}
        testCode={testCode}
        totalQuestions={totalQuestionsCount}
        totalAnswered={totalAnswered}
        totalMarked={totalMarked}
        unansweredCount={unansweredCount}
        timeRemainingSeconds={timeRemainingSeconds}
        sections={sectionSummaries}
        onJumpToSection={(secId) => {
          onChangeSection(secId);
          onChangeQuestionIndex(0);
          setSubmissionWarning(null);
        }}
      />

      {/* STUDENT GUIDELINES MODAL */}
      <StudentGuidelinesModal
        isOpen={isGuidelinesOpen}
        onClose={() => setIsGuidelinesOpen(false)}
      />

    </div>
  );
};
