require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

async function test() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { data, error } = await supabase.from('audit_events')
      .insert({
        session_id: null,
        event_name: "test_null_session",
        actor_id: "test",
        metadata: { rogue_session_id: "abc" },
        occurred_at: new Date().toISOString()
      });
    
  console.log("Error:", error);
}

test();
