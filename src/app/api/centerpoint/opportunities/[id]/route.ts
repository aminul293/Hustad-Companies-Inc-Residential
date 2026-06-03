import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getServiceClient } from "@/lib/supabase-server";

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
