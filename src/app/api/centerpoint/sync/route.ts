import { NextResponse, NextRequest } from "next/server";
import { getServiceClient } from "@/lib/supabase-server";
import { requireAuth } from "@/lib/auth";
import { CP_BASE, getCpToken } from "@/lib/centerpoint/client";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

const HUSTAD_TYPE = "STORM INSPECTION-HAIL";
const FETCH_SIZE = 250;
const STAGE_ORDER = ["lead_opened","lead_pending","lead_quoted","lead_sold","dead_lead","opened","scheduled","started","completed","invoiced","closed"];
const FETCH_TIMEOUT_MS = 8000;

function cpHeaders() {
  return { Accept: "application/json", Authorization: getCpToken() };
}

// ─── Shared contact shape ─────────────────────────────────────────────────────
interface CompanyContacts {
  ids: Set<number>;
  names: Map<number, string>;
  phones: Map<number, string>;
  emails: Map<number, string>;
}

// ─── Fetch residential company IDs + names ───────────────────────────────────
async function getResidentialCompanies(): Promise<CompanyContacts> {
  const ids = new Set<number>();
  const names = new Map<number, string>();
  const phones = new Map<number, string>();
  const emails = new Map<number, string>();
  let page = 1;
  while (true) {
    const params = new URLSearchParams({
      "page[size]": "200",
      "page[number]": String(page),
      "filter[type]": "Residential",
    });
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    
    try {
      const res = await fetch(`${CP_BASE}/companies?${params}`, {
        headers: cpHeaders(),
        cache: "no-store",
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!res.ok) break;
      const data = await res.json();
      const records: any[] = data?.data ?? [];
      records.forEach((r) => {
        const numId = Number(r.id);
        const a = r.attributes ?? {};
        ids.add(numId);
        const companyName = a.name ?? a.companyName ?? null;
        if (companyName) names.set(numId, companyName);
        const phone = a.custom?.phone ?? null;
        if (phone) phones.set(numId, String(phone));
      });
      const total = data?.meta?.page?.total ?? 0;
      if (ids.size >= total || records.length === 0) break;
      page++;
    } catch (err: any) {
      clearTimeout(timeoutId);
      console.error(`[SYNC] Failed to fetch residential companies:`, err.message);
      break;
    }
  }
  return { ids, names, phones, emails };
}

// ─── Fetch profiles targeted per company ID (Concurrently with Concurrency Cap) ──
async function enrichWithContacts(companyIds: Set<number>, contacts: CompanyContacts): Promise<void> {
  const ids = Array.from(companyIds);
  const CONCURRENCY = 5;

  const fetchCompany = async (companyId: number) => {
    if (contacts.phones.has(companyId) && contacts.emails.has(companyId)) return;

    let page = 1;
    while (true) {
      const params = new URLSearchParams({
        "page[size]": "50",
        "page[number]": String(page),
        "filter[companyId]": String(companyId),
      });

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

      try {
        const res = await fetch(`${CP_BASE}/profiles?${params}`, {
          headers: cpHeaders(),
          cache: "no-store",
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (!res.ok) break;
        const data = await res.json();
        const records: any[] = data?.data ?? [];
        if (records.length === 0) break;

        for (const r of records) {
          const a = r.attributes ?? {};

          const phone = a.mobile ?? a.office ?? a.custom?.phone ?? null;
          if (phone && !contacts.phones.has(companyId)) {
            contacts.phones.set(companyId, String(phone));
          }

          const email = a.email ?? null;
          if (email && !contacts.emails.has(companyId)) {
            contacts.emails.set(companyId, String(email));
          }

          if (!contacts.names.has(companyId) && a.name) {
            contacts.names.set(companyId, String(a.name));
          }

          if (contacts.phones.has(companyId) && contacts.emails.has(companyId)) break;
        }

        const total = data?.meta?.page?.total ?? 0;
        if (page * 50 >= total || records.length < 50) break;
        page++;
      } catch (err: any) {
        clearTimeout(timeoutId);
        console.error(`[SYNC] Failed to fetch profiles for company ${companyId}:`, err.message);
        break;
      }
    }
  };

  const chunks = [];
  for (let i = 0; i < ids.length; i += CONCURRENCY) {
    chunks.push(ids.slice(i, i + CONCURRENCY));
  }

  for (const chunk of chunks) {
    await Promise.all(chunk.map((id) => fetchCompany(id)));
  }
}

// ─── Map CenterPoint record → Supabase row ───────────────────────────────────
function toRow(r: any, contacts?: CompanyContacts) {
  const a = r.attributes;

  let normalizedStatus = (a.status || "").toLowerCase().replace(/\s+/g, "_");
  if (normalizedStatus === "closed_out") normalizedStatus = "closed";
  if (normalizedStatus === "new_lead") normalizedStatus = "lead_opened";

  const billedId = a.billedCompanyId ? Number(a.billedCompanyId) : null;
  const ownerName  = billedId && contacts ? (contacts.names.get(billedId) ?? null) : null;
  const ownerPhone = billedId && contacts ? (contacts.phones.get(billedId) ?? null) : null;
  const ownerEmail = billedId && contacts ? (contacts.emails.get(billedId) ?? null) : null;

  const rawExtras: Record<string, string> = {};
  if (ownerName)  rawExtras._owner = ownerName;
  if (ownerPhone) rawExtras._phone = String(ownerPhone);
  if (ownerEmail) rawExtras._email = String(ownerEmail);

  return {
    cp_id: String(r.id),
    name: a.name ?? "",
    property_name: a.propertyName ?? null,
    opportunity_type: a.opportunityType ?? null,
    work_type: a.workType ?? null,
    domain: a.domain ?? null,
    status: normalizedStatus,
    display_status: a.displayStatus || a.status || "",
    price: a.price ?? 0,
    start_date: a.startDate ?? null,
    billed_company_id: billedId ? String(billedId) : null,
    description: a.custom?.description ?? null,
    service_type_hustad: a.customWithLabels?.serviceTypeHustad ?? null,
    stage_transitioned_at: a.latestStageTransitionedAt ?? null,
    cp_created_at: a.createdAt ?? null,
    cp_updated_at: a.updatedAt ?? null,
    raw: { ...a, ...rawExtras },
    synced_at: new Date().toISOString(),
  };
}

// ─── Post-Sync Database Cleanup (deduplicate) ────────────────────────────────
async function runCleanup(supabase: any) {
  const { data: allJobsForCleanup } = await supabase
    .from("centerpoint_jobs")
    .select("cp_id, name, status, cp_updated_at");

  if (allJobsForCleanup && allJobsForCleanup.length > 0) {
    const nameToRows = new Map<string, any[]>();
    allJobsForCleanup.forEach((row: any) => {
      const arr = nameToRows.get(row.name) ?? [];
      arr.push(row);
      nameToRows.set(row.name, arr);
    });

    const cpIdsToDelete: string[] = [];
    for (const rows of nameToRows.values()) {
      if (rows.length <= 1) continue;
      const best = rows.reduce((b: any, r: any) => {
        const bDate = b.cp_updated_at ? new Date(b.cp_updated_at).getTime() : 0;
        const rDate = r.cp_updated_at ? new Date(r.cp_updated_at).getTime() : 0;
        if (rDate > bDate) return r;
        if (rDate < bDate) return b;
        
        const bIdx = STAGE_ORDER.indexOf(b.status);
        const rIdx = STAGE_ORDER.indexOf(r.status);
        if (bIdx === -1 && rIdx === -1) return b;
        if (bIdx === -1) return r;
        if (rIdx === -1) return b;
        return rIdx > bIdx ? r : b;
      });
      rows
        .filter((r: any) => r.cp_id !== best.cp_id)
        .forEach((r: any) => cpIdsToDelete.push(r.cp_id));
    }

    if (cpIdsToDelete.length > 0) {
      console.log(`[SYNC] Cleanup: removing ${cpIdsToDelete.length} duplicate job records`);
      await supabase.from("centerpoint_jobs").delete().in("cp_id", cpIdsToDelete);
    }
  }
}

// ─── POST /api/centerpoint/sync ──────────────────────────────────────────────
export async function POST(request: NextRequest) {
  // 1. Authenticate Request (High 3)
  try {
    await requireAuth(request);
  } catch (e: any) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Validate API key
  try {
    getCpToken();
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }

  const supabase = getServiceClient();

  const { data: logRow } = await supabase
    .from("cp_sync_log")
    .insert({ status: "running" })
    .select("id")
    .maybeSingle();
  const logId: string | undefined = logRow?.id;

  try {
    const contacts = await getResidentialCompanies();
    const { ids: residentialIds } = contacts;

    // ── Pass 1: Scan all services to collect qualifying rows + billedCompanyIds ──
    let cpPage = 1;
    let cpTotal = Infinity;
    let scanned = 0;
    const allRawRecords: any[] = [];

    while (scanned < cpTotal) {
      const params = new URLSearchParams({
        "page[size]": String(FETCH_SIZE),
        "page[number]": String(cpPage),
        sort: "-updatedAt",
        "filter[workType]": "Inspection",
      });

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

      const res = await fetch(`${CP_BASE}/services?${params}`, {
        headers: cpHeaders(),
        cache: "no-store",
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        throw new Error(`CenterPoint API error ${res.status}: check your API key or CenterPoint credentials`);
      }

      const data = await res.json();
      cpTotal = data?.meta?.page?.total ?? 0;
      const records: any[] = data?.data ?? [];
      if (records.length === 0) break;

      for (const r of records) {
        scanned++;
        const a = r.attributes;
        const isHailInspection = a?.customWithLabels?.serviceTypeHustad === HUSTAD_TYPE;
        const isResidentialId = residentialIds.has(Number(a?.billedCompanyId));
        const isInspectionType = a?.workType === "Inspection";
        const isResidentialModule =
          a?.module?.toLowerCase() === "residential" ||
          a?.category?.toLowerCase() === "residential" ||
          isResidentialId;

        if (!isHailInspection || !isResidentialModule || !isInspectionType) continue;
        allRawRecords.push(r);
      }

      cpPage++;
    }

    // ── Enrich contacts for ONLY the companies that have actual jobs ─────────
    const jobCompanyIds = new Set<number>(
      allRawRecords
        .map(r => Number(r.attributes?.billedCompanyId ?? 0))
        .filter(id => id > 0)
    );
    await enrichWithContacts(jobCompanyIds, contacts);

    // ── Pass 2: Build final rows with enriched contact data ─────────────────
    const uniqueRows = new Map<string, any>();
    for (const r of allRawRecords) {
      const row = toRow(r, contacts);
      const existing = uniqueRows.get(row.name);
      if (!existing) { uniqueRows.set(row.name, row); continue; }

      const existingDate = existing.cp_updated_at ? new Date(existing.cp_updated_at).getTime() : 0;
      const incomingDate = row.cp_updated_at ? new Date(row.cp_updated_at).getTime() : 0;
      if (incomingDate > existingDate) {
        uniqueRows.set(row.name, row);
      } else if (incomingDate === existingDate) {
        const ei = STAGE_ORDER.indexOf(existing.status === "closed_out" ? "closed" : existing.status);
        const ii = STAGE_ORDER.indexOf(row.status === "closed_out" ? "closed" : row.status);
        if (ii > ei) uniqueRows.set(row.name, row);
      }
    }

    const finalRows = Array.from(uniqueRows.values());
    let upserted = 0;

    if (finalRows.length > 0) {
      // Omit inbox_status completely so DB defaults/existing values are preserved race-free
      finalRows.forEach(r => {
        delete (r as any).inbox_status;
      });

      const { error } = await supabase
        .from("centerpoint_jobs")
        .upsert(finalRows, { onConflict: "cp_id" });

      if (error) throw new Error(`Supabase upsert failed: ${error.message}`);
      upserted = finalRows.length;
    }

    // ── Post-Sync Database Cleanup (High 5) ──────────────────────────────────
    await runCleanup(supabase);

    if (logId) {
      await supabase
        .from("cp_sync_log")
        .update({ status: "completed", completed_at: new Date().toISOString(), jobs_upserted: upserted, jobs_scanned: scanned })
        .eq("id", logId);
    }

    return NextResponse.json({ ok: true, upserted, scanned, delta: false, delta_since: null });

  } catch (err: any) {
    if (logId) {
      await supabase.from("cp_sync_log").update({ status: "failed", error: err.message }).eq("id", logId);
    }
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

// ─── GET /api/centerpoint/sync — last sync info ──────────────────────────────
export async function GET(request: NextRequest) {
  // Validate token if needed, or allow read of status
  const supabase = getServiceClient();

  // Recover stale sync logs (Medium 6)
  await supabase
    .from("cp_sync_log")
    .update({ status: "failed", error: "Presumed crashed (timeout)" })
    .eq("status", "running")
    .lt("started_at", new Date(Date.now() - 10 * 60 * 1000).toISOString());

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

