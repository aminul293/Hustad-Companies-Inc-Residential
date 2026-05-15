import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase-server";
import { requireAuth } from "@/lib/auth";

// GET /api/sessions — List sessions for the authenticated rep
export async function GET(req: NextRequest) {
  try {
    const payload = await requireAuth(req);
    const db = getServiceClient();
    
    const { data: sessions, error } = await db
      .from("inspection_sessions")
      .select("*")
      .eq("rep_id", payload.repId)
      .neq("session_status", "archived")
      .order("updated_at", { ascending: false });

    if (error) throw error;
    
    return NextResponse.json({ sessions: sessions || [] });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error("Sessions list error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/sessions — Create or sync a session from the tablet
export async function POST(req: NextRequest) {
  try {
    // Demo bypass: checked against a dedicated low-privilege secret, never the service role key.
    let repId = "00000000-0000-0000-0000-000000000000";
    const bypass = req.headers.get("x-demo-bypass");
    const demoSecret = process.env.DEMO_BYPASS_SECRET;
    if (!demoSecret || bypass !== demoSecret) {
      const payload = await requireAuth(req) as any;
      repId = payload.repId;
    }

    const db = getServiceClient();
    const body = await req.json();

    const row = mapSessionToRow(body, repId);
    
    const { data: session, error } = await db
      .from("inspection_sessions")
      .upsert(row, { onConflict: "session_id" })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ session: { ...session, sync_status: "synced" }, synced: true });
  } catch (err: any) {
    if (err instanceof Response) return err;
    console.error("Session create/sync error:", err);
    return NextResponse.json({ error: "Internal server error", details: err.message, stack: err.stack }, { status: 500 });
  }
}

function mapSessionToRow(s: any, repId: string) {
  return {
    session_id: s.sessionId,
    rep_id: repId,
    pipeline_lead_id: s.pipelineLeadId ?? s.pipeline_lead_id ?? null,
    appointment_id:   s.appointmentId  ?? s.appointment_id  ?? null,
    cpc_ticket_id:    s.cpcTicketId    ?? s.centerpointId   ?? s.cpc_ticket_id ?? null,
    session_status: s.sessionStatus,
    current_screen: s.currentScreen,
    mode: s.mode,
    phase_a_completed: s.phaseACompleted,
    property_address: s.property?.address || "",
    property_city_state_zip: s.property?.cityStateZip || "Madison, WI",
    property_type: s.property?.propertyType || "single_family",
    homeowner_name: s.property?.homeownerPrimaryName || "",
    homeowner_email: s.property?.homeownerPrimaryEmail || "",
    homeowner_mobile: s.property?.homeownerPrimaryMobile || "",
    insurer_name: s.property?.insurerNameKnown || "",
    claim_number: s.property?.claimNumberKnown || "",
    access_notes: s.property?.accessNotes || "",
    buyer_priorities: s.buyerData?.buyerPriorities || [],
    insurer_contact_status: s.buyerData?.insurerContactStatus || null,
    another_decision_maker_present: s.buyerData?.anotherDecisionMakerPresent ?? null,
    decision_maker_relation: s.buyerData?.decisionMakerRelation || "",
    decision_maker_name: s.buyerData?.decisionMakerName || "",
    decision_maker_email: s.buyerData?.decisionMakerEmail || "",
    decision_maker_mobile: s.buyerData?.decisionMakerMobile || "",
    buyer_questions: s.buyerData?.buyerQuestions || "",
    outcome_type: s.findings?.outcomeType || null,
    recommended_path: s.findings?.recommendedPath || null,
    selected_path: s.pathData?.selectedPath || null,
    urgent_items_count: s.findings?.urgentItemsCount || 0,
    storm_related_items_count: s.findings?.stormRelatedItemsCount || 0,
    monitor_items_count: s.findings?.monitorItemsCount || 0,
    summary_headline: s.findings?.summaryHeadline || "",
    summary_body: s.findings?.summaryBody || "",
    urgent_protection_recommended: s.findings?.urgentProtectionRecommended || false,
    urgent_protection_authorized: s.findings?.urgentProtectionAuthorized ?? null,
    internal_notes: s.findings?.internalNotes || "",
    summary_locked_at: s.findings?.summaryLockedAt || null,
    manufacturer_selected: s.pathData?.manufacturerSelected || null,
    product_selected: s.pathData?.productSelected || "",
    impact_upgrade_selected: s.pathData?.impactUpgradeSelected || false,
    warranty_option_selected: s.pathData?.warrantyOptionSelected || "",
    claim_related_work: s.pathData?.claimRelatedWork ?? null,
    agreement_acknowledged: s.pathData?.agreementAcknowledged || false,
    signer_name: s.signatureData?.signerName || "",
    signer_email: s.signatureData?.signerEmail || "",
    signer_mobile: s.signatureData?.signerMobile || "",
    preferred_follow_up_method: s.signatureData?.preferredFollowUpMethod || null,
    signature_data: s.signatureData?.signatureImage || null,
    summary_send_recipient: s.signatureData?.summarySendRecipient || "",
    deferral_reason: s.signatureData?.deferralReason || "",
    signed_at: s.signatureData?.signedAt || null,
    sync_status: "synced",
  };
}
