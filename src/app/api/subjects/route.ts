import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { subjectSchema } from "@/lib/validation/schemas";
import { createAdminClient } from "@/lib/supabase/server";
import { SAMPLE_SUBJECT } from "@/lib/demo/sample-data";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.isDemoUser) {
    return NextResponse.json({ subjects: [SAMPLE_SUBJECT] });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("subjects")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ subjects: data });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const validated = subjectSchema.parse(body);

    if (user.isDemoUser) {
      const demoSub = {
        ...SAMPLE_SUBJECT,
        name: validated.name,
        description: validated.description || null,
        exam_date: validated.examDate || null,
        daily_study_minutes: validated.dailyStudyMinutes,
      };
      return NextResponse.json({ subject: demoSub }, { status: 201 });
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("subjects")
      .insert({
        user_id: user.id,
        name: validated.name,
        description: validated.description || null,
        exam_date: validated.examDate || null,
        daily_study_minutes: validated.dailyStudyMinutes,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Mark onboarding completed on user profile
    await supabase
      .from("profiles")
      .update({ onboarding_completed: true })
      .eq("id", user.id);

    return NextResponse.json({ subject: data }, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Invalid payload";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
