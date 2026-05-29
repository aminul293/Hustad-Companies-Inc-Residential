require("dotenv").config({ path: ".env.local" });

const CP_BASE = "https://api.centerpointconnect.io/centerpoint";
const key = process.env.CENTERPOINT_API_KEY;

if (!key) {
  console.error("CENTERPOINT_API_KEY is not set");
  process.exit(1);
}

async function testEndpoint(path) {
  const url = `${CP_BASE}/${path}`;
  console.log(`Testing GET ${url}...`);
  try {
    const res = await fetch(url, {
      headers: {
        Accept: "application/json",
        Authorization: key
      }
    });
    console.log(`GET ${path} response: ${res.status}`);
    if (res.ok) {
      const data = await res.json();
      console.log(`GET ${path} sample data keys:`, data.data ? Object.keys(data.data[0] || {}) : "no data");
      if (data.data && data.data.length > 0) {
        console.log(`Sample object attributes:`, JSON.stringify(data.data[0].attributes, null, 2));
      }
    } else {
      console.log(`GET ${path} failed:`, await res.text());
    }
  } catch (err) {
    console.error(`Error:`, err.message);
  }
}

async function run() {
  // Let's test different possible paths for stage transitions
  await testEndpoint("productionStageTransitions");
  await testEndpoint("production-stage-transitions");
}

run().catch(console.error);
