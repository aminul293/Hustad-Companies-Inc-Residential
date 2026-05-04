import { FIELD_REPS, type RepIdentity } from "@/config/reps";

const STORAGE_KEY = "hustad_reps_v1";

/**
 * Loads all reps, merging the static config with any custom reps added via UI.
 */
export function getLiveReps(): RepIdentity[] {
  if (typeof window === "undefined") return FIELD_REPS;
  try {
    const custom = localStorage.getItem(STORAGE_KEY);
    if (!custom) return FIELD_REPS;
    
    const parsed = JSON.parse(custom) as RepIdentity[];
    // Merge: Static reps stay, but can be overridden or supplemented by custom ones
    return [...FIELD_REPS, ...parsed];
  } catch {
    return FIELD_REPS;
  }
}

export function saveCustomRep(rep: RepIdentity): void {
  if (typeof window === "undefined") return;
  const current = getCustomReps();
  const index = current.findIndex(r => r.id === rep.id);
  
  if (index >= 0) {
    current[index] = rep;
  } else {
    current.push(rep);
  }
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
}

export function deleteCustomRep(id: string): void {
  if (typeof window === "undefined") return;
  const filtered = getCustomReps().filter(r => r.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
}

function getCustomReps(): RepIdentity[] {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : [];
}
