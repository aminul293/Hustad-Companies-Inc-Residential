export async function fetchReps(): Promise<Response> {
  return fetch(`/api/reps?t=${Date.now()}`);
}
