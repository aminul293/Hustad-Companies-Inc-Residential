const BASE = "/api/appointments";
const JSON_HEADERS = { "Content-Type": "application/json" };

export async function fetchAppointments(params?: Record<string, string>): Promise<any[]> {
  const qs  = params ? "?" + new URLSearchParams({ ...params, t: String(Date.now()) }).toString() : `?t=${Date.now()}`;
  const res = await fetch(`${BASE}${qs}`);
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

export async function fetchManagerAppointments(): Promise<any> {
  const res  = await fetch(`${BASE}/manager?t=${Date.now()}`);
  const data = await res.json();
  return data;
}

export async function createAppointment(body: {
  pipeline_lead_id: string;
  rep_id: string;
  appointment_start_at: string;
  appointment_end_at: string;
  _dry_run?: boolean;
}): Promise<Response> {
  return fetch(BASE, {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify(body),
  });
}

export async function patchAppointment(id: string, body: Record<string, unknown>): Promise<Response> {
  return fetch(`${BASE}/${id}`, {
    method: "PATCH",
    headers: JSON_HEADERS,
    body: JSON.stringify(body),
  });
}

export async function deleteAppointment(id: string): Promise<void> {
  await fetch(`${BASE}/${id}`, { method: "DELETE" }).catch(() => {});
}
