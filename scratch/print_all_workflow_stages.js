require("dotenv").config({ path: ".env.local" });

const CP_BASE = "https://api.centerpointconnect.io/centerpoint";
const key = process.env.CENTERPOINT_API_KEY;

if (!key) {
  console.error("CENTERPOINT_API_KEY is not set");
  process.exit(1);
}

async function run() {
  const params = new URLSearchParams();
  params.set("page[size]", "100");
  const url = `${CP_BASE}/workflow_stages?${params.toString()}`;
  console.log(`Fetching from: ${url}`);
  
  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
      Authorization: key
    }
  });
  
  if (res.ok) {
    const data = await res.json();
    console.log(`Total stages: ${data.data.length}`);
    data.data.forEach(item => {
      console.log(`ID: ${item.id.padEnd(5)} | Name: ${item.attributes.name.padEnd(25)} | Order: ${String(item.attributes.order).padEnd(5)}`);
    });
  } else {
    console.error("Failed:", await res.text());
  }
}

run().catch(console.error);
