import { CP_BASE, cpJsonHeaders } from "./client";
import type { ResidentialCompanyInput } from "@/lib/validation/residentialCompanySchema";

export interface CpCompany {
  id: string;
  name: string;
  type: string;
  customerType: string;
  salesStatus: string;
  timezone?: string;
  streetAddress?: string;
  locality?: string;
  region?: string;
  postalCode?: string;
}

export async function createResidentialCompany(
  input: ResidentialCompanyInput
): Promise<CpCompany> {
  const body = {
    data: {
      type: "companies",
      attributes: {
        name: input.name,
        type: "Residential",
        salesStatus: input.salesStatus,
        timezone: input.timezone,
        ...(input.streetAddress && { streetAddress: input.streetAddress }),
        ...(input.locality && { locality: input.locality }),
        ...(input.region && { region: input.region }),
        ...(input.postalCode && { postalCode: input.postalCode }),
        custom: { customerType: "Residential" },
      },
      ...(input.manager
        ? {
            relationships: {
              manager: { data: { type: "employees", id: input.manager } },
            },
          }
        : {}),
    },
  };

  const res = await fetch(`${CP_BASE}/companies`, {
    method: "POST",
    headers: cpJsonHeaders(),
    body: JSON.stringify(body),
    cache: "no-store",
  });

  const json = await res.json();

  if (!res.ok) {
    throw new Error(
      json?.errors?.[0]?.detail ?? json?.message ?? `CenterPoint error ${res.status}`
    );
  }

  const attr = json.data?.attributes ?? {};
  return {
    id: String(json.data?.id ?? ""),
    name: attr.name ?? input.name,
    type: "Residential",
    customerType: "Residential",
    salesStatus: attr.salesStatus ?? input.salesStatus,
    timezone: attr.timezone,
    streetAddress: attr.streetAddress,
    locality: attr.locality,
    region: attr.region,
    postalCode: attr.postalCode,
  };
}
