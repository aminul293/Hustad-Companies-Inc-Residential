import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getCpToken } from "@/lib/centerpoint/client";
import { postNote } from "@/lib/centerpoint/postNote";

export const dynamic = "force-dynamic";

const OUTCOME_LABELS: Record<string, string> = {
  claim_review_candidate: "Claim Review",
  repair_only: "Repair Only",
  full_restoration_candidate: "Full Restoration",
  no_damage: "No Damage",
  monitor_only: "Monitor Only",
};

export async function POST(req: NextRequest) {
  try {
    await requireAuth(req);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { opportunityId, reportUrl, sessionId, address, repName, outcomeType, createdAt } = body;

  if (!opportunityId) {
    return NextResponse.json({ error: "Missing opportunityId" }, { status: 400 });
  }

  const outcomeLabel = OUTCOME_LABELS[outcomeType] || outcomeType || "Unknown";
  const reportId = sessionId?.slice(-8).toUpperCase() || "—";
  const date = createdAt
    ? new Date(createdAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : new Date().toLocaleDateString();

  const noteBody = [
    `Hustad Field Inspection — ${address || ""}`,
    `Inspector: ${repName || ""}`,
    `Outcome: ${outcomeLabel}`,
    `Report ID: ${reportId} · Date: ${date}`,
    "",
    reportUrl
      ? `Forensic Report PDF: ${reportUrl}`
      : "PDF report delivered via office dispatch.",
  ].join("\n");

  try {
    const apiKey = getCpToken();
    console.log(`[CP_NOTE] Posting note to opportunity ${opportunityId}`);
    await postNote(opportunityId, noteBody, apiKey);
    console.log(`[CP_NOTE] Note posted successfully to ${opportunityId}`);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[CP_NOTE] All attempts failed for opportunity", opportunityId, "—", err.message);
    return NextResponse.json({ success: false, opportunityId, error: err.message }, { status: 502 });
  }
}
