import re

with open("src/components/RepCommandCenter.tsx", "r") as f:
    text = f.read()

# 1. Imports
imports = """import { SessionCard }        from "./repcommand/SessionCard";
import { ImportConfirmModal } from "./repcommand/ImportConfirmModal";
import { MobileMoreDrawer }   from "./repcommand/MobileMoreDrawer";\n"""
text = text.replace('import { CenterPointJobs } from "@/components/CenterPointJobs";', imports + 'import { CenterPointJobs } from "@/components/CenterPointJobs";')

# 2. Map replacement
map_start = "r.filteredDrafts.map(d => ("
map_end = """                      </div>
                    </div>
                  </div>
                </div>
              ))"""
map_search = text.find(map_start)
if map_search != -1:
    end_idx = text.find(map_end, map_search) + len(map_end)
    replacement = """r.filteredDrafts.map(d => (
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
              ))"""
    text = text[:map_search] + replacement + text[end_idx:]

# 3. Import confirm modal
import_modal_start = "{/* Import confirmation modal */}"
import_modal_end = "</AnimatePresence>"
if import_modal_start in text:
    idx_start = text.find(import_modal_start)
    idx_end = text.find(import_modal_end, idx_start) + len(import_modal_end)
    replacement = """{/* Import confirmation modal */}
      <ImportConfirmModal
        pendingImport={r.pendingImport}
        isConfirming={r.isConfirming}
        onConfirm={r.handleConfirmImport}
        onDismiss={r.handleDismissImport}
      />"""
    text = text[:idx_start] + replacement + text[idx_end:]

# 4. Mobile More Drawer
more_drawer_start = "{/* Mobile \"More\" Drawer */}"
more_drawer_end = "</AnimatePresence>"
if more_drawer_start in text:
    idx_start = text.find(more_drawer_start)
    idx_end = text.find(more_drawer_end, idx_start) + len(more_drawer_end)
    replacement = """{/* Mobile "More" Drawer */}
      <MobileMoreDrawer
        open={r.moreOpen}
        view={r.view}
        onNavigate={v => { r.setView(v); r.setMoreOpen(false); }}
        onClose={() => r.setMoreOpen(false)}
        onNewSession={onNewSession}
      />"""
    text = text[:idx_start] + replacement + text[idx_end:]

with open("src/components/RepCommandCenter.tsx", "w") as f:
    f.write(text)

print("done")
