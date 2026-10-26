"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { AppShell } from "@/components/ui/AppShell";
import { TaskStatusBadge } from "@/components/ui/StatusBadge";
import {
  CalendarCheck,
  RefreshCw,
  Clock,
  CheckCircle2,
  Calendar,
  AlertTriangle,
  BotMessageSquare,
  Sparkles,
} from "lucide-react";
import { RevisionPlanSummary, RevisionTask } from "@/types";
import { Suspense } from "react";

function RevisionPlanContent() {
  const [plan, setPlan] = useState<RevisionPlanSummary | null>(null);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [recalculating, setRecalculating] = useState(false);
  const [todayStr, setTodayStr] = useState("");

  const fetchPlanAndSubjects = async () => {
    try {
      const subRes = await fetch("/api/subjects");
      const subData = await subRes.json();
      const userSubs = subData.subjects || [];
      setSubjects(userSubs);

      const activeSub = userSubs.length > 0 ? userSubs[0] : null;
      if (activeSub) {
        const res = await fetch(`/api/revision-plan?subjectId=${activeSub.id}`);
        const data = await res.json();
        setPlan(data.plan);
      } else {
        const res = await fetch("/api/revision-plan");
        const data = await res.json();
        setPlan(data.plan);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setTodayStr(new Date().toISOString().split("T")[0]);
    fetchPlanAndSubjects();
  }, []);

  const activeSubject = subjects.length > 0 ? subjects[0] : null;

  const handleToggleTask = async (taskId: string, currentStatus: string) => {
    const newStatus = currentStatus === "completed" ? "pending" : "completed";
    try {
      await fetch(`/api/revision-tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      // Optimistic update
      if (plan) {
        const updatedTasksByDate = { ...plan.tasks_by_date };
        for (const d in updatedTasksByDate) {
          updatedTasksByDate[d] = updatedTasksByDate[d].map((t) =>
            t.id === taskId ? { ...t, status: newStatus as any } : t
          );
        }
        setPlan({ ...plan, tasks_by_date: updatedTasksByDate });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRecalculate = async () => {
    setRecalculating(true);
    try {
      const res = await fetch("/api/revision-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subjectId: activeSubject?.id }),
      });
      const data = await res.json();
      if (data.plan) {
        setPlan(data.plan);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setRecalculating(false);
    }
  };

  const dates = Object.keys(plan?.tasks_by_date || {}).sort();

  return (
    <AppShell>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Adaptive Revision Timetable
            </h1>
            <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              Exam Countdown
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Paces revision tasks by weakness, syllabus importance, and exam date within your daily study minutes.
          </p>
        </div>

        <button
          onClick={handleRecalculate}
          disabled={recalculating}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-xs transition-colors disabled:opacity-50 self-start sm:self-center"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${recalculating ? "animate-spin" : ""}`} />
          <span>{recalculating ? "Pacing schedule..." : "Recalculate from Latest Gaps"}</span>
        </button>
      </div>

      {/* Plan Metric Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 mb-6 text-xs">
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-slate-400 font-semibold">Exam Countdown</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">
            {plan?.days_remaining !== null ? `${plan?.days_remaining} Days` : "Open-ended"}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            Exam on {plan?.exam_date ? new Date(plan.exam_date).toLocaleDateString() : "Not set"}
          </div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-slate-400 font-semibold">Daily Time Budget</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">
            {plan?.daily_study_minutes || 60} mins
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">Max daily session load</div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-slate-400 font-semibold">Scheduled Study</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">
            {Math.round((plan?.total_scheduled_minutes || 0) / 60)} hrs
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            {plan?.total_scheduled_minutes || 0} total minutes
          </div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-slate-400 font-semibold">Tasks Completed</div>
          <div className="text-2xl font-bold text-emerald-600 mt-1">
            {plan?.completed_tasks_count || 0}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            {plan?.pending_tasks_count || 0} pending tasks remaining
          </div>
        </div>
      </div>

      {/* Day by Day Calendar View */}
      {dates.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-dashed border-slate-200 text-center">
          <CalendarCheck className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <h3 className="font-semibold text-slate-800 text-sm">No revision tasks scheduled yet</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            Revision tasks are generated directly from your evaluated diagnostic assessments. Take an initial diagnostic quiz on your uploaded topics to populate your daily revision timetable.
          </p>
          <Link
            href="/diagnostic"
            className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition-colors shadow-xs"
          >
            <span>Start Diagnostic Quiz</span>
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {dates.map((dateStr) => {
          const tasks = plan?.tasks_by_date[dateStr] || [];
          const d = new Date(dateStr + "T00:00:00");
          const isToday = todayStr ? dateStr === todayStr : false;

          return (
            <div key={dateStr} className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <div
                className={`px-5 py-3 border-b flex items-center justify-between text-xs font-semibold ${
                  isToday
                    ? "bg-indigo-50/80 text-indigo-900 border-indigo-100"
                    : "bg-slate-50 text-slate-700 border-slate-100"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-indigo-600" />
                  <span>
                    {d.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}
                    {isToday && " (Today)"}
                  </span>
                </div>
                <span className="text-[11px] text-slate-500 font-normal">
                  {tasks.reduce((sum, t) => sum + t.duration_minutes, 0)} mins scheduled
                </span>
              </div>

              <div className="divide-y divide-slate-100">
                {tasks.map((task) => {
                  const isCompleted = task.status === "completed";
                  return (
                    <div
                      key={task.id}
                      className={`p-4 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs transition-colors ${
                        isCompleted ? "bg-slate-50/50 opacity-75" : "hover:bg-slate-50/50"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <button
                          onClick={() => handleToggleTask(task.id, task.status)}
                          className={`mt-0.5 p-1 rounded-md border transition-colors ${
                            isCompleted
                              ? "bg-emerald-600 border-emerald-600 text-white"
                              : "border-slate-300 hover:border-slate-400 bg-white"
                          }`}
                          title="Toggle completion"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                        </button>

                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className={`font-bold text-slate-900 ${isCompleted ? "line-through text-slate-500" : ""}`}>
                              {task.title}
                            </span>
                            <span className="px-2 py-0.2 rounded text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
                              Priority: {task.priority_score}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-600 leading-relaxed max-w-2xl">
                            {task.description}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                        <span className="text-[11px] text-slate-400 flex items-center gap-1 font-medium">
                          <Clock className="w-3.5 h-3.5" />
                          {task.duration_minutes}m
                        </span>

                        <Link
                          href={`/assistant?topicId=${task.topic_id}`}
                          className="px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:text-indigo-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                        >
                          Study Concept
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
        </div>
      )}
    </AppShell>
  );
}

export default function RevisionPlanPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-xs text-slate-500">Loading revision plan...</div>}>
      <RevisionPlanContent />
    </Suspense>
  );
}
