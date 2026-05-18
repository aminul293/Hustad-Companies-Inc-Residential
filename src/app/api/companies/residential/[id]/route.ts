import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { ResidentialCompanySchema } from "@/lib/validation/residentialCompanySchema";
import {
  getResidentialCompanyById,
  patchResidentialCompany,
} from "@/lib/centerpoint/searchResidentialCompanies";

export const dynamic = "force-dynamic";

// ─── GET /api/companies/residential/[id] ─────────────────────────────────────
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAuth(req);
  } catch {
    return NextResponse.json(
      { success: false, stage: "auth", message: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const data = await getResidentialCompanyById(params.id);
    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        stage: "centerpoint",
        message: "Company not found",
        details: err.message,
      },
      { status: 404 }
    );
  }
}

// ─── PATCH /api/companies/residential/[id] ───────────────────────────────────
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAuth(req);
  } catch {
    return NextResponse.json(
      { success: false, stage: "auth", message: "Unauthorized" },
      { status: 401 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, stage: "validation", message: "Invalid JSON" },
      { status: 400 }
    );
  }

  // Partial schema — type and customerType are never in the schema so they
  // cannot be submitted; the backend always owns those values.
  const partial = ResidentialCompanySchema.partial().safeParse(body);
  if (!partial.success) {
    return NextResponse.json(
      {
        success: false,
        stage: "validation",
        message: "Invalid fields",
        details: partial.error.flatten(),
      },
      { status: 422 }
    );
  }

  try {
    const data = await patchResidentialCompany(
      params.id,
      partial.data as Record<string, unknown>
    );
    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        stage: "centerpoint",
        message: "Failed to update company",
        details: err.message,
      },
      { status: 502 }
    );
  }
}
