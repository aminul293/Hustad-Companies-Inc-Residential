import { CP_BASE, cpJsonHeaders } from "./client";

export interface TicketInput {
  companyName: string;
  companyId: string;
  propertyId: string;
  managerId?: string;
}

export interface CpTicket {
  id: string;
  name: string;
  status: string;
}

export async function createResidentialTicket(input: TicketInput): Promise<CpTicket> {
  const body = {
    data: {
      type: "services",
      attributes: {
        name: `Residential Inspection - ${input.companyName}`,
        workflowType: "service",
        domain: "Service",
        workType: "Inspection",
        custom: {
          description: "STORM INSPECTION-HAIL",
        },
      },
      relationships: {
        billedCompany: {
          data: { type: "companies", id: input.companyId },
        },
        property: {
          data: { type: "properties", id: input.propertyId },
        },
        ...(input.managerId
          ? {
              managers: {
                data: [{ type: "employees", id: input.managerId }],
              },
            }
          : {}),
      },
    },
  };

  const res = await fetch(`${CP_BASE}/services`, {
    method: "POST",
    headers: cpJsonHeaders(),
    body: JSON.stringify(body),
    cache: "no-store",
  });

  const json = await res.json();

  if (!res.ok) {
    throw new Error(
      json?.errors?.[0]?.detail ??
        json?.message ??
        `CenterPoint ticket error ${res.status}`
    );
  }

  const attr = json.data?.attributes ?? {};
  return {
    id: String(json.data?.id ?? ""),
    name: attr.name ?? `Residential Inspection - ${input.companyName}`,
    status: attr.status ?? attr.displayStatus ?? "created",
  };
}
