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

  const formattedBody = `<p>${body.replace(/\n/g, '<br/>')}</p>`;

  const noteData = {
    data: {
      type: "notes",
      attributes: {
        description: "note",
        isOfficeOnly: false,
        title: "Forensic Inspection Report",
        body: formattedBody,
        isVisible: true,
        isPinned: false
      },
      relationships: {
        subject: {
          data: {
            type: "productions",
            id: opportunityId
          }
        }
      }
    }
  };

  const flatUrl = `${CP_BASE}/notes`;
  const res = await fetch(flatUrl, {
    method: "POST",
    headers,
    body: JSON.stringify(noteData),
    cache: "no-store",
  });

  if (res.ok) return;

  const err = await res.text();
  console.warn(`[CP_NOTE] /notes (flat) → ${res.status}:`, err);
  throw new Error(`CenterPoint Note API failed. /notes: ${res.status}. Error: ${err.slice(0, 300)}`);
}
