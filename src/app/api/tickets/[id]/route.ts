import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase-server";
import { requireAuth } from "@/lib/auth";

const CP_BASE = "https://api.centerpointconnect.io/centerpoint";
const CP_KEY = process.env.CENTERPOINT_API_KEY!;

// Stages that trigger a CenterPoint write-back and what status to send
const CP_WRITEBACK: Record<string, string> = {
  signed:        "lead_sold",
  job_scheduled: "scheduled",
  job_started:   "started",
  job_completed: "completed",
  invoiced:      "invoiced",
  closed_won:    "closed",
  closed_lost:   "lead_dead",
};

// ─── GET /api/tickets/[id] ────────────────────────────────────────────────────
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAuth(req);
    const supabase = getServiceClient();
  const { data, error } = await supabase
    .from("hustad_tickets")
    .select("*, ticket_touches(*)")
    .eq("id", params.id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json({ ticket: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: err.status || 500 });
  }
}

// ─── PATCH /api/tickets/[id] ──────────────────────────────────────────────────
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAuth(req);
    const body = await req.json();
    const { stage, notes, client_name, client_email, client_phone,
            assigned_rep_name, property_address, price } = body;

  const supabase = getServiceClient();

  // Fetch current ticket so we know cp_job_id and current stage
  const { data: current, error: fetchError } = await supabase
    .from("hustad_tickets")
    .select("id, cp_job_id, stage, last_cp_writeback_stage")
    .eq("id", params.id)
    .single();

  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 404 });

  const updates: Record<string, any> = {};
  if (stage !== undefined) {
    const STAGE_ORDER = [
      "new", "contacted", "appointment_set", "inspection_done",
      "estimate_sent", "follow_up", "signed", "job_scheduled",
      "job_started", "job_completed", "invoiced", "closed_won", "closed_lost"
    ];
    const currentIdx = STAGE_ORDER.indexOf(current.stage);
    const targetIdx = STAGE_ORDER.indexOf(stage);

    if (targetIdx >= 0 && targetIdx < currentIdx) {
      return NextResponse.json({ error: `Cannot regress ticket from ${current.stage} to ${stage}` }, { status: 400 });
    }
    updates.stage = stage;
  }
  if (notes !== undefined)              updates.notes = notes;
  if (client_name !== undefined)        updates.client_name = client_name;
  if (client_email !== undefined)       updates.client_email = client_email;
  if (client_phone !== undefined)       updates.client_phone = client_phone;
  if (assigned_rep_name !== undefined)  updates.assigned_rep_name = assigned_rep_name;
  if (property_address !== undefined)   updates.property_address = property_address;
  if (price !== undefined)              updates.price = price;

  // Handle CP write-back when stage changes to a key milestone
  if (stage && stage !== current.stage && current.cp_job_id && CP_WRITEBACK[stage]) {
    const cpStatus = CP_WRITEBACK[stage];
    try {
      const nowStr = new Date().toISOString();
      const attrs: Record<string, any> = { status: cpStatus };
      if (cpStatus === "completed") {
        attrs.completedAt = nowStr;
      } else if (cpStatus === "closed") {
        attrs.closedAt = nowStr;
        attrs.invoicedAt = nowStr;
      } else if (cpStatus === "started") {
        attrs.startedAt = nowStr;
      }

      const cpRes = await fetch(`${CP_BASE}/services/${current.cp_job_id}`, {
        method: "PATCH",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: CP_KEY,
        },
        body: JSON.stringify({
          data: { type: "services", id: current.cp_job_id, attributes: attrs },
        }),
      });

      if (!cpRes.ok) {
        const errText = await cpRes.text().catch(() => String(cpRes.status));
        console.error(`[CP_WRITEBACK] stage=${stage} cp_job_id=${current.cp_job_id} status=${cpRes.status}: ${errText}`);
        // Queue for retry so the failure is visible in the Manager outbound queue
        await supabase.from("outbound_queue").insert({
          target_system: "centerpoint",
          target_id: current.cp_job_id,
          action: "update_status",
          payload: { status: cpStatus, ticket_id: params.id, stage },
          status: "pending",
          error: `HTTP ${cpRes.status}: ${errText.slice(0, 200)}`,
        });
      } else {
        // Mirror in centerpoint_jobs cache
        await supabase
          .from("centerpoint_jobs")
          .update({ status: cpStatus, synced_at: new Date().toISOString() })
          .eq("cp_id", current.cp_job_id);

        updates.last_cp_writeback_stage = stage;
        updates.last_cp_writeback_at = new Date().toISOString();
      }
    } catch (writebackErr: any) {
      console.error(`[CP_WRITEBACK] unexpected error for cp_job_id=${current.cp_job_id}:`, writebackErr?.message);
      try {
        await supabase.from("outbound_queue").insert({
          target_system: "centerpoint",
          target_id: current.cp_job_id,
          action: "update_status",
          payload: { status: cpStatus, ticket_id: params.id, stage },
          status: "pending",
          error: writebackErr?.message?.slice(0, 200) ?? "Unknown error",
        });
      } catch {
        // Queue insert failed — error already logged above, don't block the ticket update
      }
    }
  }

  const { data: ticket, error } = await supabase
    .from("hustad_tickets")
    .update(updates)
    .eq("id", params.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ticket });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: err.status || 500 });
  }
}

// ─── DELETE /api/tickets/[id] ─────────────────────────────────────────────────
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAuth(req);
    const supabase = getServiceClient();

    // Delete touches first (in case there's no cascade)
    await supabase.from("ticket_touches").delete().eq("hustad_ticket_id", params.id);

    const { error } = await supabase
      .from("hustad_tickets")
      .delete()
      .eq("id", params.id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: err.status || 500 });
  }
}
