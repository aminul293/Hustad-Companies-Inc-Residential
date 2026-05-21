import re

with open("src/components/RepCommandCenter.tsx", "r") as f:
    text = f.read()

# 1. Map replacement
map_start = "r.filteredDrafts.map((d) => ("
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

with open("src/components/RepCommandCenter.tsx", "w") as f:
    f.write(text)

print("done")
