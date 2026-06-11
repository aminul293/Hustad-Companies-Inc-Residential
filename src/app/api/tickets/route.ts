import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const PAGE_SIZE = 25;

// ─── GET /api/tickets ─────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const page   = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const search = searchParams.get("search")?.trim() || "";
  const stage  = searchParams.get("stage")?.trim() || "";
  const repId  = searchParams.get("repId")?.trim() || "";

  const supabase = getServiceClient();
  const offset = (page - 1) * PAGE_SIZE;

  let query = supabase
    .from("hustad_tickets")
    .select("*, ticket_touches(id, occurred_at, outcome, method, rep_name, notes)", { count: "exact" })
    .order("updated_at", { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1);

  if (stage) query = query.eq("stage", stage);
  if (repId) query = query.eq("assigned_rep_name", repId);

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

  const { data: result, error: rpcError } = await supabase
    .rpc("promote_job_to_ticket", {
      p_cp_job_id: cp_job_id ?? null,
      p_cp_job_name: cp_job_name ?? null,
      p_property_name: property_name,
      p_property_address: property_address ?? "",
      p_client_name: client_name ?? "",
      p_client_email: client_email ?? "",
      p_client_phone: client_phone ?? "",
      p_assigned_rep_name: assigned_rep_name ?? "",
      p_promoted_by: promoted_by ?? "",
      p_price: price ?? 0,
    });

  if (rpcError) return NextResponse.json({ error: rpcError.message }, { status: 500 });

  if (result && result.error) {
    return NextResponse.json({ error: result.error, ticket_id: result.ticket_id }, { status: 409 });
  }

  return NextResponse.json({ ticket: result }, { status: 201 });
}
