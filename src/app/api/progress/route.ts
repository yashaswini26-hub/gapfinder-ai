import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/server";
import {
  SAMPLE_SUBJECT,
  SAMPLE_TOPICS,
  SAMPLE_TOPIC_MASTERY,
  SAMPLE_QUIZ_ATTEMPT,
  SAMPLE_REVISION_TASKS,
} from "@/lib/demo/sample-data";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  const { searchParams } = new URL(req.url);
  const requestedSubjectId = searchParams.get("subjectId");

  // Demo user fast path
  if (!user || user.isDemoUser) {
    const weakCount = SAMPLE_TOPIC_MASTERY.filter((m) => m.status === "weak").length;
    const mediumCount = SAMPLE_TOPIC_MASTERY.filter((m) => m.status === "medium").length;
    const strongCount = SAMPLE_TOPIC_MASTERY.filter((m) => m.status === "strong").length;
    const insufficientCount = SAMPLE_TOPIC_MASTERY.filter((m) => m.status === "insufficient_data").length;

    const topicScores = SAMPLE_TOPICS.map((t) => {
      const m = SAMPLE_TOPIC_MASTERY.find((item) => item.topic_id === t.id);
      return {
        name: t.name.length > 20 ? t.name.slice(0, 18) + "..." : t.name,
        fullName: t.name,
        score: m?.mastery_score ?? 0,
        status: m?.status ?? "insufficient_data",
      };
    });

    const quizHistory = [
      {
        id: SAMPLE_QUIZ_ATTEMPT.id,
        date: "Oct 24",
        score: 52,
        totalQuestions: 3,
        quizType: "Diagnostic Check 1",
      },
    ];

    const completedTasks = SAMPLE_REVISION_TASKS.filter((t) => t.status === "completed").length;
    const totalTasks = SAMPLE_REVISION_TASKS.length;

    return NextResponse.json({
      subject: SAMPLE_SUBJECT,
      overallMastery: 64,
      assessedTopics: 7,
      totalTopics: SAMPLE_TOPICS.length,
      distribution: [
        { name: "Strong (≥80%)", count: strongCount, color: "#10b981" },
        { name: "Medium (50-79%)", count: mediumCount, color: "#f59e0b" },
        { name: "Weak (<50%)", count: weakCount, color: "#ef4444" },
        { name: "Not Assessed", count: insufficientCount, color: "#94a3b8" },
      ],
      topicScores,
      quizHistory,
      tasksCompletion: {
        completed: completedTasks,
        total: totalTasks,
        percentage: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
      },
    });
  }

  // Real Authenticated Student
  const supabase = createAdminClient();
  let subjectId = requestedSubjectId;

  if (!subjectId) {
    const { data: userSubjects } = await supabase
      .from("subjects")
      .select("id, name, exam_date, daily_study_minutes")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1);

    if (!userSubjects || userSubjects.length === 0) {
      return NextResponse.json({
        subject: null,
        overallMastery: null,
        assessedTopics: 0,
        totalTopics: 0,
        distribution: [
          { name: "Strong (≥80%)", count: 0, color: "#10b981" },
          { name: "Medium (50-79%)", count: 0, color: "#f59e0b" },
          { name: "Weak (<50%)", count: 0, color: "#ef4444" },
          { name: "Not Assessed", count: 0, color: "#94a3b8" },
        ],
        topicScores: [],
        quizHistory: [],
        tasksCompletion: {
          completed: 0,
          total: 0,
          percentage: 0,
        },
      });
    }

    subjectId = userSubjects[0].id;
  }

  // Fetch subject info
  const { data: subject } = await supabase
    .from("subjects")
    .select("id, name, exam_date, daily_study_minutes")
    .eq("id", subjectId)
    .eq("user_id", user.id)
    .maybeSingle();

  // 1. Fetch all Topics for subject to know total topics
  const { data: allTopics } = await supabase
    .from("topics")
    .select("id, name")
    .eq("subject_id", subjectId);

  const totalTopicsCount = allTopics?.length || 0;

  // 2. Fetch Topic Mastery
  const { data: masteryList } = await supabase
    .from("topic_mastery")
    .select(`*, topics(name)`)
    .eq("user_id", user.id)
    .eq("subject_id", subjectId);

  const mList = masteryList || [];
  const weakCount = mList.filter((m: any) => m.status === "weak").length;
  const mediumCount = mList.filter((m: any) => m.status === "medium").length;
  const strongCount = mList.filter((m: any) => m.status === "strong").length;
  const assessed = mList.filter((m: any) => m.mastery_score !== null);
  const insufficientCount = Math.max(0, totalTopicsCount - assessed.length);

  const overallMastery =
    assessed.length > 0
      ? Math.round(assessed.reduce((acc: number, m: any) => acc + (m.mastery_score || 0), 0) / assessed.length)
      : null;

  const topicScores = mList.map((m: any) => ({
    name: m.topics?.name?.length > 20 ? m.topics?.name?.slice(0, 18) + "..." : m.topics?.name || "Topic",
    fullName: m.topics?.name || "Topic",
    score: m.mastery_score || 0,
    status: m.status,
  }));

  // 3. Fetch Quiz History
  const { data: attempts } = await supabase
    .from("quiz_attempts")
    .select("id, quiz_type, total_score, total_possible, submitted_at")
    .eq("user_id", user.id)
    .eq("subject_id", subjectId)
    .eq("status", "evaluated")
    .order("submitted_at", { ascending: true })
    .limit(10);

  const quizHistory = (attempts || []).map((a: any, idx: number) => {
    const pct = a.total_possible > 0 ? Math.round((a.total_score / a.total_possible) * 100) : 0;
    const d = a.submitted_at ? new Date(a.submitted_at) : new Date();
    return {
      id: a.id,
      date: `${d.toLocaleString("default", { month: "short" })} ${d.getDate()}`,
      score: pct,
      totalQuestions: 5,
      quizType: a.quiz_type || `Diagnostic ${idx + 1}`,
    };
  });

  // 4. Fetch Tasks completion
  const { data: tasks } = await supabase
    .from("revision_tasks")
    .select("status")
    .eq("user_id", user.id)
    .eq("subject_id", subjectId);

  const tList = tasks || [];
  const completed = tList.filter((t: any) => t.status === "completed").length;
  const total = tList.length;

  return NextResponse.json({
    subject,
    overallMastery,
    assessedTopics: assessed.length,
    totalTopics: totalTopicsCount,
    distribution: [
      { name: "Strong (≥80%)", count: strongCount, color: "#10b981" },
      { name: "Medium (50-79%)", count: mediumCount, color: "#f59e0b" },
      { name: "Weak (<50%)", count: weakCount, color: "#ef4444" },
      { name: "Not Assessed", count: insufficientCount, color: "#94a3b8" },
    ],
    topicScores,
    quizHistory,
    tasksCompletion: {
      completed,
      total,
      percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
    },
  });
}
