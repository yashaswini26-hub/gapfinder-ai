import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/server";
import { SAMPLE_DOCUMENTS } from "@/lib/demo/sample-data";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.isDemoUser) {
    return NextResponse.json({ documents: SAMPLE_DOCUMENTS });
  }

  const { searchParams } = new URL(req.url);
  const subjectId = searchParams.get("subjectId");

  const supabase = createAdminClient();
  let query = supabase
    .from("documents")
    .select("id, subject_id, filename, mime_type, file_size, status, processing_error, page_count, created_at, updated_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (subjectId) {
    query = query.eq("subject_id", subjectId);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ documents: data || [] });
}
