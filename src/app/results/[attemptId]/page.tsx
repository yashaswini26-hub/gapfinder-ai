"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AppShell } from "@/components/ui/AppShell";
import { CitationPills } from "@/components/ui/CitationDrawer";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowRight,
  BookOpen,
  CalendarCheck,
  RotateCcw,
} from "lucide-react";
import { QuestionPrivate, QuestionResponse, QuizAttempt } from "@/types";

function QuizResultsContent() {
  const params = useParams();
  const attemptId = params?.attemptId as string;

  const [attempt, setAttempt] = useState<QuizAttempt | null>(null);
  const [questions, setQuestions] = useState<QuestionPrivate[]>([]);
  const [responses, setResponses] = useState<QuestionResponse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadResults() {
      try {
        const res = await fetch(`/api/quiz/${attemptId}`);
        const data = await res.json();
        setAttempt(data.attempt);
        setQuestions(data.questions || []);
        setResponses(data.responses || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    if (attemptId) loadResults();
  }, [attemptId]);

  const responseMap = new Map(responses.map((r) => [r.question_id, r]));
  const score = attempt?.total_score ?? 0;
  const possible = attempt?.total_possible ?? 1;
  const pct = possible > 0 ? Math.round((score / possible) * 100) : 0;

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Score Summary Card */}
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-xs text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center mx-auto text-xl font-extrabold">
            {pct}%
          </div>

          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Diagnostic Assessment Completed
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              You scored <span className="font-bold text-slate-800">{score}</span> out of{" "}
              <span className="font-bold text-slate-800">{possible}</span> total possible marks.
            </p>
          </div>

          <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/gap-report"
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-sm transition-colors"
            >
              <AlertTriangle className="w-4 h-4" />
              <span>Inspect Updated Gap Report</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>

            <Link
              href="/revision-plan"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors"
            >
              <CalendarCheck className="w-4 h-4 text-indigo-600" />
              <span>View Revision Timetable</span>
            </Link>
          </div>
        </div>

        {/* Detailed Question Review List */}
        <div className="space-y-4">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
            Detailed Question Breakdown & Grounded Explanations
          </h2>

          {questions.map((q, idx) => {
            const resp = responseMap.get(q.id);
            const isCorrect = resp?.is_correct ?? false;
            const awardedMarks = resp?.awarded_marks ?? 0;

            return (
              <div
                key={q.id}
                className={`p-6 rounded-2xl bg-white border shadow-xs space-y-4 ${
                  isCorrect ? "border-emerald-200" : awardedMarks > 0 ? "border-amber-200" : "border-rose-200"
                }`}
              >
                <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    {isCorrect ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    ) : awardedMarks > 0 ? (
                      <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
                    ) : (
                      <XCircle className="w-5 h-5 text-rose-500 shrink-0" />
                    )}
                    <span className="font-bold text-slate-900 text-xs sm:text-sm">
                      Question {idx + 1}
                    </span>
                  </div>

                  <span
                    className={`px-2.5 py-0.5 rounded text-xs font-semibold ${
                      isCorrect
                        ? "bg-emerald-50 text-emerald-700"
                        : awardedMarks > 0
                        ? "bg-amber-50 text-amber-700"
                        : "bg-rose-50 text-rose-700"
                    }`}
                  >
                    {awardedMarks} / {q.marks} Marks
                  </span>
                </div>

                {/* Question Text */}
                <div className="text-xs font-semibold text-slate-800 leading-relaxed">
                  {q.question_text}
                </div>

                {/* Student Answer vs Expected Answer */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="text-slate-400 font-semibold mb-1">Your Submitted Answer:</div>
                    <div className="text-slate-800 font-medium whitespace-pre-wrap">
                      {resp?.answer ? String(resp.answer) : "(No answer submitted)"}
                    </div>
                  </div>

                  <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200">
                    <div className="text-emerald-700 font-semibold mb-1">Correct Answer / Benchmark:</div>
                    <div className="text-emerald-950 font-medium whitespace-pre-wrap">
                      {String(q.correct_answer)}
                    </div>
                  </div>
                </div>

                {/* Evaluator Feedback */}
                {resp?.feedback && (
                  <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-700 border border-slate-200">
                    <span className="font-semibold text-slate-900">Evaluator Feedback: </span>
                    {resp.feedback}
                  </div>
                )}

                {/* Grounded Explanation & Page Citations */}
                <div className="p-4 bg-indigo-50/40 rounded-xl border border-indigo-100 text-xs space-y-2">
                  <div className="font-semibold text-indigo-900 flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Grounded Course Explanation:</span>
                  </div>
                  <p className="text-slate-700 leading-relaxed text-[11px]">{q.explanation}</p>

                  {q.source_references && q.source_references.length > 0 && (
                    <div className="pt-2 border-t border-indigo-100/60">
                      <div className="text-[10px] font-semibold text-slate-400 mb-1">Exact Material Citation:</div>
                      <CitationPills citations={q.source_references} />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}

export default function QuizResultsPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-xs text-slate-500">Loading quiz results...</div>}>
      <QuizResultsContent />
    </Suspense>
  );
}
