require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

async function test() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const url = 'http://localhost:3004/api/sessions';
  console.log("Testing POST", url);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-demo-bypass": process.env.DEMO_BYPASS_SECRET
      },
      body: JSON.stringify({
        sessionId: `test-rogue-${Date.now()}`,
        property: { homeownerPrimaryName: "Test Rogue", address: "123 Fake St" }
      })
    });
    
    const text = await res.text();
    console.log(`Status: ${res.status}`);
    console.log(`Response: ${text}`);

    console.log("Checking audit_events...");
    const { data: audits, error } = await supabase.from('audit_events')
      .select('*')
      .eq('event_name', 'rogue_session_blocked')
      .order('occurred_at', { ascending: false })
      .limit(1);
    
    console.log("Latest rogue audit event:", audits);
    if(error) console.error("Error fetching audit events:", error);
  } catch (err) {
    console.error("Test failed:", err);
  }
}

test();
