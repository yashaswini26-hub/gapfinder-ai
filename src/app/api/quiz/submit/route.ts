import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { evaluateQuizSubmission } from "@/lib/ai/answer-evaluator";
import { generateGapDiagnosisReport } from "@/lib/ai/gap-analysis";
import { quizSubmissionSchema } from "@/lib/validation/schemas";
import { createAdminClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const validated = quizSubmissionSchema.parse(body);

    const evalResult = await evaluateQuizSubmission({
      attemptId: validated.attempt_id,
      userId: user.id,
      submissions: validated.responses,
    });

    if (!evalResult.success || !evalResult.result) {
      return NextResponse.json(
        { error: evalResult.error || "Failed to evaluate quiz submission." },
        { status: 500 }
      );
    }

    // Trigger deterministic gap diagnosis update with newly saved assessment data
    if (!user.isDemoUser) {
      try {
        const supabase = createAdminClient();
        const { data: attempt } = await supabase
          .from("quiz_attempts")
          .select("subject_id")
          .eq("id", validated.attempt_id)
          .single();

        if (attempt?.subject_id) {
          await generateGapDiagnosisReport({
            userId: user.id,
            subjectId: attempt.subject_id,
          });
        }
      } catch (err) {
        console.error("Post-quiz gap update error:", err);
      }
    }

    return NextResponse.json({
      success: true,
      result: evalResult.result,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Invalid submission";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
