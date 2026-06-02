const BASE = "/api/centerpoint";
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

export async function dismissQueueItems(ids: string[]): Promise<Response> {
  return fetch("/api/outbound-queue/dismiss", {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify({ ids }),
  });
}

export async function dismissAllQueueFailures(): Promise<Response> {
  return fetch("/api/outbound-queue/dismiss", {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify({ all: true }),
  });
}

// ─── Opportunities ────────────────────────────────────────────────────────────
export async function fetchCenterpointOpportunities(params: Record<string, string>): Promise<Response> {
  return fetch(`${BASE}/opportunities?${new URLSearchParams(params).toString()}&t=${Date.now()}`);
}

export async function triggerOpportunitiesSync(): Promise<Response> {
  return fetch(`${BASE}/opportunities/sync`, { method: "POST" });
}

export async function fetchOpportunitiesSyncStatus(): Promise<Response> {
  return fetch(`${BASE}/opportunities/sync`);
}
