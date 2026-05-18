import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { searchResidentialCompanies } from "@/lib/centerpoint/searchResidentialCompanies";

export const dynamic = "force-dynamic";

// ─── GET /api/companies/residential/search ────────────────────────────────────
// Searches CenterPoint for residential companies.
// Used during New Inspection to determine whether a company already exists
// before showing the Create Company Request form.
//
// Query params:
//   search      — free-text (maps to filter[search] in CenterPoint)
//   salesStatus — Lead | Sold | Candidate | Client
//   page        — default 1
//   pageSize    — default 25, max 100
export async function GET(req: NextRequest) {
  try {
    await requireAuth(req);
  } catch {
    return NextResponse.json(
      { success: false, stage: "auth", message: "Unauthorized" },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") ?? undefined;
  const salesStatus = searchParams.get("salesStatus") ?? undefined;
  const page = Math.max(1, Number(searchParams.get("page") ?? 1));
  const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("pageSize") ?? 25)));

  try {
    const result = await searchResidentialCompanies({ search, salesStatus, page, pageSize });
    return NextResponse.json({ success: true, ...result });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        stage: "centerpoint",
        message: "Failed to search residential companies",
        details: err.message,
      },
      { status: 502 }
    );
  }
}
