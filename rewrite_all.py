import re

with open("src/components/RepCommandCenter.tsx", "r") as f:
    text = f.read()

# 1. Imports cleanup and adding new ones
imports_to_add = """import {
  useRepCommandCenter, IntakePrefill, CommandCenterView,
} from "./repcommand/useRepCommandCenter";
import { SessionCard }        from "./repcommand/SessionCard";
import { ImportConfirmModal } from "./repcommand/ImportConfirmModal";
import { MobileMoreDrawer }   from "./repcommand/MobileMoreDrawer";
"""

# Replace the block from `function isValidAddress` all the way to `return (` inside `RepCommandCenter`
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

text = text.replace('import { CenterPointJobs } from "@/components/CenterPointJobs";', imports_to_add + 'import { CenterPointJobs } from "@/components/CenterPointJobs";')

# 2. Variable prefix replacements for JSX
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
jsx_part = text[jsx_start:]
top_part = text[:jsx_start]

for v in vars_to_prefix:
    jsx_part = re.sub(rf'(?<![\w.]){v}\b(?!\s*:)', f'r.{v}', jsx_part)

# 3. Prompt 14 Specific Replacements

# SessionCard Map Block
pattern_map = r'\{r\.filteredDrafts\.map\(\(d\) => \([\s\S]*?\}\)'
replacement_map = """{r.filteredDrafts.map(d => (
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
              ))}"""
jsx_part = re.sub(pattern_map, replacement_map, jsx_part, count=1)

# Import confirmation modal
pattern_modal = r'\{\/\* Import confirmation modal \*\/\}\s*<AnimatePresence>[\s\S]*?<\/AnimatePresence>'
replacement_modal = """{/* Import confirmation modal */}
      <ImportConfirmModal
        pendingImport={r.pendingImport}
        isConfirming={r.isConfirming}
        onConfirm={r.handleConfirmImport}
        onDismiss={r.handleDismissImport}
      />"""
jsx_part = re.sub(pattern_modal, replacement_modal, jsx_part, count=1)

# Mobile "More" Drawer
pattern_drawer = r'\{\/\* Mobile "More" Drawer \*\/\}\s*<AnimatePresence>[\s\S]*?<\/AnimatePresence>'
replacement_drawer = """{/* Mobile "More" Drawer */}
      <MobileMoreDrawer
        open={r.moreOpen}
        view={r.view}
        onNavigate={v => { r.setView(v); r.setMoreOpen(false); }}
        onClose={() => r.setMoreOpen(false)}
        onNewSession={onNewSession}
      />"""
jsx_part = re.sub(pattern_drawer, replacement_drawer, jsx_part, count=1)

# Fix pendingPrefill! and pendingDuplicate!
jsx_part = jsx_part.replace("onPrefillAndStart(r.pendingPrefill)", "onPrefillAndStart(r.pendingPrefill!)")
jsx_part = jsx_part.replace("onLoadDraft(r.pendingDuplicate.sessionId)", "onLoadDraft(r.pendingDuplicate!.sessionId)")

# Fix missing newRep inside `setNewRep` spreads
jsx_part = jsx_part.replace("...newRep", "...r.newRep")
jsx_part = jsx_part.replace("setLiveReps(getLiveReps());", "r.setLiveReps(getLiveReps());")


with open("src/components/RepCommandCenter.tsx", "w") as f:
    f.write(top_part + jsx_part)

print("done")
