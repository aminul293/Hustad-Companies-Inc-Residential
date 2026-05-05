import { NextRequest, NextResponse } from "next/server";

const CP_BASE = "https://api.centerpointconnect.io/centerpoint";
const CP_KEY = process.env.CENTERPOINT_API_KEY!;

const HUSTAD_TYPE = "STORM INSPECTION-HAIL";
const PAGE_SIZE = 25;
// Fetch larger pages from CP so we have enough after filtering
const CP_FETCH_SIZE = 100;

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const page = parseInt(searchParams.get("page") || "1", 10);
  const search = searchParams.get("search") || "";
  const status = searchParams.get("status") || "";

  // We need to walk CP pages to fill one client page of filtered results
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
    // API-level filters
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

    // Server-side filter: only STORM INSPECTION-HAIL
    const filtered = records.filter(
      (r) => r.attributes?.customWithLabels?.serviceTypeHustad === HUSTAD_TYPE
    );

    matched = [...matched, ...filtered];
    scanned += records.length;
    cpPage++;

    if (records.length === 0) break;
  }

  const pageItems = matched.slice(clientOffset, clientOffset + PAGE_SIZE);
  // Estimate total matched (we can't know exact without scanning all, so use scanned ratio)
  const matchRatio = scanned > 0 ? matched.length / scanned : 1;
  const estimatedTotal = Math.round(cpTotal * matchRatio);

  return NextResponse.json({
    data: pageItems,
    meta: {
      page: {
        total: estimatedTotal,
        currentPage: page,
        perPage: PAGE_SIZE,
      },
    },
  });
}
