require("dotenv").config({ path: ".env.local" });

const CP_BASE = "https://api.centerpointconnect.io/centerpoint";
const key = process.env.CENTERPOINT_API_KEY;

if (!key) {
  console.error("CENTERPOINT_API_KEY is not set");
  process.exit(1);
}

async function testPayload(bodyDescription, body) {
  console.log(`\nTesting payload: ${bodyDescription}`);
  const res = await fetch(`${CP_BASE}/production_stage_transitions`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: key
    },
    body: JSON.stringify(body)
  });
  console.log(`Response status: ${res.status}`);
  console.log(await res.text());
}

async function run() {
  // Variant 1: transition as an attribute
  await testPayload("transition inside attributes as string", {
    data: {
      type: "production_stage_transitions",
      attributes: {
        note: "Transition to Closed via API",
        transition: "Closed"
      },
      relationships: {
        production: {
          data: { type: "productions", id: "2096505" }
        }
      }
    }
  });

  // Variant 2: transition as a relationship
  await testPayload("transition inside relationships pointing to workflow_stages", {
    data: {
      type: "production_stage_transitions",
      attributes: {
        note: "Transition to Closed via API"
      },
      relationships: {
        production: {
          data: { type: "productions", id: "2096505" }
        },
        transition: {
          data: { type: "workflow_stages", id: "22698" }
        }
      }
    }
  });

  // Variant 3: transition as a root-level field of data
  await testPayload("transition at root-level of data", {
    data: {
      type: "production_stage_transitions",
      transition: "22698",
      attributes: {
        note: "Transition to Closed via API"
      },
      relationships: {
        production: {
          data: { type: "productions", id: "2096505" }
        }
      }
    }
  });
}

run().catch(console.error);
