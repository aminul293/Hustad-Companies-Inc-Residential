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
