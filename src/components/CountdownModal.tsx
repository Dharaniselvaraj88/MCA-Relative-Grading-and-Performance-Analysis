import React, { useState, useEffect } from 'react';
import { StudentInfo } from '../types';
import { Brain, Clock, ShieldCheck, Sparkles, CheckCircle2 } from 'lucide-react';

interface CountdownModalProps {
  student: StudentInfo;
  onCountdownComplete: () => void;
}

const TOTAL_COUNTDOWN_SECONDS = 5;

export const CountdownModal: React.FC<CountdownModalProps> = ({
  student,
  onCountdownComplete
}) => {
  const [seconds, setSeconds] = useState(TOTAL_COUNTDOWN_SECONDS);

  useEffect(() => {
    if (seconds <= 0) {
      const timeout = setTimeout(() => {
        onCountdownComplete();
      }, 400);
      return () => clearTimeout(timeout);
    }

    const timer = setInterval(() => {
      setSeconds((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [seconds, onCountdownComplete]);

  // Calculate percentage progress (0s -> 100%, 10s -> 0%)
  const progressPercent = Math.min(100, Math.max(0, ((TOTAL_COUNTDOWN_SECONDS - seconds) / TOTAL_COUNTDOWN_SECONDS) * 100));

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-gradient-to-br from-orange-50 via-amber-100 to-orange-100 border-2 border-orange-300 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 text-center relative overflow-hidden animate-in fade-in zoom-in duration-300 text-slate-900">
        
        {/* Ambient Top Glow */}
        <div className="absolute -top-16 -left-16 w-32 h-32 bg-orange-400/20 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-16 -right-16 w-32 h-32 bg-amber-500/20 rounded-full blur-2xl pointer-events-none" />

        {/* Institution Badge Header */}
        <div className="flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider text-orange-900 bg-orange-200/80 border border-orange-300 py-1.5 px-4 rounded-full max-w-max mx-auto shadow-xs">
          <Brain className="w-4 h-4 text-orange-700" />
          <span>CIT Assessment Launchpad</span>
        </div>

        {/* Candidate Welcome */}
        <div className="space-y-1">
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Welcome, <span className="text-orange-700">{student.name}</span>
          </h2>
          <p className="text-xs text-slate-700 font-mono font-medium">
            Register Number: <span className="text-slate-900 font-bold">{student.registerNo}</span> • {student.department}
          </p>
        </div>

        {/* Big Animated 5-Second Countdown Badge */}
        <div className="relative my-4 flex items-center justify-center">
          <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full bg-white border-4 border-orange-400 flex items-center justify-center shadow-lg relative">
            {/* Pulsing ring */}
            <div className="absolute inset-0 rounded-full border-4 border-orange-500 animate-ping opacity-25" />
            
            <div className="text-center space-y-0.5 z-10">
              <span className="text-4xl sm:text-5xl font-black text-slate-900 font-mono tracking-tighter drop-shadow-xs">
                {seconds > 0 ? seconds : <CheckCircle2 className="w-12 h-12 text-emerald-600 animate-bounce" />}
              </span>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600">
                {seconds > 0 ? 'Seconds' : 'Launching'}
              </p>
            </div>
          </div>
        </div>

        {/* Animated Progress Bar */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-[11px] font-semibold text-slate-700">
            <span>Preparing Assessment...</span>
            <span className="text-orange-700 font-mono font-bold">{seconds}s</span>
          </div>
          <div className="w-full bg-orange-200/80 h-2.5 rounded-full overflow-hidden border border-orange-300">
            <div
              className="h-full bg-gradient-to-r from-orange-500 to-amber-500 transition-all duration-1000 ease-linear rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Quick Instructions list */}
        <div className="bg-white/80 border border-orange-200/90 rounded-2xl p-3.5 text-left text-[11px] text-slate-800 space-y-2 shadow-xs">
          <div className="flex items-center gap-2 text-slate-900 font-bold border-b border-orange-200/80 pb-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span>Important Test Guidelines</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-[10px]">
            <div className="flex items-center gap-1.5 font-medium">
              <Clock className="w-3 h-3 text-orange-600 shrink-0" />
              <span>60 Minutes Total</span>
            </div>
            <div className="flex items-center gap-1.5 font-medium">
              <ShieldCheck className="w-3 h-3 text-emerald-600 shrink-0" />
              <span>50 MCQs (5 Domains)</span>
            </div>
          </div>
          <p className="text-[10px] text-slate-600 italic">
            * Assessment will automatically open as soon as the countdown finishes.
          </p>
        </div>

      </div>
    </div>
  );
};
