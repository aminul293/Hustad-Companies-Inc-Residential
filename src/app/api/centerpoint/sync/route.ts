import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase-server";

const CP_BASE = "https://api.centerpointconnect.io/centerpoint";
const CP_KEY = process.env.CENTERPOINT_API_KEY!;
const HUSTAD_TYPE = "STORM INSPECTION-HAIL";
const FETCH_SIZE = 100;

// ─── Fetch residential company IDs ──────────────────────────────────────────
async function getResidentialCompanyIds(): Promise<Set<number>> {
  const ids = new Set<number>();
  let page = 1;
  while (true) {
    const params = new URLSearchParams({
      "page[size]": "200",
      "page[number]": String(page),
      "filter[type]": "Residential",
    });
    const res = await fetch(`${CP_BASE}/companies?${params}`, {
      headers: { Accept: "application/json", Authorization: CP_KEY },
      cache: "no-store",
    });
    if (!res.ok) break;
    const data = await res.json();
    const records: any[] = data?.data ?? [];
    records.forEach((r) => ids.add(Number(r.id)));
    const total = data?.meta?.page?.total ?? 0;
    if (ids.size >= total || records.length === 0) break;
    page++;
  }
  return ids;
}

// ─── Map CenterPoint record → Supabase row ───────────────────────────────────
function toRow(r: any) {
  const a = r.attributes;
  return {
    cp_id: String(r.id),
    name: a.name ?? "",
    property_name: a.propertyName ?? null,
    opportunity_type: a.opportunityType ?? null,
    work_type: a.workType ?? null,
    domain: a.domain ?? null,
    status: a.status ?? "",
    display_status: a.displayStatus ?? "",
    price: a.price ?? 0,
    start_date: a.startDate ?? null,
    billed_company_id: a.billedCompanyId ? String(a.billedCompanyId) : null,
    description: a.custom?.description ?? null,
    service_type_hustad: a.customWithLabels?.serviceTypeHustad ?? null,
    stage_transitioned_at: a.latestStageTransitionedAt ?? null,
    cp_created_at: a.createdAt ?? null,
    cp_updated_at: a.updatedAt ?? null,
    raw: a,
    synced_at: new Date().toISOString(),
  };
}

// ─── POST /api/centerpoint/sync ──────────────────────────────────────────────
export async function POST(_req: NextRequest) {
  const supabase = getServiceClient();

  // Get last completed sync timestamp for delta mode
  // Use maybeSingle() so 0 rows returns null instead of an error
  const { data: lastLog } = await supabase
    .from("cp_sync_log")
    .select("completed_at")
    .eq("status", "completed")
    .order("completed_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const deltaSince: string | null = lastLog?.completed_at ?? null;

  // Create a running log entry (best-effort — don't let log failure block sync)
  const { data: logRow } = await supabase
    .from("cp_sync_log")
    .insert({ status: "running", delta_since: deltaSince })
    .select("id")
    .maybeSingle();
  const logId: string | undefined = logRow?.id;

  try {
    const residentialIds = await getResidentialCompanyIds();

    let cpPage = 1;
    let cpTotal = Infinity;
    let scanned = 0;
    let upserted = 0;
    let reachedDelta = false;

    while (scanned < cpTotal && !reachedDelta) {
      const params = new URLSearchParams({
        "page[size]": String(FETCH_SIZE),
        "page[number]": String(cpPage),
        sort: "-updatedAt",
        "filter[workType]": "Inspection",
      });

      const res = await fetch(`${CP_BASE}/services?${params}`, {
        headers: { Accept: "application/json", Authorization: CP_KEY },
        cache: "no-store",
      });

      if (!res.ok) {
        throw new Error(`CenterPoint API error: ${res.status}`);
      }

      const data = await res.json();
      cpTotal = data?.meta?.page?.total ?? 0;
      const records: any[] = data?.data ?? [];
      if (records.length === 0) break;

      const rowsToUpsert: any[] = [];

      for (const r of records) {
        scanned++;
        const a = r.attributes;

        // In delta mode: stop once we reach records older than last sync
        if (deltaSince && a.updatedAt && a.updatedAt <= deltaSince) {
          reachedDelta = true;
          break;
        }

        const isHailInspection = a?.customWithLabels?.serviceTypeHustad === HUSTAD_TYPE;
        const isResidential = residentialIds.has(Number(a?.billedCompanyId));
        if (!isHailInspection || !isResidential) continue;

        rowsToUpsert.push(toRow(r));
      }

      if (rowsToUpsert.length > 0) {
        const { error } = await supabase
          .from("centerpoint_jobs")
          .upsert(rowsToUpsert, { onConflict: "cp_id" });
        if (error) throw new Error(`Supabase upsert error: ${error.message}`);
        upserted += rowsToUpsert.length;
      }

      cpPage++;
    }

    // Mark sync completed
    if (logId) {
      await supabase
        .from("cp_sync_log")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
          jobs_upserted: upserted,
          jobs_scanned: scanned,
        })
        .eq("id", logId);
    }

    return NextResponse.json({
      ok: true,
      upserted,
      scanned,
      delta: deltaSince ? true : false,
      delta_since: deltaSince,
    });
  } catch (err: any) {
    if (logId) {
      await supabase
        .from("cp_sync_log")
        .update({ status: "failed", error: err.message })
        .eq("id", logId);
    }

    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

// ─── GET /api/centerpoint/sync — last sync info ──────────────────────────────
export async function GET() {
  const supabase = getServiceClient();
  const { data } = await supabase
    .from("cp_sync_log")
    .select("*")
    .order("started_at", { ascending: false })
    .limit(5);

  const { count } = await supabase
    .from("centerpoint_jobs")
    .select("*", { count: "exact", head: true });

  return NextResponse.json({ logs: data ?? [], total_cached: count ?? 0 });
}
