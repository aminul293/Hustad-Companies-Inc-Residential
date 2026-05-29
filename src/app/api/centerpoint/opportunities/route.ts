import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getServiceClient } from "@/lib/supabase-server";
import { getCpToken } from "@/lib/centerpoint/client";
import { createOpportunity } from "@/lib/centerpoint/createOpportunity";

export const dynamic = "force-dynamic";

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

  const { centerpointId, name, billedCompanyId, description, targetStage } = body;

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

  if (centerpointId) {
    try {
      const supabase = getServiceClient();
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

  try {
    const opp = await createOpportunity({
      name: resolvedName,
      billedCompanyId: resolvedBilledCompanyId,
      description: resolvedDescription,
      targetStage,
    }, apiKey);

    return NextResponse.json({
      success: true,
      opportunity: opp,
    });
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
