"use client";

import { ArrowLeft, Activity, CalendarDays, Phone } from "lucide-react";
import { cn } from "@/lib/utils";

import { ScheduleModal } from "./pipeline/ScheduleModal";
import { NotesPanel } from "./pipeline/NotesPanel";
import {
  CallModal, DraftEmailModal, EditPhoneModal, EditEmailModal,
  FollowUpModal, DeadLeadModal, ConfirmRemoveModal, BlockedModal, StageBackModal,
} from "./pipeline/PipelineModals";
import { PipelineLeadCard } from "./pipeline/PipelineLeadCard";
import { PipelineLeadSlideOver } from "./pipeline/PipelineLeadSlideOver";
import { usePipelineLeads } from "./pipeline/usePipelineLeads";
import { AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { fetchReps } from "@/lib/api";

interface PipelineLeadsProps {
  repId?: string;
  repEmail?: string;
}

export function PipelineLeads({ repId, repEmail }: PipelineLeadsProps) {
  const p = usePipelineLeads(repId, repEmail);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [repsMap, setRepsMap] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchReps().then(async res => {
      if (!res.ok) return;
      const json = await res.json();
      const map: Record<string, string> = {};
      for (const r of (json.reps ?? [])) map[r.id] = r.name;
      setRepsMap(map);
    });
  }, []);

  const selectedLead = p.leads.find(l => l.id === selectedLeadId) || null;

  const KANBAN_COLUMNS = [
    { id: 0, label: "New Leads", statuses: ["new_lead"] },
    { id: 1, label: "Attempted / Follow Up", statuses: ["contact_attempted", "follow_up_needed"] },
    { id: 2, label: "Contacted", statuses: ["contacted"] },
    { id: 3, label: "Scheduled", statuses: ["scheduled", "appointment_confirmed"] },
    { id: 4, label: "In Field / Closed", statuses: ["inspection_in_progress", "inspection_completed", "signed", "closed", "dead_lead"] },
  ];

  return (
    <div className="p-8 space-y-8 overflow-y-auto h-full bg-black/20">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="flex items-center gap-6">
          <button
            onClick={() => window.dispatchEvent(new CustomEvent("changeView", { detail: "dashboard" }))}
            className="p-4 rounded-[14px] bg-white/5 border border-white/10 hover:bg-white hover:text-black transition-all shadow-2xl"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <h2 className="text-4xl font-inter font-medium tracking-tight">Sales Pipeline</h2>
            <p className="text-[#567090] text-sm mt-1 font-light tracking-wide">Lead lifecycle and field conversion intelligence</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {[
            { label: "Active Leads", value: p.stats.total,       sub: `${p.stats.urgent} need attention`, icon: Activity, color: "text-[#2563ba]" },
            { label: "Scheduled",    value: p.stats.scheduled,   sub: "upcoming inspections",            icon: CalendarDays, color: "text-[#3aada3]" },
            { label: "Avg Touches",  value: p.stats.avgAttempts, sub: "contact attempts",                icon: Phone, color: "text-sky-400" },
          ].map((s, i) => (
            <div key={i} className="px-5 py-4 rounded-2xl bg-white/[0.03] border border-white/[0.08] min-w-[148px]">
              <p className="text-[9px] font-mono text-[#2D4060] uppercase tracking-[0.2em] mb-1">{s.label}</p>
              <div className="flex items-baseline gap-2">
                <s.icon className={cn("w-3.5 h-3.5 shrink-0", s.color)} />
                <p className="text-xl font-inter font-light">{s.value}</p>
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
            <div key={i} className="bg-[#0b0b0b] border border-white/[0.07] rounded-2xl h-64 animate-pulse" />
          ))}
        </div>
      ) : p.leads.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center mb-6">
            <Activity className="w-7 h-7 text-[#2D4060]" />
          </div>
          <p className="text-[#567090] font-light text-lg">No leads in pipeline</p>
          <p className="text-[#2D4060] text-sm mt-2">Import tickets from CP Inbox to get started</p>
        </div>
      ) : (
        <div className="flex gap-5 overflow-x-auto pb-6 -mx-8 px-8 h-full min-h-[60vh]">
          {KANBAN_COLUMNS.map(col => {
            const colLeads = p.leads.filter(l => col.statuses.includes(l.pipeline_status));
            return (
              <div key={col.id} className="flex-shrink-0 w-[340px] flex flex-col bg-white/[0.02] border border-white/[0.05] rounded-2xl overflow-hidden h-[calc(100vh-240px)] min-h-[500px]">
                <div className="p-4 border-b border-white/[0.05] bg-black/20 flex items-center justify-between shrink-0">
                  <h3 className="text-sm font-medium text-[#E8EDF8] tracking-wide">{col.label}</h3>
                  <span className="text-[10px] font-mono text-[#7090B0] bg-white/[0.05] px-2 py-0.5 rounded-full">{colLeads.length}</span>
                </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-3">
                  <AnimatePresence>
                    {colLeads.map((lead) => (
                      <PipelineLeadCard
                        key={lead.id}
                        variant="compact"
                        onClick={() => setSelectedLeadId(lead.id)}
                        lead={lead}
                        repId={repId}
                        repsMap={repsMap}
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
                  {colLeads.length === 0 && (
                     <div className="flex flex-col items-center justify-center py-10 opacity-30">
                       <p className="text-xs text-[#7090B0]">Empty</p>
                     </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <PipelineLeadSlideOver
        open={!!selectedLeadId}
        onClose={() => setSelectedLeadId(null)}
        lead={selectedLead}
        repId={repId}
        repsMap={repsMap}
        removing={selectedLead ? p.removing === selectedLead.id : false}
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
