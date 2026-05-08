require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

async function runMigrations() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  
  const migrationsDir = path.join(__dirname, 'supabase', 'migrations');
  const files = fs.readdirSync(migrationsDir).sort();

  for (const file of files) {
    if (!file.endsWith('.sql')) continue;
    console.log(`Running migration: ${file}`);
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    
    // We can't run arbitrary SQL via the JS client easily unless we have an RPC
    // But we can try to run it via the REST API if we have the postgres role
    // Alternatively, I'll tell the user to run them in the Supabase Dashboard SQL Editor.
    console.log("Please run this SQL in your Supabase SQL Editor:");
    console.log(sql);
    console.log("\n--- END OF SQL ---\n");
  }
}

runMigrations();
