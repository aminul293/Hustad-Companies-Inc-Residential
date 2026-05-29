require("dotenv").config({ path: ".env.local" });

const CP_BASE = "https://api.centerpointconnect.io/centerpoint";
const key = process.env.CENTERPOINT_API_KEY;

if (!key) {
  console.error("CENTERPOINT_API_KEY is not set");
  process.exit(1);
}

async function run() {
  const url = `${CP_BASE}/production_stage_transitions`;
  const body = {
    data: {
      type: "production_stage_transitions",
      attributes: {
        note: "Transition to Closed via API"
      },
      relationships: {
        production: {
          data: {
            type: "productions",
            id: "2096505"
          }
        },
        productionWorkflowStage: {
          data: {
            type: "workflow_stages",
            id: "22698"
          }
        }
      }
    }
  };

  console.log(`Sending POST to ${url}...`);
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: key
    },
    body: JSON.stringify(body)
  });

  console.log(`Response status: ${res.status}`);
  if (res.ok) {
    const data = await res.json();
    console.log("Success:", JSON.stringify(data, null, 2));
  } else {
    console.error("Failed:", await res.text());
  }
}

run().catch(console.error);
