import { getServiceClient } from "@/lib/supabase-server";
import { generateApprovalToken, getTokenExpiry } from "./generateApprovalToken";
import type { ResidentialRequestInput } from "@/lib/validation/residentialRequestSchema";

export interface ApprovalRequest {
  id: string;
  approval_token: string;
  status: string;
  company_name: string;
  sales_status: string | null;
  street_address: string | null;
  locality: string | null;
  region: string | null;
  postal_code: string | null;
  timezone: string | null;
  manager_id: string | null;
  requested_by: string;
  requested_by_email: string;
  centerpoint_company_id: string | null;
  centerpoint_ticket_id: string | null;
  company_created: boolean;
  ticket_created: boolean;
  approval_email_sent: boolean;
  approved_by: string | null;
  approved_at: string | null;
  rejected_at: string | null;
  expires_at: string;
  request_payload: Record<string, unknown> | null;
  created_at: string;
}

export async function createApprovalRequest(
  input: ResidentialRequestInput,
  requestedBy: string,
  requestedByEmail: string
): Promise<ApprovalRequest> {
  const supabase = getServiceClient();
  const token = generateApprovalToken();
  const expiresAt = getTokenExpiry();

  const { data, error } = await supabase
    .from("approval_requests")
    .insert({
      approval_token: token,
      status: "pending_company_approval",
      company_name: input.name,
      sales_status: input.salesStatus ?? null,
      street_address: input.streetAddress ?? null,
      locality: input.locality ?? null,
      region: input.region ?? null,
      postal_code: input.postalCode ?? null,
      timezone: input.timezone ?? null,
      manager_id: input.manager ?? null,
      requested_by: requestedBy,
      requested_by_email: requestedByEmail,
      expires_at: expiresAt.toISOString(),
      request_payload: input as unknown as Record<string, unknown>,
    })
    .select()
    .single();

  if (error || !data) {
    throw new Error(`Failed to save approval request: ${error?.message}`);
  }

  return data as ApprovalRequest;
}
