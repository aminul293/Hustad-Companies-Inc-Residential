const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Missing SUPABASE env vars. Check .env.local");
  process.exit(1);
}

const supabase = createClient(url, key);

async function check() {
  console.log("Checking Supabase centerpoint_jobs and cp_sync_log...");
  
  // 1. Get sync logs
  const { data: logs, error: logsError } = await supabase
    .from("cp_sync_log")
    .select("*")
    .order("started_at", { ascending: false })
    .limit(5);
    
  if (logsError) {
    console.error("Error fetching logs:", logsError);
  } else {
    console.log("\n--- LATEST SYNC LOGS ---");
    console.table(logs);
  }

  // 2. Get jobs count
  const { count, error: countError } = await supabase
    .from("centerpoint_jobs")
    .select("*", { count: "exact", head: true });
    
  if (countError) {
    console.error("Error fetching count:", countError);
  } else {
    console.log(`\nTotal jobs in Supabase centerpoint_jobs: ${count}`);
  }

  // 3. Get job details
  const { data: jobs, error: jobsError } = await supabase
    .from("centerpoint_jobs")
    .select("cp_id, name, status");
    
  if (jobsError) {
    console.error("Error fetching jobs:", jobsError);
  } else {
    console.log("\n--- JOBS IN DATABASE ---");
    console.table(jobs);
  }
}

check().catch(console.error);
