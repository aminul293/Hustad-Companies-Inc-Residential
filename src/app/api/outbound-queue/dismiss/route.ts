import { NextResponse, NextRequest } from "next/server";
import { getServiceClient } from "@/lib/supabase-server";
import { requireAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

// POST /api/outbound-queue/dismiss
// Body: { ids: string[] }  — dismiss specific items
//    or { all: true }      — dismiss every failed/pending item with an error
export async function POST(request: NextRequest) {
  try {
    await requireAuth(request);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const supabase = getServiceClient();
  const now = new Date().toISOString();

  if (body.all) {
    const { error } = await supabase
      .from("outbound_queue")
      .update({ status: "synced", synced_at: now })
      .in("status", ["failed", "pending"])
      .not("error", "is", null);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, dismissed: "all" });
  }

  const ids: string[] = Array.isArray(body.ids) ? body.ids : [];
  if (ids.length === 0) {
    return NextResponse.json({ error: "Provide ids[] or all:true" }, { status: 400 });
  }

  const { error } = await supabase
    .from("outbound_queue")
    .update({ status: "synced", synced_at: now })
    .in("id", ids);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, dismissed: ids.length });
}
