import { getServiceClient } from "@/lib/supabase-server";
import { getApprovalRequest } from "./getApprovalRequest";
import { sendRepDecisionEmail } from "@/lib/email/sendRepDecisionEmail";

export interface RejectResult {
  success: boolean;
  status: string;
}

class StageError extends Error {
  constructor(message: string, public readonly stage: string) {
    super(message);
  }
}

export async function rejectRequest(
  token: string,
  rejectedBy = "service_manager"
): Promise<RejectResult> {
  const supabase = getServiceClient();
  const { request, error } = await getApprovalRequest(token);

  if (error === "not_found") {
    throw new StageError("Approval token not found", "validation");
  }
  if (error === "expired") {
    throw new StageError("Approval token has expired", "validation");
  }
  if (error === "already_processed") {
    // Idempotent: clicking reject twice is safe.
    if (request?.status === "rejected") {
      return { success: true, status: "rejected" };
    }
    throw new StageError("Request has already been processed", "validation");
  }

  const req = request!;

  await supabase
    .from("approval_requests")
    .update({
      status: "rejected",
      rejected_at: new Date().toISOString(),
      // approved_by intentionally left null — rejected_at is the indicator
    })
    .eq("approval_token", token);

  // Notify rep (non-blocking — rejection log already committed above)
  sendRepDecisionEmail({
    decision: "rejected",
    repEmail: req.requested_by_email,
    repName: req.requested_by,
    companyName: req.company_name,
    companyId: null,
    ticketId: null,
  }).catch((err) => console.error("[REJECT] Rep notification failed:", err.message));

  void rejectedBy; // available for future audit logging
  return { success: true, status: "rejected" };
}
