import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase-server";
import { requireAuth } from "@/lib/auth";

// GET /api/sessions/[id]
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const payload = await requireAuth(req);
    const db = getServiceClient();

    const { data: session, error } = await db
      .from("sessions")
      .select("*")
      .eq("session_id", params.id)
      .eq("rep_id", payload.repId)
      .single();

    if (error || !session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // Also fetch related data
    const [photos, tasks, events] = await Promise.all([
      db.from("photo_assets").select("*").eq("session_id", params.id).order("display_order"),
      db.from("follow_up_tasks").select("*").eq("session_id", params.id).order("created_at"),
      db.from("audit_events").select("*").eq("session_id", params.id).order("occurred_at"),
    ]);

    return NextResponse.json({
      session,
      photos: photos.data || [],
      tasks: tasks.data || [],
      auditEvents: events.data || [],
    });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error("Session get error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/sessions/[id] — Archive (soft delete)
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const payload = await requireAuth(req);
    const db = getServiceClient();

    const { error } = await db
      .from("sessions")
      .update({ session_status: "archived" })
      .eq("session_id", params.id)
      .eq("rep_id", payload.repId);

    if (error) throw error;

    return NextResponse.json({ ok: true, archived: params.id });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error("Session delete error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
