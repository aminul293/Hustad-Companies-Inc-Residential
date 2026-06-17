import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase-server';
import { requireAuth } from '@/lib/auth';
import { fetchServiceManagerNames } from '@/lib/centerpoint/client';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

const MANAGER_EMAILS = ['aminul@hustadcompanies.com', 'system@hustadcompanies.com'];

// POST /api/pipeline — import a CenterPoint job to the pipeline (manager-only).
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    const { job } = await request.json();
    if (!job) return NextResponse.json({ error: 'Missing job data' }, { status: 400 });

    const supabase = getServiceClient();
    const { data: authRep } = await supabase.from('reps').select('role').eq('id', auth.repId).maybeSingle();
    const role: string = (authRep as any)?.role ?? (MANAGER_EMAILS.includes(auth.email) ? 'manager' : 'sales_rep');
    if (role !== 'manager') {
      return NextResponse.json({ error: 'Only managers can import jobs to the pipeline.' }, { status: 403 });
    }

    const { data: cpJob, error: cpError } = await supabase
      .from('centerpoint_jobs')
      .select('id')
      .eq('cp_id', job.id)
      .single();
    if (cpError || !cpJob) throw new Error('Could not find internal centerpoint_job record.');

    const { data: lead, error: rpcError } = await supabase.rpc('import_job_to_pipeline', {
      p_cp_job_id: cpJob.id,
      p_cpc_ticket_id: job.attributes.name,
      p_original_status: job.attributes.status,
    });
    if (rpcError) throw rpcError;

    // Auto-assign from CenterPoint Additional Managers via individual API call.
    try {
      const managers = await fetchServiceManagerNames(String(job.id));
      if (managers.length > 0) {
        const { data: allReps } = await supabase.from('reps').select('id, name').eq('active', true);
        for (const mgrName of managers) {
          const lower = mgrName.toLowerCase();
          const match = (allReps ?? []).find(
            (r: any) =>
              r.name.toLowerCase() === lower ||
              r.name.toLowerCase().includes(lower) ||
              lower.includes(r.name.toLowerCase())
          );
          if (match) {
            await supabase
              .from('pipeline_leads')
              .update({ assigned_rep_id: match.id })
              .eq('cpc_ticket_id', job.attributes.name)
              .is('assigned_rep_id', null);
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
    if (error.status === 401) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: error.status || 500 });
  }
}

// GET /api/pipeline — managers see all (or filter by repId param); reps see only their own leads.
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    const { searchParams } = new URL(request.url);
    const requestedRepId = searchParams.get('repId');

    const supabase = getServiceClient();
    const { data: authRep } = await supabase.from('reps').select('role').eq('id', auth.repId).maybeSingle();
    const role: string = (authRep as any)?.role ?? (MANAGER_EMAILS.includes(auth.email) ? 'manager' : 'sales_rep');
    const isManager = role === 'manager';

    let query = supabase
      .from('pipeline_leads')
      .select('*, centerpoint_jobs (*), appointments!pipeline_lead_id ( id, assigned_rep_id )')
      .order('created_at', { ascending: false });

    if (!isManager) {
      query = query.eq('assigned_rep_id', auth.repId);
    } else if (requestedRepId) {
      query = query.eq('assigned_rep_id', requestedRepId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return NextResponse.json(data ?? []);
  } catch (error: any) {
    console.error('[PIPELINE_GET_ERROR]', error);
    if (error.status === 401) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

// PATCH /api/pipeline — assign or unassign a rep (manager-only).
export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    const body = await request.json();
    const { cpc_ticket_id } = body;
    const assigned_rep_id: string | null = body.assigned_rep_id ?? null;
    if (!cpc_ticket_id) return NextResponse.json({ error: 'Missing cpc_ticket_id' }, { status: 400 });

    const supabase = getServiceClient();
    const { data: authRep } = await supabase.from('reps').select('role').eq('id', auth.repId).maybeSingle();
    const role: string = (authRep as any)?.role ?? (MANAGER_EMAILS.includes(auth.email) ? 'manager' : 'sales_rep');
    if (role !== 'manager') {
      return NextResponse.json({ error: 'Only managers can assign or unassign reps.' }, { status: 403 });
    }

    if (assigned_rep_id === null) {
      await supabase.from('pipeline_leads').update({ assigned_rep_id: null }).eq('cpc_ticket_id', cpc_ticket_id);
      return NextResponse.json({ success: true });
    }

    let { data, error } = await supabase
      .from('pipeline_leads')
      .update({ assigned_rep_id })
      .eq('cpc_ticket_id', cpc_ticket_id)
      .select('id, assigned_rep_id')
      .maybeSingle();
    if (error) throw error;

    if (!data) {
      const { data: cpJob, error: cpErr } = await supabase
        .from('centerpoint_jobs')
        .select('id, status')
        .eq('name', cpc_ticket_id)
        .maybeSingle();
      if (cpErr) throw cpErr;
      if (!cpJob) return NextResponse.json({ error: 'Job not found in CenterPoint records.' }, { status: 404 });

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
    if (error.status === 401) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

// DELETE /api/pipeline?cpc_ticket_id=... — unlink a job from pipeline (manager-only).
export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    const { searchParams } = new URL(request.url);
    const cpcTicketId = searchParams.get('cpc_ticket_id');
    if (!cpcTicketId) return NextResponse.json({ error: 'Missing cpc_ticket_id' }, { status: 400 });

    const supabase = getServiceClient();
    const { data: authRep } = await supabase.from('reps').select('role').eq('id', auth.repId).maybeSingle();
    const role: string = (authRep as any)?.role ?? (MANAGER_EMAILS.includes(auth.email) ? 'manager' : 'sales_rep');
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
      const resetTarget = lead.centerpoint_job_id
        ? supabase.from('centerpoint_jobs').update({ inbox_status: 'new' }).eq('id', lead.centerpoint_job_id)
        : supabase.from('centerpoint_jobs').update({ inbox_status: 'new' }).eq('name', cpcTicketId);
      const { error: resetErr } = await resetTarget;
      if (resetErr) throw resetErr;
      const { error: deleteErr } = await supabase.from('pipeline_leads').delete().eq('id', lead.id);
      if (deleteErr) throw deleteErr;
    } else {
      const { error: resetErr } = await supabase
        .from('centerpoint_jobs').update({ inbox_status: 'new' }).eq('name', cpcTicketId);
      if (resetErr) throw resetErr;
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[PIPELINE_DELETE_BY_TICKET_ERROR]', error);
    if (error.status === 401) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
