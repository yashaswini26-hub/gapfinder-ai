import { generateText } from "./provider";
import { retrieveRelevantChunks } from "./retrieval";
import { createAdminClient } from "@/lib/supabase/server";
import { SourceReference } from "@/types";

export interface AssistantChatParams {
  userId: string;
  subjectId: string;
  topicId?: string | null;
  message: string;
  sessionId?: string | null;
}

export interface AssistantChatResponse {
  sessionId: string;
  reply: string;
  citations: SourceReference[];
  sufficientEvidence: boolean;
  suggestedQuestions: string[];
}

/**
 * Grounded Topic Explanation Assistant.
 * Uses strict RAG to explain concepts with citations directly from student's notes.
 */
export async function askTopicAssistant(
  params: AssistantChatParams
): Promise<AssistantChatResponse> {
  const { userId, subjectId, topicId, message, sessionId } = params;

  // 1. Retrieve evidence chunks strictly matching user's documents
  const retrieval = await retrieveRelevantChunks({
    userId,
    subjectId,
    topicId,
    query: message,
    topK: 4,
    minSimilarity: 0.4,
  });

  // If no evidence found in student's notes, be completely honest:
  if (!retrieval.sufficientEvidence || retrieval.chunks.length === 0) {
    return {
      sessionId: sessionId || "demo-session",
      reply: `I searched your uploaded materials for "${message}", but could not find sufficient information to provide a grounded explanation.\n\nTo ensure academic accuracy and avoid hallucinations, GapFinder AI answers only from your verified course files. Please upload textbook chapters, lecture notes, or slides covering this topic in the Materials section.`,
      citations: [],
      sufficientEvidence: false,
      suggestedQuestions: [
        "What topics are currently covered in my uploaded notes?",
        "Can you summarize the syllabus units?",
      ],
    };
  }

  // 2. Format context excerpts
  const contextString = retrieval.chunks
    .map(
      (c) =>
        `[Document: ${c.filename || "Notes"}, Page ${c.page_number || "N/A"}, Section: "${c.section_title || "General"}"]\n${c.content}`
    )
    .join("\n\n---\n\n");

  const prompt = `Student Question: "${message}"

GROUNDED COURSE MATERIAL EVIDENCE:
${contextString}

Answer the student's question accurately using ONLY the grounded evidence above.
Cite the relevant document name, page number, and section title when explaining key concepts.
Do not invent information beyond the provided excerpts. Keep your tone encouraging and educational.`;

  const aiResult = await generateText({
    prompt,
    systemInstruction:
      "You are the GapFinder AI Academic Assistant. Your explanations must be strictly faithful to the provided reference materials. Never fabricate facts or citations.",
    temperature: 0.2,
  });

  const reply =
    aiResult.success && aiResult.text
      ? aiResult.text
      : `Based on your course materials in ${retrieval.citations[0]?.document_name || "lecture notes"} (Page ${retrieval.citations[0]?.page_number || "N/A"}), this concept relates to: ${retrieval.chunks[0]?.content.slice(0, 300)}...`;

  // 3. Persist message history if live Supabase is active
  let finalSessionId = sessionId || "";
  try {
    const supabase = createAdminClient();
    if (!finalSessionId) {
      const { data: newSession } = await supabase
        .from("chat_sessions")
        .insert({
          user_id: userId,
          subject_id: subjectId,
          topic_id: topicId || null,
          title: message.slice(0, 50),
        })
        .select("id")
        .single();
      finalSessionId = newSession?.id || "session-temp";
    }

    if (finalSessionId && !finalSessionId.startsWith("demo")) {
      // Save user message
      await supabase.from("chat_messages").insert({
        session_id: finalSessionId,
        sender: "user",
        content: message,
        citations: [],
      });

      // Save assistant reply
      await supabase.from("chat_messages").insert({
        session_id: finalSessionId,
        sender: "assistant",
        content: reply,
        citations: retrieval.citations,
      });
    }
  } catch (err) {
    // Non-blocking for demo/fallback
  }

  return {
    sessionId: finalSessionId || "demo-session",
    reply,
    citations: retrieval.citations,
    sufficientEvidence: true,
    suggestedQuestions: [
      "Could you give an example of this concept from the notes?",
      "What is a common exam question on this section?",
      "How does this relate to the next syllabus topic?",
    ],
  };
}
