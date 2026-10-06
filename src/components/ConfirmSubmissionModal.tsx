import React from 'react';
import { SectionId, StudentInfo } from '../types';
import {
  CheckCircle2,
  AlertCircle,
  Clock,
  HelpCircle,
  FileCheck,
  User,
  Building2,
  X,
  Bookmark,
  ArrowRight,
  ShieldCheck,
  RotateCcw
} from 'lucide-react';

export interface SectionCompletionSummary {
  id: SectionId;
  title: string;
  answered: number;
  total: number;
}

interface ConfirmSubmissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmSubmit: () => void;
  student?: StudentInfo | null;
  testTitle?: string;
  testCode?: string;
  totalQuestions: number;
  totalAnswered: number;
  totalMarked: number;
  unansweredCount: number;
  timeRemainingSeconds?: number;
  sections: SectionCompletionSummary[];
  onJumpToSection?: (sectionId: SectionId) => void;
}

export const ConfirmSubmissionModal: React.FC<ConfirmSubmissionModalProps> = ({
  isOpen,
  onClose,
  onConfirmSubmit,
  student,
  testTitle = 'CIT Cognitive & Technical Ability Assessment',
  testCode,
  totalQuestions,
  totalAnswered,
  totalMarked,
  unansweredCount,
  timeRemainingSeconds,
  sections,
  onJumpToSection
}) => {
  if (!isOpen) return null;

  const isAllAnswered = unansweredCount === 0;
  const completionPercentage = totalQuestions > 0 ? Math.round((totalAnswered / totalQuestions) * 100) : 0;

  const formatTimer = (seconds?: number) => {
    if (seconds === undefined || seconds === null) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div
      id="confirm-submission-backdrop"
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        id="confirm-submission-dialog"
        className="w-full max-w-2xl bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]"
      >
        {/* Top Header */}
        <div className="bg-gradient-to-r from-emerald-700 via-teal-700 to-emerald-800 text-white px-6 py-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center shadow-inner">
              <FileCheck className="w-5 h-5 text-emerald-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/30 text-emerald-100 text-[10px] font-mono font-bold tracking-wider uppercase border border-emerald-300/30">
                  Submission Confirmation
                </span>
                {isAllAnswered && (
                  <span className="px-2 py-0.5 rounded-full bg-white/20 text-white text-[10px] font-bold">
                    100% Completed
                  </span>
                )}
              </div>
              <h2 className="text-lg sm:text-xl font-black tracking-tight text-white mt-0.5">
                Confirm Assessment Submission
              </h2>
            </div>
          </div>

          <button
            id="btn-close-confirm-modal"
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/25 text-white/80 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            title="Return to Assessment"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body (Scrollable) */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 text-slate-800 text-xs">
          {/* Candidate & Test Info Banner */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center font-bold text-sm shrink-0 border border-blue-200">
                <User className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-extrabold text-slate-900 text-sm truncate">
                    {student?.name || 'Student Candidate'}
                  </span>
                  <span className="text-[11px] font-mono px-2 py-0.5 bg-white rounded-md border border-slate-200 font-bold text-slate-700">
                    {student?.registerNo || 'REG-PENDING'}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-slate-500 text-[11px] mt-0.5 truncate">
                  <Building2 className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{student?.department || 'Department Candidate'}</span>
                  {testCode && (
                    <>
                      <span>•</span>
                      <span className="font-mono">{testCode}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {timeRemainingSeconds !== undefined && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 shrink-0">
                <Clock className="w-4 h-4 text-amber-600" />
                <div className="text-right">
                  <span className="text-[9px] uppercase font-bold text-amber-700 block tracking-wider">
                    Time Left
                  </span>
                  <span className="font-mono font-black text-xs text-amber-950">
                    {formatTimer(timeRemainingSeconds)}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Key Metrics Cards */}
          <div className="grid grid-cols-3 gap-2.5">
            {/* Answered */}
            <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl flex flex-col items-center text-center">
              <div className="flex items-center gap-1 text-emerald-700 font-bold text-[11px]">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Answered</span>
              </div>
              <span className="text-lg sm:text-xl font-black font-mono text-emerald-900 mt-1">
                {totalAnswered} / {totalQuestions}
              </span>
              <span className="text-[10px] font-semibold text-emerald-700">
                {completionPercentage}% Complete
              </span>
            </div>

            {/* Unanswered */}
            <div className={`p-3 rounded-xl border flex flex-col items-center text-center ${
              unansweredCount === 0
                ? 'bg-slate-50 border-slate-200 text-slate-700'
                : 'bg-rose-50 border-rose-200 text-rose-900'
            }`}>
              <div className={`flex items-center gap-1 font-bold text-[11px] ${
                unansweredCount === 0 ? 'text-slate-600' : 'text-rose-700'
              }`}>
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Pending</span>
              </div>
              <span className={`text-lg sm:text-xl font-black font-mono mt-1 ${
                unansweredCount === 0 ? 'text-slate-700' : 'text-rose-800'
              }`}>
                {unansweredCount}
              </span>
              <span className={`text-[10px] font-semibold ${
                unansweredCount === 0 ? 'text-slate-500' : 'text-rose-600'
              }`}>
                {unansweredCount === 0 ? 'None Remaining' : 'Unanswered'}
              </span>
            </div>

            {/* Flagged / Marked */}
            <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl flex flex-col items-center text-center">
              <div className="flex items-center gap-1 text-amber-700 font-bold text-[11px]">
                <Bookmark className="w-3.5 h-3.5 text-amber-600" />
                <span>Flagged</span>
              </div>
              <span className="text-lg sm:text-xl font-black font-mono text-amber-900 mt-1">
                {totalMarked}
              </span>
              <span className="text-[10px] font-semibold text-amber-700">
                For Review
              </span>
            </div>
          </div>

          {/* Section-by-Section Progress Details */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 uppercase tracking-wide">
              <span>Section Completion Breakdown</span>
              <span>{sections.length} Assessment Modules</span>
            </div>

            <div className="space-y-1.5">
              {sections.map((sec) => {
                const isSecComplete = sec.answered === sec.total && sec.total > 0;
                const secPct = sec.total > 0 ? Math.round((sec.answered / sec.total) * 100) : 0;

                return (
                  <div
                    key={sec.id}
                    className="p-2.5 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-xl flex items-center justify-between gap-3 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="font-bold text-slate-800 truncate text-[11px]">
                          {sec.title}
                        </span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="font-mono text-[10px] font-bold text-slate-600">
                            {sec.answered} / {sec.total}
                          </span>
                          {isSecComplete ? (
                            <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-800 rounded font-bold text-[9px] flex items-center gap-1">
                              <CheckCircle2 className="w-2.5 h-2.5" />
                              <span>Done</span>
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.2 bg-rose-100 text-rose-800 rounded font-bold text-[9px]">
                              {sec.total - sec.answered} Pending
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Mini Progress Bar */}
                      <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            isSecComplete ? 'bg-emerald-600' : 'bg-blue-600'
                          }`}
                          style={{ width: `${secPct}%` }}
                        />
                      </div>
                    </div>

                    {!isSecComplete && onJumpToSection && (
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onJumpToSection(sec.id);
                        }}
                        className="px-2 py-1 bg-white hover:bg-rose-50 text-rose-700 border border-rose-300 rounded-lg text-[10px] font-bold flex items-center gap-1 shrink-0 cursor-pointer transition-colors"
                        title={`Jump to ${sec.title}`}
                      >
                        <span>Answer</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Submission Notice & Integrity Warning */}
          <div className={`p-4 rounded-2xl border ${
            isAllAnswered
              ? 'bg-emerald-50/90 border-emerald-300 text-emerald-950'
              : 'bg-amber-50/90 border-amber-300 text-amber-950'
          }`}>
            <div className="flex items-start gap-2.5">
              <ShieldCheck className={`w-5 h-5 shrink-0 mt-0.5 ${
                isAllAnswered ? 'text-emerald-600' : 'text-amber-600'
              }`} />
              <div className="space-y-1">
                <span className="font-black text-xs block">
                  {isAllAnswered
                    ? 'Ready for Final Submission'
                    : `Incomplete Assessment Warning: ${unansweredCount} question(s) pending`}
                </span>
                <p className="text-[11px] leading-relaxed opacity-90">
                  {isAllAnswered ? (
                    <>
                      You have answered all <strong>{totalQuestions} questions</strong>. Once confirmed, your responses will be submitted to the institutional evaluation system, your test session will conclude, and you will proceed to the student feedback &amp; submission report.
                    </>
                  ) : (
                    <>
                      You still have <strong>{unansweredCount} unanswered questions</strong>. It is strongly recommended that you answer all questions before submitting, as unanswered items will receive 0 marks.
                    </>
                  )}
                </p>
                {totalMarked > 0 && (
                  <p className="text-[10px] font-semibold text-amber-800 pt-0.5">
                    Note: You have {totalMarked} question(s) flagged for review. Their currently selected answers will be submitted.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Modal Bottom Actions */}
        <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <button
            id="btn-return-to-assessment"
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 bg-white hover:bg-slate-100 text-slate-700 rounded-xl border border-slate-300 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Return &amp; Review Answers</span>
          </button>

          <button
            id="btn-confirm-final-submission"
            type="button"
            onClick={() => {
              onClose();
              onConfirmSubmit();
            }}
            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center gap-2 shadow-md shadow-emerald-600/30 transition-all cursor-pointer hover:scale-[1.01] active:scale-[0.99]"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Confirm &amp; Submit Assessment</span>
          </button>
        </div>
      </div>
    </div>
  );
};
