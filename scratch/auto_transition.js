require("dotenv").config({ path: ".env.local" });

const CP_BASE = "https://api.centerpointconnect.io/centerpoint";
const key = process.env.CENTERPOINT_API_KEY;

if (!key) {
  console.error("CENTERPOINT_API_KEY is not set");
  process.exit(1);
}

async function getAvailableTransitions(id) {
  const url = `${CP_BASE}/services/${id}?include=availableTransitions,workflowStage`;
  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
      Authorization: key
    }
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch service: ${res.status} ${await res.text()}`);
  }
  const data = await res.json();
  const transitions = data.included ? data.included.filter(x => x.type === "workflow_transitions") : [];
  const currentStage = data.included ? data.included.find(x => x.type === "workflow_stages") : null;
  return {
    transitions,
    stageName: currentStage ? currentStage.attributes.name : "Unknown",
    status: data.data.attributes.status
  };
}

async function postTransition(productionId, transitionId, transitionName) {
  const url = `${CP_BASE}/production_stage_transitions`;
  const body = {
    data: {
      type: "production_stage_transitions",
      attributes: {
        note: `Transitioned automatically to ${transitionName}`
      },
      relationships: {
        production: {
          data: { type: "productions", id: productionId }
        },
        transition: {
          data: { type: "workflow_transitions", id: transitionId }
        }
      }
    }
  };
  
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: key
    },
    body: JSON.stringify(body)
  });
  
  if (!res.ok) {
    throw new Error(`Failed to POST transition: ${res.status} ${await res.text()}`);
  }
  const data = await res.json();
  console.log(`Successfully transitioned: ${transitionName}`);
}

async function run() {
  const productionId = "2096505";
  
  console.log(`Starting auto-transition for production ${productionId}...`);
  
  let loop = true;
  let iterations = 0;
  
  while (loop && iterations < 15) {
    iterations++;
    const { transitions, stageName, status } = await getAvailableTransitions(productionId);
    console.log(`Current Stage: "${stageName}" | Status: "${status}"`);
    
    if (stageName === "Closed" || status === "closed" && transitions.length === 0) {
      console.log("Reached final stage Closed or no more transitions available.");
      break;
    }
    
    if (transitions.length === 0) {
      console.log("No transitions available. Stopping.");
      break;
    }
    
    // We pick the first available transition
    const nextTx = transitions[0];
    console.log(`Next transition: "${nextTx.attributes.name}" (ID: ${nextTx.id})`);
    
    await postTransition(productionId, nextTx.id, nextTx.attributes.name);
    
    // Bounded sleep to give CenterPoint engine a moment to update
    await new Promise(r => setTimeout(r, 1000));
  }
  
  console.log("Auto-transition complete!");
}

run().catch(console.error);
