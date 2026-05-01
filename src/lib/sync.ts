import type { SessionState } from "@/types/session";

const API_BASE = typeof window !== "undefined"
  ? window.location.origin
  : (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000");

// ─────────────────────────────────────────────────────────────────────────────
// AUTH
// ─────────────────────────────────────────────────────────────────────────────

export async function login(email: string, password: string, pin?: string) {
  const res = await fetch(`${API_BASE}/api/auth`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, pin }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Login failed");
  }
  const data = await res.json();
  if (typeof window !== "undefined") {
    localStorage.setItem("hustad_auth_token", data.token);
    localStorage.setItem("hustad_rep", JSON.stringify(data.rep));
  }
  return data;
}

export async function logout() {
  await fetch(`${API_BASE}/api/auth`, { method: "DELETE" });
  if (typeof window !== "undefined") {
    localStorage.removeItem("hustad_auth_token");
    localStorage.removeItem("hustad_rep");
  }
}

export async function checkAuth() {
  const res = await fetch(`${API_BASE}/api/auth`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) return null;
  return res.json();
}

export function getStoredRep() {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("hustad_rep");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("hustad_auth_token");
}

function getAuthHeaders(): Record<string, string> {
  const token = getAuthToken();
  return token
    ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
    : { "Content-Type": "application/json" };
}

// ─────────────────────────────────────────────────────────────────────────────
// SESSION SYNC
// ─────────────────────────────────────────────────────────────────────────────

export async function syncSessionToServer(session: SessionState): Promise<boolean> {
  try {
    // For local relay / remote review staging, we don't strictly require a token
    // but we prefer it if available.
    const res = await fetch(`${API_BASE}/api/session`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(session),
    });

    if (!res.ok) {
      console.warn("Sync failed:", res.status);
      return false;
    }

    return true;
  } catch (err) {
    console.warn("Sync error (offline?):", err);
    return false;
  }
}

export async function fetchSessionsFromServer(): Promise<any[]> {
  try {
    const res = await fetch(`${API_BASE}/api/session`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.sessions || [];
  } catch {
    return [];
  }
}

export async function fetchSessionById(sessionId: string) {
  try {
    const res = await fetch(`${API_BASE}/api/session/${sessionId}`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PHOTO UPLOAD
// ─────────────────────────────────────────────────────────────────────────────

export async function uploadPhoto(
  sessionId: string,
  file: File,
  category: string = "general",
  caption: string = "",
  displayOrder: number = 0
) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("session_id", sessionId);
  formData.append("category", category);
  formData.append("caption", caption);
  formData.append("display_order", String(displayOrder));

  const token = getAuthToken();
  const res = await fetch(`${API_BASE}/api/photos`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });

  if (!res.ok) {
    throw new Error("Photo upload failed");
  }
  return res.json();
}

// ─────────────────────────────────────────────────────────────────────────────
// OFFLINE SYNC QUEUE
// ─────────────────────────────────────────────────────────────────────────────

const SYNC_QUEUE_KEY = "hustad_sync_queue";

interface SyncQueueItem {
  sessionId: string;
  queuedAt: string;
  data: SessionState;
}

export function queueForSync(session: SessionState) {
  if (typeof window === "undefined") return;
  try {
    const queue = getSyncQueue();
    // Replace existing entry for same session
    const filtered = queue.filter((q) => q.sessionId !== session.sessionId);
    filtered.push({
      sessionId: session.sessionId,
      queuedAt: new Date().toISOString(),
      data: session,
    });
    localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(filtered));
  } catch (e) {
    console.warn("Queue save failed:", e);
  }
}

export function getSyncQueue(): SyncQueueItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(SYNC_QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function processSyncQueue(): Promise<number> {
  const queue = getSyncQueue();
  if (!queue.length) return 0;

  let synced = 0;
  const remaining: SyncQueueItem[] = [];

  for (const item of queue) {
    const ok = await syncSessionToServer(item.data);
    if (ok) {
      synced++;
    } else {
      remaining.push(item);
    }
  }

  if (typeof window !== "undefined") {
    localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(remaining));
  }

  return synced;
}
