import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getServiceClient } from "@/lib/supabase-server";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAuth(req);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cpId = params.id;
  if (!cpId) return NextResponse.json({ error: "Missing ID" }, { status: 400 });

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const allowed = ["opp_notes", "follow_up_at"];
  const updates: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) updates[key] = body[key];
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from("centerpoint_opportunities")
    .update(updates)
    .eq("cp_id", cpId)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, opportunity: data });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAuth(req);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cpId = params.id;
  if (!cpId) {
    return NextResponse.json({ error: "Missing ID" }, { status: 400 });
  }

  const supabase = getServiceClient();

  // Delete the opportunity from our local cache
  const { error } = await supabase
    .from("centerpoint_opportunities")
    .delete()
    .eq("cp_id", cpId);

  if (error) {
    console.error("[DELETE_OPPORTUNITY_API] Error deleting opportunity:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
