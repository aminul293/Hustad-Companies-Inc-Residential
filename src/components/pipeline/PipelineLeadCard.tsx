"use client";
import { motion } from "framer-motion";
import {
  Phone, Calendar, Clock, XCircle, CalendarDays, CheckCircle2,
  PlayCircle, MinusCircle, MessageSquare, Mail, User, UserCheck,
  Flame, AlertCircle, PenLine, Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  PipelineLead, STATUS_CONFIG, STAGE_MAP, STAGE_LABELS, STAGE_HINTS,
  BLOCKED_STATUSES, fmtDate, fmtTime, daysSince,
  resolvePhone, resolveEmail, parseNoteEntries, noteEntryIcon,
} from "./pipelineTypes";

interface Props {
  variant?: "default" | "compact";
  onClick?: () => void;
  lead: PipelineLead;
  repId?: string;
  repsMap?: Record<string, string>;
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
  variant = "default", onClick,
  lead, repId, repsMap, removing,
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

  if (variant === "compact") {
    return (
      <motion.div
        layout
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: removing ? 0.35 : 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ duration: 0.2 }}
        onClick={onClick}
        className={cn(
          "bg-[#0b0b0b] border border-white/[0.07] rounded-xl flex flex-col overflow-hidden transition-all duration-300",
          onClick && "cursor-pointer hover:border-[#2563ba]/40 hover:bg-white/[0.02]"
        )}
      >
        <div className="h-[3px] bg-white/[0.04] shrink-0 w-full">
          <div className={cn("h-full transition-all duration-500", cfg.bar)} style={{ width: `${((stageIdx + 1) / 5) * 100}%` }} />
        </div>
        <div className="p-4 flex flex-col gap-2.5">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="text-[13px] font-inter font-medium text-[#E8EDF8] tracking-tight leading-snug truncate">
                {lead.centerpoint_jobs?.property_name || lead.centerpoint_jobs?.name}
              </h3>
              <p className="text-[10px] text-[#7090B0] mt-0.5 font-light truncate">
                {lead.centerpoint_jobs?.raw?._owner ? (lead.centerpoint_jobs.raw._owner as string).replace(/\b\w/g, c => c.toUpperCase()) : "Unknown Owner"}
              </p>
            </div>
            {(isUrgent || isWarning) && (
              <div className="shrink-0 mt-0.5">
                {isUrgent ? <Flame className="w-3.5 h-3.5 text-rose-400" /> : <AlertCircle className="w-3.5 h-3.5 text-amber-400" />}
              </div>
            )}
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-mono text-[#8BA5C5] bg-white/[0.04] border border-white/[0.06] px-1.5 py-0.5 rounded-md truncate">
              #{lead.cpc_ticket_id}
            </span>
            <div className="text-[10px] font-medium shrink-0 ml-2">
              {isScheduled ? (
                <span className="text-[#3aada3]">{lead.scheduled_start_at ? fmtDate(lead.scheduled_start_at) : "—"}</span>
              ) : (
                <span className={cn(isUrgent ? "text-rose-400" : isWarning ? "text-amber-400" : "text-[#7090B0]")}>
                  {lead.pipeline_status === "follow_up_needed" && lead.next_follow_up_at
                    ? fmtDate(lead.next_follow_up_at)
                    : idleDays !== null ? `${idleDays}d idle` : "New"}
                </span>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: removing ? 0.35 : 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.94 }}
      transition={{ duration: 0.22 }}
      className="bg-[#0b0b0b] border border-white/[0.07] rounded-2xl hover:border-white/[0.14] transition-all duration-300 flex flex-col"
    >
      {/* Progress bar */}
      <div className="h-[3px] bg-white/[0.04] shrink-0 rounded-t-2xl overflow-hidden mx-[4px] mt-[1px]">
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
          {STAGE_LABELS.map((_, i) => {
            const { label, hint } = (() => {
              if (i === 4) {
                if (lead.pipeline_status === "inspection_completed") {
                  return { label: "Inspected", hint: "Inspection complete & synced" };
                }
                if (lead.pipeline_status === "signed") {
                  return { label: "Signed", hint: "Agreement signed" };
                }
                if (lead.pipeline_status === "closed") {
                  return { label: "Closed", hint: "Lead closed/archived" };
                }
              }
              return { label: STAGE_LABELS[i], hint: STAGE_HINTS[i] };
            })();
            const clickable = i !== 4 && !isBlocked;
            const isCurrent = i === stageIdx;
            const isPast    = i < stageIdx;
            return (
              <div key={i} className="relative flex-1 group/dot">
                <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover/dot:opacity-100 transition-opacity z-10">
                  <div className="bg-[#111] border border-white/10 rounded-xl px-3 py-2 text-center" style={{ minWidth: "140px", maxWidth: "200px" }}>
                    <p className="text-[9px] font-mono text-[#AABDCF] uppercase tracking-widest mb-0.5">{label}</p>
                    <p className="text-[9px] text-[#4D678A] font-light leading-snug">{hint}</p>
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

        {/* Status badge row */}
        <div className="flex items-center justify-between mb-5">
          <div className={cn("flex items-center gap-2 px-3.5 py-1.5 rounded-lg border text-[9px] font-mono uppercase tracking-widest", cfg.color)}>
            <StatusIcon className="w-3 h-3" />
            {cfg.label}
          </div>
          <div className="flex items-center gap-2">
            {isUrgent  && <div className="flex items-center gap-1 text-[9px] font-mono text-rose-400/80"><Flame className="w-3 h-3" /> Urgent</div>}
            {isWarning && <div className="flex items-center gap-1 text-[9px] font-mono text-amber-400/70"><AlertCircle className="w-3 h-3" /> Stale</div>}
            <span className="text-[9px] font-mono text-[#8BA5C5] bg-white/[0.04] border border-white/[0.06] px-2 py-1 rounded-lg">
              #{lead.cpc_ticket_id}
            </span>
          </div>
        </div>

        {/* Property info */}
        <div className="mb-6">
          <h3 className="text-[1.4rem] font-inter font-medium text-[#E8EDF8] tracking-tight leading-tight mb-2">
            {lead.centerpoint_jobs?.property_name || lead.centerpoint_jobs?.name}
          </h3>
          <div className="flex items-center gap-3 mb-1.5">
            <span className="text-xs text-[#8BA5C5] flex items-center gap-1.5 font-light">
              <User className="w-3.5 h-3.5 text-[#567090]" />
              {lead.centerpoint_jobs?.raw?._owner
                ? (lead.centerpoint_jobs.raw._owner as string).replace(/\b\w/g, c => c.toUpperCase())
                : "Unknown Owner"}
            </span>
            <div className="w-1 h-1 rounded-full bg-white/15" />
            <span className="text-[9px] font-mono text-[#7090B0] uppercase tracking-widest">Residential</span>
          </div>
          {lead.assigned_rep_id && repsMap?.[lead.assigned_rep_id] && (
            <div className="flex items-center gap-1.5 mt-1">
              <UserCheck className="w-3 h-3 text-[#3aada3] shrink-0" />
              <span className="text-[11px] font-inter text-[#3aada3]">
                {repsMap[lead.assigned_rep_id]}
              </span>
            </div>
          )}

          {/* Phone row */}
          {ph ? (
            <div className="flex items-center gap-2">
              <a href={`tel:${ph.replace(/\D/g, "")}`} onClick={e => e.stopPropagation()}
                className="flex items-center gap-1.5 text-[11px] text-sky-400 hover:text-sky-300 transition-colors font-medium">
                <Phone className="w-3 h-3 shrink-0" />{ph}
              </a>
              <button onClick={e => { e.stopPropagation(); onEditPhone(lead); }} className="text-[#567090] hover:text-[#7090B0] transition-colors">
                <PenLine className="w-2.5 h-2.5" />
              </button>
            </div>
          ) : (
            <button onClick={e => { e.stopPropagation(); onEditPhone(lead); }}
              className="flex items-center gap-1.5 text-[11px] text-[#567090] hover:text-sky-400/80 transition-colors font-light">
              <Phone className="w-3 h-3 shrink-0" />Add phone number
            </button>
          )}

          {/* Email row */}
          {em ? (
            <div className="flex items-center gap-2 mt-1">
              <button onClick={e => { e.stopPropagation(); onDraftEmail(lead); }}
                className="flex items-center gap-1.5 text-[11px] text-[#2563ba] hover:text-[#4a8fd4] transition-colors font-medium">
                <Mail className="w-3 h-3 shrink-0" /><span className="truncate">{em}</span>
              </button>
              <button onClick={e => { e.stopPropagation(); onEditEmail(lead); }} className="text-[#567090] hover:text-[#7090B0] transition-colors">
                <PenLine className="w-2.5 h-2.5" />
              </button>
            </div>
          ) : (
            <button onClick={e => { e.stopPropagation(); onEditEmail(lead); }}
              className="flex items-center gap-1.5 text-[11px] text-[#567090] hover:text-[#2563ba]/80 transition-colors font-light mt-1">
              <Mail className="w-3 h-3 shrink-0" />Add email address
            </button>
          )}
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2.5 mb-6">
          <div className="bg-white/[0.025] border border-white/[0.05] rounded-2xl p-3.5">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-[7px] font-mono text-[#8BA5C5] uppercase tracking-[0.2em]">Attempts</p>
              <Phone className="w-2.5 h-2.5 text-[#4D678A]" />
            </div>
            <p className="text-[1.3rem] font-sans font-semibold leading-none text-[#E8EDF8]">{lead.contact_attempt_count}</p>
          </div>
          <div className="bg-white/[0.025] border border-white/[0.05] rounded-2xl p-3.5">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-[7px] font-mono text-[#8BA5C5] uppercase tracking-[0.2em]">{isScheduled ? "Date" : "Last Contact"}</p>
              <Clock className="w-2.5 h-2.5 text-[#4D678A]" />
            </div>
            <p className="text-[11px] font-sans font-semibold text-[#E8EDF8] leading-tight">
              {isScheduled && lead.scheduled_start_at ? fmtDate(lead.scheduled_start_at) : fmtDate(lead.last_contacted_at) || "Never"}
            </p>
          </div>
          <div className="bg-white/[0.025] border border-white/[0.05] rounded-2xl p-3.5">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-[7px] font-mono text-[#8BA5C5] uppercase tracking-[0.2em]">
                {isScheduled ? "Duration" : lead.pipeline_status === "follow_up_needed" ? "Follow Up" : "Idle"}
              </p>
              <CalendarDays className="w-2.5 h-2.5 text-[#4D678A]" />
            </div>
            {isScheduled ? (
              <div>
                <p className="text-[11px] font-sans font-semibold text-[#3aada3] leading-tight">
                  {lead.scheduled_start_at ? fmtTime(lead.scheduled_start_at) : "—"}
                </p>
                <p className="text-[9px] font-mono text-[#7090B0] mt-0.5">
                  {apptDurationMin !== null ? (apptDurationMin < 60 ? `${apptDurationMin} min` : `${apptDurationMin / 60} hr`) : "—"}
                </p>
              </div>
            ) : (
              <p className={cn("text-[11px] font-sans font-semibold leading-tight", isUrgent ? "text-rose-400" : isWarning ? "text-amber-400" : "text-[#E8EDF8]")}>
                {lead.pipeline_status === "follow_up_needed" && lead.next_follow_up_at
                  ? fmtDate(lead.next_follow_up_at)
                  : idleDays !== null ? `${idleDays}d` : "New"}
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
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-[#2a8a82] hover:bg-[#2a8a82]/80 active:scale-95 text-white transition-all text-sm font-medium">
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
              <button onClick={() => onSchedule(lead)} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-[#2563ba]/15 border border-[#2563ba]/25 text-[#4a8fd4] hover:bg-[#2563ba]/30 active:scale-95 transition-all text-xs font-medium">
                <Calendar className="w-3.5 h-3.5" />Schedule
              </button>
            </>
          )}
        </div>

        {/* Secondary actions */}
        {lead.pipeline_status !== "dead_lead" && (
          <div className="mt-2.5 pt-2.5 border-t border-white/[0.05] flex flex-wrap items-center gap-2">
            <button onClick={() => onNotes(lead)} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white/[0.03] border border-white/[0.06] text-[#8BA5C5] hover:text-[#E8EDF8] hover:bg-white/[0.08] transition-all text-[10px] font-medium">
              <MessageSquare className="w-3 h-3 text-[#7090B0]" />Notes
              {lead.lead_notes && <div className="w-1.5 h-1.5 rounded-full bg-[#2563ba]/80" />}
            </button>
            <button onClick={() => onDraftEmail(lead)} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white/[0.03] border border-white/[0.06] text-[#4a8fd4] hover:text-[#4a8fd4]/80 hover:bg-[#2563ba]/[0.06] transition-all text-[10px] font-medium">
              <Mail className="w-3 h-3 text-[#2563ba]" />Email
              {lead.lead_notes?.includes("Email sent") && <div className="w-1.5 h-1.5 rounded-full bg-[#2563ba]/80" />}
            </button>
            {isScheduled && (
              <button onClick={() => onSchedule(lead)} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white/[0.03] border border-white/[0.06] text-[#3aada3] hover:text-[#3aada3]/80 hover:bg-[#2a8a82]/[0.06] transition-all text-[10px] font-medium">
                <Calendar className="w-3 h-3 text-[#2a8a82]" />Reschedule
              </button>
            )}
            <button onClick={() => onDeadLead(lead)} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white/[0.03] border border-white/[0.06] text-rose-300 hover:text-rose-200 hover:bg-rose-500/[0.06] transition-all text-[10px] font-medium">
              <XCircle className="w-3 h-3 text-rose-400" />Dead Lead
            </button>
            <button onClick={e => onRemove(e, lead)} disabled={removing}
              className={cn("flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border transition-all text-[10px] font-medium",
                isBlocked ? "bg-white/[0.01] border-white/[0.03] text-white/20 cursor-not-allowed" : "bg-white/[0.03] border-white/[0.06] text-[#8BA5C5] hover:text-[#E8EDF8] hover:bg-white/[0.08]"
              )}>
              <MinusCircle className="w-3 h-3 text-[#7090B0]" />{removing ? "Removing…" : "Remove"}
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}
