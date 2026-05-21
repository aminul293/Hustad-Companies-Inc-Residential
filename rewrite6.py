import re

with open("src/components/RepCommandCenter.tsx", "r") as f:
    text = f.read()

target = """                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (r.confirmDeleteId === d.sessionId) {
                              const activeRaw = localStorage.getItem("hustad_session_draft");
                              let isActive = false;
                              if (activeRaw) {
                                try {
                                  const active = JSON.parse(activeRaw);
                                  if (active && active.sessionId === d.sessionId) {
                                    isActive = true;
                                  }
                                } catch {}
                              }

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
                            } else {
                              setConfirmDeleteId(d.sessionId);
                            }
                          }}"""
replacement = """                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            r.handleDeleteDraft(d.sessionId);
                          }}"""

text = text.replace(target, replacement)

with open("src/components/RepCommandCenter.tsx", "w") as f:
    f.write(text)

print("done")
