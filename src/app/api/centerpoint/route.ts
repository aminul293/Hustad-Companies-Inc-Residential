import { NextRequest, NextResponse } from "next/server";

const CP_BASE = "https://api.centerpointconnect.io/centerpoint";
const CP_KEY = process.env.CENTERPOINT_API_KEY!;

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const page = searchParams.get("page") || "1";
  const search = searchParams.get("search") || "";
  const domain = searchParams.get("domain") || "";
  const status = searchParams.get("status") || "";

  const params = new URLSearchParams();
  params.set("page[size]", "25");
  params.set("page[number]", page);
  params.set("sort", "-updatedAt");

  if (domain) params.set("filter[domain]", domain);
  if (status) params.set("filter[status]", status);
  if (search) params.set("filter[search]", search);

  try {
    const res = await fetch(`${CP_BASE}/services?${params.toString()}`, {
      headers: {
        Accept: "application/json",
        Authorization: CP_KEY,
      },
      cache: "no-store",
    });

    if (!res.ok) {
      return NextResponse.json({ error: "CenterPoint API error", status: res.status }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: "Failed to reach CenterPoint" }, { status: 500 });
  }
}
