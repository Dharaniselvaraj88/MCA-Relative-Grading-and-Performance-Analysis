import React, { useState } from 'react';
import { Clock, User, LogOut, Brain, Layers, BarChart3, HardDrive, X, Wifi, WifiOff, RefreshCw, CheckCircle2 } from 'lucide-react';
import { StudentInfo } from '../types';
import { ShortcutModal } from './ShortcutModal';
import { CITLogo } from './CITLogo';

interface HeaderProps {
  student: StudentInfo | null;
  timeRemainingSeconds: number;
  isTimerActive: boolean;
  answeredCount: number;
  totalQuestions: number;
  onLogout: () => void;
  onGoHome?: () => void;
  onSubmitEarly?: () => void;
  onToggleAdminView?: () => void;
  isAdminView?: boolean;
  isAssessmentView?: boolean;
  isOnline?: boolean;
  pendingSyncCount?: number;
  extraMinutes?: number;
}

export const Header: React.FC<HeaderProps> = ({
  student,
  timeRemainingSeconds,
  isTimerActive,
  answeredCount,
  totalQuestions,
  onLogout,
  onGoHome,
  onSubmitEarly,
  onToggleAdminView,
  isAdminView = false,
  isAssessmentView = false,
  isOnline = true,
  pendingSyncCount = 0,
  extraMinutes = 0
}) => {
  const [logoError, setLogoError] = useState(false);
  const [isShortcutModalOpen, setIsShortcutModalOpen] = useState(false);
  const [shortcutModalDefaultRole, setShortcutModalDefaultRole] = useState<'student' | 'faculty' | 'admin'>('student');

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const progressPct = Math.round((answeredCount / totalQuestions) * 100);

  const getTimerColor = () => {
    if (timeRemainingSeconds <= 300) return 'text-red-600 font-mono font-extrabold animate-pulse';
    if (timeRemainingSeconds <= 600) return 'text-amber-700 font-mono font-bold';
    return 'text-slate-800 font-mono font-bold';
  };

  const is5MinWarning = isTimerActive && timeRemainingSeconds > 0 && timeRemainingSeconds <= 300;

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-slate-200 text-slate-800 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          
          {/* Institution Branding */}
          <button
            type="button"
            onClick={student && !isAdminView && isAssessmentView ? undefined : onGoHome}
            disabled={!!(student && !isAdminView && isAssessmentView)}
            title={student && !isAdminView && isAssessmentView ? "Active Assessment Session" : "Return to Login Portal"}
            className={`flex items-center gap-3 sm:gap-3.5 w-full md:w-auto text-left focus:outline-none ${student && !isAdminView && isAssessmentView ? 'cursor-default' : 'cursor-pointer group'}`}
          >
            <CITLogo className="w-10 h-10 sm:w-11 sm:h-11 shrink-0" />
            <div>
              <div className="flex items-center gap-2">
                <h1 className={`text-sm sm:text-base font-bold tracking-tight text-slate-900 uppercase font-sans ${student && !isAdminView && isAssessmentView ? '' : 'group-hover:text-blue-600'} transition-colors`}>
                  Coimbatore Institute of Technology
                </h1>
                <span className="hidden sm:inline-block px-2 py-0.5 text-[10px] uppercase font-bold tracking-wider bg-blue-50 text-blue-700 rounded border border-blue-200">
                  Autonomous Institution
                </span>
              </div>
              <div className="mt-0.5 text-[11px] font-medium">
                <p className="text-slate-600 font-semibold">
                  Empowering Knowledge, Shaping Futures
                </p>
              </div>
            </div>
          </button>

          {/* Active Assessment Controls & Student Info */}
          {student && !isAdminView && isAssessmentView && (
            <div className="flex flex-wrap items-center justify-between md:justify-end gap-4 w-full md:w-auto border-t md:border-t-0 pt-2 md:pt-0 border-slate-200">
              
              {/* Progress Summary */}
              <div className="flex flex-col min-w-[130px]">
                <div className="flex justify-between text-[11px] mb-1 font-mono text-slate-700 font-medium">
                  <span className="text-slate-500">Progress:</span>
                  <span className="text-blue-600 font-bold">{answeredCount} / {totalQuestions} ({progressPct}%)</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden border border-slate-200">
                  <div
                    className="bg-blue-600 h-full rounded-full transition-all duration-300"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
              </div>

              {/* Countdown Timer */}
              {isTimerActive && (
                <div className={`flex flex-col items-center md:items-end px-3 py-1 rounded-lg shadow-2xs border transition-all ${
                  is5MinWarning
                    ? 'bg-rose-50 border-rose-300 ring-2 ring-rose-400/50 animate-pulse'
                    : 'bg-amber-50 border-amber-200'
                }`}>
                  <div className="flex items-center gap-1.5">
                    <span className={`text-[9px] uppercase font-extrabold tracking-wider ${is5MinWarning ? 'text-rose-800' : 'text-amber-800'}`}>
                      {is5MinWarning ? '⚠️ 5-Min Warning' : 'Time Remaining'}
                    </span>
                    {extraMinutes > 0 && (
                      <span className="px-1.5 py-0.2 bg-purple-600 text-white text-[9px] font-mono font-extrabold rounded-full animate-pulse shadow-2xs">
                        +{extraMinutes}m Extra
                      </span>
                    )}
                  </div>
                  <div className={`flex items-center gap-1.5 text-lg ${getTimerColor()}`}>
                    <Clock className={`w-4 h-4 ${is5MinWarning ? 'text-rose-600 animate-spin' : 'text-amber-600'}`} />
                    <span>{formatTime(timeRemainingSeconds)}</span>
                  </div>
                </div>
              )}

              {/* Network Connectivity & Offline Mode Status */}
              <div className="flex items-center">
                {!isOnline ? (
                  <div
                    title="Offline Mode Active: Your test progress and answers are being continuously auto-saved locally in real time."
                    className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-100/90 text-amber-900 border border-amber-300 rounded-lg text-[11px] font-bold shadow-2xs animate-pulse"
                  >
                    <WifiOff className="w-3.5 h-3.5 text-amber-700" />
                    <span>Offline (Auto-Saving)</span>
                  </div>
                ) : pendingSyncCount > 0 ? (
                  <div
                    title={`${pendingSyncCount} pending offline submission(s) syncing...`}
                    className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-100 text-blue-900 border border-blue-300 rounded-lg text-[11px] font-bold shadow-2xs"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-blue-700 animate-spin" />
                    <span>Syncing ({pendingSyncCount})</span>
                  </div>
                ) : (
                  <div
                    title="Online: Connected to Firestore realtime database."
                    className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-[11px] font-bold"
                  >
                    <Wifi className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Online</span>
                  </div>
                )}
              </div>

              {/* Student Identity Badge */}
              <div className="hidden lg:flex items-center gap-2.5 px-3 py-1.5 bg-slate-100 rounded-lg border border-slate-200 text-xs">
                <div className="w-7 h-7 rounded bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                  {student.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || student.name.charAt(0)}
                </div>
                <div className="text-left">
                  <p className="text-slate-900 font-bold text-xs truncate max-w-[120px]">{student.name}</p>
                  <p className="text-slate-500 text-[10px] font-mono font-medium">{student.registerNo}</p>
                </div>
              </div>

              {/* Admin Portal Toggle */}
              {onToggleAdminView && (
                <button
                  onClick={onToggleAdminView}
                  title="Admin Portal"
                  className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg border border-slate-200 transition-colors cursor-pointer"
                >
                  <BarChart3 className="w-4 h-4 text-emerald-600" />
                </button>
              )}
            </div>
          )}

          {/* Admin Header Mode */}
          {isAdminView && (
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                onClick={() => {
                  setShortcutModalDefaultRole('admin');
                  setIsShortcutModalOpen(true);
                }}
                className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-blue-700 rounded-lg border border-slate-200 transition-colors flex items-center gap-1.5 text-xs font-bold cursor-pointer"
                title="Portal Shortcut Icons & Direct Launch System for Admin, Staff, and Student"
              >
                <HardDrive className="w-3.5 h-3.5 text-blue-600" />
                <span>Portal Shortcuts</span>
              </button>
              <button
                onClick={onToggleAdminView}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-lg border border-slate-200 transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <LogOut className="w-3.5 h-3.5 text-slate-600" />
                <span>Logout</span>
              </button>
            </div>
          )}

        </div>
      </div>

      <ShortcutModal
        isOpen={isShortcutModalOpen}
        onClose={() => setIsShortcutModalOpen(false)}
        defaultRole={shortcutModalDefaultRole}
      />
    </header>
  );
};
