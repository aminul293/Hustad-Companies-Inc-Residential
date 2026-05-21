import re

with open("src/components/RepCommandCenter.tsx", "r") as f:
    text = f.read()

# 1. First remove the top part
start_marker = "function isValidAddress(addr: string | undefined | null): addr is string {"
end_marker = "  return (\n    <div className=\"flex flex-col h-full bg-[#060606] text-[#E8EDF8]\">"

if start_marker in text and end_marker in text:
    start_idx = text.find(start_marker)
    end_idx = text.find(end_marker)
    
    replacement = """import {
  useRepCommandCenter, IntakePrefill, CommandCenterView,
} from "./repcommand/useRepCommandCenter";

interface Props {
  currentRep: AuthenticatedRep;
  onLoadDraft: (id: string) => void;
  onNewSession: () => void;
  onPrefillAndStart: (data: IntakePrefill) => void;
  onBack?: () => void;
  onResetSession?: () => void;
}

export function RepCommandCenter({ currentRep, onLoadDraft, onNewSession, onPrefillAndStart, onBack, onResetSession }: Props) {
  const r = useRepCommandCenter({ currentRep, onLoadDraft, onPrefillAndStart, onResetSession });

"""
    top_part = text[:start_idx] + replacement
    jsx_part = text[end_idx:]
else:
    print("Could not find start/end markers for replacement 1")
    exit(1)

# Variables to prefix with `r.`
vars_to_prefix = [
    "view", "setView",
    "search", "setSearch",
    "filter", "setFilter",
    "liveReps", "isAdding", "setIsAdding", "newRep", "setNewRep", "handleAddRep",
    "isLoading", "scheduledLeads", "drafts", "filteredDrafts", "stats",
    "pendingImport", "pendingPrefill", "setPendingPrefill",
    "pendingDuplicate", "setPendingDuplicate",
    "importError", "setImportError", "importSuccess", "setImportSuccess",
    "isConfirming", "handleConfirmImport", "handleDismissImport",
    "retryingSessionId", "handleManualRetry",
    "confirmDeleteId", "handleDeleteDraft",
    "copiedSessionId", "setCopiedSessionId",
    "moreOpen", "setMoreOpen",
    "syncWarning", "setSyncWarning", "pendingCompletions"
]

# Be careful not to replace object properties like `d.view` if they existed, though none do here.
# We also want to replace `d.sessionId` in the inline delete but it says "The delete handler in the session card inline JSX should now call `r.handleDeleteDraft(d.sessionId)` instead of the inline logic block."
# Let's handle the specific `deleteDraft` block separately.

# Replace whole words that are not preceded by a dot
for v in vars_to_prefix:
    # (?<![\\w.]) ensures we don't match something.view or Someview
    # (?!\\s*:) ensures we don't match view: "dashboard" inside an object literal
    jsx_part = re.sub(rf'(?<![\w.]){v}\b(?!\s*:)', f'r.{v}', jsx_part)

# Also handle the specific delete inline logic:
# `onClick={() => { deleteDraft(d.sessionId); ... }}` or similar.
# The prompt says: "The delete handler in the session card inline JSX should now call `r.handleDeleteDraft(d.sessionId)` instead of the inline logic block."
# Let's search for the old delete logic in the JSX.
# It probably looks like `deleteDraft(d.sessionId);` or something.
old_delete_block = """onClick={(e) => {
                                  e.stopPropagation();
                                  if (confirmDeleteId !== d.sessionId) {
                                    setConfirmDeleteId(d.sessionId);
                                    return;
                                  }
                                  // Perform delete
                                  let isActive = false;
                                  try {
                                    const activeRaw = localStorage.getItem("hustad_session_draft");
                                    if (activeRaw) {
                                      const active = JSON.parse(activeRaw);
                                      if (active?.sessionId === d.sessionId) isActive = true;
                                    }
                                  } catch {}
                                  deleteDraft(d.sessionId);
                                  if (d.syncStatus === "synced") {
                                    fetch(`/api/sessions/${d.sessionId}`, { method: "DELETE" }).catch(() => {});
                                  }
                                  setServerSessions(prev => prev.filter(s => s.session_id !== d.sessionId));
                                  setDraftRefreshKey(k => k + 1);
                                  setConfirmDeleteId(null);
                                  if (isActive && onResetSession) {
                                    onResetSession();
                                  }
                                }}"""
# Wait, I don't know the exact string. Let's just use regex to replace `onClick={(e) => { ... setConfirmDeleteId(null); ... }}` with `onClick={(e) => { e.stopPropagation(); r.handleDeleteDraft(d.sessionId); }}`.
# I will output the file then manually check `handleDeleteDraft`.

with open("src/components/RepCommandCenter.tsx", "w") as f:
    f.write(top_part + jsx_part)

print("Rewrite 5 done")
