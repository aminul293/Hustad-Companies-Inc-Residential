import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getServiceClient } from "@/lib/supabase-server";
import { CP_BASE, getCpToken } from "@/lib/centerpoint/client";

export const dynamic = "force-dynamic";

// Map CP status strings to our normalised set
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
// Re-fetches the current status for every cached opportunity from CenterPoint
// and updates the Supabase rows. Returns { ok, refreshed, failed }.
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

  // Load all stored opportunity cp_ids
  const { data: stored, error: listErr } = await supabase
    .from("centerpoint_opportunities")
    .select("cp_id");

  if (listErr) {
    return NextResponse.json({ ok: false, error: listErr.message }, { status: 500 });
  }

  if (!stored || stored.length === 0) {
    return NextResponse.json({ ok: true, refreshed: 0, failed: 0 });
  }

  let refreshed = 0;
  let failed = 0;
  const now = new Date().toISOString();

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
          status:                        normaliseStatus(a.status ?? ""),
          display_status:                a.displayStatus ?? a.status ?? "",
          price:                         a.price ?? 0,
          cp_updated_at:                 a.updatedAt ?? null,
          latest_stage_transitioned_at:  a.latestStageTransitionedAt ?? null,
          synced_at:                     now,
        })
        .eq("cp_id", row.cp_id);

      refreshed++;
    } catch {
      failed++;
    }
  }

  return NextResponse.json({ ok: true, refreshed, failed });
}

// ─── GET /api/centerpoint/opportunities/sync ──────────────────────────────────
// Returns the count of cached opportunities so the UI can show "X cached".
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
