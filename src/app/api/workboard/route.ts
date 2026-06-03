import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // ── 1. New CP jobs (inbox_status = 'new', not promoted) ──────────────────
    const { data: cpJobs } = await supabase
      .from("centerpoint_jobs")
      .select("id, cp_id, name, property_name, status, inbox_status, raw, updated_at")
      .eq("inbox_status", "new")
      .is("promoted_ticket_id", null)
      .order("updated_at", { ascending: false });

    // ── 2. Pipeline leads (all active statuses) ───────────────────────────────
    const { data: leads } = await supabase
      .from("pipeline_leads")
      .select(`
        id, cpc_ticket_id, pipeline_status, contact_attempt_count,
        last_contacted_at, next_follow_up_at, scheduled_start_at, scheduled_end_at,
        owner_phone, owner_email, lead_notes, centerpoint_job_id, created_at, updated_at,
        centerpoint_jobs ( id, name, property_name, status, raw ),
        appointments ( id, appointment_start_at, appointment_end_at, assigned_rep_id )
      `)
      .not("pipeline_status", "in", "(dead_lead,closed_lost,closed_won)")
      .order("updated_at", { ascending: false });

    // ── 3. Active / recent inspection sessions ────────────────────────────────
    const activeStatuses = [
      "phase_a_active", "phase_a_complete", "rep_review_pending",
      "summary_locked", "authorization_pending", "inspection_in_progress",
      "inspection_completed", "signed", "deferred",
    ];
    const { data: sessions } = await supabase
      .from("inspection_sessions")
      .select("session_id, session_status, property_address, homeowner_name, rep_name, outcome_type, cpc_ticket_id, pipeline_lead_id, updated_at, created_at")
      .in("session_status", activeStatuses)
      .order("updated_at", { ascending: false });

    // ── Bucket pipeline leads by stage ───────────────────────────────────────
    const NEW_STATUSES        = ["new_lead", "contact_attempted", "contacted", "follow_up_needed"];
    const SCHEDULED_STATUSES  = ["scheduled", "appointment_confirmed"];
    const IN_PROGRESS_STATUSES= ["inspection_in_progress"];
    const COMPLETED_STATUSES  = ["inspection_completed", "drafting", "review"];
    const SIGNED_STATUSES     = ["signed"];

    const needsScheduling = (leads ?? []).filter(l => NEW_STATUSES.includes(l.pipeline_status));
    const scheduled       = (leads ?? []).filter(l => SCHEDULED_STATUSES.includes(l.pipeline_status));
    const inProgressLeads = (leads ?? []).filter(l => IN_PROGRESS_STATUSES.includes(l.pipeline_status));
    const completedLeads  = (leads ?? []).filter(l => COMPLETED_STATUSES.includes(l.pipeline_status));
    const signedLeads     = (leads ?? []).filter(l => SIGNED_STATUSES.includes(l.pipeline_status));

    // ── Bucket sessions by stage ──────────────────────────────────────────────
    const ACTIVE_SESSION_STATUSES  = ["phase_a_active","phase_a_complete","rep_review_pending","summary_locked","authorization_pending","inspection_in_progress"];
    const DEFERRED_STATUSES        = ["deferred"];
    const SIGNED_SESSION_STATUSES  = ["inspection_completed","signed"];

    const activeSessions   = (sessions ?? []).filter(s => ACTIVE_SESSION_STATUSES.includes(s.session_status));
    const deferredSessions = (sessions ?? []).filter(s => DEFERRED_STATUSES.includes(s.session_status));
    const signedSessions   = (sessions ?? []).filter(s => SIGNED_SESSION_STATUSES.includes(s.session_status));

    return NextResponse.json({
      cpInbox:         cpJobs ?? [],
      needsScheduling,
      scheduled,
      inProgressLeads,
      completedLeads,
      signedLeads,
      activeSessions,
      deferredSessions,
      signedSessions,
    });
  } catch (err: any) {
    console.error("[WORKBOARD] Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
