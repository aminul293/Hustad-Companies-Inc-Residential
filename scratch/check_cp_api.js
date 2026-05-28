require("dotenv").config({ path: ".env.local" });

const CP_BASE = "https://api.centerpointconnect.io/centerpoint";
const key = process.env.CENTERPOINT_API_KEY;

if (!key) {
  console.error("CENTERPOINT_API_KEY is not set");
  process.exit(1);
}

async function checkCP() {
  // We want to fetch the services for the ones currently in the DB
  const idsToCheck = ['2086665', '2084651', '2035459', '2044832'];
  
  for (const id of idsToCheck) {
    const url = `${CP_BASE}/services/${id}`;
    console.log(`Fetching from CenterPoint: ${url}`);
    
    const res = await fetch(url, {
      headers: {
        Accept: "application/json",
        Authorization: key
      }
    });
    
    console.log(`Status: ${res.status}`);
    if (res.ok) {
      const data = await res.json();
      console.log(`ID: ${data.data.id}`);
      console.log(`Name/Job Number: ${data.data.attributes?.name}`);
      console.log(`Status: ${data.data.attributes?.status}`);
    } else {
      const text = await res.text();
      console.log(`Error Response:`, text);
    }
    console.log("-----------------------------------------");
  }
}

checkCP().catch(console.error);
