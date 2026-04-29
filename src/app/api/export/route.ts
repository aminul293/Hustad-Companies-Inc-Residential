import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase-server";
import { requireAuth } from "@/lib/auth";

// GET /api/export?session_id=xxx — Export full session data as JSON
export async function GET(req: NextRequest) {
  try {
    const payload = await requireAuth(req);
    const db = getServiceClient();

    const url = new URL(req.url);
    const sessionId = url.searchParams.get("session_id");

    if (!sessionId) {
      return NextResponse.json({ error: "session_id required" }, { status: 400 });
    }

    // Fetch all related data
    const [sessionRes, photosRes, tasksRes, eventsRes] = await Promise.all([
      db.from("sessions").select("*").eq("session_id", sessionId).eq("rep_id", payload.repId).single(),
      db.from("photo_assets").select("*").eq("session_id", sessionId).order("display_order"),
      db.from("follow_up_tasks").select("*").eq("session_id", sessionId),
      db.from("audit_events").select("*").eq("session_id", sessionId).order("occurred_at"),
    ]);

    if (!sessionRes.data) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const exportData = {
      exportedAt: new Date().toISOString(),
      exportedBy: payload.name,
      session: sessionRes.data,
      photos: (photosRes.data || []).map((p: any) => ({
        assetId: p.asset_id,
        url: p.storage_url,
        caption: p.caption,
        category: p.category,
      })),
      followUpTasks: tasksRes.data || [],
      auditLog: eventsRes.data || [],
    };

    return new NextResponse(JSON.stringify(exportData, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="hustad_session_${sessionId}.json"`,
      },
    });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error("Export error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
