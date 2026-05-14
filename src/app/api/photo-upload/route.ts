import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase-server";
import { requireAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * POST /api/photo-upload
 * Authenticated tablet-side upload endpoint.
 * Accepts a base64-encoded image and stores it in Supabase Storage using
 * the service client so storage RLS policies are never an obstacle.
 */
export async function POST(req: NextRequest) {
  try {
    await requireAuth(req);

    const body = await req.json();
    const { sessionId, photoId, base64, contentType, category, label, section } = body;

    if (!sessionId || !photoId || !base64) {
      return NextResponse.json({ error: "sessionId, photoId, and base64 are required" }, { status: 400 });
    }

    const db = getServiceClient();

    // Convert base64 to buffer
    const dataMatch = base64.match(/^data:([^;]+);base64,(.+)$/);
    const mime = dataMatch?.[1] || contentType || "image/jpeg";
    const raw = dataMatch?.[2] || base64;
    const buffer = Buffer.from(raw, "base64");

    const ext = mime.includes("png") ? "png" : "jpg";
    const storagePath = `${sessionId}/${photoId}.${ext}`;

    // Upload — upsert so retries don't collide
    const { error: uploadError } = await db.storage
      .from("inspection-photos")
      .upload(storagePath, buffer, { contentType: mime, upsert: true });

    if (uploadError) {
      console.error("[PHOTO_UPLOAD] Storage error:", uploadError);
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    const { data: { publicUrl } } = db.storage
      .from("inspection-photos")
      .getPublicUrl(storagePath);

    // Upsert photo record so the realtime subscription on the checklist picks it up
    const { error: dbError } = await db
      .from("photo_assets")
      .upsert({
        session_id: sessionId,
        asset_id: photoId,
        storage_path: storagePath,
        storage_url: publicUrl,
        caption: label || "",
        category: category || "general",
        shot_label: label || "",
        shot_section: section || "",
        display_order: 0,
        selected_for_summary: true,
      }, { onConflict: "asset_id" });

    if (dbError) {
      console.error("[PHOTO_UPLOAD] DB error:", dbError);
      // Non-fatal — storage upload succeeded, return the URL anyway
    }

    return NextResponse.json({ ok: true, publicUrl, storagePath });
  } catch (err: any) {
    console.error("[PHOTO_UPLOAD] Unhandled:", err);
    return NextResponse.json({ error: err.message || "Server error" }, { status: 500 });
  }
}
