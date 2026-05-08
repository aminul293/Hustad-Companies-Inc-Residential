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

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = getServiceClient();
    
    // 1. Fetch the lead to check its status and get the CP ticket ID
    const { data: lead, error: fetchError } = await supabase
      .from('pipeline_leads')
      .select('pipeline_status, cpc_ticket_id')
      .eq('id', params.id)
      .single();

    if (fetchError || !lead) throw new Error("Lead not found");

    // 2. Guard: Check if lead has active inspection activity
    const protectedStatuses = ['inspection_in_progress', 'inspection_completed', 'signed', 'closed'];
    if (protectedStatuses.includes(lead.pipeline_status)) {
      return NextResponse.json({ 
        error: "This lead has inspection activity and cannot be removed from Pipeline without admin override." 
      }, { status: 403 });
    }

    // 3. Reset CenterPoint job status back to 'new'
    if (lead.cpc_ticket_id) {
      await supabase
        .from('centerpoint_jobs')
        .update({ inbox_status: 'new' })
        .eq('name', lead.cpc_ticket_id);
    }

    // 4. Delete from pipeline_leads
    const { error: deleteError } = await supabase
      .from('pipeline_leads')
      .delete()
      .eq('id', params.id);

    if (deleteError) throw deleteError;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
