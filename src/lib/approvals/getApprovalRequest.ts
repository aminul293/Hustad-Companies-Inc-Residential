import { getServiceClient } from "@/lib/supabase-server";
import type { ApprovalRequest } from "./createApprovalRequest";

export type ApprovalValidationError = "not_found" | "expired" | "already_processed";

export interface ApprovalLookupResult {
  request: ApprovalRequest | null;
  error: ApprovalValidationError | null;
}

// Fetches and fully validates an approval request for use in approve/reject flows.
// Returns structured errors so callers can produce clean HTTP responses.
export async function getApprovalRequest(token: string): Promise<ApprovalLookupResult> {
  const supabase = getServiceClient();

  const { data, error } = await supabase
    .from("approval_requests")
    .select("*")
    .eq("approval_token", token)
    .maybeSingle();

  if (error || !data) {
    return { request: null, error: "not_found" };
  }

  const request = data as ApprovalRequest;

  if (new Date() > new Date(request.expires_at)) {
    return { request, error: "expired" };
  }

  if (request.status !== "pending_company_approval") {
    return { request, error: "already_processed" };
  }

  return { request, error: null };
}

// Raw fetch with no validation — used for status checks (GET /api/approvals/[token]).
export async function getRawApprovalRequest(
  token: string
): Promise<ApprovalRequest | null> {
  const supabase = getServiceClient();

  const { data } = await supabase
    .from("approval_requests")
    .select("*")
    .eq("approval_token", token)
    .maybeSingle();

  return (data as ApprovalRequest) ?? null;
}
