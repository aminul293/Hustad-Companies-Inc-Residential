const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function test() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const db = createClient(url, key);

  console.log("Checking Appointments Foreign Keys...");
  // Use a raw RPC if available, or just try to query with different hints
  
  const hints = ['pipeline_lead_id', 'pipeline_leads_id_fkey', 'pipeline_leads_id', 'appointments_pipeline_lead_id_fkey'];
  
  for (const hint of hints) {
    console.log(`Trying hint: ${hint}...`);
    const { data, error } = await db
      .from('pipeline_leads')
      .select(`id, appointments!${hint}(id)`)
      .limit(1);
    
    if (error) {
      console.log(`  Failed: ${error.message}`);
    } else {
      console.log(`  SUCCESS! Use: appointments!${hint}`);
      return;
    }
  }

  console.log("None of the common hints worked. Trying without hint...");
  const { data, error } = await db
    .from('pipeline_leads')
    .select(`id, appointments(id)`)
    .limit(1);
  
  if (error) {
     console.log(`  Failed: ${error.message}`);
  } else {
     console.log(`  SUCCESS! No hint needed.`);
  }
}

test();
