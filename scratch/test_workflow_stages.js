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
      console.log(`GET ${path} count:`, data.data ? data.data.length : "no data");
      if (data.data && data.data.length > 0) {
        console.log(`All stages:`);
        data.data.forEach(item => {
          console.log(`ID: ${item.id} | Name: ${item.attributes.name} | Type: ${item.attributes.type}`);
        });
      }
    } else {
      console.log(`GET ${path} failed:`, await res.text());
    }
  } catch (err) {
    console.error(`Error:`, err.message);
  }
}

async function run() {
  await testEndpoint("production_workflow_stages");
  await testEndpoint("production-workflow-stages");
  await testEndpoint("workflow_stages");
}

run().catch(console.error);
