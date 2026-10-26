"use client";

import React, { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { AppShell } from "@/components/ui/AppShell";
import { TopicStatusBadge, TaskStatusBadge } from "@/components/ui/StatusBadge";
import { MasteryMeter } from "@/components/ui/MasteryMeter";
import {
  Stethoscope,
  Calendar,
  AlertTriangle,
  FileText,
  Clock,
  ArrowRight,
  Sparkles,
  BookOpen,
  CheckCircle2,
  ListTree,
  TrendingUp,
} from "lucide-react";

function DashboardContent() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [todayStr, setTodayStr] = useState("");

  useEffect(() => {
    setTodayStr(new Date().toISOString().split("T")[0]);
    async function loadDashboard() {
      try {
        const [meRes, subRes, docsRes] = await Promise.all([
          fetch("/api/auth/me"),
          fetch("/api/subjects"),
          fetch("/api/documents"),
        ]);

        const [meData, subData, docs] = await Promise.all([
          meRes.json(),
          subRes.json(),
          docsRes.json(),
        ]);

        setCurrentUser(meData.user || null);
        const userSubs = subData.subjects || [];
        setSubjects(userSubs);

        const activeSub = userSubs.length > 0 ? userSubs[0] : null;

        if (activeSub) {
          const [progressRes, reportRes, planRes] = await Promise.all([
            fetch(`/api/progress?subjectId=${activeSub.id}`),
            fetch(`/api/gap-report?subjectId=${activeSub.id}`),
            fetch(`/api/revision-plan?subjectId=${activeSub.id}`),
          ]);

          const [progress, gapReport, plan] = await Promise.all([
            progressRes.json(),
            reportRes.json(),
            planRes.json(),
          ]);

          setData({
            progress,
            report: gapReport.report,
            plan: plan.plan,
            documents: docs.documents || [],
          });
        } else {
          // If in demo mode without user subjects, load demo datasets
          if (!meData.user || meData.user.isDemoUser) {
            const [progressRes, reportRes, planRes] = await Promise.all([
              fetch("/api/progress"),
              fetch("/api/gap-report"),
              fetch("/api/revision-plan"),
            ]);
            const [progress, gapReport, plan] = await Promise.all([
              progressRes.json(),
              reportRes.json(),
              planRes.json(),
            ]);
            setData({
              progress,
              report: gapReport.report,
              plan: plan.plan,
              documents: docs.documents || [],
            });
          } else {
            // Clean empty state for new authenticated user
            setData({
              progress: { quizHistory: [], overallMastery: null, assessedTopics: 0, totalTopics: 0 },
              report: {
                overall_mastery: null,
                assessed_topics_count: 0,
                total_topics_count: 0,
                weak_count: 0,
                medium_count: 0,
                strong_count: 0,
                insufficient_data_count: 0,
                topics: [],
              },
              plan: {
                tasks_by_date: {},
                pending_tasks_count: 0,
                completed_tasks_count: 0,
                total_scheduled_minutes: 0,
              },
              documents: docs.documents || [],
            });
          }
        }
      } catch (err) {
        console.error("Dashboard load error:", err);
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, []);

  const todayTasks = todayStr && data?.plan?.tasks_by_date?.[todayStr] ? data.plan.tasks_by_date[todayStr] : [];
  const activeSubject = subjects.length > 0 ? subjects[0] : null;

  // Calculate days to exam
  const daysToExam = activeSubject?.exam_date
    ? Math.max(0, Math.ceil((new Date(activeSubject.exam_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;

  const displayName = currentUser?.displayName || (currentUser?.email ? currentUser.email.split("@")[0] : "Student");
  const isNewUser = currentUser && !currentUser.isDemoUser;
  const hasNoSubjects = isNewUser && subjects.length === 0;
  const hasNoDocuments = isNewUser && subjects.length > 0 && (!data?.documents || data.documents.length === 0);
  const hasNoQuizzes = isNewUser && subjects.length > 0 && data?.documents?.length > 0 && (!data?.progress?.quizHistory || data.progress.quizHistory.length === 0);

  return (
    <AppShell>
      {/* Header Greeting & Context */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Good day, {displayName}
            </h1>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">
              {activeSubject?.name || "No Subject Configured"}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {activeSubject ? (
              daysToExam !== null ? (
                <>Exam in <span className="font-semibold text-slate-800">{daysToExam} days</span> • Daily revision budget: <span className="font-semibold text-slate-800">{activeSubject.daily_study_minutes || 60} mins</span></>
              ) : (
                <span>Daily revision budget: <span className="font-semibold text-slate-800">{activeSubject.daily_study_minutes || 60} mins</span></span>
              )
            ) : (
              <span>Set up your subject and upload study materials to begin diagnosis.</span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/diagnostic"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-sm transition-all"
          >
            <Stethoscope className="w-4 h-4" />
            <span>Start Diagnostic Quiz</span>
          </Link>
          <Link
            href="/gap-report"
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-semibold text-xs transition-colors"
          >
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <span>Gap Report</span>
          </Link>
        </div>
      </div>

      {/* Guided Onboarding Step 1: No Subjects Configured */}
      {hasNoSubjects && (
        <div className="bg-gradient-to-r from-indigo-50 via-purple-50 to-slate-50 border border-indigo-100 rounded-2xl p-5 mb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-600 text-white uppercase tracking-wider mb-1.5">
                Onboarding Step 1
              </div>
              <h2 className="text-sm font-bold text-slate-900">
                Welcome to GapFinder AI, {displayName}!
              </h2>
              <p className="text-xs text-slate-600 mt-1 max-w-xl leading-relaxed">
                You haven't set up your target subject and exam date yet. Add your course name and study preferences to begin uploading materials, taking diagnostic assessments, and tracking personalized learning gaps.
              </p>
            </div>
            <Link
              href="/onboarding"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-xs shrink-0 transition-colors"
            >
              <span>Set Up Your Subject</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      )}

      {/* Guided Onboarding Step 2: Subject exists, but No Documents uploaded */}
      {hasNoDocuments && (
        <div className="bg-gradient-to-r from-amber-50 via-indigo-50 to-slate-50 border border-amber-200 rounded-2xl p-5 mb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-600 text-white uppercase tracking-wider mb-1.5">
                Onboarding Step 2: Study Materials
              </div>
              <h2 className="text-sm font-bold text-slate-900">
                Upload your course materials for {activeSubject?.name}
              </h2>
              <p className="text-xs text-slate-600 mt-1 max-w-xl leading-relaxed">
                GapFinder AI generates diagnostic questions and knowledge gap reports grounded strictly in your verified lecture notes, textbook chapters, or syllabus PDF/TXT files.
              </p>
            </div>
            <Link
              href="/materials"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-xs shrink-0 transition-colors"
            >
              <FileText className="w-4 h-4" />
              <span>Upload PDF/Notes</span>
            </Link>
          </div>
        </div>
      )}

      {/* Guided Onboarding Step 3: Documents uploaded, but No Quizzes Taken */}
      {hasNoQuizzes && (
        <div className="bg-gradient-to-r from-emerald-50 via-indigo-50 to-slate-50 border border-emerald-200 rounded-2xl p-5 mb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-600 text-white uppercase tracking-wider mb-1.5">
                Onboarding Step 3: Diagnostic Assessment
              </div>
              <h2 className="text-sm font-bold text-slate-900">
                Take your initial diagnostic quiz
              </h2>
              <p className="text-xs text-slate-600 mt-1 max-w-xl leading-relaxed">
                Your documents are uploaded! Complete an initial diagnostic assessment to evaluate your baseline topic comprehension, pinpoint exact misunderstandings, and generate an adaptive revision timetable.
              </p>
            </div>
            <Link
              href="/diagnostic"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs shrink-0 transition-colors"
            >
              <Stethoscope className="w-4 h-4" />
              <span>Start Diagnostic Quiz</span>
            </Link>
          </div>
        </div>
      )}

      {/* Assessed Mastery Calculation Banner */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Assessed Syllabus Mastery
            </div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-extrabold text-slate-900">
                {data?.report?.overall_mastery !== null && data?.report?.overall_mastery !== undefined
                  ? `${data.report.overall_mastery}%`
                  : "Not assessed"}
              </span>
              <span className="text-xs text-slate-500">
                {data?.report?.total_topics_count > 0 ? (
                  `calculated across ${data?.report?.assessed_topics_count || 0} of ${data?.report?.total_topics_count} syllabus topics`
                ) : (
                  "No syllabus topics extracted yet"
                )}
              </span>
            </div>
          </div>

          <div className="text-xs text-slate-500 max-w-sm bg-slate-50 p-2.5 rounded-lg border border-slate-200 leading-relaxed">
            <span className="font-semibold text-slate-700">Calculation Transparency:</span> Weighted average of earned marks across verified quiz attempts. Unassessed topics are excluded from the mastery score.
          </div>
        </div>

        <MasteryMeter score={data?.report?.overall_mastery ?? null} size="lg" showLabel={false} />

        {/* 4 Topic Metric Counts */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-slate-100 text-xs">
          <div className="p-2.5 rounded-xl bg-rose-50/70 border border-rose-100">
            <div className="font-semibold text-rose-700">Weak Topics (&lt;50%)</div>
            <div className="text-xl font-bold text-rose-900 mt-1">{data?.report?.weak_count ?? 0}</div>
            <div className="text-[11px] text-rose-600">Urgent review needed</div>
          </div>

          <div className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-100">
            <div className="font-semibold text-amber-700">Medium Topics (50–79%)</div>
            <div className="text-xl font-bold text-amber-900 mt-1">{data?.report?.medium_count ?? 0}</div>
            <div className="text-[11px] text-amber-600">Needs targeted practice</div>
          </div>

          <div className="p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-100">
            <div className="font-semibold text-emerald-700">Strong Topics (≥80%)</div>
            <div className="text-xl font-bold text-emerald-900 mt-1">{data?.report?.strong_count ?? 0}</div>
            <div className="text-[11px] text-emerald-600">Maintain with spaced recall</div>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
            <div className="font-semibold text-slate-600">Needs Assessment</div>
            <div className="text-xl font-bold text-slate-800 mt-1">{data?.report?.insufficient_data_count ?? 0}</div>
            <div className="text-[11px] text-slate-500">No attempts yet</div>
          </div>
        </div>
      </div>

      {/* Two Column Layout: Today's Tasks & Recent Quiz / Materials */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Today's Revision Schedule */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-indigo-600" />
                <h2 className="text-sm font-bold text-slate-900">Today's Adaptive Revision Tasks</h2>
              </div>
              <Link href="/revision-plan" className="text-xs font-semibold text-indigo-600 hover:text-indigo-500 flex items-center gap-1">
                <span>View Full Schedule</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {todayTasks.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 text-xs text-slate-500">
                No revision tasks scheduled for today. Complete a diagnostic assessment to generate an adaptive revision timetable based on your identified gaps.
              </div>
            ) : (
              <div className="space-y-3">
                {todayTasks.map((task: any) => (
                  <div
                    key={task.id}
                    className="p-3.5 rounded-xl border border-slate-200 hover:border-slate-300 bg-white transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <TaskStatusBadge status={task.status} />
                        <span className="font-semibold text-slate-900 text-xs">{task.title}</span>
                      </div>
                      <p className="text-[11px] text-slate-600 leading-relaxed">{task.description}</p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {task.duration_minutes}m
                      </span>
                      <Link
                        href={`/assistant?topicId=${task.topic_id}`}
                        className="px-2.5 py-1 text-[11px] font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
                      >
                        Explain
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Critical Knowledge Gaps Preview */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                <h2 className="text-sm font-bold text-slate-900">Urgent Knowledge Gaps</h2>
              </div>
              <Link href="/gap-report" className="text-xs font-semibold text-indigo-600 hover:text-indigo-500">
                Inspect All Gaps →
              </Link>
            </div>

            <div className="space-y-3 text-xs">
              {data?.report?.topics?.filter((t: any) => t.mastery?.status === "weak").length === 0 ? (
                <div className="p-6 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-500 text-xs">
                  No critical knowledge gaps detected. Complete a diagnostic assessment to benchmark your topic understanding.
                </div>
              ) : (
                data?.report?.topics
                  ?.filter((t: any) => t.mastery?.status === "weak")
                  .map((item: any) => (
                    <div key={item.topic.id} className="p-3.5 rounded-xl bg-rose-50/50 border border-rose-200">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-bold text-slate-900">{item.topic.name}</span>
                        <TopicStatusBadge status="weak" />
                      </div>
                      <p className="text-slate-600 text-[11px] mb-2">{item.mastery.evidence_summary}</p>
                      <div className="flex items-center justify-between text-[11px] pt-2 border-t border-rose-100">
                        <span className="text-rose-800 font-medium">Recommended: {item.recommended_action || item.recommendedAction}</span>
                        <Link
                          href={`/diagnostic?topicId=${item.topic.id}`}
                          className="font-semibold text-indigo-700 hover:underline"
                        >
                          Retest Topic
                        </Link>
                      </div>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column (1 Col): Course Materials & Quiz History */}
        <div className="space-y-6">
          {/* Active Course Materials */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-slate-700" />
                <h2 className="text-sm font-bold text-slate-900">Course Materials</h2>
              </div>
              <Link href="/materials" className="text-xs font-semibold text-indigo-600 hover:text-indigo-500">
                Manage
              </Link>
            </div>

            {data?.documents?.length === 0 ? (
              <div className="p-6 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 text-xs text-slate-500">
                No course materials uploaded yet. Upload syllabus or lecture notes to extract topics and start diagnostics.
              </div>
            ) : (
              <div className="space-y-2.5">
                {data?.documents?.slice(0, 3).map((doc: any) => (
                  <div key={doc.id} className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                    <div className="truncate mr-2">
                      <div className="font-medium text-slate-800 truncate">{doc.filename}</div>
                      <div className="text-[10px] text-slate-400 capitalize">{doc.status} • {doc.page_count ? `${doc.page_count} pages` : "Text"}</div>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                      {doc.status === "processed" ? "Indexed" : doc.status}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <Link
              href="/materials"
              className="mt-4 w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <span>Upload New PDF/Notes</span>
            </Link>
          </div>

          {/* Recent Quiz Attempts (Strictly Dynamic) */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-indigo-600" />
                <h2 className="text-sm font-bold text-slate-900">Recent Diagnostic Attempts</h2>
              </div>
              <Link href="/progress" className="text-xs font-semibold text-indigo-600 hover:text-indigo-500">
                History
              </Link>
            </div>

            {(!data?.progress?.quizHistory || data.progress.quizHistory.length === 0) ? (
              <div className="p-6 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 text-xs text-slate-500">
                No diagnostic quizzes completed yet.
                <Link href="/diagnostic" className="mt-2 block font-semibold text-indigo-600 hover:underline">
                  Take Your First Assessment →
                </Link>
              </div>
            ) : (
              <div className="space-y-2.5 text-xs">
                {data.progress.quizHistory.slice(-3).reverse().map((attempt: any) => (
                  <div key={attempt.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-slate-800">{attempt.quizType || "Diagnostic Check"}</div>
                      <div className="text-[11px] text-slate-400">{attempt.date} • {attempt.totalQuestions || 5} Questions</div>
                    </div>
                    <div className="text-right">
                      <span className={`text-base font-bold ${
                        attempt.score >= 80 ? "text-emerald-600" : attempt.score >= 50 ? "text-amber-600" : "text-rose-600"
                      }`}>
                        {attempt.score}%
                      </span>
                      <Link
                        href={`/results/${attempt.id}`}
                        className="block text-[10px] font-semibold text-indigo-600 hover:underline"
                      >
                        Review →
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-xs text-slate-500">Loading dashboard...</div>}>
      <DashboardContent />
    </Suspense>
  );
}
