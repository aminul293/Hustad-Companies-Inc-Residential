import re

with open("src/components/RepCommandCenter.tsx", "r") as f:
    text = f.read()

# 1. Imports
imports = """import { SessionCard }        from "./repcommand/SessionCard";
import { ImportConfirmModal } from "./repcommand/ImportConfirmModal";
import { MobileMoreDrawer }   from "./repcommand/MobileMoreDrawer";\n"""
text = text.replace('import { CenterPointJobs } from "@/components/CenterPointJobs";', imports + 'import { CenterPointJobs } from "@/components/CenterPointJobs";')

# 2. Map block
# We find {r.filteredDrafts.map((d) => (
# and we know it ends with exactly:
#                      </div>
#                    </div>
#                  </div>
#                </div>
#              ))}
# Let's use regex DOTALL
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
text = re.sub(pattern_map, replacement_map, text, count=1)

# 3. Import confirm modal
# Find {/* Import confirmation modal */} to </AnimatePresence>
pattern_modal = r'\{\/\* Import confirmation modal \*\/\}\s*<AnimatePresence>[\s\S]*?<\/AnimatePresence>'
replacement_modal = """{/* Import confirmation modal */}
      <ImportConfirmModal
        pendingImport={r.pendingImport}
        isConfirming={r.isConfirming}
        onConfirm={r.handleConfirmImport}
        onDismiss={r.handleDismissImport}
      />"""
text = re.sub(pattern_modal, replacement_modal, text, count=1)

# 4. Mobile "More" Drawer
pattern_drawer = r'\{\/\* Mobile "More" Drawer \*\/\}\s*<AnimatePresence>[\s\S]*?<\/AnimatePresence>'
replacement_drawer = """{/* Mobile "More" Drawer */}
      <MobileMoreDrawer
        open={r.moreOpen}
        view={r.view}
        onNavigate={v => { r.setView(v); r.setMoreOpen(false); }}
        onClose={() => r.setMoreOpen(false)}
        onNewSession={onNewSession}
      />"""
text = re.sub(pattern_drawer, replacement_drawer, text, count=1)

with open("src/components/RepCommandCenter.tsx", "w") as f:
    f.write(text)

print("done")
