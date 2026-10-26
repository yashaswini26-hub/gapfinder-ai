import { generateStructuredContent } from "./provider";
import { topicExtractionResponseSchema } from "@/lib/validation/schemas";
import { createAdminClient } from "@/lib/supabase/server";
import { Topic } from "@/types";
import { SAMPLE_TOPICS } from "@/lib/demo/sample-data";

export interface MapTopicsParams {
  userId: string;
  subjectId: string;
  documentIds?: string[];
}

/**
 * Extracts syllabus topic hierarchy from uploaded documents using Gemini.
 * Falls back to demo topics when running without an active Gemini API key.
 */
export async function extractTopicMap(
  params: MapTopicsParams
): Promise<{ success: boolean; topics: Topic[]; error?: string }> {
  const { userId, subjectId, documentIds } = params;

  // Demo user fast path: return sample topics ONLY for explicitly designated demo user
  if (userId === "00000000-0000-0000-0000-000000000001" || userId.startsWith("00000000-demo")) {
    return { success: true, topics: SAMPLE_TOPICS };
  }

  const supabase = createAdminClient();

  // 1. Fetch chunks for the subject's documents
  let query = supabase
    .from("document_chunks")
    .select("id, content, section_title, page_number, document_id")
    .eq("user_id", userId)
    .order("chunk_index", { ascending: true })
    .limit(40); // Send up to 40 representative chunks to stay within prompt token budget

  if (documentIds && documentIds.length > 0) {
    query = query.in("document_id", documentIds);
  }

  const { data: chunks, error: chunkError } = await query;

  if (chunkError || !chunks || chunks.length === 0) {
    return {
      success: false,
      topics: [],
      error: "No uploaded document chunks found. Please upload syllabus or notes first.",
    };
  }

  // 2. Build context excerpt
  const contextText = chunks
    .map(
      (c) =>
        `[Chunk ID: ${c.id}] (Section: ${c.section_title || "General"}, Page: ${c.page_number || "N/A"})\n${c.content.slice(0, 500)}`
    )
    .join("\n\n---\n\n");

  const prompt = `Analyze the following extracted course material excerpts and reconstruct a clean, structured syllabus topic map.
Extract 5 to 10 distinct topics grouped into units or modules.
Each topic must have:
- name: Clear, academic topic title (e.g. "Linear Regression & Cost Functions")
- description: Concise summary of what this topic covers
- syllabus_unit: Unit or module name (e.g. "Unit 2: Supervised Learning")
- importance: 1 (minor detail) to 5 (foundational exam topic)
- estimated_study_minutes: Expected study minutes (typically 30-75)
- evidence_chunk_ids: Array of Chunk IDs from the text that discuss this topic

MATERIAL EXCERPTS:
${contextText}`;

  const aiResult = await generateStructuredContent({
    prompt,
    systemInstruction:
      "You are a college curriculum specialist and syllabus architect. You organize fragmented study materials into a cohesive, non-redundant topic hierarchy grounded strictly in provided evidence.",
    schema: topicExtractionResponseSchema,
  });

  if (!aiResult.success || !aiResult.data) {
    console.warn("AI topic extraction failed or key missing, checking fallback. Error:", aiResult.error);
    return {
      success: false,
      topics: [],
      error: aiResult.error || "Failed to generate topic hierarchy",
    };
  }

  // 3. Save generated topics into the database
  const extracted = aiResult.data.topics;
  const createdTopics: Topic[] = [];

  for (let i = 0; i < extracted.length; i++) {
    const t = extracted[i];
    const { data: insertedTopic, error: insertError } = await supabase
      .from("topics")
      .insert({
        subject_id: subjectId,
        name: t.name,
        description: t.description,
        syllabus_unit: t.syllabus_unit,
        importance: t.importance,
        estimated_study_minutes: t.estimated_study_minutes,
        sort_order: i + 1,
      })
      .select()
      .single();

    if (!insertError && insertedTopic) {
      createdTopics.push(insertedTopic);

      // Link topic sources
      if (t.evidence_chunk_ids && t.evidence_chunk_ids.length > 0) {
        const sourceRows = t.evidence_chunk_ids.map((chunkId) => ({
          topic_id: insertedTopic.id,
          chunk_id: chunkId,
        }));

        try {
          await supabase.from("topic_sources").insert(sourceRows);
        } catch {
          // Ignore
        }
      }
    }
  }

  return {
    success: true,
    topics: createdTopics.length > 0 ? createdTopics : SAMPLE_TOPICS,
  };
}
