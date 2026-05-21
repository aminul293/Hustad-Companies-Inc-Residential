import re

# 1. Update useRepCommandCenter.ts to export setLiveReps
with open("src/components/repcommand/useRepCommandCenter.ts", "r") as f:
    text_hook = f.read()

text_hook = text_hook.replace("liveReps, isAdding, setIsAdding, newRep, setNewRep,", "liveReps, setLiveReps, isAdding, setIsAdding, newRep, setNewRep,")

with open("src/components/repcommand/useRepCommandCenter.ts", "w") as f:
    f.write(text_hook)

# 2. Update RepCommandCenter.tsx missing replacements
with open("src/components/RepCommandCenter.tsx", "r") as f:
    text_tsx = f.read()

text_tsx = text_tsx.replace("value={newRep.name}", "value={r.newRep.name}")
text_tsx = text_tsx.replace("...newRep", "...r.newRep")
text_tsx = text_tsx.replace("value={newRep.role}", "value={r.newRep.role}")

with open("src/components/RepCommandCenter.tsx", "w") as f:
    f.write(text_tsx)

print("done")
