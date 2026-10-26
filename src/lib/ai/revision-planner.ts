import {
  Topic,
  TopicMastery,
  RevisionTask,
  RevisionPlanSummary,
} from "@/types";
import { createAdminClient } from "@/lib/supabase/server";
import { SAMPLE_REVISION_TASKS, SAMPLE_SUBJECT } from "@/lib/demo/sample-data";

export interface PlannerConfig {
  weights: {
    weakness: number; // 0.50
    importance: number; // 0.30
    urgency: number; // 0.20
  };
  defaultSessionMinutes: number; // 30
  maxDailyTasks: number; // 3
}

export const DEFAULT_PLANNER_CONFIG: PlannerConfig = {
  weights: {
    weakness: 0.5,
    importance: 0.3,
    urgency: 0.2,
  },
  defaultSessionMinutes: 30,
  maxDailyTasks: 3,
};

/**
 * Calculates exam urgency score (0 - 100) based on days until exam.
 */
export function calculateExamUrgency(examDateStr: string | null): {
  urgencyScore: number;
  daysRemaining: number | null;
} {
  if (!examDateStr) {
    return { urgencyScore: 25.0, daysRemaining: null };
  }

  const examTime = new Date(examDateStr).getTime();
  const nowTime = Date.now();
  const diffDays = Math.ceil((examTime - nowTime) / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) return { urgencyScore: 100.0, daysRemaining: 0 };
  if (diffDays <= 3) return { urgencyScore: 100.0, daysRemaining: diffDays };
  if (diffDays <= 7) return { urgencyScore: 85.0, daysRemaining: diffDays };
  if (diffDays <= 14) return { urgencyScore: 65.0, daysRemaining: diffDays };
  if (diffDays <= 30) return { urgencyScore: 45.0, daysRemaining: diffDays };
  return { urgencyScore: 20.0, daysRemaining: diffDays };
}

/**
 * Calculates deterministic revision priority score (0 - 100) for a topic.
 * Heuristic: 0.50 * weakness + 0.30 * syllabus_importance + 0.20 * exam_urgency
 */
export function calculateTopicPriority(
  topic: Topic,
  mastery: TopicMastery | undefined,
  urgencyScore: number,
  config: PlannerConfig = DEFAULT_PLANNER_CONFIG
): number {
  // 1. Weakness: 100 - mastery_score (if unassessed, assume 60.0 conservative uncertainty)
  const weakness =
    mastery && mastery.mastery_score !== null
      ? Math.max(0, 100 - mastery.mastery_score)
      : 60.0;

  // 2. Syllabus Importance normalized to 0 - 100
  const normImportance = Math.min(100, Math.max(0, (topic.importance / 5) * 100));

  // 3. Heuristic Priority
  const priority =
    config.weights.weakness * weakness +
    config.weights.importance * normImportance +
    config.weights.urgency * urgencyScore;

  return Math.round(priority * 10) / 10;
}

/**
 * Adaptive Revision Schedule Generator.
 * Respects daily study minutes and spreads high-priority tasks across available days.
 */
export async function generateRevisionPlan(params: {
  userId: string;
  subjectId: string;
}): Promise<RevisionPlanSummary> {
  const { userId, subjectId } = params;

  // Demo user fast path: return rich deterministic demo revision tasks ONLY for explicitly designated demo user
  if (userId === "00000000-0000-0000-0000-000000000001" || userId.startsWith("00000000-demo")) {
    const tasksByDate: Record<string, RevisionTask[]> = {};
    for (const t of SAMPLE_REVISION_TASKS) {
      if (!tasksByDate[t.scheduled_date]) tasksByDate[t.scheduled_date] = [];
      tasksByDate[t.scheduled_date].push(t);
    }

    return {
      subject_id: SAMPLE_SUBJECT.id,
      exam_date: SAMPLE_SUBJECT.exam_date,
      days_remaining: 14,
      daily_study_minutes: SAMPLE_SUBJECT.daily_study_minutes,
      total_scheduled_minutes: SAMPLE_REVISION_TASKS.reduce((acc, t) => acc + t.duration_minutes, 0),
      tasks_by_date: tasksByDate,
      pending_tasks_count: SAMPLE_REVISION_TASKS.filter((t) => t.status === "pending").length,
      completed_tasks_count: SAMPLE_REVISION_TASKS.filter((t) => t.status === "completed").length,
    };
  }

  const supabase = createAdminClient();

  // 1. Fetch Subject preferences ensuring ownership
  const { data: subject } = await supabase
    .from("subjects")
    .select("id, name, exam_date, daily_study_minutes")
    .eq("id", subjectId)
    .eq("user_id", userId)
    .maybeSingle();

  if (!subject) {
    return {
      subject_id: subjectId,
      exam_date: null,
      days_remaining: null,
      daily_study_minutes: 0,
      total_scheduled_minutes: 0,
      tasks_by_date: {},
      pending_tasks_count: 0,
      completed_tasks_count: 0,
    };
  }

  const dailyMinutes = subject?.daily_study_minutes || 60;
  const { urgencyScore, daysRemaining } = calculateExamUrgency(subject?.exam_date || null);

  // 2. Fetch Topics and current Mastery records
  const { data: topics } = await supabase
    .from("topics")
    .select("*")
    .eq("subject_id", subjectId);

  const { data: masteryList } = await supabase
    .from("topic_mastery")
    .select("*")
    .eq("user_id", userId)
    .eq("subject_id", subjectId);

  const masteryMap = new Map<string, TopicMastery>(
    (masteryList || []).map((m: TopicMastery) => [m.topic_id, m])
  );

  // 3. Fetch existing revision tasks (preserve completed tasks!)
  const { data: existingTasks } = await supabase
    .from("revision_tasks")
    .select("*")
    .eq("user_id", userId)
    .eq("subject_id", subjectId)
    .order("scheduled_date", { ascending: true });

  const existingCompleted = (existingTasks || []).filter((t: any) => t.status === "completed");

  // 4. Calculate priorities for each topic
  const scoredTopics = (topics || []).map((t: Topic) => {
    const mastery = masteryMap.get(t.id);
    const priority = calculateTopicPriority(t, mastery, urgencyScore);
    return { topic: t, mastery, priority };
  });

  // Filter ONLY topics with evaluated assessment results (do not generate tasks for unassessed material)
  const assessedScoredTopics = scoredTopics.filter(
    (item) => item.mastery && item.mastery.mastery_score !== null && item.mastery.status !== "insufficient_data"
  );

  // Sort descending by priority (highest priority first)
  assessedScoredTopics.sort((a, b) => b.priority - a.priority);

  // 5. Determine calendar schedule window
  const scheduleDays = Math.max(7, Math.min(daysRemaining || 14, 30));
  const newTasks: RevisionTask[] = [];

  // Remove old pending tasks before recalculating to keep schedule fresh
  await supabase
    .from("revision_tasks")
    .delete()
    .eq("user_id", userId)
    .eq("subject_id", subjectId)
    .eq("status", "pending");

  let currentDayOffset = 0;
  let dayMinutesUsed = 0;

  for (const item of assessedScoredTopics) {
    const t = item.topic;
    const m = item.mastery!;
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + currentDayOffset);
    const dateStr = targetDate.toISOString().split("T")[0];

    let title = "";
    let description = "";
    let duration = Math.min(45, Math.max(20, t.estimated_study_minutes || 30));

    if (m.status === "weak") {
      title = `Relearn Core Concepts: ${t.name}`;
      description = `Focus revision on missed concepts in ${t.name}. Review cited lecture notes and resolve fundamental misunderstandings.`;
      duration = 35;
    } else if (m.status === "medium") {
      title = `Targeted Practice: ${t.name}`;
      description = `Solidify comprehension of ${t.name} by working through edge-case practice questions.`;
      duration = 30;
    } else {
      title = `Spaced Retention Review: ${t.name}`;
      description = `Maintain strong recall of ${t.name} with a high-level conceptual summary.`;
      duration = 15;
    }

    // Check if adding this task exceeds daily budget
    if (dayMinutesUsed + duration > dailyMinutes) {
      currentDayOffset++;
      if (currentDayOffset >= scheduleDays) {
        currentDayOffset = scheduleDays - 1; // Cap at max schedule window
      }
      dayMinutesUsed = 0;
    }

    const scheduledDate = new Date();
    scheduledDate.setDate(scheduledDate.getDate() + currentDayOffset);

    const taskRow = {
      user_id: userId,
      subject_id: subjectId,
      topic_id: t.id,
      title,
      description,
      priority_score: item.priority,
      scheduled_date: scheduledDate.toISOString().split("T")[0],
      duration_minutes: duration,
      status: "pending" as const,
    };

    const { data: inserted } = await supabase
      .from("revision_tasks")
      .insert(taskRow)
      .select()
      .single();

    if (inserted) {
      newTasks.push(inserted);
      dayMinutesUsed += duration;
    }
  }

  // Combine newly scheduled tasks with preserved completed tasks
  const allTasks = [...existingCompleted, ...newTasks];
  const tasksByDate: Record<string, RevisionTask[]> = {};

  for (const task of allTasks) {
    if (!tasksByDate[task.scheduled_date]) {
      tasksByDate[task.scheduled_date] = [];
    }
    tasksByDate[task.scheduled_date].push(task);
  }

  return {
    subject_id: subjectId,
    exam_date: subject?.exam_date || null,
    days_remaining: daysRemaining,
    daily_study_minutes: dailyMinutes,
    total_scheduled_minutes: allTasks.reduce((acc, t) => acc + t.duration_minutes, 0),
    tasks_by_date: tasksByDate,
    pending_tasks_count: allTasks.filter((t) => t.status === "pending").length,
    completed_tasks_count: allTasks.filter((t) => t.status === "completed").length,
  };
}
