require('dotenv').config({ path: '.env.local' });
import { getServiceClient } from "./src/lib/supabase-server";

async function verify() {
  try {
    const supabase = getServiceClient();
    console.log("Supabase client initialized");
    
    // 1. Check CenterPoint Jobs
    const { data: jobs } = await supabase.from('centerpoint_jobs').select('*').limit(1);
    console.log("Step 1: CPC Ticket:", JSON.stringify(jobs, null, 2));

    // 2. Check Pipeline Leads
    const { data: leads } = await supabase.from('pipeline_leads').select('*, centerpoint_jobs(*)').limit(1);
    console.log("Step 2: Pipeline Lead:", JSON.stringify(leads, null, 2));

    // 3. Check Inspection Sessions
    const { data: sessions } = await supabase.from('inspection_sessions').select('*').limit(1);
    console.log("Step 4: Inspection Session:", JSON.stringify(sessions, null, 2));

    // 5. Check Reps
    const { data: reps } = await supabase.from('reps').select('*').limit(1);
    console.log("Step 0: Rep:", JSON.stringify(reps, null, 2));

  } catch (e: any) {
    console.error("Verification failed:", e.message);
  }
}

verify();
