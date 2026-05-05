import { supabase } from "./supabase";
import type { SessionState } from "@/types/session";

/**
 * SUPABASE RELAY
 * Handles the bidirectional mapping between the app's nested SessionState
 * and the flattened Supabase relational schema.
 */

export async function upsertSession(session: SessionState) {
  const { sessionId, repId, property, findings, pathData, signatureData, remoteReview, photoAssets, auditEvents } = session;

  // 1. Prepare Session Row
  const sessionRow = {
    session_id: sessionId,
    // Attempt to parse UUID, fallback to null if rep_id is a placeholder string
    rep_id: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(repId) ? repId : null,
    session_status: session.sessionStatus,
    current_screen: session.currentScreen,
    mode: session.mode,
    phase_a_completed: session.phaseACompleted,
    
    // Property
    property_address: property.address,
    property_city_state_zip: property.cityStateZip,
    property_type: property.propertyType,
    homeowner_name: property.homeownerPrimaryName,
    homeowner_email: property.homeownerPrimaryEmail,
    homeowner_mobile: property.homeownerPrimaryMobile,
    insurer_name: property.insurerNameKnown,
    claim_number: property.claimNumberKnown,
    access_notes: property.accessNotes,

    // Findings
    outcome_type: findings.outcomeType,
    recommended_path: findings.recommendedPath,
    selected_path: pathData.selectedPath,
    urgent_items_count: findings.urgentItemsCount,
    storm_related_items_count: findings.stormRelatedItemsCount,
    monitor_items_count: findings.monitorItemsCount,
    summary_headline: findings.summaryHeadline,
    summary_body: findings.summaryBody,
    urgent_protection_recommended: findings.urgentProtectionRecommended,
    urgent_protection_authorized: findings.urgentProtectionAuthorized,
    internal_notes: findings.internalNotes,
    summary_locked_at: findings.summaryLockedAt,

    // Path
    manufacturer_selected: pathData.manufacturerSelected,
    product_selected: pathData.productSelected,
    impact_upgrade_selected: pathData.impactUpgradeSelected,
    warranty_option_selected: pathData.warrantyOptionSelected,
    claim_related_work: pathData.claimRelatedWork,
    agreement_acknowledged: pathData.agreementAcknowledged,

    // Signature
    signer_name: signatureData.signerName,
    signer_email: signatureData.signerEmail,
    signer_mobile: signatureData.signerMobile,
    preferred_follow_up_method: signatureData.preferredFollowUpMethod,
    signature_data: signatureData.signatureImage,
    summary_send_recipient: signatureData.summarySendRecipient,
    deferral_reason: signatureData.deferralReason,
    signed_at: signatureData.signedAt,

    // Full State Backup
    payload: session,
    updated_at: new Date().toISOString()
  };

  const { error: sessionError } = await supabase
    .from('sessions')
    .upsert(sessionRow, { onConflict: 'session_id' });

  if (sessionError) throw sessionError;

  // 2. Sync Photo Assets (Optional: could be heavy if base64)
  // For now, we rely on the payload for photos, but let's sync metadata if possible
  if (photoAssets && photoAssets.length > 0) {
    const photoRows = photoAssets.map(p => ({
      session_id: sessionId,
      asset_id: p.assetId,
      caption: p.caption,
      category: p.category,
      display_order: p.displayOrder,
      selected_for_summary: p.selectedForSummary,
      created_at: p.createdAt
    }));

    await supabase.from('photo_assets').upsert(photoRows, { onConflict: 'asset_id' });
  }

  // 3. Sync Audit Events
  if (auditEvents && auditEvents.length > 0) {
    const auditRows = auditEvents.map(e => ({
      session_id: sessionId,
      event_name: e.eventName,
      actor_id: e.actorId,
      metadata: e.metadata,
      occurred_at: e.occurredAt
    }));

    await supabase.from('audit_events').upsert(auditRows);
  }

  return { success: true };
}

export async function getSessionByToken(token: string): Promise<SessionState | null> {
  const { data, error } = await supabase
    .from('sessions')
    .select('payload')
    .eq('payload->>reviewToken', token) // Query JSONB for the token
    .single();

  if (error || !data) return null;
  return data.payload as SessionState;
}

export async function getSessionById(sessionId: string): Promise<SessionState | null> {
  const { data, error } = await supabase
    .from('sessions')
    .select('payload')
    .eq('session_id', sessionId)
    .single();

  if (error || !data) return null;
  return data.payload as SessionState;
}
