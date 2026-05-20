export async function fetchRepUploads(sessionId: string): Promise<Response> {
  return fetch(`/api/rep-upload?session_id=${encodeURIComponent(sessionId)}`);
}
