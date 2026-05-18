import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { ResidentialCompanySchema } from "@/lib/validation/residentialCompanySchema";
import { createResidentialCompany } from "@/lib/centerpoint/createResidentialCompany";
import { searchResidentialCompanies } from "@/lib/centerpoint/searchResidentialCompanies";
import { sendCompanyCreatedEmail } from "@/lib/email/sendCompanyCreatedEmail";
import { logCompanyEvent } from "@/lib/db/logCompanyEvent";

export const dynamic = "force-dynamic";

// ─── POST /api/companies/residential ─────────────────────────────────────────
export async function POST(req: NextRequest) {
  let authPayload: Awaited<ReturnType<typeof requireAuth>>;
  try {
    authPayload = await requireAuth(req);
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

  const parsed = ResidentialCompanySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        stage: "validation",
        message: "Invalid request body",
        details: parsed.error.flatten(),
      },
      { status: 422 }
    );
  }

  const input = parsed.data;
  const timestamp = new Date().toISOString();

  // Create in CenterPoint
  let company: Awaited<ReturnType<typeof createResidentialCompany>>;
  try {
    company = await createResidentialCompany(input);
  } catch (err: any) {
    await logCompanyEvent({
      company_name: input.name,
      sales_status: input.salesStatus,
      created_by: authPayload.email,
      request_payload: input as Record<string, unknown>,
      error_message: err.message,
    }).catch(() => {});
    return NextResponse.json(
      {
        success: false,
        stage: "centerpoint",
        message: "Failed to create residential company",
        details: err.message,
      },
      { status: 502 }
    );
  }

  // Email — non-blocking, failure does not fail the request
  let emailSent = false;
  try {
    await sendCompanyCreatedEmail({
      id: company.id,
      name: company.name,
      salesStatus: company.salesStatus,
      timezone: input.timezone,
      streetAddress: input.streetAddress,
      manager: input.manager,
      createdBy: authPayload.email,
      timestamp,
    });
    emailSent = true;
  } catch (err: any) {
    console.error("[COMPANY_CREATE] Email failed:", err.message);
  }

  // Log to Supabase
  let logged = false;
  try {
    await logCompanyEvent({
      company_id: company.id,
      company_name: company.name,
      company_type: "Company",
      customer_type: "Residential",
      sales_status: company.salesStatus,
      created_by: authPayload.email,
      request_payload: input as Record<string, unknown>,
      centerpoint_response: company as unknown as Record<string, unknown>,
      email_status: emailSent ? "sent" : "failed",
    });
    logged = true;
  } catch (err: any) {
    console.error("[COMPANY_CREATE] Supabase log failed:", err.message);
  }

  return NextResponse.json({
    success: true,
    company: {
      id: company.id,
      name: company.name,
      type: "Company",
      customerType: "Residential",
      salesStatus: company.salesStatus,
    },
    emailSent,
    logged,
  });
}

// ─── GET /api/companies/residential ─────────────────────────────────────────
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
