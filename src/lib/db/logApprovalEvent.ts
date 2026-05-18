import { getServiceClient } from "@/lib/supabase-server";

export interface ApprovalEventPayload {
  company_id?: string;
  company_name?: string;
  sales_status?: string;
  created_by?: string;
  request_payload?: Record<string, unknown>;
  centerpoint_response?: Record<string, unknown>;
  email_status?: string;
  azure_search_status?: string;
  error_message?: string;
}

export async function logApprovalEvent(event: ApprovalEventPayload): Promise<void> {
  const supabase = getServiceClient();
  await supabase.from("company_events").insert({
    company_type: "Company",
    customer_type: "Residential",
    ...event,
  });
}
