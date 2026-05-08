require('dotenv').config({ path: '.env.local' });
const { createClient } = require("@supabase/supabase-js");

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function demo() {
  const supabase = getServiceClient();
  const ticketId = "1324785";

  console.log(`--- STARTING DEMO FOR TICKET ${ticketId} ---`);

  // 1. Verify Job exists in Inbox
  const { data: job } = await supabase.from('centerpoint_jobs').select('*').eq('name', ticketId).single();
  console.log("1. CPC Job in Inbox:", { name: job.name, status: job.status, inbox_status: job.inbox_status });

  // 2. Import to Pipeline
  console.log("2. Importing to Pipeline...");
  const resImport = await fetch('http://localhost:3000/api/pipeline', {
    method: 'POST',
    headers: { 
        'Content-Type': 'application/json',
        'x-demo-bypass': process.env.SUPABASE_SERVICE_ROLE_KEY
    },
    body: JSON.stringify({ job: { id: job.cp_id, attributes: job.raw } })
  });
  if (!resImport.ok) {
    const txt = await resImport.text();
    console.error("Import failed:", txt);
    return;
  }
  const importResult = await resImport.json();
  const leadId = importResult.lead.id;
  console.log("   Imported! Lead ID:", leadId);

  // 3. Schedule
  console.log("3. Scheduling...");
  const resSchedule = await fetch(`http://localhost:3000/api/pipeline/${leadId}`, {
    method: 'PATCH',
    headers: { 
        'Content-Type': 'application/json',
        'x-demo-bypass': process.env.SUPABASE_SERVICE_ROLE_KEY
    },
    body: JSON.stringify({ 
      pipeline_status: 'scheduled',
      scheduled_start_at: new Date().toISOString(),
      scheduled_end_at: new Date(Date.now() + 3600000).toISOString()
    })
  });
  console.log("   Scheduled!");

  // 4. Start Inspection (Create Session)
  console.log("4. Starting Inspection...");
  const resSession = await fetch('http://localhost:3000/api/sessions', {
    method: 'POST',
    headers: { 
        'Content-Type': 'application/json',
        'x-demo-bypass': process.env.SUPABASE_SERVICE_ROLE_KEY
    },
    body: JSON.stringify({
      sessionId: `sess_demo_${Date.now()}`,
      centerpointId: ticketId,
      sessionStatus: 'phase_a_active',
      repId: '00000000-0000-0000-0000-000000000000', // Mock UUID
      property: { address: job.property_name }
    })
  });
  if (!resSession.ok) {
    const txt = await resSession.text();
    console.error("Session creation failed:", txt);
    return;
  }
  const sessionResult = await resSession.json();
  console.log("   Session Created:", sessionResult.session.session_id);

  // 5. Complete & Sign
  console.log("5. Signing Dossier...");
  const resSign = await fetch('http://localhost:3000/api/session', {
    method: 'POST',
    headers: { 
        'Content-Type': 'application/json',
        'x-demo-bypass': process.env.SUPABASE_SERVICE_ROLE_KEY
    },
    body: JSON.stringify({
      sessionId: sessionResult.session.session_id,
      sessionStatus: 'signed',
      centerpointId: job.cp_id,
      property: { address: job.property_name },
      findings: { urgentItemsCount: 0, stormRelatedItemsCount: 0, monitorItemsCount: 0 },
      pathData: { selectedPath: 'full_restoration' },
      signatureData: { signerName: 'Demo Owner', signedAt: new Date().toISOString() }
    })
  });
  const signResult = await resSign.json();
  console.log("   Signed Result:", JSON.stringify(signResult, null, 2));

  // 6. Check Outbound Queue
  const { data: queue } = await supabase.from('outbound_queue').select('*').eq('target_id', job.cp_id).single();
  console.log("6. Outbound Queue Record:", { id: queue.id, status: queue.status, action: queue.action });

  // 7. Process Queue
  console.log("7. Processing Queue...");
  const resProcess = await fetch('http://localhost:3000/api/centerpoint/process-queue', { method: 'POST' });
  const processResult = await resProcess.json();
  console.log("   Process Results:", JSON.stringify(processResult.results, null, 2));

  // 8. Verify Final State
  const { data: finalQueue } = await supabase.from('outbound_queue').select('*').eq('id', queue.id).single();
  console.log("8. Final Queue Status:", finalQueue.status);

  const { data: finalLead } = await supabase.from('pipeline_leads').select('pipeline_status').eq('id', leadId).single();
  console.log("   Final Pipeline Status:", finalLead.pipeline_status);
}

demo();
