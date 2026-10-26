import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/server";
import {
  SAMPLE_SUBJECT,
  SAMPLE_TOPICS,
  SAMPLE_DOCUMENTS,
  SAMPLE_CHUNKS,
  SAMPLE_TOPIC_MASTERY,
  SAMPLE_QUIZ_ATTEMPT,
  SAMPLE_QUESTIONS,
  SAMPLE_RESPONSES,
  SAMPLE_REVISION_TASKS,
} from "@/lib/demo/sample-data";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  const userId = user?.id || "00000000-0000-0000-0000-000000000001";

  if (user?.isDemoUser || userId.startsWith("00000000")) {
    return NextResponse.json({
      success: true,
      message: "Sample demo dataset is active in your demo session.",
    });
  }

  try {
    const supabase = createAdminClient();

    // 1. Create Sample Subject
    const { data: subject, error: subErr } = await supabase
      .from("subjects")
      .insert({
        user_id: userId,
        name: SAMPLE_SUBJECT.name,
        description: SAMPLE_SUBJECT.description,
        exam_date: SAMPLE_SUBJECT.exam_date,
        daily_study_minutes: SAMPLE_SUBJECT.daily_study_minutes,
      })
      .select()
      .single();

    if (subErr || !subject) {
      return NextResponse.json({ error: subErr?.message || "Failed to create subject" }, { status: 500 });
    }

    const subjectId = subject.id;

    // 2. Insert Sample Documents
    const docMap = new Map<string, string>();
    for (const d of SAMPLE_DOCUMENTS) {
      const { data: docRow } = await supabase
        .from("documents")
        .insert({
          user_id: userId,
          subject_id: subjectId,
          filename: d.filename,
          mime_type: d.mime_type,
          storage_path: d.storage_path,
          file_size: d.file_size,
          status: "processed",
          page_count: d.page_count,
        })
        .select()
        .single();

      if (docRow) docMap.set(d.id, docRow.id);
    }

    // 3. Insert Sample Chunks
    const chunkMap = new Map<string, string>();
    for (const c of SAMPLE_CHUNKS) {
      const realDocId = docMap.get(c.document_id) || Array.from(docMap.values())[0];
      const { data: cRow } = await supabase
        .from("document_chunks")
        .insert({
          document_id: realDocId,
          user_id: userId,
          chunk_index: c.chunk_index,
          content: c.content,
          page_number: c.page_number,
          section_title: c.section_title,
          token_count: c.token_count,
        })
        .select()
        .single();

      if (cRow) chunkMap.set(c.id, cRow.id);
    }

    // 4. Insert Topics
    const topicMap = new Map<string, string>();
    for (const t of SAMPLE_TOPICS) {
      const { data: tRow } = await supabase
        .from("topics")
        .insert({
          subject_id: subjectId,
          name: t.name,
          description: t.description,
          syllabus_unit: t.syllabus_unit,
          importance: t.importance,
          estimated_study_minutes: t.estimated_study_minutes,
          sort_order: t.sort_order,
        })
        .select()
        .single();

      if (tRow) topicMap.set(t.id, tRow.id);
    }

    // 5. Insert Topic Mastery
    for (const m of SAMPLE_TOPIC_MASTERY) {
      const realTopicId = topicMap.get(m.topic_id);
      if (!realTopicId) continue;

      await supabase.from("topic_mastery").insert({
        user_id: userId,
        subject_id: subjectId,
        topic_id: realTopicId,
        mastery_score: m.mastery_score,
        status: m.status,
        confidence: m.confidence,
        assessed_question_count: m.assessed_question_count,
        evidence_summary: m.evidence_summary,
        last_assessed_at: m.last_assessed_at,
      });
    }

    // 6. Insert Revision Tasks
    for (const task of SAMPLE_REVISION_TASKS) {
      const realTopicId = topicMap.get(task.topic_id);
      if (!realTopicId) continue;

      await supabase.from("revision_tasks").insert({
        user_id: userId,
        subject_id: subjectId,
        topic_id: realTopicId,
        title: task.title,
        description: task.description,
        priority_score: task.priority_score,
        scheduled_date: task.scheduled_date,
        duration_minutes: task.duration_minutes,
        status: task.status,
      });
    }

    return NextResponse.json({
      success: true,
      message: "Sample subject, syllabus topics, and diagnosis records seeded successfully!",
      subjectId,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Seeding failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
