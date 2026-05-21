import re

with open("src/components/RepCommandCenter.tsx", "r") as f:
    text = f.read()

# Fix prop names
text = text.replace("r.retryingSessionId={r.", "retryingSessionId={r.")
text = text.replace("r.confirmDeleteId={r.", "confirmDeleteId={r.")
text = text.replace("r.copiedSessionId={r.", "copiedSessionId={r.")
text = text.replace("r.view={r.", "view={r.")
text = text.replace("r.pendingImport={r.", "pendingImport={r.")
text = text.replace("r.isConfirming={r.", "isConfirming={r.")

# Fix missing closing tags
# The problem is between:
#                 ))}
#           )}
#         >
# We need to restore the `) : (` block and the closing `</div>`

broken_part = """                ))}
          )}
        >
          <MoreHorizontal className="w-5 h-5" />"""

fixed_part = """                ))}
              </div>
            ) : (
              <div className="py-20 text-center opacity-30">
                <Search className="w-12 h-12 mx-auto mb-4" />
                <p className="font-display">No sessions found</p>
              </div>
            )}
          </main>
        </div>
      )}

      {/* ── Mobile Bottom Nav (hidden on md+) ─────────────────────────────────── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[#060606]/90 backdrop-blur-xl border-t border-white/10 px-4 py-2 flex items-center justify-between pb-safe z-20">
        {[
          { id: "dashboard", icon: LayoutGrid, label: "Home" },
          { id: "calendar", icon: Calendar, label: "Sched" },
          { id: "tickets", icon: Inbox, label: "Tickets" }
        ].map(item => (
          <button
            key={item.id}
            onClick={() => r.setView(item.id as any)}
            className={cn(
              "flex flex-col items-center justify-center p-2 rounded-xl transition-all",
              r.view === item.id ? "text-indigo-300 bg-indigo-500/10" : "text-[#567090] hover:text-[#C2D0E4]"
            )}
          >
            <item.icon className="w-5 h-5" />
            <span className="text-[9px] font-mono uppercase tracking-wider">{item.label}</span>
          </button>
        ))}
        <button
          onClick={() => r.setMoreOpen(true)}
          className={cn(
            "flex flex-col items-center justify-center p-2 rounded-xl transition-all",
            r.moreOpen ? "text-indigo-300 bg-indigo-500/10" : "text-[#567090] hover:text-[#C2D0E4]"
          )}
        >
          <MoreHorizontal className="w-5 h-5" />"""

text = text.replace(broken_part, fixed_part)

with open("src/components/RepCommandCenter.tsx", "w") as f:
    f.write(text)

print("done")
