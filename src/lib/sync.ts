import {
  getUnsyncedSessions,
  markSessionSyncing,
  markSessionSynced,
  markSessionSyncError,
  loadDraftById,
  saveSession,
} from "@/lib/session";
import { getPhotoBlob } from "@/lib/photoStorage";
import type { InspectionPhoto, SessionState } from "@/types/session";

const API_BASE = typeof window !== "undefined"
  ? window.location.origin
  : (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000");

// ─────────────────────────────────────────────────────────────────────────────
// AUTH
// ─────────────────────────────────────────────────────────────────────────────

export function getStoredRep() {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("hustad_rep");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function getAuthHeaders(): Record<string, string> {
  // Authentication is now handled by NextAuth session cookies automatically
  return { "Content-Type": "application/json" };
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
    const res = await fetch(`${API_BASE}/api/sessions`, {
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

  const res = await fetch(`${API_BASE}/api/photos`, {
    method: "POST",
    headers: getAuthHeaders(),
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

// ─────────────────────────────────────────────────────────────────────────────
// SESSION RETRY HELPERS
// ─────────────────────────────────────────────────────────────────────────────

const SYNC_COOLDOWN_MS = 30_000;

// Retry syncing a single session. Pass force=true to bypass the 30-second
// cooldown (used for manual "Retry Sync" button clicks).
export async function retrySyncSession(
  session: SessionState,
  force = false
): Promise<boolean> {
  if (session.syncStatus === "syncing") return false;

  if (!force && session.lastSyncAttemptAt) {
    const elapsed = Date.now() - new Date(session.lastSyncAttemptAt).getTime();
    if (elapsed < SYNC_COOLDOWN_MS) return false;
  }

  // Always work off the freshest locally-stored copy
  const current = loadDraftById(session.sessionId) ?? session;
  if (!force && current.syncStatus === "syncing") return false;

  markSessionSyncing(current.sessionId);

  try {
    const ok = await syncSessionToServer({ ...current, syncStatus: "syncing" });
    if (!ok) {
      markSessionSyncError(current.sessionId, "Server sync failed");
      return false;
    }

    // Pipeline sessions also require a status patch on the lead record
    if (current.pipelineLeadId) {
      const patchRes = await fetch(`/api/pipeline/${current.pipelineLeadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pipeline_status: "inspection_in_progress" }),
      });
      if (!patchRes.ok) {
        markSessionSyncError(
          current.sessionId,
          `Pipeline PATCH failed: HTTP ${patchRes.status}`
        );
        return false;
      }
    }

    markSessionSynced(current.sessionId);
    return true;
  } catch (err) {
    markSessionSyncError(
      current.sessionId,
      err instanceof Error ? err.message : "Sync failed"
    );
    return false;
  }
}

// Retry all unsynced/error sessions for a rep. Never throws — returns counts.
export async function retryAllUnsyncedSessions(
  repId: string
): Promise<{ success: number; failed: number }> {
  const sessions = getUnsyncedSessions(repId);
  let success = 0;
  let failed = 0;

  for (const session of sessions) {
    try {
      const ok = await retrySyncSession(session);
      if (ok) success++;
      else failed++;
    } catch {
      failed++;
    }
  }

  return { success, failed };
}

// ─────────────────────────────────────────────────────────────────────────────
// CLOUD PHOTO SYNC (v2)
// ─────────────────────────────────────────────────────────────────────────────

export async function uploadPhotoToCloud(
  session: SessionState,
  photo: InspectionPhoto
): Promise<InspectionPhoto> {
  // Try to get blob from IndexedDB first; fall back to localUri base64
  let base64: string | null = null;

  const blob = await getPhotoBlob(photo.storageKey);
  if (blob) {
    base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } else if (photo.localUri) {
    base64 = photo.localUri;
  }

  if (!base64) {
    return { ...photo, syncStatus: "error", syncError: "Local file not found" };
  }

  try {
    // Route through the authenticated server-side endpoint so the service key
    // is used for the storage upload — bypasses all storage RLS policies.
    const res = await fetch("/api/photo-upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: session.sessionId,
        photoId: photo.id,
        base64,
        category: photo.category,
        label: photo.label,
        section: photo.section,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
      throw new Error(err.error || `Upload failed (${res.status})`);
    }

    const { publicUrl, storagePath } = await res.json();

    return {
      ...photo,
      syncStatus: "synced",
      remoteUrl: publicUrl,
      storagePath,
      lastSyncedAt: new Date().toISOString(),
      syncError: undefined,
    };
  } catch (err: any) {
    console.error("[PHOTO_SYNC] Upload failed:", err);
    return {
      ...photo,
      syncStatus: "error",
      syncError: err.message,
      lastSyncAttemptAt: new Date().toISOString(),
      retryCount: (photo.retryCount || 0) + 1,
    };
  }
}

export async function retryPhotoSync(
  session: SessionState,
  photoId: string,
  onUpdate: (s: SessionState) => void
): Promise<boolean> {
  const photos = session.photos || [];
  const photo = photos.find(p => p.id === photoId);
  if (!photo || photo.syncStatus === "syncing") return false;

  const syncingPhoto = { ...photo, syncStatus: "syncing" as const };
  onUpdate({
    ...session,
    photos: photos.map(p => p.id === photoId ? syncingPhoto : p)
  });

  const result = await uploadPhotoToCloud(session, syncingPhoto);
  
  onUpdate({
    ...session,
    photos: (session.photos || []).map(p => p.id === photoId ? result : p)
  });

  return result.syncStatus === "synced";
}

/**
 * Background loop to sync all local photos for a session
 */
export async function syncAllPhotos(
  session: SessionState,
  onUpdate: (s: SessionState) => void
) {
  const photos = session.photos || [];
  const unsynced = photos.filter(p => p.syncStatus === "local" || p.syncStatus === "error");
  
  if (unsynced.length === 0) return;

  for (const photo of unsynced) {
    // Basic cooldown (60 sec) for errors
    if (photo.syncStatus === "error" && photo.lastSyncAttemptAt) {
      const elapsed = Date.now() - new Date(photo.lastSyncAttemptAt).getTime();
      if (elapsed < 60000) continue;
    }

    await retryPhotoSync(session, photo.id, onUpdate);
  }
}
