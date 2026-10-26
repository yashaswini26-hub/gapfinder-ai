import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { extractTopicMap } from "@/lib/ai/topic-mapping";
import { createAdminClient } from "@/lib/supabase/server";
import { SAMPLE_TOPICS } from "@/lib/demo/sample-data";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  const { searchParams } = new URL(req.url);
  const requestedSubjectId = searchParams.get("subjectId");

  if (!user || user.isDemoUser) {
    return NextResponse.json({ topics: SAMPLE_TOPICS });
  }

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
      return NextResponse.json({ topics: [] });
    }

    subjectId = userSubjects[0].id;
  }

  // Verify subject belongs to user
  const { data: verifiedSubject } = await supabase
    .from("subjects")
    .select("id")
    .eq("id", subjectId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!verifiedSubject) {
    return NextResponse.json({ topics: [] });
  }

  const { data: topics, error } = await supabase
    .from("topics")
    .select(`
      *,
      topic_mastery(mastery_score, status, confidence, assessed_question_count, last_assessed_at)
    `)
    .eq("subject_id", subjectId)
    .order("sort_order", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ topics: topics || [] });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    let { action, subjectId, name, syllabus_unit, importance, estimated_study_minutes } = body;

    const supabase = createAdminClient();
    if (!subjectId && !user.isDemoUser) {
      const { data: userSubjects } = await supabase
        .from("subjects")
        .select("id")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1);
      if (userSubjects && userSubjects.length > 0) {
        subjectId = userSubjects[0].id;
      }
    }

    if (!subjectId) {
      return NextResponse.json({ error: "subjectId is required" }, { status: 400 });
    }

    if (action === "extract") {
      const result = await extractTopicMap({
        userId: user.id,
        subjectId,
      });

      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }

      return NextResponse.json({ success: true, topics: result.topics });
    }

    // Manual single topic addition
    if (user.isDemoUser) {
      const newTopic = {
        id: `topic-${Date.now()}`,
        subject_id: subjectId,
        parent_topic_id: null,
        name: name || "New Custom Topic",
        description: null,
        syllabus_unit: syllabus_unit || "Custom Unit",
        importance: importance || 3,
        estimated_study_minutes: estimated_study_minutes || 45,
        sort_order: SAMPLE_TOPICS.length + 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      return NextResponse.json({ success: true, topic: newTopic });
    }

    const { data: newTopic, error } = await supabase
      .from("topics")
      .insert({
        subject_id: subjectId,
        name,
        syllabus_unit,
        importance: importance || 3,
        estimated_study_minutes: estimated_study_minutes || 45,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, topic: newTopic });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Topic operation failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
