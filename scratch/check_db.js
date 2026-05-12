const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTicket() {
  const { data: pipeline, error: e1 } = await supabase
    .from('pipeline_leads')
    .select('*, centerpoint_jobs(*)')
    .eq('cpc_ticket_id', '1329675');
  
  const { data: appointments, error: e2 } = await supabase
    .from('appointments')
    .select('*, pipeline_leads(cpc_ticket_id)')
    .eq('pipeline_lead_id', pipeline?.[0]?.id);

  const { data: tickets, error: e3 } = await supabase
    .from('hustad_tickets')
    .select('*')
    .eq('cp_job_name', '1329675');

  const { data: sessions, error: e4 } = await supabase
    .from('sessions')
    .select('*')
    .eq('centerpoint_id', '1329675');

  console.log(JSON.stringify({
    pipeline: pipeline?.[0] || 'not found',
    appointments: appointments || 'none',
    tickets: tickets?.[0] || 'not found',
    sessions: sessions || 'none',
    errors: [e1, e2, e3, e4].filter(Boolean)
  }, null, 2));
}

checkTicket();
