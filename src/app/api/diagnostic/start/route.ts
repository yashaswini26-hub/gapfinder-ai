import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { generateDiagnosticQuiz } from "@/lib/ai/question-generator";
import { diagnosticSetupSchema } from "@/lib/validation/schemas";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const validated = diagnosticSetupSchema.parse(body);

    const result = await generateDiagnosticQuiz({
      userId: user.id,
      subjectId: validated.subjectId,
      topicIds: validated.topicIds,
      questionCount: validated.questionCount,
      timeMinutes: validated.timeMinutes,
    });

    if (!result.success || !result.attempt) {
      return NextResponse.json(
        { error: result.error || "Failed to generate diagnostic quiz." },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      attemptId: result.attempt.id,
      questions: result.questions,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Invalid setup parameters";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
