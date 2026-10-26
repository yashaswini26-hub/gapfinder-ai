"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AppShell } from "@/components/ui/AppShell";
import {
  Stethoscope,
  Clock,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Layers,
  ArrowRight,
} from "lucide-react";
import { Topic } from "@/types";
import { Suspense } from "react";

function DiagnosticSetupContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTopicId = searchParams.get("topicId");

  const [topics, setTopics] = useState<Topic[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [selectedTopicIds, setSelectedTopicIds] = useState<string[]>(
    initialTopicId ? [initialTopicId] : []
  );
  const [questionCount, setQuestionCount] = useState(5);
  const [timeMinutes, setTimeMinutes] = useState(15);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchTopicsAndSubjects() {
      try {
        const subRes = await fetch("/api/subjects");
        const subData = await subRes.json();
        const userSubs = subData.subjects || [];
        setSubjects(userSubs);

        const activeSub = userSubs.length > 0 ? userSubs[0] : null;
        if (activeSub) {
          const res = await fetch(`/api/topics?subjectId=${activeSub.id}`);
          const data = await res.json();
          setTopics(data.topics || []);
        } else {
          const res = await fetch("/api/topics");
          const data = await res.json();
          setTopics(data.topics || []);
        }
      } catch (err) {
        console.error(err);
      }
    }

    fetchTopicsAndSubjects();
  }, []);

  const activeSubject = subjects.length > 0 ? subjects[0] : null;

  const toggleTopic = (id: string) => {
    if (selectedTopicIds.includes(id)) {
      setSelectedTopicIds(selectedTopicIds.filter((t) => t !== id));
    } else {
      setSelectedTopicIds([...selectedTopicIds, id]);
    }
  };

  const handleSelectAll = () => {
    if (selectedTopicIds.length === topics.length) {
      setSelectedTopicIds([]);
    } else {
      setSelectedTopicIds(topics.map((t) => t.id));
    }
  };

  const handleStartDiagnostic = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const targetSubjectId = activeSubject?.id;
    if (!targetSubjectId) {
      setError("Please set up a course subject before starting a diagnostic quiz.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/diagnostic/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subjectId: targetSubjectId,
          topicIds: selectedTopicIds.length > 0 ? selectedTopicIds : undefined,
          questionCount: Number(questionCount),
          timeMinutes: Number(timeMinutes),
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || "Failed to generate diagnostic quiz.");
        setLoading(false);
        return;
      }

      router.push(`/quiz/${data.attemptId}`);
    } catch {
      setError("An unexpected network error occurred.");
      setLoading(false);
    }
  };

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto">
        <div className="mb-6 text-center">
          <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center mx-auto mb-3 shadow-xs">
            <Stethoscope className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Start Diagnostic Assessment
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Questions are generated strictly from your indexed materials to locate precise misconceptions.
          </p>
        </div>

        <form onSubmit={handleStartDiagnostic} className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-xs space-y-6">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-xs text-rose-700">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Diagnostic Setup Rules */}
          <div className="p-4 bg-indigo-50/60 rounded-xl border border-indigo-100 text-xs text-indigo-900 space-y-1">
            <div className="font-semibold flex items-center gap-1.5 text-indigo-800">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              <span>Grounded Assessment Protocol:</span>
            </div>
            <p className="text-slate-600 leading-relaxed text-[11px]">
              Every question will cite exact document pages and sections. Correct answers are kept strictly on the server until your final submission.
            </p>
          </div>

          {/* Topic Scope Selection */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-800">
                Topics to Assess ({selectedTopicIds.length === 0 ? "All Available Topics" : `${selectedTopicIds.length} Selected`})
              </label>
              <button
                type="button"
                onClick={handleSelectAll}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-500"
              >
                {selectedTopicIds.length === topics.length ? "Deselect All" : "Select All Topics"}
              </button>
            </div>

            <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-xl p-2 space-y-1 divide-y divide-slate-100">
              {topics.map((t) => {
                const isSelected = selectedTopicIds.includes(t.id);
                return (
                  <div
                    key={t.id}
                    onClick={() => toggleTopic(t.id)}
                    className={`flex items-center justify-between p-2 rounded-lg cursor-pointer text-xs transition-colors ${
                      isSelected ? "bg-indigo-50/60 text-indigo-900 font-semibold" : "hover:bg-slate-50 text-slate-700"
                    }`}
                  >
                    <span className="truncate pr-2">{t.name}</span>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {}}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Number of Questions & Time Limit */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-800 mb-1">
                Question Count
              </label>
              <select
                value={questionCount}
                onChange={(e) => setQuestionCount(Number(e.target.value))}
                className="w-full p-2.5 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value={3}>3 Questions (Quick Check)</option>
                <option value={5}>5 Questions (Standard Diagnostic)</option>
                <option value={10}>10 Questions (Comprehensive)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-800 mb-1">
                Allocated Time
              </label>
              <select
                value={timeMinutes}
                onChange={(e) => setTimeMinutes(Number(e.target.value))}
                className="w-full p-2.5 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value={10}>10 Minutes</option>
                <option value={15}>15 Minutes</option>
                <option value={20}>20 Minutes</option>
                <option value={30}>30 Minutes</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
          >
            {loading ? (
              <span>Generating Grounded Questions from Notes...</span>
            ) : (
              <>
                <span>Generate & Begin Quiz</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </AppShell>
  );
}

export default function DiagnosticSetupPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-xs text-slate-500">Loading diagnostic setup...</div>}>
      <DiagnosticSetupContent />
    </Suspense>
  );
}
