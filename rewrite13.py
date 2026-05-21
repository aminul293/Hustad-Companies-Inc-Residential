with open("src/components/RepCommandCenter.tsx", "r") as f:
    lines = f.readlines()

map_replacement = """                {r.filteredDrafts.map(d => (
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

# The map block is from line 1005 to 1153 (inclusive). So indices 1004 to 1153
# Let's verify the lines first
assert "filteredDrafts.map" in lines[1004]
assert "                ))}" in lines[1152]

lines[1004:1153] = [map_replacement]

with open("src/components/RepCommandCenter.tsx", "w") as f:
    f.writelines(lines)

print("Map replaced")
