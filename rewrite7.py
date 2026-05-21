import re

with open("src/components/RepCommandCenter.tsx", "r") as f:
    text = f.read()

text = text.replace("onPrefillAndStart(r.pendingPrefill)", "onPrefillAndStart(r.pendingPrefill!)")
text = text.replace("onLoadDraft(r.pendingDuplicate.sessionId)", "onLoadDraft(r.pendingDuplicate!.sessionId)")

# Fix missing newRep
text = text.replace("value={newRep.name}", "value={r.newRep.name}")
text = text.replace("onChange={(e) => r.setNewRep({ ...newRep, name: e.target.value })}", "onChange={(e) => r.setNewRep({ ...r.newRep, name: e.target.value })}")
text = text.replace("value={newRep.role}", "value={r.newRep.role}")
text = text.replace("onChange={(e) => r.setNewRep({ ...newRep, role: e.target.value })}", "onChange={(e) => r.setNewRep({ ...r.newRep, role: e.target.value })}")

# Fix missing setLiveReps
text = text.replace("setLiveReps(getLiveReps());", "r.setLiveReps(getLiveReps());")

# Export IntakePrefill
export_statement = "export type { IntakePrefill };\n\ninterface Props {"
if "interface Props {" in text:
    text = text.replace("interface Props {", export_statement)

with open("src/components/RepCommandCenter.tsx", "w") as f:
    f.write(text)

print("done")
