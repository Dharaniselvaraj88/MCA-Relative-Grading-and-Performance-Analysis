import React, { useEffect, useState, useRef } from 'react';
import { ShieldAlert, AlertTriangle, Lock, Camera, ShieldCheck, EyeOff, Maximize2 } from 'lucide-react';
import { saveSecurityLogToFirestore } from '../lib/firebase';
import { StudentInfo } from '../types';

interface SecurityGuardProps {
  isActive: boolean; // True when assessment is ongoing
  children: React.ReactNode;
  studentInfo?: StudentInfo | null;
  userRole?: string;
  attemptCount?: number;
  maxAttempts?: number;
  savepointSummary?: {
    answeredCount: number;
    totalQuestions: number;
    timeRemainingText: string;
  };
  onViolationCountChange?: (count: number) => void;
  onTabSwitchInterrupted?: (attemptUsed: number, nextAttempt: number) => void;
  onResumeAssessment?: () => void;
  onSecurityLockout?: (reason: string) => void;
}

export const SecurityGuard: React.FC<SecurityGuardProps> = ({
  isActive,
  children,
  studentInfo,
  userRole = 'guest',
  attemptCount = 1,
  maxAttempts = 3,
  savepointSummary,
  onViolationCountChange,
  onTabSwitchInterrupted,
  onResumeAssessment,
  onSecurityLockout,
}) => {
  const [violationCount, setViolationCount] = useState(0);
  const [isWindowFocused, setIsWindowFocused] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(true);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [isScreenMasked, setIsScreenMasked] = useState(false);
  const [interruptionModal, setInterruptionModal] = useState<{
    isOpen: boolean;
    attemptUsed: number;
    remainingAttempts: number;
    nextAttempt: number;
    reason: string;
  } | null>(null);
  const lastLoggedRef = useRef<Record<string, number>>({});

  const requestFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      }
      setIsFullscreen(true);
    } catch (e) {
      console.warn('Fullscreen request failed or blocked by browser policy:', e);
      setIsFullscreen(!!document.fullscreenElement);
    }
  };

  const logIncident = (
    eventType: 
      | 'CONTEXT_MENU_BLOCKED'
      | 'COPY_CUT_BLOCKED'
      | 'SCREENSHOT_SHORTCUT_BLOCKED'
      | 'PRINT_ATTEMPT_BLOCKED'
      | 'DEVTOOLS_SHORTCUT_BLOCKED'
      | 'UNAUTHORIZED_WINDOW_SWITCH'
      | 'DEVTOOLS_OPENED_DETECTION',
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
    details: string
  ) => {
    // Throttle duplicate logs within 2 seconds to avoid spamming
    const now = Date.now();
    if (lastLoggedRef.current[eventType] && now - lastLoggedRef.current[eventType] < 2000) {
      return;
    }
    lastLoggedRef.current[eventType] = now;

    saveSecurityLogToFirestore({
      id: `sec_${now}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toLocaleString('en-US', {
        dateStyle: 'medium',
        timeStyle: 'medium'
      }),
      eventType,
      severity,
      details,
      userRegNo: studentInfo?.registerNo || 'N/A',
      userName: studentInfo?.name || (userRole === 'admin' ? 'System Administrator' : userRole === 'faculty' ? 'Faculty Member' : 'Anonymous Guest'),
      userRole: (userRole as any) || (studentInfo ? 'student' : 'guest'),
      ipOrDevice: navigator.userAgent.substring(0, 80),
      resolved: false
    });
  };

  const triggerSecurityToast = (msg: string) => {
    setToastMessage(msg);
    setShowToast(true);
    setIsScreenMasked(true);
    
    // Briefly mask screen to spoil print-screen / screenshot buffers
    setTimeout(() => {
      setIsScreenMasked(false);
    }, 800);

    setTimeout(() => {
      setShowToast(false);
    }, 4000);
  };

  // Global anti-copy & shortcut interceptor
  const isActiveRef = useRef(isActive);
  useEffect(() => {
    isActiveRef.current = isActive;
  }, [isActive]);

  useEffect(() => {
    const handleCopyCut = (e: ClipboardEvent) => {
      // Allow if typing inside editable input/textarea
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        return;
      }
      e.preventDefault();
      triggerSecurityToast('Copying and cutting content is strictly prohibited.');
      logIncident('COPY_CUT_BLOCKED', 'MEDIUM', 'User attempted to copy or cut application content.');
    };

    const handleSelectStart = (e: Event) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        return;
      }
      e.preventDefault();
    };

    // Right-click contextmenu & mouse button interceptor - strictly prevents context menu and right click actions
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      return false;
    };

    const handleMouseDown = (e: MouseEvent) => {
      // Button 2 is right-click
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

    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      const code = e.code;

      // PrintScreen / PrtScn key - ZERO TOLERANCE DURING ASSESSMENT
      if (code === 'PrintScreen' || key === 'printscreen' || key === 'snapshot') {
        e.preventDefault();
        e.stopPropagation();
        if (isActiveRef.current) {
          setIsScreenMasked(true);
          triggerSecurityToast('🚫 Screenshot capture attempt blocked! Assessment window is exiting.');
          logIncident('SCREENSHOT_SHORTCUT_BLOCKED', 'CRITICAL', 'PrintScreen key pressed during live assessment.');
          onSecurityLockout?.('SCREENSHOT_DETECTED');
          return false;
        } else {
          triggerSecurityToast('🚫 Screenshot capture attempt blocked! Screenshots are prohibited.');
          logIncident('SCREENSHOT_SHORTCUT_BLOCKED', 'HIGH', 'PrintScreen key pressed.');
          return false;
        }
      }

      // Windows Snipping Tool (Win+Shift+S), Mac Screenshots (Cmd+Shift+3/4/5), Ctrl+Shift+S
      if (
        (e.ctrlKey || e.metaKey) &&
        e.shiftKey &&
        (key === 's' || key === '3' || key === '4' || key === '5' || code === 'KeyS')
      ) {
        e.preventDefault();
        e.stopPropagation();
        if (isActiveRef.current) {
          setIsScreenMasked(true);
          triggerSecurityToast('🚫 Screen snipping / screenshot attempt blocked! Assessment window is exiting.');
          logIncident('SCREENSHOT_SHORTCUT_BLOCKED', 'CRITICAL', 'OS screenshot shortcut combination triggered during live assessment.');
          onSecurityLockout?.('SCREENSHOT_DETECTED');
          return false;
        } else {
          triggerSecurityToast('🚫 Screenshot shortcut blocked!');
          logIncident('SCREENSHOT_SHORTCUT_BLOCKED', 'HIGH', 'Screenshot shortcut combination triggered.');
          return false;
        }
      }

      // Ctrl+P / Cmd+P (Print)
      if ((e.ctrlKey || e.metaKey) && key === 'p') {
        if (isActiveRef.current) {
          e.preventDefault();
          e.stopPropagation();
          setIsScreenMasked(true);
          triggerSecurityToast('🚫 Printing or print-to-PDF is disabled during assessment. Exiting window.');
          logIncident('PRINT_ATTEMPT_BLOCKED', 'CRITICAL', 'Print shortcut (Ctrl+P / Cmd+P) triggered during live test.');
          onSecurityLockout?.('SCREENSHOT_DETECTED');
          return false;
        }
      }

      // Ctrl+S / Cmd+S (Save page)
      if ((e.ctrlKey || e.metaKey) && key === 's') {
        e.preventDefault();
        e.stopPropagation();
        triggerSecurityToast('🚫 Saving page source or assets is disabled.');
        return false;
      }

      // DevTools: F12, Ctrl+Shift+I, Ctrl+Shift+C, Cmd+Option+I, Ctrl+U (View Source)
      if (
        e.key === 'F12' ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && (key === 'i' || key === 'c' || key === 'j')) ||
        ((e.ctrlKey || e.metaKey) && key === 'u')
      ) {
        e.preventDefault();
        e.stopPropagation();
        triggerSecurityToast('🚫 Developer Tools & View Source are disabled.');
        logIncident('DEVTOOLS_SHORTCUT_BLOCKED', 'HIGH', 'DevTools / View Source shortcut triggered.');
        return false;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      const code = e.code;
      // Some browsers / OS only dispatch PrintScreen on keyup
      if (code === 'PrintScreen' || key === 'printscreen' || key === 'snapshot') {
        e.preventDefault();
        e.stopPropagation();
        if (isActiveRef.current) {
          setIsScreenMasked(true);
          triggerSecurityToast('🚫 Screenshot capture attempt blocked! Assessment window is exiting.');
          logIncident('SCREENSHOT_SHORTCUT_BLOCKED', 'CRITICAL', 'PrintScreen keyup event detected during live assessment.');
          onSecurityLockout?.('SCREENSHOT_DETECTED');
          return false;
        }
      }
    };

    const handleBeforePrint = (e: Event) => {
      if (isActiveRef.current) {
        e.preventDefault();
        setIsScreenMasked(true);
        logIncident('PRINT_ATTEMPT_BLOCKED', 'CRITICAL', 'Browser print dialog attempted during live assessment.');
        onSecurityLockout?.('SCREENSHOT_DETECTED');
      }
    };

    // DevTools open size threshold detector
    const devToolsCheckInterval = setInterval(() => {
      const threshold = 170;
      const widthDiff = window.outerWidth - window.innerWidth > threshold;
      const heightDiff = window.outerHeight - window.innerHeight > threshold;
      if (widthDiff || heightDiff) {
        logIncident('DEVTOOLS_OPENED_DETECTION', 'CRITICAL', `Browser Developer Console opened (Viewport diff: ${window.outerWidth - window.innerWidth}x${window.outerHeight - window.innerHeight}).`);
      }
    }, 3000);

    window.addEventListener('copy', handleCopyCut);
    window.addEventListener('cut', handleCopyCut);
    window.addEventListener('selectstart', handleSelectStart);
    window.addEventListener('contextmenu', handleContextMenu, true);
    document.addEventListener('contextmenu', handleContextMenu, true);
    window.addEventListener('mousedown', handleMouseDown, true);
    document.addEventListener('mousedown', handleMouseDown, true);
    window.addEventListener('auxclick', handleAuxClick, true);
    document.addEventListener('auxclick', handleAuxClick, true);
    window.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('keyup', handleKeyUp, true);
    window.addEventListener('beforeprint', handleBeforePrint);

    return () => {
      clearInterval(devToolsCheckInterval);
      window.removeEventListener('copy', handleCopyCut);
      window.removeEventListener('cut', handleCopyCut);
      window.removeEventListener('selectstart', handleSelectStart);
      window.removeEventListener('contextmenu', handleContextMenu, true);
      document.removeEventListener('contextmenu', handleContextMenu, true);
      window.removeEventListener('mousedown', handleMouseDown, true);
      document.removeEventListener('mousedown', handleMouseDown, true);
      window.removeEventListener('auxclick', handleAuxClick, true);
      document.removeEventListener('auxclick', handleAuxClick, true);
      window.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('keyup', handleKeyUp, true);
      window.removeEventListener('beforeprint', handleBeforePrint);
    };
  }, [studentInfo, userRole, onSecurityLockout]);

  // Assessment Window Switching & Focus Loss Handling (Active when assessment is running)
  // ZERO TOLERANCE: Do not allow tab switches or screenshots. Exit the window immediately with a warning.
  const switchCountRef = useRef(0);
  const isSwitchedOutRef = useRef(false);

  useEffect(() => {
    if (!isActive) {
      switchCountRef.current = 0;
      isSwitchedOutRef.current = false;
      setViolationCount(0);
      setIsWindowFocused(true);
      return;
    }

    // Prohibit and intercept all pop-up windows during assessment
    const originalOpen = window.open;
    const originalAlert = window.alert;
    const originalConfirm = window.confirm;
    const originalPrompt = window.prompt;

    // Override window.open to suppress pop-up windows
    window.open = function (...args: any[]) {
      console.warn('Pop-up window blocked during assessment:', args);
      logIncident(
        'UNAUTHORIZED_WINDOW_SWITCH',
        'HIGH',
        'Attempted to launch pop-up window during assessment.'
      );
      triggerSecurityToast('🚫 Pop-up windows are strictly prohibited during assessment.');
      return null;
    };

    // Override browser native pop-up dialogs
    window.alert = function (msg?: any) {
      console.warn('Browser alert pop-up blocked during assessment:', msg);
    };

    window.confirm = function (msg?: string) {
      console.warn('Browser confirm pop-up blocked during assessment:', msg);
      return false;
    };

    window.prompt = function (msg?: string) {
      console.warn('Browser prompt pop-up blocked during assessment:', msg);
      return null;
    };

    // Intercept clicks on links or elements attempting to open new pop-up windows
    const handlePopUpClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement)?.closest('a');
      if (
        target &&
        (target.target === '_blank' ||
          target.target === '_popup' ||
          target.getAttribute('rel')?.includes('external') ||
          target.hasAttribute('onclick'))
      ) {
        e.preventDefault();
        e.stopPropagation();
        triggerSecurityToast('🚫 External pop-up links are disabled during assessment.');
        logIncident(
          'UNAUTHORIZED_WINDOW_SWITCH',
          'MEDIUM',
          `Attempted to open external pop-up link: ${target.href || 'N/A'}`
        );
      }
    };

    window.addEventListener('click', handlePopUpClick, true);

    let blurTimeout: any = null;

    const handleWindowSwitch = (eventSource: string) => {
      // Ignore if document is still visibly in foreground and focused inside the page
      if (!document.hidden && document.visibilityState === 'visible' && document.hasFocus()) {
        return;
      }

      if (isSwitchedOutRef.current) return; // Prevent duplicate triggers
      isSwitchedOutRef.current = true;

      const newCount = switchCountRef.current + 1;
      switchCountRef.current = newCount;
      setViolationCount(newCount);
      onViolationCountChange?.(newCount);

      // Mask screen immediately to protect question visibility
      const currentAttempt = attemptCount || 1;
      const maxAllowed = maxAttempts || 3;

      if (currentAttempt < maxAllowed) {
        const nextAttempt = currentAttempt + 1;
        setIsScreenMasked(true);
        setIsWindowFocused(false);
        setInterruptionModal({
          isOpen: true,
          attemptUsed: currentAttempt,
          remainingAttempts: maxAllowed - currentAttempt,
          nextAttempt,
          reason: 'Tab switch or window minimization detected'
        });

        logIncident(
          'UNAUTHORIZED_WINDOW_SWITCH',
          'HIGH',
          `Tab switch detected (${eventSource}). Attempt ${currentAttempt} of ${maxAllowed} used. ${maxAllowed - currentAttempt} attempt(s) remaining. Savepoint preserved.`
        );

        onTabSwitchInterrupted?.(currentAttempt, nextAttempt);
      } else {
        // Exceeded 3 attempts!
        setIsScreenMasked(true);
        setIsWindowFocused(false);
        setInterruptionModal({
          isOpen: true,
          attemptUsed: maxAllowed,
          remainingAttempts: 0,
          nextAttempt: maxAllowed,
          reason: 'Maximum 3 attempts exceeded. Finalizing assessment.'
        });

        logIncident(
          'UNAUTHORIZED_WINDOW_SWITCH',
          'CRITICAL',
          `Maximum allowed ${maxAllowed} attempts exceeded due to repeated tab switch (${eventSource}). Assessment terminated.`
        );

        onSecurityLockout?.('MAX_ATTEMPTS_EXCEEDED_TAB_SWITCH');
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden || document.visibilityState === 'hidden') {
        handleWindowSwitch('visibilitychange_hidden');
      }
    };

    const handleWindowBlur = () => {
      // Debounce window blur 120ms to allow clicks within form elements, then check focus
      if (blurTimeout) clearTimeout(blurTimeout);
      blurTimeout = setTimeout(() => {
        if (document.hidden || document.visibilityState === 'hidden' || !document.hasFocus()) {
          handleWindowSwitch('window_blur');
        }
      }, 120);
    };

    const handleWindowFocus = () => {
      if (blurTimeout) {
        clearTimeout(blurTimeout);
        blurTimeout = null;
      }
    };

    // Fullscreen enforcement during assessment
    const handleFullscreenChange = () => {
      const isFS = !!document.fullscreenElement;
      setIsFullscreen(isFS);
      if (!isFS && isActive) {
        logIncident('UNAUTHORIZED_WINDOW_SWITCH', 'MEDIUM', 'Student exited full screen mode during live assessment.');
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    // Initial fullscreen request when assessment becomes active
    if (isActive) {
      requestFullscreen();
    }

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('focus', handleWindowFocus);

    return () => {
      if (blurTimeout) clearTimeout(blurTimeout);
      window.open = originalOpen;
      window.alert = originalAlert;
      window.confirm = originalConfirm;
      window.prompt = originalPrompt;
      window.removeEventListener('click', handlePopUpClick, true);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('focus', handleWindowFocus);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, [isActive, studentInfo, userRole, onViolationCountChange, onSecurityLockout]);

  const handleResumeFromModal = () => {
    requestFullscreen();
    isSwitchedOutRef.current = false;
    setIsScreenMasked(false);
    setInterruptionModal(null);
    onResumeAssessment?.();
  };

  return (
    <div className="relative min-h-screen select-none">
      {/* Interactive Interruption & Tab Switch 3-Attempt Modal */}
      {interruptionModal?.isOpen && (
        <div className="fixed inset-0 z-[99999] bg-slate-950/95 backdrop-blur-md flex flex-col items-center justify-center p-4 sm:p-6 text-center text-white select-none animate-in fade-in duration-200">
          <div className="max-w-md sm:max-w-lg w-full bg-slate-900 border-2 border-amber-500/50 rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col items-center text-center">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 border ${
              interruptionModal.remainingAttempts > 0
                ? 'bg-amber-500/20 border-amber-500/40 text-amber-400'
                : 'bg-rose-500/20 border-rose-500/40 text-rose-400 animate-pulse'
            }`}>
              {interruptionModal.remainingAttempts > 0 ? (
                <AlertTriangle className="w-9 h-9 animate-bounce" />
              ) : (
                <Lock className="w-9 h-9" />
              )}
            </div>

            <span className="text-[10px] font-mono uppercase tracking-widest text-amber-400 font-bold mb-1">
              COIMBATORE INSTITUTE OF TECHNOLOGY • PROCTORING SYSTEM
            </span>

            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white mb-2">
              {interruptionModal.remainingAttempts > 0
                ? 'TAB SWITCH OVER DETECTED'
                : 'MAXIMUM ATTEMPTS EXCEEDED'}
            </h2>

            <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/10 border border-amber-500/30 rounded-full text-[11px] font-mono text-amber-300 font-bold uppercase tracking-wider mb-3">
              <span>Attempt {interruptionModal.attemptUsed} of {maxAttempts} Used</span>
              <span>•</span>
              <span className={interruptionModal.remainingAttempts > 0 ? 'text-amber-200' : 'text-rose-300'}>
                {interruptionModal.remainingAttempts} Attempt(s) Remaining
              </span>
            </div>

            <p className="text-xs sm:text-sm text-slate-300 font-medium mb-4 leading-relaxed">
              {interruptionModal.remainingAttempts > 0 ? (
                <>
                  Switching tabs, minimizing windows, or navigating away during the examination is strictly prohibited. All your answers and timer progress have been safely preserved at your <strong>last savepoint</strong>.
                </>
              ) : (
                <>
                  You have exhausted all 3 permitted attempts for this assessment session. In accordance with examination regulations, your assessment has been automatically finalized from your last savepoint.
                </>
              )}
            </p>

            {/* Savepoint Confirmation Details Card */}
            <div className="w-full bg-slate-950/80 border border-slate-800 rounded-2xl p-4 mb-5 text-left text-xs font-mono">
              <div className="flex items-center justify-between text-slate-400 mb-2 pb-2 border-b border-slate-800">
                <span className="font-bold text-slate-300 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>ASSESSMENT SAVEPOINT STATUS:</span>
                </span>
                <span className="text-emerald-400 font-bold text-[10px] uppercase bg-emerald-950/60 border border-emerald-800 px-2 py-0.5 rounded">
                  Preserved
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <span className="text-slate-500 block">Candidate:</span>
                  <span className="text-white font-bold truncate block">{studentInfo?.name || 'Candidate'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Register No:</span>
                  <span className="text-amber-300 font-bold">{studentInfo?.registerNo || 'N/A'}</span>
                </div>
                {savepointSummary && (
                  <>
                    <div>
                      <span className="text-slate-500 block">Saved Answers:</span>
                      <span className="text-emerald-300 font-bold">
                        {savepointSummary.answeredCount} / {savepointSummary.totalQuestions} Questions
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Time Remaining:</span>
                      <span className="text-blue-300 font-bold">{savepointSummary.timeRemainingText}</span>
                    </div>
                  </>
                )}
                <div>
                  <span className="text-slate-500 block">Next Action:</span>
                  <span className="text-slate-300 font-bold">
                    {interruptionModal.remainingAttempts > 0
                      ? `Resume Attempt ${interruptionModal.nextAttempt} of ${maxAttempts}`
                      : 'Final Lockout'}
                  </span>
                </div>
              </div>
            </div>

            {interruptionModal.remainingAttempts > 0 ? (
              <div className="w-full flex flex-col gap-2">
                <button
                  type="button"
                  onClick={handleResumeFromModal}
                  className="w-full py-3.5 px-5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-xs sm:text-sm font-black rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <Maximize2 className="w-4 h-4" />
                  <span>Resume Assessment from Last Savepoint (Attempt {interruptionModal.nextAttempt})</span>
                </button>
                <span className="text-[10px] text-rose-400 font-semibold mt-1">
                  ⚠️ Note: Reaching 3 violations will permanently lock and conclude your assessment.
                </span>
              </div>
            ) : (
              <div className="w-full py-3 px-4 bg-rose-900/40 border border-rose-700/60 rounded-xl text-rose-200 text-xs font-mono font-bold flex items-center justify-center gap-2">
                <Lock className="w-4 h-4 text-rose-400" />
                <span>ALL 3 ATTEMPTS CONSUMED • PORTAL LOCKED</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Fallback Visual Masking Screen for unauthorized screenshot capture */}
      {isScreenMasked && !interruptionModal?.isOpen && (
        <div className="fixed inset-0 z-[99999] bg-slate-950 flex flex-col items-center justify-center p-6 text-center text-white select-none animate-in fade-in duration-100">
          <div className="w-16 h-16 rounded-2xl bg-rose-600/20 border border-rose-500/40 flex items-center justify-center mb-4 animate-pulse">
            <ShieldAlert className="w-10 h-10 text-rose-500" />
          </div>
          <span className="text-[10px] font-mono uppercase tracking-widest text-rose-400 font-bold mb-1">
            COIMBATORE INSTITUTE OF TECHNOLOGY • PROCTORING SYSTEM
          </span>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white mb-2">
            PROCTORING VIOLATION DETECTED
          </h2>
          <p className="text-xs sm:text-sm text-rose-200 font-medium max-w-md mb-4 leading-relaxed">
            Unauthorized screenshot capture or external window focus detected. Your responses have been saved at the current savepoint.
          </p>
          <button
            type="button"
            onClick={handleResumeFromModal}
            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow cursor-pointer flex items-center gap-2"
          >
            <Maximize2 className="w-4 h-4" />
            <span>Return to Assessment Window</span>
          </button>
        </div>
      )}

      {/* Floating Toast Message */}
      {showToast && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[99998] max-w-md w-full px-4 animate-in slide-in-from-top duration-200">
          <div className="bg-rose-600 text-white px-4 py-3 rounded-xl shadow-2xl border border-rose-700 flex items-center gap-3">
            <ShieldAlert className="w-5 h-5 text-white shrink-0" />
            <p className="text-xs font-bold leading-tight">{toastMessage}</p>
          </div>
        </div>
      )}

      {/* Subtle Security & Anti-Leak Watermark Overlay */}
      <div className="fixed inset-0 pointer-events-none z-[9990] overflow-hidden opacity-[0.035] flex flex-col justify-around rotate-[-15deg] select-none text-slate-900 font-mono font-black text-xs sm:text-sm uppercase tracking-widest whitespace-nowrap">
        <div className="flex justify-between gap-12">
          <span>CIT COGNITIVE ASSESSMENT SYSTEM</span>
          <span>ADMIN PROTECTED • DO NOT COPY</span>
          <span>CONFIDENTIAL SESSION</span>
        </div>
        <div className="flex justify-between gap-12">
          <span>UNAUTHORIZED ACCESS PROHIBITED</span>
          <span>REG: {studentInfo?.registerNo || 'PROTECTED-NODE'}</span>
          <span>STRICT PROCTORING</span>
        </div>
        <div className="flex justify-between gap-12">
          <span>CIT COGNITIVE ASSESSMENT SYSTEM</span>
          <span>ADMIN PROTECTED • DO NOT COPY</span>
          <span>CONFIDENTIAL SESSION</span>
        </div>
      </div>

      {/* Main App Content */}
      <div className="transition-all duration-300">
        {children}
      </div>
    </div>
  );
};

