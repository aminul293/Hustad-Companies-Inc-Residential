"use client";

import { useState, useEffect, useCallback } from "react";
import {
  CalendarDays, Clock, MapPin, Phone, PlayCircle, CheckCircle2,
  RotateCcw, XCircle, UserX, ChevronRight, RefreshCw,
  Calendar, Zap, Users, CalendarX, AlarmClock, X
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import type { AuthenticatedRep } from "@/lib/rep-identity";

interface Appointment {
  id: string;
  appointment_start_at: string;
  appointment_end_at: string;
  appointment_status: "scheduled" | "confirmed" | "rescheduled" | "cancelled" | "no_show" | "completed";
  location: string | null;
  notes: string | null;
  pipeline_leads: {
    id: string;
    cpc_ticket_id: string;
    pipeline_status: string;
    lead_notes: string | null;
    contact_attempt_count: number;
    centerpoint_jobs: {
      property_name: string | null;
      name: string;
      raw?: Record<string, any>;
    } | null;
  } | null;
}

interface FollowUpLead {
  id: string;
  cpc_ticket_id: string;
  pipeline_status: string;
  next_follow_up_at: string | null;
  contact_attempt_count: number;
  centerpoint_jobs: { property_name: string | null; name: string; raw?: Record<string, any> } | null;
}

interface Props {
  currentRep: AuthenticatedRep;
}

type FilterTab = "today" | "tomorrow" | "week" | "followups" | "unscheduled";

const FILTER_TABS: { id: FilterTab; label: string; icon: any }[] = [
  { id: "today",       label: "Today",         icon: CalendarDays },
  { id: "tomorrow",    label: "Tomorrow",       icon: Calendar },
  { id: "week",        label: "This Week",      icon: CalendarX },
  { id: "followups",   label: "Follow-ups",     icon: AlarmClock },
  { id: "unscheduled", label: "Unscheduled",    icon: Users },
];

const STATUS_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
  scheduled:    { label: "Scheduled",   color: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",  dot: "bg-emerald-400" },
  confirmed:    { label: "Confirmed",   color: "text-sky-400 bg-sky-400/10 border-sky-400/20",             dot: "bg-sky-400" },
  rescheduled:  { label: "Rescheduled", color: "text-amber-400 bg-amber-400/10 border-amber-400/20",       dot: "bg-amber-400" },
  no_show:      { label: "No Show",     color: "text-rose-400 bg-rose-400/10 border-rose-400/20",          dot: "bg-rose-400" },
  cancelled:    { label: "Cancelled",   color: "text-white/30 bg-white/5 border-white/10",                 dot: "bg-white/30" },
  completed:    { label: "Completed",   color: "text-purple-400 bg-purple-400/10 border-purple-400/20",    dot: "bg-purple-400" },
};

const TIME_SLOTS = [
  { label: "7 AM", value: "07:00" }, { label: "8 AM", value: "08:00" },
  { label: "9 AM", value: "09:00" }, { label: "10 AM", value: "10:00" },
  { label: "11 AM", value: "11:00" }, { label: "12 PM", value: "12:00" },
  { label: "1 PM", value: "13:00" }, { label: "2 PM", value: "14:00" },
  { label: "3 PM", value: "15:00" }, { label: "4 PM", value: "16:00" },
  { label: "5 PM", value: "17:00" }, { label: "6 PM", value: "18:00" },
];

const DURATIONS = [
  { label: "30m", value: 30 }, { label: "1 hr", value: 60 },
  { label: "1.5h", value: 90 }, { label: "2 hr", value: 120 },
  { label: "3 hr", value: 180 },
];

const addDays = (days: number) =>
  new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

export function MySchedule({ currentRep }: Props) {
  const [filter, setFilter] = useState<FilterTab>("today");
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [followUps, setFollowUps]       = useState<FollowUpLead[]>([]);
  const [unscheduled, setUnscheduled]   = useState<FollowUpLead[]>([]);
  const [loading, setLoading]           = useState(false);

  // Reschedule modal
  const [reschedModal, setReschedModal] = useState<{ apptId: string; label: string; leadId?: string } | null>(null);
  const [reschedDate, setReschedDate]   = useState(new Date().toISOString().slice(0, 10));
  const [reschedTime, setReschedTime]   = useState("09:00");
  const [reschedDur, setReschedDur]     = useState(60);
  const [reschedClash, setReschedClash] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // No Show / Cancel follow-up prompt
  const [followUpPrompt, setFollowUpPrompt] = useState<{ apptId: string; action: "no_show" | "cancelled"; label: string } | null>(null);
  const [followUpDate, setFollowUpDate]     = useState(addDays(1));

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      if (filter === "followups") {
        const res = await fetch(`/api/pipeline?t=${Date.now()}`);
        const data = await res.json();
        if (Array.isArray(data)) {
          const now = new Date().toISOString();
          setFollowUps(data.filter((l: any) =>
            l.pipeline_status === "follow_up_needed" &&
            (!l.next_follow_up_at || l.next_follow_up_at <= now)
          ));
        }
      } else if (filter === "unscheduled") {
        const res = await fetch(`/api/pipeline?t=${Date.now()}`);
        const data = await res.json();
        if (Array.isArray(data)) {
          setUnscheduled(data.filter((l: any) =>
            ["new_lead", "contact_attempted", "contacted", "follow_up_needed"].includes(l.pipeline_status)
          ));
        }
      } else {
        const res = await fetch(`/api/appointments?repId=${encodeURIComponent(currentRep.id)}&filter=${filter}&t=${Date.now()}`);
        const data = await res.json();
        setAppointments(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error("[SCHEDULE]", e);
    } finally {
      setLoading(false);
    }
  }, [filter, currentRep.id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const patchAppt = async (id: string, updates: Record<string, unknown>) => {
    setActionLoading(id);
    try {
      await fetch(`/api/appointments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      await fetchData();
    } finally {
      setActionLoading(null);
    }
  };

  const confirmReschedule = async (force = false) => {
    if (!reschedModal) return;
    const start = new Date(`${reschedDate}T${reschedTime}:00`);
    const end   = new Date(start.getTime() + reschedDur * 60000);

    // Check for clashes before applying the reschedule (unless force-overriding)
    if (!force && reschedModal.leadId) {
      setActionLoading(reschedModal.apptId);
      try {
        const clashRes = await fetch("/api/appointments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            pipeline_lead_id:    reschedModal.leadId,
            rep_id:              currentRep.id,
            appointment_start_at: start.toISOString(),
            appointment_end_at:   end.toISOString(),
            _dry_run: true,
          }),
        });
        if (clashRes.status === 409) {
          const data = await clashRes.json();
          setReschedClash(data.message || "Schedule conflict detected.");
          return;
        }
      } finally {
        setActionLoading(null);
      }
    }

    setReschedClash(null);
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

  const startInspection = (appt: Appointment) => {
    const lead = appt.pipeline_leads;
    if (!lead) return;
    // Appointment stays 'scheduled'/'confirmed' until the session finishes.
    // The sessionCompleted event (fired by B19) will trigger the final status update.
    window.dispatchEvent(new CustomEvent("launchPipelineSession", {
      detail: { ...lead, appointmentId: appt.id, centerpoint_jobs: lead.centerpoint_jobs },
    }));
  };

  const getAddress = (appt: Appointment) =>
    appt.pipeline_leads?.centerpoint_jobs?.property_name ||
    appt.pipeline_leads?.cpc_ticket_id || "Unknown Address";

  const getOwner = (appt: Appointment) =>
    appt.pipeline_leads?.centerpoint_jobs?.raw?._owner || "";

  const getPhone = (appt: Appointment) =>
    appt.pipeline_leads?.centerpoint_jobs?.raw?._phone || "";

  const canStartInspection = (appt: Appointment) =>
    ["scheduled", "confirmed", "rescheduled"].includes(appt.appointment_status) &&
    ["scheduled", "appointment_confirmed"].includes(appt.pipeline_leads?.pipeline_status ?? "");

  // ── Today stats ────────────────────────────────────────────────────────────
  const todayCount = appointments.filter(a =>
    new Date(a.appointment_start_at).toDateString() === new Date().toDateString()
  ).length;

  return (
    <div className="flex-1 overflow-y-auto p-8 space-y-6">

      {/* Filter tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {FILTER_TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id)}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-display whitespace-nowrap transition-all border",
              filter === tab.id
                ? "bg-white text-black border-white"
                : "bg-white/5 text-white/40 border-white/10 hover:text-white/70 hover:bg-white/10"
            )}
          >
            <tab.icon className="w-3 h-3" />
            {tab.label}
          </button>
        ))}
        <button onClick={fetchData} className="ml-auto p-2.5 rounded-full bg-white/5 border border-white/10 text-white/30 hover:text-white/70 transition-all shrink-0">
          <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <RefreshCw className="w-5 h-5 text-white/20 animate-spin" />
        </div>
      ) : (filter === "followups") ? (
        <FollowUpsList leads={followUps} />
      ) : filter === "unscheduled" ? (
        <UnscheduledList leads={unscheduled} />
      ) : appointments.length === 0 ? (
        <EmptyState filter={filter} />
      ) : (
        <div className="space-y-4">
          {filter === "today" && (
            <p className="text-[9px] font-mono text-white/25 uppercase tracking-[0.2em]">
              {todayCount} appointment{todayCount !== 1 ? "s" : ""} today
            </p>
          )}
          <AnimatePresence>
            {appointments.map((appt, i) => {
              const cfg = STATUS_CONFIG[appt.appointment_status] || STATUS_CONFIG.scheduled;
              const address = getAddress(appt);
              const owner   = getOwner(appt);
              const phone   = getPhone(appt);
              const busy    = actionLoading === appt.id;
              const canStart = canStartInspection(appt);

              return (
                <motion.div
                  key={appt.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ delay: i * 0.04 }}
                  className="bg-white/[0.03] border border-white/[0.07] rounded-3xl p-6 space-y-5"
                >
                  {/* Header row */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <Clock className="w-3.5 h-3.5 text-white/30 shrink-0" />
                        <span className="text-sm font-medium text-white">
                          {fmtTime(appt.appointment_start_at)} – {fmtTime(appt.appointment_end_at)}
                        </span>
                        {filter !== "today" && (
                          <span className="text-[10px] font-mono text-white/30 uppercase tracking-wider">
                            {fmtDate(appt.appointment_start_at)}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3 h-3 text-white/20 shrink-0" />
                        <span className="text-base font-display font-medium text-white/90">{address}</span>
                      </div>
                      {owner && (
                        <p className="text-[10px] font-mono text-white/35 uppercase tracking-wider pl-5">
                          {owner} · Residential
                        </p>
                      )}
                      {phone && (
                        <div className="flex items-center gap-1.5 pl-5">
                          <Phone className="w-2.5 h-2.5 text-white/20 shrink-0" />
                          <span className="text-[10px] font-mono text-white/30">{phone}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <span className={cn("text-[10px] font-mono uppercase tracking-wider px-3 py-1.5 rounded-full border", cfg.color)}>
                        {cfg.label}
                      </span>
                      {appt.pipeline_leads?.pipeline_status && (
                        <span className="text-[9px] font-mono text-white/20 uppercase tracking-wider">
                          {appt.pipeline_leads.pipeline_status.replace(/_/g, " ")}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Notes */}
                  {appt.notes && (
                    <p className="text-xs text-white/40 font-light border-l-2 border-white/10 pl-3 italic">{appt.notes}</p>
                  )}

                  {/* Primary actions */}
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => {
                        const phone = appt.pipeline_leads?.centerpoint_jobs?.raw?._phone;
                        if (phone) window.open(`tel:${phone}`);
                      }}
                      className="flex items-center justify-center gap-2 py-2.5 rounded-2xl bg-white/5 border border-white/10 text-white/50 hover:text-white hover:bg-white/10 transition-all text-xs"
                    >
                      <Phone className="w-3.5 h-3.5" /> Call
                    </button>
                    <button
                      onClick={() => window.open(`https://maps.apple.com/?q=${encodeURIComponent(address)}`)}
                      className="flex items-center justify-center gap-2 py-2.5 rounded-2xl bg-white/5 border border-white/10 text-white/50 hover:text-white hover:bg-white/10 transition-all text-xs"
                    >
                      <MapPin className="w-3.5 h-3.5" /> Navigate
                    </button>
                    {appt.appointment_status !== "confirmed" ? (
                      <button
                        disabled={busy}
                        onClick={() => patchAppt(appt.id, { appointment_status: "confirmed" })}
                        className="flex items-center justify-center gap-2 py-2.5 rounded-2xl bg-sky-500/10 border border-sky-500/20 text-sky-400 hover:bg-sky-500/20 disabled:opacity-40 transition-all text-xs"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> Confirm
                      </button>
                    ) : (
                      <div className="flex items-center justify-center gap-1.5 py-2.5 rounded-2xl bg-sky-500/10 border border-sky-500/20 text-sky-400 text-xs">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Confirmed
                      </div>
                    )}
                  </div>

                  {/* Start Inspection — hero button */}
                  {canStart && (
                    <button
                      disabled={busy}
                      onClick={() => startInspection(appt)}
                      className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/25 disabled:opacity-40 transition-all font-display font-medium"
                    >
                      <PlayCircle className="w-5 h-5" />
                      Start Inspection
                      <ChevronRight className="w-4 h-4 ml-auto" />
                    </button>
                  )}

                  {/* Secondary actions */}
                  <div className="flex items-center gap-4 pt-1 border-t border-white/[0.05]">
                    <button
                      onClick={() => { setReschedModal({ apptId: appt.id, label: address, leadId: appt.pipeline_leads?.id }); setReschedDate(new Date().toISOString().slice(0, 10)); setReschedClash(null); }}
                      className="flex items-center gap-1.5 text-[10px] font-mono text-white/25 hover:text-amber-400 uppercase tracking-widest transition-colors"
                    >
                      <RotateCcw className="w-3 h-3" /> Reschedule
                    </button>
                    <button
                      onClick={() => { setFollowUpPrompt({ apptId: appt.id, action: "no_show", label: address }); setFollowUpDate(addDays(1)); }}
                      className="flex items-center gap-1.5 text-[10px] font-mono text-white/25 hover:text-rose-400 uppercase tracking-widest transition-colors"
                    >
                      <UserX className="w-3 h-3" /> No Show
                    </button>
                    <button
                      onClick={() => { setFollowUpPrompt({ apptId: appt.id, action: "cancelled", label: address }); setFollowUpDate(addDays(1)); }}
                      className="flex items-center gap-1.5 text-[10px] font-mono text-white/25 hover:text-white/60 uppercase tracking-widest transition-colors ml-auto"
                    >
                      <XCircle className="w-3 h-3" /> Cancel
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* No Show / Cancel Follow-up Prompt */}
      <AnimatePresence>
        {followUpPrompt && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4"
          >
            <motion.div initial={{ opacity: 0, scale: 0.96, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96 }} transition={{ type: "spring", damping: 28, stiffness: 320 }}
              className="bg-[#0d0d0d] border border-white/10 rounded-[32px] p-8 w-full max-w-sm shadow-2xl"
            >
              <div className="flex items-start justify-between mb-7">
                <div>
                  <div className="flex items-center gap-2.5 mb-1">
                    {followUpPrompt.action === "no_show"
                      ? <UserX className="w-5 h-5 text-rose-400" />
                      : <XCircle className="w-5 h-5 text-white/40" />}
                    <h3 className="text-xl font-display font-medium">
                      {followUpPrompt.action === "no_show" ? "No Show" : "Cancel Appointment"}
                    </h3>
                  </div>
                  <p className="text-sm text-white/35 font-light">{followUpPrompt.label}</p>
                </div>
                <button onClick={() => setFollowUpPrompt(null)} className="p-2 rounded-2xl text-white/30 hover:text-white hover:bg-white/5 transition-all">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-[9px] font-mono text-white/30 uppercase tracking-widest mb-3">Set next follow-up date</p>

              <div className="grid grid-cols-2 gap-2 mb-5">
                {[
                  { label: "Tomorrow",  days: 1 },
                  { label: "In 2 days", days: 2 },
                  { label: "In 3 days", days: 3 },
                  { label: "Next week", days: 7 },
                ].map(opt => {
                  const d = addDays(opt.days);
                  return (
                    <button key={opt.days} onClick={() => setFollowUpDate(d)}
                      className={cn("py-3 rounded-2xl text-sm font-medium transition-all",
                        followUpDate === d
                          ? "bg-rose-500/15 border border-rose-500/30 text-rose-300"
                          : "bg-white/[0.04] text-white/40 hover:bg-white/[0.08] hover:text-white/70"
                      )}
                    >{opt.label}</button>
                  );
                })}
              </div>

              <div className="mb-7">
                <label className="text-[9px] font-mono text-white/30 uppercase tracking-widest block mb-2">Custom Date</label>
                <input type="date" value={followUpDate} min={new Date().toISOString().slice(0, 10)}
                  onChange={e => setFollowUpDate(e.target.value)}
                  className="w-full bg-white/[0.04] border border-white/10 rounded-2xl px-4 py-3 text-white text-sm focus:outline-none focus:border-rose-500/40 [color-scheme:dark]"
                />
              </div>

              <div className="flex gap-3">
                <button onClick={() => setFollowUpPrompt(null)}
                  className="flex-1 py-3 rounded-2xl bg-white/5 border border-white/10 text-white/50 hover:text-white transition-all text-sm">
                  Back
                </button>
                <button onClick={confirmFollowUp}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl transition-all text-sm font-medium",
                    followUpPrompt.action === "no_show"
                      ? "bg-rose-500/15 border border-rose-500/25 text-rose-300 hover:bg-rose-500/25"
                      : "bg-white/[0.07] border border-white/15 text-white/80 hover:bg-white/[0.12]"
                  )}
                >
                  <ChevronRight className="w-4 h-4" />
                  {followUpPrompt.action === "no_show" ? "Confirm No Show" : "Confirm Cancel"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reschedule Modal */}
      <AnimatePresence>
        {reschedModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4"
          >
            <motion.div initial={{ opacity: 0, scale: 0.96, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96 }} transition={{ type: "spring", damping: 28, stiffness: 320 }}
              className="bg-[#0d0d0d] border border-white/10 rounded-[32px] p-8 w-full max-w-md shadow-2xl"
            >
              <div className="flex items-start justify-between mb-7">
                <div>
                  <div className="flex items-center gap-2.5 mb-1">
                    <RotateCcw className="w-5 h-5 text-amber-400" />
                    <h3 className="text-xl font-display font-medium">Reschedule</h3>
                  </div>
                  <p className="text-sm text-white/35 font-light">{reschedModal.label}</p>
                </div>
                <button onClick={() => setReschedModal(null)} className="p-2 rounded-2xl text-white/30 hover:text-white hover:bg-white/5 transition-all">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="mb-6">
                <label className="text-[9px] font-mono text-white/30 uppercase tracking-widest block mb-2">New Date</label>
                <input type="date" value={reschedDate} min={new Date().toISOString().slice(0, 10)}
                  onChange={e => setReschedDate(e.target.value)}
                  className="w-full bg-white/[0.04] border border-white/10 rounded-2xl px-4 py-3 text-white text-sm focus:outline-none focus:border-amber-500/50 [color-scheme:dark]"
                />
              </div>

              <div className="mb-6">
                <label className="text-[9px] font-mono text-white/30 uppercase tracking-widest block mb-2.5">Time</label>
                <div className="grid grid-cols-4 gap-2">
                  {TIME_SLOTS.map(slot => (
                    <button key={slot.value} onClick={() => setReschedTime(slot.value)}
                      className={cn("py-2.5 rounded-xl text-xs font-medium transition-all",
                        reschedTime === slot.value ? "bg-amber-500 text-white" : "bg-white/[0.04] text-white/35 hover:bg-white/[0.08]"
                      )}
                    >{slot.label}</button>
                  ))}
                </div>
              </div>

              <div className="mb-7">
                <label className="text-[9px] font-mono text-white/30 uppercase tracking-widest block mb-2.5">Duration</label>
                <div className="flex gap-2">
                  {DURATIONS.map(d => (
                    <button key={d.value} onClick={() => setReschedDur(d.value)}
                      className={cn("flex-1 py-2.5 rounded-xl text-xs font-medium transition-all",
                        reschedDur === d.value ? "bg-amber-500/20 border border-amber-500/40 text-amber-300" : "bg-white/[0.04] text-white/30 hover:bg-white/[0.07]"
                      )}
                    >{d.label}</button>
                  ))}
                </div>
              </div>

              {reschedClash && (
                <div className="flex items-start gap-3 bg-rose-500/[0.08] border border-rose-500/20 rounded-2xl px-4 py-3 mb-4">
                  <span className="text-sm text-rose-300 font-medium flex-1">{reschedClash}</span>
                  <button onClick={() => confirmReschedule(true)}
                    className="text-[10px] font-mono text-rose-400/60 hover:text-rose-300 uppercase tracking-widest whitespace-nowrap shrink-0 transition-colors">
                    Override
                  </button>
                </div>
              )}

              <div className="flex gap-3">
                <button onClick={() => { setReschedModal(null); setReschedClash(null); }}
                  className="flex-1 py-3 rounded-2xl bg-white/5 border border-white/10 text-white/50 hover:text-white transition-all text-sm">
                  Cancel
                </button>
                <button onClick={() => confirmReschedule(false)}
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

// ── Follow-ups list ────────────────────────────────────────────────────────────
function FollowUpsList({ leads }: { leads: FollowUpLead[] }) {
  if (leads.length === 0) return <EmptyState filter="followups" />;
  return (
    <div className="space-y-3">
      <p className="text-[9px] font-mono text-white/25 uppercase tracking-[0.2em]">
        {leads.length} overdue follow-up{leads.length !== 1 ? "s" : ""}
      </p>
      {leads.map(lead => (
        <div key={lead.id} className="bg-rose-500/[0.04] border border-rose-500/15 rounded-3xl p-5 flex items-center justify-between gap-4">
          <div className="space-y-1 min-w-0">
            <p className="text-base font-display font-medium text-white/90 truncate">
              {lead.centerpoint_jobs?.property_name || lead.cpc_ticket_id}
            </p>
            <div className="flex items-center gap-3">
              {lead.centerpoint_jobs?.raw?._owner && (
                <span className="text-[10px] font-mono text-white/35 uppercase tracking-wider">
                  {lead.centerpoint_jobs.raw._owner}
                </span>
              )}
              {lead.next_follow_up_at && (
                <span className="text-[10px] font-mono text-rose-400/70 uppercase tracking-wider">
                  Due {new Date(lead.next_follow_up_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[10px] font-mono text-white/25 uppercase">{lead.contact_attempt_count} attempts</span>
            <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Unscheduled list ───────────────────────────────────────────────────────────
function UnscheduledList({ leads }: { leads: FollowUpLead[] }) {
  if (leads.length === 0) return <EmptyState filter="unscheduled" />;
  const statusColors: Record<string, string> = {
    new_lead: "text-sky-400", contact_attempted: "text-amber-400",
    contacted: "text-indigo-400", follow_up_needed: "text-orange-400",
  };
  return (
    <div className="space-y-3">
      <p className="text-[9px] font-mono text-white/25 uppercase tracking-[0.2em]">
        {leads.length} lead{leads.length !== 1 ? "s" : ""} need scheduling
      </p>
      {leads.map(lead => (
        <div key={lead.id} className="bg-white/[0.02] border border-white/[0.06] rounded-3xl p-5 flex items-center justify-between gap-4">
          <div className="space-y-1 min-w-0">
            <p className="text-base font-display font-medium text-white/90 truncate">
              {lead.centerpoint_jobs?.property_name || lead.cpc_ticket_id}
            </p>
            {lead.centerpoint_jobs?.raw?._owner && (
              <p className="text-[10px] font-mono text-white/35 uppercase tracking-wider">
                {lead.centerpoint_jobs.raw._owner}
              </p>
            )}
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span className={cn("text-[10px] font-mono uppercase tracking-wider", statusColors[lead.pipeline_status] || "text-white/30")}>
              {lead.pipeline_status.replace(/_/g, " ")}
            </span>
            <span className="text-[10px] font-mono text-white/20">{lead.contact_attempt_count} touches</span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Empty state ────────────────────────────────────────────────────────────────
function EmptyState({ filter }: { filter: FilterTab | string }) {
  const msgs: Record<string, { icon: any; title: string; sub: string }> = {
    today:       { icon: CheckCircle2, title: "Clear today",            sub: "No inspections scheduled for today." },
    tomorrow:    { icon: Calendar,     title: "Tomorrow is open",       sub: "Nothing scheduled for tomorrow yet." },
    week:        { icon: CalendarX,    title: "Open week",              sub: "No appointments in the next 7 days." },
    followups:   { icon: Zap,          title: "All caught up",          sub: "No overdue follow-ups. Nice work." },
    unscheduled: { icon: Users,        title: "All leads scheduled",    sub: "Every active lead has an appointment." },
  };
  const m = msgs[filter] || msgs.today;
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
      <m.icon className="w-8 h-8 text-white/10" />
      <p className="text-lg font-display font-medium text-white/30">{m.title}</p>
      <p className="text-sm text-white/20 font-light">{m.sub}</p>
    </div>
  );
}
