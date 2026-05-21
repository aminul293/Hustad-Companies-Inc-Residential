import os

api_dir = "src/lib/api"
os.makedirs(api_dir, exist_ok=True)

files = {
    "pipeline.ts": """const BASE = "/api/pipeline";
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
""",
    
    "appointments.ts": """const BASE = "/api/appointments";
const JSON_HEADERS = { "Content-Type": "application/json" };

export async function fetchAppointments(params?: Record<string, string>): Promise<any[]> {
  const qs  = params ? "?" + new URLSearchParams({ ...params, t: String(Date.now()) }).toString() : `?t=${Date.now()}`;
  const res = await fetch(`${BASE}${qs}`);
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

export async function fetchManagerAppointments(): Promise<any[]> {
  const res  = await fetch(`${BASE}/manager?t=${Date.now()}`);
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

export async function createAppointment(body: {
  pipeline_lead_id: string;
  rep_id: string;
  appointment_start_at: string;
  appointment_end_at: string;
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
""",

    "sessions.ts": """const JSON_HEADERS = { "Content-Type": "application/json" };

export async function fetchSessionByToken(token: string): Promise<Response> {
  return fetch(`/api/session?token=${token}`);
}

export async function fetchSessionById(sessionId: string): Promise<Response> {
  return fetch(`/api/session?sessionId=${sessionId}`);
}

export async function syncSession(session: unknown): Promise<Response> {
  return fetch("/api/session", {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify(session),
  });
}

export async function completeSession(
  sessionId: string,
  sessionStatus: string,
): Promise<Response> {
  return fetch(`/api/sessions/${sessionId}/complete`, {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify({ session_status: sessionStatus }),
  });
}

export async function deleteSession(sessionId: string): Promise<void> {
  await fetch(`/api/sessions/${sessionId}`, { method: "DELETE" }).catch(() => {});
}

export async function postReviewAction(
  token: string,
  action: string,
  payload?: unknown,
): Promise<Response> {
  return fetch("/api/review/action", {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify({ token, action, payload }),
  });
}
""",

    "centerpoint.ts": """const BASE = "/api/centerpoint";
const JSON_HEADERS = { "Content-Type": "application/json" };

export async function fetchCenterpointJobs(params: Record<string, string>): Promise<Response> {
  return fetch(`${BASE}?${new URLSearchParams(params).toString()}&t=${Date.now()}`);
}

export async function fetchCenterpointSyncStatus(): Promise<Response> {
  return fetch(`${BASE}/sync`);
}

export async function triggerCenterpointSync(): Promise<Response> {
  return fetch(`${BASE}/sync`, { method: "POST" });
}

export async function patchCenterpointJob(id: string, body: Record<string, unknown>): Promise<Response> {
  return fetch(`${BASE}/${id}`, {
    method: "PATCH",
    headers: JSON_HEADERS,
    body: JSON.stringify(body),
  });
}

export async function fetchCenterpointMe(): Promise<Response> {
  return fetch(`${BASE}/me`);
}

export async function processQueue(): Promise<Response> {
  return fetch(`${BASE}/process-queue`, { method: "POST" });
}
""",

    "comms.ts": """const JSON_HEADERS = { "Content-Type": "application/json" };

export async function sendEmail(body: {
  to: string;
  subject: string;
  html: string;
  sessionId?: string;
}): Promise<Response> {
  return fetch("/api/send-email", {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify(body),
  });
}

export async function sendSms(body: {
  to: string;
  message: string;
  sessionId?: string;
}): Promise<Response> {
  return fetch("/api/send-sms", {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify(body),
  });
}

export async function createCalendarEvent(body: {
  subject: string;
  startAt: string;
  endAt: string;
  address: string;
  homeownerName: string;
}): Promise<Response> {
  return fetch("/api/calendar-event", {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify(body),
  });
}

export async function patchCalendarEvent(body: {
  eventId: string;
  captureUrl: string;
  address: string;
  homeownerName: string;
}): Promise<Response> {
  return fetch("/api/calendar-event", {
    method: "PATCH",
    headers: JSON_HEADERS,
    body: JSON.stringify(body),
  });
}

export async function officeDispatch(body: Record<string, unknown>): Promise<Response> {
  return fetch("/api/office-dispatch", {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify(body),
  });
}
""",

    "tickets.ts": """const BASE = "/api/tickets";
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
""",

    "reps.ts": """export async function fetchReps(): Promise<Response> {
  return fetch(`/api/reps?t=${Date.now()}`);
}
""",

    "index.ts": """export * from "./pipeline";
export * from "./appointments";
export * from "./sessions";
export * from "./centerpoint";
export * from "./comms";
export * from "./tickets";
export * from "./reps";
"""
}

for filename, content in files.items():
    with open(os.path.join(api_dir, filename), "w") as f:
        f.write(content)

print("done")
