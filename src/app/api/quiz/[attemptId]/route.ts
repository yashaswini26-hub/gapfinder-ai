import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/server";
import {
  SAMPLE_QUIZ_ATTEMPT,
  SAMPLE_QUESTIONS,
  SAMPLE_RESPONSES,
} from "@/lib/demo/sample-data";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ attemptId: string }> }
) {
  const user = await getCurrentUser();
  const { attemptId } = await params;

  // Demo user fast path
  if (!user || user.isDemoUser || attemptId.startsWith("attempt-demo")) {
    return NextResponse.json({
      attempt: SAMPLE_QUIZ_ATTEMPT,
      questions: SAMPLE_QUESTIONS,
      responses: SAMPLE_RESPONSES,
    });
  }

  const supabase = createAdminClient();

  // 1. Fetch attempt and check user authorization
  const { data: attempt, error: attemptErr } = await supabase
    .from("quiz_attempts")
    .select("*")
    .eq("id", attemptId)
    .eq("user_id", user.id)
    .single();

  if (attemptErr || !attempt) {
    return NextResponse.json({ error: "Quiz attempt not found or unauthorized." }, { status: 404 });
  }

  // 2. Fetch questions
  const { data: questions, error: qErr } = await supabase
    .from("questions")
    .select(`
      id, attempt_id, topic_id, question_type, question_text, options,
      difficulty, marks, explanation, source_references
    `)
    .eq("attempt_id", attemptId);

  if (qErr || !questions) {
    return NextResponse.json({ error: "Could not load questions." }, { status: 500 });
  }

  // If in_progress, DO NOT reveal correct answers!
  if (attempt.status === "in_progress") {
    return NextResponse.json({
      attempt,
      questions: questions.map((q) => {
        // Strip explanations and answers while in-progress
        return {
          id: q.id,
          attempt_id: q.attempt_id,
          topic_id: q.topic_id,
          question_type: q.question_type,
          question_text: q.question_text,
          options: q.options,
          difficulty: q.difficulty,
          marks: q.marks,
          source_references: q.source_references,
        };
      }),
      responses: [],
    });
  }

  // If evaluated, fetch responses and secure answer keys
  const { data: responses } = await supabase
    .from("responses")
    .select("*")
    .eq("attempt_id", attemptId)
    .eq("user_id", user.id);

  const { data: answerKeys } = await supabase
    .from("question_answer_keys")
    .select("question_id, correct_answer, rubric")
    .in("question_id", questions.map((q) => q.id));

  const keyMap = new Map((answerKeys || []).map((k: any) => [k.question_id, k]));

  const completeQuestions = questions.map((q) => {
    const k = keyMap.get(q.id);
    return {
      ...q,
      correct_answer: k?.correct_answer ?? null,
      rubric: k?.rubric ?? null,
    };
  });

  return NextResponse.json({
    attempt,
    questions: completeQuestions,
    responses: responses || [],
  });
}
