import re

with open("src/components/PipelineLeads.tsx", "r") as f:
    text = f.read()

# 1. Replace imports
import_target = """import {
  Phone, Calendar, MessageSquare, User, Clock, XCircle, AlertCircle,
  PlayCircle, ArrowLeft, MinusCircle, CalendarDays, CheckCircle2,
  Activity, Flame, ChevronRight, ChevronLeft, X, AlertTriangle, PenLine, Mail
} from "lucide-react";
import { cn } from "@/lib/utils";

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
import { motion, AnimatePresence } from "framer-motion";"""

import_replacement = """import { ArrowLeft, Activity, CalendarDays, Phone } from "lucide-react";
import { cn } from "@/lib/utils";

import { ScheduleModal } from "./pipeline/ScheduleModal";
import { NotesPanel } from "./pipeline/NotesPanel";
import {
  CallModal, DraftEmailModal, EditPhoneModal, EditEmailModal,
  FollowUpModal, DeadLeadModal, ConfirmRemoveModal, BlockedModal, StageBackModal,
} from "./pipeline/PipelineModals";
import { usePipelineLeads } from "./pipeline/usePipelineLeads";
import { PipelineLeadCard } from "./pipeline/PipelineLeadCard";
import { AnimatePresence } from "framer-motion";"""

if import_target in text:
    text = text.replace(import_target, import_replacement)
else:
    print("Warning: Import target not found, doing loose replacement")
    # if it fails, we will manually replace using python logic

# 2. Extract map block
# Find '{p.leads.map((lead) => {' and matching end tag
# We can just look for the start and the end of the map
start_map = text.find("{p.leads.map((lead) => {")
if start_map != -1:
    end_map = text.find("            })}\n          </AnimatePresence>", start_map)
    if end_map != -1:
        map_replacement = """{p.leads.map((lead) => (
              <PipelineLeadCard
                key={lead.id}
                lead={lead}
                repId={repId}
                removing={p.removing === lead.id}
                onStageClick={p.handleStageClick}
                onCall={p.handleCall}
                onFollowUp={p.openFollowModal}
                onSchedule={p.openSchedModal}
                onStartInspection={p.handleStartInspection}
                onNotes={p.openNotes}
                onDraftEmail={p.openDraftEmail}
                onEditPhone={p.openEditPhone}
                onEditEmail={p.openEditEmail}
                onDeadLead={p.handleDeadLead}
                onRemove={p.handleRemoveClick}
              />
            ))}"""
        text = text[:start_map] + map_replacement + text[end_map:]
    else:
        print("End of map not found")
else:
    print("Start of map not found")

with open("src/components/PipelineLeads.tsx", "w") as f:
    f.write(text)

print("Rewrite done")
