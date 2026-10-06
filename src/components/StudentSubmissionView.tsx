import React, { useState, useEffect } from 'react';
import { StudentInfo, CognitiveProfileReport, AppExperienceFeedback } from '../types';
import { CITLogo } from './CITLogo';
import { normalizeStudentInfo, normalizeReport } from '../utils/studentDataNormalizer';
import {
  CheckCircle2,
  Building2,
  User,
  Clock,
  Sparkles,
  HeartHandshake,
  Award,
  Star,
  MessageSquare,
  Send,
  ThumbsUp,
  Smile,
  ShieldCheck,
  FileCheck,
  AlertCircle,
  LogOut
} from 'lucide-react';
import { saveFeedbackToFirestore } from '../lib/firebase';

interface StudentSubmissionViewProps {
  student: StudentInfo;
  report: CognitiveProfileReport;
  onFacultyUnlock?: () => void;
  onRetakeOrExit: () => void;
}

export const StudentSubmissionView: React.FC<StudentSubmissionViewProps> = ({
  student: rawStudent,
  report: rawReport,
  onRetakeOrExit
}) => {
  const student = normalizeStudentInfo(rawStudent);
  const report = normalizeReport(rawReport) || rawReport;
  const [assessmentRating, setAssessmentRating] = useState<number>(5);
  const [userFriendlinessRating, setUserFriendlinessRating] = useState<number>(5);
  const [questionClarityRating, setQuestionClarityRating] = useState<number>(5);
  const [navEaseRating, setNavEaseRating] = useState<number>(5);
  const [feedbackComments, setFeedbackComments] = useState<string>('');
  const [isFeedbackSubmitted, setIsFeedbackSubmitted] = useState<boolean>(false);
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState<boolean>(false);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);

  const [autoExitCountdown, setAutoExitCountdown] = useState<number | null>(null);

  useEffect(() => {
    try {
      const isAlreadySubmitted = localStorage.getItem(`CIT_FEEDBACK_SUBMITTED_${student.registerNo}`) === 'true';
      if (isAlreadySubmitted) {
        setIsFeedbackSubmitted(true);
      }
    } catch (e) {
      console.error(e);
    }
  }, [student.registerNo]);

  // Auto exit countdown when feedback is accepted
  useEffect(() => {
    if (autoExitCountdown === null) return;
    if (autoExitCountdown <= 0) {
      onRetakeOrExit();
      return;
    }
    const timer = setTimeout(() => {
      setAutoExitCountdown((prev) => (prev !== null ? prev - 1 : null));
    }, 1000);
    return () => clearTimeout(timer);
  }, [autoExitCountdown, onRetakeOrExit]);

  const handleSubmitFeedback = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setFeedbackError(null);

    setIsSubmittingFeedback(true);

    const effectiveComments = feedbackComments.trim() || 'Assessment and feedback submitted successfully.';

    const feedbackData: AppExperienceFeedback = {
      studentRegNo: student.registerNo,
      studentName: student.name,
      department: student.department,
      submittedAt: new Date().toLocaleString(),
      assessmentRating,
      userFriendlinessRating,
      questionClarityRating,
      navEaseRating,
      comments: effectiveComments
    };

    // Immediately accept locally to ensure zero lag for the student
    try {
      const savedList = JSON.parse(localStorage.getItem('CIT_APP_FEEDBACK') || '[]');
      savedList.unshift(feedbackData);
      localStorage.setItem('CIT_APP_FEEDBACK', JSON.stringify(savedList));
      localStorage.setItem(`CIT_FEEDBACK_SUBMITTED_${student.registerNo}`, 'true');
    } catch (e) {
      console.error('Failed to save feedback to local storage:', e);
    }

    setIsSubmittingFeedback(false);
    setIsFeedbackSubmitted(true);

    // Asynchronously commit to Firestore
    saveFeedbackToFirestore(feedbackData).catch((err) => {
      console.warn('Feedback background sync to Firestore:', err);
    });
  };

  return (
    <div className="min-h-[calc(100vh-65px)] bg-[#0F172A] text-slate-100 p-4 sm:p-6 lg:p-8 flex items-center justify-center">
      <div className="w-full max-w-3xl bg-[#1E293B] border border-slate-700 rounded-2xl shadow-2xl p-6 sm:p-10 space-y-8 relative overflow-hidden">
        
        {/* Top Branding Banner */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-6 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <CITLogo className="w-10 h-10 sm:w-12 sm:h-12 shrink-0" />
            <div>
              <h1 className="text-base font-bold text-white uppercase tracking-tight font-sans">
                Coimbatore Institute of Technology
              </h1>
              <p className="text-xs text-slate-400 font-medium">
                Autonomous Institution • Mathematics Competency Assessment
              </p>
            </div>
          </div>

          <div className="px-3.5 py-1.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            Assessment Successfully Submitted
          </div>
        </div>

        {/* Personalized Student Submission Confirmation Banner */}
        <div className="bg-gradient-to-r from-blue-950/60 via-indigo-950/60 to-slate-900/60 border border-blue-500/30 rounded-2xl p-6 text-center space-y-3 relative overflow-hidden shadow-xl">
          <div className="flex items-center justify-center gap-2 text-amber-300 font-bold text-xs uppercase tracking-wider bg-amber-950/40 border border-amber-500/30 px-3 py-1 rounded-full w-fit mx-auto">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>CIT Examination Cell • Submission Acknowledged</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            🎉 Thank You, <span className="text-blue-300">{student.name}</span>!
          </h2>

          <p className="text-xs sm:text-sm text-slate-200 max-w-xl mx-auto leading-relaxed font-sans">
            Your responses for the <strong className="text-blue-300">CIT Cognitive Mathematics Assessment</strong> have been successfully recorded and encrypted in the institutional evaluation database.
          </p>

          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 rounded-full text-xs font-semibold">
            <HeartHandshake className="w-4 h-4 text-emerald-400" />
            <span>We wish you outstanding academic success and bright achievements ahead at CIT!</span>
          </div>
        </div>

        {/* Student Submission Record Details */}
        <div className="bg-[#111827]/90 border border-slate-700/80 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2 text-white font-bold text-sm">
              <FileCheck className="w-4 h-4 text-blue-400" />
              <span>Official Submission Details</span>
            </div>
            <span className="px-2.5 py-0.5 bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded-full text-[11px] font-mono font-bold">
              Single Attempt Verified
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-[#1E293B]/70 border border-slate-700/60 rounded-xl p-3.5 space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-blue-400" /> Candidate Name
              </span>
              <p className="text-sm font-bold text-white">{student.name}</p>
            </div>

            <div className="bg-[#1E293B]/70 border border-slate-700/60 rounded-xl p-3.5 space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-blue-400" /> Register Number
              </span>
              <p className="text-sm font-bold text-white font-mono">{student.registerNo}</p>
            </div>

            <div className="bg-[#1E293B]/70 border border-slate-700/60 rounded-xl p-3.5 space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Department</span>
              <p className="text-xs font-semibold text-blue-300">{student.department}</p>
            </div>

            <div className="bg-[#1E293B]/70 border border-slate-700/60 rounded-xl p-3.5 space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-blue-400" /> Submission Timestamp
              </span>
              <p className="text-xs font-mono text-slate-300">{report.testTimestamp}</p>
            </div>
          </div>

          {/* Institutional Evaluation Notice */}
          <div className="p-3.5 bg-blue-950/30 border border-blue-500/20 rounded-xl flex items-start gap-3 text-xs text-slate-300">
            <ShieldCheck className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong className="text-white">Examination Protocol Notice:</strong> As per CIT examination evaluation standards, individual scorecards and domain proficiency analytics are centrally compiled and reviewed by department faculty coordinators. Official results and feedback will be communicated through your department.
            </p>
          </div>
        </div>

        {/* STUDENT ASSESSMENT & APPLICATION USER-FRIENDLINESS FEEDBACK SECTION */}
        <div className="bg-gradient-to-br from-slate-900 via-indigo-950/40 to-slate-900 border border-indigo-500/40 rounded-2xl p-6 shadow-2xl space-y-6 relative overflow-hidden">
          <div className="flex items-center justify-between pb-4 border-b border-indigo-500/30">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-indigo-500/20 text-indigo-300 rounded-xl border border-indigo-500/30">
                <MessageSquare className="w-5 h-5 text-indigo-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-white tracking-tight">
                    Assessment & Application Experience Feedback
                  </h3>
                  <span className="px-2 py-0.5 bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] font-extrabold uppercase rounded-full tracking-wider animate-pulse">
                    Mandatory Survey
                  </span>
                </div>
                <p className="text-xs text-amber-300/90 font-medium mt-0.5">
                  ⚠️ Mandatory Step: You must submit your ratings & feedback below to finalize your assessment submission.
                </p>
              </div>
            </div>
            {isFeedbackSubmitted ? (
              <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full text-xs font-bold flex items-center gap-1.5 shrink-0">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                Submitted
              </span>
            ) : (
              <span className="px-3 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-full text-xs font-bold flex items-center gap-1.5 shrink-0">
                Required Before Exit
              </span>
            )}
          </div>

          {isFeedbackSubmitted ? (
            <div className="bg-emerald-950/40 border border-emerald-500/40 rounded-xl p-6 text-center space-y-4 animate-in fade-in">
              <div className="w-14 h-14 bg-emerald-500/20 text-emerald-400 rounded-full border border-emerald-500/40 flex items-center justify-center mx-auto shadow-lg">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[11px] font-mono font-bold uppercase rounded-full tracking-wider">
                  Submission & Feedback Accepted Immediately
                </span>
                <h4 className="text-lg font-black text-white mt-2">Assessment & Feedback Accepted</h4>
                <p className="text-xs text-emerald-200/90 max-w-md mx-auto leading-relaxed mt-1">
                  Thank you, <strong>{student.name}</strong> ({student.registerNo}). Your evaluation responses and feedback survey have been officially recorded in the CIT examination system.
                </p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmitFeedback} className="space-y-5 text-xs">
              {feedbackError && (
                <div className="p-3 bg-rose-950/80 border border-rose-500/60 rounded-xl text-rose-200 text-xs font-medium flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{feedbackError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Field 1: Overall Assessment Experience */}
                <div className="bg-[#111827]/90 border border-slate-700/80 rounded-xl p-4 space-y-2">
                  <label className="font-bold text-slate-200 flex items-center gap-1.5">
                    <Star className="w-4 h-4 text-amber-400" />
                    Overall Assessment Experience <span className="text-emerald-400">*</span>
                  </label>
                  <p className="text-[11px] text-slate-400">Rate your test experience & question structure:</p>
                  <div className="flex items-center gap-1.5 pt-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setAssessmentRating(star)}
                        className={`p-2 rounded-lg transition-all cursor-pointer ${
                          star <= assessmentRating
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            : 'bg-slate-800 text-slate-500 border border-slate-700'
                        }`}
                        title={`${star} Star${star > 1 ? 's' : ''}`}
                      >
                        <Star className={`w-4 h-4 ${star <= assessmentRating ? 'fill-amber-400 text-amber-400' : ''}`} />
                      </button>
                    ))}
                    <span className="ml-2 text-xs font-bold font-mono text-amber-300">
                      {assessmentRating}/5
                    </span>
                  </div>
                </div>

                {/* Field 2: Application User-Friendliness */}
                <div className="bg-[#111827]/90 border border-slate-700/80 rounded-xl p-4 space-y-2">
                  <label className="font-bold text-slate-200 flex items-center gap-1.5">
                    <Smile className="w-4 h-4 text-blue-400" />
                    Application User-Friendliness <span className="text-emerald-400">*</span>
                  </label>
                  <p className="text-[11px] text-slate-400">Ease of navigation, controls & readability:</p>
                  <div className="flex items-center gap-1.5 pt-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setUserFriendlinessRating(star)}
                        className={`p-2 rounded-lg transition-all cursor-pointer ${
                          star <= userFriendlinessRating
                            ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                            : 'bg-slate-800 text-slate-500 border border-slate-700'
                        }`}
                        title={`${star} Star${star > 1 ? 's' : ''}`}
                      >
                        <Star className={`w-4 h-4 ${star <= userFriendlinessRating ? 'fill-blue-400 text-blue-400' : ''}`} />
                      </button>
                    ))}
                    <span className="ml-2 text-xs font-bold font-mono text-blue-300">
                      {userFriendlinessRating}/5
                    </span>
                  </div>
                </div>

                {/* Field 3: Question Quality & Clarity */}
                <div className="bg-[#111827]/90 border border-slate-700/80 rounded-xl p-4 space-y-2">
                  <label className="font-bold text-slate-200 flex items-center gap-1.5">
                    <Award className="w-4 h-4 text-emerald-400" />
                    Question Quality & Clarity <span className="text-emerald-400">*</span>
                  </label>
                  <p className="text-[11px] text-slate-400">Clarity of math formulas, diagrams & options:</p>
                  <div className="flex items-center gap-1.5 pt-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setQuestionClarityRating(star)}
                        className={`p-2 rounded-lg transition-all cursor-pointer ${
                          star <= questionClarityRating
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : 'bg-slate-800 text-slate-500 border border-slate-700'
                        }`}
                      >
                        <Star className={`w-4 h-4 ${star <= questionClarityRating ? 'fill-emerald-400 text-emerald-400' : ''}`} />
                      </button>
                    ))}
                    <span className="ml-2 text-xs font-bold font-mono text-emerald-300">
                      {questionClarityRating}/5
                    </span>
                  </div>
                </div>

                {/* Field 4: Navigation & Platform Speed */}
                <div className="bg-[#111827]/90 border border-slate-700/80 rounded-xl p-4 space-y-2">
                  <label className="font-bold text-slate-200 flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-purple-400" />
                    Platform Speed & Responsiveness <span className="text-emerald-400">*</span>
                  </label>
                  <p className="text-[11px] text-slate-400">Smoothness of section switching & controls:</p>
                  <div className="flex items-center gap-1.5 pt-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setNavEaseRating(star)}
                        className={`p-2 rounded-lg transition-all cursor-pointer ${
                          star <= navEaseRating
                            ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                            : 'bg-slate-800 text-slate-500 border border-slate-700'
                        }`}
                      >
                        <Star className={`w-4 h-4 ${star <= navEaseRating ? 'fill-purple-400 text-purple-400' : ''}`} />
                      </button>
                    ))}
                    <span className="ml-2 text-xs font-bold font-mono text-purple-300">
                      {navEaseRating}/5
                    </span>
                  </div>
                </div>
              </div>

              {/* Textarea: Feedback Comments & Suggestions */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-200 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-indigo-400" />
                    Student Feedback & Comments
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium">Optional</span>
                </label>
                <textarea
                  value={feedbackComments}
                  onChange={(e) => {
                    setFeedbackComments(e.target.value);
                    if (feedbackError) setFeedbackError(null);
                  }}
                  placeholder="Share any thoughts on test experience, question clarity, or portal usability..."
                  rows={3}
                  className="w-full bg-[#111827] border border-indigo-500/50 rounded-xl p-3 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-400 transition-all font-sans text-xs"
                />
              </div>

              <div className="flex items-center justify-end pt-2">
                <button
                  type="submit"
                  disabled={isSubmittingFeedback}
                  className="w-full sm:w-auto px-7 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:from-emerald-700 active:to-teal-700 text-white font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all cursor-pointer border border-emerald-400/30 disabled:opacity-50 text-xs"
                >
                  <Send className="w-4 h-4" />
                  <span>{isSubmittingFeedback ? 'Submitting & Accepting...' : 'Submit Mandatory Feedback & Finalize Submission'}</span>
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Action Buttons Footer */}
        <div className="flex flex-wrap items-center justify-center gap-4 pt-4 border-t border-slate-700">
          {isFeedbackSubmitted ? (
            <button
              type="button"
              onClick={onRetakeOrExit}
              className="px-7 py-2.5 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-lg flex items-center gap-2 transition-all cursor-pointer"
              title="Exit Assessment Window and return to main portal"
            >
              <LogOut className="w-4 h-4" />
              <span>Exit Assessment Portal</span>
            </button>
          ) : (
            <div className="p-3 bg-slate-800/80 border border-slate-700 rounded-xl text-center max-w-md w-full">
              <p className="text-xs text-amber-300 font-semibold flex items-center justify-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Feedback is mandatory before you can exit the portal.</span>
              </p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};


