const JSON_HEADERS = { "Content-Type": "application/json" };

export async function sendEmail(body: {
  to: string;
  subject: string;
  html: string;
  sessionId?: string;
} & Record<string, unknown>): Promise<Response> {
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
} & Record<string, unknown>): Promise<Response> {
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
