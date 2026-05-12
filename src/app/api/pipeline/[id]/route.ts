import { NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase-server';

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const updates = await request.json();

  try {
    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from('pipeline_leads')
      .update(updates)
      .eq('id', params.id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true, lead: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  console.log(`[API] Start removal for lead ID: ${params.id}`);
  try {
    const supabase = getServiceClient();
    
    // 1. Fetch lead to check workflow status
    const { data: lead, error: fetchError } = await supabase
      .from('pipeline_leads')
      .select('pipeline_status, cpc_ticket_id, centerpoint_job_id')
      .eq('id', params.id)
      .single();

    if (fetchError) {
      console.error(`[API] Fetch error for ID ${params.id}:`, fetchError);
      throw new Error(`Lead not found: ${fetchError.message}`);
    }

    if (!lead) {
      console.error(`[API] No lead record found for ID ${params.id}`);
      throw new Error("Lead record not found in database");
    }

    console.log(`[API] Lead found. Status: ${lead.pipeline_status}, CP Ticket: ${lead.cpc_ticket_id}`);

    // 2. Case 2: Inspection Started (Blocked unless forced)
    const { searchParams } = new URL(_request.url);
    const force = searchParams.get('force') === 'true';

    const blockedStatuses = ['inspection_in_progress', 'inspection_completed', 'signed', 'closed'];
    if (blockedStatuses.includes(lead.pipeline_status) && !force) {
      console.warn(`[API] Removal blocked due to status: \${lead.pipeline_status}`);
      return NextResponse.json({ 
        error: "This lead has inspection activity and cannot be removed from Pipeline." 
      }, { status: 403 });
    }

    // 3. Case 1: Accidental Import (Allowed)
    // Reset CP Inbox status using the FK (same column the POST used to set it)
    const cpResetId = lead.centerpoint_job_id;
    if (cpResetId) {
      const { error: cpError } = await supabase
        .from('centerpoint_jobs')
        .update({ inbox_status: null })
        .eq('id', cpResetId);

      if (cpError) console.error(`[API] CP status reset failed:`, cpError);
    }

    // 4. Remove from active pipeline
    console.log(`[API] Executing delete for pipeline_leads ID: \${params.id}`);
    const { error: deleteError } = await supabase
      .from('pipeline_leads')
      .delete()
      .eq('id', params.id);

    if (deleteError) {
      console.error(`[API] Database delete failed:`, deleteError);
      throw deleteError;
    }

    console.log(`[API] Removal successful for: \${params.id}`);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error(`[API] removal process exception:`, error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
