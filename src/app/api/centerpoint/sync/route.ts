import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

const CP_BASE = "https://api.centerpointconnect.io/centerpoint";
const HUSTAD_TYPE = "STORM INSPECTION-HAIL";
const FETCH_SIZE = 250;
const STAGE_ORDER = ["lead_opened","lead_pending","lead_quoted","lead_sold","dead_lead","opened","scheduled","started","completed","invoiced","closed"];

function getCpKey(): string {
  const key = process.env.CENTERPOINT_API_KEY;
  if (!key) throw new Error("CENTERPOINT_API_KEY is not set in environment variables");
  return key;
}

function cpHeaders() {
  return { Accept: "application/json", Authorization: getCpKey() };
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
    const res = await fetch(`${CP_BASE}/companies?${params}`, {
      headers: cpHeaders(),
      cache: "no-store",
    });
    if (!res.ok) break;
    const data = await res.json();
    const records: any[] = data?.data ?? [];
    records.forEach((r) => {
      const numId = Number(r.id);
      const a = r.attributes ?? {};
      ids.add(numId);
      const companyName = a.name ?? a.companyName ?? null;
      if (companyName) names.set(numId, companyName);
      // Company-level phone lives in attributes.custom.phone (confirmed from API)
      const phone = a.custom?.phone ?? null;
      if (phone) phones.set(numId, String(phone));
    });
    const total = data?.meta?.page?.total ?? 0;
    if (ids.size >= total || records.length === 0) break;
    page++;
  }
  return { ids, names, phones, emails };
}

// ─── Fetch client profiles for the given company IDs ─────────────────────────
// CenterPoint stores contact phone + email on /profiles (type: client_profiles).
// Each profile has attributes.companyId linking it back to the company.
// Phone is in attributes.mobile (or attributes.office, or attributes.custom.phone).
async function enrichWithContacts(companyIds: Set<number>, contacts: CompanyContacts): Promise<void> {
  let page = 1;
  while (true) {
    const params = new URLSearchParams({
      "page[size]": "200",
      "page[number]": String(page),
    });
    const res = await fetch(`${CP_BASE}/profiles?${params}`, {
      headers: cpHeaders(),
      cache: "no-store",
    });
    if (!res.ok) break;
    const data = await res.json();
    const records: any[] = data?.data ?? [];
    if (records.length === 0) break;

    records.forEach((r) => {
      // Only process client contacts — skip internal Hustad employees
      if (r.type !== "client_profiles") return;

      const a = r.attributes ?? {};
      const companyId = Number(a.companyId ?? 0);
      if (!companyId || !companyIds.has(companyId)) return;

      // Phone: primary source is mobile, fallback to office, then custom.phone
      const phone = a.mobile ?? a.office ?? a.custom?.phone ?? null;
      if (phone && !contacts.phones.has(companyId)) {
        contacts.phones.set(companyId, String(phone));
      }

      // Email
      const email = a.email ?? null;
      if (email && !contacts.emails.has(companyId)) {
        contacts.emails.set(companyId, String(email));
      }

      // Use contact person name as owner if the company had none
      if (!contacts.names.has(companyId) && a.name) {
        contacts.names.set(companyId, String(a.name));
      }
    });

    const total = data?.meta?.page?.total ?? 0;
    const fetched = page * 200;
    if (fetched >= total || records.length < 200) break;
    page++;
  }
}

// ─── Map CenterPoint record → Supabase row ───────────────────────────────────
function toRow(r: any, contacts?: CompanyContacts) {
  const a = r.attributes;

  // Normalize status for the pipeline (e.g. "Closed Out" -> "closed")
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

// ─── POST /api/centerpoint/sync ──────────────────────────────────────────────
export async function POST() {
  // Validate API key before doing anything else
  try {
    getCpKey();
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }

  const supabase = getServiceClient();

  // Cleanup: remove duplicate job names, keeping the newest one
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

  const { data: lastLog } = await supabase
    .from("cp_sync_log")
    .select("completed_at")
    .eq("status", "completed")
    .order("completed_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const deltaSince: string | null = lastLog?.completed_at ?? null;

  const { data: logRow } = await supabase
    .from("cp_sync_log")
    .insert({ status: "running", delta_since: deltaSince })
    .select("id")
    .maybeSingle();
  const logId: string | undefined = logRow?.id;

  try {
    const contacts = await getResidentialCompanies();
    const { ids: residentialIds } = contacts;

    // Enrich with phone + email from the /contacts endpoint (where CenterPoint stores them)
    await enrichWithContacts(residentialIds, contacts);

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
        headers: cpHeaders(),
        cache: "no-store",
      });

      if (!res.ok) {
        throw new Error(`CenterPoint API error ${res.status}: check your API key or CenterPoint credentials`);
      }

      const data = await res.json();
      cpTotal = data?.meta?.page?.total ?? 0;
      const records: any[] = data?.data ?? [];
      if (records.length === 0) break;

      const rowsToUpsert: any[] = [];

      for (const r of records) {
        scanned++;
        const a = r.attributes;

        /* 
        if (deltaSince && a.updatedAt && a.updatedAt <= deltaSince) {
          reachedDelta = true;
          break;
        }
        */

        const isHailInspection = a?.customWithLabels?.serviceTypeHustad === HUSTAD_TYPE;
        const isResidentialId = residentialIds.has(Number(a?.billedCompanyId));
        const isInspectionType = a?.workType === "Inspection";
        
        // Detection for Residential Module/Category
        const isResidentialModule = 
          a?.module?.toLowerCase() === "residential" || 
          a?.category?.toLowerCase() === "residential" ||
          isResidentialId;

        // Triple-Lock Inclusion: MUST be Residential AND Hustad Hail AND Inspection Type
        if (!isHailInspection || !isResidentialModule || !isInspectionType) {
          continue;
        }

        rowsToUpsert.push(toRow(r, contacts));
      }

      // De-duplicate in memory: pick the one that is FURTHER ALONG in the pipeline
      const uniqueRows = new Map();
      rowsToUpsert.forEach(row => {
        const existing = uniqueRows.get(row.name);
        if (!existing) {
          uniqueRows.set(row.name, row);
          return;
        }

        const existingDate = existing.cp_updated_at ? new Date(existing.cp_updated_at).getTime() : 0;
        const incomingDate = row.cp_updated_at ? new Date(row.cp_updated_at).getTime() : 0;

        if (incomingDate > existingDate) {
          uniqueRows.set(row.name, row);
        } else if (incomingDate === existingDate) {
          const existingIdx = STAGE_ORDER.indexOf(existing.status === "closed_out" ? "closed" : existing.status);
          const incomingIdx = STAGE_ORDER.indexOf(row.status === "closed_out" ? "closed" : row.status);
          if (incomingIdx > existingIdx) {
            uniqueRows.set(row.name, row);
          }
        }
      });
      const finalRows = Array.from(uniqueRows.values());

      if (finalRows.length > 0) {
        // 1. Fetch ALL current records for these job names to preserve inbox_status
        const names = finalRows.map(r => r.name);
        const { data: existingJobs } = await supabase
          .from("centerpoint_jobs")
          .select("id, name, status, cp_id, inbox_status")
          .in("name", names);

        const localMap = new Map(existingJobs?.map(j => [j.name, j.inbox_status]));
        
        finalRows.forEach(r => {
          if (localMap.has(r.name)) {
            r.inbox_status = localMap.get(r.name);
          }
        });

        // 2. Upsert using Mirror Mode

        const { error } = await supabase
          .from("centerpoint_jobs")
          .upsert(finalRows, { onConflict: "cp_id" });
        
        if (error) throw new Error(`Supabase upsert failed: ${error.message}`);
        upserted += finalRows.length;
      }

      cpPage++;
    }

    if (logId) {
      await supabase
        .from("cp_sync_log")
        .update({ status: "completed", completed_at: new Date().toISOString(), jobs_upserted: upserted, jobs_scanned: scanned })
        .eq("id", logId);
    }

    return NextResponse.json({ ok: true, upserted, scanned, delta: !!deltaSince, delta_since: deltaSince });

  } catch (err: any) {
    if (logId) {
      await supabase.from("cp_sync_log").update({ status: "failed", error: err.message }).eq("id", logId);
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
