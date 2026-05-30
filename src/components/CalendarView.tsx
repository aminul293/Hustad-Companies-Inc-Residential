"use client";

import { fetchAppointments as apiFetchAppointments, fetchReps, patchAppointment, deleteAppointment } from "@/lib/api";
import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft, ChevronRight, MapPin, Phone, Clock, RefreshCw,
  Navigation2, RotateCcw, UserX, XCircle, CheckCircle2,
  PlayCircle, ChevronDown, AlertTriangle, X, Calendar,
  CalendarDays, User, FileText, AlarmClock, Trash2
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { AuthenticatedRep } from "@/lib/rep-identity";

// ── Types ──────────────────────────────────────────────────────────────────────
interface Appointment {
  id: string;
  appointment_start_at: string;
  appointment_end_at: string;
  appointment_status: "scheduled" | "confirmed" | "rescheduled" | "cancelled" | "no_show" | "completed";
  assigned_rep_id: string | null;
  location: string | null;
  notes: string | null;
  pipeline_leads: {
    id: string;
    cpc_ticket_id: string;
    pipeline_status: string;
    lead_notes: string | null;
    contact_attempt_count: number;
    next_follow_up_at: string | null;
    centerpoint_jobs: {
      property_name: string | null;
      name: string;
      raw?: Record<string, any>;
    } | null;
  } | null;
}

interface Props {
  currentRep: AuthenticatedRep;
  managerMode?: boolean;
}

type CalView = "day" | "week";

// ── Constants ──────────────────────────────────────────────────────────────────
const DAY_START_HOUR = 7;  // 7am
const DAY_END_HOUR   = 19; // 7pm
const HOUR_PX        = 72; // pixels per hour
const TOTAL_HOURS    = DAY_END_HOUR - DAY_START_HOUR;
const GRID_HEIGHT    = TOTAL_HOURS * HOUR_PX;
const MIN_CARD_PX    = 30;

const HOURS = Array.from({ length: TOTAL_HOURS + 1 }, (_, i) => DAY_START_HOUR + i);

const TIME_SLOTS = [
  "07:00","08:00","09:00","10:00","11:00","12:00",
  "13:00","14:00","15:00","16:00","17:00","18:00",
];
const DURATIONS = [
  { label: "30m", value: 30 }, { label: "1 hr", value: 60 },
  { label: "1.5h", value: 90 }, { label: "2 hr", value: 120 },
  { label: "3 hr", value: 180 },
];

const STATUS_CFG: Record<string, { label: string; color: string; dot: string; bg: string }> = {
  scheduled:   { label: "Scheduled",   color: "text-[#3aada3]",   dot: "bg-[#2a8a82]",   bg: "border-[#2a8a82]/25 bg-[#2a8a82]/[0.08]" },
  confirmed:   { label: "Confirmed",   color: "text-sky-400",     dot: "bg-sky-400",     bg: "border-sky-500/25 bg-sky-500/[0.08]" },
  rescheduled: { label: "Rescheduled", color: "text-amber-400",   dot: "bg-amber-400",   bg: "border-amber-500/25 bg-amber-500/[0.08]" },
  no_show:     { label: "No Show",     color: "text-rose-400",    dot: "bg-rose-400",    bg: "border-rose-500/25 bg-rose-500/[0.08]" },
  cancelled:   { label: "Cancelled",   color: "text-[#3F5878]",   dot: "bg-white/20",    bg: "border-white/10 bg-white/[0.03]" },
  completed:   { label: "Completed",   color: "text-[#2563ba]",   dot: "bg-[#2563ba]",   bg: "border-[#2563ba]/25 bg-[#2563ba]/[0.08]" },
};

// ── Helpers ────────────────────────────────────────────────────────────────────
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
}
function fmtDate(d: Date) {
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}
function fmtDayLabel(d: Date) {
  return d.toLocaleDateString("en-US", { weekday: "short", day: "numeric" });
}
function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}
function addDays(d: Date, n: number) {
  const r = new Date(d); r.setDate(r.getDate() + n); return r;
}
function sameDay(a: Date, b: Date) {
  return a.toDateString() === b.toDateString();
}

function getTopPx(iso: string): number {
  const d = new Date(iso);
  const hours   = d.getHours() + d.getMinutes() / 60;
  const clamped = Math.max(DAY_START_HOUR, Math.min(DAY_END_HOUR, hours));
  return (clamped - DAY_START_HOUR) * HOUR_PX;
}
function getHeightPx(start: string, end: string): number {
  const ms = new Date(end).getTime() - new Date(start).getTime();
  const hrs = ms / 3600000;
  return Math.max(MIN_CARD_PX, hrs * HOUR_PX);
}

function navigate(address: string) {
  const encoded = encodeURIComponent(address);
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const url = isIOS
    ? `maps://maps.apple.com/?daddr=${encoded}`
    : `https://www.google.com/maps/dir/?api=1&destination=${encoded}`;
  window.open(url, "_blank");
}

// Detect conflicts within a list of appointments (same rep, overlapping times)
function detectConflictIds(appts: Appointment[]): Set<string> {
  const ids = new Set<string>();
  const active = appts.filter(a => !["cancelled", "no_show"].includes(a.appointment_status));
  for (let i = 0; i < active.length; i++) {
    for (let j = i + 1; j < active.length; j++) {
      const a = active[i]; const b = active[j];
      if (
        a.appointment_start_at < b.appointment_end_at &&
        a.appointment_end_at   > b.appointment_start_at
      ) {
        ids.add(a.id); ids.add(b.id);
      }
    }
  }
  return ids;
}

// Compute horizontal column layout for overlapping appointments
function computeColumns(appts: Appointment[]): Map<string, { col: number; total: number }> {
  const map = new Map<string, { col: number; total: number }>();
  const sorted = [...appts].sort(
    (a, b) => new Date(a.appointment_start_at).getTime() - new Date(b.appointment_start_at).getTime()
  );

  const clusters: Appointment[][] = [];
  for (const appt of sorted) {
    let placed = false;
    for (const cluster of clusters) {
      if (cluster.some(c =>
        c.appointment_start_at < appt.appointment_end_at &&
        c.appointment_end_at   > appt.appointment_start_at
      )) {
        cluster.push(appt); placed = true; break;
      }
    }
    if (!placed) clusters.push([appt]);
  }

  for (const cluster of clusters) {
    const colAssign: number[] = [];
    for (let i = 0; i < cluster.length; i++) {
      const used = new Set<number>();
      for (let j = 0; j < i; j++) {
        if (
          cluster[j].appointment_start_at < cluster[i].appointment_end_at &&
          cluster[j].appointment_end_at   > cluster[i].appointment_start_at
        ) used.add(colAssign[j]);
      }
      let col = 0;
      while (used.has(col)) col++;
      colAssign.push(col);
    }
    const maxCols = Math.max(...colAssign) + 1;
    for (let i = 0; i < cluster.length; i++) {
      map.set(cluster[i].id, { col: colAssign[i], total: maxCols });
    }
  }
  return map;
}

function hourLabel(h: number) {
  if (h === 12) return "12 PM";
  return h < 12 ? `${h} AM` : `${h - 12} PM`;
}

const addDaysNum = (days: number) =>
  new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);

// ── Main Component ─────────────────────────────────────────────────────────────
export function CalendarView({ currentRep, managerMode = false }: Props) {
  const [calView, setCalView]         = useState<CalView>("day");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [repFilter, setRepFilter]     = useState<string>(managerMode ? "all" : currentRep.id);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading]         = useState(false);
  const [selectedAppt, setSelectedAppt] = useState<Appointment | null>(null);
  const [repMenuOpen, setRepMenuOpen] = useState(false);
  const [availableReps, setAvailableReps] = useState<{ id: string; name: string }[]>([]);

  // Reschedule modal state
  const [reschedModal, setReschedModal] = useState<{ apptId: string; label: string } | null>(null);
  const [reschedDate, setReschedDate]   = useState(new Date().toISOString().slice(0, 10));
  const [reschedTime, setReschedTime]   = useState("09:00");
  const [reschedDur, setReschedDur]     = useState(60);

  // No show / cancel prompt
  const [followUpPrompt, setFollowUpPrompt] = useState<{ apptId: string; action: "no_show" | "cancelled"; label: string } | null>(null);
  const [followUpDate, setFollowUpDate] = useState(addDaysNum(1));

  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Scroll to current time on mount
  useEffect(() => {
    if (scrollRef.current && sameDay(selectedDate, new Date())) {
      const now = new Date();
      const px = Math.max(0, getTopPx(now.toISOString()) - 80);
      scrollRef.current.scrollTop = px;
    }
  }, [selectedDate, appointments]);

  const fetchAppointments = useCallback(async () => {
    setLoading(true);
    try {
      if (calView === "day") {
        const dateStr = isoDate(selectedDate);
        const params: Record<string, string> = { from: dateStr, includeAll: "true" };
        if (repFilter !== "all") params.repId = repFilter;
        const data = await apiFetchAppointments(params);
        setAppointments(Array.isArray(data) ? data : []);
      } else {
        const from = isoDate(selectedDate);
        const to   = isoDate(addDays(selectedDate, 6));
        const params: Record<string, string> = { from, to: `${to}T23:59:59`, includeAll: "true" };
        if (repFilter !== "all") params.repId = repFilter;
        const data = await apiFetchAppointments(params);
        setAppointments(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      /* non-fatal */
    } finally {
      setLoading(false);
    }
  }, [calView, selectedDate, repFilter]);

  useEffect(() => { fetchAppointments(); }, [fetchAppointments]);

  // Fetch DB reps once for manager mode; supplement with any unseen IDs from appointments
  useEffect(() => {
    if (!managerMode) return;
    fetchReps()
      .then(r => r.json())
      .then(({ reps: dbReps }: { reps: { id: string; name: string }[] }) => {
        setAvailableReps(dbReps ?? []);
      })
      .catch(() => {/* non-fatal */});
  }, [managerMode]);

  useEffect(() => {
    if (!managerMode) return;
    setAvailableReps(prev => {
      const known = new Set(prev.map(r => r.id));
      const extras: { id: string; name: string }[] = [];
      for (const a of appointments) {
        if (a.assigned_rep_id && !known.has(a.assigned_rep_id)) {
          known.add(a.assigned_rep_id);
          extras.push({ id: a.assigned_rep_id, name: a.assigned_rep_id });
        }
      }
      return extras.length > 0 ? [...prev, ...extras] : prev;
    });
  }, [appointments, managerMode]);

  const patchAppt = async (id: string, updates: Record<string, unknown>) => {
    setActionLoading(id);
    try {
      await patchAppointment(id, updates);
      await fetchAppointments();
      if (selectedAppt?.id === id) setSelectedAppt(null);
    } finally {
      setActionLoading(null);
    }
  };

  const confirmReschedule = async () => {
    if (!reschedModal) return;
    const start = new Date(`${reschedDate}T${reschedTime}:00`);
    const end   = new Date(start.getTime() + reschedDur * 60000);
    await patchAppt(reschedModal.apptId, {
      appointment_status: "rescheduled",
      appointment_start_at: start.toISOString(),
      appointment_end_at: end.toISOString(),
    });
    setReschedModal(null);
  };

  const confirmFollowUp = async () => {
    if (!followUpPrompt) return;
    await patchAppt(followUpPrompt.apptId, {
      appointment_status: followUpPrompt.action,
      next_follow_up_at: new Date(followUpDate + "T09:00:00").toISOString(),
    });
    setFollowUpPrompt(null);
  };

  const conflictIds = detectConflictIds(
    appointments.filter(a =>
      repFilter === "all" || a.assigned_rep_id === repFilter
    )
  );

  const dayAppts = appointments.filter(a =>
    sameDay(new Date(a.appointment_start_at), selectedDate)
  );

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(selectedDate, i));

  const currentTimeTop = (() => {
    if (!sameDay(selectedDate, new Date())) return null;
    return getTopPx(new Date().toISOString());
  })();

  const getAddress = (a: Appointment) =>
    a.pipeline_leads?.centerpoint_jobs?.property_name ||
    a.pipeline_leads?.cpc_ticket_id || a.location || "Unknown";
  const getOwner = (a: Appointment) =>
    a.pipeline_leads?.centerpoint_jobs?.raw?._owner || "";
  const getPhone = (a: Appointment) =>
    a.pipeline_leads?.centerpoint_jobs?.raw?._phone || "";

  return (
    <div className="flex flex-col h-full bg-[#060606] text-[#E8EDF8]">
      {/* ── Header ── */}
      <div className="p-6 pb-4 border-b border-white/[0.06] space-y-4 shrink-0">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          {/* View toggle */}
          <div className="flex items-center gap-1 p-1 bg-white/5 border border-white/10 rounded-xl">
            {(["day", "week"] as CalView[]).map(v => (
              <button key={v} onClick={() => setCalView(v)}
                className={cn("px-5 py-2 rounded-lg text-xs font-inter transition-all capitalize",
                  calView === v ? "bg-white text-black" : "text-[#567090] hover:text-[#E8EDF8]"
                )}>{v}</button>
            ))}
          </div>

          {/* Date navigation */}
          <div className="flex items-center gap-2">
            <button onClick={() => setSelectedDate(d => addDays(d, calView === "day" ? -1 : -7))}
              className="p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button onClick={() => setSelectedDate(new Date())}
              className={cn("px-4 py-2 rounded-xl text-xs font-mono transition-all border",
                sameDay(selectedDate, new Date())
                  ? "bg-white text-black border-white"
                  : "bg-white/5 border-white/10 hover:bg-white/10 text-[#8BA5C5]"
              )}>
              {calView === "day" ? fmtDate(selectedDate) : `${fmtDate(selectedDate)} – ${fmtDate(addDays(selectedDate, 6))}`}
            </button>
            <button onClick={() => setSelectedDate(d => addDays(d, calView === "day" ? 1 : 7))}
              className="p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            {/* Rep filter (manager or all) */}
            {managerMode && (
              <div className="relative">
                <button onClick={() => setRepMenuOpen(o => !o)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-[#8BA5C5] hover:text-[#E8EDF8] transition-all">
                  <User className="w-3.5 h-3.5" />
                  {repFilter === "all"
                    ? "All Reps"
                    : repFilter === currentRep.id
                      ? currentRep.name
                      : (availableReps.find(r => r.id === repFilter)?.name ?? repFilter.slice(0, 16))}
                  <ChevronDown className="w-3 h-3" />
                </button>
                <AnimatePresence>
                  {repMenuOpen && (
                    <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }}
                      className="absolute right-0 mt-2 w-56 bg-[#111] border border-white/10 rounded-2xl shadow-xl z-20 overflow-hidden py-1">
                      <button onClick={() => { setRepFilter("all"); setRepMenuOpen(false); }}
                        className={cn("w-full px-4 py-3 text-left text-xs font-mono hover:bg-white/5 transition-all",
                          repFilter === "all" ? "text-[#E8EDF8]" : "text-[#567090]"
                        )}>All Reps</button>
                      <button onClick={() => { setRepFilter(currentRep.id); setRepMenuOpen(false); }}
                        className={cn("w-full px-4 py-3 text-left text-xs font-mono hover:bg-white/5 transition-all",
                          repFilter === currentRep.id ? "text-[#E8EDF8]" : "text-[#567090]"
                        )}>{currentRep.name}</button>
                      {availableReps.filter(r => r.id !== currentRep.id).map(r => (
                        <button key={r.id} onClick={() => { setRepFilter(r.id); setRepMenuOpen(false); }}
                          className={cn("w-full px-4 py-3 text-left text-xs font-mono hover:bg-white/5 transition-all",
                            repFilter === r.id ? "text-[#E8EDF8]" : "text-[#567090]"
                          )}>{r.name}</button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
            <button onClick={fetchAppointments}
              className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-[#3F5878] hover:text-[#E8EDF8] transition-all">
              <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
            </button>
          </div>
        </div>

        {/* Conflict summary strip */}
        {conflictIds.size > 0 && (
          <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-300 text-xs">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            <span className="font-medium">{conflictIds.size / 2 | 0 || 1} scheduling conflict{conflictIds.size > 2 ? "s" : ""} detected</span>
          </div>
        )}
      </div>

      {/* ── Main area ── */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Calendar grid */}
        <div className="flex-1 overflow-y-auto" ref={scrollRef}>
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <RefreshCw className="w-5 h-5 text-[#2D4060] animate-spin" />
            </div>
          ) : calView === "day" ? (
            <DayGrid
              appts={dayAppts}
              conflictIds={conflictIds}
              currentTimeTop={currentTimeTop}
              onSelect={setSelectedAppt}
              selectedId={selectedAppt?.id}
              onNavigate={a => navigate(getAddress(a))}
              onReschedule={a => { setReschedModal({ apptId: a.id, label: getAddress(a) }); setReschedDate(isoDate(selectedDate)); }}
              onNoShow={a => { setFollowUpPrompt({ apptId: a.id, action: "no_show", label: getAddress(a) }); setFollowUpDate(addDaysNum(1)); }}
              onCancel={a => { setFollowUpPrompt({ apptId: a.id, action: "cancelled", label: getAddress(a) }); setFollowUpDate(addDaysNum(1)); }}
              onConfirm={a => patchAppt(a.id, { appointment_status: "confirmed" })}
              onStartInspection={a => {
                if (a.pipeline_leads) {
                  window.dispatchEvent(new CustomEvent("launchPipelineSession", {
                    detail: { ...a.pipeline_leads, appointmentId: a.id, centerpoint_jobs: a.pipeline_leads.centerpoint_jobs },
                  }));
                }
              }}
              actionLoading={actionLoading}
            />
          ) : (
            <WeekGrid
              days={weekDays}
              appts={appointments}
              conflictIds={conflictIds}
              onSelectDay={d => { setSelectedDate(d); setCalView("day"); }}
              onSelect={setSelectedAppt}
              selectedId={selectedAppt?.id}
            />
          )}
        </div>

        {/* ── Appointment detail panel ── */}
        <AnimatePresence>
          {selectedAppt && (
            <motion.div
              key={selectedAppt.id}
              initial={{ x: "100%", opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: "100%", opacity: 0 }}
              transition={{ type: "spring", damping: 28, stiffness: 260 }}
              className="w-80 shrink-0 border-l border-white/[0.06] flex flex-col overflow-y-auto"
            >
              <AppointmentDetailPanel
                appt={selectedAppt}
                conflicted={conflictIds.has(selectedAppt.id)}
                actionLoading={actionLoading}
                onClose={() => setSelectedAppt(null)}
                onNavigate={() => navigate(
                  selectedAppt.pipeline_leads?.centerpoint_jobs?.property_name ||
                  selectedAppt.pipeline_leads?.cpc_ticket_id ||
                  selectedAppt.location || ""
                )}
                onCall={() => {
                  const phone = selectedAppt.pipeline_leads?.centerpoint_jobs?.raw?._phone;
                  if (phone) window.open(`tel:${phone}`);
                }}
                onConfirm={() => patchAppt(selectedAppt.id, { appointment_status: "confirmed" })}
                onReschedule={() => {
                  setReschedModal({ apptId: selectedAppt.id, label: getAddress(selectedAppt) });
                  setReschedDate(isoDate(new Date(selectedAppt.appointment_start_at)));
                }}
                onNoShow={() => {
                  setFollowUpPrompt({ apptId: selectedAppt.id, action: "no_show", label: getAddress(selectedAppt) });
                  setFollowUpDate(addDaysNum(1));
                }}
                onCancel={() => {
                  setFollowUpPrompt({ apptId: selectedAppt.id, action: "cancelled", label: getAddress(selectedAppt) });
                  setFollowUpDate(addDaysNum(1));
                }}
                onStartInspection={() => {
                  if (selectedAppt.pipeline_leads) {
                    window.dispatchEvent(new CustomEvent("launchPipelineSession", {
                      detail: { ...selectedAppt.pipeline_leads, appointmentId: selectedAppt.id, centerpoint_jobs: selectedAppt.pipeline_leads.centerpoint_jobs },
                    }));
                  }
                }}
                onRemove={async () => {
                  setActionLoading(selectedAppt.id);
                  await deleteAppointment(selectedAppt.id);
                  setActionLoading(null);
                  setSelectedAppt(null);
                  fetchAppointments();
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── No Show / Cancel Follow-up Modal ── */}
      <AnimatePresence>
        {followUpPrompt && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4">
            <motion.div initial={{ scale: 0.96, y: 12 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96 }}
              transition={{ type: "spring", damping: 28, stiffness: 320 }}
              className="bg-[#0d0d0d] border border-white/10 rounded-3xl p-8 w-full max-w-sm shadow-2xl">
              <div className="flex items-start justify-between mb-7">
                <div>
                  <div className="flex items-center gap-2.5 mb-1">
                    {followUpPrompt.action === "no_show"
                      ? <UserX className="w-5 h-5 text-rose-400" />
                      : <XCircle className="w-5 h-5 text-[#567090]" />}
                    <h3 className="text-xl font-inter font-medium">
                      {followUpPrompt.action === "no_show" ? "No Show" : "Cancel Appointment"}
                    </h3>
                  </div>
                  <p className="text-sm text-[#4D678A] font-light">{followUpPrompt.label}</p>
                </div>
                <button onClick={() => setFollowUpPrompt(null)} className="p-2 rounded-2xl text-[#3F5878] hover:text-[#E8EDF8] hover:bg-white/5 transition-all">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-[9px] font-mono text-[#3F5878] uppercase tracking-widest mb-3">Set next follow-up date</p>
              <div className="grid grid-cols-2 gap-2 mb-5">
                {[{ label: "Tomorrow", days: 1 }, { label: "In 2 days", days: 2 }, { label: "In 3 days", days: 3 }, { label: "Next week", days: 7 }].map(opt => {
                  const d = addDaysNum(opt.days);
                  return (
                    <button key={opt.days} onClick={() => setFollowUpDate(d)}
                      className={cn("py-3 rounded-2xl text-sm font-medium transition-all",
                        followUpDate === d
                          ? "bg-rose-500/15 border border-rose-500/30 text-rose-300"
                          : "bg-white/[0.04] text-[#567090] hover:bg-white/[0.08] hover:text-[#AABDCF]"
                      )}>{opt.label}</button>
                  );
                })}
              </div>
              <div className="mb-7">
                <label className="text-[9px] font-mono text-[#3F5878] uppercase tracking-widest block mb-2">Custom Date</label>
                <input type="date" value={followUpDate} min={new Date().toISOString().slice(0, 10)}
                  onChange={e => setFollowUpDate(e.target.value)}
                  className="w-full bg-white/[0.04] border border-white/10 rounded-2xl px-4 py-3 text-[#E8EDF8] text-sm focus:outline-none focus:border-rose-500/40 [color-scheme:dark]" />
              </div>
              <div className="flex gap-3">
                <button onClick={() => setFollowUpPrompt(null)}
                  className="flex-1 py-3 rounded-2xl bg-white/5 border border-white/10 text-[#7090B0] hover:text-[#E8EDF8] transition-all text-sm">Back</button>
                <button onClick={confirmFollowUp}
                  className={cn("flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl transition-all text-sm font-medium",
                    followUpPrompt.action === "no_show"
                      ? "bg-rose-500/15 border border-rose-500/25 text-rose-300 hover:bg-rose-500/25"
                      : "bg-white/[0.07] border border-white/15 text-[#C2D0E4] hover:bg-white/[0.12]"
                  )}>
                  <ChevronRight className="w-4 h-4" />
                  {followUpPrompt.action === "no_show" ? "Confirm No Show" : "Confirm Cancel"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Reschedule Modal ── */}
      <AnimatePresence>
        {reschedModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4">
            <motion.div initial={{ scale: 0.96, y: 12 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96 }}
              transition={{ type: "spring", damping: 28, stiffness: 320 }}
              className="bg-[#0d0d0d] border border-white/10 rounded-3xl p-8 w-full max-w-md shadow-2xl">
              <div className="flex items-start justify-between mb-7">
                <div>
                  <div className="flex items-center gap-2.5 mb-1">
                    <RotateCcw className="w-5 h-5 text-amber-400" />
                    <h3 className="text-xl font-inter font-medium">Reschedule</h3>
                  </div>
                  <p className="text-sm text-[#4D678A] font-light">{reschedModal.label}</p>
                </div>
                <button onClick={() => setReschedModal(null)} className="p-2 rounded-2xl text-[#3F5878] hover:text-[#E8EDF8] hover:bg-white/5 transition-all">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="mb-6">
                <label className="text-[9px] font-mono text-[#3F5878] uppercase tracking-widest block mb-2">New Date</label>
                <input type="date" value={reschedDate} onChange={e => setReschedDate(e.target.value)}
                  className="w-full bg-white/[0.04] border border-white/10 rounded-2xl px-4 py-3 text-[#E8EDF8] text-sm focus:outline-none focus:border-amber-500/50 [color-scheme:dark]" />
              </div>
              <div className="mb-6">
                <label className="text-[9px] font-mono text-[#3F5878] uppercase tracking-widest block mb-2.5">Time</label>
                <div className="grid grid-cols-4 gap-2">
                  {TIME_SLOTS.map(slot => (
                    <button key={slot} onClick={() => setReschedTime(slot)}
                      className={cn("py-2.5 rounded-xl text-xs font-medium transition-all",
                        reschedTime === slot ? "bg-amber-500 text-[#E8EDF8]" : "bg-white/[0.04] text-[#4D678A] hover:bg-white/[0.08]"
                      )}>
                      {new Date(`2000-01-01T${slot}:00`).toLocaleTimeString("en-US", { hour: "numeric", hour12: true })}
                    </button>
                  ))}
                </div>
              </div>
              <div className="mb-7">
                <label className="text-[9px] font-mono text-[#3F5878] uppercase tracking-widest block mb-2.5">Duration</label>
                <div className="flex gap-2">
                  {DURATIONS.map(d => (
                    <button key={d.value} onClick={() => setReschedDur(d.value)}
                      className={cn("flex-1 py-2.5 rounded-xl text-xs font-medium transition-all",
                        reschedDur === d.value ? "bg-amber-500/20 border border-amber-500/40 text-amber-300" : "bg-white/[0.04] text-[#3F5878] hover:bg-white/[0.07]"
                      )}>{d.label}</button>
                  ))}
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setReschedModal(null)}
                  className="flex-1 py-3 rounded-2xl bg-white/5 border border-white/10 text-[#7090B0] hover:text-[#E8EDF8] transition-all text-sm">Cancel</button>
                <button onClick={confirmReschedule}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-amber-500/20 border border-amber-500/30 text-amber-300 hover:bg-amber-500/30 transition-all text-sm font-medium">
                  Confirm <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Day Grid ───────────────────────────────────────────────────────────────────
interface DayGridProps {
  appts: Appointment[];
  conflictIds: Set<string>;
  currentTimeTop: number | null;
  selectedId?: string;
  actionLoading: string | null;
  onSelect: (a: Appointment) => void;
  onNavigate: (a: Appointment) => void;
  onReschedule: (a: Appointment) => void;
  onNoShow: (a: Appointment) => void;
  onCancel: (a: Appointment) => void;
  onConfirm: (a: Appointment) => void;
  onStartInspection: (a: Appointment) => void;
}

function DayGrid({ appts, conflictIds, currentTimeTop, selectedId, actionLoading, onSelect, onNavigate, onReschedule, onNoShow, onCancel, onConfirm, onStartInspection }: DayGridProps) {
  const colMap = computeColumns(appts);

  return (
    <div className="flex p-6 gap-0">
      {/* Time labels */}
      <div className="w-16 shrink-0" style={{ height: GRID_HEIGHT + HOUR_PX }}>
        {HOURS.map(h => (
          <div key={h} className="relative" style={{ height: HOUR_PX }}>
            <span className="absolute top-0 -translate-y-1/2 text-[10px] font-mono text-[#2D4060] whitespace-nowrap select-none">
              {hourLabel(h)}
            </span>
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="flex-1 relative border-l border-white/[0.05]" style={{ height: GRID_HEIGHT }}>
        {/* Hour lines */}
        {HOURS.map(h => (
          <div key={h} className="absolute left-0 right-0 border-t border-white/[0.05]"
            style={{ top: (h - DAY_START_HOUR) * HOUR_PX }} />
        ))}

        {/* Half-hour lines */}
        {HOURS.slice(0, -1).map(h => (
          <div key={`half-${h}`} className="absolute left-0 right-0 border-t border-white/[0.025]"
            style={{ top: (h - DAY_START_HOUR) * HOUR_PX + HOUR_PX / 2 }} />
        ))}

        {/* Current time */}
        {currentTimeTop !== null && (
          <div className="absolute left-0 right-0 z-10 pointer-events-none"
            style={{ top: currentTimeTop }}>
            <div className="flex items-center gap-0">
              <div className="w-2 h-2 rounded-full bg-[#2563ba] shrink-0 -ml-1" />
              <div className="flex-1 h-px bg-[#2563ba]/60" />
            </div>
          </div>
        )}

        {/* Empty state */}
        {appts.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center">
              <Calendar className="w-8 h-8 text-[#1F2E48] mx-auto mb-3" />
              <p className="text-[#2D4060] text-sm font-light">No appointments</p>
            </div>
          </div>
        )}

        {/* Appointment cards */}
        {appts.map(appt => {
          const top      = getTopPx(appt.appointment_start_at);
          const height   = getHeightPx(appt.appointment_start_at, appt.appointment_end_at);
          const layout   = colMap.get(appt.id) ?? { col: 0, total: 1 };
          const width    = `calc(${100 / layout.total}% - 6px)`;
          const left     = `calc(${(layout.col / layout.total) * 100}% + 4px)`;
          const cfg      = STATUS_CFG[appt.appointment_status] ?? STATUS_CFG.scheduled;
          const isConflict = conflictIds.has(appt.id);
          const isSelected = selectedId === appt.id;
          const address  = appt.pipeline_leads?.centerpoint_jobs?.property_name || appt.pipeline_leads?.cpc_ticket_id || "Appointment";
          const owner    = appt.pipeline_leads?.centerpoint_jobs?.raw?._owner || "";
          const canStart = ["scheduled", "confirmed", "rescheduled"].includes(appt.appointment_status) &&
                           ["scheduled", "appointment_confirmed"].includes(appt.pipeline_leads?.pipeline_status ?? "");

          return (
            <motion.div
              key={appt.id}
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              className={cn(
                "absolute rounded-xl border overflow-hidden cursor-pointer transition-all group",
                isSelected ? "ring-2 ring-white/30 ring-offset-1 ring-offset-black" : "hover:ring-1 hover:ring-white/20",
                isConflict
                  ? "border-amber-500/40 bg-amber-500/10"
                  : cn(cfg.bg)
              )}
              style={{ top: top + 1, height: height - 2, width, left }}
              onClick={() => onSelect(appt)}
            >
              <div className="p-2 h-full flex flex-col overflow-hidden">
                {isConflict && (
                  <div className="absolute top-1 right-1">
                    <AlertTriangle className="w-3 h-3 text-amber-400" />
                  </div>
                )}
                <p className="text-[10px] font-mono text-[#7090B0] leading-tight truncate">
                  {fmtTime(appt.appointment_start_at)}
                </p>
                {height > 50 && (
                  <p className="text-xs font-inter font-medium text-[#DDE5F5] leading-tight truncate mt-0.5">
                    {address}
                  </p>
                )}
                {height > 70 && owner && (
                  <p className="text-[9px] font-mono text-[#4D678A] truncate mt-0.5">{owner}</p>
                )}
                {height > 90 && (
                  <div className="mt-auto flex items-center gap-1 pt-1 border-t border-white/10">
                    {canStart && (
                      <button onClick={e => { e.stopPropagation(); onStartInspection(appt); }}
                        className="flex items-center gap-1 text-[9px] font-mono text-[#3aada3] hover:text-[#2a8a82]">
                        <PlayCircle className="w-3 h-3" /> Start
                      </button>
                    )}
                    <button onClick={e => { e.stopPropagation(); onNavigate(appt); }}
                      className="flex items-center gap-1 text-[9px] font-mono text-[#3F5878] hover:text-[#AABDCF] ml-auto">
                      <Navigation2 className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

// ── Week Grid ──────────────────────────────────────────────────────────────────
interface WeekGridProps {
  days: Date[];
  appts: Appointment[];
  conflictIds: Set<string>;
  selectedId?: string;
  onSelectDay: (d: Date) => void;
  onSelect: (a: Appointment) => void;
}

function WeekGrid({ days, appts, conflictIds, selectedId, onSelectDay, onSelect }: WeekGridProps) {
  const today = new Date();
  return (
    <div className="p-6">
      <div className="grid grid-cols-7 gap-2">
        {days.map(day => {
          const dayAppts = appts.filter(a => sameDay(new Date(a.appointment_start_at), day));
          const isToday = sameDay(day, today);
          const hasConflict = dayAppts.some(a => conflictIds.has(a.id));

          return (
            <div key={day.toISOString()} className={cn(
              "border rounded-2xl overflow-hidden",
              isToday ? "border-white/20" : "border-white/[0.06]"
            )}>
              {/* Day header */}
              <button onClick={() => onSelectDay(day)}
                className={cn(
                  "w-full px-3 py-3 text-left transition-all hover:bg-white/5",
                  isToday ? "bg-white/[0.06]" : "bg-white/[0.02]"
                )}>
                <div className="flex items-center justify-between">
                  <span className={cn("text-xs font-inter font-medium",
                    isToday ? "text-[#E8EDF8]" : "text-[#8BA5C5]")}>{fmtDayLabel(day)}</span>
                  {hasConflict && <AlertTriangle className="w-3 h-3 text-amber-400" />}
                </div>
                {dayAppts.length > 0 && (
                  <span className="text-[9px] font-mono text-[#3F5878] mt-0.5 block">
                    {dayAppts.length} appt{dayAppts.length !== 1 ? "s" : ""}
                  </span>
                )}
              </button>

              {/* Day appointments */}
              <div className="p-2 space-y-1 min-h-[80px] max-h-[200px] overflow-y-auto">
                {dayAppts.length === 0 ? (
                  <p className="text-[9px] font-mono text-[#293A58] text-center py-4">—</p>
                ) : (
                  dayAppts.map(appt => {
                    const cfg = STATUS_CFG[appt.appointment_status] ?? STATUS_CFG.scheduled;
                    const isConflict = conflictIds.has(appt.id);
                    const address = appt.pipeline_leads?.centerpoint_jobs?.property_name ||
                                    appt.pipeline_leads?.cpc_ticket_id || "Appt";
                    return (
                      <button key={appt.id} onClick={() => onSelect(appt)}
                        className={cn(
                          "w-full text-left px-2 py-1.5 rounded-lg border transition-all text-[10px]",
                          selectedId === appt.id ? "ring-1 ring-white/20" : "",
                          isConflict ? "border-amber-500/30 bg-amber-500/10" : cfg.bg
                        )}>
                        <p className={cn("font-mono", cfg.color)}>{fmtTime(appt.appointment_start_at)}</p>
                        <p className="text-[#AABDCF] truncate font-inter leading-tight">{address}</p>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Appointment Detail Panel ───────────────────────────────────────────────────
interface DetailPanelProps {
  appt: Appointment;
  conflicted: boolean;
  actionLoading: string | null;
  onClose: () => void;
  onNavigate: () => void;
  onCall: () => void;
  onConfirm: () => void;
  onReschedule: () => void;
  onNoShow: () => void;
  onCancel: () => void;
  onStartInspection: () => void;
  onRemove: () => void;
}

function AppointmentDetailPanel({
  appt, conflicted, actionLoading, onClose, onNavigate, onCall, onConfirm,
  onReschedule, onNoShow, onCancel, onStartInspection, onRemove
}: DetailPanelProps) {
  const cfg     = STATUS_CFG[appt.appointment_status] ?? STATUS_CFG.scheduled;
  const busy    = actionLoading === appt.id;
  const address = appt.pipeline_leads?.centerpoint_jobs?.property_name || appt.pipeline_leads?.cpc_ticket_id || appt.location || "Unknown";
  const owner   = appt.pipeline_leads?.centerpoint_jobs?.raw?._owner || "";
  const phone   = appt.pipeline_leads?.centerpoint_jobs?.raw?._phone || "";
  const canStart = ["scheduled", "confirmed", "rescheduled"].includes(appt.appointment_status) &&
                   ["scheduled", "appointment_confirmed"].includes(appt.pipeline_leads?.pipeline_status ?? "");

  return (
    <div className="flex flex-col h-full bg-[#080808]">
      {/* Header */}
      <div className="p-5 border-b border-white/[0.06] flex items-start justify-between gap-3">
        <div className="space-y-1 min-w-0">
          {conflicted && (
            <div className="flex items-center gap-1.5 text-amber-400 text-[10px] font-mono mb-2">
              <AlertTriangle className="w-3 h-3" /> Scheduling conflict
            </div>
          )}
          <p className="text-base font-inter font-medium text-[#E8EDF8] leading-tight">{address}</p>
          {owner && <p className="text-[10px] font-mono text-[#4D678A] uppercase tracking-wider">{owner}</p>}
        </div>
        <button onClick={onClose} className="p-2 rounded-xl text-[#3F5878] hover:text-[#E8EDF8] hover:bg-white/5 transition-all shrink-0">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {/* Status + time */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className={cn("text-[10px] font-mono uppercase tracking-wider px-3 py-1.5 rounded-lg border",
              `${cfg.color} bg-white/5 border-white/10`)}>{cfg.label}</span>
            {appt.pipeline_leads?.pipeline_status && (
              <span className="text-[9px] font-mono text-[#354D6F] uppercase">
                {appt.pipeline_leads.pipeline_status.replace(/_/g, " ")}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 text-sm text-[#AABDCF]">
            <Clock className="w-3.5 h-3.5 text-[#354D6F] shrink-0" />
            <span>{fmtTime(appt.appointment_start_at)} – {fmtTime(appt.appointment_end_at)}</span>
          </div>
        </div>

        {/* Contact info */}
        {(phone || address) && (
          <div className="space-y-2 p-4 bg-white/[0.03] border border-white/[0.06] rounded-2xl">
            {address && (
              <div className="flex items-start gap-2">
                <MapPin className="w-3.5 h-3.5 text-[#354D6F] mt-0.5 shrink-0" />
                <span className="text-xs text-[#8BA5C5] font-light">{address}</span>
              </div>
            )}
            {phone && (
              <div className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-[#354D6F] shrink-0" />
                <span className="text-xs font-mono text-[#7090B0]">{phone}</span>
              </div>
            )}
          </div>
        )}

        {/* Notes */}
        {(appt.notes || appt.pipeline_leads?.lead_notes) && (
          <div className="p-3 bg-white/[0.02] border-l-2 border-white/10 rounded-r-xl">
            <div className="flex items-center gap-1.5 mb-1.5">
              <FileText className="w-3 h-3 text-[#2D4060]" />
              <span className="text-[9px] font-mono text-[#354D6F] uppercase tracking-widest">Notes</span>
            </div>
            <p className="text-xs text-[#7090B0] font-light italic">
              {appt.notes || appt.pipeline_leads?.lead_notes}
            </p>
          </div>
        )}

        {/* Follow-up */}
        {appt.pipeline_leads?.next_follow_up_at && (
          <div className="flex items-center gap-2 text-xs text-[#567090]">
            <AlarmClock className="w-3.5 h-3.5 text-[#2D4060] shrink-0" />
            Follow-up: {new Date(appt.pipeline_leads.next_follow_up_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
          </div>
        )}

        {/* Quick action buttons */}
        <div className="grid grid-cols-2 gap-2">
          <button onClick={onCall}
            className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white/5 border border-white/10 text-[#7090B0] hover:text-[#E8EDF8] hover:bg-white/10 transition-all text-xs">
            <Phone className="w-3.5 h-3.5" /> Call
          </button>
          <button onClick={onNavigate}
            className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white/5 border border-white/10 text-[#7090B0] hover:text-[#E8EDF8] hover:bg-white/10 transition-all text-xs">
            <Navigation2 className="w-3.5 h-3.5" /> Navigate
          </button>
        </div>

        {/* Confirm */}
        {appt.appointment_status !== "confirmed" && !["cancelled", "no_show", "completed"].includes(appt.appointment_status) && (
          <button disabled={busy} onClick={onConfirm}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400 hover:bg-sky-500/20 disabled:opacity-40 transition-all text-sm">
            <CheckCircle2 className="w-4 h-4" /> Confirm Appointment
          </button>
        )}

        {/* Start inspection */}
        {canStart && (
          <button disabled={busy} onClick={onStartInspection}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-[#2a8a82]/20 border border-[#2a8a82]/30 text-[#3aada3] hover:bg-[#2a8a82]/30 disabled:opacity-40 transition-all font-inter font-medium">
            <PlayCircle className="w-5 h-5" /> Start Inspection
          </button>
        )}
      </div>

      {/* Footer actions */}
      {!["cancelled", "completed"].includes(appt.appointment_status) && (
        <div className="p-5 border-t border-white/[0.05] flex items-center gap-4">
          <button onClick={onReschedule}
            className="flex items-center gap-1.5 text-[10px] font-mono text-[#354D6F] hover:text-amber-400 uppercase tracking-widest transition-colors">
            <RotateCcw className="w-3 h-3" /> Reschedule
          </button>
          <button onClick={onNoShow}
            className="flex items-center gap-1.5 text-[10px] font-mono text-[#354D6F] hover:text-rose-400 uppercase tracking-widest transition-colors">
            <UserX className="w-3 h-3" /> No Show
          </button>
          <button onClick={onCancel}
            className="flex items-center gap-1.5 text-[10px] font-mono text-[#354D6F] hover:text-[#8BA5C5] uppercase tracking-widest transition-colors ml-auto">
            <XCircle className="w-3 h-3" /> Cancel
          </button>
        </div>
      )}
      {appt.appointment_status === "cancelled" && (
        <div className="p-5 border-t border-white/[0.05] flex items-center justify-end">
          <button onClick={onRemove} disabled={busy}
            className="flex items-center gap-1.5 text-[10px] font-mono text-[#354D6F] hover:text-rose-400 uppercase tracking-widest transition-colors disabled:opacity-40">
            <Trash2 className="w-3 h-3" /> Remove
          </button>
        </div>
      )}
    </div>
  );
}

