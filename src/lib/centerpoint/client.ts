export const CP_BASE = "https://api.centerpointconnect.io/centerpoint";

// Advance an existing opportunity to "Accepted" via workflow transitions.
// Matches a transition by its own name OR by the name of the stage it leads to
// (both case-insensitively), the same matching strategy createOpportunity() uses,
// since CenterPoint's transition names don't always literally read "Accepted".
// Throws on any failure instead of silently stopping, so callers can log the
// real reason and (via the caller's error handling) know the push did NOT happen.
export async function acceptOpportunity(cpId: string, cpKey: string): Promise<void> {
  const targetStage = "Accepted";
  let iterations = 0;

  while (iterations < 10) {
    iterations++;

    const res = await fetch(
      `${CP_BASE}/services/${cpId}?include=availableTransitions,workflowStage`,
      { headers: { Accept: "application/json", Authorization: cpKey }, cache: "no-store" }
    );
    if (!res.ok) {
      throw new Error(`[acceptOpportunity] CenterPoint fetch failed for service ${cpId}: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    const transitions = (data.included ?? []).filter((x: any) => x.type === "workflow_transitions");
    const stages = (data.included ?? []).filter((x: any) => x.type === "workflow_stages");
    const currentStage = stages[0];
    const stageName: string = currentStage?.attributes?.name ?? "";

    if (stageName.toLowerCase() === targetStage.toLowerCase()) return;

    if (transitions.length === 0) {
      throw new Error(`[acceptOpportunity] No available transitions from stage "${stageName}" for service ${cpId}; cannot reach "${targetStage}".`);
    }

    // 1. Match by the transition's own name
    let nextTx = transitions.find(
      (tx: any) => tx.attributes?.name?.toLowerCase() === targetStage.toLowerCase()
    );

    // 2. Fall back to matching by the destination stage's name
    if (!nextTx) {
      nextTx = transitions.find((tx: any) => {
        const destStageId = tx.relationships?.workflowStage?.data?.id;
        const destStage = stages.find((s: any) => s.id === destStageId);
        return destStage?.attributes?.name?.toLowerCase() === targetStage.toLowerCase();
      });
    }

    if (!nextTx) {
      const available = transitions.map((t: any) => t.attributes?.name).filter(Boolean).join(", ") || "none";
      throw new Error(`[acceptOpportunity] No transition to "${targetStage}" found for service ${cpId} from stage "${stageName}". Available transitions: ${available}`);
    }

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
          attributes: { note: "Auto-accepted: homeowner signed remotely" },
          relationships: {
            production: { data: { type: "productions", id: cpId } },
            transition: { data: { type: "workflow_transitions", id: nextTx.id } },
          },
        },
      }),
    });
    if (!txRes.ok) {
      const errText = await txRes.text().catch(() => "");
      throw new Error(`[acceptOpportunity] Transition POST failed for service ${cpId} (transition "${nextTx.attributes?.name}"): ${txRes.status} ${errText}`);
    }

    await new Promise(r => setTimeout(r, 300));
  }

  throw new Error(`[acceptOpportunity] Exceeded 10 iterations trying to advance service ${cpId} to "${targetStage}".`);
}

// ─── Fetch "Additional Managers" names for a single service record ────────────
// CenterPoint API docs show managers and accountManager are the correct includes.
// We use relationship IDs first to identify which included items are managers,
// then fall back to type-based matching.
export async function fetchServiceManagerNames(cpId: string): Promise<string[]> {
  const token = getCpToken();
  const includeAttempts = [
    "managers,accountManager",
    "managers.helpers,accountManager",
    "managers",
    "accountManager",
    "managers,employees",
    "employees",
  ];

  for (const include of includeAttempts) {
    try {
      const res = await fetch(
        `${CP_BASE}/services/${cpId}?include=${include}`,
        { headers: { Accept: "application/json", Authorization: token }, cache: "no-store" }
      );
      if (!res.ok) continue;
      const data = await res.json();
      const included: any[] = data.included ?? [];
      if (included.length === 0) continue;

      // Primary strategy: use relationship linkage to find manager resource IDs
      const relationships = data.data?.relationships ?? {};
      const managerRelIds = new Set<string>();
      for (const relKey of ["managers", "accountManager", "additionalManagers"]) {
        const rel = relationships[relKey];
        if (!rel) continue;
        const relData = Array.isArray(rel.data) ? rel.data : rel.data ? [rel.data] : [];
        for (const item of relData) {
          if (item?.id) managerRelIds.add(String(item.id));
        }
      }

      if (managerRelIds.size > 0) {
        const names = included
          .filter((item: any) => managerRelIds.has(String(item.id)))
          .map((item: any) =>
            item.attributes?.name ??
            item.attributes?.fullName ??
            item.attributes?.displayName ??
            [item.attributes?.firstName, item.attributes?.lastName].filter(Boolean).join(" ") ??
            ""
          )
          .filter(Boolean);
        if (names.length > 0) {
          console.log(`[CP] fetchServiceManagerNames cpId=${cpId} found via relationships:`, names);
          return names;
        }
      }

      // Fallback: filter included items by type
      const personTypes = ["employees", "employee", "managers", "manager",
        "users", "user", "accountmanagers", "accountmanager", "profiles", "profile"];
      const names = included
        .filter((item: any) => personTypes.includes((item.type ?? "").toLowerCase()))
        .map((item: any) =>
          item.attributes?.name ??
          item.attributes?.fullName ??
          item.attributes?.displayName ??
          [item.attributes?.firstName, item.attributes?.lastName].filter(Boolean).join(" ") ??
          ""
        )
        .filter(Boolean);
      if (names.length > 0) {
        console.log(`[CP] fetchServiceManagerNames cpId=${cpId} found via type filter:`, names);
        return names;
      }

      console.log(`[CP] fetchServiceManagerNames cpId=${cpId} include=${include} no managers — included types: [${[...new Set(included.map((i: any) => i.type))].join(", ")}]`);
    } catch {
      continue;
    }
  }

  console.log(`[CP] fetchServiceManagerNames cpId=${cpId} exhausted all include attempts`);
  return [];
}

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
    accepted: ["Accepted"],
    declined: ["Declined"],
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

