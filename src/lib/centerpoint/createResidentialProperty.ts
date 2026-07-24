import { CP_BASE, cpJsonHeaders } from "./client";

export interface PropertyInput {
  name: string;
  companyId: string;
  streetAddress?: string;
  locality?: string;
  region?: string;
  postalCode?: string;
  timezone?: string;
  email?: string;
  phone?: string;
}

export interface CpProperty {
  id: string;
  name: string;
}

export async function createResidentialProperty(input: PropertyInput): Promise<CpProperty> {
  const body = {
    data: {
      type: "properties",
      attributes: {
        name: input.name,
        streetAddress: input.streetAddress || "",
        locality: input.locality || "",
        region: input.region || "",
        postalCode: input.postalCode || "",
        timezone: input.timezone || "America/Chicago",
        isVisible: true,
        ...(input.email && { email: input.email }),
        ...(input.phone && { phone: input.phone }),
      },
      relationships: {
        company: {
          data: { type: "companies", id: input.companyId },
        },
      },
    },
  };

  const res = await fetch(`${CP_BASE}/properties`, {
    method: "POST",
    headers: cpJsonHeaders(),
    body: JSON.stringify(body),
    cache: "no-store",
  });

  const json = await res.json();

  if (!res.ok) {
    throw new Error(
      json?.errors?.[0]?.detail ?? json?.message ?? `CenterPoint property error ${res.status}`
    );
  }

  return {
    id: String(json.data?.id ?? ""),
    name: json.data?.attributes?.name ?? input.name,
  };
}
