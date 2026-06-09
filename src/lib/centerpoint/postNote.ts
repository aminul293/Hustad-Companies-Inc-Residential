import { CP_BASE } from "./client";

export async function postNote(
  opportunityId: string,
  body: string,
  apiKey: string
): Promise<void> {
  const headers = {
    Accept: "application/json",
    "Content-Type": "application/json",
    Authorization: apiKey,
  };

  const noteData = { data: { type: "notes", attributes: { body } } };

  // Attempt 1: nested under services (CP uses /services/ for production records)
  const servicesUrl = `${CP_BASE}/services/${opportunityId}/notes`;
  const res1 = await fetch(servicesUrl, {
    method: "POST",
    headers,
    body: JSON.stringify(noteData),
    cache: "no-store",
  });
  if (res1.ok) return;
  const err1 = await res1.text();
  console.warn(`[CP_NOTE] /services/${opportunityId}/notes → ${res1.status}:`, err1);

  // Attempt 2: nested under productions
  const productionsUrl = `${CP_BASE}/productions/${opportunityId}/notes`;
  const res2 = await fetch(productionsUrl, {
    method: "POST",
    headers,
    body: JSON.stringify(noteData),
    cache: "no-store",
  });
  if (res2.ok) return;
  const err2 = await res2.text();
  console.warn(`[CP_NOTE] /productions/${opportunityId}/notes → ${res2.status}:`, err2);

  // Attempt 3: flat /notes with polymorphic relationship
  const flatUrl = `${CP_BASE}/notes`;
  const res3 = await fetch(flatUrl, {
    method: "POST",
    headers,
    body: JSON.stringify({
      data: {
        type: "notes",
        attributes: { body },
        relationships: {
          notable: { data: { type: "productions", id: opportunityId } },
        },
      },
    }),
    cache: "no-store",
  });
  if (res3.ok) return;
  const err3 = await res3.text();
  console.warn(`[CP_NOTE] /notes (flat) → ${res3.status}:`, err3);

  throw new Error(
    `All CP note attempts failed. ` +
    `/services: ${res1.status}. ` +
    `/productions: ${res2.status}. ` +
    `/notes: ${res3.status}. ` +
    `Last error: ${err3.slice(0, 300)}`
  );
}
