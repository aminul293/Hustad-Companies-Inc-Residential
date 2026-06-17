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

    // Auto-assign from CenterPoint Additional Managers if available and not yet assigned
    try {
      const { data: cpJobData } = await supabase
        .from("centerpoint_jobs")
        .select("cp_additional_managers")
        .eq("id", cpJob.id)
        .maybeSingle();

      if (cpJobData?.cp_additional_managers) {
        const managers: string[] = JSON.parse(cpJobData.cp_additional_managers);
        if (managers.length > 0) {
          const { data: allReps } = await supabase
            .from("reps")
            .select("id, name")
            .eq("active", true);

          for (const mgrName of managers) {
            const lower = mgrName.toLowerCase();
            const match = allReps?.find(
              (r: any) =>
                r.name.toLowerCase() === lower ||
                r.name.toLowerCase().includes(lower) ||
                lower.includes(r.name.toLowerCase())
            );
            if (match) {
              await supabase
                .from("pipeline_leads")
                .update({ assigned_rep_id: match.id })
                .eq("cpc_ticket_id", job.attributes.name)
                .is("assigned_rep_id", null);
              break;
            }
          }
        }
      }
    } catch {
      // Non-fatal — import still succeeds without auto-assignment
    }

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

// PATCH /api/pipeline — assign or unassign a rep on a pipeline lead by CPC ticket ID.
// Body: { cpc_ticket_id: string; assigned_rep_id: string | null }
// Pass assigned_rep_id: null to unassign. Auto-imports the job if assigning and not yet in pipeline.
export async function PATCH(request: NextRequest) {
  try {
    await requireAuth(request);
    const body = await request.json();
    const { cpc_ticket_id } = body;
    const assigned_rep_id: string | null = body.assigned_rep_id ?? null;

    if (!cpc_ticket_id) {
      return NextResponse.json({ error: 'Missing cpc_ticket_id' }, { status: 400 });
    }

    const supabase = getServiceClient();

    // Unassign — just clear and return; no auto-import needed
    if (assigned_rep_id === null) {
      await supabase
        .from('pipeline_leads')
        .update({ assigned_rep_id: null })
        .eq('cpc_ticket_id', cpc_ticket_id);
      return NextResponse.json({ success: true });
    }

    // Try to assign directly (job already imported to pipeline)
    let { data, error } = await supabase
      .from('pipeline_leads')
      .update({ assigned_rep_id })
      .eq('cpc_ticket_id', cpc_ticket_id)
      .select('id, assigned_rep_id')
      .maybeSingle();

    if (error) throw error;

    // Not in pipeline yet — auto-import then assign
    if (!data) {
      const { data: cpJob, error: cpErr } = await supabase
        .from('centerpoint_jobs')
        .select('id, status')
        .eq('name', cpc_ticket_id)
        .maybeSingle();

      if (cpErr) throw cpErr;
      if (!cpJob) {
        return NextResponse.json({ error: 'Job not found in CenterPoint records.' }, { status: 404 });
      }

      const { error: rpcErr } = await supabase.rpc('import_job_to_pipeline', {
        p_cp_job_id: cpJob.id,
        p_cpc_ticket_id: cpc_ticket_id,
        p_original_status: cpJob.status,
      });
      if (rpcErr) throw rpcErr;

      const { data: assigned, error: assignErr } = await supabase
        .from('pipeline_leads')
        .update({ assigned_rep_id })
        .eq('cpc_ticket_id', cpc_ticket_id)
        .select('id, assigned_rep_id')
        .maybeSingle();
      if (assignErr) throw assignErr;
      data = assigned;
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
