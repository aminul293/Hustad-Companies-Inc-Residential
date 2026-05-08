import { NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

// ── GET /api/appointments?repId=&filter=today|tomorrow|week|all ───────────────
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const repId = searchParams.get('repId');
  const filter = searchParams.get('filter') || 'today';

  try {
    const supabase = getServiceClient();
    const now = new Date();

    let startBound: string | null = null;
    let endBound: string | null = null;

    if (filter === 'today') {
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
          centerpoint_jobs ( name, property_name, raw )
        )
      `)
      .not('appointment_status', 'in', '("cancelled","completed")')
      .order('appointment_start_at', { ascending: true });

    if (repId) query = query.eq('assigned_rep_id', repId);
    if (startBound) query = query.gte('appointment_start_at', startBound);
    if (endBound) query = query.lte('appointment_start_at', endBound);

    const { data, error } = await query;
    if (error) throw error;
    return NextResponse.json(data ?? []);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ── POST /api/appointments — create with clash detection ──────────────────────
export async function POST(request: Request) {
  const body = await request.json();
  const { pipeline_lead_id, rep_id, appointment_start_at, appointment_end_at, location, notes } = body;

  if (!pipeline_lead_id || !rep_id || !appointment_start_at || !appointment_end_at) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const supabase = getServiceClient();

  // ── Clash detection ────────────────────────────────────────────────────────
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
    const addr = clash.pipeline_leads?.centerpoint_jobs?.property_name || clash.pipeline_leads?.cpc_ticket_id || 'Another appointment';
    const clashStart = new Date(clash.appointment_start_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    const clashEnd   = new Date(clash.appointment_end_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    return NextResponse.json({
      clash: true,
      message: `Conflict with "${addr}" at ${clashStart}–${clashEnd}`,
      conflictId: clash.id,
    }, { status: 409 });
  }

  // ── Create appointment ─────────────────────────────────────────────────────
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

  if (apptErr) return NextResponse.json({ error: apptErr.message }, { status: 500 });

  // ── Update pipeline_lead ───────────────────────────────────────────────────
  await supabase
    .from('pipeline_leads')
    .update({
      pipeline_status: 'scheduled',
      scheduled_start_at: appointment_start_at,
      scheduled_end_at: appointment_end_at,
    })
    .eq('id', pipeline_lead_id);

  return NextResponse.json({ success: true, appointment: appt }, { status: 201 });
}
