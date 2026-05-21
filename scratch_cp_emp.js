require('dotenv').config({ path: '.env.local' });
const { CP_BASE, cpReadHeaders } = require('./src/lib/centerpoint/client');
async function run() {
  const url = `${CP_BASE}/employees?filter[email]=aminul@hustadcompanies.com`;
  const res = await fetch(url, { headers: cpReadHeaders() });
  const json = await res.json();
  console.log(JSON.stringify(json, null, 2));
}
run();
