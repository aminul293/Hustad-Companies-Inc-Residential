import { NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

// GET /api/appointments/manager
// Returns comprehensive manager snapshot for today:
//   appointments_today, conflicts, overdue_followups, outbound_failures
export async function GET() {
  try {
    const supabase = getServiceClient();
    const now = new Date();
    const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
    const todayEnd   = new Date(now); todayEnd.setHours(23, 59, 59, 999);

    const [apptRes, overdueRes, queueRes, pipelineRes] = await Promise.all([
      supabase
        .from('appointments')
        .select(`
          id, appointment_start_at, appointment_end_at, appointment_status,
          assigned_rep_id, location, notes, created_at,
          pipeline_leads (
            id, cpc_ticket_id, pipeline_status, lead_notes,
            contact_attempt_count, next_follow_up_at,
            centerpoint_jobs ( name, property_name, raw )
          )
        `)
        .gte('appointment_start_at', todayStart.toISOString())
        .lte('appointment_start_at', todayEnd.toISOString())
        .order('appointment_start_at', { ascending: true }),

      supabase
        .from('pipeline_leads')
        .select('id, cpc_ticket_id, pipeline_status, contact_attempt_count, next_follow_up_at, assigned_rep_id, centerpoint_jobs(name, property_name, raw)')
        .eq('pipeline_status', 'follow_up_needed')
        .lte('next_follow_up_at', now.toISOString())
        .order('next_follow_up_at', { ascending: true })
        .limit(50),

      supabase
        .from('outbound_queue')
        .select('id, target_system, action, status, error, retry_count, created_at, updated_at, target_id')
        .in('status', ['failed', 'pending'])
        .not('error', 'is', null)
        .order('updated_at', { ascending: false })
        .limit(20),

      supabase
        .from('pipeline_leads')
        .select('id, pipeline_status, assigned_rep_id, cpc_ticket_id, contact_attempt_count, next_follow_up_at, centerpoint_jobs(name, property_name, raw)')
        .not('pipeline_status', 'in', '("closed")')
        .limit(500),
    ]);

    const appointments: any[] = apptRes.data ?? [];
    const overdue_followups: any[] = overdueRes.data ?? [];
    const outbound_failures: any[] = queueRes.data ?? [];
    const pipelineLeads: any[] = pipelineRes.data ?? [];

    // "needs_work" = leads still requiring rep action (pre-inspection only).
    // Explicitly excludes inspection_completed + signed so it never overlaps with "completed".
    const NEEDS_WORK = ['new_lead', 'contact_attempted', 'follow_up_needed', 'contacted', 'scheduled', 'appointment_confirmed', 'inspection_in_progress'];

    const pipeline_stats = {
      total:       pipelineLeads.filter(l => NEEDS_WORK.includes(l.pipeline_status)).length,
      new_lead:    pipelineLeads.filter(l => l.pipeline_status === 'new_lead').length,
      in_outreach: pipelineLeads.filter(l => ['contact_attempted', 'follow_up_needed', 'contacted'].includes(l.pipeline_status)).length,
      scheduled:   pipelineLeads.filter(l => ['scheduled', 'appointment_confirmed'].includes(l.pipeline_status)).length,
      in_field:    pipelineLeads.filter(l => l.pipeline_status === 'inspection_in_progress').length,
      completed:   pipelineLeads.filter(l => ['inspection_completed', 'signed'].includes(l.pipeline_status)).length,
      dead_lead:   pipelineLeads.filter(l => l.pipeline_status === 'dead_lead').length,
    };

    // Detect scheduling conflicts (same rep, overlapping times, non-cancelled)
    const active = appointments.filter(a =>
      !['cancelled', 'no_show'].includes(a.appointment_status)
    );
    const byRep: Record<string, typeof active> = {};
    for (const a of active) {
      const key = a.assigned_rep_id ?? 'unknown';
      if (!byRep[key]) byRep[key] = [];
      byRep[key].push(a);
    }
    const conflicts: Array<{ a: any; b: any }> = [];
    for (const repAppts of Object.values(byRep)) {
      for (let i = 0; i < repAppts.length; i++) {
        for (let j = i + 1; j < repAppts.length; j++) {
          const a = repAppts[i];
          const b = repAppts[j];
          if (
            a.appointment_start_at < b.appointment_end_at &&
            a.appointment_end_at   > b.appointment_start_at
          ) {
            conflicts.push({ a, b });
          }
        }
      }
    }

    return NextResponse.json({
      appointments_today: appointments,
      conflicts,
      overdue_followups,
      outbound_failures,
      pipeline_stats,
      pipeline_leads_detail: pipelineLeads,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
