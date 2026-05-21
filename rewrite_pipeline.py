import re

file_path = "src/components/PipelineLeads.tsx"

with open(file_path, "r") as f:
    content = f.read()

# 1. Replace imports
# Find the start of "import {" and the end of the imports
# We will just replace everything from 'import { useState' up to 'export function PipelineLeads'
import_replacement = """import {
  Phone, Calendar, MessageSquare, User, Clock, XCircle, AlertCircle,
  PlayCircle, ArrowLeft, MinusCircle, CalendarDays, CheckCircle2,
  Activity, Flame, ChevronRight, ChevronLeft, X, AlertTriangle, PenLine, Mail
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

import {
  PipelineLead, STATUS_CONFIG, STAGE_MAP, BLOCKED_STATUSES,
  STAGE_STATUSES, STAGE_LABELS, STAGE_HINTS, TIME_SLOTS, DURATIONS,
  addDays, fmtDate, fmtTime, daysSince, callTimestamp,
  resolvePhone, resolveEmail, noteEntryIcon, parseNoteEntries,
} from "./pipeline/pipelineTypes";
import { ScheduleModal } from "./pipeline/ScheduleModal";
import { NotesPanel } from "./pipeline/NotesPanel";
import {
  CallModal, DraftEmailModal, EditPhoneModal, EditEmailModal,
  FollowUpModal, DeadLeadModal, ConfirmRemoveModal, BlockedModal, StageBackModal,
} from "./pipeline/PipelineModals";
import { usePipelineLeads } from "./pipeline/usePipelineLeads";

interface PipelineLeadsProps {
  repId?: string;
  repEmail?: string;
}

export function PipelineLeads({ repId, repEmail }: PipelineLeadsProps) {"""

# Replace from 'import { useState' to 'export function PipelineLeads... {'
start_import = content.find('import { useState')
end_import = content.find('export function PipelineLeads')
end_import = content.find('{', end_import) + 1

content = content[:start_import] + import_replacement + content[end_import:]

# 2. Find where the return statement starts
return_start = content.find('  return (')

# 3. Delete everything between 'export function PipelineLeads... {' and 'return ('
# Wait, we already replaced the signature. Let's find the signature we just inserted.
sig_end = content.find('export function PipelineLeads({ repId, repEmail }: PipelineLeadsProps) {') + len('export function PipelineLeads({ repId, repEmail }: PipelineLeadsProps) {')
return_start = content.find('  return (', sig_end)

if return_start == -1:
    print("Could not find return statement")
    exit(1)

# Keep the top part
top_part = content[:sig_end] + "\n  const p = usePipelineLeads(repId, repEmail);\n"

# 4. The JSX part
jsx_part = content[return_start:]

# Remove notesRef entirely from JSX
# Wait, notesRef was passed to something? In PipelineLeads.tsx it was removed. NotesPanel.tsx uses it internally.
# It shouldn't be in the JSX anymore because we replaced the Modals earlier.

vars = [
    "leads", "isLoading", "removing", "stats",
    "deadLeadModal", "confirmModal", "blockedModal", "schedModal",
    "callModal", "editPhoneModal", "editEmailModal", "draftEmailModal",
    "followModal", "stageBackModal", "notesPanel",
    "schedDate", "schedTime", "schedDuration", "clashWarning", "scheduling",
    "setSchedDate", "setSchedTime", "setSchedDuration",
    "callOutcome", "callNote", "setCallOutcome", "setCallNote",
    "followDate", "followReason", "followNote",
    "setFollowDate", "setFollowReason", "setFollowNote",
    "editPhoneValue", "editEmailValue", "setEditPhoneValue", "setEditEmailValue",
    "notesText", "setNotesText",
    "emailSending", "emailSent", "emailError",
    "setDraftEmailModal",
    "handleCall", "confirmCall",
    "handleDeadLead", "confirmDeadLead",
    "handleStartInspection", "handleStageClick", "confirmStageBack",
    "openSchedModal", "confirmSchedule",
    "openFollowModal", "confirmFollowUp",
    "openNotes", "saveNotes",
    "openEditPhone", "savePhone",
    "openEditEmail", "saveEmail",
    "openDraftEmail", "sendDraftEmail",
    "handleRemoveClick", "confirmRemove", "confirmForceRemove",
    "setDeadLeadModal", "setConfirmModal", "setBlockedModal",
    "setSchedModal", "setCallModal", "setEditPhoneModal",
    "setEditEmailModal", "setFollowModal", "setStageBackModal", "setNotesPanel"
]

for v in vars:
    # We want to match `v` as a whole word.
    # It must not be preceded by a word character or a dot (except we want to allow `...v`).
    # A safe way in python: replace all occurrences, then fix `...p.v` if needed.
    # Let's use a function to determine if it should be replaced.
    def replacer(match):
        prefix = match.group(1)
        word = match.group(2)
        suffix = match.group(3)
        
        # if prefix is a word character or dot (and not '...'), do not replace
        if prefix.endswith('.') and not prefix.endswith('...'):
            return match.group(0)
            
        # if suffix is ':' or '=', do not replace
        if suffix.startswith(':') or suffix.startswith('='):
            return match.group(0)
            
        return prefix + "p." + word + suffix

    # prefix can be any non-word char or empty. 
    # To handle `...`, we just match it.
    pattern = r'(^|[^a-zA-Z0-9_])(' + v + r')([^a-zA-Z0-9_]|$)'
    jsx_part = re.sub(pattern, replacer, jsx_part)
    # run twice to handle overlapping boundaries
    jsx_part = re.sub(pattern, replacer, jsx_part)

new_content = top_part + jsx_part

with open(file_path, "w") as f:
    f.write(new_content)

print("Replacement done!")
