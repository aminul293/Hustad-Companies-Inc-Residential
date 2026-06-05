import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase-server";
import { requireAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET /api/export?session_id=xxx — Export full session data as JSON
export async function GET(req: NextRequest) {
  // #region agent log
  fetch('http://127.0.0.1:7331/ingest/ef9d6ee3-7cee-4b0f-9d60-ae5de7a559bd',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'87fc44'},body:JSON.stringify({sessionId:'87fc44',location:'api/export/route.ts:GET-entry',message:'export route invoked',data:{hasUrl:!!req.url,hasAuthHeader:!!req.headers.get('authorization')},timestamp:Date.now(),hypothesisId:'H1'})}).catch(()=>{});
  // #endregion
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
      db.from("inspection_sessions").select("*").eq("session_id", sessionId).eq("rep_id", payload.repId).single(),
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
    // #region agent log
    fetch('http://127.0.0.1:7331/ingest/ef9d6ee3-7cee-4b0f-9d60-ae5de7a559bd',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'87fc44'},body:JSON.stringify({sessionId:'87fc44',location:'api/export/route.ts:GET-catch',message:'export route error',data:{errName:(err as Error)?.name,errMsg:(err as Error)?.message,errDigest:(err as {digest?:string})?.digest},timestamp:Date.now(),hypothesisId:'H1'})}).catch(()=>{});
    // #endregion
    console.error("Export error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
