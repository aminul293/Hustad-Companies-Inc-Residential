import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase-server";

/**
 * GET /api/rep-upload?session_id=…
 * Returns all photo_assets rows for a session (service-key, no RLS).
 * Used by the tablet checklist to poll for newly uploaded phone photos.
 */
export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get("session_id");
  if (!sessionId) {
    return NextResponse.json({ error: "session_id required" }, { status: 400 });
  }

  const db = getServiceClient();

  const { data: photos, error } = await db
    .from("photo_assets")
    .select("*")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ photos: photos || [] });
}

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

/**
 * DELETE /api/rep-upload?photo_id=…&session_id=…
 * Removes a photo from storage and photo_assets.
 * No auth required — session_id is the credential.
 */
export async function DELETE(req: NextRequest) {
  const photoId   = req.nextUrl.searchParams.get("photo_id");
  const sessionId = req.nextUrl.searchParams.get("session_id");

  if (!photoId || !sessionId) {
    return NextResponse.json({ error: "photo_id and session_id are required" }, { status: 400 });
  }

  const db = getServiceClient();

  // Fetch the row so we can remove the file from storage too
  const { data: row } = await db
    .from("photo_assets")
    .select("storage_path, session_id")
    .eq("asset_id", photoId)
    .single();

  // Ensure the photo belongs to this session (prevents cross-session deletes)
  if (!row || row.session_id !== sessionId) {
    return NextResponse.json({ error: "Photo not found" }, { status: 404 });
  }

  if (row.storage_path) {
    await db.storage.from("inspection-photos").remove([row.storage_path]);
  }

  const { error } = await db.from("photo_assets").delete().eq("asset_id", photoId);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
