const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function test() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const db = createClient(url, key);

  console.log("Checking inspection_sessions columns...");
  const { data, error } = await db
    .from('inspection_sessions')
    .select('*')
    .limit(1);

  if (error) {
    console.error("inspection_sessions Error:", error);
  } else {
    console.log("Columns:", Object.keys(data[0] || {}));
  }
}

test();
