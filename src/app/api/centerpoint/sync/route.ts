import { NextResponse, NextRequest } from "next/server";
import { getServiceClient } from "@/lib/supabase-server";
import { requireAuth } from "@/lib/auth";
import { CP_BASE, getCpToken, fetchServiceManagerNames } from "@/lib/centerpoint/client";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

const HUSTAD_TYPE = "STORM INSPECTION-HAIL";
const FETCH_SIZE = 250;
const STAGE_ORDER = ["new_service","opened","scheduled","started","completed","closed"];
const FETCH_TIMEOUT_MS = 25000;

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

// ─── Comprehensive CenterPoint → Hustad status mapping ───────────────────────
// CenterPoint uses varied status strings across lead and service workflows.
// Unknown statuses fall back to "new_service" (earliest stage) so they are
// never silently discarded by the dedup tiebreaker.
const CP_STATUS_REMAP: Record<string, string> = {
  new_service:   "new_service",
  new:           "new_service",
  opened:        "opened",
  open:          "opened",
  accepted:      "opened",
  scheduled:     "scheduled",
  en_route:      "started",
  started:       "started",
  in_progress:   "started",
  completed:     "completed",
  review:        "completed",
  authorized:    "completed",
  invoiced:      "completed",
  closed_out:    "closed",
  closed:        "closed",
};

// ─── Extract Additional Managers names from a CenterPoint attributes object ───
// CenterPoint may return this under several field names depending on the tenant config.
function extractAdditionalManagers(a: any): string[] {
  const raw =
    a.additionalManagers ??
    a.managers ??
    a.customWithLabels?.additionalManagers ??
    a.custom?.additionalManagers ??
    a.employees ??
    [];
  if (!raw) return [];
  const arr = Array.isArray(raw) ? raw : [raw];
  return arr
    .map((m: any) =>
      typeof m === "string"
        ? m
        : (m.name ?? m.fullName ?? m.displayName ?? m.label ?? "")
    )
    .filter(Boolean);
}

// ─── Map CenterPoint record → Supabase row ───────────────────────────────────
function toRow(r: any, contacts?: CompanyContacts) {
  const a = r.attributes;

  const raw = (a.status || "").toLowerCase().replace(/\s+/g, "_");
  const normalizedStatus = CP_STATUS_REMAP[raw] ?? "new_service";

  const billedId = a.billedCompanyId ? Number(a.billedCompanyId) : null;
  const ownerName  = billedId && contacts ? (contacts.names.get(billedId) ?? null) : null;
  const ownerPhone = billedId && contacts ? (contacts.phones.get(billedId) ?? null) : null;
  const ownerEmail = billedId && contacts ? (contacts.emails.get(billedId) ?? null) : null;

  const rawExtras: Record<string, string> = {};
  if (ownerName)  rawExtras._owner = ownerName;
  if (ownerPhone) rawExtras._phone = String(ownerPhone);
  if (ownerEmail) rawExtras._email = String(ownerEmail);

  const additionalManagers = extractAdditionalManagers(a);

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
    cp_additional_managers: additionalManagers.length > 0 ? JSON.stringify(additionalManagers) : null,
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
        
        // Unknown statuses fall back to position 0 — never silently discarded
        const bIdx = Math.max(0, STAGE_ORDER.indexOf(b.status));
        const rIdx = Math.max(0, STAGE_ORDER.indexOf(r.status));
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
    const MAX_PAGES = 4; // Limit to 1000 recently updated records to prevent Vercel gateway/execution timeouts
    while (scanned < cpTotal && cpPage <= MAX_PAGES) {
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

        const rawStatus = (a?.status || "").toLowerCase().replace(/\s+/g, "_");
        const isActiveStatus = ["new_service", "new", "accepted", "opened", "open", "scheduled", "started", "en_route", "in_progress"].includes(rawStatus);
        const isServiceDomain = a?.domain?.toLowerCase() === "service";

        if (!isHailInspection || !isResidentialModule || !isInspectionType || !isActiveStatus || !isServiceDomain) continue;
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
        // Unknown statuses fall back to position 0 — never silently discarded
        const ei = Math.max(0, STAGE_ORDER.indexOf(existing.status));
        const ii = Math.max(0, STAGE_ORDER.indexOf(row.status));
        if (ii > ei) uniqueRows.set(row.name, row);
      }
    }

    const finalRows = Array.from(uniqueRows.values());
    let upserted = 0;
    let deleted = 0;

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

    // ── Reconciliation: remove records deleted in CenterPoint ────────────────
    // Only runs when CP returned at least one record — guards against deleting
    // everything if the API scan fails or returns an empty page mid-way.
    if (allRawRecords.length > 0) {
      const syncedCpIds = allRawRecords.map((r) => String(r.id));

      const { data: existingRows } = await supabase
        .from("centerpoint_jobs")
        .select("cp_id")
        .neq("inbox_status", "imported_to_pipeline")
        .is("promoted_ticket_id", null);

      const staleIds = (existingRows ?? [])
        .map((r: any) => r.cp_id)
        .filter((id: string) => !syncedCpIds.includes(id));

      if (staleIds.length > 0) {
        console.log(`[SYNC] Removing ${staleIds.length} records deleted in CenterPoint`);
        
        // 1. Get internal UUIDs for the stale jobs to prevent FK constraint violation
        const { data: staleJobs } = await supabase
          .from("centerpoint_jobs")
          .select("id")
          .in("cp_id", staleIds);
        
        const staleUuids = (staleJobs ?? []).map((j: any) => j.id).filter(Boolean);

        // 2. Nullify references in pipeline_leads first
        if (staleUuids.length > 0) {
          const { error: unlinkError } = await supabase
            .from("pipeline_leads")
            .update({ centerpoint_job_id: null })
            .in("centerpoint_job_id", staleUuids);
          
          if (unlinkError) {
            console.warn(`[SYNC] Failed to unlink stale jobs from pipeline_leads: ${unlinkError.message}`);
          }
        }

        // 3. Delete the jobs from centerpoint_jobs
        const { error: deleteError } = await supabase
          .from("centerpoint_jobs")
          .delete()
          .in("cp_id", staleIds);

        if (deleteError) {
          console.warn(`[SYNC] Failed to remove stale records: ${deleteError.message}`);
        } else {
          deleted = staleIds.length;
        }
      }
    }

    // ── Enrich: fetch Additional Manager names for all synced jobs ──────────
    // Individual API calls per job (bulk sync API doesn't include this field).
    // Stored in cp_additional_managers so the UI can show them without import.
    const ENRICH_CONCURRENCY = 5;
    for (let i = 0; i < finalRows.length; i += ENRICH_CONCURRENCY) {
      const batch = finalRows.slice(i, i + ENRICH_CONCURRENCY);
      await Promise.all(batch.map(async (row: any) => {
        try {
          const managers = await fetchServiceManagerNames(row.cp_id);
          if (managers.length > 0) {
            const val = JSON.stringify(managers);
            await supabase
              .from("centerpoint_jobs")
              .update({ cp_additional_managers: val })
              .eq("cp_id", row.cp_id);
            row.cp_additional_managers = val; // update in-memory for assignment step below
          }
        } catch { /* non-fatal */ }
      }));
    }

    // ── Post-Sync: Auto-assign pipeline leads from stored manager names ──────
    // Uses in-memory enriched rows — no extra API calls needed here.
    const syncedTicketIds = finalRows.map((r: any) => r.name);
    const { data: unassignedLeads } = await supabase
      .from("pipeline_leads")
      .select("cpc_ticket_id")
      .in("cpc_ticket_id", syncedTicketIds)
      .is("assigned_rep_id", null);

    if (unassignedLeads && unassignedLeads.length > 0) {
      const { data: allReps } = await supabase
        .from("reps")
        .select("id, name")
        .eq("active", true);

      const ticketToManagers = new Map<string, string[]>(
        (finalRows as any[])
          .filter(r => r.cp_additional_managers)
          .map(r => {
            try { return [r.name, JSON.parse(r.cp_additional_managers)] as [string, string[]]; } catch { return null; }
          })
          .filter(Boolean) as [string, string[]][]
      );

      for (const lead of unassignedLeads) {
        const managers = ticketToManagers.get(lead.cpc_ticket_id) ?? [];
        for (const mgrName of managers) {
          const lower = mgrName.toLowerCase();
          const match = allReps?.find(
            (r: any) =>
              r.name.toLowerCase() === lower ||
              r.name.toLowerCase().includes(lower) ||
              lower.includes(r.name.toLowerCase())
          );
          if (match) {
            await supabase
              .from("pipeline_leads")
              .update({ assigned_rep_id: match.id })
              .eq("cpc_ticket_id", lead.cpc_ticket_id)
              .is("assigned_rep_id", null);
            break;
          }
        }
      }
    }

    // ── Post-Sync Database Cleanup (High 5) ──────────────────────────────────
    await runCleanup(supabase);

    if (logId) {
      await supabase
        .from("cp_sync_log")
        .update({ status: "completed", completed_at: new Date().toISOString(), jobs_upserted: upserted, jobs_scanned: scanned })
        .eq("id", logId);
    }

    return NextResponse.json({ ok: true, upserted, deleted, scanned, delta: false, delta_since: null });

  } catch (err: any) {
    if (logId) {
      await supabase.from("cp_sync_log").update({ status: "failed", error: err.message }).eq("id", logId);
    }
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

// ─── GET /api/centerpoint/sync — last sync info ──────────────────────────────
export async function GET(_request: NextRequest) {
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

