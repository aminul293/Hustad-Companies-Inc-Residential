import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase-server";

const PAGE_SIZE = 25;

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const search = searchParams.get("search")?.trim() || "";
  const status = searchParams.get("status")?.trim() || "";

  const supabase = getServiceClient();
  const offset = (page - 1) * PAGE_SIZE;

  let query = supabase
    .from("centerpoint_jobs")
    .select("*", { count: "exact" })
    .order("cp_updated_at", { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1);

  if (status) {
    query = query.eq("status", status);
  }

  if (search) {
    // Match on job number (name) or property name
    query = query.or(`name.ilike.%${search}%,property_name.ilike.%${search}%`);
  }

  const { data, count, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Map Supabase rows back to the CPJob shape the UI expects
  const mapped = (data ?? []).map((row) => ({
    id: row.cp_id,
    promotedAt: row.promoted_at ?? null,
    promotedTicketId: row.promoted_ticket_id ?? null,
    attributes: {
      name: row.name,
      propertyName: row.property_name,
      opportunityType: row.opportunity_type,
      workType: row.work_type,
      domain: row.domain ?? "",
      status: row.status,
      displayStatus: row.display_status,
      price: Number(row.price),
      startDate: row.start_date,
      createdAt: row.cp_created_at,
      updatedAt: row.cp_updated_at,
      latestStageTransitionedAt: row.stage_transitioned_at,
      custom: { description: row.description },
      customWithLabels: { serviceTypeHustad: row.service_type_hustad },
    },
  }));

  return NextResponse.json({
    data: mapped,
    meta: {
      page: {
        total: count ?? 0,
        currentPage: page,
        perPage: PAGE_SIZE,
      },
    },
  });
}
