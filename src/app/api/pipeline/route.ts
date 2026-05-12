import { NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

export async function POST(request: Request) {
  const { job } = await request.json();

  if (!job) {
    return NextResponse.json({ error: 'Missing job data' }, { status: 400 });
  }

  try {
    const supabase = getServiceClient();
    // Look up the internal UUID for this job
    const { data: cpJob, error: cpError } = await supabase
      .from('centerpoint_jobs')
      .select('id')
      .eq('cp_id', job.id)
      .single();

    if (cpError || !cpJob) {
      throw new Error("Could not find internal centerpoint_job record.");
    }

    // 1. Create the Pipeline Lead
    const { data: lead, error: leadError } = await supabase
      .from('pipeline_leads')
      .upsert({
        centerpoint_job_id: cpJob.id,
        cpc_ticket_id: job.attributes.name,
        pipeline_status: 'new_lead',
        imported_at: new Date().toISOString(),
        lead_notes: `Imported from CenterPoint Inbox. Original Status: ${job.attributes.status}`
      }, { onConflict: 'cpc_ticket_id' })
      .select()
      .single();

    if (leadError) throw leadError;

    // 2. Update the Inbox Status to prevent re-import
    const { error: inboxError } = await supabase
      .from('centerpoint_jobs')
      .update({ inbox_status: 'imported_to_pipeline' })
      .eq('id', cpJob.id);

    if (inboxError) throw inboxError;

    return NextResponse.json({ success: true, lead });
  } catch (error: any) {
    console.error('[PIPELINE_IMPORT_ERROR]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const repId = searchParams.get('repId');

  const supabase = getServiceClient();

  let query = supabase
    .from('pipeline_leads')
    .select(`
      *,
      centerpoint_jobs (*),
      appointments!pipeline_lead_id ( id, assigned_rep_id )
    `)
    .order('created_at', { ascending: false });

  // When repId is provided, restrict to leads that have an appointment assigned to that rep
  // OR leads with no appointment yet (new/unscheduled leads)
  const QA_MODE = process.env.NEXT_PUBLIC_QA_MODE === "true";
  const isMockRep = QA_MODE && repId === 'rep_001';

  if (repId && !isMockRep) {
    const { data: repLeadIds } = await supabase
      .from('appointments')
      .select('pipeline_lead_id')
      .eq('assigned_rep_id', repId);

    const ids = (repLeadIds ?? []).map((r: any) => r.pipeline_lead_id).filter(Boolean);
    
    if (ids.length > 0) {
      // In a real app we'd use a more complex OR filter, 
      // but for this MVP we'll show leads with appointments for this rep 
      // PLUS any lead that has NO appointments.
      const { data: allApptIds } = await supabase.from('appointments').select('pipeline_lead_id');
      const takenIds = (allApptIds ?? []).map((a: any) => a.pipeline_lead_id).filter(Boolean);
      
      if (takenIds.length > 0) {
        query = query.or(`id.in.(${ids.join(',')}),id.not.in.(${takenIds.join(',')})`);
      } else {
        // No appointments at all, show everything
      }
    } else {
      // If no appointments found for this rep, show leads that have NO appointments yet.
      const { data: allApptIds } = await supabase.from('appointments').select('pipeline_lead_id');
      const takenIds = (allApptIds ?? []).map((a: any) => a.pipeline_lead_id).filter(Boolean);
      if (takenIds.length > 0) {
        query = query.not('id', 'in', `(${takenIds.join(',')})`);
      }
    }
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
