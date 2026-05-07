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

export async function GET() {
  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from('pipeline_leads')
    .select(`
      *,
      centerpoint_jobs (*)
    `)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
