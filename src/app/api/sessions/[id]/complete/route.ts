import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase-server";

// POST /api/sessions/[id]/complete
// Called when a session reaches a terminal state (signed, deferred, closed_*).
// 1. Updates the session status.
// 2. Marks the linked pipeline_lead as 'inspection_completed'.
// 3. Upserts the hustad_ticket to stage 'inspection_done' (creates one if missing).

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id: sessionId } = params;
  const body = await req.json().catch(() => ({}));
  const { session_status } = body;

  const TERMINAL_STATUSES = [
    "signed", "deferred", "closed_no_damage", "closed_monitor_only",
    "closed_repair_only", "closed_claim_review", "closed_restoration",
  ];

  if (session_status && !TERMINAL_STATUSES.includes(session_status)) {
    return NextResponse.json(
      { error: `Invalid terminal status: ${session_status}` },
      { status: 400 }
    );
  }

  const supabase = getServiceClient();

  // 1. Fetch the session to get pipeline_lead_id and current status
  const { data: session, error: sessionErr } = await supabase
    .from("inspection_sessions")
    .select("session_id, session_status, pipeline_lead_id, property_address, homeowner_name, rep_id")
    .eq("session_id", sessionId)
    .single();

  if (sessionErr || !session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const finalStatus = session_status ?? session.session_status;

  // 2. Update session status if provided
  if (session_status && session_status !== session.session_status) {
    await supabase
      .from("inspection_sessions")
      .update({ session_status: finalStatus })
      .eq("session_id", sessionId);
  }

  if (!session.pipeline_lead_id) {
    return NextResponse.json({
      ok: true,
      warning: "Session has no linked pipeline_lead_id — downstream updates skipped.",
      session_status: finalStatus,
    });
  }

  const leadId: string = session.pipeline_lead_id;

  // 3. Mark pipeline lead as inspection_completed
  const { error: leadErr } = await supabase
    .from("pipeline_leads")
    .update({ pipeline_status: "inspection_completed" })
    .eq("id", leadId);

  if (leadErr) {
    console.error("[SESSION_COMPLETE] pipeline_leads update failed:", leadErr.message);
  }

  // 4. Resolve the cp_job_id via the pipeline lead → centerpoint_job join
  const { data: lead } = await supabase
    .from("pipeline_leads")
    .select("id, cpc_ticket_id, centerpoint_job_id, centerpoint_jobs(id, cp_id, property_name)")
    .eq("id", leadId)
    .single();

  const cpJobId = (lead as any)?.centerpoint_jobs?.cp_id ?? null;
  const propertyName =
    (lead as any)?.centerpoint_jobs?.property_name ||
    session.property_address ||
    "Unknown Property";

  // 5. Upsert hustad_ticket to stage 'inspection_done'
  if (cpJobId) {
    const { data: existing } = await supabase
      .from("hustad_tickets")
      .select("id, stage")
      .eq("cp_job_id", cpJobId)
      .maybeSingle();

    const STAGE_ORDER = [
      "new", "contacted", "appointment_set", "inspection_done",
      "estimate_sent", "follow_up", "signed", "job_scheduled",
      "job_started", "job_completed", "invoiced", "closed_won",
    ];

    if (existing) {
      // Only advance to inspection_done if ticket hasn't already passed that stage
      const currentIdx = STAGE_ORDER.indexOf(existing.stage);
      const targetIdx  = STAGE_ORDER.indexOf("inspection_done");
      if (currentIdx < targetIdx) {
        await supabase
          .from("hustad_tickets")
          .update({ stage: "inspection_done", updated_at: new Date().toISOString() })
          .eq("id", existing.id);
      }
    } else {
      // Create a new ticket at inspection_done
      await supabase.from("hustad_tickets").insert({
        cp_job_id: cpJobId,
        cp_job_name: (lead as any)?.cpc_ticket_id ?? null,
        property_name: propertyName,
        property_address: session.property_address ?? "",
        client_name: session.homeowner_name ?? "",
        stage: "inspection_done",
        price: 0,
      });
    }
  }

  return NextResponse.json({
    ok: true,
    session_status: finalStatus,
    pipeline_lead_id: leadId,
    ticket_stage: "inspection_done",
  });
}
