import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase-server";

/**
 * POST /api/rep-upload
 * Token-free upload endpoint used by the rep's phone camera page.
 * The session_id itself is the access credential — it is unguessable
 * (sess_TIMESTAMP_RANDOM) and the session must exist and not be archived.
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file      = formData.get("file")      as File   | null;
    const sessionId = formData.get("session_id") as string | null;
    const category  = (formData.get("category")  as string) || "general";
    const label     = (formData.get("label")     as string) || "";
    const section   = (formData.get("section")   as string) || "";

    if (!file || !sessionId) {
      return NextResponse.json({ error: "file and session_id are required" }, { status: 400 });
    }

    const db = getServiceClient();

    // Verify session exists and is not archived
    const { data: session } = await db
      .from("inspection_sessions")
      .select("session_id, session_status")
      .eq("session_id", sessionId)
      .neq("session_status", "archived")
      .single();

    if (!session) {
      return NextResponse.json({ error: "Session not found or expired" }, { status: 404 });
    }

    // Upload to Supabase storage
    const photoId = `photo_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    const storagePath = `rep/${sessionId}/${photoId}.${ext}`;

    const buffer = Buffer.from(await file.arrayBuffer());
    const { error: uploadError } = await db.storage
      .from("inspection-photos")
      .upload(storagePath, buffer, {
        contentType: file.type || "image/jpeg",
        upsert: false,
      });

    if (uploadError) {
      console.error("[REP_UPLOAD] Storage error:", uploadError);
      return NextResponse.json({ error: "Upload failed" }, { status: 500 });
    }

    const { data: { publicUrl } } = db.storage
      .from("inspection-photos")
      .getPublicUrl(storagePath);

    // Insert photo record — this triggers the real-time subscription on the tablet
    const { data: photo, error: dbError } = await db
      .from("photo_assets")
      .insert({
        session_id:          sessionId,
        asset_id:            photoId,
        storage_path:        storagePath,
        storage_url:         publicUrl,
        caption:             label,
        category,
        shot_label:          label,
        shot_section:        section,
        display_order:       0,
        selected_for_summary: true,
      })
      .select()
      .single();

    if (dbError) {
      console.error("[REP_UPLOAD] DB insert error:", dbError);
      return NextResponse.json({ error: "DB insert failed" }, { status: 500 });
    }

    return NextResponse.json({ ok: true, photo });
  } catch (err: any) {
    console.error("[REP_UPLOAD] Unhandled error:", err);
    return NextResponse.json({ error: err.message || "Server error" }, { status: 500 });
  }
}
