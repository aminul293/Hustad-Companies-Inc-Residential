"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  RefreshCw, CloudDownload, Calendar, PlayCircle, FileText,
  Phone, Clock, CheckCircle2, AlertCircle, ChevronRight,
  Inbox, ArrowRight, Loader2, FileSignature, PauseCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { triggerCenterpointSync, createPipelineLead } from "@/lib/api";
import { ScheduleModal } from "@/components/pipeline/ScheduleModal";
import { createAppointment, sendEmail } from "@/lib/api";
import { addDays } from "@/components/pipeline/pipelineTypes";
import { listDrafts, loadDraftById } from "@/lib/session";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface CPJob {
  id: string; cp_id: string; name: string;
  property_name: string | null; status: string;
  raw?: { _owner?: string; _email?: string; _phone?: string } | null;
  updated_at: string;
}

interface PipelineLead {
  id: string; cpc_ticket_id: string; pipeline_status: string;
  contact_attempt_count: number; last_contacted_at: string | null;
  scheduled_start_at: string | null; updated_at: string;
  owner_phone?: string | null; owner_email?: string | null;
  centerpoint_jobs?: { id: string; name: string; property_name: string | null; raw?: any } | null;
  appointments?: { id: string; appointment_start_at: string; assigned_rep_id: string }[];
}

interface InspectionSession {
  session_id: string; session_status: string;
  property_address: string; homeowner_name: string;
  outcome_type?: string; cpc_ticket_id?: string;
  pipeline_lead_id?: string; updated_at: string;
}

interface WorkBoardData {
  cpInbox: CPJob[];
  needsScheduling: PipelineLead[];
  scheduled: PipelineLead[];
  inProgressLeads: PipelineLead[];
  completedLeads: PipelineLead[];
  signedLeads: PipelineLead[];
  activeSessions: InspectionSession[];
  deferredSessions: InspectionSession[];
  signedSessions: InspectionSession[];
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function propertyName(lead: PipelineLead) {
  return lead.centerpoint_jobs?.property_name || lead.centerpoint_jobs?.name || lead.cpc_ticket_id;
}

function ownerName(lead: PipelineLead) {
  return (lead.centerpoint_jobs?.raw?._owner as string | undefined) || "";
}

function formatDt(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }) +
    " · " + d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
}

// ─── Stage Section Header ──────────────────────────────────────────────────────

function SectionHeader({
  icon: Icon, label, count, color, sublabel,
}: { icon: any; label: string; count: number; color: string; sublabel?: string }) {
  if (count === 0) return null;
  return (
    <div className="flex items-center gap-3 mb-3 mt-1">
      <div className={cn("w-7 h-7 rounded-xl flex items-center justify-center shrink-0", color)}>
        <Icon className="w-3.5 h-3.5" />
      </div>
      <div className="flex-1 min-w-0">
        <span className="text-[11px] font-mono uppercase tracking-[0.18em] text-[#567090]">{label}</span>
        {sublabel && <span className="ml-2 text-[10px] text-[#3F5878]">{sublabel}</span>}
      </div>
      <span className="px-2 py-0.5 rounded-full bg-white/5 border border-white/8 text-[10px] font-mono text-[#567090]">{count}</span>
    </div>
  );
}

// ─── Job Card Shell ────────────────────────────────────────────────────────────

function JobCard({ children, urgent }: { children: React.ReactNode; urgent?: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.18 }}
      className={cn(
        "rounded-2xl border bg-white/[0.025] p-4 flex items-center justify-between gap-4 hover:bg-white/[0.04] transition-all",
        urgent ? "border-amber-500/20" : "border-white/[0.07]"
      )}
    >
      {children}
    </motion.div>
  );
}

// ─── Action Button ─────────────────────────────────────────────────────────────

function ActionBtn({
  label, icon: Icon, onClick, variant = "default", loading,
}: { label: string; icon: any; onClick: () => void; variant?: "default"|"teal"|"amber"|"blue"|"green"|"purple"; loading?: boolean }) {
  const styles = {
    default: "bg-white/8 border-white/12 text-[#8BA5C5] hover:bg-white/14",
    teal:    "bg-[#2a8a82]/15 border-[#2a8a82]/25 text-[#3aada3] hover:bg-[#2a8a82]/25",
    amber:   "bg-amber-500/12 border-amber-500/20 text-amber-400 hover:bg-amber-500/20",
    blue:    "bg-[#2563ba]/15 border-[#2563ba]/25 text-[#4a8fd4] hover:bg-[#2563ba]/25",
    green:   "bg-emerald-500/12 border-emerald-500/22 text-emerald-400 hover:bg-emerald-500/22",
    purple:  "bg-violet-500/12 border-violet-500/22 text-violet-400 hover:bg-violet-500/22",
  };
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={cn(
        "flex items-center gap-1.5 px-3.5 py-2 rounded-xl border text-xs font-inter font-medium shrink-0 transition-all active:scale-95",
        styles[variant],
        loading && "opacity-60 cursor-not-allowed"
      )}
    >
      {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Icon className="w-3.5 h-3.5" />}
      {label}
    </button>
  );
}

// ─── CP Inbox Card ─────────────────────────────────────────────────────────────

function CpInboxCard({ job, onImport, importing }: { job: CPJob; onImport: (job: CPJob) => void; importing: boolean }) {
  const address = job.property_name || job.name;
  const owner   = (job.raw?._owner as string | undefined) || "";
  return (
    <JobCard>
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-8 h-8 rounded-xl bg-sky-500/10 border border-sky-500/18 flex items-center justify-center shrink-0">
          <Inbox className="w-3.5 h-3.5 text-sky-400" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-display font-medium text-[#E8EDF8] truncate">{address}</p>
          <p className="text-[10px] font-mono text-[#4D678A] mt-0.5">
            #{job.name}{owner ? ` · ${owner}` : ""}
          </p>
        </div>
      </div>
      <ActionBtn label="Import" icon={CloudDownload} variant="blue" onClick={() => onImport(job)} loading={importing} />
    </JobCard>
  );
}

// ─── Needs Scheduling Card ─────────────────────────────────────────────────────

function NeedsSchedulingCard({
  lead, onSchedule, onLaunch,
}: { lead: PipelineLead; onSchedule: (lead: PipelineLead) => void; onLaunch: (lead: PipelineLead) => void }) {
  const attempts = lead.contact_attempt_count;
  return (
    <JobCard>
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-8 h-8 rounded-xl bg-[#2563ba]/12 border border-[#2563ba]/20 flex items-center justify-center shrink-0">
          <Phone className="w-3.5 h-3.5 text-[#4a8fd4]" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-display font-medium text-[#E8EDF8] truncate">{propertyName(lead)}</p>
          <p className="text-[10px] font-mono text-[#4D678A] mt-0.5">
            {ownerName(lead) || lead.cpc_ticket_id}
            {attempts > 0 && <span className="ml-2 text-amber-500/70">{attempts} attempt{attempts > 1 ? "s" : ""}</span>}
          </p>
        </div>
      </div>
      <div className="flex gap-2 shrink-0">
        <ActionBtn label="Schedule" icon={Calendar} variant="teal" onClick={() => onSchedule(lead)} />
      </div>
    </JobCard>
  );
}

// ─── Scheduled Card ────────────────────────────────────────────────────────────

function ScheduledCard({
  lead, onLaunch,
}: { lead: PipelineLead; onLaunch: (lead: PipelineLead) => void }) {
  return (
    <JobCard>
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-8 h-8 rounded-xl bg-[#2a8a82]/12 border border-[#2a8a82]/20 flex items-center justify-center shrink-0">
          <Calendar className="w-3.5 h-3.5 text-[#3aada3]" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-display font-medium text-[#E8EDF8] truncate">{propertyName(lead)}</p>
          {lead.scheduled_start_at && (
            <p className="text-[10px] font-mono text-[#4D678A] mt-0.5">{formatDt(lead.scheduled_start_at)}</p>
          )}
        </div>
      </div>
      <ActionBtn label="Start Inspection" icon={PlayCircle} variant="teal" onClick={() => onLaunch(lead)} />
    </JobCard>
  );
}

// ─── Active Session Card ───────────────────────────────────────────────────────

function ActiveSessionCard({ session, onResume }: { session: InspectionSession; onResume: (s: InspectionSession) => void }) {
  return (
    <JobCard urgent>
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-8 h-8 rounded-xl bg-amber-500/12 border border-amber-500/20 flex items-center justify-center shrink-0">
          <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-display font-medium text-[#E8EDF8] truncate">{session.property_address}</p>
          <p className="text-[10px] font-mono text-[#4D678A] mt-0.5">
            {session.homeowner_name || "In progress"} · <span className="text-amber-500/70 uppercase tracking-wider">{session.session_status.replace(/_/g," ")}</span>
          </p>
        </div>
      </div>
      <ActionBtn label="Resume" icon={ChevronRight} variant="amber" onClick={() => onResume(session)} />
    </JobCard>
  );
}

// ─── Deferred Card ─────────────────────────────────────────────────────────────

function DeferredCard({ session, onResume }: { session: InspectionSession; onResume: (s: InspectionSession) => void }) {
  return (
    <JobCard>
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-8 h-8 rounded-xl bg-violet-500/10 border border-violet-500/18 flex items-center justify-center shrink-0">
          <PauseCircle className="w-3.5 h-3.5 text-violet-400" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-display font-medium text-[#E8EDF8] truncate">{session.property_address}</p>
          <p className="text-[10px] font-mono text-[#4D678A] mt-0.5">{session.homeowner_name || "Deferred"}</p>
        </div>
      </div>
      <ActionBtn label="Re-open" icon={ArrowRight} variant="purple" onClick={() => onResume(session)} />
    </JobCard>
  );
}

// ─── Signed Card ───────────────────────────────────────────────────────────────

function SignedCard({ session, onExport }: { session: InspectionSession; onExport: (s: InspectionSession) => void }) {
  return (
    <JobCard>
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/18 flex items-center justify-center shrink-0">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-display font-medium text-[#E8EDF8] truncate">{session.property_address}</p>
          <p className="text-[10px] font-mono text-[#4D678A] mt-0.5">
            {session.homeowner_name || "Signed"} · <span className="text-emerald-500/70">✓ Signed</span>
          </p>
        </div>
      </div>
      <ActionBtn label="Export PDF" icon={FileText} variant="green" onClick={() => onExport(session)} />
    </JobCard>
  );
}

// ─── Empty State ───────────────────────────────────────────────────────────────

function EmptyState({ label }: { label: string }) {
  return (
    <div className="py-16 text-center opacity-20">
      <CheckCircle2 className="w-10 h-10 mx-auto mb-3" />
      <p className="text-sm font-display">{label}</p>
    </div>
  );
}

// ─── Main WorkBoard ────────────────────────────────────────────────────────────

interface Props {
  onLoadDraft: (id: string) => void;
  onPrefillAndStart: (data: any) => void;
  repId?: string;
  repEmail?: string;
}

export function WorkBoard({ onLoadDraft, onPrefillAndStart, repId, repEmail }: Props) {
  const [data, setData]           = useState<WorkBoardData | null>(null);
  const [loading, setLoading]     = useState(true);
  const [syncing, setSyncing]     = useState(false);
  const [importingId, setImportingId] = useState<string | null>(null);
  const [schedLead, setSchedLead]     = useState<PipelineLead | null>(null);
  const [schedDate, setSchedDate]     = useState(addDays(1));
  const [schedTime, setSchedTime]     = useState("09:00");
  const [schedDur,  setSchedDur]      = useState(60);
  const [clashWarn, setClashWarn]     = useState<string | null>(null);
  const [scheduling, setScheduling]   = useState(false);
  const [exportingId, setExportingId] = useState<string | null>(null);
  const [toast, setToast]         = useState<{ msg: string; type: "ok"|"err" } | null>(null);

  const showToast = (msg: string, type: "ok"|"err" = "ok") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/workboard");
      if (!res.ok) throw new Error("fetch failed");
      setData(await res.json());
    } catch {
      showToast("Failed to load work board", "err");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Refresh when tab becomes active again
  useEffect(() => {
    const onVis = () => { if (document.visibilityState === "visible") load(); };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [load]);

  // ── Sync CP ────────────────────────────────────────────────────────────────
  const handleSync = async () => {
    setSyncing(true);
    try {
      await triggerCenterpointSync();
      await load();
      showToast("CenterPoint synced");
    } catch { showToast("Sync failed", "err"); }
    finally { setSyncing(false); }
  };

  // ── Import CP job → Pipeline ───────────────────────────────────────────────
  const handleImport = async (job: CPJob) => {
    setImportingId(job.id);
    try {
      // Build the same job shape that CenterPointJobs passes when importing
      const jobPayload = {
        id: job.cp_id,
        attributes: {
          name: job.name,
          propertyName: job.property_name,
          status: job.status,
        },
        pipelineLeadId: undefined,
      };
      const res = await createPipelineLead({ job: jobPayload });
      if (!res.ok) throw new Error("import failed");
      showToast(`${job.property_name || job.name} imported to pipeline`);
      await load();
    } catch { showToast("Import failed", "err"); }
    finally { setImportingId(null); }
  };

  // ── Launch inspection from pipeline lead ───────────────────────────────────
  const handleLaunch = (lead: PipelineLead) => {
    const apptId = lead.appointments?.find(a => a.assigned_rep_id === repId)?.id
      || lead.appointments?.[0]?.id;
    window.dispatchEvent(new CustomEvent("launchPipelineSession", {
      detail: { ...lead, appointmentId: apptId },
    }));
  };

  // ── Resume session ─────────────────────────────────────────────────────────
  const handleResume = (session: InspectionSession) => {
    // Check local drafts first
    const localDraft = listDrafts().find(d => d.sessionId === session.session_id);
    if (localDraft) { onLoadDraft(session.session_id); return; }
    onLoadDraft(session.session_id);
  };

  // ── Export PDF ─────────────────────────────────────────────────────────────
  const handleExport = async (session: InspectionSession) => {
    if (exportingId) return;
    setExportingId(session.session_id);
    try {
      const draft = loadDraftById(session.session_id);
      if (!draft) { showToast("Session not found locally — open it first", "err"); return; }
      const { downloadSummaryPDF } = await import("@/lib/pdf-export");
      await downloadSummaryPDF(draft);
    } catch { showToast("PDF export failed", "err"); }
    finally { setExportingId(null); }
  };

  // ── Stats bar ──────────────────────────────────────────────────────────────
  const total = data
    ? data.cpInbox.length + data.needsScheduling.length + data.scheduled.length
      + data.activeSessions.length + data.deferredSessions.length + data.signedSessions.length
    : 0;

  const urgent = data ? data.activeSessions.length + data.deferredSessions.length : 0;

  return (
    <div className="space-y-0">
      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-6 gap-3">
        <div>
          <p className="text-[10px] font-mono text-[#3F5878] uppercase tracking-[0.2em] mb-1">
            {total} active job{total !== 1 ? "s" : ""}
            {urgent > 0 && <span className="ml-2 text-amber-400">{urgent} need attention</span>}
          </p>
          <div className="flex gap-3">
            {[
              { n: data?.cpInbox.length ?? 0,          label: "New", color: "text-sky-400" },
              { n: data?.needsScheduling.length ?? 0,  label: "To Schedule", color: "text-[#4a8fd4]" },
              { n: data?.scheduled.length ?? 0,        label: "Scheduled", color: "text-[#3aada3]" },
              { n: data?.activeSessions.length ?? 0,   label: "Active", color: "text-amber-400" },
              { n: data?.deferredSessions.length ?? 0, label: "Deferred", color: "text-violet-400" },
              { n: data?.signedSessions.length ?? 0,   label: "Signed", color: "text-emerald-400" },
            ].filter(s => s.n > 0).map(s => (
              <span key={s.label} className={cn("text-[11px] font-mono", s.color)}>
                {s.n} {s.label}
              </span>
            ))}
          </div>
        </div>
        <button
          onClick={handleSync}
          disabled={syncing}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#2563ba]/15 border border-[#2563ba]/25 text-[#4a8fd4] text-xs font-inter font-medium hover:bg-[#2563ba]/25 transition-all active:scale-95 disabled:opacity-60 shrink-0"
        >
          <RefreshCw className={cn("w-3.5 h-3.5", syncing && "animate-spin")} />
          Sync CP
        </button>
      </div>

      {/* ── Toast ── */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className={cn(
              "flex items-center gap-2 px-4 py-3 rounded-xl border text-xs font-mono mb-4",
              toast.type === "ok"
                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
                : "bg-rose-500/10 border-rose-500/20 text-rose-300"
            )}
          >
            {toast.type === "ok" ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        <div className="py-24 flex flex-col items-center gap-4 opacity-40">
          <Loader2 className="w-8 h-8 animate-spin" />
          <p className="text-sm font-mono">Loading work board…</p>
        </div>
      ) : !data || total === 0 ? (
        <EmptyState label="All clear — no active jobs" />
      ) : (
        <div className="space-y-6">

          {/* ── ACTIVE SESSIONS (urgent, always top) ── */}
          {data.activeSessions.length > 0 && (
            <section>
              <SectionHeader icon={AlertCircle} label="In Inspection" count={data.activeSessions.length} color="bg-amber-500/15 text-amber-400" sublabel="Resume now" />
              <div className="space-y-2">
                <AnimatePresence>
                  {data.activeSessions.map(s => (
                    <ActiveSessionCard key={s.session_id} session={s} onResume={handleResume} />
                  ))}
                </AnimatePresence>
              </div>
            </section>
          )}

          {/* ── DEFERRED ── */}
          {data.deferredSessions.length > 0 && (
            <section>
              <SectionHeader icon={PauseCircle} label="Pending Signature" count={data.deferredSessions.length} color="bg-violet-500/12 text-violet-400" sublabel="Homeowner hasn't signed yet" />
              <div className="space-y-2">
                <AnimatePresence>
                  {data.deferredSessions.map(s => (
                    <DeferredCard key={s.session_id} session={s} onResume={handleResume} />
                  ))}
                </AnimatePresence>
              </div>
            </section>
          )}

          {/* ── SCHEDULED ── */}
          {data.scheduled.length > 0 && (
            <section>
              <SectionHeader icon={Calendar} label="Scheduled" count={data.scheduled.length} color="bg-[#2a8a82]/15 text-[#3aada3]" />
              <div className="space-y-2">
                <AnimatePresence>
                  {data.scheduled.map(l => (
                    <ScheduledCard key={l.id} lead={l} onLaunch={handleLaunch} />
                  ))}
                </AnimatePresence>
              </div>
            </section>
          )}

          {/* ── NEEDS SCHEDULING ── */}
          {data.needsScheduling.length > 0 && (
            <section>
              <SectionHeader icon={Phone} label="Needs Scheduling" count={data.needsScheduling.length} color="bg-[#2563ba]/12 text-[#4a8fd4]" />
              <div className="space-y-2">
                <AnimatePresence>
                  {data.needsScheduling.map(l => (
                    <NeedsSchedulingCard
                      key={l.id} lead={l}
                      onSchedule={lead => setSchedLead(lead)}
                      onLaunch={handleLaunch}
                    />
                  ))}
                </AnimatePresence>
              </div>
            </section>
          )}

          {/* ── NEW IN CP INBOX ── */}
          {data.cpInbox.length > 0 && (
            <section>
              <SectionHeader icon={Inbox} label="New in CP Inbox" count={data.cpInbox.length} color="bg-sky-500/12 text-sky-400" sublabel="Import to start working" />
              <div className="space-y-2">
                <AnimatePresence>
                  {data.cpInbox.map(job => (
                    <CpInboxCard
                      key={job.id} job={job}
                      onImport={handleImport}
                      importing={importingId === job.id}
                    />
                  ))}
                </AnimatePresence>
              </div>
            </section>
          )}

          {/* ── SIGNED ── */}
          {data.signedSessions.length > 0 && (
            <section>
              <SectionHeader icon={CheckCircle2} label="Signed" count={data.signedSessions.length} color="bg-emerald-500/12 text-emerald-400" />
              <div className="space-y-2">
                <AnimatePresence>
                  {data.signedSessions.map(s => (
                    <SignedCard key={s.session_id} session={s} onExport={handleExport} />
                  ))}
                </AnimatePresence>
              </div>
            </section>
          )}
        </div>
      )}

      {/* ── Schedule Modal (inline) ── */}
      <ScheduleModal
        open={!!schedLead}
        leadName={schedLead ? propertyName(schedLead) : ""}
        schedDate={schedDate}
        schedTime={schedTime}
        schedDuration={schedDur}
        clashWarning={clashWarn}
        scheduling={scheduling}
        onDateChange={setSchedDate}
        onTimeChange={setSchedTime}
        onDurationChange={setSchedDur}
        onClose={() => { setSchedLead(null); setClashWarn(null); }}
        onConfirm={async (force) => {
          if (!schedLead) return;
          const start = new Date(`${schedDate}T${schedTime}:00`);
          const end   = new Date(start.getTime() + schedDur * 60000);
          setScheduling(true); setClashWarn(null);
          try {
            if (repId) {
              const res = await createAppointment({
                pipeline_lead_id: schedLead.id,
                rep_id: repId,
                appointment_start_at: start.toISOString(),
                appointment_end_at: end.toISOString(),
              });
              if (res.status === 409 && !force) {
                const d = await res.json();
                setClashWarn(d.message || "Schedule conflict detected.");
                return;
              }
              if (!res.ok && !force) throw new Error("Failed to create appointment");
            }
            setSchedLead(null); setClashWarn(null);
            await load();
            showToast(`Scheduled: ${propertyName(schedLead)}`);
          } catch { showToast("Scheduling failed", "err"); }
          finally { setScheduling(false); }
        }}
      />
    </div>
  );
}
