import { NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase-server';

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const { id } = params;
  const body = await request.json();
  const { appointment_status, appointment_start_at, appointment_end_at, notes } = body;

  try {
    const supabase = getServiceClient();

    const updates: Record<string, unknown> = {};
    if (appointment_status)    updates.appointment_status    = appointment_status;
    if (appointment_start_at)  updates.appointment_start_at  = appointment_start_at;
    if (appointment_end_at)    updates.appointment_end_at    = appointment_end_at;
    if (notes !== undefined)   updates.notes                 = notes;

    const { data: appt, error } = await supabase
      .from('appointments')
      .update(updates)
      .eq('id', id)
      .select('*, pipeline_leads(id)')
      .single();

    if (error) throw error;

    const leadId = (appt as any).pipeline_leads?.id ?? (appt as any).pipeline_lead_id;

    // ── Side effects based on new status ──────────────────────────────────────
    if (leadId) {
      if (appointment_status === 'completed') {
        await supabase.from('pipeline_leads').update({ pipeline_status: 'inspection_in_progress' }).eq('id', leadId);
      } else if (appointment_status === 'no_show' || appointment_status === 'cancelled') {
        await supabase.from('pipeline_leads').update({
          pipeline_status: 'follow_up_needed',
          next_follow_up_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        }).eq('id', leadId);
      } else if (appointment_status === 'rescheduled' && appointment_start_at && appointment_end_at) {
        await supabase.from('pipeline_leads').update({
          scheduled_start_at: appointment_start_at,
          scheduled_end_at:   appointment_end_at,
        }).eq('id', leadId);
      } else if (appointment_status === 'confirmed') {
        // No pipeline status change — confirmed just means rep acknowledged it
      }
    }

    return NextResponse.json({ success: true, appointment: appt });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
