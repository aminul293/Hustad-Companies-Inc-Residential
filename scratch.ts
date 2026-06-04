import 'dotenv/config';

async function main() {
  const CP_BASE = "https://api.centerpointconnect.io/centerpoint";
  const cpKey = process.env.CENTERPOINT_API_KEY;
  if (!cpKey) throw new Error("No API key");

  const cpId = "2101453"; // From user's screenshot
  const res = await fetch(`${CP_BASE}/services/${cpId}?include=availableTransitions,workflowStage`, {
    headers: { Accept: "application/json", Authorization: cpKey }
  });

  const data = await res.json();
  const currentStage = (data.included ?? []).find((x: any) => x.type === "workflow_stages");
  console.log("Current Stage:", currentStage?.attributes?.name);

  const transitions = (data.included ?? []).filter((x: any) => x.type === "workflow_transitions");
  console.log("Transitions:", transitions.map((tx: any) => tx.attributes?.name));
}

main().catch(console.error);
