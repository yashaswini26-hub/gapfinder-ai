import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { generateGapDiagnosisReport } from "@/lib/ai/gap-analysis";
import { createAdminClient } from "@/lib/supabase/server";
import { SAMPLE_SUBJECT } from "@/lib/demo/sample-data";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  const { searchParams } = new URL(req.url);
  const requestedSubjectId = searchParams.get("subjectId");

  // Demo user fast path
  if (!user || user.isDemoUser) {
    const subjectId = requestedSubjectId || SAMPLE_SUBJECT.id;
    const report = await generateGapDiagnosisReport({
      userId: "00000000-0000-0000-0000-000000000001",
      subjectId,
    });
    return NextResponse.json({ report });
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
        report: {
          subject_id: null,
          subject_name: null,
          overall_mastery: null,
          assessed_topics_count: 0,
          total_topics_count: 0,
          weak_count: 0,
          medium_count: 0,
          strong_count: 0,
          insufficient_data_count: 0,
          topics: [],
        },
      });
    }

    subjectId = userSubjects[0].id;
  }

  const report = await generateGapDiagnosisReport({
    userId: user.id,
    subjectId: subjectId!,
  });

  return NextResponse.json({ report });
}

