import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { processDocumentIngestion } from "@/lib/ai/ingestion";
import { createAdminClient } from "@/lib/supabase/server";
import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE_BYTES } from "@/lib/validation/schemas";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    let subjectId = formData.get("subjectId") as string | null;

    if (!file) {
      return NextResponse.json(
        { error: "The 'file' parameter is required." },
        { status: 400 }
      );
    }

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
      return NextResponse.json(
        { error: "A valid 'subjectId' is required. Please set up a course subject first." },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { error: "File size exceeds the 20MB limit." },
        { status: 400 }
      );
    }

    const mimeType = file.type || "application/octet-stream";
    const filename = file.name || "uploaded_document";

    if (!ALLOWED_MIME_TYPES.includes(mimeType as any) && !filename.endsWith(".pdf") && !filename.endsWith(".txt")) {
      return NextResponse.json(
        { error: "Invalid file type. Only PDF and TXT files are supported." },
        { status: 400 }
      );
    }

    // Demo fast path
    if (user.isDemoUser) {
      return NextResponse.json({
        success: true,
        document: {
          id: `demo-doc-${Date.now()}`,
          filename,
          mime_type: mimeType,
          file_size: file.size,
          status: "processed",
          page_count: 5,
        },
        chunksCount: 8,
      });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 1. Create document record
    const storagePath = `user_${user.id}/${Date.now()}_${filename.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const { data: docRecord, error: docError } = await supabase
      .from("documents")
      .insert({
        user_id: user.id,
        subject_id: subjectId,
        filename,
        mime_type: mimeType,
        storage_path: storagePath,
        file_size: file.size,
        status: "uploaded",
      })
      .select()
      .single();

    if (docError || !docRecord) {
      return NextResponse.json(
        { error: `Database error: ${docError?.message || "Failed to create record"}` },
        { status: 500 }
      );
    }

    // 2. Upload file to Supabase Storage private bucket 'course_materials'
    await supabase.storage
      .from("course_materials")
      .upload(storagePath, buffer, { contentType: mimeType, upsert: true })
      .catch(() => {});

    // 3. Trigger ingestion (text extraction, chunking, embeddings, pgvector storage)
    const ingestion = await processDocumentIngestion(
      docRecord.id,
      user.id,
      buffer,
      mimeType,
      filename
    );

    return NextResponse.json({
      success: ingestion.success,
      document: docRecord,
      chunksCount: ingestion.chunksCount,
      error: ingestion.error,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Upload processing failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
