import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase-server";
import { requireAuth } from "@/lib/auth";

// POST /api/photos — Upload a photo for a session
export async function POST(req: NextRequest) {
  try {
    const payload = await requireAuth(req);
    const db = getServiceClient();

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const sessionId = formData.get("session_id") as string;
    const category = (formData.get("category") as string) || "general";
    const caption = (formData.get("caption") as string) || "";
    const displayOrder = parseInt(formData.get("display_order") as string) || 0;

    if (!file || !sessionId) {
      return NextResponse.json(
        { error: "file and session_id are required" },
        { status: 400 }
      );
    }

    // Verify session belongs to this rep
    const { data: session } = await db
      .from("sessions")
      .select("session_id")
      .eq("session_id", sessionId)
      .eq("rep_id", payload.repId)
      .single();

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // Upload to Supabase Storage
    const assetId = `photo_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const ext = file.name.split(".").pop() || "jpg";
    const storagePath = `${sessionId}/${assetId}.${ext}`;

    const buffer = Buffer.from(await file.arrayBuffer());
    const { error: uploadError } = await db.storage
      .from("inspection-photos")
      .upload(storagePath, buffer, {
        contentType: file.type || "image/jpeg",
        upsert: false,
      });

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      return NextResponse.json({ error: "Upload failed" }, { status: 500 });
    }

    // Get public URL
    const { data: urlData } = db.storage
      .from("inspection-photos")
      .getPublicUrl(storagePath);

    // Insert photo record
    const { data: photo, error: dbError } = await db
      .from("photo_assets")
      .insert({
        session_id: sessionId,
        asset_id: assetId,
        storage_path: storagePath,
        storage_url: urlData.publicUrl,
        caption,
        category,
        display_order: displayOrder,
        selected_for_summary: true,
      })
      .select()
      .single();

    if (dbError) throw dbError;

    return NextResponse.json({ photo });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error("Photo upload error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
