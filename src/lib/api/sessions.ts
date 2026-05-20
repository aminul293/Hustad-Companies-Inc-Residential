const JSON_HEADERS = { "Content-Type": "application/json" };

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
