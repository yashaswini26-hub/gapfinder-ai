"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useParams, useRouter } from "next/navigation";
import { AppShell } from "@/components/ui/AppShell";
import { CitationPills } from "@/components/ui/CitationDrawer";
import {
  Clock,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  BookOpen,
  Send,
} from "lucide-react";
import { QuestionPublic, QuizAttempt } from "@/types";

function ActiveQuizContent() {
  const params = useParams();
  const router = useRouter();
  const attemptId = params?.attemptId as string;

  const [attempt, setAttempt] = useState<QuizAttempt | null>(null);
  const [questions, setQuestions] = useState<QuestionPublic[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadQuiz() {
      try {
        const res = await fetch(`/api/quiz/${attemptId}`);
        const data = await res.json();

        if (data.attempt?.status === "evaluated") {
          // If already evaluated, jump straight to results
          router.push(`/results/${attemptId}`);
          return;
        }

        setAttempt(data.attempt);
        setQuestions(data.questions || []);
      } catch (err) {
        console.error(err);
        setError("Failed to load active quiz questions.");
      } finally {
        setLoading(false);
      }
    }

    if (attemptId) loadQuiz();
  }, [attemptId, router]);

  const currentQ = questions[currentIndex];
  const answeredCount = Object.keys(answers).filter((k) => answers[k] !== undefined && answers[k] !== "").length;
  const progressPercent = questions.length > 0 ? Math.round((answeredCount / questions.length) * 100) : 0;

  const handleSelectOption = (qId: string, opt: string | boolean) => {
    setAnswers({ ...answers, [qId]: opt });
  };

  const handleShortAnswerChange = (qId: string, text: string) => {
    setAnswers({ ...answers, [qId]: text });
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setShowConfirm(false);
    setError(null);

    const submissionPayload = {
      attempt_id: attemptId,
      responses: questions.map((q) => ({
        question_id: q.id,
        answer: answers[q.id] ?? null,
      })),
    };

    try {
      const res = await fetch("/api/quiz/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(submissionPayload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || "Submission evaluation failed.");
        setSubmitting(false);
        return;
      }

      router.push(`/results/${attemptId}`);
    } catch {
      setError("Network error occurred during submission.");
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <AppShell>
        <div className="py-20 text-center text-xs text-slate-500">
          Loading diagnostic quiz...
        </div>
      </AppShell>
    );
  }

  if (questions.length === 0) {
    return (
      <AppShell>
        <div className="py-20 text-center text-xs text-slate-500">
          No questions available for this attempt.
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto">
        {/* Top Progress Bar */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs mb-6">
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="font-semibold text-slate-700">
              Question {currentIndex + 1} of {questions.length}
            </span>
            <span className="text-slate-500">
              {answeredCount} of {questions.length} answered ({progressPercent}%)
            </span>
          </div>

          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
            <div
              className="bg-indigo-600 h-full rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-xs text-rose-700">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Current Question Card */}
        {currentQ && (
          <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-xs space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 uppercase tracking-wide">
                  {currentQ.question_type.replace("_", " ")}
                </span>
                <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-600 capitalize">
                  {currentQ.difficulty} Difficulty
                </span>
              </div>
              <span className="text-xs font-semibold text-slate-500">
                {currentQ.marks} Mark{currentQ.marks > 1 ? "s" : ""}
              </span>
            </div>

            {/* Question Text */}
            <div className="text-sm font-semibold text-slate-900 leading-relaxed">
              {currentQ.question_text}
            </div>

            {/* Answer Options for Single Choice / True False */}
            {currentQ.question_type === "single_choice" && currentQ.options && (
              <div className="space-y-2.5 pt-2">
                {currentQ.options.map((opt, oIdx) => {
                  const isSelected = answers[currentQ.id] === opt;
                  return (
                    <div
                      key={oIdx}
                      onClick={() => handleSelectOption(currentQ.id, opt)}
                      className={`p-3.5 rounded-xl border cursor-pointer text-xs transition-all flex items-start gap-3 ${
                        isSelected
                          ? "bg-indigo-50/70 border-indigo-500 text-indigo-900 font-medium shadow-xs"
                          : "border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700"
                      }`}
                    >
                      <input
                        type="radio"
                        name={currentQ.id}
                        checked={isSelected}
                        onChange={() => {}}
                        className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="leading-relaxed">{opt}</span>
                    </div>
                  );
                })}
              </div>
            )}

            {currentQ.question_type === "true_false" && (
              <div className="grid grid-cols-2 gap-3 pt-2">
                {["True", "False"].map((opt) => {
                  const isSelected = String(answers[currentQ.id]).toLowerCase() === opt.toLowerCase();
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => handleSelectOption(currentQ.id, opt.toLowerCase() === "true")}
                      className={`py-3 rounded-xl border text-xs font-semibold transition-all ${
                        isSelected
                          ? "bg-indigo-600 border-indigo-600 text-white shadow-xs"
                          : "border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-800"
                      }`}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
            )}

            {currentQ.question_type === "short_answer" && (
              <div className="space-y-2 pt-2">
                <label className="block text-xs font-medium text-slate-600">
                  Write your conceptual explanation:
                </label>
                <textarea
                  rows={4}
                  value={answers[currentQ.id] || ""}
                  onChange={(e) => handleShortAnswerChange(currentQ.id, e.target.value)}
                  placeholder="Explain the mechanism, definition, or protocol as described in your course materials..."
                  className="w-full p-3 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 leading-relaxed"
                />
              </div>
            )}

            {/* Source Reference Citation Pill */}
            {currentQ.source_references && currentQ.source_references.length > 0 && (
              <div className="pt-4 border-t border-slate-100">
                <div className="text-[11px] font-medium text-slate-400 mb-1">Assessing Grounded Material:</div>
                <CitationPills citations={currentQ.source_references} />
              </div>
            )}

            {/* Navigation Pager */}
            <div className="pt-6 border-t border-slate-100 flex items-center justify-between gap-3">
              <button
                type="button"
                disabled={currentIndex === 0}
                onClick={() => setCurrentIndex(currentIndex - 1)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Previous</span>
              </button>

              {currentIndex < questions.length - 1 ? (
                <button
                  type="button"
                  onClick={() => setCurrentIndex(currentIndex + 1)}
                  className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 shadow-xs transition-colors"
                >
                  <span>Next Question</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowConfirm(true)}
                  className="inline-flex items-center gap-1.5 px-6 py-2 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm transition-colors"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Submit Quiz</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Submit Confirmation Modal */}
        {showConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-sm w-full p-6 text-center space-y-4">
              <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                <Send className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">Submit Diagnostic Quiz?</h3>
                <p className="text-xs text-slate-500 mt-1">
                  You have answered <span className="font-bold text-slate-800">{answeredCount}</span> of{" "}
                  <span className="font-bold text-slate-800">{questions.length}</span> questions.
                  {answeredCount < questions.length && (
                    <span className="block text-amber-600 font-semibold mt-1">
                      Warning: {questions.length - answeredCount} unanswered questions will be marked 0.
                    </span>
                  )}
                </p>
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => setShowConfirm(false)}
                  className="flex-1 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Review Answers
                </button>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={handleSubmit}
                  className="flex-1 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
                >
                  {submitting ? "Evaluating..." : "Confirm & Submit"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

export default function ActiveQuizPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-xs text-slate-500">Loading quiz assessment...</div>}>
      <ActiveQuizContent />
    </Suspense>
  );
}
