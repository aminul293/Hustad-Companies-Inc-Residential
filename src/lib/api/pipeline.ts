const BASE = "/api/pipeline";
const JSON_HEADERS = { "Content-Type": "application/json" };

export async function fetchLeads(repId?: string): Promise<any[]> {
  const url = repId ? `${BASE}?repId=${repId}&t=${Date.now()}` : `${BASE}?t=${Date.now()}`;
  const res  = await fetch(url);
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

export async function patchLead(id: string, body: Record<string, unknown>): Promise<Response> {
  return fetch(`${BASE}/${id}`, {
    method: "PATCH",
    headers: JSON_HEADERS,
    body: JSON.stringify(body),
  });
}

export async function deleteLead(id: string, force = false): Promise<Response> {
  const url = force ? `${BASE}/${id}?force=true` : `${BASE}/${id}`;
  return fetch(url, { method: "DELETE" });
}

export async function createPipelineLead(body: Record<string, unknown>): Promise<Response> {
  return fetch(BASE, {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify(body),
  });
}
