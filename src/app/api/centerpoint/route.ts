import { NextRequest, NextResponse } from "next/server";

const CP_BASE = "https://api.centerpointconnect.io/centerpoint";
const CP_KEY = process.env.CENTERPOINT_API_KEY!;
const HUSTAD_TYPE = "STORM INSPECTION-HAIL";
const PAGE_SIZE = 25;
const CP_FETCH_SIZE = 100;

// Fetch all residential company IDs (small set ~171, refreshed per-request)
async function getResidentialCompanyIds(): Promise<Set<number>> {
  const ids = new Set<number>();
  let page = 1;
  while (true) {
    const params = new URLSearchParams();
    params.set("page[size]", "200");
    params.set("page[number]", String(page));
    params.set("filter[type]", "Residential");

    const res = await fetch(`${CP_BASE}/companies?${params.toString()}`, {
      headers: { Accept: "application/json", Authorization: CP_KEY },
      cache: "no-store",
    });
    if (!res.ok) break;
    const data = await res.json();
    const records: any[] = data?.data ?? [];
    records.forEach((r) => ids.add(Number(r.id)));
    const total = data?.meta?.page?.total ?? 0;
    if (ids.size >= total || records.length === 0) break;
    page++;
  }
  return ids;
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const page = parseInt(searchParams.get("page") || "1", 10);
  const search = searchParams.get("search") || "";
  const status = searchParams.get("status") || "";

  // Fetch residential company IDs in parallel with first page of services
  const residentialIds = await getResidentialCompanyIds();

  const clientOffset = (page - 1) * PAGE_SIZE;
  let matched: any[] = [];
  let cpPage = 1;
  let cpTotal = Infinity;
  let scanned = 0;

  while (matched.length < clientOffset + PAGE_SIZE && scanned < cpTotal) {
    const params = new URLSearchParams();
    params.set("page[size]", String(CP_FETCH_SIZE));
    params.set("page[number]", String(cpPage));
    params.set("sort", "-updatedAt");
    params.set("filter[workType]", "Inspection");
    if (status) params.set("filter[status]", status);
    if (search) params.set("filter[search]", search);

    const res = await fetch(`${CP_BASE}/services?${params.toString()}`, {
      headers: { Accept: "application/json", Authorization: CP_KEY },
      cache: "no-store",
    });

    if (!res.ok) {
      return NextResponse.json({ error: "CenterPoint API error" }, { status: res.status });
    }

    const data = await res.json();
    cpTotal = data?.meta?.page?.total ?? 0;
    const records: any[] = data?.data ?? [];

    const filtered = records.filter((r) => {
      const a = r.attributes;
      const isHailInspection = a?.customWithLabels?.serviceTypeHustad === HUSTAD_TYPE;
      const isResidential = residentialIds.has(Number(a?.billedCompanyId));
      return isHailInspection && isResidential;
    });

    matched = [...matched, ...filtered];
    scanned += records.length;
    cpPage++;
    if (records.length === 0) break;
  }

  const pageItems = matched.slice(clientOffset, clientOffset + PAGE_SIZE);
  const matchRatio = scanned > 0 ? matched.length / scanned : 1;
  const estimatedTotal = Math.round(cpTotal * matchRatio);

  return NextResponse.json({
    data: pageItems,
    meta: { page: { total: estimatedTotal, currentPage: page, perPage: PAGE_SIZE } },
  });
}
