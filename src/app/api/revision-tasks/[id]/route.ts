import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { updateTaskStatusSchema } from "@/lib/validation/schemas";
import { createAdminClient } from "@/lib/supabase/server";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const body = await req.json();
    const validated = updateTaskStatusSchema.parse(body);

    if (user.isDemoUser) {
      return NextResponse.json({
        success: true,
        task: {
          id,
          status: validated.status,
          completion_notes: validated.completionNotes || null,
        },
      });
    }

    const supabase = createAdminClient();
    const { data: updated, error } = await supabase
      .from("revision_tasks")
      .update({
        status: validated.status,
        completion_metadata: validated.completionNotes
          ? { notes: validated.completionNotes, completed_at: new Date().toISOString() }
          : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, task: updated });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Invalid payload";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
