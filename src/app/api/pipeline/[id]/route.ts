import { NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase-server';
import { requireAuth } from '@/lib/auth';
import { CP_BASE, cpJsonHeaders } from '@/lib/centerpoint/client';
import { sendLeadDeletedEmail } from '@/lib/email/sendLeadDeletedEmail';

const PIPELINE_WRITEBACK: Record<string, string> = {
  // Early CRM stages (new_lead, contact_attempted, contacted, follow_up_needed) are omitted —
  // they have no CP equivalent that advances the job and would downgrade CP status if sent.
  scheduled:              "scheduled",
  appointment_confirmed:  "scheduled",
  inspection_in_progress: "started",
  inspection_completed:   "completed",
  dead_lead:              "closed",
  signed:                 "opened",
  closed:                 "closed",
};

const CP_STAGE_ORDER = [
  "new_service","opened","scheduled","started","completed","closed",
];

function cpStatusAdvances(current: string | null | undefined, next: string): boolean {
  if (!current) return true;
  const curIdx = CP_STAGE_ORDER.indexOf(current);
  const nextIdx = CP_STAGE_ORDER.indexOf(next);
  if (curIdx === -1 || nextIdx === -1) return true; // unknown stage — allow CP to decide
  return nextIdx > curIdx;
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    // 1. Authenticate Request
    await requireAuth(request as any);
  } catch (e: any) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const updates = await request.json();

  try {
    const supabase = getServiceClient();

    // 2. Fetch current pipeline lead and its related CP job cp_id + cached status
    const { data: current, error: fetchError } = await supabase
      .from('pipeline_leads')
      .select('id, pipeline_status, cpc_ticket_id, centerpoint_jobs(cp_id, status)')
      .eq('id', params.id)
      .single();

    if (fetchError) throw fetchError;

    // 3a. Guard: once a lead reaches inspection it must never regress to earlier stages
    const newStatus = updates.pipeline_status;
    const BLOCKED = new Set(["inspection_in_progress", "inspection_completed", "signed", "closed"]);
    const ALLOWED_FROM_BLOCKED = new Set(["inspection_in_progress", "inspection_completed", "signed", "closed", "dead_lead"]);
    if (newStatus && newStatus !== current.pipeline_status && BLOCKED.has(current.pipeline_status) && !ALLOWED_FROM_BLOCKED.has(newStatus)) {
      return NextResponse.json(
        { error: `Cannot move lead back from "${current.pipeline_status}" — inspection data would be lost.` },
        { status: 409 }
      );
    }

    // 3. Handle CP write-back if pipeline_status changes
    const cpJob = current.centerpoint_jobs as any;
    const cpId = cpJob?.cp_id;
    const currentCpStatus: string | null = cpJob?.status ?? null;

    if (
      newStatus &&
      newStatus !== current.pipeline_status &&
      cpId &&
      PIPELINE_WRITEBACK[newStatus] &&
      cpStatusAdvances(currentCpStatus, PIPELINE_WRITEBACK[newStatus])
    ) {
      const cpStatus = PIPELINE_WRITEBACK[newStatus];
      const nowStr = new Date().toISOString();
      const attrs: Record<string, any> = { status: cpStatus };
      if (cpStatus === "completed") {
        attrs.completedAt = nowStr;
      } else if (cpStatus === "closed") {
        attrs.closedAt = nowStr;
        // invoicedAt is intentionally omitted — the tickets flow owns that timestamp
      } else if (cpStatus === "started") {
        attrs.startedAt = nowStr;
      }

      try {
        let cpHeaders;
        try {
          cpHeaders = cpJsonHeaders();
        } catch (keyErr: any) {
          throw new Error(`API credentials missing: ${keyErr.message}`);
        }

        const cpRes = await fetch(`${CP_BASE}/services/${cpId}`, {
          method: "PATCH",
          headers: cpHeaders,
          body: JSON.stringify({
            data: { type: "services", id: cpId, attributes: attrs },
          }),
        });

        if (!cpRes.ok) {
          const errText = await cpRes.text().catch(() => String(cpRes.status));
          console.error(`[PIPELINE_CP_WRITEBACK] status=${newStatus} cp_id=${cpId} error=${cpRes.status}: ${errText}`);
          
          await supabase.from("outbound_queue").insert({
            target_system: "centerpoint",
            target_id: cpId,
            action: "update_status",
            payload: { status: cpStatus, attrs, pipeline_lead_id: params.id, stage: newStatus },
            status: "pending",
            error: `HTTP ${cpRes.status}: ${errText.slice(0, 200)}`,
          });
        } else {
          // Mirror in local centerpoint_jobs cache
          await supabase
            .from("centerpoint_jobs")
            .update({ status: cpStatus, synced_at: new Date().toISOString() })
            .eq("cp_id", cpId);
        }
      } catch (writebackErr: any) {
        console.error(`[PIPELINE_CP_WRITEBACK] unexpected error for cp_id=${cpId}:`, writebackErr?.message);
        try {
          await supabase.from("outbound_queue").insert({
            target_system: "centerpoint",
            target_id: cpId,
            action: "update_status",
            payload: { status: cpStatus, attrs, pipeline_lead_id: params.id, stage: newStatus },
            status: "pending",
            error: writebackErr?.message?.slice(0, 200) ?? "Unknown error",
          });
        } catch {
          // Non-blocking
        }
      }
    }

    // 3b. Mark linked CP opportunity as dead when pipeline goes to dead_lead
    if (newStatus === 'dead_lead' && current.cpc_ticket_id) {
      try {
        const { data: linkedOpp } = await supabase
          .from('centerpoint_opportunities')
          .select('cp_id, status')
          .eq('name', current.cpc_ticket_id)
          .maybeSingle();

        if (linkedOpp && linkedOpp.status !== 'lead_dead') {
          // Update local cache immediately so Opps screen reflects this right away
          await supabase
            .from('centerpoint_opportunities')
            .update({
              status: 'lead_dead',
              display_status: 'Dead',
              synced_at: new Date().toISOString(),
            })
            .eq('cp_id', linkedOpp.cp_id);

          // Fire CP workflow transition to "Dead" / "Lost" — best-effort, non-blocking
          try {
            let cpHeaders;
            try { cpHeaders = cpJsonHeaders(); } catch { throw new Error('API credentials missing'); }

            const transRes = await fetch(
              `${CP_BASE}/services/${linkedOpp.cp_id}?include=availableTransitions,workflowStage`,
              { headers: { Accept: 'application/json', Authorization: cpHeaders.Authorization }, cache: 'no-store' }
            );

            if (transRes.ok) {
              const transData = await transRes.json();
              const transitions = (transData.included ?? []).filter((x: any) => x.type === 'workflow_transitions');

              const deadTx = transitions.find((tx: any) => {
                const name = (tx.attributes?.name ?? '').toLowerCase();
                return name.includes('dead') || name.includes('lost') || name.includes('decline');
              });

              if (deadTx) {
                await fetch(`${CP_BASE}/production_stage_transitions`, {
                  method: 'POST',
                  headers: cpHeaders,
                  body: JSON.stringify({
                    data: {
                      type: 'production_stage_transitions',
                      attributes: { note: 'Lead marked dead in pipeline' },
                      relationships: {
                        production: { data: { type: 'productions', id: linkedOpp.cp_id } },
                        transition: { data: { type: 'workflow_transitions', id: deadTx.id } },
                      },
                    },
                  }),
                });
              }
            }
          } catch (oppCpErr: any) {
            console.warn(`[PIPELINE_OPP_DEAD] CP transition failed for opp cp_id=${linkedOpp.cp_id}:`, oppCpErr?.message);
          }
        }
      } catch (oppErr: any) {
        console.warn('[PIPELINE_OPP_DEAD] Failed to mark opportunity dead:', oppErr?.message);
      }
    }

    // 4. Update the pipeline lead row
    const { data, error } = await supabase
      .from('pipeline_leads')
      .update(updates)
      .eq('id', params.id)
      .select()
      .single();

    if (error) throw error;

    // Auto-archive inspection sessions if moving back to pre-scheduling stages
    const unscheduledStages = ["new_lead", "contact_attempted", "contacted", "follow_up_needed"];
    if (updates.pipeline_status && unscheduledStages.includes(updates.pipeline_status)) {
      await supabase
        .from('inspection_sessions')
        .update({ session_status: 'archived' })
        .eq('pipeline_lead_id', params.id);
    }

    return NextResponse.json({ success: true, lead: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  console.log(`[API] Start removal for lead ID: ${params.id}`);
  
  let authPayload;
  try {
    // Authenticate DELETE
    authPayload = await requireAuth(request as any);
  } catch (e: any) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = getServiceClient();
    
    // 1. Fetch lead to check workflow status
    const { data: lead, error: fetchError } = await supabase
      .from('pipeline_leads')
      .select('pipeline_status, cpc_ticket_id, centerpoint_job_id, owner_email, assigned_rep_id')
      .eq('id', params.id)
      .single();

    if (fetchError) {
      console.error(`[API] Fetch error for ID ${params.id}:`, fetchError);
      throw new Error(`Lead not found: ${fetchError.message}`);
    }

    if (!lead) {
      console.error(`[API] No lead record found for ID ${params.id}`);
      throw new Error("Lead record not found in database");
    }

    console.log(`[API] Lead found. Status: ${lead.pipeline_status}, CP Ticket: ${lead.cpc_ticket_id}`);

    // 2. Case 2: Inspection Started (Blocked unless forced)
    const { searchParams } = new URL(request.url);
    const force = searchParams.get('force') === 'true';

    if (force) {
      const isManagerRole = authPayload.role === "manager" || authPayload.role === "admin";
      const managerEmails = ["aminul@hustadcompanies.com", "system@hustadcompanies.com"];
      if (!isManagerRole && !managerEmails.includes(authPayload.email)) {
        console.warn(`[API] Force removal blocked for non-manager: ${authPayload.email}`);
        return NextResponse.json({ error: "Forbidden: Only managers can force remove leads." }, { status: 403 });
      }
    }

    const blockedStatuses = ['inspection_in_progress', 'inspection_completed', 'signed', 'closed'];
    if (blockedStatuses.includes(lead.pipeline_status) && !force) {
      console.warn(`[API] Removal blocked due to status: ${lead.pipeline_status}`);
      return NextResponse.json({ 
        error: "This lead has inspection activity and cannot be removed from Pipeline." 
      }, { status: 403 });
    }

    // 3. Case 1: Accidental Import (Allowed)
    // Reset CP Inbox status using the FK (same column the POST used to set it)
    const cpResetId = lead.centerpoint_job_id;
    if (cpResetId) {
      const { error: cpError } = await supabase
        .from('centerpoint_jobs')
        .update({ inbox_status: 'new' })
        .eq('id', cpResetId);

      if (cpError) console.error(`[API] CP status reset failed:`, cpError);

      if (force) {
         const { data: job } = await supabase.from('centerpoint_jobs').select('cp_id').eq('id', cpResetId).maybeSingle();
         if (job?.cp_id) {
           await supabase.from('outbound_queue').insert({
             target_system: 'centerpoint',
             target_id: job.cp_id,
             action: 'update_status',
             payload: { status: 'new_service' }
           });
           console.log(`[API] Queued CP status reset to 'new_service' for CP ID: ${job.cp_id}`);
         }
      }
    } else if (lead.cpc_ticket_id) {
      const { error: cpError } = await supabase
        .from('centerpoint_jobs')
        .update({ inbox_status: 'new' })
        .eq('name', lead.cpc_ticket_id);

      if (cpError) console.error(`[API] CP status reset fallback failed:`, cpError);
      
      if (force) {
         const { data: job } = await supabase.from('centerpoint_jobs').select('cp_id').eq('name', lead.cpc_ticket_id).maybeSingle();
         if (job?.cp_id) {
           await supabase.from('outbound_queue').insert({
             target_system: 'centerpoint',
             target_id: job.cp_id,
             action: 'update_status',
             payload: { status: 'new_service' }
           });
           console.log(`[API] Queued CP status reset to 'new_service' for CP ID: ${job.cp_id}`);
         }
      }
    }

    // 4. Remove from active pipeline
    console.log(`[API] Executing delete for pipeline_leads ID: ${params.id}`);
    const { error: deleteError } = await supabase
      .from('pipeline_leads')
      .delete()
      .eq('id', params.id);

    if (deleteError) {
      console.error(`[API] Database delete failed:`, deleteError);
      throw deleteError;
    }

    // 5. Archive any inspection sessions linked to this lead
    const { error: archiveError } = await supabase
      .from('inspection_sessions')
      .update({ session_status: 'archived' })
      .eq('pipeline_lead_id', params.id);

    if (archiveError) {
      console.error(`[API] Session archive failed (non-fatal):`, archiveError);
    }

    // 6. If forced delete (testing cleanup), also clean up local centerpoint_opportunities cache
    if (force && lead.cpc_ticket_id) {
      const { error: oppDeleteError } = await supabase
        .from('centerpoint_opportunities')
        .delete()
        .eq('name', lead.cpc_ticket_id);
        
      if (oppDeleteError) {
        console.error(`[API] Opportunity cleanup failed (non-fatal):`, oppDeleteError);
      }
    }

    console.log(`[API] Removal successful for: ${params.id}`);

    // 7. Send notification email
    if (force) {
      try {
        await sendLeadDeletedEmail({
          jobName: lead.cpc_ticket_id,
          ticketId: lead.cpc_ticket_id,
          deletedBy: authPayload.name || "Rep",
          deletedByEmail: authPayload.email,
          ownerEmail: lead.owner_email || undefined,
          pipelineStatus: lead.pipeline_status
        });
      } catch (emailErr) {
        console.error("[API] Failed to send lead deleted email:", emailErr);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error(`[API] removal process exception:`, error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
