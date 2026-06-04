import { CP_BASE, cpJsonHeaders } from "./client";

export interface OpportunityInput {
  id?: string;
  name: string;
  billedCompanyId: number;
  description: string;
  targetStage: "Pending" | "Accepted" | "Quote Repairs";
  domain?: string;
  type?: string;
  opportunityType?: string;
}

export async function createOpportunity(input: OpportunityInput, apiKey: string) {
  // 1. Check if opportunity already exists
  let opportunityId = input.id || null;
  let opportunityName = input.name;
  let opportunityStatus = "";

  try {
    if (!opportunityId) {
      const searchUrl = `${CP_BASE}/opportunities?filter[search]=${input.name}`;
      const searchRes = await fetch(searchUrl, {
        headers: {
          Accept: "application/json",
          Authorization: apiKey,
        },
        cache: "no-store",
      });
      if (searchRes.ok) {
        const searchData = await searchRes.json();
        const match = (searchData.data || []).find((r: any) => r.attributes?.name === input.name && r.attributes?.domain === "Sales");
        if (match) {
          opportunityId = match.id;
          opportunityName = match.attributes?.name ?? input.name;
          opportunityStatus = match.attributes?.status ?? "";
          console.log(`[CREATE_OPPORTUNITY] Found existing opportunity for job ${input.name} with ID: ${opportunityId}`);
        }
      }
    }
  } catch (err) {
    console.warn("[CREATE_OPPORTUNITY] Search failed, fallback to creation:", err);
  }

  // 2. If it does not exist, create it
  if (!opportunityId) {
    const url = `${CP_BASE}/opportunities`;
    const body = {
      data: {
        type: "opportunities",
        attributes: {
          name: input.name,
          domain: input.domain || "Sales",
          billedCompanyId: input.billedCompanyId,
          description: input.description,
          ...(input.type ? { type: input.type } : {}),
          ...(input.opportunityType ? { opportunityType: input.opportunityType } : {}),
        },
      },
    };

    const res = await fetch(url, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: apiKey,
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });

    if (!res.ok) {
      const errorText = await res.text();
      let errorDetail = errorText;
      try {
        const parsed = JSON.parse(errorText);
        errorDetail = parsed?.errors?.[0]?.detail ?? parsed?.message ?? errorText;
      } catch {
        // Not JSON
      }
      throw new Error(`Failed to create opportunity: ${res.status} - ${errorDetail}`);
    }

    const result = await res.json();
    opportunityId = result?.data?.id;
    opportunityName = result?.data?.attributes?.name ?? input.name;
    opportunityStatus = result?.data?.attributes?.status ?? "";
  }

  if (!opportunityId) {
    throw new Error("Opportunity ID was not resolved or returned by CenterPoint.");
  }

  // Sequentially transition workflow stage until we reach the target stage
  let currentStageName = "";
  let iterations = 0;
  const targetStages = [input.targetStage];

  while (iterations < 15) {
    iterations++;

    // 1. Fetch available transitions
    const serviceUrl = `${CP_BASE}/services/${opportunityId}?include=availableTransitions,workflowStage`;
    const getRes = await fetch(serviceUrl, {
      headers: {
        Accept: "application/json",
        Authorization: apiKey,
      },
      cache: "no-store",
    });
    if (!getRes.ok) {
      break;
    }

    const data = await getRes.json();
    const transitions = data.included ? data.included.filter((x: any) => x.type === "workflow_transitions") : [];
    const currentStage = data.included ? data.included.find((x: any) => x.type === "workflow_stages") : null;
    currentStageName = currentStage?.attributes?.name ?? "";

    if (currentStageName === input.targetStage || transitions.length === 0) {
      break;
    }

    // Find if the target transition is directly available
    let nextTx = transitions.find((tx: any) => tx.attributes?.name === input.targetStage);
    if (!nextTx) {
      // Otherwise, take the first available transition to move forward sequentially
      nextTx = transitions[0];
    }

    if (!nextTx) {
      break;
    }

    // 2. Post the stage transition
    const txRes = await fetch(`${CP_BASE}/production_stage_transitions`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: apiKey,
      },
      body: JSON.stringify({
        data: {
          type: "production_stage_transitions",
          attributes: { note: `Auto-transitioned to ${nextTx.attributes.name}` },
          relationships: {
            production: { data: { type: "productions", id: opportunityId } },
            transition: { data: { type: "workflow_transitions", id: nextTx.id } },
          },
        },
      }),
      cache: "no-store",
    });

    if (!txRes.ok) {
      break;
    }

    // Short pause to avoid hammering CenterPoint
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  return {
    id: opportunityId,
    name: opportunityName,
    status: currentStageName || input.targetStage,
  };
}
