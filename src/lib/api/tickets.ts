const BASE = "/api/tickets";
const JSON_HEADERS = { "Content-Type": "application/json" };

export async function fetchTickets(params?: Record<string, string>): Promise<Response> {
  const qs = params ? "?" + new URLSearchParams(params).toString() : "";
  return fetch(`${BASE}${qs}`);
}

export async function patchTicket(id: string, body: Record<string, unknown>): Promise<Response> {
  return fetch(`${BASE}/${id}`, {
    method: "PATCH",
    headers: JSON_HEADERS,
    body: JSON.stringify(body),
  });
}

export async function addTicketTouch(id: string, body: Record<string, unknown>): Promise<Response> {
  return fetch(`${BASE}/${id}/touches`, {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify(body),
  });
}

export async function deleteTicket(id: string): Promise<Response> {
  return fetch(`${BASE}/${id}`, { method: "DELETE" });
}
