import { NextResponse, NextRequest } from "next/server";
import { CP_BASE, getCpToken } from "@/lib/centerpoint/client";

export const dynamic = "force-dynamic";

const HUSTAD_TYPE = "STORM INSPECTION-HAIL";

function cpHeaders() {
  return { Accept: "application/json", Authorization: getCpToken() };
}

// GET /api/centerpoint/diagnose?cpId=2132327
// Fetches one service from CenterPoint and reports which sync filters pass/fail.
export async function GET(req: NextRequest) {
  const cpId = req.nextUrl.searchParams.get("cpId");
  if (!cpId) return NextResponse.json({ error: "cpId param required" }, { status: 400 });

  try { getCpToken(); } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }

  // Fetch the raw service record from CenterPoint
  const res = await fetch(`${CP_BASE}/services/${cpId}`, {
    headers: cpHeaders(),
    cache: "no-store",
  });

  if (!res.ok) {
    return NextResponse.json({ error: `CenterPoint returned ${res.status}` }, { status: res.status });
  }

  const data = await res.json();
  const r = data?.data;
  if (!r) return NextResponse.json({ error: "No data returned" }, { status: 404 });

  const a = r.attributes ?? {};

  // Run each sync filter (mirrors logic in /api/centerpoint/sync/route.ts)
  const rawStatus = (a.status || "").toLowerCase().replace(/\s+/g, "_");
  const filters = {
    isHailInspection: { pass: a?.customWithLabels?.serviceTypeHustad === HUSTAD_TYPE, value: a?.customWithLabels?.serviceTypeHustad },
    isInspectionType: { pass: a?.workType === "Inspection",                            value: a?.workType },
    isServiceDomain:  { pass: (a?.domain || "").toLowerCase() === "service",           value: a?.domain },
    isActiveStatus:   { pass: ["new_service","new","opened","open","accepted","scheduled","en_route","started","in_progress"].includes(rawStatus), value: a?.status },
  };

  const allPass = Object.values(filters).every(f => f.pass);
  const failing = Object.entries(filters).filter(([, v]) => !v.pass).map(([k]) => k);

  return NextResponse.json({
    cpId,
    allPass,
    failing,
    filters,
    allAttributeKeys: Object.keys(a),
    rawAttributes: a,
  });
}
