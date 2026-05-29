import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

const PAGE_SIZE = 25;
const STAGE_ORDER = ["new_service","opened","scheduled","started","completed","closed"];

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const search = searchParams.get("search")?.trim() || "";
    const status = searchParams.get("status")?.trim() || "";

    const supabase = getServiceClient();
    const offset = (page - 1) * PAGE_SIZE;

    // Explicitly select columns — exclude the `raw` JSONB column which would
    // override normalized fields (e.g. status) if select("*") were used.
    let query = supabase
      .from("centerpoint_jobs")
      .select(
        "id, cp_id, name, property_name, opportunity_type, work_type, domain, status, display_status, price, start_date, cp_created_at, cp_updated_at, stage_transitioned_at, description, service_type_hustad, promoted_at, promoted_ticket_id, inbox_status",
        { count: "exact" }
      )
      .order("cp_updated_at", { ascending: false, nullsFirst: false })
      .range(offset, offset + PAGE_SIZE - 1);

    query = query.in("status", ["new_service", "opened"]);

    if (search) {
      query = query.or(`name.ilike.%${search}%,property_name.ilike.%${search}%`);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error("[CENTERPOINT_API] Supabase Error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Deduplicate by job name (keep newest updated) to guard against DB duplicates
    const byName = new Map<string, any>();
    (data ?? []).forEach((row) => {
      const existing = byName.get(row.name);
      if (!existing) { byName.set(row.name, row); return; }
      
      const eDate = existing.cp_updated_at ? new Date(existing.cp_updated_at).getTime() : 0;
      const nDate = row.cp_updated_at ? new Date(row.cp_updated_at).getTime() : 0;
      
      if (nDate > eDate) {
        byName.set(row.name, row);
      } else if (nDate === eDate) {
        const eIdx = STAGE_ORDER.indexOf(existing.status);
        const nIdx = STAGE_ORDER.indexOf(row.status);
        if (nIdx > eIdx) byName.set(row.name, row);
      }
    });
    const deduped = Array.from(byName.values());

    // Map Supabase rows back to the CPJob shape the UI expects
    const mapped = deduped.map((row) => ({
      id: row.cp_id,
      inbox_status: row.inbox_status,
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
  } catch (error: any) {
    console.error("[CENTERPOINT_API] GET Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
