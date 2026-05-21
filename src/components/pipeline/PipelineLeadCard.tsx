"use client";
import { motion } from "framer-motion";
import {
  Phone, Calendar, Clock, XCircle, CalendarDays, CheckCircle2,
  PlayCircle, MinusCircle, MessageSquare, Mail, User,
  Flame, AlertCircle, PenLine, Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  PipelineLead, STATUS_CONFIG, STAGE_MAP, STAGE_LABELS, STAGE_HINTS,
  BLOCKED_STATUSES, fmtDate, fmtTime, daysSince,
  resolvePhone, resolveEmail, parseNoteEntries, noteEntryIcon,
} from "./pipelineTypes";

interface Props {
  lead: PipelineLead;
  repId?: string;
  removing: boolean;
  onStageClick:       (lead: PipelineLead, idx: number) => void;
  onCall:             (lead: PipelineLead) => void;
  onFollowUp:         (lead: PipelineLead) => void;
  onSchedule:         (lead: PipelineLead) => void;
  onStartInspection:  (lead: PipelineLead) => void;
  onNotes:            (lead: PipelineLead) => void;
  onDraftEmail:       (lead: PipelineLead) => void;
  onEditPhone:        (lead: PipelineLead) => void;
  onEditEmail:        (lead: PipelineLead) => void;
  onDeadLead:         (lead: PipelineLead) => void;
  onRemove:           (e: React.MouseEvent, lead: PipelineLead) => void;
}

export function PipelineLeadCard({
  lead, repId, removing,
  onStageClick, onCall, onFollowUp, onSchedule, onStartInspection,
  onNotes, onDraftEmail, onEditPhone, onEditEmail, onDeadLead, onRemove,
}: Props) {
  const cfg        = STATUS_CONFIG[lead.pipeline_status] ?? STATUS_CONFIG.new_lead;
  const StatusIcon = cfg.icon;
  const stageIdx   = STAGE_MAP[lead.pipeline_status] ?? 0;
  const isBlocked  = BLOCKED_STATUSES.includes(lead.pipeline_status);
  const isScheduled = ["scheduled", "appointment_confirmed"].includes(lead.pipeline_status);
  const idleDays   = daysSince(lead.last_contacted_at);
  const isUrgent   = !isBlocked && !isScheduled && lead.pipeline_status !== "dead_lead" && (idleDays === null || idleDays >= 7);
  const isWarning  = !isUrgent && !isBlocked && !isScheduled && lead.pipeline_status !== "dead_lead" && idleDays !== null && idleDays >= 3;
  const apptDurationMin = lead.scheduled_start_at && lead.scheduled_end_at
    ? Math.round((new Date(lead.scheduled_end_at).getTime() - new Date(lead.scheduled_start_at).getTime()) / 60000)
    : null;
  const ph = resolvePhone(lead);
  const em = resolveEmail(lead);
  const lastActivity = (() => {
    const entries = parseNoteEntries(lead.lead_notes || "");
    return entries.filter(e => e.isActivity).slice(-1)[0] ?? null;
  })();

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: removing ? 0.35 : 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.94 }}
      transition={{ duration: 0.22 }}
      className="bg-[#0b0b0b] border border-white/[0.07] rounded-[36px] hover:border-white/[0.14] transition-all duration-300 flex flex-col"
    >
      {/* Progress bar */}
      <div className="h-[2px] bg-white/[0.04] shrink-0 rounded-t-[36px] overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${((stageIdx + 1) / 5) * 100}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className={cn("h-full", cfg.bar)}
        />
      </div>

      <div className="p-7 flex flex-col flex-1">
        {/* Stage dots */}
        <div className="flex gap-1.5 mb-5">
          {STAGE_LABELS.map((label, i) => {
            const clickable = i !== 4 && !isBlocked;
            const isCurrent = i === stageIdx;
            const isPast    = i < stageIdx;
            return (
              <div key={i} className="relative flex-1 group/dot">
                <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover/dot:opacity-100 transition-opacity z-10">
                  <div className="bg-[#111] border border-white/10 rounded-xl px-3 py-2 text-center" style={{ minWidth: "140px", maxWidth: "200px" }}>
                    <p className="text-[9px] font-mono text-[#AABDCF] uppercase tracking-widest mb-0.5">{label}</p>
                    <p className="text-[9px] text-[#4D678A] font-light leading-snug">{STAGE_HINTS[i]}</p>
                  </div>
                </div>
                <button
                  onClick={() => onStageClick(lead, i)}
                  disabled={!clickable}
                  className={cn(
                    "w-full h-[4px] rounded-full transition-all duration-300",
                    clickable ? "cursor-pointer" : "cursor-default",
                    clickable && !isCurrent && "hover:brightness-150 hover:opacity-80",
                    isPast    ? cn(cfg.bar, "opacity-50") :
                    isCurrent ? cfg.bar :
                    clickable ? "bg-white/[0.07] hover:bg-white/[0.13]" :
                                "bg-white/[0.04]"
                  )}
                />
              </div>
            );
          })}
        </div>
        <p className="text-[11px] mb-5" style={{ color: "var(--color-text-secondary, #7090B0)" }}>
          Stage {stageIdx + 1} of 5 — {["New Lead", "Contacted", "Inspection Scheduled", "Proposal Sent", "Closed"][stageIdx] || "Unknown"}
        </p>

        {/* Status badge row */}
        <div className="flex items-center justify-between mb-5">
          <div className={cn("flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-[9px] font-mono uppercase tracking-widest", cfg.color)}>
            <StatusIcon className="w-3 h-3" />
            {cfg.label}
          </div>
          <div className="flex items-center gap-2">
            {isUrgent  && <div className="flex items-center gap-1 text-[9px] font-mono text-rose-400/80"><Flame className="w-3 h-3" /> Urgent</div>}
            {isWarning && <div className="flex items-center gap-1 text-[9px] font-mono text-amber-400/70"><AlertCircle className="w-3 h-3" /> Stale</div>}
            <span className="text-[9px] font-mono text-[#2D4060] bg-white/[0.04] border border-white/[0.06] px-2 py-1 rounded-lg">
              #{lead.cpc_ticket_id}
            </span>
          </div>
        </div>

        {/* Property info */}
        <div className="mb-6">
          <h3 className="text-[1.4rem] font-display font-medium text-[#E8EDF8] tracking-tight leading-tight mb-2">
            {lead.centerpoint_jobs?.property_name || lead.centerpoint_jobs?.name}
          </h3>
          <div className="flex items-center gap-3 mb-1.5">
            <span className="text-xs text-[#4D678A] flex items-center gap-1.5 font-light">
              <User className="w-3.5 h-3.5 text-[#2D4060]" />
              {lead.centerpoint_jobs?.raw?._owner
                ? (lead.centerpoint_jobs.raw._owner as string).replace(/\b\w/g, c => c.toUpperCase())
                : "Unknown Owner"}
            </span>
            <div className="w-1 h-1 rounded-full bg-white/10" />
            <span className="text-[9px] font-mono text-[#2D4060] uppercase tracking-widest">Residential</span>
          </div>

          {/* Phone row */}
          {ph ? (
            <div className="flex items-center gap-2">
              <a href={`tel:${ph.replace(/\D/g, "")}`} onClick={e => e.stopPropagation()}
                className="flex items-center gap-1.5 text-[11px] text-sky-400/60 hover:text-sky-300 transition-colors font-light">
                <Phone className="w-3 h-3 shrink-0" />{ph}
              </a>
              <button onClick={e => { e.stopPropagation(); onEditPhone(lead); }} className="text-[#293A58] hover:text-[#7090B0] transition-colors">
                <PenLine className="w-2.5 h-2.5" />
              </button>
            </div>
          ) : (
            <button onClick={e => { e.stopPropagation(); onEditPhone(lead); }}
              className="flex items-center gap-1.5 text-[11px] text-[#2D4060] hover:text-sky-400/70 transition-colors font-light">
              <Phone className="w-3 h-3 shrink-0" />Add phone number
            </button>
          )}

          {/* Email row */}
          {em ? (
            <div className="flex items-center gap-2 mt-1">
              <button onClick={e => { e.stopPropagation(); onDraftEmail(lead); }}
                className="flex items-center gap-1.5 text-[11px] text-indigo-400/50 hover:text-indigo-300 transition-colors font-light">
                <Mail className="w-3 h-3 shrink-0" /><span className="truncate">{em}</span>
              </button>
              <button onClick={e => { e.stopPropagation(); onEditEmail(lead); }} className="text-[#293A58] hover:text-[#7090B0] transition-colors">
                <PenLine className="w-2.5 h-2.5" />
              </button>
            </div>
          ) : (
            <button onClick={e => { e.stopPropagation(); onEditEmail(lead); }}
              className="flex items-center gap-1.5 text-[11px] text-[#2D4060] hover:text-indigo-400/70 transition-colors font-light mt-1">
              <Mail className="w-3 h-3 shrink-0" />Add email address
            </button>
          )}
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2.5 mb-6">
          <div className="bg-white/[0.025] border border-white/[0.05] rounded-[18px] p-3.5">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-[7px] font-mono text-[#2D4060] uppercase tracking-[0.2em]">Attempts</p>
              <Phone className="w-2.5 h-2.5 text-[#1F2E48]" />
            </div>
            <p className="text-[1.4rem] font-display font-semibold leading-none">{lead.contact_attempt_count}</p>
          </div>
          <div className="bg-white/[0.025] border border-white/[0.05] rounded-[18px] p-3.5">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-[7px] font-mono text-[#2D4060] uppercase tracking-[0.2em]">{isScheduled ? "Date" : "Last Contact"}</p>
              <Clock className="w-2.5 h-2.5 text-[#1F2E48]" />
            </div>
            <p className="text-xs font-display text-[#7E9DBE] leading-tight">
              {isScheduled && lead.scheduled_start_at ? fmtDate(lead.scheduled_start_at) : fmtDate(lead.last_contacted_at) || "Never"}
            </p>
          </div>
          <div className="bg-white/[0.025] border border-white/[0.05] rounded-[18px] p-3.5">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-[7px] font-mono text-[#2D4060] uppercase tracking-[0.2em]">
                {isScheduled ? "Duration" : lead.pipeline_status === "follow_up_needed" ? "Follow Up" : "Idle"}
              </p>
              <CalendarDays className="w-2.5 h-2.5 text-[#1F2E48]" />
            </div>
            {isScheduled ? (
              <div>
                <p className="text-xs font-display text-emerald-400/80 leading-tight">
                  {lead.scheduled_start_at ? fmtTime(lead.scheduled_start_at) : "—"}
                </p>
                <p className="text-[9px] font-mono text-[#354D6F] mt-0.5">
                  {apptDurationMin !== null ? (apptDurationMin < 60 ? `${apptDurationMin} min` : `${apptDurationMin / 60} hr`) : "—"}
                </p>
              </div>
            ) : lead.pipeline_status === "follow_up_needed" && lead.next_follow_up_at ? (
              <p className={cn("text-xs font-display leading-tight", isUrgent ? "text-rose-400/80" : isWarning ? "text-amber-400/70" : "text-[#7E9DBE]")}>
                {fmtDate(lead.next_follow_up_at)}
              </p>
            ) : idleDays !== null ? (
              <p className={cn("text-xs font-display leading-tight", isUrgent ? "text-rose-400/80" : isWarning ? "text-amber-400/70" : "text-[#7E9DBE]")}>
                {`${idleDays}d`}
              </p>
            ) : (
              <p className="text-[11px] px-2 py-0.5 rounded-full font-display leading-tight inline-block" style={{ background: "var(--color-background-secondary, rgba(255,255,255,0.05))", color: "var(--color-text-secondary, #8BA5C5)" }}>
                New
              </p>
            )}
          </div>
        </div>

        {/* Last activity chip */}
        {lastActivity && (() => {
          const { icon: ActIcon, color } = noteEntryIcon(lastActivity.content);
          const label = lastActivity.content.length > 42 ? lastActivity.content.slice(0, 42) + "…" : lastActivity.content;
          return (
            <div className="flex items-center gap-2 mb-4 bg-white/[0.025] border border-white/[0.05] rounded-2xl px-3.5 py-2.5">
              <div className={cn("w-5 h-5 rounded-lg flex items-center justify-center shrink-0", color)}>
                <ActIcon className="w-3 h-3" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-[#7090B0] font-light truncate">{label}</p>
              </div>
              {lastActivity.timestamp && (
                <span className="text-[9px] font-mono text-[#2D4060] shrink-0">{lastActivity.timestamp}</span>
              )}
            </div>
          );
        })()}

        {/* Primary actions */}
        <div className="flex gap-2.5 mt-auto">
          {isScheduled ? (
            <button onClick={() => onStartInspection(lead)}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-indigo-500 hover:bg-indigo-400 active:scale-95 text-[#E8EDF8] transition-all text-sm font-medium shadow-lg shadow-indigo-500/20">
              <PlayCircle className="w-4 h-4" />Start Inspection
            </button>
          ) : lead.pipeline_status === "dead_lead" ? (
             <span className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-rose-500/10 text-rose-400/60 text-sm font-medium cursor-not-allowed">
              <XCircle className="w-4 h-4" />Lead Closed
            </span>
          ) : (
            <>
              <button onClick={() => onCall(lead)} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white hover:text-black active:scale-95 transition-all text-xs font-medium">
                <Phone className="w-3.5 h-3.5" />Call
              </button>
              <button onClick={() => onFollowUp(lead)} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white hover:text-black active:scale-95 transition-all text-xs font-medium">
                <Clock className="w-3.5 h-3.5" />Follow-up
              </button>
              <button onClick={() => onSchedule(lead)} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-indigo-500/15 border border-indigo-500/25 text-indigo-300 hover:bg-indigo-500/30 active:scale-95 transition-all text-xs font-medium">
                <Calendar className="w-3.5 h-3.5" />Schedule
              </button>
            </>
          )}
        </div>

        {/* Secondary actions */}
        {lead.pipeline_status !== "dead_lead" && (
          <div className="mt-2.5 pt-2.5 border-t border-white/[0.05] flex items-center gap-1">
            <button onClick={() => onNotes(lead)} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[#354D6F] hover:text-[#8BA5C5] hover:bg-white/[0.04] transition-all text-[11px] font-medium">
              <MessageSquare className="w-3.5 h-3.5" />Notes
              {lead.lead_notes && <div className="w-1.5 h-1.5 rounded-full bg-indigo-400/60" />}
            </button>
            <button onClick={() => onDraftEmail(lead)} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-indigo-400/30 hover:text-indigo-400/80 hover:bg-indigo-500/[0.06] transition-all text-[11px] font-medium">
              <Mail className="w-3.5 h-3.5" />Email
              {lead.lead_notes?.includes("Email sent") && <div className="w-1.5 h-1.5 rounded-full bg-indigo-400/60" />}
            </button>
            {isScheduled && (
              <button onClick={() => onSchedule(lead)} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-emerald-400/40 hover:text-emerald-400/80 hover:bg-emerald-500/[0.06] transition-all text-[11px] font-medium">
                <Calendar className="w-3.5 h-3.5" />Reschedule
              </button>
            )}
            <button onClick={() => onDeadLead(lead)} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-rose-400/30 hover:text-rose-400/70 hover:bg-rose-500/[0.06] transition-all text-[11px] font-medium">
              <XCircle className="w-3.5 h-3.5" />Dead Lead
            </button>
            <button onClick={e => onRemove(e, lead)} disabled={removing}
              className={cn("flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl transition-all text-[11px] font-medium",
                isBlocked ? "text-[#1F2E48] cursor-not-allowed" : "text-[#2D4060] hover:text-[#7090B0] hover:bg-white/[0.04]"
              )}>
              <MinusCircle className="w-3.5 h-3.5" />{removing ? "Removing…" : "Remove"}
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}
