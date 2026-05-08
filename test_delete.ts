import { getServiceClient } from './src/lib/supabase-server.ts';

async function testDelete() {
  const supabase = getServiceClient();
  const leadId = '1324785'; // Using a ticket ID from the screenshot to find the UUID
  
  console.log("Searching for lead with ticket ID:", leadId);
  const { data: lead } = await supabase.from('pipeline_leads').select('id, pipeline_status').eq('cpc_ticket_id', leadId).single();
  
  if (!lead) {
    console.log("Lead not found in pipeline_leads");
    return;
  }
  
  console.log("Lead found:", lead);
  console.log("Attempting delete...");
  
  const { error } = await supabase.from('pipeline_leads').delete().eq('id', lead.id);
  if (error) {
    console.error("DELETE FAILED:", error);
  } else {
    console.log("DELETE SUCCESSFUL");
  }
}

testDelete();
