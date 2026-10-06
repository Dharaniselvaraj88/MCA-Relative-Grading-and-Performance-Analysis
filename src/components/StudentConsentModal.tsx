import React, { useState } from 'react';
import { StudentInfo } from '../types';
import { saveSecurityLogToFirestore } from '../lib/firebase';
import {
  ShieldCheck,
  Lock,
  Key,
  CheckCircle2,
  AlertCircle,
  FileText,
  User,
  CreditCard,
  Building2,
  Sparkles,
  X,
  ArrowRight,
  ShieldAlert,
  Eye,
  CheckSquare,
  Square
} from 'lucide-react';

interface StudentConsentModalProps {
  student: StudentInfo;
  isOpen: boolean;
  onConsentAndProceed: () => void;
  onCancel: () => void;
}

export const StudentConsentModal: React.FC<StudentConsentModalProps> = ({
  student,
  isOpen,
  onConsentAndProceed,
  onCancel
}) => {
  const [hasAcceptedIntegrityPledge, setHasAcceptedIntegrityPledge] = useState(false);
  const [hasAcceptedProctoring, setHasAcceptedProctoring] = useState(false);
  const [hasAcceptedSingleAttempt, setHasAcceptedSingleAttempt] = useState(false);
  const [isSubmittingConsent, setIsSubmittingConsent] = useState(false);

  if (!isOpen) return null;

  const isAllConsentsChecked =
    hasAcceptedIntegrityPledge && hasAcceptedProctoring && hasAcceptedSingleAttempt;

  const handleConfirmConsent = () => {
    if (!isAllConsentsChecked) return;

    setIsSubmittingConsent(true);

    // Record student consent & security log in Firestore
    saveSecurityLogToFirestore({
      id: `sec_consent_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toLocaleString(),
      eventType: 'QUESTION_BANK_ACCEPTED_AND_CONDUCTED', // mapped type or logged details
      severity: 'LOW',
      details: `Student candidate ${student.name} (${student.registerNo}) formally agreed to exam consent & security policies (Integrity, Confidentiality & Authenticity).`,
      userRegNo: student.registerNo,
      userName: student.name,
      userRole: 'student'
    });

    setTimeout(() => {
      setIsSubmittingConsent(false);
      onConsentAndProceed();
    }, 300);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 md:p-6 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-3xl w-full my-auto shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* HEADER BANNER */}
        <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-5 sm:p-6 border-b border-blue-800 flex items-start justify-between gap-4 shrink-0">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-blue-500/20 text-blue-300 rounded-xl border border-blue-400/30">
                <ShieldCheck className="w-6 h-6 text-blue-300" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold tracking-widest text-blue-300 font-mono">
                  COIMBATORE INSTITUTE OF TECHNOLOGY
                </span>
                <h2 className="text-lg sm:text-xl font-extrabold text-white tracking-tight">
                  Student Examination Consent & Security Declaration
                </h2>
              </div>
            </div>
            <p className="text-xs text-blue-200/90 leading-relaxed font-medium">
              Please review the academic integrity pledge, examination security guarantees, and provide your formal consent before entering the assessment.
            </p>
          </div>

          <button
            onClick={onCancel}
            className="p-1.5 bg-blue-950/60 hover:bg-rose-600 text-blue-200 hover:text-white rounded-lg transition-colors cursor-pointer shrink-0"
            title="Cancel & Exit"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* CANDIDATE CREDENTIAL SUMMARY BAR */}
        <div className="bg-slate-900 text-slate-200 px-5 py-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0 font-sans">
          <div className="flex items-center gap-2">
            <User className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-slate-400">Candidate:</span>
            <strong className="text-white font-bold">{student.name}</strong>
          </div>

          <div className="flex items-center gap-2 font-mono">
            <CreditCard className="w-3.5 h-3.5 text-indigo-400" />
            <span className="text-slate-400">Register Number:</span>
            <strong className="text-blue-300 font-bold">{student.registerNo}</strong>
          </div>

          <div className="flex items-center gap-2">
            <Building2 className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-slate-400">Department:</span>
            <span className="text-slate-200 font-medium">{student.department || 'B.E. Civil Engineering'}</span>
          </div>
        </div>

        {/* MODAL CONTENT SCROLLABLE BODY */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 text-slate-800 text-xs leading-relaxed">
          
          {/* SECTION 1: SECURITY ASSURANCES GRID (INTEGRITY, CONFIDENTIALITY, AUTHENTICITY) */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-slate-900 font-extrabold text-sm border-b border-slate-200 pb-2">
              <Sparkles className="w-4 h-4 text-blue-600" />
              <span>Examination Security & Platform Guarantees</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
              
              {/* 1. INTEGRITY */}
              <div className="bg-blue-50/60 border border-blue-200 rounded-xl p-4 space-y-2.5 shadow-xs hover:border-blue-300 transition-colors">
                <div className="flex items-center gap-2 text-blue-900 font-bold text-xs">
                  <div className="p-1.5 bg-blue-600 text-white rounded-lg">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <span>1. Integrity</span>
                </div>
                <p className="text-[11px] text-slate-600 font-medium leading-relaxed">
                  Guarantees a fair and uncompromised testing environment for all candidates.
                </p>
                <ul className="space-y-1.5 text-[11px] text-slate-700">
                  <li className="flex items-start gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                    <span><strong>Randomized Paper:</strong> 50 questions dynamically sampled per student.</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                    <span><strong>Proctored Locks:</strong> Real-time detection of tab/window switches.</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                    <span><strong>Anti-Cheating:</strong> Copy-paste & right-click context menu disabled.</span>
                  </li>
                </ul>
              </div>

              {/* 2. CONFIDENTIALITY */}
              <div className="bg-indigo-50/60 border border-indigo-200 rounded-xl p-4 space-y-2.5 shadow-xs hover:border-indigo-300 transition-colors">
                <div className="flex items-center gap-2 text-indigo-900 font-bold text-xs">
                  <div className="p-1.5 bg-indigo-600 text-white rounded-lg">
                    <Lock className="w-4 h-4" />
                  </div>
                  <span>2. Confidentiality</span>
                </div>
                <p className="text-[11px] text-slate-600 font-medium leading-relaxed">
                  Protects candidate responses, personal identity, and performance reports.
                </p>
                <ul className="space-y-1.5 text-[11px] text-slate-700">
                  <li className="flex items-start gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
                    <span><strong>Encrypted Vault:</strong> Submissions encrypted in Cloud Firestore.</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
                    <span><strong>Role Privacy:</strong> Reports accessible only by Admin & Faculty.</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
                    <span><strong>Secure Sync:</strong> Encrypted offline session sync safeguards data loss.</span>
                  </li>
                </ul>
              </div>

              {/* 3. AUTHENTICITY */}
              <div className="bg-purple-50/60 border border-purple-200 rounded-xl p-4 space-y-2.5 shadow-xs hover:border-purple-300 transition-colors">
                <div className="flex items-center gap-2 text-purple-900 font-bold text-xs">
                  <div className="p-1.5 bg-purple-600 text-white rounded-lg">
                    <Key className="w-4 h-4" />
                  </div>
                  <span>3. Authenticity</span>
                </div>
                <p className="text-[11px] text-slate-600 font-medium leading-relaxed">
                  Verifies candidate identity and prevents unauthorized score tampering.
                </p>
                <ul className="space-y-1.5 text-[11px] text-slate-700">
                  <li className="flex items-start gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-purple-600 shrink-0 mt-0.5" />
                    <span><strong>Verified Register Number:</strong> Multi-factor PIN & Register Number validation.</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-purple-600 shrink-0 mt-0.5" />
                    <span><strong>Digital Signatures:</strong> Every report features a unique QR hash.</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-purple-600 shrink-0 mt-0.5" />
                    <span><strong>Audit Trail:</strong> Immutable security logging of all assessment events.</span>
                  </li>
                </ul>
              </div>

            </div>
          </div>

          {/* SECTION 2: STUDENT MANDATORY CONSENT ACKNOWLEDGMENTS */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-xs border-b border-slate-200 pb-2">
              <CheckSquare className="w-4 h-4 text-emerald-600" />
              <span>Mandatory Candidate Consent & Honor Code Affirmation</span>
            </div>

            <div className="space-y-2.5 text-xs">
              
              {/* Check 1 */}
              <label className={`p-3 rounded-lg border transition-all flex items-start gap-3 cursor-pointer select-none ${
                hasAcceptedIntegrityPledge
                  ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950 font-medium shadow-2xs'
                  : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
              }`}>
                <input
                  type="checkbox"
                  checked={hasAcceptedIntegrityPledge}
                  onChange={(e) => setHasAcceptedIntegrityPledge(e.target.checked)}
                  className="mt-0.5 w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer shrink-0"
                />
                <div className="space-y-0.5">
                  <strong className="block text-slate-900 font-bold">1. Academic Honor Code Pledge</strong>
                  <p className="text-[11px] text-slate-600">
                    I pledge on my honor that I will answer all questions independently without using unauthorized secondary devices, online search engines, AI helpers, or external calculators.
                  </p>
                </div>
              </label>

              {/* Check 2 */}
              <label className={`p-3 rounded-lg border transition-all flex items-start gap-3 cursor-pointer select-none ${
                hasAcceptedProctoring
                  ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950 font-medium shadow-2xs'
                  : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
              }`}>
                <input
                  type="checkbox"
                  checked={hasAcceptedProctoring}
                  onChange={(e) => setHasAcceptedProctoring(e.target.checked)}
                  className="mt-0.5 w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer shrink-0"
                />
                <div className="space-y-0.5">
                  <strong className="block text-slate-900 font-bold">2. Zero-Tolerance Tab Switch & Screenshot Prohibition Consent</strong>
                  <p className="text-[11px] text-slate-600">
                    I agree to strict anti-cheating rules: switching browser tabs, navigating away from the assessment, or taking screenshots during the examination is strictly prohibited. Any violation will immediately exit the window with a security violation warning.
                  </p>
                </div>
              </label>

              {/* Check 3 */}
              <label className={`p-3 rounded-lg border transition-all flex items-start gap-3 cursor-pointer select-none ${
                hasAcceptedSingleAttempt
                  ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950 font-medium shadow-2xs'
                  : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
              }`}>
                <input
                  type="checkbox"
                  checked={hasAcceptedSingleAttempt}
                  onChange={(e) => setHasAcceptedSingleAttempt(e.target.checked)}
                  className="mt-0.5 w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer shrink-0"
                />
                <div className="space-y-0.5">
                  <strong className="block text-slate-900 font-bold">3. Single Attempt Authorization & Data Accuracy</strong>
                  <p className="text-[11px] text-slate-600">
                    I verify that my Register Number ({student.registerNo}) is accurate and acknowledge that each student is strictly permitted ONLY ONE official examination attempt.
                  </p>
                </div>
              </label>

            </div>
          </div>

          {!isAllConsentsChecked && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-[11px] font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Please check all three mandatory consent declarations above to unlock the exam entry.</span>
            </div>
          )}

        </div>

        {/* FOOTER ACTION BUTTONS */}
        <div className="bg-slate-100 px-6 py-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onCancel}
            className="w-full sm:w-auto px-5 py-2.5 bg-white hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-300 transition-colors cursor-pointer"
          >
            Cancel & Return to Login
          </button>

          <button
            type="button"
            onClick={handleConfirmConsent}
            disabled={!isAllConsentsChecked || isSubmittingConsent}
            className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white font-extrabold text-xs rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all transform active:scale-95 cursor-pointer disabled:cursor-not-allowed"
          >
            {isSubmittingConsent ? (
              <span>Recording Consent...</span>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-200 shrink-0" />
                <span>I Give Consent & Begin Examination</span>
                <ArrowRight className="w-4 h-4 text-emerald-200 shrink-0" />
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};
