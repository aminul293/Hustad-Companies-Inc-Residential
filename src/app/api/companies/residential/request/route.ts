import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { ResidentialRequestSchema } from "@/lib/validation/residentialRequestSchema";
import { createApprovalRequest } from "@/lib/approvals/createApprovalRequest";
import { sendApprovalEmail } from "@/lib/email/sendApprovalEmail";
import { logApprovalEvent } from "@/lib/db/logApprovalEvent";
import { getServiceClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

// ─── POST /api/companies/residential/request ──────────────────────────────────
// Saves the company request as pending, sends the approval email to the service
// manager, and returns immediately. Nothing is created in CenterPoint yet.
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
      { success: false, stage: "validation", message: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const parsed = ResidentialRequestSchema.safeParse(body);
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

  // Persist approval request to Supabase with status = pending_company_approval.
  let approvalRequest: Awaited<ReturnType<typeof createApprovalRequest>>;
  try {
    approvalRequest = await createApprovalRequest(
      input,
      authPayload.name,
      authPayload.email
    );
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        stage: "database",
        message: "Failed to save approval request",
        details: err.message,
      },
      { status: 500 }
    );
  }

  // Send approval email to service manager (non-blocking after saving the record).
  let approvalEmailSent = false;
  try {
    await sendApprovalEmail({
      token: approvalRequest.approval_token,
      companyName: input.name,
      salesStatus: input.salesStatus,
      streetAddress: input.streetAddress,
      locality: input.locality,
      region: input.region,
      postalCode: input.postalCode,
      timezone: input.timezone,
      requestedBy: authPayload.name,
      requestedByEmail: authPayload.email,
      requestedAt: approvalRequest.created_at,
      expiresAt: approvalRequest.expires_at,
    });
    approvalEmailSent = true;

    await getServiceClient()
      .from("approval_requests")
      .update({ approval_email_sent: true })
      .eq("id", approvalRequest.id);
  } catch (err: any) {
    console.error("[REQUEST] Approval email failed:", err.message);
  }

  // Audit log (non-blocking).
  logApprovalEvent({
    company_name: input.name,
    sales_status: input.salesStatus,
    created_by: authPayload.email,
    request_payload: input as unknown as Record<string, unknown>,
    email_status: approvalEmailSent ? "sent" : "failed",
  }).catch(() => {});

  return NextResponse.json({
    success: true,
    status: "pending_company_approval",
    approvalEmailSent,
    expiresAt: approvalRequest.expires_at,
  });
}
