import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { ResidentialRequestSchema } from "@/lib/validation/residentialRequestSchema";
import { createResidentialCompany } from "@/lib/centerpoint/createResidentialCompany";
import { createResidentialProperty } from "@/lib/centerpoint/createResidentialProperty";
import { createResidentialTicket } from "@/lib/centerpoint/createResidentialTicket";
import type { ResidentialRequestInput } from "@/lib/validation/residentialRequestSchema";

export const dynamic = "force-dynamic";

// ─── POST /api/companies/residential/create ───────────────────────────────────
// Directly creates the company, property, and inspection ticket in CenterPoint.
// No approval workflow — returns immediately with companyId + ticketId.
export async function POST(req: NextRequest) {
  try {
    await requireAuth(req);
  } catch {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, message: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = ResidentialRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, message: "Invalid request body", details: parsed.error.flatten() },
      { status: 422 }
    );
  }

  const input = parsed.data;

  // Step 1: Create company in CenterPoint
  let companyId: string;
  try {
    const company = await createResidentialCompany({
      name: input.name,
      salesStatus: input.salesStatus as ResidentialRequestInput["salesStatus"],
      timezone: input.timezone,
      streetAddress: input.streetAddress,
      locality: input.locality,
      region: input.region,
      postalCode: input.postalCode,
      manager: input.manager,
    });
    companyId = company.id;
  } catch (err: any) {
    return NextResponse.json(
      { success: false, stage: "company", message: err.message ?? "Company creation failed" },
      { status: 500 }
    );
  }

  // Step 2: Create property in CenterPoint
  let propertyId: string;
  try {
    const property = await createResidentialProperty({
      name: input.name, // Use the name from the request for the property name
      companyId,
      streetAddress: input.streetAddress,
      locality: input.locality,
      region: input.region,
      postalCode: input.postalCode,
      timezone: input.timezone,
    });
    propertyId = property.id;
  } catch (err: any) {
    return NextResponse.json(
      { success: false, stage: "property", companyId, message: err.message ?? "Property creation failed" },
      { status: 500 }
    );
  }

  // Step 3: Create inspection ticket in CenterPoint
  let ticketId: string;
  try {
    const ticket = await createResidentialTicket({
      companyName: input.name,
      companyId,
      propertyId,
      managerId: input.manager || undefined,
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
