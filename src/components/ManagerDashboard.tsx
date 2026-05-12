"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CalendarDays, UserX, AlarmClock, CheckCircle2, AlertTriangle,
  RefreshCw, ChevronDown, ChevronRight, Users, Zap, XCircle,
  Clock, MapPin, Phone, Navigation2, PlayCircle, X, Database,
  TrendingDown, Activity, UserPlus
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { AuthenticatedRep } from "@/lib/rep-identity";

// ── Types ──────────────────────────────────────────────────────────────────────
interface Appointment {
  id: string;
  appointment_start_at: string;
  appointment_end_at: string;
  appointment_status: string;
  assigned_rep_id: string | null;
  notes: string | null;
  pipeline_leads: {
    id: string;
    cpc_ticket_id: string;
    pipeline_status: string;
    next_follow_up_at: string | null;
    contact_attempt_count: number;
    centerpoint_jobs: { property_name: string | null; name: string; raw?: Record<string, any> } | null;
  } | null;
}

interface OverdueLead {
  id: string;
  cpc_ticket_id: string;
  pipeline_status: string;
  contact_attempt_count: number;
  next_follow_up_at: string | null;
  assigned_rep_id: string | null;
  centerpoint_jobs: { property_name: string | null; name: string; raw?: Record<string, any> } | null;
}

interface OutboundFailure {
  id: string;
  target_system: string;
  action: string;
  status: string;
  error: string | null;
  retry_count: number;
  created_at: string;
  updated_at: string;
  target_id: string | null;
}

interface ManagerData {
  appointments_today: Appointment[];
  conflicts: Array<{ a: Appointment; b: Appointment }>;
  overdue_followups: OverdueLead[];
  outbound_failures: OutboundFailure[];
}

interface Props {
  currentRep: AuthenticatedRep;
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
}
function fmtShortDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
function navigate(address: string) {
  const encoded = encodeURIComponent(address);
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const url = isIOS
    ? `maps://maps.apple.com/?daddr=${encoded}`
    : `https://www.google.com/maps/dir/?api=1&destination=${encoded}`;
  window.open(url, "_blank");
}

function getAddress(a: Appointment) {
  return a.pipeline_leads?.centerpoint_jobs?.property_name ||
         a.pipeline_leads?.cpc_ticket_id || "Unknown";
}
function getOwner(a: Appointment) {
  return a.pipeline_leads?.centerpoint_jobs?.raw?._owner || "";
}
function getPhone(a: Appointment) {
  return a.pipeline_leads?.centerpoint_jobs?.raw?._phone || "";
}

const STATUS_DOT: Record<string, string> = {
  scheduled:   "bg-emerald-400",
  confirmed:   "bg-sky-400",
  rescheduled: "bg-amber-400",
  no_show:     "bg-rose-400",
  cancelled:   "bg-white/20",
  completed:   "bg-purple-400",
};
const STATUS_LABEL: Record<string, string> = {
  scheduled: "Scheduled", confirmed: "Confirmed", rescheduled: "Rescheduled",
  no_show: "No Show", cancelled: "Cancelled", completed: "Completed",
};

// ── Main Component ─────────────────────────────────────────────────────────────
export function ManagerDashboard({ currentRep }: Props) {
  const [data, setData]       = useState<ManagerData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [expandedRep, setExpandedRep] = useState<string | null>(null);
  const [retryCooldown, setRetryCooldown] = useState(false);
  const [dbReps, setDbReps]   = useState<{ id: string; name: string; role: string; active: boolean }[]>([]);

  useEffect(() => {
    fetch("/api/reps")
      .then(r => r.json())
      .then(({ reps }) => { if (reps) setDbReps(reps); })
      .catch(() => {/* non-fatal */});
  }, []);

  const resolveRepName = (id: string) =>
    dbReps.find(r => r.id === id)?.name ?? id;

  const fetchData = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch(`/api/appointments/manager?t=${Date.now()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setData(json);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-5 h-5 text-white/20 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center">
        <p className="text-rose-400 text-sm">{error}</p>
        <button onClick={fetchData} className="mt-4 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-xs text-white/60 hover:text-white transition-all">
          Retry
        </button>
      </div>
    );
  }

  if (!data) return null;

  const { appointments_today, conflicts, overdue_followups, outbound_failures } = data;

  // Derive stats
  const total        = appointments_today.length;
  const completed    = appointments_today.filter(a => a.appointment_status === "completed").length;
  const noShows      = appointments_today.filter(a => a.appointment_status === "no_show").length;
  const scheduled    = appointments_today.filter(a => ["scheduled", "confirmed", "rescheduled"].includes(a.appointment_status)).length;
  const conflictCount = conflicts.length;
  const overdueCount  = overdue_followups.length;
  const failedQueue   = outbound_failures.length;

  // Group appointments by rep
  const byRep: Record<string, Appointment[]> = {};
  for (const a of appointments_today) {
    const key = a.assigned_rep_id ?? "unassigned";
    if (!byRep[key]) byRep[key] = [];
    byRep[key].push(a);
  }

  // Conflict appointment IDs
  const conflictApptIds = new Set<string>();
  for (const { a, b } of conflicts) {
    conflictApptIds.add(a.id); conflictApptIds.add(b.id);
  }

  return (
    <div className="flex-1 overflow-y-auto p-8 space-y-8">
      {/* Refresh row */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[9px] font-mono text-white/25 uppercase tracking-[0.2em]">
            {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
          </p>
        </div>
        <button onClick={fetchData}
          className="flex items-center gap-2 text-[10px] font-mono text-white/30 hover:text-white uppercase tracking-widest transition-colors">
          <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
          Refresh
        </button>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Today",       value: total,         icon: CalendarDays, color: "text-white/60",    bg: "bg-white/[0.02]",       border: "border-white/[0.07]" },
          { label: "Remaining",         value: scheduled,     icon: Clock,        color: "text-emerald-400", bg: "bg-emerald-500/[0.04]", border: "border-emerald-500/[0.12]" },
          { label: "Completed",         value: completed,     icon: CheckCircle2, color: "text-purple-400",  bg: "bg-purple-500/[0.04]",  border: "border-purple-500/[0.12]" },
          { label: "No Shows",          value: noShows,       icon: UserX,        color: "text-rose-400",    bg: "bg-rose-500/[0.04]",    border: "border-rose-500/[0.12]" },
          { label: "Conflicts",         value: conflictCount, icon: AlertTriangle,color: "text-amber-400",   bg: "bg-amber-500/[0.04]",   border: "border-amber-500/[0.12]" },
          { label: "Overdue Follow-ups",value: overdueCount,  icon: AlarmClock,   color: "text-orange-400",  bg: "bg-orange-500/[0.04]",  border: "border-orange-500/[0.12]" },
          { label: "Failed Queue",      value: failedQueue,   icon: Database,     color: "text-red-400",     bg: "bg-red-500/[0.04]",     border: "border-red-500/[0.12]" },
          { label: "Active Reps Today", value: Object.keys(byRep).length, icon: Users, color: "text-sky-400", bg: "bg-sky-500/[0.04]", border: "border-sky-500/[0.12]" },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
            className={cn("p-6 rounded-[28px] border transition-all", s.bg, s.border)}>
            <div className="flex items-center justify-between mb-4">
              <div className={cn("p-2 rounded-xl bg-white/5", s.color)}>
                <s.icon className="w-4 h-4" />
              </div>
            </div>
            <p className="text-3xl font-display font-semibold tracking-tight mb-1">{s.value}</p>
            <p className="text-[10px] font-mono text-white/35 uppercase tracking-widest">{s.label}</p>
          </motion.div>
        ))}
      </div>

      {/* ── Conflicts ── */}
      {conflicts.length > 0 && (
        <section className="space-y-4">
          <SectionHeader icon={AlertTriangle} label="Scheduling Conflicts" count={conflicts.length} color="text-amber-400" />
          <div className="space-y-3">
            {conflicts.map(({ a, b }, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                className="p-5 rounded-2xl bg-amber-500/[0.05] border border-amber-500/25 space-y-3">
                <p className="text-[9px] font-mono text-amber-400/70 uppercase tracking-widest">
                  Rep: {a.assigned_rep_id ?? "Unknown"}
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {[a, b].map(appt => (
                    <div key={appt.id} className="p-3 rounded-xl bg-black/20 border border-white/[0.06]">
                      <p className="text-xs font-display font-medium text-white/90 truncate">{getAddress(appt)}</p>
                      <p className="text-[10px] font-mono text-white/40 mt-0.5">
                        {fmtTime(appt.appointment_start_at)} – {fmtTime(appt.appointment_end_at)}
                      </p>
                    </div>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* ── Schedule by Rep ── */}
      <section className="space-y-4">
        <SectionHeader icon={Users} label="Schedule by Rep" count={total} color="text-sky-400" />
        <div className="space-y-3">
          {Object.entries(byRep).map(([repId, appts], idx) => {
            const isOpen = expandedRep === repId;
            const repCompleted  = appts.filter(a => a.appointment_status === "completed").length;
            const repNoShows    = appts.filter(a => a.appointment_status === "no_show").length;
            const repRemaining  = appts.filter(a => ["scheduled", "confirmed", "rescheduled"].includes(a.appointment_status)).length;
            const repConflicts  = appts.filter(a => conflictApptIds.has(a.id)).length;

            return (
              <motion.div key={repId} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}
                className="bg-white/[0.02] border border-white/[0.06] rounded-3xl overflow-hidden">
                <button className="w-full p-5 flex items-center justify-between gap-4 hover:bg-white/[0.02] transition-all"
                  onClick={() => setExpandedRep(isOpen ? null : repId)}>
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                      <Users className="w-4 h-4 text-white/30" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-display font-medium text-white/90 truncate">
                        {resolveRepName(repId)}
                      </p>
                      <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                        <Pill label={`${appts.length} total`} color="text-white/30" />
                        {repRemaining > 0 && <Pill label={`${repRemaining} remaining`} color="text-emerald-400" />}
                        {repCompleted > 0 && <Pill label={`${repCompleted} done`} color="text-purple-400" />}
                        {repNoShows > 0 && <Pill label={`${repNoShows} no-show`} color="text-rose-400" />}
                        {repConflicts > 0 && <Pill label="conflict" color="text-amber-400" icon={AlertTriangle} />}
                      </div>
                    </div>
                  </div>
                  <ChevronDown className={cn("w-4 h-4 text-white/20 transition-transform shrink-0", isOpen && "rotate-180")} />
                </button>

                <AnimatePresence>
                  {isOpen && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }} className="overflow-hidden">
                      <div className="border-t border-white/[0.05] divide-y divide-white/[0.04]">
                        {appts.map(appt => (
                          <RepApptRow key={appt.id} appt={appt} hasConflict={conflictApptIds.has(appt.id)} onReassigned={fetchData} reps={dbReps} />
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}

          {Object.keys(byRep).length === 0 && (
            <div className="py-12 text-center">
              <CalendarDays className="w-8 h-8 text-white/10 mx-auto mb-3" />
              <p className="text-white/25 text-sm">No appointments scheduled for today.</p>
            </div>
          )}
        </div>
      </section>

      {/* ── No Shows (today) ── */}
      {noShows > 0 && (
        <section className="space-y-4">
          <SectionHeader icon={UserX} label="No Shows Today" count={noShows} color="text-rose-400" />
          <div className="space-y-2">
            {appointments_today.filter(a => a.appointment_status === "no_show").map((appt, i) => (
              <motion.div key={appt.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                className="p-4 rounded-2xl bg-rose-500/[0.04] border border-rose-500/15 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-display font-medium text-white/90 truncate">{getAddress(appt)}</p>
                  <p className="text-[10px] font-mono text-white/30 mt-0.5">
                    {fmtTime(appt.appointment_start_at)} · {appt.assigned_rep_id ? resolveRepName(appt.assigned_rep_id) : "Unassigned"}
                  </p>
                </div>
                <div className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* ── Overdue Follow-ups ── */}
      {overdue_followups.length > 0 && (
        <section className="space-y-4">
          <SectionHeader icon={AlarmClock} label="Overdue Follow-ups" count={overdue_followups.length} color="text-orange-400" />
          <div className="space-y-2">
            {overdue_followups.map((lead, i) => (
              <motion.div key={lead.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                className="p-4 rounded-2xl bg-orange-500/[0.04] border border-orange-500/15 flex items-center justify-between gap-4">
                <div className="min-w-0 space-y-0.5">
                  <p className="text-sm font-display font-medium text-white/90 truncate">
                    {lead.centerpoint_jobs?.property_name || lead.cpc_ticket_id}
                  </p>
                  <div className="flex items-center gap-3 flex-wrap">
                    {lead.centerpoint_jobs?.raw?._owner && (
                      <span className="text-[10px] font-mono text-white/30 uppercase tracking-wider">
                        {lead.centerpoint_jobs.raw._owner}
                      </span>
                    )}
                    {lead.next_follow_up_at && (
                      <span className="text-[10px] font-mono text-orange-400/70">
                        Due {fmtShortDate(lead.next_follow_up_at)}
                      </span>
                    )}
                    <span className="text-[10px] font-mono text-white/20">{lead.contact_attempt_count} attempts</span>
                  </div>
                </div>
                <div className="w-2 h-2 rounded-full bg-orange-400 animate-pulse shrink-0" />
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* ── Failed Outbound Queue ── */}
      {outbound_failures.length > 0 && (
        <section className="space-y-4">
          <SectionHeader icon={Database} label="Failed Outbound Queue" count={outbound_failures.length} color="text-red-400" />
          <div className="space-y-2">
            {outbound_failures.map((item, i) => (
              <motion.div key={item.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                className="p-4 rounded-2xl bg-red-500/[0.04] border border-red-500/15 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-mono text-white/60 uppercase">{item.target_system}</span>
                      <span className="text-[10px] font-mono text-white/30">→</span>
                      <span className="text-[10px] font-mono text-white/40">{item.action}</span>
                    </div>
                    {item.target_id && (
                      <p className="text-[10px] font-mono text-white/25 mt-0.5 truncate">ID: {item.target_id}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[9px] font-mono text-red-400/70 uppercase">{item.retry_count} retries</span>
                    <div className="w-2 h-2 rounded-full bg-red-500" />
                  </div>
                </div>
                {item.error && (
                  <p className="text-[10px] font-mono text-red-400/60 bg-red-500/10 rounded-lg px-3 py-2 leading-relaxed">
                    {item.error.slice(0, 120)}{item.error.length > 120 ? "…" : ""}
                  </p>
                )}
                <p className="text-[9px] font-mono text-white/20">
                  Failed {fmtShortDate(item.updated_at)} · Created {fmtShortDate(item.created_at)}
                </p>
              </motion.div>
            ))}

            <div className="pt-2">
              <button
                disabled={retryCooldown}
                onClick={async () => {
                  setRetryCooldown(true);
                  try {
                    await fetch("/api/centerpoint/process-queue", { method: "POST" });
                    await fetchData();
                  } finally {
                    setTimeout(() => setRetryCooldown(false), 5000);
                  }
                }}
                className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-white/5 border border-white/10 text-xs font-mono text-white/40 hover:text-white hover:bg-white/10 transition-all disabled:opacity-40">
                <Zap className="w-3.5 h-3.5" />
                {retryCooldown ? "Retrying…" : "Retry Failed Items"}
              </button>
            </div>
          </div>
        </section>
      )}

      {/* All clear state */}
      {total === 0 && overdue_followups.length === 0 && outbound_failures.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
          <Activity className="w-8 h-8 text-white/10" />
          <p className="text-lg font-display font-medium text-white/30">All clear</p>
          <p className="text-sm text-white/20 font-light">No appointments, follow-ups, or queue failures today.</p>
        </div>
      )}
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────
function SectionHeader({ icon: Icon, label, count, color }: { icon: any; label: string; count: number; color: string }) {
  return (
    <div className="flex items-center gap-3">
      <Icon className={cn("w-4 h-4", color)} />
      <h3 className="text-sm font-display font-medium text-white/70">{label}</h3>
      <span className={cn("text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/5", color)}>{count}</span>
    </div>
  );
}

function Pill({ label, color, icon: Icon }: { label: string; color: string; icon?: any }) {
  return (
    <span className={cn("flex items-center gap-1 text-[9px] font-mono uppercase tracking-wider", color)}>
      {Icon && <Icon className="w-2.5 h-2.5" />}
      {label}
    </span>
  );
}

function RepApptRow({ appt, hasConflict, onReassigned, reps }: {
  appt: Appointment;
  hasConflict: boolean;
  onReassigned: () => void;
  reps: { id: string; name: string; role: string; active: boolean }[];
}) {
  const [showReassign, setShowReassign] = useState(false);
  const [reassigning, setReassigning]   = useState(false);

  const address  = getAddress(appt);
  const owner    = getOwner(appt);
  const phone    = getPhone(appt);
  const dot      = STATUS_DOT[appt.appointment_status] ?? "bg-white/20";
  const label    = STATUS_LABEL[appt.appointment_status] ?? appt.appointment_status;
  const canStart = ["scheduled", "confirmed", "rescheduled"].includes(appt.appointment_status) &&
                   ["scheduled", "appointment_confirmed"].includes(appt.pipeline_leads?.pipeline_status ?? "");

  const handleReassign = async (newRepId: string) => {
    setReassigning(true);
    try {
      await fetch(`/api/appointments/${appt.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assigned_rep_id: newRepId }),
      });
      setShowReassign(false);
      onReassigned();
    } catch (err) {
      console.error("[REASSIGN]", err);
    } finally {
      setReassigning(false);
    }
  };

  return (
    <div className={cn(
      "px-5 py-4 flex items-center justify-between gap-4 transition-all hover:bg-white/[0.02]",
      hasConflict && "bg-amber-500/[0.03]"
    )}>
      <div className="flex items-center gap-3 min-w-0">
        <div className={cn("w-2 h-2 rounded-full shrink-0", dot)} />
        <div className="min-w-0 space-y-0.5">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-display font-medium text-white/90 truncate">{address}</p>
            {hasConflict && <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0" />}
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-[10px] font-mono text-white/35">
              {fmtTime(appt.appointment_start_at)} – {fmtTime(appt.appointment_end_at)}
            </span>
            {owner && <span className="text-[10px] font-mono text-white/25 uppercase">{owner}</span>}
            <span className="text-[10px] font-mono text-white/20">{label}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {phone && (
          <button onClick={() => window.open(`tel:${phone}`)}
            className="p-2 rounded-lg bg-white/5 border border-white/10 text-white/30 hover:text-white transition-all">
            <Phone className="w-3 h-3" />
          </button>
        )}
        <button onClick={() => navigate(address)}
          className="p-2 rounded-lg bg-white/5 border border-white/10 text-white/30 hover:text-white transition-all">
          <Navigation2 className="w-3 h-3" />
        </button>
        {canStart && (
          <button
            onClick={() => {
              if (appt.pipeline_leads) {
                window.dispatchEvent(new CustomEvent("launchPipelineSession", {
                  detail: { ...appt.pipeline_leads, appointmentId: appt.id, centerpoint_jobs: appt.pipeline_leads.centerpoint_jobs }
                }));
              }
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 transition-all text-[10px] font-mono">
            <PlayCircle className="w-3 h-3" /> Start
          </button>
        )}

        {/* Reassign dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowReassign(v => !v)}
            disabled={reassigning}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white/30 hover:text-sky-400 hover:border-sky-500/30 hover:bg-sky-500/10 transition-all text-[10px] font-mono disabled:opacity-40"
          >
            <UserPlus className="w-3 h-3" />
            Reassign
          </button>
          <AnimatePresence>
            {showReassign && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -4 }}
                transition={{ duration: 0.12 }}
                className="absolute right-0 top-full mt-1.5 z-50 min-w-[180px] bg-[#111] border border-white/15 rounded-2xl shadow-2xl overflow-hidden"
              >
                <p className="px-3 pt-2.5 pb-1 text-[9px] font-mono text-white/25 uppercase tracking-widest">
                  Assign to rep
                </p>
                {reps.map(rep => (
                  <button
                    key={rep.id}
                    onClick={() => handleReassign(rep.id)}
                    className={cn(
                      "w-full text-left px-3 py-2.5 text-xs font-display transition-all hover:bg-white/10",
                      appt.assigned_rep_id === rep.id ? "text-sky-400 bg-sky-500/10" : "text-white/70"
                    )}
                  >
                    {rep.name}
                    {appt.assigned_rep_id === rep.id && (
                      <span className="ml-2 text-[9px] font-mono text-sky-400/60">current</span>
                    )}
                  </button>
                ))}
                <button
                  onClick={() => setShowReassign(false)}
                  className="w-full text-left px-3 py-2 text-[10px] font-mono text-white/20 hover:text-white/50 transition-all border-t border-white/[0.06]"
                >
                  Cancel
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
