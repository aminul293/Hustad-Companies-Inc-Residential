import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase-server";
import { requireAuth } from "@/lib/auth";

// MOCK GET /api/sessions — List sessions for the authenticated rep
export async function GET(req: NextRequest) {
  try {
    const payload = await requireAuth(req);
    // Return empty mock sessions array
    return NextResponse.json({ sessions: [] });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error("Sessions list error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// MOCK POST /api/sessions — Create or sync a session from the tablet
export async function POST(req: NextRequest) {
  try {
    const payload = await requireAuth(req);
    const body = await req.json();

    // Just pretend we synced it successfully
    return NextResponse.json({ session: { ...body, sync_status: "synced" }, synced: true });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error("Session create/sync error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

function mapSessionToRow(s: any, repId: string) {
  return {
    session_id: s.sessionId,
    rep_id: repId,
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
