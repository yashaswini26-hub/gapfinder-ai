"use client";

import React, { useState, useEffect } from "react";
import { AppShell } from "@/components/ui/AppShell";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";
import {
  BarChart3,
  TrendingUp,
  CheckCircle2,
  CalendarCheck,
  AlertTriangle,
  Award,
} from "lucide-react";

export default function ProgressPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProgress() {
      try {
        const res = await fetch("/api/progress");
        const json = await res.json();
        setData(json);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    fetchProgress();
  }, []);

  const daysToExam = data?.subject?.exam_date
    ? Math.max(0, Math.ceil((new Date(data.subject.exam_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;

  const hasAnyAssessments = (data?.quizHistory?.length || 0) > 0;
  const hasAnyTopics = (data?.totalTopics || 0) > 0;

  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          Learning Progress & Diagnostics
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Historical trends and topic mastery calculated strictly from real persisted assessments.
        </p>
      </div>

      {/* Top Level Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 mb-6 text-xs">
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-slate-400 font-semibold">Assessed Mastery</div>
          <div className="text-2xl font-black text-slate-900 mt-1">
            {data?.overallMastery !== null && data?.overallMastery !== undefined ? `${data.overallMastery}%` : "Not assessed"}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            {data?.assessedTopics || 0} of {data?.totalTopics || 0} topics
          </div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-slate-400 font-semibold">Quiz Assessments</div>
          <div className="text-2xl font-black text-slate-900 mt-1">
            {data?.quizHistory?.length || 0}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">Verified completed attempts</div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-slate-400 font-semibold">Revision Task Rate</div>
          <div className="text-2xl font-black text-emerald-600 mt-1">
            {data?.tasksCompletion?.percentage || 0}%
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            {data?.tasksCompletion?.completed || 0} of {data?.tasksCompletion?.total || 0} completed
          </div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-slate-400 font-semibold">Days to Exam</div>
          <div className="text-2xl font-black text-indigo-600 mt-1">
            {daysToExam !== null ? `${daysToExam} Days` : data?.subject ? "Open-ended" : "Not set"}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5 truncate">
            {data?.subject?.name ? `${data.subject.name} Target Exam` : "No Subject Set"}
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Mastery Distribution Pie */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
          <h2 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Award className="w-4 h-4 text-indigo-600" />
            <span>Topic Mastery Breakdown</span>
          </h2>

          <div className="h-64 flex items-center justify-center">
            {!hasAnyTopics ? (
              <div className="text-center text-xs text-slate-400 p-8 border border-dashed border-slate-200 rounded-xl">
                No syllabus topics extracted yet. Upload study materials to view topic breakdown.
              </div>
            ) : data?.distribution ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.distribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={4}
                    dataKey="count"
                  >
                    {data.distribution.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: "#ffffff", borderRadius: "12px", fontSize: "12px" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : null}
          </div>

          <div className="flex flex-wrap justify-center gap-4 text-xs mt-2">
            {data?.distribution?.map((d: any) => (
              <div key={d.name} className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                <span className="text-slate-600 font-medium">{d.name}:</span>
                <span className="font-bold text-slate-900">{d.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Quiz Score History Timeline */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
          <h2 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-indigo-600" />
            <span>Diagnostic Score Progression</span>
          </h2>

          <div className="h-64 flex items-center justify-center">
            {!hasAnyAssessments ? (
              <div className="text-center text-xs text-slate-400 p-8 border border-dashed border-slate-200 rounded-xl">
                No diagnostic attempts submitted yet. Complete quizzes to track your score progression over time.
              </div>
            ) : data?.quizHistory ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.quizHistory}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} />
                  <YAxis domain={[0, 100]} stroke="#94a3b8" fontSize={11} unit="%" />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#ffffff", borderRadius: "12px", fontSize: "12px" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="score"
                    stroke="#4f46e5"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: "#4f46e5" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : null}
          </div>
          <p className="text-[11px] text-slate-400 text-center mt-2">
            Chronological quiz results from persisted student attempts
          </p>
        </div>
      </div>

      {/* Topic by Topic Mastery Bar Chart */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <h2 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-indigo-600" />
          <span>Assessed Mastery by Syllabus Topic</span>
        </h2>

        <div className="h-72 flex items-center justify-center">
          {!hasAnyTopics ? (
            <div className="text-center text-xs text-slate-400 p-8 border border-dashed border-slate-200 rounded-xl">
              No syllabus topics extracted yet. Upload study materials first.
            </div>
          ) : data?.topicScores && data.topicScores.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.topicScores} layout="vertical" margin={{ left: 40, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" domain={[0, 100]} stroke="#94a3b8" fontSize={11} unit="%" />
                <YAxis dataKey="name" type="category" stroke="#64748b" fontSize={11} width={130} />
                <Tooltip
                  formatter={(val: any, name: any, item: any) => [`${val}%`, item.payload.fullName]}
                  contentStyle={{ backgroundColor: "#ffffff", borderRadius: "12px", fontSize: "12px" }}
                />
                <Bar dataKey="score" radius={[0, 6, 6, 0]}>
                  {data.topicScores.map((entry: any, index: number) => {
                    let fill = "#94a3b8";
                    if (entry.status === "weak") fill = "#ef4444";
                    else if (entry.status === "medium") fill = "#f59e0b";
                    else if (entry.status === "strong") fill = "#10b981";
                    return <Cell key={`bar-${index}`} fill={fill} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center text-xs text-slate-400 p-8 border border-dashed border-slate-200 rounded-xl">
              No topic scores to display.
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
