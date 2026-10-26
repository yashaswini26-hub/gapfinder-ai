"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { AppShell } from "@/components/ui/AppShell";
import { TopicStatusBadge, ConfidenceBadge } from "@/components/ui/StatusBadge";
import { MasteryMeter } from "@/components/ui/MasteryMeter";
import { CitationPills } from "@/components/ui/CitationDrawer";
import {
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  Stethoscope,
  BotMessageSquare,
  Sparkles,
  BookOpen,
  Filter,
} from "lucide-react";
import { GapDiagnosisReport, TopicStatus } from "@/types";

export default function GapReportPage() {
  const [report, setReport] = useState<GapDiagnosisReport | null>(null);
  const [filter, setFilter] = useState<"all" | TopicStatus>("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchReport() {
      try {
        const res = await fetch("/api/gap-report");
        const data = await res.json();
        setReport(data.report);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    fetchReport();
  }, []);

  const filteredTopics = report?.topics.filter((t) => {
    if (filter === "all") return true;
    return t.mastery.status === filter;
  }) || [];

  return (
    <AppShell>
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                Knowledge Gap Diagnosis Report
              </h1>
              <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                Core Diagnosis
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Deterministic diagnosis based strictly on persisted quiz responses. Locates blind spots with verifiable evidence.
            </p>
          </div>

          <Link
            href="/revision-plan"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-xs transition-colors self-start sm:self-center"
          >
            <span>Generate Revision Plan from Gaps</span>
            <Sparkles className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 mb-6">
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <div className="text-xs font-semibold text-slate-500">Overall Mastery</div>
          <div className="text-2xl font-black text-slate-900 mt-1">
            {report?.overall_mastery !== null ? `${report?.overall_mastery}%` : "—"}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            {report?.assessed_topics_count || 0} of {report?.total_topics_count || 0} topics assessed
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-rose-200 shadow-xs">
          <div className="text-xs font-semibold text-rose-600">Critical Gaps (&lt;50%)</div>
          <div className="text-2xl font-black text-rose-700 mt-1">{report?.weak_count ?? 0}</div>
          <div className="text-[11px] text-rose-500 mt-0.5">High priority revision</div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-amber-200 shadow-xs">
          <div className="text-xs font-semibold text-amber-600">Moderate Understanding</div>
          <div className="text-2xl font-black text-amber-700 mt-1">{report?.medium_count ?? 0}</div>
          <div className="text-[11px] text-amber-500 mt-0.5">50% to 79.9% mastery</div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-emerald-200 shadow-xs">
          <div className="text-xs font-semibold text-emerald-600">Strong Mastery (≥80%)</div>
          <div className="text-2xl font-black text-emerald-700 mt-1">{report?.strong_count ?? 0}</div>
          <div className="text-[11px] text-emerald-500 mt-0.5">Ready for exam recall</div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-1 text-xs">
        <span className="text-slate-400 font-semibold mr-1 flex items-center gap-1">
          <Filter className="w-3.5 h-3.5" /> Filter:
        </span>
        {[
          { key: "all", label: `All Topics (${report?.total_topics_count || 0})` },
          { key: "weak", label: `Weak (${report?.weak_count || 0})` },
          { key: "medium", label: `Medium (${report?.medium_count || 0})` },
          { key: "strong", label: `Strong (${report?.strong_count || 0})` },
          { key: "insufficient_data", label: `Needs Data (${report?.insufficient_data_count || 0})` },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key as any)}
            className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-colors ${
              filter === tab.key
                ? "bg-slate-900 text-white"
                : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Topic Diagnostic Cards */}
      <div className="space-y-4">
        {filteredTopics.length === 0 ? (
          <div className="bg-white p-12 rounded-2xl border border-dashed border-slate-200 text-center text-xs text-slate-500">
            {report?.topics?.length === 0
              ? "No syllabus topics identified yet. Upload course materials to begin diagnostic gap analysis."
              : `No topics match the "${filter}" filter.`}
          </div>
        ) : (
          filteredTopics.map((item) => {
          const t = item.topic;
          const m = item.mastery;
          const b = item.breakdown;

          return (
            <div
              key={t.id}
              className={`p-6 rounded-2xl bg-white border shadow-xs space-y-4 transition-all ${
                m.status === "weak"
                  ? "border-rose-200"
                  : m.status === "medium"
                  ? "border-amber-200"
                  : m.status === "strong"
                  ? "border-emerald-200"
                  : "border-slate-200"
              }`}
            >
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div>
                  <div className="flex items-center gap-2.5">
                    <h2 className="font-bold text-slate-900 text-base">{t.name}</h2>
                    <TopicStatusBadge status={m.status} />
                    <ConfidenceBadge confidence={m.confidence} />
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    {t.syllabus_unit || "Syllabus Module"} • Importance: {t.importance}/5
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
                  <Link
                    href={`/diagnostic?topicId=${t.id}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-colors"
                  >
                    <Stethoscope className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Targeted Quiz</span>
                  </Link>

                  <Link
                    href={`/assistant?topicId=${t.id}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
                  >
                    <BotMessageSquare className="w-3.5 h-3.5" />
                    <span>Explain Topic</span>
                  </Link>
                </div>
              </div>

              {/* Mastery Meter & Question Breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                <div className="md:col-span-2">
                  <MasteryMeter score={m.mastery_score} status={m.status} size="md" />
                </div>
                <div className="flex items-center justify-around text-xs p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-slate-600">
                  <div className="text-center">
                    <span className="font-bold text-emerald-600">{b.correct}</span> Correct
                  </div>
                  <div className="text-center">
                    <span className="font-bold text-amber-600">{b.partial}</span> Partial
                  </div>
                  <div className="text-center">
                    <span className="font-bold text-rose-600">{b.incorrect}</span> Missed
                  </div>
                </div>
              </div>

              {/* Evidence Summary & Actionable Advice */}
              <div className="p-3.5 rounded-xl bg-slate-50/70 border border-slate-200 text-xs space-y-1.5">
                <div className="font-semibold text-slate-800">Assessed Diagnosis:</div>
                <p className="text-slate-600 leading-relaxed text-[11px]">{m.evidence_summary}</p>
                <div className="pt-1 text-[11px] font-semibold text-indigo-900">
                  Recommended Action: <span className="font-normal text-slate-700">{item.recommended_action}</span>
                </div>
              </div>

              {/* Specific Missed Concepts */}
              {item.missed_concepts.length > 0 && (
                <div className="text-xs space-y-1">
                  <div className="font-semibold text-rose-700 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                    <span>Identified Misconceptions to Address:</span>
                  </div>
                  <ul className="list-disc pl-5 text-[11px] text-slate-600 space-y-0.5">
                    {item.missed_concepts.map((mc, idx) => (
                      <li key={idx}>{mc}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Verified Source Citations */}
              {item.citations && item.citations.length > 0 && (
                <div className="pt-2 border-t border-slate-100">
                  <div className="text-[10px] font-semibold uppercase text-slate-400 mb-1">
                    Verified Course Material References:
                  </div>
                  <CitationPills citations={item.citations} />
                </div>
              )}
            </div>
          );
        }))}
      </div>
    </AppShell>
  );
}
