import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase-server';
import { requireAuth } from '@/lib/auth';
import { CP_BASE, cpJsonHeaders } from '@/lib/centerpoint/client';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    await requireAuth(request);
    const { searchParams } = new URL(request.url);
    const repId      = searchParams.get('repId');
    const filter     = searchParams.get('filter') || 'today';
    const from       = searchParams.get('from');
    const to         = searchParams.get('to');
    const includeAll = searchParams.get('includeAll') === 'true';

    const supabase = getServiceClient();
    const now = new Date();

    let startBound: string | null = null;
    let endBound: string | null   = null;

    if (from && to) {
      startBound = from;
      endBound   = to;
    } else if (from) {
      const s = new Date(from); s.setHours(0, 0, 0, 0);
      const e = new Date(from); e.setHours(23, 59, 59, 999);
      startBound = s.toISOString();
      endBound   = e.toISOString();
    } else if (filter === 'today') {
      const s = new Date(now); s.setHours(0, 0, 0, 0);
      const e = new Date(now); e.setHours(23, 59, 59, 999);
      startBound = s.toISOString(); endBound = e.toISOString();
    } else if (filter === 'tomorrow') {
      const s = new Date(now); s.setDate(s.getDate() + 1); s.setHours(0, 0, 0, 0);
      const e = new Date(s); e.setHours(23, 59, 59, 999);
      startBound = s.toISOString(); endBound = e.toISOString();
    } else if (filter === 'week') {
      const s = new Date(now); s.setHours(0, 0, 0, 0);
      const e = new Date(now); e.setDate(e.getDate() + 7); e.setHours(23, 59, 59, 999);
      startBound = s.toISOString(); endBound = e.toISOString();
    }

    let query = supabase
      .from('appointments')
      .select(`
        *,
        pipeline_leads (
          id, cpc_ticket_id, pipeline_status, lead_notes,
          contact_attempt_count, scheduled_start_at, scheduled_end_at,
          next_follow_up_at,
          centerpoint_jobs ( name, property_name, raw )
        )
      `)
      .order('appointment_start_at', { ascending: true });

    if (!includeAll) {
      query = query.not('appointment_status', 'in', '("cancelled","completed")');
    }

    if (repId) query = query.eq('assigned_rep_id', repId);
    if (startBound) query = query.gte('appointment_start_at', startBound);
    if (endBound)   query = query.lte('appointment_start_at', endBound);

    const { data, error } = await query;
    if (error) throw error;
    return NextResponse.json(data ?? []);
  } catch (err: any) {
    console.error('[APPOINTMENTS_GET_ERROR]', err);
    return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: err.status || 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAuth(request);
    const body = await request.json();
    const { pipeline_lead_id, rep_id, appointment_start_at, appointment_end_at, location, notes, _dry_run } = body;

    if (!pipeline_lead_id || !rep_id || !appointment_start_at || !appointment_end_at) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const supabase = getServiceClient();

    // Clash detection
    const { data: conflicts } = await supabase
      .from('appointments')
      .select(`
        id, appointment_start_at, appointment_end_at, appointment_status,
        pipeline_leads ( cpc_ticket_id, centerpoint_jobs ( property_name ) )
      `)
      .eq('assigned_rep_id', rep_id)
      .not('appointment_status', 'in', '("cancelled","completed","no_show")')
      .lt('appointment_start_at', appointment_end_at)
      .gt('appointment_end_at', appointment_start_at);

    if (conflicts && conflicts.length > 0) {
      const clash = conflicts[0] as any;
      const addr  = clash.pipeline_leads?.centerpoint_jobs?.property_name || clash.pipeline_leads?.cpc_ticket_id || 'Another appointment';
      const clashStart = new Date(clash.appointment_start_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
      const clashEnd   = new Date(clash.appointment_end_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
      return NextResponse.json({
        clash: true,
        message: `Conflict with "${addr}" at ${clashStart}–${clashEnd}`,
        conflictId: clash.id,
      }, { status: 409 });
    }

    if (_dry_run) {
      return NextResponse.json({ ok: true, clash: false });
    }

    const { data: appt, error: apptErr } = await supabase
      .from('appointments')
      .insert({
        pipeline_lead_id,
        assigned_rep_id: rep_id,
        appointment_start_at,
        appointment_end_at,
        appointment_status: 'scheduled',
        location: location ?? null,
        notes: notes ?? null,
      })
      .select()
      .single();

    if (apptErr) throw apptErr;

    await supabase
      .from('pipeline_leads')
      .update({
        pipeline_status: 'scheduled',
        scheduled_start_at: appointment_start_at,
        scheduled_end_at: appointment_end_at,
      })
      .eq('id', pipeline_lead_id);

    // Fetch pipeline lead's centerpoint job details for write-back
    const { data: leadDetail } = await supabase
      .from('pipeline_leads')
      .select('pipeline_status, centerpoint_jobs(cp_id, status)')
      .eq('id', pipeline_lead_id)
      .single();

    const cpJob = leadDetail?.centerpoint_jobs as any;
    const cpId = cpJob?.cp_id;
    const currentCpStatus: string | null = cpJob?.status ?? null;

    if (cpId && currentCpStatus !== "scheduled") {
      const nowStr = new Date().toISOString();
      const attrs = { status: "scheduled", scheduledAt: appointment_start_at };
      
      try {
        const cpHeaders = cpJsonHeaders();
        const cpRes = await fetch(`${CP_BASE}/services/${cpId}`, {
          method: "PATCH",
          headers: cpHeaders,
          body: JSON.stringify({
            data: { type: "services", id: cpId, attributes: attrs },
          }),
        });

        if (cpRes.ok) {
          // Mirror in local centerpoint_jobs cache
          await supabase
            .from("centerpoint_jobs")
            .update({ status: "scheduled", synced_at: new Date().toISOString() })
            .eq("cp_id", cpId);
        } else {
          const errText = await cpRes.text().catch(() => String(cpRes.status));
          console.error(`[APPOINTMENT_CP_WRITEBACK] status=scheduled cp_id=${cpId} error=${cpRes.status}: ${errText}`);
          await supabase.from("outbound_queue").insert({
            target_system: "centerpoint",
            target_id: cpId,
            action: "update_status",
            payload: { status: "scheduled", attrs, pipeline_lead_id },
            status: "pending",
            error: `HTTP ${cpRes.status}: ${errText.slice(0, 200)}`,
          });
        }
      } catch (writebackErr: any) {
        console.error(`[APPOINTMENT_CP_WRITEBACK] unexpected error for cp_id=${cpId}:`, writebackErr?.message);
        try {
          await supabase.from("outbound_queue").insert({
            target_system: "centerpoint",
            target_id: cpId,
            action: "update_status",
            payload: { status: "scheduled", attrs, pipeline_lead_id },
            status: "pending",
            error: writebackErr?.message?.slice(0, 200) ?? "Unknown error",
          });
        } catch {
          // Non-blocking
        }
      }
    }

    return NextResponse.json({ success: true, appointment: appt }, { status: 201 });
  } catch (err: any) {
    console.error('[APPOINTMENTS_POST_ERROR]', err);
    return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: err.status || 500 });
  }
}

// DELETE /api/appointments — cleanup: for each lead keep only the newest appointment, delete the rest
export async function DELETE(request: NextRequest) {
  try {
    await requireAuth(request);
    const supabase = getServiceClient();

    const { data: all, error } = await supabase
      .from('appointments')
      .select('id, pipeline_lead_id, created_at')
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Group by lead — keep the first (newest), collect the rest for deletion
    const seen = new Set<string>();
    const toDelete: string[] = [];
    for (const appt of all ?? []) {
      const leadKey = appt.pipeline_lead_id;
      if (!leadKey) { toDelete.push(appt.id); continue; }
      if (seen.has(leadKey)) {
        toDelete.push(appt.id);
      } else {
        seen.add(leadKey);
      }
    }

    if (toDelete.length > 0) {
      const { error: delErr } = await supabase.from('appointments').delete().in('id', toDelete);
      if (delErr) throw delErr;
    }

    return NextResponse.json({ deleted: toDelete.length, kept: seen.size });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
