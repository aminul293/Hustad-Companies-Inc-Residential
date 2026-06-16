export async function fetchReps(): Promise<Response> {
  return fetch(`/api/reps?t=${Date.now()}`);
}

export async function fetchCurrentUser(): Promise<{ id: string; email: string; name: string; role: string } | null> {
  try {
    const res = await fetch(`/api/me?t=${Date.now()}`);
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function updateRepRole(repId: string, role: string): Promise<Response> {
  return fetch(`/api/reps/${repId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role }),
  });
}
