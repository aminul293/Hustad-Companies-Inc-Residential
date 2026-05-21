"use client";

import { ArrowLeft, Activity, CalendarDays, Phone } from "lucide-react";
import { cn } from "@/lib/utils";

import { ScheduleModal } from "./pipeline/ScheduleModal";
import { NotesPanel } from "./pipeline/NotesPanel";
import {
  CallModal, DraftEmailModal, EditPhoneModal, EditEmailModal,
  FollowUpModal, DeadLeadModal, ConfirmRemoveModal, BlockedModal, StageBackModal,
} from "./pipeline/PipelineModals";
import { usePipelineLeads } from "./pipeline/usePipelineLeads";
import { PipelineLeadCard } from "./pipeline/PipelineLeadCard";
import { AnimatePresence } from "framer-motion";

interface PipelineLeadsProps {
  repId?: string;
  repEmail?: string;
}

export function PipelineLeads({ repId, repEmail }: PipelineLeadsProps) {
  const p = usePipelineLeads(repId, repEmail);

  return (
    <div className="p-4 md:p-8 space-y-6 md:space-y-8 overflow-y-auto h-full bg-black/20">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 md:gap-6">
        <div className="flex flex-row items-center gap-4 md:gap-6">
          <button
            onClick={() => window.dispatchEvent(new CustomEvent("changeView", { detail: "dashboard" }))}
            className="p-4 rounded-3xl bg-white/5 border border-white/10 hover:bg-white hover:text-black transition-all shadow-2xl"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <h2 className="text-3xl md:text-4xl font-display font-medium tracking-tight">Sales Pipeline</h2>
            <p className="text-[#567090] text-sm mt-1 font-light tracking-wide">Lead lifecycle and field conversion intelligence</p>
          </div>
        </div>

        <div className="flex flex-row overflow-x-auto pb-4 md:pb-0 -mx-4 px-4 md:mx-0 md:px-0 md:overflow-visible items-center gap-3 no-scrollbar shrink-0">
          {[
            { label: "Active Leads", value: p.stats.total,       sub: `${p.stats.urgent} need attention`, icon: Activity, color: "text-indigo-400" },
            { label: "Scheduled",    value: p.stats.scheduled,   sub: "upcoming inspections",            icon: CalendarDays, color: "text-emerald-400" },
            { label: "Avg Touches",  value: p.stats.avgAttempts, sub: "contact attempts",                icon: Phone, color: "text-sky-400" },
          ].map((s, i) => (
            <div key={i} className="px-5 py-4 rounded-[24px] bg-white/[0.03] border border-white/[0.08] min-w-[148px]">
              <p className="text-[9px] font-mono text-[#2D4060] uppercase tracking-[0.2em] mb-1">{s.label}</p>
              <div className="flex items-baseline gap-2">
                <s.icon className={cn("w-3.5 h-3.5 shrink-0", s.color)} />
                <p className="text-xl font-display font-semibold">{s.value}</p>
              </div>
              <p className="text-[10px] text-[#2D4060] mt-1 font-light truncate">{s.sub}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Cards grid ─────────────────────────────────────────────────── */}
      {p.isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-[#0b0b0b] border border-white/[0.07] rounded-[36px] h-64 animate-pulse" />
          ))}
        </div>
      ) : p.leads.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center mb-6">
            <Activity className="w-7 h-7 text-[#2D4060]" />
          </div>
          <p className="text-[#567090] font-light text-lg">No p.leads in pipeline</p>
          <p className="text-[#2D4060] text-sm mt-2">Import tickets from CP Inbox to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          <AnimatePresence>
            {p.leads.map((lead) => (
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
            ))}
          </AnimatePresence>
        </div>
      )}

      <ScheduleModal
        open={!!p.schedModal}
        leadName={p.schedModal?.leadName || ""}
        schedDate={p.schedDate}
        schedTime={p.schedTime}
        schedDuration={p.schedDuration}
        clashWarning={p.clashWarning}
        scheduling={p.scheduling}
        onDateChange={p.setSchedDate}
        onTimeChange={p.setSchedTime}
        onDurationChange={p.setSchedDuration}
        onConfirm={p.confirmSchedule}
        onClose={() => p.setSchedModal(null)}
      />

      <NotesPanel
        open={!!p.notesPanel}
        leadName={p.notesPanel?.leadName || ""}
        existingNotes={p.notesPanel?.current || ""}
        newNoteText={p.notesText}
        onNoteChange={p.setNotesText}
        onSave={p.saveNotes}
        onClose={() => p.setNotesPanel(null)}
      />

      <CallModal
        open={!!p.callModal}
        leadName={p.callModal?.leadName || ""}
        phone={p.callModal?.phone || null}
        email={p.callModal?.email || null}
        ownerName={p.callModal?.ownerName || ""}
        callOutcome={p.callOutcome}
        callNote={p.callNote}
        onOutcomeChange={p.setCallOutcome}
        onNoteChange={p.setCallNote}
        onConfirm={p.confirmCall}
        onClose={() => p.setCallModal(null)}
      />

      <DraftEmailModal
        open={!!p.draftEmailModal}
        leadName={p.draftEmailModal?.leadName || ""}
        to={p.draftEmailModal?.to || ""}
        subject={p.draftEmailModal?.subject || ""}
        body={p.draftEmailModal?.body || ""}
        sending={p.emailSending}
        sent={p.emailSent}
        error={p.emailError}
        onToChange={(v: string) => p.draftEmailModal && p.setDraftEmailModal({ ...p.draftEmailModal, to: v })}
        onSubjectChange={(v: string) => p.draftEmailModal && p.setDraftEmailModal({ ...p.draftEmailModal, subject: v })}
        onBodyChange={(v: string) => p.draftEmailModal && p.setDraftEmailModal({ ...p.draftEmailModal, body: v })}
        onSend={p.sendDraftEmail}
        onClose={() => p.setDraftEmailModal(null)}
      />

      <EditPhoneModal
        open={!!p.editPhoneModal}
        leadName={p.editPhoneModal?.leadName || ""}
        current={p.editPhoneModal?.current || ""}
        value={p.editPhoneValue}
        onChange={p.setEditPhoneValue}
        onSave={p.savePhone}
        onClose={() => p.setEditPhoneModal(null)}
      />

      <EditEmailModal
        open={!!p.editEmailModal}
        leadName={p.editEmailModal?.leadName || ""}
        current={p.editEmailModal?.current || ""}
        value={p.editEmailValue}
        onChange={p.setEditEmailValue}
        onSave={p.saveEmail}
        onClose={() => p.setEditEmailModal(null)}
      />

      <FollowUpModal
        open={!!p.followModal}
        leadName={p.followModal?.leadName || ""}
        followDate={p.followDate}
        followReason={p.followReason}
        followNote={p.followNote}
        onDateChange={p.setFollowDate}
        onReasonChange={p.setFollowReason}
        onNoteChange={p.setFollowNote}
        onConfirm={p.confirmFollowUp}
        onClose={() => p.setFollowModal(null)}
      />

      <DeadLeadModal
        open={!!p.deadLeadModal}
        leadName={p.deadLeadModal?.leadName || ""}
        onConfirm={p.confirmDeadLead}
        onClose={() => p.setDeadLeadModal(null)}
      />

      <ConfirmRemoveModal
        open={!!p.confirmModal}
        leadName={p.confirmModal?.leadName || ""}
        onConfirm={p.confirmRemove}
        onClose={() => p.setConfirmModal(null)}
      />

      <BlockedModal
        open={!!p.blockedModal}
        leadName={p.blockedModal?.leadName || ""}
        onForceRemove={p.confirmForceRemove}
        onClose={() => p.setBlockedModal(null)}
      />

      <StageBackModal
        open={!!p.stageBackModal}
        leadName={p.stageBackModal?.leadName || ""}
        targetIdx={p.stageBackModal?.targetIdx || 0}
        onConfirm={p.confirmStageBack}
        onClose={() => p.setStageBackModal(null)}
      />
    </div>
  );
}
