import { draftFindingSummary } from "./src/lib/ai-summary";

async function test() {
  const res = await draftFindingSummary({
    findings: ["roof", "siding"],
    photosCount: 5,
    outcome: "restoration"
  });
  console.log(JSON.stringify(res, null, 2));
}

test();
