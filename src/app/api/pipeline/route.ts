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

    // Call the RPC to atomically import/update the pipeline lead and update centerpoint_jobs.inbox_status
    const { data: lead, error: rpcError } = await supabase
      .rpc('import_job_to_pipeline', {
        p_cp_job_id: cpJob.id,
        p_cpc_ticket_id: job.attributes.name,
        p_original_status: job.attributes.status
      });

    if (rpcError) throw rpcError;

    return NextResponse.json({ success: true, lead });
  } catch (error: any) {
    console.error('[PIPELINE_POST_ERROR]', error);
    if (error.status === 401) {
      return NextResponse.json({ error: "Unauthorized", message: "Valid session required." }, { status: 401 });
    }
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

    // When repId is provided, restrict to leads assigned to that rep (sales rep isolation).
    // Managers call without repId and see the full pipeline.
    if (repId) {
      query = query.eq('assigned_rep_id', repId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return NextResponse.json(data ?? []);
  } catch (error: any) {
    console.error('[PIPELINE_GET_ERROR]', error);
    if (error.status === 401) {
      return NextResponse.json({ error: "Unauthorized", message: "Valid session required." }, { status: 401 });
    }
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: error.status || 500 });
  }
}

// PATCH /api/pipeline — assign a rep to a pipeline lead by CPC ticket ID (TEXT)
// Body: { cpc_ticket_id: string; assigned_rep_id: string }
export async function PATCH(request: NextRequest) {
  try {
    await requireAuth(request);
    const { cpc_ticket_id, assigned_rep_id } = await request.json();

    if (!cpc_ticket_id || !assigned_rep_id) {
      return NextResponse.json({ error: 'Missing cpc_ticket_id or assigned_rep_id' }, { status: 400 });
    }

    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from('pipeline_leads')
      .update({ assigned_rep_id })
      .eq('cpc_ticket_id', cpc_ticket_id)
      .select('id, assigned_rep_id')
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      return NextResponse.json({ error: 'No pipeline lead found for this ticket. Import the job to Pipeline first.' }, { status: 404 });
    }
    return NextResponse.json({ success: true, lead: data });
  } catch (error: any) {
    if (error.status === 401) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

// DELETE /api/pipeline?cpc_ticket_id=1329675
// Unlinks a CP Inbox job from pipeline — finds the lead by ticket ID,
// deletes it, and resets centerpoint_jobs.inbox_status back to null.
export async function DELETE(request: NextRequest) {
  try {
    await requireAuth(request);
    const { searchParams } = new URL(request.url);
    const cpcTicketId = searchParams.get('cpc_ticket_id');

    if (!cpcTicketId) {
      return NextResponse.json({ error: 'Missing cpc_ticket_id' }, { status: 400 });
    }

    const supabase = getServiceClient();

    // Find the pipeline lead by ticket ID
    const { data: lead, error: fetchErr } = await supabase
      .from('pipeline_leads')
      .select('id, centerpoint_job_id')
      .eq('cpc_ticket_id', cpcTicketId)
      .maybeSingle();

    if (fetchErr) throw fetchErr;

    if (lead) {
      // Reset inbox_status using the FK
      if (lead.centerpoint_job_id) {
        const { error: resetErr } = await supabase
          .from('centerpoint_jobs')
          .update({ inbox_status: 'new' })
          .eq('id', lead.centerpoint_job_id);
        if (resetErr) throw resetErr;
      } else {
        const { error: resetErr } = await supabase
          .from('centerpoint_jobs')
          .update({ inbox_status: 'new' })
          .eq('name', cpcTicketId);
        if (resetErr) throw resetErr;
      }
      // Delete the pipeline lead
      const { error: deleteErr } = await supabase.from('pipeline_leads').delete().eq('id', lead.id);
      if (deleteErr) throw deleteErr;
    } else {
      // No pipeline lead found — just clear any stale inbox_status by looking up the job directly
      const { error: resetErr } = await supabase
        .from('centerpoint_jobs')
        .update({ inbox_status: 'new' })
        .eq('name', cpcTicketId);
      if (resetErr) throw resetErr;
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[PIPELINE_DELETE_BY_TICKET_ERROR]', error);
    if (error.status === 401) {
      return NextResponse.json({ error: "Unauthorized", message: "Valid session required." }, { status: 401 });
    }
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
