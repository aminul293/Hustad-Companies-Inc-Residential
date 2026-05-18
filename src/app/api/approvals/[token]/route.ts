import { NextRequest, NextResponse } from "next/server";
import { getRawApprovalRequest } from "@/lib/approvals/getApprovalRequest";

export const dynamic = "force-dynamic";

// ─── GET /api/approvals/[token] ───────────────────────────────────────────────
// Returns the current state of an approval request.
// No auth required — the token itself is the credential.
// Reps or managers can poll this to check decision status.
export async function GET(
  _req: NextRequest,
  { params }: { params: { token: string } }
) {
  const request = await getRawApprovalRequest(params.token);

  if (!request) {
    return NextResponse.json(
      { success: false, stage: "validation", message: "Approval token not found" },
      { status: 404 }
    );
  }

  const isExpired =
    request.status === "pending_company_approval" &&
    new Date() > new Date(request.expires_at);

  return NextResponse.json({
    success: true,
    status: isExpired ? "expired" : request.status,
    companyName: request.company_name,
    requestedBy: request.requested_by,
    requestedAt: request.created_at,
    expiresAt: request.expires_at,
    companyCreated: request.company_created,
    ticketCreated: request.ticket_created,
    companyId: request.centerpoint_company_id,
    ticketId: request.centerpoint_ticket_id,
    approvedAt: request.approved_at,
    rejectedAt: request.rejected_at,
  });
}
