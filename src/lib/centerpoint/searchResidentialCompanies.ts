import { CP_BASE, cpReadHeaders, cpJsonHeaders } from "./client";

export interface CpCompanyListItem {
  id: string;
  name: string;
  salesStatus: string;
  streetAddress?: string;
  locality?: string;
  region?: string;
  postalCode?: string;
  recentActivity?: string;
}

export interface SearchResidentialOptions {
  search?: string;
  salesStatus?: string;
  page?: number;
  pageSize?: number;
}

const COMPANY_FIELDS = [
  "manager", "name", "externalId", "type", "propertyCount",
  "streetAddress", "locality", "county", "region", "postalCode",
  "latitude", "longitude", "recentActivity", "closeRate", "custom",
  "options", "integrationRelations", "location",
  "quickbooksOnlineIntegrationRelation", "quotedValue",
  "openQuotedValue", "soldValue", "serviceValue", "productionValue",
  "closeRateValue", "modelFileTagCounts",
].join(",");

export async function searchResidentialCompanies(
  opts: SearchResidentialOptions = {}
): Promise<{ companies: CpCompanyListItem[]; total: number }> {
  const params = new URLSearchParams({
    include: "manager,location",
    "page[size]": String(opts.pageSize ?? 25),
    "page[number]": String(opts.page ?? 1),
    sort: "-recentActivity",
    "fields[companies]": COMPANY_FIELDS,
  });

  if (opts.search) {
    // Name search: no type/customerType filter — existing companies in CenterPoint
    // were created with type=Residential (legacy), while new ones use type=Company
    // + customerType=Residential. Strip type restrictions so we find either.
    params.set("filter[search]", opts.search);
  } else {
    // Browsing mode: show only the residential customer type accounts.
    // Cover both legacy (type=Residential) and new (type=Company + customerType=Residential).
    params.set("filter[type]", "Residential");
  }

  if (opts.salesStatus) {
    params.set("filter[salesStatus][0]", opts.salesStatus);
  }

  const res = await fetch(`${CP_BASE}/companies?${params}`, {
    headers: cpReadHeaders(),
    cache: "no-store",
  });

  if (!res.ok) throw new Error(`CenterPoint search error ${res.status}`);

  const json = await res.json();
  const records: any[] = json.data ?? [];
  const total: number = json.meta?.page?.total ?? records.length;

  const companies: CpCompanyListItem[] = records.map((r) => {
    const a = r.attributes ?? {};
    return {
      id: String(r.id),
      name: a.name ?? "",
      salesStatus: a.salesStatus ?? "",
      streetAddress: a.streetAddress ?? undefined,
      locality: a.locality ?? undefined,
      region: a.region ?? undefined,
      postalCode: a.postalCode ?? undefined,
      recentActivity: a.recentActivity ?? undefined,
    };
  });

  return { companies, total };
}

export async function getResidentialCompanyById(id: string): Promise<any> {
  const res = await fetch(`${CP_BASE}/companies/${id}?include=manager,location`, {
    headers: cpReadHeaders(),
    cache: "no-store",
  });

  if (!res.ok) throw new Error(`CenterPoint error ${res.status}`);
  return res.json();
}

export async function patchResidentialCompany(
  id: string,
  updates: Record<string, unknown>
): Promise<any> {
  const res = await fetch(`${CP_BASE}/companies/${id}`, {
    method: "PATCH",
    headers: cpJsonHeaders(),
    body: JSON.stringify({
      data: { type: "companies", id, attributes: updates },
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(
      json?.errors?.[0]?.detail ?? `CenterPoint PATCH error ${res.status}`
    );
  }

  return res.json();
}
