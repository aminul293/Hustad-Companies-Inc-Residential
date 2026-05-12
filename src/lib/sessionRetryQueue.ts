const QUEUE_KEY = "pendingSessionCompletions";
export const MAX_RETRIES = 5;

export interface PendingCompletion {
  sessionId: string;
  sessionStatus: string;
  appointmentId?: string;
  retryCount: number;
  lastAttempt: number;
  queuedAt: number;
}

// Exponential backoff: 30s → 60s → 120s → 240s → 480s
function backoffMs(retryCount: number): number {
  return Math.min(30_000 * Math.pow(2, retryCount), 8 * 60_000);
}

export function isReadyForRetry(item: PendingCompletion): boolean {
  return Date.now() - item.lastAttempt >= backoffMs(item.retryCount);
}

export function enqueueCompletion(
  item: Pick<PendingCompletion, "sessionId" | "sessionStatus" | "appointmentId">
): void {
  const queue = getAllPending();
  const existingIdx = queue.findIndex(q => q.sessionId === item.sessionId);
  if (existingIdx >= 0) {
    // Already queued — update fields but preserve retry state
    queue[existingIdx] = { ...queue[existingIdx], ...item };
  } else {
    queue.push({ ...item, retryCount: 0, lastAttempt: Date.now(), queuedAt: Date.now() });
  }
  persist(queue);
}

export function dequeueCompletion(sessionId: string): void {
  persist(getAllPending().filter(q => q.sessionId !== sessionId));
}

export function getAllPending(): PendingCompletion[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) ?? "[]") as PendingCompletion[];
  } catch {
    return [];
  }
}

export function recordRetryAttempt(sessionId: string): void {
  const queue = getAllPending()
    .map(q =>
      q.sessionId === sessionId
        ? { ...q, retryCount: q.retryCount + 1, lastAttempt: Date.now() }
        : q
    )
    .filter(q => q.retryCount < MAX_RETRIES);
  persist(queue);
}

function persist(queue: PendingCompletion[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}
