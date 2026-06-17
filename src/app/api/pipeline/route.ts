import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase-server';
import { requireAuth } from '@/lib/auth';
import { IS_QA_MODE } from '@/lib/qa-mode';
import { fetchServiceManagerNames } from '@/lib/centerpoint/client';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

const MANAGER_EMAILS = ['aminul@hustadcompanies.com', 'system@hustadcompanies.com'];

// Look up the authoritative role from the DB (JWT role can be stale).
async function getDbRole(repId: string, email: string, supabase: any): Promise<string> {
  const { data } = await supabase.from('reps').select('role, email').eq('id', repId).maybeSingle();
  return data?.role ?? (MANAGER_EMAILS.includes(email) ? 'manager' : 'sales_rep');
}

// POST /api/pipeline — import a CenterPoint job to the pipeline (manager-only).
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    const { job } = await request.json();

    if (!job) {
      return NextResponse.json({ error: 'Missing job data' }, { status: 400 });
    }

    const supabase = getServiceClient();
    const role = await getDbRole(auth.repId, auth.email, supabase);
    if (role !== 'manager') {
      return NextResponse.json({ error: 'Only managers can import jobs to the pipeline.' }, { status: 403 });
    }

    const { data: cpJob, error: cpError } = await supabase
      .from('centerpoint_jobs')
      .select('id')
      .eq('cp_id', job.id)
      .single();

    if (cpError || !cpJob) {
      throw new Error("Could not find internal centerpoint_job record.");
    }

    const { data: lead, error: rpcError } = await supabase
      .rpc('import_job_to_pipeline', {
        p_cp_job_id: cpJob.id,
        p_cpc_ticket_id: job.attributes.name,
        p_original_status: job.attributes.status
      });

    if (rpcError) throw rpcError;

    // Auto-assign from CenterPoint Additional Managers via individual API call.
    // The bulk sync API doesn't return this field, so we fetch it per-job here.
    try {
      const managers = await fetchServiceManagerNames(String(job.id));
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

// GET /api/pipeline — managers see all leads (or filtered by repId param);
// sales reps are automatically restricted to their own assigned leads.
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    const { searchParams } = new URL(request.url);
    const requestedRepId = searchParams.get('repId');

    const supabase = getServiceClient();
    const role = await getDbRole(auth.repId, auth.email, supabase);
    const isManager = role === 'manager';

    let query = supabase
      .from('pipeline_leads')
      .select(`
        *,
        centerpoint_jobs (*),
        appointments!pipeline_lead_id ( id, assigned_rep_id )
      `)
      .order('created_at', { ascending: false });

    if (!isManager) {
      // Reps always see only their own assigned leads — repId param is ignored
      query = query.eq('assigned_rep_id', auth.repId);
    } else if (requestedRepId) {
      // Managers can optionally filter to a specific rep's leads
      query = query.eq('assigned_rep_id', requestedRepId);
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

// PATCH /api/pipeline — assign or unassign a rep on a pipeline lead (manager-only).
// Body: { cpc_ticket_id: string; assigned_rep_id: string | null }
export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    const body = await request.json();
    const { cpc_ticket_id } = body;
    const assigned_rep_id: string | null = body.assigned_rep_id ?? null;

    if (!cpc_ticket_id) {
      return NextResponse.json({ error: 'Missing cpc_ticket_id' }, { status: 400 });
    }

    const supabase = getServiceClient();
    const role = await getDbRole(auth.repId, auth.email, supabase);
    if (role !== 'manager') {
      return NextResponse.json({ error: 'Only managers can assign or unassign reps.' }, { status: 403 });
    }

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

// DELETE /api/pipeline?cpc_ticket_id=1329675 — unlink a job from pipeline (manager-only).
export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    const { searchParams } = new URL(request.url);
    const cpcTicketId = searchParams.get('cpc_ticket_id');

    if (!cpcTicketId) {
      return NextResponse.json({ error: 'Missing cpc_ticket_id' }, { status: 400 });
    }

    const supabase = getServiceClient();
    const role = await getDbRole(auth.repId, auth.email, supabase);
    if (role !== 'manager') {
      return NextResponse.json({ error: 'Only managers can remove pipeline leads.' }, { status: 403 });
    }

    const { data: lead, error: fetchErr } = await supabase
      .from('pipeline_leads')
      .select('id, centerpoint_job_id')
      .eq('cpc_ticket_id', cpcTicketId)
      .maybeSingle();

    if (fetchErr) throw fetchErr;

    if (lead) {
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
      const { error: deleteErr } = await supabase.from('pipeline_leads').delete().eq('id', lead.id);
      if (deleteErr) throw deleteErr;
    } else {
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
