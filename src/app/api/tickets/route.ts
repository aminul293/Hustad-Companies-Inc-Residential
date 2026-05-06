import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase-server";

const PAGE_SIZE = 25;

// ─── GET /api/tickets ─────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const search = searchParams.get("search")?.trim() || "";
  const stage = searchParams.get("stage")?.trim() || "";

  const supabase = getServiceClient();
  const offset = (page - 1) * PAGE_SIZE;

  let query = supabase
    .from("hustad_tickets")
    .select("*, ticket_touches(id, occurred_at, outcome, method, rep_name, notes)", { count: "exact" })
    .order("updated_at", { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1);

  if (stage) query = query.eq("stage", stage);

  if (search) {
    query = query.or(
      `property_name.ilike.%${search}%,client_name.ilike.%${search}%,cp_job_name.ilike.%${search}%`
    );
  }

  const { data, count, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    data: data ?? [],
    meta: { page: { total: count ?? 0, currentPage: page, perPage: PAGE_SIZE } },
  });
}

// ─── POST /api/tickets — promote a CP job into a Hustad ticket ────────────────
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { cp_job_id, cp_job_name, property_name, property_address, client_name,
          client_email, client_phone, assigned_rep_name, promoted_by, price } = body;

  if (!property_name) {
    return NextResponse.json({ error: "property_name is required" }, { status: 400 });
  }

  const supabase = getServiceClient();

  // Guard: don't double-promote the same CP job
  if (cp_job_id) {
    const { data: existing } = await supabase
      .from("hustad_tickets")
      .select("id")
      .eq("cp_job_id", cp_job_id)
      .maybeSingle();
    if (existing) {
      return NextResponse.json({ error: "This job has already been promoted", ticket_id: existing.id }, { status: 409 });
    }
  }

  const { data: ticket, error } = await supabase
    .from("hustad_tickets")
    .insert({
      cp_job_id: cp_job_id ?? null,
      cp_job_name: cp_job_name ?? null,
      property_name,
      property_address: property_address ?? "",
      client_name: client_name ?? "",
      client_email: client_email ?? "",
      client_phone: client_phone ?? "",
      assigned_rep_name: assigned_rep_name ?? "",
      promoted_by: promoted_by ?? "",
      price: price ?? 0,
      stage: "new",
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Mark the CP job as promoted
  if (cp_job_id) {
    await supabase
      .from("centerpoint_jobs")
      .update({ promoted_at: new Date().toISOString(), promoted_ticket_id: ticket.id })
      .eq("cp_id", cp_job_id);
  }

  return NextResponse.json({ ticket }, { status: 201 });
}
