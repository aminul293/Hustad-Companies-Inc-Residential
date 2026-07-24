import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { ExistingCompanyTicketSchema } from "@/lib/validation/residentialRequestSchema";
import { createResidentialProperty } from "@/lib/centerpoint/createResidentialProperty";
import { createResidentialTicket } from "@/lib/centerpoint/createResidentialTicket";

export const dynamic = "force-dynamic";

// ─── POST /api/companies/residential/[id]/ticket ──────────────────────────────
// Creates a property + inspection ticket under an EXISTING CenterPoint company —
// the counterpart to /create, which creates the company itself. Used when a rep
// searches and finds the company already exists but still needs a new ticket.
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAuth(req);
  } catch {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const companyId = params.id;
  if (!companyId) {
    return NextResponse.json({ success: false, message: "Missing company id" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, message: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = ExistingCompanyTicketSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, message: "Invalid request body", details: parsed.error.flatten() },
      { status: 422 }
    );
  }

  const input = parsed.data;

  // Step 1: Create property under the existing company
  let propertyId: string;
  try {
    const property = await createResidentialProperty({
      name: input.propertyName,
      companyId,
      streetAddress: input.streetAddress,
      locality: input.locality,
      region: input.region,
      postalCode: input.postalCode,
      timezone: input.timezone,
      email: input.homeownerEmail || undefined,
      phone: input.homeownerPhone || undefined,
    });
    propertyId = property.id;
  } catch (err: any) {
    return NextResponse.json(
      { success: false, stage: "property", companyId, message: err.message ?? "Property creation failed" },
      { status: 500 }
    );
  }

  // Step 2: Create inspection ticket
  let ticketId: string;
  try {
    const ticket = await createResidentialTicket({
      companyId,
      propertyId,
      managerId: input.manager || undefined,
      description: input.description || undefined,
    });
    ticketId = ticket.id;
  } catch (err: any) {
    return NextResponse.json(
      { success: false, stage: "ticket", companyId, propertyId, message: err.message ?? "Ticket creation failed" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, companyId, ticketId });
}
