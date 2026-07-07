import { getServiceClient } from "@/lib/supabase-server";
import { getApprovalRequest } from "./getApprovalRequest";
import { createResidentialCompany } from "@/lib/centerpoint/createResidentialCompany";
import { createResidentialProperty } from "@/lib/centerpoint/createResidentialProperty";
import { createResidentialTicket } from "@/lib/centerpoint/createResidentialTicket";
import { sendRepDecisionEmail } from "@/lib/email/sendRepDecisionEmail";
import type { ResidentialRequestInput } from "@/lib/validation/residentialRequestSchema";

export interface ApproveResult {
  success: boolean;
  status: string;
  companyCreated: boolean;
  ticketCreated: boolean;
  companyId: string | null;
  ticketId: string | null;
}

// Stage-tagged error so routes can return structured JSON errors.
class StageError extends Error {
  constructor(message: string, public readonly stage: string) {
    super(message);
  }
}

export async function approveRequest(
  token: string,
  approvedBy = "service_manager"
): Promise<ApproveResult> {
  const supabase = getServiceClient();
  const { request, error } = await getApprovalRequest(token);

  if (error === "not_found") {
    throw new StageError("Approval token not found", "validation");
  }
  if (error === "expired") {
    throw new StageError("Approval token has expired", "validation");
  }
  if (error === "already_processed") {
    // Idempotent: if already approved, return current state without error.
    if (request?.status === "approved") {
      return {
        success: true,
        status: "approved",
        companyCreated: request.company_created,
        ticketCreated: request.ticket_created,
        companyId: request.centerpoint_company_id,
        ticketId: request.centerpoint_ticket_id,
      };
    }
    throw new StageError("Request has already been processed", "validation");
  }

  const req = request!;

  // ── Step 1: Create CenterPoint company ───────────────────────────────────
  // Idempotent: skip if already created (handles retry after partial failure).
  let companyId = req.centerpoint_company_id;
  let companyCreated = req.company_created;

  if (!companyCreated) {
    try {
      const company = await createResidentialCompany({
        name: req.company_name,
        salesStatus: (req.sales_status ?? "Lead") as ResidentialRequestInput["salesStatus"],
        timezone: req.timezone ?? "America/Chicago",
        streetAddress: req.street_address ?? undefined,
        locality: req.locality ?? undefined,
        region: req.region ?? undefined,
        postalCode: req.postal_code ?? undefined,
        manager: req.manager_id ?? undefined,
      });

      companyId = company.id;
      companyCreated = true;

      // Persist immediately so a ticket-creation failure doesn't re-create the company.
      await supabase
        .from("approval_requests")
        .update({
          centerpoint_company_id: companyId,
          company_created: true,
          status: "company_created",
        })
        .eq("approval_token", token);
    } catch (err: any) {
      await supabase
        .from("approval_requests")
        .update({ status: "failed" })
        .eq("approval_token", token);
      throw new StageError(
        `Company creation failed: ${err.message}`,
        "centerpoint_company"
      );
    }
  }

  // ── Step 2: Create CenterPoint ticket ────────────────────────────────────
  let ticketId = req.centerpoint_ticket_id;
  let ticketCreated = req.ticket_created;

  if (!ticketCreated && companyId) {
    try {
      const property = await createResidentialProperty({
        name: req.company_name,
        companyId,
        streetAddress: req.street_address ?? undefined,
        locality: req.locality ?? undefined,
        region: req.region ?? undefined,
        postalCode: req.postal_code ?? undefined,
        timezone: req.timezone ?? "America/Chicago",
      });

      const ticket = await createResidentialTicket({
        companyId: companyId,
        propertyId: property.id,
        managerId: req.manager_id ?? undefined,
      });

      ticketId = ticket.id;
      ticketCreated = true;
    } catch (err: any) {
      await supabase
        .from("approval_requests")
        .update({ status: "failed" })
        .eq("approval_token", token);
      throw new StageError(
        `Ticket creation failed: ${err.message}`,
        "centerpoint_ticket"
      );
    }
  }

  // ── Step 3: Mark fully approved ───────────────────────────────────────────
  await supabase
    .from("approval_requests")
    .update({
      status: "approved",
      centerpoint_ticket_id: ticketId,
      ticket_created: ticketCreated,
      approved_by: approvedBy,
      approved_at: new Date().toISOString(),
    })
    .eq("approval_token", token);

  // ── Step 4: Notify rep (non-blocking) ─────────────────────────────────────
  sendRepDecisionEmail({
    decision: "approved",
    repEmail: req.requested_by_email,
    repName: req.requested_by,
    companyName: req.company_name,
    companyId: companyId ?? "",
    ticketId: ticketId ?? "",
  }).catch((err) => console.error("[APPROVE] Rep notification failed:", err.message));

  return {
    success: true,
    status: "approved",
    companyCreated,
    ticketCreated,
    companyId,
    ticketId,
  };
}
