import re

with open("src/components/RepCommandCenter.tsx", "r") as f:
    text = f.read()

# 1. Add imports
imports_to_add = """import {
  useRepCommandCenter, IntakePrefill, CommandCenterView,
} from "./repcommand/useRepCommandCenter";
import { SessionCard }        from "./repcommand/SessionCard";
import { ImportConfirmModal } from "./repcommand/ImportConfirmModal";
import { MobileMoreDrawer }   from "./repcommand/MobileMoreDrawer";
"""
text = text.replace('import { CenterPointJobs } from "@/components/CenterPointJobs";', imports_to_add + 'import { CenterPointJobs } from "@/components/CenterPointJobs";')

# 2. Extract state to hook (Prompt 13)
start_marker = "function isValidAddress(addr: string | undefined | null): addr is string {"
end_marker = "  return (\n    <div className=\"flex flex-col h-full bg-[#060606] text-[#E8EDF8]\">"

start_idx = text.find(start_marker)
end_idx = text.find(end_marker)

replacement_top = """export type { IntakePrefill };

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
text = text[:start_idx] + replacement_top + text[end_idx:]

# 3. Apply r. prefix
vars_to_prefix = [
    "view", "setView",
    "search", "setSearch",
    "filter", "setFilter",
    "liveReps", "setLiveReps", "isAdding", "setIsAdding", "newRep", "setNewRep", "handleAddRep",
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

jsx_start = text.find('return (')
top_part = text[:jsx_start]
jsx_part = text[jsx_start:]

for v in vars_to_prefix:
    jsx_part = re.sub(rf'(?<![\w.]){v}\b(?!\s*:)', f'r.{v}', jsx_part)

# Fix incorrectly prefixed prop names
jsx_part = jsx_part.replace("r.view=", "view=")
jsx_part = jsx_part.replace("r.retryingSessionId=", "retryingSessionId=")
jsx_part = jsx_part.replace("r.confirmDeleteId=", "confirmDeleteId=")
jsx_part = jsx_part.replace("r.copiedSessionId=", "copiedSessionId=")
jsx_part = jsx_part.replace("r.pendingImport=", "pendingImport=")
jsx_part = jsx_part.replace("r.isConfirming=", "isConfirming=")

# Fix array methods that were accidentally prefixed (like filter inside setServerSessions)
# Actually `filter` was prefixed: `prev.r.filter` because of `(?<![\w.])`. But wait, it's `prev.filter` so it IS preceded by a dot! So `(?<![\w.])` WILL NOT match it! It is safe.
# What about `Search`? It's uppercase, our regex matches `search` exact case. Safe.

# Minor TS fixes
jsx_part = jsx_part.replace("onPrefillAndStart(r.pendingPrefill)", "onPrefillAndStart(r.pendingPrefill!)")
jsx_part = jsx_part.replace("onLoadDraft(r.pendingDuplicate.sessionId)", "onLoadDraft(r.pendingDuplicate!.sessionId)")
jsx_part = jsx_part.replace("...newRep", "...r.newRep")
jsx_part = jsx_part.replace("setLiveReps(getLiveReps());", "r.setLiveReps(getLiveReps());")

# 4. Extract UI components (Prompt 14)

# 4a. Map Block
map_start_str = "                {r.filteredDrafts.map((d) => ("
map_end_str = "              </div>\n            ) : ("

start_map = jsx_part.find(map_start_str)
end_map = jsx_part.find(map_end_str, start_map)

replacement_map = """                {r.filteredDrafts.map(d => (
                  <SessionCard
                    key={d.sessionId}
                    draft={d}
                    retryingSessionId={r.retryingSessionId}
                    confirmDeleteId={r.confirmDeleteId}
                    copiedSessionId={r.copiedSessionId}
                    onOpen={onLoadDraft}
                    onRetry={r.handleManualRetry}
                    onDelete={r.handleDeleteDraft}
                    onCopy={sessionId => {
                      const url = `${typeof window !== "undefined" ? window.location.origin : ""}/rep-capture?s=${sessionId}`;
                      navigator.clipboard.writeText(url);
                      r.setCopiedSessionId(sessionId);
                      setTimeout(() => r.setCopiedSessionId(null), 2000);
                    }}
                  />
                ))}
"""

if start_map != -1 and end_map != -1:
    jsx_part = jsx_part[:start_map] + replacement_map + jsx_part[end_map:]
else:
    print("WARNING: Map block not found!")

# 4b. Mobile "More" Drawer
drawer_start_str = "      {/* ── Mobile \"More\" Drawer ───────────────────────────────────────────────── */}"
drawer_end_str = "      </AnimatePresence>"

start_drawer = jsx_part.find(drawer_start_str)
end_drawer = jsx_part.find(drawer_end_str, start_drawer) + len(drawer_end_str)

replacement_drawer = """      {/* Mobile "More" Drawer */}
      <MobileMoreDrawer
        open={r.moreOpen}
        view={r.view}
        onNavigate={v => { r.setView(v); r.setMoreOpen(false); }}
        onClose={() => r.setMoreOpen(false)}
        onNewSession={onNewSession}
      />"""

if start_drawer != -1 and end_drawer != -1:
    jsx_part = jsx_part[:start_drawer] + replacement_drawer + jsx_part[end_drawer:]
else:
    print("WARNING: Drawer block not found!")


# 4c. Import confirmation modal
modal_start_str = "      {/* Import confirmation modal */}"
modal_end_str = "      </AnimatePresence>"

start_modal = jsx_part.find(modal_start_str)
end_modal = jsx_part.find(modal_end_str, start_modal) + len(modal_end_str)

replacement_modal = """      {/* Import confirmation modal */}
      <ImportConfirmModal
        pendingImport={r.pendingImport}
        isConfirming={r.isConfirming}
        onConfirm={r.handleConfirmImport}
        onDismiss={r.handleDismissImport}
      />"""

if start_modal != -1 and end_modal != -1:
    jsx_part = jsx_part[:start_modal] + replacement_modal + jsx_part[end_modal:]
else:
    print("WARNING: Modal block not found!")


with open("src/components/RepCommandCenter.tsx", "w") as f:
    f.write(top_part + jsx_part)

print("done")
