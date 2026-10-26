import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { generateRevisionPlan } from "@/lib/ai/revision-planner";
import { createAdminClient } from "@/lib/supabase/server";
import { SAMPLE_SUBJECT } from "@/lib/demo/sample-data";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  const { searchParams } = new URL(req.url);
  const requestedSubjectId = searchParams.get("subjectId");

  // Demo user fast path
  if (!user || user.isDemoUser) {
    const subjectId = requestedSubjectId || SAMPLE_SUBJECT.id;
    const plan = await generateRevisionPlan({
      userId: "00000000-0000-0000-0000-000000000001",
      subjectId,
    });
    return NextResponse.json({ plan });
  }

  // Real Authenticated Student
  const supabase = createAdminClient();
  let subjectId = requestedSubjectId;

  if (!subjectId) {
    const { data: userSubjects } = await supabase
      .from("subjects")
      .select("id")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1);

    if (!userSubjects || userSubjects.length === 0) {
      return NextResponse.json({
        plan: {
          subject_id: "",
          exam_date: null,
          days_remaining: null,
          daily_study_minutes: 0,
          total_scheduled_minutes: 0,
          tasks_by_date: {},
          pending_tasks_count: 0,
          completed_tasks_count: 0,
        },
      });
    }

    subjectId = userSubjects[0].id;
  }

  const plan = await generateRevisionPlan({
    userId: user.id,
    subjectId: subjectId!,
  });

  return NextResponse.json({ plan });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    let subjectId = body.subjectId;

    if (user.isDemoUser) {
      const plan = await generateRevisionPlan({
        userId: "00000000-0000-0000-0000-000000000001",
        subjectId: subjectId || SAMPLE_SUBJECT.id,
      });
      return NextResponse.json({ success: true, plan });
    }

    const supabase = createAdminClient();
    if (!subjectId) {
      const { data: userSubjects } = await supabase
        .from("subjects")
        .select("id")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1);

      if (!userSubjects || userSubjects.length === 0) {
        return NextResponse.json({ error: "No subject configured" }, { status: 400 });
      }
      subjectId = userSubjects[0].id;
    }

    const plan = await generateRevisionPlan({
      userId: user.id,
      subjectId,
    });

    return NextResponse.json({ success: true, plan });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Plan generation failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

