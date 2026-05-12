const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function test() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const db = createClient(url, key);

  console.log("Testing Pipeline Query...");
  const { data, error } = await db
    .from('pipeline_leads')
    .select(`
      *,
      centerpoint_jobs (*),
      appointments!pipeline_leads_id_fkey ( id, assigned_rep_id )
    `)
    .order('created_at', { ascending: false })
    .limit(1);

  if (error) {
    console.error("Pipeline Query Error:", error);
  } else {
    console.log("Pipeline Query Success:", data.length, "rows");
  }

  console.log("\nTesting Sessions Query...");
  const { data: sessions, error: sError } = await db
    .from("inspection_sessions")
    .select("*")
    .limit(1);

  if (sError) {
    console.error("Sessions Query Error:", sError);
  } else {
    console.log("Sessions Query Success:", sessions.length, "rows");
  }
}

test();
