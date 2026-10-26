import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { askTopicAssistant } from "@/lib/ai/topic-assistant";
import { assistantMessageSchema } from "@/lib/validation/schemas";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const validated = assistantMessageSchema.parse(body);

    const result = await askTopicAssistant({
      userId: user.id,
      subjectId: validated.subjectId,
      topicId: validated.topicId,
      message: validated.message,
      sessionId: validated.sessionId,
    });

    return NextResponse.json(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Chat request failed";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
