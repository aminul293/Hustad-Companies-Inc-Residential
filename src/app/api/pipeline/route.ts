import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase-server';
import { requireAuth } from '@/lib/auth';
import { IS_QA_MODE } from '@/lib/qa-mode';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

export async function POST(request: NextRequest) {
  try {
    await requireAuth(request);
    const { job } = await request.json();

    if (!job) {
      return NextResponse.json({ error: 'Missing job data' }, { status: 400 });
    }

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

    // 1. Create the Pipeline Lead — check for existing to avoid resetting status
    const { data: existingLead } = await supabase
      .from('pipeline_leads')
      .select('id, pipeline_status')
      .eq('cpc_ticket_id', job.attributes.name)
      .maybeSingle();

    let lead;
    if (existingLead) {
      // Already exists — just return it or update notes/imported_at if needed, 
      // but PRESERVE the pipeline_status.
      const { data: updated, error: updateErr } = await supabase
        .from('pipeline_leads')
        .update({
          lead_notes: `${existingLead.pipeline_status !== 'new_lead' ? '(Re-imported) ' : ''}${existingLead.pipeline_status === 'new_lead' ? `Imported from CenterPoint Inbox. Original Status: ${job.attributes.status}` : `Update attempted from Inbox.`}`
        })
        .eq('id', existingLead.id)
        .select()
        .single();
      if (updateErr) throw updateErr;
      lead = updated;
    } else {
      // New lead — create it
      const { data: created, error: createErr } = await supabase
        .from('pipeline_leads')
        .insert({
          centerpoint_job_id: cpJob.id,
          cpc_ticket_id: job.attributes.name,
          pipeline_status: 'new_lead',
          imported_at: new Date().toISOString(),
          lead_notes: `Imported from CenterPoint Inbox. Original Status: ${job.attributes.status}`
        })
        .select()
        .single();
      if (createErr) throw createErr;
      lead = created;
    }

    // 2. Update the Inbox Status to prevent re-import
    const { error: inboxError } = await supabase
      .from('centerpoint_jobs')
      .update({ inbox_status: 'imported_to_pipeline' })
      .eq('id', cpJob.id);

    if (inboxError) throw inboxError;

    return NextResponse.json({ success: true, lead });
  } catch (error: any) {
    console.error('[PIPELINE_POST_ERROR]', error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: error.status || 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    await requireAuth(request);
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

    const isMockRep = IS_QA_MODE && repId === 'rep_001';

    if (repId && !isMockRep) {
      // Load all appointments once, then compute set operations in JS
      const { data: allAppts } = await supabase
        .from('appointments')
        .select('pipeline_lead_id, assigned_rep_id');

      const appts = allAppts ?? [];

      // Leads explicitly assigned to this rep
      const myLeadIds = new Set<string>(
        appts
          .filter((a: any) => a.assigned_rep_id === repId && a.pipeline_lead_id)
          .map((a: any) => a.pipeline_lead_id)
      );

      // Leads assigned to other reps but NOT also to this rep (exclude these)
      const exclusivelyOtherIds = appts
        .filter((a: any) => a.assigned_rep_id !== repId && a.pipeline_lead_id && !myLeadIds.has(a.pipeline_lead_id))
        .map((a: any) => a.pipeline_lead_id as string);

      // Deduplicate
      const excludeIds = [...new Set(exclusivelyOtherIds)];

      if (excludeIds.length > 0) {
        query = query.not('id', 'in', `(${excludeIds.join(',')})`);
      }
      // If excludeIds is empty, all leads are visible (newly imported unassigned leads included)
    }

    const { data, error } = await query;
    if (error) throw error;
    return NextResponse.json(data ?? []);
  } catch (error: any) {
    console.error('[PIPELINE_GET_ERROR]', error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: error.status || 500 });
  }
}
