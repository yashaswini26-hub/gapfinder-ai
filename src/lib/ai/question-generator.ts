import { generateStructuredContent } from "./provider";
import { questionSetResponseSchema } from "@/lib/validation/schemas";
import { retrieveRelevantChunks } from "./retrieval";
import { createAdminClient } from "@/lib/supabase/server";
import { QuestionPrivate, QuestionPublic, QuizAttempt, SourceReference } from "@/types";
import { SAMPLE_QUESTIONS, SAMPLE_QUIZ_ATTEMPT } from "@/lib/demo/sample-data";

export interface GenerateQuizParams {
  userId: string;
  subjectId: string;
  topicIds?: string[];
  questionCount: number;
  timeMinutes: number;
}

/**
 * Diagnostic Quiz Generator.
 * Retrieves evidence per topic and synthesizes grounded questions with verified citations.
 */
export async function generateDiagnosticQuiz(
  params: GenerateQuizParams
): Promise<{ success: boolean; attempt?: QuizAttempt; questions?: QuestionPublic[]; error?: string }> {
  const { userId, subjectId, topicIds, questionCount } = params;

  // Demo user fast path: return sample questions ONLY for explicitly designated demo user
  if (userId === "00000000-0000-0000-0000-000000000001" || userId.startsWith("00000000-demo")) {
    const publicQuestions: QuestionPublic[] = SAMPLE_QUESTIONS.map((q) => {
      const { correct_answer, explanation, rubric, ...pub } = q;
      return pub;
    });

    return {
      success: true,
      attempt: SAMPLE_QUIZ_ATTEMPT,
      questions: publicQuestions,
    };
  }

  const supabase = createAdminClient();

  // 1. Fetch topics for this subject
  let topicQuery = supabase
    .from("topics")
    .select("id, name, description, syllabus_unit")
    .eq("subject_id", subjectId);

  if (topicIds && topicIds.length > 0) {
    topicQuery = topicQuery.in("id", topicIds);
  }

  const { data: topics, error: topicError } = await topicQuery;

  if (topicError || !topics || topics.length === 0) {
    return {
      success: false,
      error: "No topics found for this subject. Please generate or add syllabus topics first.",
    };
  }

  // 2. Retrieve grounded evidence chunks for each selected topic
  const topicContexts: {
    topicId: string;
    topicName: string;
    chunks: { id: string; content: string; filename?: string; page_number?: number | null; section_title?: string | null }[];
  }[] = [];

  for (const topic of topics.slice(0, 8)) {
    const retrieval = await retrieveRelevantChunks({
      userId,
      subjectId,
      query: `${topic.name} ${topic.description || ""}`,
      topK: 3,
    });

    if (retrieval.chunks.length > 0) {
      topicContexts.push({
        topicId: topic.id,
        topicName: topic.name,
        chunks: retrieval.chunks.map((c) => ({
          id: c.id,
          content: c.content,
          filename: c.filename,
          page_number: c.page_number,
          section_title: c.section_title,
        })),
      });
    }
  }

  if (topicContexts.length === 0) {
    return {
      success: false,
      error: "Insufficient study material retrieved to ground diagnostic questions. Please upload course materials or notes.",
    };
  }

  // 3. Format context string with valid chunk IDs for grounding validation
  const validChunkIds = new Set<string>();
  const chunkMap = new Map<string, { filename: string; page_number: number | null; section_title: string | null; snippet: string }>();

  let contextString = "";
  for (const tc of topicContexts) {
    contextString += `\n### Topic: "${tc.topicName}" (Topic ID: ${tc.topicId})\n`;
    for (const c of tc.chunks) {
      validChunkIds.add(c.id);
      chunkMap.set(c.id, {
        filename: c.filename || "Uploaded Material",
        page_number: c.page_number ?? null,
        section_title: c.section_title ?? null,
        snippet: c.content.slice(0, 150),
      });
      contextString += `[CHUNK ID: ${c.id}] (Page: ${c.page_number || "N/A"}, Section: ${c.section_title || "General"})\n${c.content}\n\n`;
    }
  }

  const prompt = `Generate exactly ${Math.min(questionCount, 15)} high-quality diagnostic questions strictly grounded in the following course material chunks.
Do NOT invent facts not present in the chunks.
Every single question MUST cite at least one valid CHUNK ID provided in the text.

Question Types to include:
- single_choice: Multiple choice with 4 options and exactly one correct answer.
- true_false: True/false statement based directly on definitions in the text.
- short_answer: Conceptual question testing key definitions, mechanisms, or protocols with a scoring rubric.

GROUNDED MATERIAL CHUNKS:
${contextString}`;

  const aiResult = await generateStructuredContent({
    prompt,
    systemInstruction:
      "You are a rigorous university professor and diagnostic assessment architect. Generate questions that test deep conceptual understanding, identifying subtle misconceptions without ever hallucinating facts outside the provided reference text.",
    schema: questionSetResponseSchema,
  });

  if (!aiResult.success || !aiResult.data || aiResult.data.questions.length === 0) {
    return {
      success: false,
      error: aiResult.error || "Failed to generate grounded questions.",
    };
  }

  // 4. Validate citation chunk IDs and sanitize questions
  const validatedQuestions = aiResult.data.questions.filter((q) => {
    // Check that at least one citation matches a real retrieved chunk ID
    const hasValidCitation = q.source_references.some((ref) => validChunkIds.has(ref.chunk_id));
    return hasValidCitation;
  });

  if (validatedQuestions.length === 0) {
    return {
      success: false,
      error: "Generated questions could not be validated against retrieved chunks.",
    };
  }

  // 5. Create Quiz Attempt in Database
  const { data: attemptRow, error: attemptError } = await supabase
    .from("quiz_attempts")
    .insert({
      user_id: userId,
      subject_id: subjectId,
      quiz_type: "diagnostic",
      status: "in_progress",
    })
    .select()
    .single();

  if (attemptError || !attemptRow) {
    return { success: false, error: "Failed to persist quiz attempt." };
  }

  // 6. Save Questions (Public) and Answer Keys (Isolated)
  const publicQuestions: QuestionPublic[] = [];

  for (const q of validatedQuestions) {
    // Reconstruct verified source references
    const verifiedRefs: SourceReference[] = q.source_references
      .filter((ref) => validChunkIds.has(ref.chunk_id))
      .map((ref) => {
        const meta = chunkMap.get(ref.chunk_id);
        return {
          document_id: ref.document_id || "doc-user",
          document_name: meta?.filename || ref.document_name || "Course Notes",
          chunk_id: ref.chunk_id,
          page_number: meta?.page_number ?? ref.page_number ?? null,
          section_title: meta?.section_title ?? ref.section_title ?? null,
          quote_snippet: ref.quote_snippet || meta?.snippet || "",
        };
      });

    const { data: qRow, error: qError } = await supabase
      .from("questions")
      .insert({
        attempt_id: attemptRow.id,
        topic_id: q.topic_id,
        question_type: q.question_type,
        question_text: q.question_text,
        options: q.options || null,
        explanation: q.explanation,
        difficulty: q.difficulty,
        marks: q.marks,
        source_references: verifiedRefs,
      })
      .select()
      .single();

    if (!qError && qRow) {
      // Save protected answer key into secure table
      await supabase.from("question_answer_keys").insert({
        question_id: qRow.id,
        correct_answer: q.correct_answer,
        rubric: q.rubric || null,
      });

      publicQuestions.push({
        id: qRow.id,
        attempt_id: attemptRow.id,
        topic_id: qRow.topic_id,
        question_type: qRow.question_type,
        question_text: qRow.question_text,
        options: qRow.options,
        difficulty: qRow.difficulty,
        marks: qRow.marks,
        source_references: qRow.source_references,
      });
    }
  }

  return {
    success: true,
    attempt: attemptRow,
    questions: publicQuestions,
  };
}
