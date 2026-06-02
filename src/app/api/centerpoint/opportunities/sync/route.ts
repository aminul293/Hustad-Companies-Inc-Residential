import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getServiceClient } from "@/lib/supabase-server";
import { CP_BASE, getCpToken } from "@/lib/centerpoint/client";

export const dynamic = "force-dynamic";

const STATUS_REMAP: Record<string, string> = {
  lead_opened:  "lead_opened",
  lead_pending: "lead_pending",
  lead_quoted:  "lead_quoted",
  lead_sold:    "lead_sold",
  lead_dead:    "lead_dead",
};

function normaliseStatus(raw: string): string {
  const key = raw.toLowerCase().replace(/\s+/g, "_");
  return STATUS_REMAP[key] ?? raw;
}

// ─── POST /api/centerpoint/opportunities/sync ─────────────────────────────────
// Two-phase sync:
// Phase 1 — Pull from CenterPoint: fetch recent Sales opportunities and upsert
//   any whose job name exists in centerpoint_jobs (i.e. session-linked jobs).
//   This backfills opportunities created before the new code was deployed.
// Phase 2 — Refresh status: re-fetch every stored opportunity from CP by ID
//   and update its status/price/timestamps.
export async function POST(req: NextRequest) {
  try {
    await requireAuth(req);
  } catch {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  let apiKey: string;
  try {
    apiKey = getCpToken();
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }

  const supabase = getServiceClient();
  const now = new Date().toISOString();
  let discovered = 0;
  let refreshed  = 0;
  let failed     = 0;

  // ── Phase 1: Pull from CenterPoint and backfill ───────────────────────────
  try {
    // Load all job names we know about from inspection sessions
    const { data: jobs } = await supabase
      .from("centerpoint_jobs")
      .select("name");

    const knownJobNames = new Set<string>((jobs ?? []).map((j: any) => j.name));

    // Fetch the 100 most recently updated Sales opportunities from CP
    const params = new URLSearchParams({
      "filter[isOpportunity]": "true",
      "page[size]": "100",
      "page[number]": "1",
      sort: "-updatedAt",
    });

    const cpRes = await fetch(`${CP_BASE}/opportunities?${params}`, {
      headers: { Accept: "application/json", Authorization: apiKey },
      cache: "no-store",
    });

    if (cpRes.ok) {
      const cpData = await cpRes.json();
      const records: any[] = cpData?.data ?? [];

      // Keep only those whose name matches a known service job (session-linked)
      const toUpsert = records
        .filter(r => knownJobNames.has(r.attributes?.name ?? ""))
        .map(r => {
          const a = r.attributes;
          return {
            cp_id:                        String(r.id),
            name:                         a.name ?? "",
            opportunity_type:             a.opportunityType ?? null,
            domain:                       a.domain ?? "Sales",
            status:                       normaliseStatus(a.status ?? ""),
            display_status:               a.displayStatus ?? a.status ?? "",
            description:                  a.description ?? null,
            billed_company_id:            a.billedCompanyId ? Number(a.billedCompanyId) : null,
            price:                        a.price ?? 0,
            cp_created_at:                a.createdAt ?? null,
            cp_updated_at:                a.updatedAt ?? null,
            latest_stage_transitioned_at: a.latestStageTransitionedAt ?? null,
            synced_at:                    now,
          };
        });

      if (toUpsert.length > 0) {
        const { error: upsertErr } = await supabase
          .from("centerpoint_opportunities")
          .upsert(toUpsert, { onConflict: "cp_id" });

        if (!upsertErr) discovered = toUpsert.length;
      }
    }
  } catch (e: any) {
    console.warn("[OPP_SYNC] Phase 1 (backfill) failed:", e.message);
  }

  // ── Phase 2: Refresh status for all stored opportunities ──────────────────
  const { data: stored, error: listErr } = await supabase
    .from("centerpoint_opportunities")
    .select("cp_id");

  if (!listErr && stored && stored.length > 0) {
    for (const row of stored) {
      try {
        const res = await fetch(`${CP_BASE}/productions/${row.cp_id}`, {
          headers: { Accept: "application/json", Authorization: apiKey },
          cache: "no-store",
        });

        if (!res.ok) { failed++; continue; }

        const json = await res.json();
        const a = json?.data?.attributes;
        if (!a) { failed++; continue; }

        await supabase
          .from("centerpoint_opportunities")
          .update({
            status:                       normaliseStatus(a.status ?? ""),
            display_status:               a.displayStatus ?? a.status ?? "",
            price:                        a.price ?? 0,
            cp_updated_at:                a.updatedAt ?? null,
            latest_stage_transitioned_at: a.latestStageTransitionedAt ?? null,
            synced_at:                    now,
          })
          .eq("cp_id", row.cp_id);

        refreshed++;
      } catch {
        failed++;
      }
    }
  }

  return NextResponse.json({ ok: true, discovered, refreshed, failed });
}

// ─── GET /api/centerpoint/opportunities/sync ──────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    await requireAuth(req);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getServiceClient();
  const { count } = await supabase
    .from("centerpoint_opportunities")
    .select("*", { count: "exact", head: true });

  return NextResponse.json({ total_cached: count ?? 0 });
}
