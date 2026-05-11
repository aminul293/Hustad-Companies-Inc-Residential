require('dotenv').config({ path: '.env.local' });
const { createClient } = require("@supabase/supabase-js");
// Using native fetch available in Node 25+

const API_BASE = 'http://localhost:3000';
const BYPASS_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function runTest() {
  const supabase = getServiceClient();
  
  // 0. Find or create a test lead
  console.log("--- Setup: Finding/Creating Test Lead ---");
  let lead;
  const { data: existingLeads } = await supabase
    .from('pipeline_leads')
    .select('*, centerpoint_jobs(property_name)')
    .eq('pipeline_status', 'new_lead')
    .limit(1);

  if (existingLeads && existingLeads.length > 0) {
    lead = existingLeads[0];
    console.log(`Using existing lead: ${lead.id} (${lead.centerpoint_jobs?.property_name})`);
  } else {
    // Create a dummy lead for testing
    console.log("No 'new_lead' found, creating a dummy one...");
    // This would require a centerpoint_job too, let's just pick any lead if new_lead is missing
    const { data: anyLeads } = await supabase.from('pipeline_leads').select('*, centerpoint_jobs(property_name)').limit(1);
    if (!anyLeads || anyLeads.length === 0) {
        console.error("No leads found in database to test with.");
        return;
    }
    lead = anyLeads[0];
    console.log(`Using lead: ${lead.id} (${lead.centerpoint_jobs?.property_name})`);
  }

  const repId = "00000000-0000-0000-0000-000000000000"; // Mock rep ID

  // 1. Schedule a pipeline lead
  console.log("\n--- Step 1: Schedule a pipeline lead ---");
  const startTime = new Date(Date.now() + 3600000).toISOString();
  const endTime = new Date(Date.now() + 7200000).toISOString();
  
  const resSchedule = await fetch(`${API_BASE}/api/appointments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-demo-bypass': BYPASS_KEY },
    body: JSON.stringify({
      pipeline_lead_id: lead.id,
      rep_id: repId,
      appointment_start_at: startTime,
      appointment_end_at: endTime,
      location: lead.centerpoint_jobs?.property_name,
      notes: "Test appointment"
    })
  });

  if (!resSchedule.ok) {
    const err = await resSchedule.json();
    console.error("Schedule failed:", err);
    if (err.clash) {
        console.log("Conflict detected, deleting conflicting appointment for test...");
        await supabase.from('appointments').delete().eq('id', err.conflictId);
        return runTest(); // Retry
    }
    return;
  }
  const scheduleData = await resSchedule.json();
  const apptId = scheduleData.appointment.id;
  console.log(`Appointment created: ${apptId}`);

  // Confirm DB rows for Step 1
  const { data: appt1 } = await supabase.from('appointments').select('*').eq('id', apptId).single();
  const { data: lead1 } = await supabase.from('pipeline_leads').select('pipeline_status').eq('id', lead.id).single();
  
  console.log("Appointments Row:", JSON.stringify(appt1, null, 2));
  console.log("Pipeline Lead Status:", lead1.pipeline_status);

  // 2. Confirm appointment
  console.log("\n--- Step 2: Confirm appointment ---");
  const resConfirm = await fetch(`${API_BASE}/api/appointments/${apptId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'x-demo-bypass': BYPASS_KEY },
    body: JSON.stringify({ appointment_status: 'confirmed' })
  });
  
  if (!resConfirm.ok) {
    console.error("Confirm failed:", await resConfirm.text());
    return;
  }

  // Confirm DB rows for Step 2
  const { data: appt2 } = await supabase.from('appointments').select('appointment_status').eq('id', apptId).single();
  const { data: lead2 } = await supabase.from('pipeline_leads').select('pipeline_status').eq('id', lead.id).single();
  
  console.log("Appointment Status:", appt2.appointment_status);
  console.log("Pipeline Lead Status:", lead2.pipeline_status);

  // 3. Try Start Inspection
  console.log("\n--- Step 3: Start Inspection ---");
  // The UI calls PATCH with status 'completed'
  const resStart = await fetch(`${API_BASE}/api/appointments/${apptId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'x-demo-bypass': BYPASS_KEY },
    body: JSON.stringify({ appointment_status: 'completed' })
  });

  if (!resStart.ok) {
    console.error("Start Inspection failed:", await resStart.text());
    return;
  }

  // Confirm DB rows for Step 3
  const { data: appt3 } = await supabase.from('appointments').select('appointment_status').eq('id', apptId).single();
  const { data: lead3 } = await supabase.from('pipeline_leads').select('pipeline_status').eq('id', lead.id).single();
  
  console.log("Appointment Status:", appt3.appointment_status);
  console.log("Pipeline Lead Status:", lead3.pipeline_status);

  // 4. Mark another appointment as No Show or Cancelled
  console.log("\n--- Step 4: Mark another appointment as No Show ---");
  // We need another appointment. Let's create one for the same lead (or a different one).
  // First, reset lead status so we can schedule it again? Or just use a different lead if available.
  
  const { data: anotherLeads } = await supabase
    .from('pipeline_leads')
    .select('*, centerpoint_jobs(property_name)')
    .neq('id', lead.id)
    .limit(1);
    
  let lead4 = anotherLeads && anotherLeads.length > 0 ? anotherLeads[0] : lead;
  
  console.log(`Using lead for Step 4: ${lead4.id}`);

  // Create another appointment
  const resAppt4 = await fetch(`${API_BASE}/api/appointments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-demo-bypass': BYPASS_KEY },
    body: JSON.stringify({
      pipeline_lead_id: lead4.id,
      rep_id: repId,
      appointment_start_at: new Date(Date.now() + 86400000).toISOString(),
      appointment_end_at: new Date(Date.now() + 86400000 + 3600000).toISOString(),
      location: lead4.centerpoint_jobs?.property_name,
      notes: "Follow up test"
    })
  });
  
  if (!resAppt4.ok) {
     const err = await resAppt4.json();
     console.error("Create appointment 4 failed:", err);
     return;
  }
  const appt4Data = await resAppt4.json();
  const appt4Id = appt4Data.appointment.id;

  const followUpDate = new Date(Date.now() + 2 * 86400000).toISOString();
  console.log(`Marking appointment ${appt4Id} as No Show with follow-up: ${followUpDate}`);
  
  const resNoShow = await fetch(`${API_BASE}/api/appointments/${appt4Id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'x-demo-bypass': BYPASS_KEY },
    body: JSON.stringify({ 
        appointment_status: 'no_show',
        next_follow_up_at: followUpDate
    })
  });

  if (!resNoShow.ok) {
    console.error("No Show failed:", await resNoShow.text());
    return;
  }

  // Confirm DB rows for Step 4
  const { data: appt4Result } = await supabase.from('appointments').select('*').eq('id', appt4Id).single();
  const { data: lead4Result } = await supabase.from('pipeline_leads').select('pipeline_status, next_follow_up_at').eq('id', lead4.id).single();
  
  console.log("Appointment Status:", appt4Result.appointment_status);
  console.log("Pipeline Lead Status:", lead4Result.pipeline_status);
  console.log("Next Follow Up At:", lead4Result.next_follow_up_at);

  console.log("\n--- TEST COMPLETE ---");
}

runTest();
