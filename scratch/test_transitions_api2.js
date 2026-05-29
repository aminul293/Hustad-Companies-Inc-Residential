require("dotenv").config({ path: ".env.local" });

const CP_BASE = "https://api.centerpointconnect.io/centerpoint";
const key = process.env.CENTERPOINT_API_KEY;

if (!key) {
  console.error("CENTERPOINT_API_KEY is not set");
  process.exit(1);
}

async function run() {
  const url = `${CP_BASE}/production_stage_transitions?filter[productionId]=2096505`;
  console.log(`Fetching transitions for 2096505: ${url}`);
  
  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
      Authorization: key
    }
  });
  
  console.log(`Status: ${res.status}`);
  if (res.ok) {
    const data = await res.json();
    console.log(JSON.stringify(data, null, 2));
  } else {
    console.log("Failed:", await res.text());
  }
}

run().catch(console.error);
