const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Missing SUPABASE env vars. Check .env.local");
  process.exit(1);
}

const supabase = createClient(url, key);

async function testDelete() {
  const staleIds = ['2084651', '2035459'];
  console.log(`Attempting to delete ${staleIds.length} records with unlinking:`, staleIds);
  
  // 1. Get internal UUIDs
  const { data: staleJobs } = await supabase
    .from("centerpoint_jobs")
    .select("id")
    .in("cp_id", staleIds);
    
  const staleUuids = (staleJobs ?? []).map(j => j.id).filter(Boolean);
  console.log("Stale UUIDs:", staleUuids);

  // 2. Unlink
  if (staleUuids.length > 0) {
    const { error: unlinkError } = await supabase
      .from("pipeline_leads")
      .update({ centerpoint_job_id: null })
      .in("centerpoint_job_id", staleUuids);
      
    if (unlinkError) {
      console.error("Unlink failed:", unlinkError);
      return;
    }
    console.log("Unlinked successfully!");
  }

  // 3. Delete
  const { data, error } = await supabase
    .from("centerpoint_jobs")
    .delete()
    .in("cp_id", staleIds)
    .select();
    
  if (error) {
    console.error("Delete failed with error:", error);
  } else {
    console.log("Delete succeeded! Returned:", data);
  }
}

testDelete().catch(console.error);
