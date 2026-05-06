import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase-server";

// ─── GET /api/tickets/[id]/touches ───────────────────────────────────────────
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from("ticket_touches")
    .select("*")
    .eq("ticket_id", params.id)
    .order("occurred_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ touches: data ?? [] });
}

// ─── POST /api/tickets/[id]/touches ──────────────────────────────────────────
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await req.json();
  const { rep_name, method, outcome, notes, occurred_at } = body;

  if (!method || !outcome) {
    return NextResponse.json({ error: "method and outcome are required" }, { status: 400 });
  }

  const supabase = getServiceClient();
  const { data: touch, error } = await supabase
    .from("ticket_touches")
    .insert({
      ticket_id: params.id,
      rep_name: rep_name ?? "",
      method,
      outcome,
      notes: notes ?? "",
      occurred_at: occurred_at ?? new Date().toISOString(),
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ touch }, { status: 201 });
}
