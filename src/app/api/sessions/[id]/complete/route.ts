import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase-server";
import { requireAuth } from "@/lib/auth";
import { CP_BASE, cpJsonHeaders, advanceWorkflowToTarget, getCpToken } from "@/lib/centerpoint/client";
import { generateCrmNote } from "@/lib/crm-notes";

const TERMINAL_STATUSES = [
  "signed", "deferred", "closed_no_damage", "closed_monitor_only",
  "closed_repair_only", "closed_claim_review", "closed_restoration",
];

const STAGE_ORDER = [
  "new", "contacted", "appointment_set", "inspection_done",
  "estimate_sent", "follow_up", "signed", "job_scheduled",
  "job_started", "job_completed", "invoiced", "closed_won",
];

// Maps inspection session terminal status → hustad_ticket stage
const SESSION_TO_TICKET_STAGE: Record<string, string> = {
  signed:              "signed",
  closed_restoration:  "inspection_done",
  closed_claim_review: "inspection_done",
  closed_repair_only:  "inspection_done",
  closed_monitor_only: "follow_up",
  closed_no_damage:    "closed_lost",
  deferred:            "new",
};

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authPayload = await requireAuth(req);
    const { id: sessionId } = params;
    const body = await req.json().catch(() => ({}));
    const { session_status } = body;

    if (session_status && !TERMINAL_STATUSES.includes(session_status)) {
      return NextResponse.json(
        { error: `Invalid terminal status: ${session_status}` },
        { status: 400 }
      );
    }

    const supabase = getServiceClient();

    // 1. Fetch session
    const { data: session, error: sessionErr } = await supabase
      .from("inspection_sessions")
      .select("session_id, session_status, pipeline_lead_id, property_address, homeowner_name, rep_id, payload")
      .eq("session_id", sessionId)
      .single();

    if (sessionErr || !session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const finalStatus = session_status ?? session.session_status;

    // 2. Update session status if a new terminal status was provided
    if (session_status && session_status !== session.session_status) {
      await supabase
        .from("inspection_sessions")
        .update({ session_status: finalStatus })
        .eq("session_id", sessionId);
    }

    // 3. Look up rep name for ticket attribution
    const { data: repRow } = await supabase
      .from("reps")
      .select("name")
      .eq("id", session.rep_id)
      .maybeSingle();
    let repName = repRow?.name ?? "";
    if (!repName) {
      if (session.rep_id === "rep_001") {
        repName = "QA Tester (Mock)";
      } else if (authPayload && session.rep_id === authPayload.repId) {
        repName = authPayload.name;
      }
    }

    // 4. Resolve pipeline lead + CP job if linked
    let cpJobId: string | null = null;
    let propertyName = session.property_address || "Unknown Property";
    let cpcTicketId: string | null = null;

    if (session.pipeline_lead_id) {
      const { error: leadErr } = await supabase
        .from("pipeline_leads")
        .update({ pipeline_status: "inspection_completed" })
        .eq("id", session.pipeline_lead_id);

      if (leadErr) {
        console.error("[SESSION_COMPLETE] pipeline_leads update failed:", leadErr.message);
      }

      const { data: lead } = await supabase
        .from("pipeline_leads")
        .select("id, cpc_ticket_id, centerpoint_job_id, centerpoint_jobs(id, cp_id, property_name)")
        .eq("id", session.pipeline_lead_id)
        .single();

      cpJobId = (lead as any)?.centerpoint_jobs?.cp_id ?? null;
      cpcTicketId = (lead as any)?.cpc_ticket_id ?? null;
      propertyName =
        (lead as any)?.centerpoint_jobs?.property_name ||
        session.property_address ||
        "Unknown Property";
    }

    // Trigger CenterPoint write-back when completing an inspection session
    if (session.pipeline_lead_id && cpJobId) {
      const nowStr = new Date().toISOString();
      const cpStatus = finalStatus === "signed" ? "opened" : "closed";
      const attrs: Record<string, any> = { status: cpStatus };
      if (cpStatus === "closed") {
        attrs.closedAt = nowStr;
      } else {
        attrs.openedAt = nowStr;
      }
      
      // Generate standard CRM note based on session payload
      if (session.payload) {
        const crmNote = generateCrmNote(session.payload as any);
        attrs.custom = { description: crmNote };
      }

      try {
        const cpHeaders = cpJsonHeaders();
        const cpRes = await fetch(`${CP_BASE}/services/${cpJobId}`, {
          method: "PATCH",
          headers: cpHeaders,
          body: JSON.stringify({
            data: { type: "services", id: cpJobId, attributes: attrs },
          }),
        });

        if (cpRes.ok) {
          // Mirror in local centerpoint_jobs cache
          await supabase
            .from("centerpoint_jobs")
            .update({ status: cpStatus, synced_at: new Date().toISOString() })
            .eq("cp_id", cpJobId);

          try {
            const cpKey = getCpToken();
            await advanceWorkflowToTarget(cpJobId, cpStatus, cpKey);
          } catch (e: any) {
            console.warn(`[SESSION_COMPLETE] Failed to auto-advance workflow stages for cp_id=${cpJobId}:`, e.message);
          }
        } else {
          const errText = await cpRes.text().catch(() => String(cpRes.status));
          console.error(`[SESSION_COMPLETE_CP_WRITEBACK] status=${cpStatus} cp_id=${cpJobId} error=${cpRes.status}: ${errText}`);
          await supabase.from("outbound_queue").insert({
            target_system: "centerpoint",
            target_id: cpJobId,
            action: "update_status",
            payload: { status: cpStatus, attrs, pipeline_lead_id: session.pipeline_lead_id },
            status: "pending",
            error: `HTTP ${cpRes.status}: ${errText.slice(0, 200)}`,
          });
        }
      } catch (writebackErr: any) {
        console.error(`[SESSION_COMPLETE_CP_WRITEBACK] unexpected error for cp_id=${cpJobId}:`, writebackErr?.message);
        try {
          await supabase.from("outbound_queue").insert({
            target_system: "centerpoint",
            target_id: cpJobId,
            action: "update_status",
            payload: { status: cpStatus, attrs, pipeline_lead_id: session.pipeline_lead_id },
            status: "pending",
            error: writebackErr?.message?.slice(0, 200) ?? "Unknown error",
          });
        } catch {
          // Non-blocking
        }
      }
    }

    // 5. Upsert hustad_ticket — always, regardless of pipeline linkage
    const ticketStage = SESSION_TO_TICKET_STAGE[finalStatus] ?? "inspection_done";

    if (cpJobId) {
      // Dedup by CP job ID
      const { data: existing } = await supabase
        .from("hustad_tickets")
        .select("id, stage")
        .eq("cp_job_id", cpJobId)
        .maybeSingle();

      if (existing) {
        const currentIdx = STAGE_ORDER.indexOf(existing.stage);
        const targetIdx = STAGE_ORDER.indexOf(ticketStage);
        if (currentIdx < targetIdx) {
          await supabase
            .from("hustad_tickets")
            .update({ stage: ticketStage, updated_at: new Date().toISOString() })
            .eq("id", existing.id);
        }
      } else {
        await supabase.from("hustad_tickets").insert({
          cp_job_id: cpJobId,
          cp_job_name: cpcTicketId,
          inspection_session_id: sessionId,
          property_name: propertyName,
          property_address: session.property_address ?? "",
          client_name: session.homeowner_name ?? "",
          assigned_rep_name: repName,
          stage: ticketStage,
          price: 0,
        });
      }
    } else {
      // Dedup by inspection session ID (no CP job linked)
      const { data: existing } = await supabase
        .from("hustad_tickets")
        .select("id, stage")
        .eq("inspection_session_id", sessionId)
        .maybeSingle();

      if (existing) {
        const currentIdx = STAGE_ORDER.indexOf(existing.stage);
        const targetIdx = STAGE_ORDER.indexOf(ticketStage);
        if (currentIdx < targetIdx) {
          await supabase
            .from("hustad_tickets")
            .update({ stage: ticketStage, updated_at: new Date().toISOString() })
            .eq("id", existing.id);
        }
      } else {
        await supabase.from("hustad_tickets").insert({
          cp_job_id: null,
          cp_job_name: cpcTicketId,
          inspection_session_id: sessionId,
          property_name: propertyName,
          property_address: session.property_address ?? "",
          client_name: session.homeowner_name ?? "",
          assigned_rep_name: repName,
          stage: ticketStage,
          price: 0,
        });
      }
    }

    return NextResponse.json({
      ok: true,
      session_status: finalStatus,
      ticket_stage: ticketStage,
      ...(session.pipeline_lead_id && { pipeline_lead_id: session.pipeline_lead_id }),
    });
  } catch (error: any) {
    console.error("[SESSION_COMPLETE_ERROR]", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: error.status || 500 }
    );
  }
}
