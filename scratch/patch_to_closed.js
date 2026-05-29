require("dotenv").config({ path: ".env.local" });
const { createClient } = require("@supabase/supabase-js");

const CP_BASE = "https://api.centerpointconnect.io/centerpoint";
const key = process.env.CENTERPOINT_API_KEY;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!key || !supabaseUrl || !supabaseKey) {
  console.error("Missing credentials in env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const id = "2096505"; // Job 1329952
  const url = `${CP_BASE}/services/${id}`;
  const nowStr = new Date().toISOString();
  
  const attrs = {
    status: "closed",
    startedAt: nowStr,
    completedAt: nowStr,
    invoicedAt: nowStr,
    closedAt: nowStr
  };
  
  console.log(`Sending PATCH to CenterPoint for target ID ${id}...`);
  const res = await fetch(url, {
    method: "PATCH",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: key,
    },
    body: JSON.stringify({
      data: { type: "services", id, attributes: attrs },
    }),
  });
  
  console.log(`Response status: ${res.status}`);
  if (res.ok) {
    const data = await res.json();
    console.log("PATCH successful. Updated attributes:", JSON.stringify(data.data.attributes, null, 2));
    
    // Update local cache
    console.log("Updating local centerpoint_jobs cache...");
    await supabase
      .from("centerpoint_jobs")
      .update({
        status: "closed",
        display_status: "Closed Out",
        synced_at: new Date().toISOString()
      })
      .eq("cp_id", id);
      
    // Mark all pending queue items for this job as synced
    console.log("Marking pending queue items for this job as synced...");
    await supabase
      .from("outbound_queue")
      .update({
        status: "synced",
        synced_at: new Date().toISOString()
      })
      .eq("target_id", id)
      .eq("status", "pending");
      
    console.log("All done!");
  } else {
    console.error("Failed to patch:", await res.text());
  }
}

run().catch(console.error);
