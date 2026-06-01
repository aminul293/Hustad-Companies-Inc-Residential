export const CP_BASE = "https://api.centerpointconnect.io/centerpoint";

export function getCpToken(): string {
  const key = process.env.CENTERPOINT_API_KEY;
  if (!key) throw new Error("CENTERPOINT_API_KEY is not set");
  return key;
}

export function cpReadHeaders() {
  return {
    Accept: "application/json",
    Authorization: getCpToken(),
  };
}

export function cpJsonHeaders() {
  return {
    Accept: "application/json",
    "Content-Type": "application/json",
    Authorization: getCpToken(),
  };
}

export async function advanceWorkflowToTarget(
  cpId: string,
  targetStatus: string,
  cpKey: string
) {
  // Mapping of target status to the stage names we want to reach
  const TARGET_STAGE_MAPPING: Record<string, string[]> = {
    scheduled: ["Scheduled"],
    started: ["In Progress"],
    completed: ["Completed"],
    closed: ["Closed"],
  };

  const targetStages = TARGET_STAGE_MAPPING[targetStatus];
  if (!targetStages) return;

  let iterations = 0;
  while (iterations < 15) {
    iterations++;
    // 1. Fetch available transitions
    const url = `${CP_BASE}/services/${cpId}?include=availableTransitions,workflowStage`;
    const res = await fetch(url, {
      headers: { Accept: "application/json", Authorization: cpKey },
    });
    if (!res.ok) break;

    const data = await res.json();
    const transitions = data.included ? data.included.filter((x: any) => x.type === "workflow_transitions") : [];
    const currentStage = data.included ? data.included.find((x: any) => x.type === "workflow_stages") : null;
    const stageName = currentStage?.attributes?.name;
    const currentStatus = data.data?.attributes?.status;

    // Check if we reached the target stage or status
    if (stageName === "Closed" || transitions.length === 0) {
      break;
    }
    
    // If the current stage matches one of our target stages, we can stop
    if (targetStages.includes(stageName)) {
      break;
    }

    const nextTx = transitions[0];
    if (!nextTx) break;

    // 2. Post the stage transition
    const txRes = await fetch(`${CP_BASE}/production_stage_transitions`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: cpKey,
      },
      body: JSON.stringify({
        data: {
          type: "production_stage_transitions",
          attributes: { note: `Auto-transitioned to ${nextTx.attributes.name}` },
          relationships: {
            production: { data: { type: "productions", id: cpId } },
            transition: { data: { type: "workflow_transitions", id: nextTx.id } },
          },
        },
      }),
    });

    if (!txRes.ok) break;
    // Bounded pause to avoid hammering CenterPoint
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
}

