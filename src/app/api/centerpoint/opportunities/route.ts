import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getServiceClient } from "@/lib/supabase-server";
import { getCpToken } from "@/lib/centerpoint/client";
import { createOpportunity } from "@/lib/centerpoint/createOpportunity";

export const dynamic = "force-dynamic";

// ─── GET /api/centerpoint/opportunities ──────────────────────────────────────
// Returns session-created opportunities stored in Supabase, newest first.
export async function GET(req: NextRequest) {
  try {
    await requireAuth(req);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const page         = Math.max(1, Number(searchParams.get("page") ?? "1"));
  const size         = Math.min(50, Math.max(1, Number(searchParams.get("size") ?? "25")));
  const search       = searchParams.get("search")?.trim() ?? "";
  const statusFilter = searchParams.get("status")?.trim() ?? "";

  const supabase = getServiceClient();

  let query = supabase
    .from("centerpoint_opportunities")
    .select("*", { count: "exact" })
    .order("cp_created_at", { ascending: false })
    .range((page - 1) * size, page * size - 1);

  if (search) {
    query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
  }

  if (statusFilter) {
    query = query.eq("status", statusFilter);
  }

  const { data, count, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    data: data ?? [],
    meta: { page, size, total: count ?? 0 },
  });
}

// ─── POST /api/centerpoint/opportunities ─────────────────────────────────────
// Creates an opportunity in CenterPoint and caches it in Supabase.
export async function POST(req: NextRequest) {
  try {
    await requireAuth(req);
  } catch {
    return NextResponse.json(
      { success: false, stage: "auth", message: "Unauthorized" },
      { status: 401 }
    );
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, stage: "validation", message: "Invalid JSON" },
      { status: 400 }
    );
  }

  const { centerpointId, name, billedCompanyId, description, targetStage, domain, type, opportunityType } = body;

  if (!targetStage) {
    return NextResponse.json(
      { success: false, stage: "validation", message: "Missing required field: targetStage" },
      { status: 400 }
    );
  }

  if (targetStage !== "Pending" && targetStage !== "Accepted") {
    return NextResponse.json(
      { success: false, stage: "validation", message: "Invalid targetStage. Must be 'Pending' or 'Accepted'" },
      { status: 400 }
    );
  }

  let resolvedBilledCompanyId = billedCompanyId ? Number(billedCompanyId) : null;
  let resolvedName = name;
  let resolvedDescription = description || "Opportunity created via tablet app";

  const supabase = getServiceClient();

  if (centerpointId) {
    try {
      const { data: cpJob, error } = await supabase
        .from("centerpoint_jobs")
        .select("billed_company_id, name, property_name, description")
        .or(`cp_id.eq.${centerpointId},name.eq.${centerpointId}`)
        .limit(1)
        .maybeSingle();

      if (error) {
        console.warn("[CREATE_OPPORTUNITY_API] Supabase job lookup warning:", error.message);
      }

      if (cpJob) {
        if (!resolvedBilledCompanyId && cpJob.billed_company_id) {
          resolvedBilledCompanyId = Number(cpJob.billed_company_id);
        }
        if (!resolvedName && cpJob.name) {
          resolvedName = cpJob.name;
        }
        if (!description && cpJob.property_name) {
          resolvedDescription = `Opportunity for residential at ${cpJob.property_name}`;
        }
      }
    } catch (dbErr: any) {
      console.error("[CREATE_OPPORTUNITY_API] Database lookup error:", dbErr);
    }
  }

  if (!resolvedBilledCompanyId) {
    return NextResponse.json(
      { success: false, stage: "validation", message: "Could not resolve billedCompanyId from request or database." },
      { status: 400 }
    );
  }

  if (!resolvedName) {
    resolvedName = `OPP-${Date.now()}`;
  }

  let apiKey: string;
  try {
    apiKey = getCpToken();
  } catch (err: any) {
    return NextResponse.json(
      { success: false, stage: "centerpoint_config", message: err.message },
      { status: 500 }
    );
  }

  // Fast Supabase deduplication check
  let existingCpId = undefined;
  try {
    const { data: existingOpp } = await supabase
      .from("centerpoint_opportunities")
      .select("cp_id")
      .eq("name", resolvedName)
      .eq("domain", domain ?? "Sales")
      .limit(1)
      .maybeSingle();
      
    if (existingOpp) {
      existingCpId = existingOpp.cp_id;
      console.log(`[CREATE_OPPORTUNITY_API] Deduped! Opportunity ${resolvedName} already exists with CP ID ${existingCpId}`);
    }
  } catch (err) {
    console.warn("[CREATE_OPPORTUNITY_API] Deduplication lookup failed:", err);
  }

  try {
    const opp = await createOpportunity({
      id: existingCpId,
      name: resolvedName,
      billedCompanyId: resolvedBilledCompanyId,
      description: resolvedDescription,
      targetStage,
      domain,
      type,
      opportunityType,
    }, apiKey);

    // Cache the created opportunity in Supabase so the Opportunities Inbox can list it.
    const now = new Date().toISOString();
    await supabase
      .from("centerpoint_opportunities")
      .upsert({
        cp_id:          String(opp.id),
        name:           resolvedName,
        opportunity_type: opportunityType ?? null,
        domain:         domain ?? "Sales",
        status:         "lead_pending",
        display_status: opp.status || targetStage,
        description:    resolvedDescription,
        billed_company_id: resolvedBilledCompanyId,
        price:          0,
        cp_created_at:  now,
        cp_updated_at:  now,
        synced_at:      now,
      }, { onConflict: "cp_id" });

    return NextResponse.json({ success: true, opportunity: opp });
  } catch (err: any) {
    console.error("[CREATE_OPPORTUNITY_API] Error:", err);
    return NextResponse.json(
      {
        success: false,
        stage: "centerpoint",
        message: "Failed to create opportunity in CenterPoint",
        details: err.message,
      },
      { status: 502 }
    );
  }
}
