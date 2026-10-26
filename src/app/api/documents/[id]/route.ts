import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/server";
import { SAMPLE_DOCUMENTS, SAMPLE_CHUNKS } from "@/lib/demo/sample-data";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  const { id } = await params;

  if (!user || user.isDemoUser) {
    const doc = SAMPLE_DOCUMENTS.find((d) => d.id === id) || SAMPLE_DOCUMENTS[0];
    return NextResponse.json({
      document: doc,
      chunks: SAMPLE_CHUNKS,
      chunkCount: SAMPLE_CHUNKS.length,
    });
  }

  const supabase = createAdminClient();
  const { data: doc, error } = await supabase
    .from("documents")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error || !doc) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  // Fetch chunks
  const { data: chunks } = await supabase
    .from("document_chunks")
    .select("id, chunk_index, content, page_number, section_title, token_count, created_at")
    .eq("document_id", id)
    .order("chunk_index", { ascending: true });

  return NextResponse.json({
    document: doc,
    chunks: chunks || [],
    chunkCount: chunks?.length || 0,
  });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  if (user.isDemoUser) {
    return NextResponse.json({ success: true, message: "Sample document removed from session" });
  }

  const supabase = createAdminClient();

  // Fetch storage path before deleting
  const { data: doc } = await supabase
    .from("documents")
    .select("storage_path")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (doc?.storage_path) {
    await supabase.storage.from("course_materials").remove([doc.storage_path]).catch(() => {});
  }

  // Delete document (foreign key ON DELETE CASCADE removes chunks)
  const { error } = await supabase
    .from("documents")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
