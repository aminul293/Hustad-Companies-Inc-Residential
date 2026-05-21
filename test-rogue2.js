require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

async function test() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { data, error } = await supabase.from('audit_events')
      .select('*')
      .eq('action', 'rogue_session_blocked')
      .order('occurred_at', { ascending: false })
      .limit(1);
    
  console.log("Latest rogue audit event data:", data);
  console.log("Error:", error);
}

test();
