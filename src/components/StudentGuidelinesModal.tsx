import React from 'react';
import {
  BookOpen,
  Compass,
  ShieldCheck,
  Clock,
  CheckCircle2,
  AlertCircle,
  EyeOff,
  Type,
  Flag,
  ListChecks,
  X,
  HelpCircle,
  Laptop
} from 'lucide-react';
import { AssessmentTestConfig } from '../types';
import { getActiveAssessmentTest } from '../utils/testManagerUtils';

interface StudentGuidelinesModalProps {
  isOpen: boolean;
  onClose: () => void;
  testConfig?: AssessmentTestConfig | null;
}

export const StudentGuidelinesModal: React.FC<StudentGuidelinesModalProps> = ({
  isOpen,
  onClose,
  testConfig
}) => {
  if (!isOpen) return null;

  const activeTest = testConfig || getActiveAssessmentTest();
  const totalQuestions = activeTest?.totalQuestions || 50;
  const durationMinutes = activeTest?.durationMinutes || 60;
  const domains = activeTest?.domains && activeTest.domains.length > 0 ? activeTest.domains : [
    { id: 'calculus', name: 'Calculus & Differential Equations', questionCount: 10 },
    { id: 'probability', name: 'Probability & Statistics', questionCount: 10 },
    { id: 'numberSystem', name: 'Discrete Structures & Number Theory', questionCount: 10 },
    { id: 'trigonometry', name: 'Coordinate Geometry & Trigonometry', questionCount: 10 },
    { id: 'statistics', name: 'Linear Algebra & Matrices', questionCount: 10 }
  ];

  const dist = activeTest?.levelDistribution;
  let l1Count = 0;
  let l2Count = 0;
  let l3Count = 0;

  if (dist?.mode === 'count') {
    l1Count = dist.level1Count ?? Math.round(totalQuestions * 0.4);
    l2Count = dist.level2Count ?? Math.round(totalQuestions * 0.4);
    l3Count = dist.level3Count ?? Math.max(0, totalQuestions - (l1Count + l2Count));
  } else if (dist?.mode === 'domain_wise') {
    l1Count = domains.reduce((sum, d) => sum + (d.level1Count || 0), 0);
    l2Count = domains.reduce((sum, d) => sum + (d.level2Count || 0), 0);
    l3Count = domains.reduce((sum, d) => sum + (d.level3Count || 0), 0);
  } else {
    const p1 = dist?.level1Percentage ?? 40;
    const p2 = dist?.level2Percentage ?? 40;
    l1Count = Math.round((totalQuestions * p1) / 100);
    l2Count = Math.round((totalQuestions * p2) / 100);
    l3Count = Math.max(0, totalQuestions - (l1Count + l2Count));
  }

  const l1Pct = totalQuestions > 0 ? Math.round((l1Count / totalQuestions) * 100) : 40;
  const l2Pct = totalQuestions > 0 ? Math.round((l2Count / totalQuestions) * 100) : 40;
  const l3Pct = totalQuestions > 0 ? Math.max(0, 100 - (l1Pct + l2Pct)) : 20;

  const domainNamesStr = domains.map(d => d.name).join(', ');

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200"
    >
      <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl max-w-2xl w-full my-6 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-blue-700 via-indigo-700 to-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-white/10 rounded-lg">
              <HelpCircle className="w-5 h-5 text-blue-200" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold tracking-tight">
                Student Guidelines & Navigation Instructions
              </h2>
              <p className="text-[11px] text-blue-200 font-medium">
                {activeTest?.title || 'Mathematics Competency Assessment'} • Automated Computer Based Evaluation
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs text-slate-700">
          
          {/* Section 1: Assessment Specifications */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center gap-2 font-bold text-slate-900 text-xs sm:text-sm">
              <BookOpen className="w-4 h-4 text-blue-600 shrink-0" />
              <span>1. Assessment Specifications ({activeTest?.testCode || 'CIT-2026'})</span>
            </div>
            <ul className="space-y-1.5 pl-5 list-disc text-[11px] text-slate-600 font-medium">
              <li>
                <strong>Duration:</strong> {durationMinutes} minutes automated countdown timer displayed at the top header. Session auto-submits when time expires.
              </li>
              <li>
                <strong>Total Questions:</strong> {totalQuestions} Multiple Choice Questions across {domains.length} Mathematical Domains.
              </li>
              <li>
                <strong>Domains Covered:</strong> {domainNamesStr}.
              </li>
              <li>
                <strong>Marking Scheme:</strong> 1 mark per correct answer (Total: {totalQuestions} Marks). <em>No negative marking</em>.
              </li>
              <li>
                <strong>Cognitive Levels:</strong> Level 1 (Foundational) - {l1Pct}% ({l1Count} Questions), Level 2 (Analytical) - {l2Pct}% ({l2Count} Questions), Level 3 (Advanced Synthesis) - {l3Pct}% ({l3Count} Questions).
              </li>
            </ul>
          </div>

          {/* Section 2: Navigation & Interface Controls */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center gap-2 font-bold text-slate-900 text-xs sm:text-sm">
              <Compass className="w-4 h-4 text-indigo-600 shrink-0" />
              <span>2. Navigation & Interface Controls</span>
            </div>
            <div className="space-y-2 text-[11px] text-slate-600">
              <p>
                <strong>• Domain Switcher Tabs:</strong> Click any of the 5 mathematical domain tabs at the top to navigate between subjects at any time.
              </p>
              <p>
                <strong>• Question Palette (Right Panel):</strong> All 50 question numbers are displayed in a clean grid for direct one-click jumping:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 pl-2 text-[10px] font-medium">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-600 shrink-0" />
                  <strong>Blue:</strong> Answered
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
                  <strong>Yellow:</strong> Marked for Review
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-200 border border-slate-300 shrink-0" />
                  <strong>Gray:</strong> Unanswered
                </span>
              </div>
              <p>
                <strong>• Next Question:</strong> Click the blue <em>Next Question</em> button at the bottom right to advance sequentially. On the final question (#50), review your palette and proceed to submission.
              </p>
              <p>
                <strong>• Review & Clear:</strong> Use <em>Mark for Review</em> to flag questions for later check, or <em>Clear</em> to unselect an option.
              </p>
              <p>
                <strong>• Accessibility Mode:</strong> Toggle <em>Accessibility Mode</em> in the progress bar header to enlarge text (Large or XL font) for enhanced readability.
              </p>
            </div>
          </div>

          {/* Section 3: Test Security & Anti-Cheating Protocol */}
          <div className="bg-rose-50/70 border border-rose-200 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center gap-2 font-bold text-rose-900 text-xs sm:text-sm">
              <ShieldCheck className="w-4 h-4 text-rose-600 shrink-0" />
              <span>3. Anti-Copy & Screenshot Prohibition Rules</span>
            </div>
            <ul className="space-y-1.5 pl-5 list-disc text-[11px] text-rose-900/90 font-medium">
              <li>
                <strong>Single Active Login Policy:</strong> Each student must login with their unique institutional Register Number. Concurrent logins from multiple devices or browser windows are strictly prohibited and will be automatically blocked.
              </li>
              <li>
                <strong>No Pop-Up Windows:</strong> External pop-up windows, extra browser dialogs, or unverified alert prompts are suppressed. Only warnings issued by this proctoring system are permitted to display.
              </li>
              <li>
                <strong>No Screenshots:</strong> Screenshot capture tools, PrintScreen shortcuts, and OS snipping tools are strictly intercepted. Any screenshot attempt will immediately exit the assessment window with a security violation warning.
              </li>
              <li>
                <strong>No Copy / Window Selection:</strong> Copying, cutting, text selection, and right-click context menus are completely prohibited during the assessment.
              </li>
              <li>
                <strong>Zero-Tolerance Window & Tab Monitoring:</strong> Navigating away from the assessment window, minimizing the browser, or switching browser tabs is strictly prohibited. Any tab switch will immediately exit the assessment window with a warning and terminate the session.
              </li>
              <li>
                <strong>Real-Time Auto-Save:</strong> All answers are continuously saved locally and in real time. Even in case of network drops, progress is preserved.
              </li>
            </ul>
          </div>

          {/* Section 4: Submission Protocol */}
          <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3.5 space-y-1.5">
            <div className="flex items-center gap-2 font-bold text-emerald-900 text-xs sm:text-sm">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>4. Final Submission</span>
            </div>
            <p className="text-[11px] text-emerald-900/90 font-medium">
              Click the green <strong>Submit Assessment</strong> button when ready. A confirmation dialog will summarize answered and unanswered questions before locking in your final evaluation.
            </p>
          </div>

        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer shadow-sm"
          >
            Understood & Close
          </button>
        </div>
      </div>
    </div>
  );
};
