const fs = require('fs');

async function checkSupabase() {
  const envContent = fs.readFileSync('.env.local', 'utf-8');
  let url = '';
  let key = '';
  envContent.split('\n').forEach(line => {
    if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) url = line.split('=')[1].trim();
    if (line.startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY=')) key = line.split('=')[1].trim();
  });

  if (!url || !key) {
    console.log("Missing Supabase config");
    return;
  }

  const res = await fetch(`${url}/rest/v1/centerpoint_jobs?name=eq.1329675`, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`
    }
  });

  const data = await res.json();
  console.log("Jobs in DB:");
  console.log(JSON.stringify(data, null, 2));
}

checkSupabase();
