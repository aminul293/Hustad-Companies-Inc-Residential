import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const CP_BASE = "https://api.centerpointconnect.io/centerpoint";

function cpHeaders() {
  const key = process.env.CENTERPOINT_API_KEY;
  if (!key) throw new Error("CENTERPOINT_API_KEY not set");
  return { Accept: "application/json", Authorization: key };
}

// GET /api/centerpoint/debug?endpoint=contacts&page=1&size=3
// Returns raw attributes from any CenterPoint endpoint so we can see actual field names
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const endpoint = searchParams.get("endpoint") || "contacts";
  const page = searchParams.get("page") || "1";
  const size = searchParams.get("size") || "3";
  const companyId = searchParams.get("companyId");

  const params = new URLSearchParams({
    "page[size]": size,
    "page[number]": page,
  });
  if (companyId) params.set("filter[companyId]", companyId);

  const url = `${CP_BASE}/${endpoint}?${params}`;

  try {
    const res = await fetch(url, { headers: cpHeaders(), cache: "no-store" });
    const data = await res.json();

    // Return first record's full attributes + all top-level keys
    const records = data?.data ?? [];
    const sample = records.slice(0, 3).map((r: any) => ({
      id: r.id,
      type: r.type,
      attribute_keys: Object.keys(r.attributes ?? {}),
      attributes: r.attributes,
    }));

    return NextResponse.json({
      url,
      status: res.status,
      total: data?.meta?.page?.total ?? 0,
      returned: records.length,
      sample,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
