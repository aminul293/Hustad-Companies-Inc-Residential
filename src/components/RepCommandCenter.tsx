"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import {
  Search,
  ChevronRight,
  LayoutGrid,
  CheckCircle2,
  Calendar,
  CalendarDays,
  User,
  ArrowLeft,
  AlertCircle,
  Settings,
  UserPlus,
  Trash,
  Info,
  PlayCircle,
  RefreshCw,
  Smartphone,
  Copy,
  Check as CheckIcon,
  LogOut,
  Shield,
  AlertTriangle,
  MoreHorizontal,
  Activity,
  Inbox,
  X,
  BookOpen,
  ExternalLink,
} from "lucide-react";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import { createSession, saveSession, listDrafts, findDraftByImportId, loadDraftById, deleteDraft } from "@/lib/session";
import type { SessionState } from "@/types/session";
import { getLiveReps, saveCustomRep, deleteCustomRep } from "@/lib/reps";
import {
  enqueueCompletion, dequeueCompletion, getAllPending,
  recordRetryAttempt, isReadyForRetry,
} from "@/lib/sessionRetryQueue";
import type { RepIdentity } from "@/config/reps";
import type { AuthenticatedRep } from "@/lib/rep-identity";
import { motion, AnimatePresence } from "framer-motion";
import {
  useRepCommandCenter, IntakePrefill, CommandCenterView,
} from "./repcommand/useRepCommandCenter";
import { SessionCard }        from "./repcommand/SessionCard";
import { ImportConfirmModal } from "./repcommand/ImportConfirmModal";
import { MobileMoreDrawer }   from "./repcommand/MobileMoreDrawer";
import { CenterPointJobs } from "@/components/CenterPointJobs";
import { CenterPointOpportunities } from "@/components/CenterPointOpportunities";
import { HustadTickets } from "@/components/HustadTickets";
import { PipelineLeads } from "@/components/PipelineLeads";
import { MySchedule } from "@/components/MySchedule";
import { CalendarView } from "@/components/CalendarView";
import { ManagerDashboard } from "@/components/ManagerDashboard";
import { buildRepCaptureEmail } from "@/lib/rep-capture-email";
import { fetchCurrentUser } from "@/lib/api";

export type { IntakePrefill };

interface Props {
  currentRep: AuthenticatedRep;
  onLoadDraft: (id: string) => void;
  onNewSession: () => void;
  onPrefillAndStart: (data: IntakePrefill) => void;
  onBack?: () => void;
  onResetSession?: () => void;
}

export function RepCommandCenter({ currentRep, onLoadDraft, onNewSession, onPrefillAndStart, onBack, onResetSession }: Props) {
  const r = useRepCommandCenter({ currentRep, onLoadDraft, onPrefillAndStart, onResetSession });
  const [userRole, setUserRole] = useState<string | null>(null);

  const loadRole = useCallback(async () => {
    const me = await fetchCurrentUser();
    if (me) setUserRole(me.role);
  }, []);

  useEffect(() => { loadRole(); }, [loadRole]);

  const isManager = userRole === "manager";

  return (
    <div className="flex flex-col h-full bg-[var(--bg-base)] text-[var(--tx1)] transition-colors duration-300">
      {/* Import error banner */}
      <AnimatePresence>
        {r.importError && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="flex items-center justify-between gap-3 px-6 py-3 bg-rose-500/10 border-b border-rose-500/20 text-rose-300 text-xs font-mono"
          >
            <span className="flex items-center gap-2">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              {r.importError}
            </span>
            <button onClick={() => r.setImportError(null)} className="text-rose-400/50 hover:text-rose-300 transition-colors shrink-0">
              <Info className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Import success banner */}
      <AnimatePresence>
        {r.importSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="flex items-center justify-between gap-3 px-6 py-3 bg-emerald-500/10 border-b border-emerald-500/20 text-emerald-300 text-xs font-mono"
          >
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              {r.importSuccess}
            </span>
            <button onClick={() => r.setImportSuccess(null)} className="text-emerald-400/50 hover:text-emerald-300 transition-colors shrink-0">
              <Info className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Incomplete import banner — offers "Fix & Start" when import data is partial */}
      <AnimatePresence>
        {r.pendingPrefill && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="flex items-center justify-between gap-3 px-6 py-3 bg-amber-500/10 border-b border-amber-500/20 text-amber-300 text-xs font-mono"
          >
            <span className="flex items-center gap-2">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              This import is missing required information.
            </span>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => { onPrefillAndStart(r.pendingPrefill!); r.setPendingPrefill(null); }}
                className="px-3 py-1.5 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-200 hover:bg-amber-500/30 transition-colors font-display text-[10px] font-medium"
              >
                Fix &amp; Start Inspection
              </button>
              <button onClick={() => r.setPendingPrefill(null)} className="text-amber-400/50 hover:text-amber-300 transition-colors">
                <Info className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Duplicate import banner — routes rep to the existing session */}
      <AnimatePresence>
        {r.pendingDuplicate && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="flex items-center justify-between gap-3 px-6 py-3 bg-sky-500/10 border-b border-sky-500/20 text-sky-300 text-xs font-mono"
          >
            <span className="flex items-center gap-2">
              <Info className="w-3.5 h-3.5 shrink-0" />
              Inspection already exists. Opening existing draft.
            </span>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => { onLoadDraft(r.pendingDuplicate!.sessionId); r.setPendingDuplicate(null); }}
                className="px-3 py-1.5 rounded-xl bg-sky-500/20 border border-sky-500/30 text-sky-200 hover:bg-sky-500/30 transition-colors font-display text-[10px] font-medium"
              >
                Open Inspection
              </button>
              <button onClick={() => r.setPendingDuplicate(null)} className="text-sky-400/50 hover:text-sky-300 transition-colors">
                <Info className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sync warning banner */}
      <AnimatePresence>
        {r.syncWarning && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="flex items-center justify-between gap-3 px-6 py-3 bg-amber-500/10 border-b border-amber-500/20 text-amber-300 text-xs font-mono"
          >
            <span className="flex items-center gap-2">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              Sync failed — inspection data saved locally and will retry automatically
            </span>
            <button onClick={() => r.setSyncWarning(false)} className="text-amber-400/50 hover:text-amber-300 transition-colors shrink-0">
              <Info className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="px-4 pt-4 pb-0 space-y-4 md:px-8 md:pt-8 md:space-y-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {onBack && (
              <button
                onClick={onBack}
                className="p-2.5 md:p-3 rounded-2xl dark:bg-white/5 bg-black/5 dark:border-white/10 border-black/10 hover:bg-[var(--tx1)] hover:text-[var(--bg-base)] transition-all shrink-0"
              >
                <ArrowLeft className="w-4 h-4 md:w-5 md:h-5" />
              </button>
            )}
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <h1 className="text-xl md:text-3xl font-display font-medium tracking-tight">
                  {{ dashboard: "Inspections", pipeline: "Pipeline", schedule: "My Schedule", calendar: "Calendar", centerpoint: "New Leads", opportunities: "Opportunities", tickets: "Tickets", manager: "Manager", settings: "Settings" }[r.view]}
                </h1>
                {r.pendingCompletions > 0 && (
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/25 text-[9px] font-mono text-amber-400 uppercase tracking-widest">
                    <AlertCircle className="w-2.5 h-2.5" />
                    {r.pendingCompletions}
                  </span>
                )}
              </div>
              <p className="hidden md:block text-sm text-[#7090B0] font-light">
                {{ dashboard: "Field intelligence and session management.", pipeline: "Manage leads from reach-out to appointment scheduling.", schedule: "Appointments, conflicts, and daily work queue.", calendar: "Day and week r.view with conflict detection and route navigation.", centerpoint: "Jobs synced from CenterPoint Connect.", opportunities: "Sales opportunities created from inspection sessions.", tickets: "Your managed pipeline — stages, touches, and write-back.", manager: "All-rep activity, no-shows, follow-ups, and queue health.", settings: "Manage field identities and operational parameters." }[r.view]}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Tab switcher — tablet/desktop only */}
            <div className="hidden md:flex items-center gap-1 p-1 dark:bg-white/5 bg-black/5 dark:border-white/10 border-black/10 rounded-full">
              {([
                { id: "centerpoint",   label: "New Leads",  managerOnly: false },
                { id: "dashboard",     label: "Inspections",managerOnly: false },
                { id: "pipeline",      label: "Pipeline",   managerOnly: false },
                { id: "schedule",      label: "My Schedule",managerOnly: false },
                { id: "calendar",      label: "Calendar",   managerOnly: false },
                { id: "opportunities", label: "Opps",       managerOnly: false },
                { id: "manager",       label: "Manager",    managerOnly: true  },
                { id: "settings",      label: "Settings",   managerOnly: false },
              ] as const).filter(tab => !tab.managerOnly || isManager).map(tab => (
                <button
                  key={tab.id}
                  onClick={() => r.setView(tab.id)}
                  className={cn(
                    "px-4 py-2 rounded-full text-xs font-inter transition-all",
                    r.view === tab.id ? "bg-[var(--tx1)] text-[var(--bg-base)]" : "text-[#567090] hover:text-[var(--tx1)]"
                  )}
                >{tab.label}</button>
              ))}
            </div>
            {/* Mobile: settings icon shortcut */}
            <button
              onClick={() => r.setView("settings")}
              className={cn(
                "md:hidden p-2.5 rounded-2xl border transition-all",
                r.view === "settings"
                  ? "dark:bg-white/10 bg-black/10 dark:border-white/20 border-black/20 text-[var(--tx1)]"
                  : "dark:bg-white/5 bg-black/5 dark:border-white/10 border-black/10 text-[#567090]"
              )}
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>

        {r.view === "dashboard" && (
          <>
            {/* ── Stripi-style KPI balance cards ── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
              {[
                { label: "Active sessions", value: r.stats.active,         sub: "in field or drafting",      dot: "#2563ba", dotBg: "rgba(37,99,186,0.12)"  },
                { label: "Pending review",  value: r.stats.pending,        sub: "deferred or locked",        dot: "#29b572", dotBg: "rgba(41,181,114,0.12)" },
                { label: "Needs attention", value: r.stats.missing,        sub: "missing required fields",   dot: "#d24c47", dotBg: "rgba(210,76,71,0.12)"  },
                { label: "Reconciliation",  value: r.stats.reconciliation, sub: "discrepancies to resolve",  dot: "#d6a800", dotBg: "rgba(214,168,0,0.12)"  },
              ].map((s, i) => (
                <div
                  key={i}
                  className="rounded-2xl dark:border-white/[0.08] border-black/[0.08] dark:bg-white/[0.025] bg-black/[0.025] p-4 md:p-5 dark:hover:border-white/[0.16] hover:border-black/[0.16] dark:hover:bg-white/[0.04] hover:bg-black/[0.04] transition-all duration-200"
                  style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.3)" }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span
                      className="text-[10px] font-inter font-normal uppercase tracking-[0.1px]"
                      style={{ color: "#8BA5C5", letterSpacing: "0.1px" }}
                    >
                      {s.label}
                    </span>
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ background: s.dot, boxShadow: `0 0 6px ${s.dot}80` }}
                    />
                  </div>
                  <p
                    className="font-inter font-light leading-none mb-1.5"
                    style={{
                      fontSize: 32,
                      letterSpacing: "-0.64px",
                      fontFeatureSettings: '"ss01" 1, "tnum" 1',
                      color: "var(--tx1)",
                    }}
                  >
                    {r.isLoading
                      ? <span className="inline-block w-5 h-5 border-2 dark:border-white/10 border-black/10 dark:border-t-white/40 border-t-black/40 rounded-full animate-spin" />
                      : s.value}
                  </p>
                  <p className="text-[11px] font-inter font-light" style={{ color: "#567090" }}>{s.sub}</p>
                </div>
              ))}
            </div>

            {/* ── Search + Stripi tab-bar r.filter ── */}
            <div className="flex flex-col gap-0">
              <div className="relative w-full mb-0">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#3F5878]" />
                <input
                  type="text"
                  placeholder="Search address or homeowner..."
                  value={r.search}
                  onChange={(e) => r.setSearch(e.target.value)}
                  className="w-full dark:bg-white/[0.03] bg-black/[0.03] dark:border-white/[0.1] border-black/[0.1] rounded-t-2xl rounded-b-none py-3 md:py-3.5 pl-11 pr-6 text-sm outline-none focus:border-[#2563ba]/60 transition-all text-[var(--tx1)] placeholder:text-[var(--tx4)]"
                />
              </div>
              {/* Stripi tab-bar r.filter */}
              <div
                className="flex items-center overflow-x-auto dark:border-white/[0.1] border-black/[0.1] border border-t-0 rounded-b-2xl px-2"
                style={{ background: "rgba(128,128,128,0.03)" }}
              >
                {[
                  { id: "all",                        label: "All" },
                  { id: "missing",                    label: "Attention" },
                  { id: "full_restoration_candidate", label: "Restoration" },
                  { id: "claim_review_candidate",     label: "Claims" },
                  { id: "repair_only",                label: "Repairs" },
                  { id: "no_damage",                  label: "No Damage" },
                ].map(f => (
                  <button
                    key={f.id}
                    onClick={() => r.setFilter(f.id)}
                    className="px-3 py-2.5 text-xs font-inter whitespace-nowrap transition-all duration-150"
                    style={{
                      color:        r.filter === f.id ? "#2563ba" : "#567090",
                      borderTop:    "none",
                      borderLeft:   "none",
                      borderRight:  "none",
                      borderBottom: r.filter === f.id ? "2px solid #2563ba" : "2px solid transparent",
                      marginBottom: -1,
                      background:   "transparent",
                      fontWeight:   r.filter === f.id ? 500 : 300,
                    }}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      <div className={cn("flex-1 min-h-0 overflow-hidden", ["calendar", "manager"].includes(r.view) ? "flex flex-col" : "overflow-y-auto px-4 py-4 md:p-8 pb-24 md:pb-8")}>
        {r.view === "calendar" ? (
          <CalendarView currentRep={currentRep} managerMode={r.view === "calendar"} />
        ) : r.view === "manager" ? (
          <ManagerDashboard currentRep={currentRep} />
        ) : r.view === "centerpoint" ? (
          <CenterPointJobs />
        ) : r.view === "opportunities" ? (
          <CenterPointOpportunities />
        ) : r.view === "schedule" ? (
          <MySchedule currentRep={currentRep} />
        ) : r.view === "pipeline" ? (
          <PipelineLeads repId={isManager ? undefined : currentRep.id} repEmail={currentRep.email} />
        ) : r.view === "tickets" ? (
          <HustadTickets />
        ) : r.view === "dashboard" ? (
          <div className="space-y-4">

            {/* ── Upcoming Scheduled Inspections from Pipeline ── */}
            {r.scheduledLeads.length > 0 && (
              <div className="mb-2">
                <p className="text-[9px] font-mono uppercase tracking-[0.2em] mb-3 flex items-center gap-2" style={{ color: "rgba(58,173,163,0.70)" }}>
                  <CalendarDays className="w-3 h-3" />
                  Upcoming · {r.scheduledLeads.length} scheduled
                </p>
                <div className="space-y-2 mb-5">
                  {r.scheduledLeads.map((lead: any) => {
                    const startDt = lead.scheduled_start_at ? new Date(lead.scheduled_start_at) : null;
                    const dateStr = startDt
                      ? startDt.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })
                      : "Scheduled";
                    const timeStr = startDt
                      ? startDt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })
                      : "";
                    return (
                      <div
                        key={lead.id}
                        className="group p-5 rounded-[24px] transition-all flex items-center justify-between" style={{ background: "rgba(42,138,130,0.07)", border: "1px solid rgba(42,138,130,0.18)" }}
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(42,138,130,0.12)", border: "1px solid rgba(42,138,130,0.18)" }}>
                            <CalendarDays className="w-4 h-4" style={{ color: "#3aada3" }} />
                          </div>
                          <div>
                            <p className="text-sm font-display font-medium text-[var(--tx1)]">
                              {lead.centerpoint_jobs?.property_name || lead.centerpoint_jobs?.name || lead.cpc_ticket_id}
                            </p>
                            <p className="text-[10px] font-mono text-[#4D678A] uppercase tracking-wider mt-0.5">
                              {dateStr}{timeStr ? ` · ${timeStr}` : ""}
                              {lead.centerpoint_jobs?.raw?._owner ? ` · ${lead.centerpoint_jobs.raw._owner}` : ""}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            const apptId = lead.appointments?.find((a: any) => a.assigned_rep_id === currentRep.id)?.id || lead.appointments?.[0]?.id;
                            window.dispatchEvent(new CustomEvent("launchPipelineSession", { detail: { ...lead, appointmentId: apptId } }));
                          }}
                          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl active:scale-95 transition-all text-xs font-inter font-medium shrink-0" style={{ background: "rgba(42,138,130,0.14)", border: "1px solid rgba(42,138,130,0.26)", color: "#3aada3" }}
                        >
                          <PlayCircle className="w-3.5 h-3.5" />
                          Start Inspection
                        </button>
                      </div>
                    );
                  })}
                </div>
                <div className="h-px dark:bg-white/[0.05] bg-black/[0.08] mb-5" />
              </div>
            )}

            {r.filteredDrafts.length > 0 ? (
              <div className="grid grid-cols-1 gap-4">
                {r.filteredDrafts.map(d => (
                  <SessionCard
                    key={d.sessionId}
                    draft={d}
                    retryingSessionId={r.retryingSessionId}
                    confirmDeleteId={r.confirmDeleteId}
                    copiedSessionId={r.copiedSessionId}
                    exportingPDFId={r.exportingPDFId}
                    onOpen={onLoadDraft}
                    onRetry={r.handleManualRetry}
                    onDelete={r.handleDeleteDraft}
                    onReopen={r.handleReopen}
                    onExportPDF={r.handleExportPDF}
                    onCopy={sessionId => {
                      const url = `${typeof window !== "undefined" ? window.location.origin : ""}/rep-capture?s=${sessionId}`;
                      navigator.clipboard.writeText(url);
                      r.setCopiedSessionId(sessionId);
                      setTimeout(() => r.setCopiedSessionId(null), 2000);
                    }}
                  />
                ))}
              </div>
            ) : (
              <div className="py-20 text-center opacity-30">
                <Search className="w-12 h-12 mx-auto mb-4" />
                <p className="font-display">No sessions found</p>
              </div>
            )}
          </div>
        ) : (
          <div className="max-w-3xl space-y-8">
            {/* ── Signed-in account ── */}
            <div className="p-6 rounded-2xl dark:bg-white/[0.03] bg-black/[0.03] dark:border-white/[0.08] border-black/[0.08] flex items-center justify-between gap-4">
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-10 h-10 rounded-full bg-[#1e4d8c]/20 border border-[#2563ba]/25 flex items-center justify-center shrink-0">
                  <Shield className="w-5 h-5 text-[#4a8fd4]" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-display font-medium text-[var(--tx1)] truncate">{currentRep.name}</p>
                  <p className="text-[11px] font-mono text-[#4D678A] truncate">{currentRep.email}</p>
                  <p className="text-[9px] font-mono text-[#2D4060] uppercase tracking-widest mt-0.5">Hustad Rep · Azure AD</p>
                </div>
              </div>
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-mono uppercase tracking-widest hover:bg-rose-500/20 transition-all active:scale-95 shrink-0"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sign out
              </button>
            </div>

            {/* ── User Guide ── */}
            <a
              href="/guide"
              target="_blank"
              rel="noopener noreferrer"
              className="p-5 rounded-2xl dark:bg-white/[0.03] bg-black/[0.03] dark:border-white/[0.08] border-black/[0.08] flex items-center justify-between gap-4 dark:hover:bg-white/[0.05] hover:bg-black/[0.05] hover:border-[#4a8fd4]/30 transition-all group"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-[#1e4d8c]/20 border border-[#2563ba]/25 flex items-center justify-center shrink-0">
                  <BookOpen className="w-5 h-5 text-[#4a8fd4]" />
                </div>
                <div>
                  <p className="text-sm font-display font-medium text-[var(--tx1)]">Platform User Guide</p>
                  <p className="text-[11px] font-mono text-[#4D678A]">Walkthroughs, field workflows, and AI classification reference</p>
                </div>
              </div>
              <ExternalLink className="w-4 h-4 text-[#3F5878] group-hover:text-[#4a8fd4] transition-colors shrink-0" />
            </a>

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h3 className="text-xl font-display font-medium">Field Operatives</h3>
                <p className="text-xs text-[#567090]">Add or manage reps authorized for forensic sessions.</p>
              </div>
              <button 
                onClick={() => r.setIsAdding(!r.isAdding)}
                className="flex items-center gap-2 text-xs font-inter text-[#4a8fd4] hover:text-[#8BA5C5] transition-colors"
              >
                <UserPlus className="w-4 h-4" />
                Add New Rep
              </button>
            </div>

            {r.isAdding && (
              <div className="p-6 rounded-3xl dark:bg-white/[0.03] bg-black/[0.03] dark:border-white/10 border-black/10 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <input 
                    className="dark:bg-white/5 bg-black/5 dark:border-white/10 border-black/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#2563ba]/60 text-[var(--tx1)]"
                    placeholder="Rep Full Name"
                    value={r.newRep.name}
                    onChange={(e) => r.setNewRep({...r.newRep, name: e.target.value})}
                  />
                  <input 
                    className="dark:bg-white/5 bg-black/5 dark:border-white/10 border-black/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#2563ba]/60 text-[var(--tx1)]"
                    placeholder="Role (e.g. Director)"
                    value={r.newRep.role}
                    onChange={(e) => r.setNewRep({...r.newRep, role: e.target.value})}
                  />
                </div>
                <div className="flex justify-end gap-3">
                  <button onClick={() => r.setIsAdding(false)} className="text-xs text-[#567090] px-4">Cancel</button>
                  <button 
                    onClick={() => {
                      saveCustomRep({ id: `custom_${Date.now()}`, name: r.newRep.name, role: r.newRep.role, active: true });
                      r.setIsAdding(false);
                      r.setNewRep({ name: "", role: "" });
                      r.setLiveReps(getLiveReps());
                    }}
                    className="bg-[#2563ba] text-[#E8EDF8] px-6 py-2 rounded-2xl text-xs font-inter font-medium"
                  >
                    Save Operative
                  </button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 gap-3">
              {r.liveReps.map((rep) => (
                <div key={rep.id} className="p-5 rounded-2xl dark:bg-white/[0.02] bg-black/[0.02] dark:border-white/[0.05] border-black/[0.05] flex items-center justify-between group dark:hover:bg-white/[0.04] hover:bg-black/[0.04] transition-all">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl dark:bg-white/5 bg-black/5 flex items-center justify-center">
                      <User className="w-5 h-5 text-[#567090]" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[var(--tx1)]">{rep.name}</p>
                      <p className="text-[10px] font-mono text-[#3F5878] uppercase tracking-widest">{rep.role}</p>
                    </div>
                  </div>
                  {rep.id.startsWith("custom_") && (
                    <button 
                      onClick={() => { deleteCustomRep(rep.id); r.setLiveReps(getLiveReps()); }}
                      className="p-2 text-[#1F2E48] hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Trash className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Mobile Bottom Nav (hidden on md+) ─────────────────────────────────── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around dark:bg-[#0a0f1a]/95 bg-white/95 backdrop-blur-xl border-t dark:border-white/[0.08] border-black/[0.08] pb-safe">
        {([
          { id: "centerpoint", label: "New Leads", icon: Inbox },
          { id: "dashboard",   label: "Inspect",  icon: LayoutGrid },
          { id: "pipeline",    label: "Pipeline", icon: Activity },
          { id: "schedule",    label: "Schedule", icon: Calendar },
        ] as const).map(tab => (
          <button
            key={tab.id}
            onClick={() => { r.setView(tab.id); r.setMoreOpen(false); }}
            className={cn(
              "flex flex-col items-center gap-1 py-3 px-4 min-w-[56px] transition-all active:scale-95",
              r.view === tab.id ? "text-[#4a8fd4]" : "text-[#3F5878]"
            )}
          >
            <tab.icon className="w-5 h-5" />
            <span className="text-[9px] font-mono uppercase tracking-wider">{tab.label}</span>
            {r.view === tab.id && <span className="absolute bottom-0 w-5 h-0.5 rounded-full bg-[#4a8fd4]" />}
          </button>
        ))}
        <button
          onClick={() => r.setMoreOpen(prev => !prev)}
          className={cn(
            "flex flex-col items-center gap-1 py-3 px-4 min-w-[56px] transition-all active:scale-95 relative",
            r.moreOpen || ["opportunities","calendar","tickets","manager"].includes(r.view) ? "text-[#4a8fd4]" : "text-[#3F5878]"
          )}
        >
          <MoreHorizontal className="w-5 h-5" />
          <span className="text-[9px] font-mono uppercase tracking-wider">More</span>
        </button>
      </nav>

      {/* Mobile "More" Drawer */}
      <MobileMoreDrawer
        open={r.moreOpen}
        view={r.view}
        onNavigate={v => { r.setView(v); r.setMoreOpen(false); }}
        onClose={() => r.setMoreOpen(false)}
        onNewSession={onNewSession}
      />

      {/* Import confirmation modal */}
      <ImportConfirmModal
        pendingImport={r.pendingImport}
        isConfirming={r.isConfirming}
        onConfirm={r.handleConfirmImport}
        onDismiss={r.handleDismissImport}
      />
    </div>
  );
}
