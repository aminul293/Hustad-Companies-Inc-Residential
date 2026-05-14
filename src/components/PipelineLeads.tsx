"use client";

import { useState, useEffect, useRef } from "react";
import {
  Phone, Calendar, MessageSquare, User, Clock, XCircle, AlertCircle,
  PlayCircle, ArrowLeft, MinusCircle, CalendarDays, CheckCircle2,
  Activity, Flame, ChevronRight, ChevronLeft, X, AlertTriangle, PenLine, Mail
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface PipelineLead {
  id: string;
  cpc_ticket_id: string;
  pipeline_status: string;
  contact_attempt_count: number;
  last_contacted_at: string | null;
  next_follow_up_at: string | null;
  scheduled_start_at: string | null;
  scheduled_end_at: string | null;
  lead_notes: string | null;
  owner_phone: string | null;
  owner_email: string | null;
  centerpoint_jobs: {
    name: string;
    property_name: string;
    raw?: Record<string, any>;
  };
  appointments?: { id: string; assigned_rep_id: string }[];
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bar: string; icon: any }> = {
  new_lead:              { label: "New Lead",   color: "text-sky-400 bg-sky-400/10 border-sky-400/20",       bar: "bg-sky-500",      icon: Clock },
  follow_up_needed:      { label: "Follow Up",  color: "text-orange-400 bg-orange-400/10 border-orange-400/20", bar: "bg-orange-500", icon: Clock },
  contact_attempted:     { label: "Attempted",  color: "text-amber-400 bg-amber-400/10 border-amber-400/20",  bar: "bg-amber-500",    icon: Phone },
  contacted:             { label: "Contacted",  color: "text-indigo-400 bg-indigo-400/10 border-indigo-400/20", bar: "bg-indigo-500", icon: MessageSquare },
  scheduled:             { label: "Scheduled",  color: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20", bar: "bg-emerald-500", icon: CalendarDays },
  appointment_confirmed: { label: "Confirmed",  color: "text-sky-400 bg-sky-400/10 border-sky-400/20",            bar: "bg-sky-500",     icon: CheckCircle2 },
  inspection_in_progress:{ label: "In Field",   color: "text-purple-400 bg-purple-400/10 border-purple-400/20", bar: "bg-purple-500", icon: PlayCircle },
  inspection_completed:  { label: "Inspected",  color: "text-purple-300 bg-purple-300/10 border-purple-300/20", bar: "bg-purple-400", icon: CheckCircle2 },
  dead_lead:             { label: "Dead Lead",  color: "text-rose-400 bg-rose-400/10 border-rose-400/20",     bar: "bg-rose-500/50",  icon: XCircle },
  signed:                { label: "Signed",     color: "text-green-400 bg-green-400/10 border-green-400/20",  bar: "bg-green-500",    icon: CheckCircle2 },
  closed:                { label: "Closed",     color: "text-white/30 bg-white/5 border-white/10",            bar: "bg-white/20",     icon: CheckCircle2 },
};

const STAGE_MAP: Record<string, number> = {
  new_lead: 0, contact_attempted: 1, follow_up_needed: 1,
  contacted: 2, scheduled: 3, appointment_confirmed: 3, inspection_in_progress: 4,
  inspection_completed: 4, signed: 4, closed: 4,
};

const BLOCKED_STATUSES = ['inspection_in_progress', 'inspection_completed', 'signed', 'closed'];

const STAGE_STATUSES = ['new_lead', 'contact_attempted', 'contacted', 'scheduled', 'inspection_in_progress'];
const STAGE_LABELS   = ['New Lead', 'Attempted', 'Contacted', 'Scheduled', 'In Field'];
const STAGE_HINTS    = [
  'No outreach yet',
  'Email sent / voicemail left — no reply yet',
  'Tap when homeowner responds or you speak with them',
  'Inspection appointment booked',
  'Inspector is on site',
];

const TIME_SLOTS = [
  { label: "7 AM",  value: "07:00" }, { label: "8 AM",  value: "08:00" },
  { label: "9 AM",  value: "09:00" }, { label: "10 AM", value: "10:00" },
  { label: "11 AM", value: "11:00" }, { label: "12 PM", value: "12:00" },
  { label: "1 PM",  value: "13:00" }, { label: "2 PM",  value: "14:00" },
  { label: "3 PM",  value: "15:00" }, { label: "4 PM",  value: "16:00" },
  { label: "5 PM",  value: "17:00" }, { label: "6 PM",  value: "18:00" },
];

const DURATIONS = [
  { label: "30 min", value: 30 }, { label: "1 hr", value: 60 },
  { label: "1.5 hr", value: 90 }, { label: "2 hr", value: 120 },
  { label: "3 hr",  value: 180 },
];

const addDays = (days: number) =>
  new Date(Date.now() + days * 86400000).toISOString().split("T")[0];

const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—";

const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });

const daysSince = (iso: string | null) =>
  iso ? Math.floor((Date.now() - new Date(iso).getTime()) / 86400000) : null;

const normalizePhone = (raw: unknown): string | null => {
  if (!raw || typeof raw !== "string") return null;
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) return `(${digits.slice(0,3)}) ${digits.slice(3,6)}-${digits.slice(6)}`;
  if (digits.length === 11 && digits[0] === "1") return `(${digits.slice(1,4)}) ${digits.slice(4,7)}-${digits.slice(7)}`;
  return raw.trim() || null;
};

const resolvePhone = (lead: PipelineLead): string | null =>
  normalizePhone(
    lead.owner_phone ||
    lead.centerpoint_jobs?.raw?._phone ||
    lead.centerpoint_jobs?.raw?.phone ||
    lead.centerpoint_jobs?.raw?.["Phone Number"] ||
    lead.centerpoint_jobs?.raw?.phone_number ||
    null
  );

const resolveEmail = (lead: PipelineLead): string | null => {
  const raw =
    lead.owner_email ||
    lead.centerpoint_jobs?.raw?._email ||
    lead.centerpoint_jobs?.raw?.email ||
    lead.centerpoint_jobs?.raw?.emailAddress ||
    lead.centerpoint_jobs?.raw?.["Email Address"] ||
    null;
  return typeof raw === "string" && raw.includes("@") ? raw.trim() : null;
};

const callTimestamp = () => {
  const now = new Date();
  return now.toLocaleDateString("en-US", { month: "short", day: "numeric" }) + ", " +
    now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
};

interface PipelineLeadsProps {
  repId?: string;
}

export function PipelineLeads({ repId }: PipelineLeadsProps) {
  const [leads, setLeads] = useState<PipelineLead[]>([]);
  const [isLoading, setLoading] = useState(true);

  // Dead lead confirmation modal
  const [deadLeadModal, setDeadLeadModal] = useState<{ leadId: string; leadName: string } | null>(null);

  // Remove from pipeline modals
  const [confirmModal, setConfirmModal] = useState<{ leadId: string; leadName: string } | null>(null);
  const [blockedModal, setBlockedModal] = useState<{ leadId: string; leadName: string } | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);

  // Schedule modal
  const [schedModal, setSchedModal] = useState<{ leadId: string; leadName: string } | null>(null);
  const [schedDate, setSchedDate] = useState("");
  const [schedTime, setSchedTime] = useState("09:00");
  const [clashWarning, setClashWarning] = useState<string | null>(null);
  const [scheduling, setScheduling] = useState(false);
  const [schedDuration, setSchedDuration] = useState(60);

  // Call modal
  const [callModal, setCallModal] = useState<{
    leadId: string; leadName: string; phone: string | null; email: string | null;
    ownerName: string; currentNotes: string; currentAttempts: number;
  } | null>(null);

  // Edit phone modal
  const [editPhoneModal, setEditPhoneModal] = useState<{ leadId: string; leadName: string; current: string } | null>(null);
  const [editPhoneValue, setEditPhoneValue] = useState("");

  // Edit email modal
  const [editEmailModal, setEditEmailModal] = useState<{ leadId: string; leadName: string; current: string } | null>(null);
  const [editEmailValue, setEditEmailValue] = useState("");

  // Draft email modal
  const [draftEmailModal, setDraftEmailModal] = useState<{
    leadId: string; leadName: string; to: string; subject: string; body: string;
  } | null>(null);
  const [emailSending, setEmailSending] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [callOutcome, setCallOutcome] = useState<"reached" | "no_answer" | "voicemail" | "wrong_number" | null>(null);
  const [callNote, setCallNote] = useState("");

  // Follow-up modal
  const [followModal, setFollowModal] = useState<{ leadId: string; leadName: string } | null>(null);
  const [followDate, setFollowDate] = useState(addDays(1));
  const [followReason, setFollowReason] = useState("");
  const [followNote, setFollowNote] = useState("");

  // Stage navigation
  const [stageBackModal, setStageBackModal] = useState<{ leadId: string; leadName: string; targetIdx: number } | null>(null);

  // Notes panel
  const [notesPanel, setNotesPanel] = useState<{ leadId: string; leadName: string; current: string } | null>(null);
  const [notesText, setNotesText] = useState("");
  const notesRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { fetchLeads(); }, []);

  // Re-fetch whenever the pipeline view becomes active (e.g. after CP Inbox import)
  useEffect(() => {
    const handler = (e: Event) => {
      if ((e as CustomEvent).detail === "pipeline") fetchLeads();
    };
    window.addEventListener("changeView", handler);
    return () => window.removeEventListener("changeView", handler);
  }, []);

  useEffect(() => {
    if (notesPanel && notesRef.current) {
      setTimeout(() => notesRef.current?.focus(), 100);
    }
  }, [notesPanel]);

  const fetchLeads = async () => {
    try {
      const url = repId ? `/api/pipeline?repId=${repId}&t=${Date.now()}` : `/api/pipeline?t=${Date.now()}`;
      const res = await fetch(url);
      const data = await res.json();
      setLeads(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Failed to fetch leads", e);
      setLeads([]);
    } finally {
      setLoading(false);
    }
  };

  // ── Actions ────────────────────────────────────────────────────────────────

  const patch = async (id: string, body: Record<string, unknown>) => {
    const res = await fetch(`/api/pipeline/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) fetchLeads();
  };

  const handleCall = (lead: PipelineLead) => {
    setCallModal({
      leadId: lead.id,
      leadName: lead.centerpoint_jobs?.property_name || lead.cpc_ticket_id,
      phone: resolvePhone(lead),
      email: resolveEmail(lead),
      ownerName: (lead.centerpoint_jobs?.raw?._owner as string) || "Unknown Owner",
      currentNotes: lead.lead_notes || "",
      currentAttempts: lead.contact_attempt_count,
    });
    setCallOutcome(null);
    setCallNote("");
  };

  const confirmCall = async () => {
    if (!callModal || !callOutcome) return;
    const { leadId, currentNotes, currentAttempts } = callModal;
    const OUTCOME_LABELS: Record<string, string> = {
      reached: "Reached",
      no_answer: "No Answer",
      voicemail: "Voicemail",
      wrong_number: "Wrong Number",
    };
    const entry = callNote.trim()
      ? `[${callTimestamp()}] ${OUTCOME_LABELS[callOutcome]} — ${callNote.trim()}`
      : `[${callTimestamp()}] ${OUTCOME_LABELS[callOutcome]}`;
    const updatedNotes = currentNotes ? `${currentNotes}\n${entry}` : entry;
    setCallModal(null);
    await patch(leadId, {
      contact_attempt_count: currentAttempts + 1,
      last_contacted_at: new Date().toISOString(),
      pipeline_status: callOutcome === "reached" ? "contacted" : "contact_attempted",
      lead_notes: updatedNotes,
    });
  };

  const handleDeadLead = (lead: PipelineLead) => {
    setDeadLeadModal({ leadId: lead.id, leadName: lead.centerpoint_jobs?.property_name || lead.cpc_ticket_id });
  };

  const confirmDeadLead = async () => {
    if (!deadLeadModal) return;
    const { leadId } = deadLeadModal;
    setDeadLeadModal(null);
    await patch(leadId, { pipeline_status: "dead_lead", dead_reason: "Manually marked as dead" });
  };

  const handleStartInspection = (lead: PipelineLead) => {
    if (!['scheduled', 'appointment_confirmed'].includes(lead.pipeline_status)) return;
    
    // Find the appointment ID for this rep, or the first one available
    const apptId = lead.appointments?.find(a => a.assigned_rep_id === repId)?.id || 
                   lead.appointments?.[0]?.id;

    window.dispatchEvent(new CustomEvent("launchPipelineSession", { 
      detail: { ...lead, appointmentId: apptId } 
    }));
  };

  // Stage navigation
  const handleStageClick = (lead: PipelineLead, targetIdx: number) => {
    if (BLOCKED_STATUSES.includes(lead.pipeline_status)) return;
    if (targetIdx === 4) return; // In Field only via Start Inspection button
    const currentIdx = STAGE_MAP[lead.pipeline_status] ?? 0;
    if (targetIdx === currentIdx && lead.pipeline_status === STAGE_STATUSES[targetIdx]) return;

    // Clicking Scheduled → open schedule modal
    if (targetIdx === 3) { openSchedModal(lead); return; }

    // Going backward → confirm first
    if (targetIdx < currentIdx) {
      setStageBackModal({ leadId: lead.id, leadName: lead.centerpoint_jobs?.property_name || lead.cpc_ticket_id, targetIdx });
      return;
    }

    // Going forward → immediate
    const updates: Record<string, unknown> = { pipeline_status: STAGE_STATUSES[targetIdx] };
    if (targetIdx === 1) {
      updates.contact_attempt_count = lead.contact_attempt_count + 1;
      updates.last_contacted_at = new Date().toISOString();
    }
    patch(lead.id, updates);
  };

  const confirmStageBack = async () => {
    if (!stageBackModal) return;
    const { leadId, targetIdx } = stageBackModal;
    setStageBackModal(null);
    const updates: Record<string, unknown> = { pipeline_status: STAGE_STATUSES[targetIdx] };
    if (targetIdx < 3) { updates.scheduled_start_at = null; updates.scheduled_end_at = null; }
    if (targetIdx < 1) { updates.next_follow_up_at = null; }
    await patch(leadId, updates);
  };

  // Schedule
  const openSchedModal = (lead: PipelineLead) => {
    setSchedModal({ leadId: lead.id, leadName: lead.centerpoint_jobs?.property_name || lead.cpc_ticket_id });
    setSchedDate(addDays(1));
    setSchedTime("09:00");
    setSchedDuration(60);
  };

  const confirmSchedule = async (force = false) => {
    if (!schedModal || !schedDate) return;
    const start = new Date(`${schedDate}T${schedTime}:00`);
    const end   = new Date(start.getTime() + schedDuration * 60000);

    // If we have a repId, use the appointments API (clash detection + record creation)
    if (repId && !force) {
      setScheduling(true);
      setClashWarning(null);
      try {
        const res = await fetch("/api/appointments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            pipeline_lead_id:    schedModal.leadId,
            rep_id:              repId,
            appointment_start_at: start.toISOString(),
            appointment_end_at:   end.toISOString(),
          }),
        });
        if (res.status === 409) {
          const data = await res.json();
          setClashWarning(data.message || "Schedule conflict detected.");
          return; // Stay in modal — show warning
        }
        if (!res.ok) throw new Error("Failed to create appointment");
        setSchedModal(null);
        setClashWarning(null);
        await fetchLeads();
      } catch (e) {
        console.error("[SCHEDULE]", e);
      } finally {
        setScheduling(false);
      }
    } else {
      // Fallback: direct patch (no clash detection, or force override)
      setSchedModal(null);
      setClashWarning(null);
      await patch(schedModal.leadId, {
        pipeline_status:     "scheduled",
        scheduled_start_at:  start.toISOString(),
        scheduled_end_at:    end.toISOString(),
      });
    }
  };

  const schedSummary = () => {
    if (!schedDate) return null;
    const d = new Date(`${schedDate}T${schedTime}:00`);
    const dateStr = d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
    const timeStr = fmtTime(d.toISOString());
    const durStr = schedDuration < 60 ? `${schedDuration} min` : `${schedDuration / 60} hr`;
    return `${dateStr} at ${timeStr} · ${durStr}`;
  };

  // Follow-up
  const openFollowModal = (lead: PipelineLead) => {
    setFollowModal({ leadId: lead.id, leadName: lead.centerpoint_jobs?.property_name || lead.cpc_ticket_id });
    setFollowDate(addDays(1));
    setFollowReason("");
    setFollowNote("");
  };

  const confirmFollowUp = async () => {
    if (!followModal || !followDate) return;
    const lead = leads.find(l => l.id === followModal.leadId);
    const currentNotes = lead?.lead_notes || "";
    const updates: Record<string, unknown> = {
      pipeline_status: "follow_up_needed",
      next_follow_up_at: new Date(followDate + "T00:00:00").toISOString(),
    };
    const parts = [followReason, followNote.trim()].filter(Boolean);
    if (parts.length > 0) {
      const entry = `[${callTimestamp()}] Follow-up set: ${parts.join(" · ")}`;
      updates.lead_notes = currentNotes ? `${currentNotes}\n${entry}` : entry;
    }
    setFollowModal(null);
    await patch(followModal.leadId, updates);
  };

  // Notes
  const openNotes = (lead: PipelineLead) => {
    setNotesPanel({ leadId: lead.id, leadName: lead.centerpoint_jobs?.property_name || lead.cpc_ticket_id, current: lead.lead_notes || "" });
    setNotesText("");
  };

  const saveNotes = async () => {
    if (!notesPanel) return;
    const trimmed = notesText.trim();
    setNotesPanel(null);
    if (!trimmed) return;
    const entry = `[${callTimestamp()}] ${trimmed}`;
    const updated = notesPanel.current ? `${notesPanel.current}\n${entry}` : entry;
    await patch(notesPanel.leadId, { lead_notes: updated });
  };

  const parseNoteEntries = (notes: string) => {
    if (!notes) return [];
    return notes.split("\n").filter(Boolean).map(line => {
      const m = line.match(/^\[([^\]]+)\]\s*(.+)/);
      if (m) return { timestamp: m[1], content: m[2], isActivity: true };
      return { timestamp: null, content: line, isActivity: false };
    });
  };

  const noteEntryIcon = (content: string) => {
    if (content.startsWith("Email sent")) return { icon: Mail, color: "text-indigo-400 bg-indigo-400/10" };
    if (content.startsWith("Reached")) return { icon: Phone, color: "text-emerald-400 bg-emerald-400/10" };
    if (content.startsWith("No Answer")) return { icon: Phone, color: "text-amber-400 bg-amber-400/10" };
    if (content.startsWith("Voicemail")) return { icon: Phone, color: "text-sky-400 bg-sky-400/10" };
    if (content.startsWith("Wrong Number")) return { icon: Phone, color: "text-rose-400 bg-rose-400/10" };
    if (content.startsWith("Follow-up set")) return { icon: Clock, color: "text-orange-400 bg-orange-400/10" };
    if (content.startsWith("Imported")) return { icon: CheckCircle2, color: "text-white/30 bg-white/5" };
    return { icon: MessageSquare, color: "text-white/25 bg-white/5" };
  };

  // Phone edit
  const openEditPhone = (lead: PipelineLead) => {
    setEditPhoneModal({ leadId: lead.id, leadName: lead.centerpoint_jobs?.property_name || lead.cpc_ticket_id, current: lead.owner_phone || "" });
    setEditPhoneValue(lead.owner_phone || "");
  };

  const savePhone = async () => {
    if (!editPhoneModal) return;
    setEditPhoneModal(null);
    await patch(editPhoneModal.leadId, { owner_phone: editPhoneValue.trim() || null });
  };

  // Email edit
  const openEditEmail = (lead: PipelineLead) => {
    setEditEmailModal({ leadId: lead.id, leadName: lead.centerpoint_jobs?.property_name || lead.cpc_ticket_id, current: lead.owner_email || "" });
    setEditEmailValue(lead.owner_email || "");
  };

  const saveEmail = async () => {
    if (!editEmailModal) return;
    setEditEmailModal(null);
    await patch(editEmailModal.leadId, { owner_email: editEmailValue.trim() || null });
  };

  // Draft & send email
  const openDraftEmail = (lead: PipelineLead) => {
    const em = resolveEmail(lead);
    if (!em) { openEditEmail(lead); return; }
    const ownerFirst = ((lead.centerpoint_jobs?.raw?._owner as string) || "there").split(" ")[0];
    const propertyName = lead.centerpoint_jobs?.property_name || lead.centerpoint_jobs?.name || lead.cpc_ticket_id;
    setDraftEmailModal({
      leadId: lead.id,
      leadName: propertyName,
      to: em,
      subject: `Storm Inspection Follow-up — ${propertyName}`,
      body: `Hi ${ownerFirst},\n\nI'm reaching out regarding the storm inspection for your property at ${propertyName}.\n\nBased on our assessment, we'd like to schedule a time to walk you through our findings and recommend next steps for your roof.\n\nPlease let me know when you're available, or feel free to call us at your convenience — we'd love to help you get this taken care of quickly.\n\nBest regards,\nHustad Companies\n(608) 846-2222`,
    });
    setEmailSending(false);
    setEmailSent(false);
    setEmailError(null);
  };

  const sendDraftEmail = async () => {
    if (!draftEmailModal) return;
    setEmailSending(true);
    setEmailError(null);
    try {
      const htmlBody = draftEmailModal.body
        .split("\n")
        .map(line => line.trim()
          ? `<p style="margin:0 0 14px;font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:#1a1a1a;">${line}</p>`
          : `<br/>`)
        .join("");
      const html = `<div style="max-width:580px;margin:0 auto;padding:36px 32px;background:#ffffff;">${htmlBody}</div>`;
      const res = await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: draftEmailModal.to, subject: draftEmailModal.subject, html }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || data.message || `Server error ${res.status}`);
      }
      setEmailSent(true);
      const lead = leads.find(l => l.id === draftEmailModal.leadId);
      const currentNotes = lead?.lead_notes || "";
      const entry = `[${callTimestamp()}] Email sent to ${draftEmailModal.to} — "${draftEmailModal.subject}"`;
      const updatedNotes = currentNotes ? `${currentNotes}\n${entry}` : entry;
      const nowIso = new Date().toISOString();
      const ADVANCED_STATUSES = ["contact_attempted","contacted","follow_up_needed","scheduled","appointment_confirmed","inspection_in_progress","inspection_completed","signed","closed","dead_lead"];
      await patch(draftEmailModal.leadId, {
        lead_notes: updatedNotes,
        last_contacted_at: nowIso,
        contact_attempt_count: (lead?.contact_attempt_count ?? 0) + 1,
        pipeline_status: lead && !ADVANCED_STATUSES.includes(lead.pipeline_status)
          ? "contact_attempted"
          : lead?.pipeline_status,
      });
      setTimeout(() => setDraftEmailModal(null), 1800);
    } catch (e: any) {
      console.error("[EMAIL]", e);
      setEmailError(e.message || "Failed to send email. Please try again.");
    } finally {
      setEmailSending(false);
    }
  };

  // Remove
  const handleRemoveClick = (e: React.MouseEvent, lead: PipelineLead) => {
    e.preventDefault(); e.stopPropagation();
    if (BLOCKED_STATUSES.includes(lead.pipeline_status)) { 
      setBlockedModal({ leadId: lead.id, leadName: lead.centerpoint_jobs?.property_name || lead.cpc_ticket_id }); 
      return; 
    }
    setConfirmModal({ leadId: lead.id, leadName: lead.centerpoint_jobs?.property_name || lead.cpc_ticket_id });
  };

  const confirmRemove = async () => {
    if (!confirmModal) return;
    const { leadId } = confirmModal;
    setConfirmModal(null);
    setRemoving(leadId);
    try {
      const res = await fetch(`/api/pipeline/${leadId}`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok) { setLeads(p => p.filter(l => l.id !== leadId)); setTimeout(fetchLeads, 300); }
      else if (res.status === 403) setBlockedModal(confirmModal);
      else console.error("Remove failed:", data.error);
    } catch (e) { console.error(e); }
    finally { setRemoving(null); }
  };

  const confirmForceRemove = async () => {
    if (!blockedModal) return;
    const { leadId } = blockedModal;
    setBlockedModal(null);
    setRemoving(leadId);
    try {
      const res = await fetch(`/api/pipeline/${leadId}?force=true`, { method: "DELETE" });
      if (res.ok) { setLeads(p => p.filter(l => l.id !== leadId)); setTimeout(fetchLeads, 300); }
    } catch (e) { console.error(e); }
    finally { setRemoving(null); }
  };

  // ── Stats ──────────────────────────────────────────────────────────────────

  const stats = {
    total: leads.filter(l => !['dead_lead','closed'].includes(l.pipeline_status)).length,
    scheduled: leads.filter(l => ['scheduled', 'appointment_confirmed'].includes(l.pipeline_status)).length,
    avgAttempts: leads.length
      ? (leads.reduce((s, l) => s + l.contact_attempt_count, 0) / leads.length).toFixed(1)
      : "0.0",
    // Use the same 7-day threshold as the card "Urgent" badge so the stat matches visible labels
    urgent: leads.filter(l => {
      if (!['new_lead','contact_attempted','follow_up_needed','contacted'].includes(l.pipeline_status)) return false;
      const d = daysSince(l.last_contacted_at);
      return d !== null && d >= 7;
    }).length,
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="p-8 space-y-8 overflow-y-auto h-full bg-black/20">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="flex items-center gap-6">
          <button
            onClick={() => window.dispatchEvent(new CustomEvent("changeView", { detail: "dashboard" }))}
            className="p-4 rounded-3xl bg-white/5 border border-white/10 hover:bg-white hover:text-black transition-all shadow-2xl"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <h2 className="text-4xl font-display font-medium tracking-tight">Sales Pipeline</h2>
            <p className="text-white/40 text-sm mt-1 font-light tracking-wide">Lead lifecycle and field conversion intelligence</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {[
            { label: "Active Leads", value: stats.total,       sub: `${stats.urgent} need attention`, icon: Activity, color: "text-indigo-400" },
            { label: "Scheduled",    value: stats.scheduled,   sub: "upcoming inspections",            icon: CalendarDays, color: "text-emerald-400" },
            { label: "Avg Touches",  value: stats.avgAttempts, sub: "contact attempts",                icon: Phone, color: "text-sky-400" },
          ].map((s, i) => (
            <div key={i} className="px-5 py-4 rounded-[24px] bg-white/[0.03] border border-white/[0.08] min-w-[148px]">
              <p className="text-[9px] font-mono text-white/20 uppercase tracking-[0.2em] mb-1">{s.label}</p>
              <div className="flex items-baseline gap-2">
                <s.icon className={cn("w-3.5 h-3.5 shrink-0", s.color)} />
                <p className="text-xl font-display font-semibold">{s.value}</p>
              </div>
              <p className="text-[10px] text-white/20 mt-1 font-light truncate">{s.sub}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Cards grid ─────────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-[#0b0b0b] border border-white/[0.07] rounded-[36px] h-64 animate-pulse" />
          ))}
        </div>
      ) : leads.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center mb-6">
            <Activity className="w-7 h-7 text-white/20" />
          </div>
          <p className="text-white/40 font-light text-lg">No leads in pipeline</p>
          <p className="text-white/20 text-sm mt-2">Import tickets from CP Inbox to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          <AnimatePresence>
            {leads.map((lead) => {
              const cfg = STATUS_CONFIG[lead.pipeline_status] ?? STATUS_CONFIG.new_lead;
              const StatusIcon = cfg.icon;
              const stageIdx = STAGE_MAP[lead.pipeline_status] ?? 0;
              const isRemoving = removing === lead.id;
              const isBlocked = BLOCKED_STATUSES.includes(lead.pipeline_status);
              const isScheduled = ['scheduled', 'appointment_confirmed'].includes(lead.pipeline_status);
              const idleDays = daysSince(lead.last_contacted_at);
              const isUrgent  = !isBlocked && !isScheduled && lead.pipeline_status !== 'dead_lead' && (idleDays === null || idleDays >= 7);
              const isWarning = !isUrgent && !isBlocked && !isScheduled && lead.pipeline_status !== 'dead_lead' && idleDays !== null && idleDays >= 3;
              const apptDurationMin = lead.scheduled_start_at && lead.scheduled_end_at
                ? Math.round((new Date(lead.scheduled_end_at).getTime() - new Date(lead.scheduled_start_at).getTime()) / 60000)
                : null;

              return (
                <motion.div
                  key={lead.id}
                  layout
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: isRemoving ? 0.35 : 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.94 }}
                  transition={{ duration: 0.22 }}
                  className="bg-[#0b0b0b] border border-white/[0.07] rounded-[36px] overflow-hidden hover:border-white/[0.14] transition-all duration-300 flex flex-col"
                >
                  {/* Animated status-colored progress bar */}
                  <div className="h-[2px] bg-white/[0.04] shrink-0">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${((stageIdx + 1) / 5) * 100}%` }}
                      transition={{ duration: 0.6, ease: "easeOut" }}
                      className={cn("h-full", cfg.bar)}
                    />
                  </div>

                  <div className="p-7 flex flex-col flex-1">
                    {/* Stage dots — clickable navigation */}
                    <div className="flex gap-1.5 mb-5">
                      {STAGE_LABELS.map((label, i) => {
                        const clickable = i !== 4 && !isBlocked;
                        const isCurrent = i === stageIdx;
                        const isPast = i < stageIdx;
                        return (
                          <div key={i} className="relative flex-1 group/dot">
                            {/* Tooltip */}
                            <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover/dot:opacity-100 transition-opacity z-10">
                              <div className="bg-[#111] border border-white/10 rounded-xl px-3 py-2 text-center" style={{ minWidth: '140px', maxWidth: '200px' }}>
                                <p className="text-[9px] font-mono text-white/70 uppercase tracking-widest mb-0.5">{label}</p>
                                <p className="text-[9px] text-white/35 font-light leading-snug">{STAGE_HINTS[i]}</p>
                              </div>
                            </div>
                            <button
                              onClick={() => handleStageClick(lead, i)}
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

                    {/* Badge row */}
                    <div className="flex items-center justify-between mb-5">
                      <div className={cn("flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-[9px] font-mono uppercase tracking-widest", cfg.color)}>
                        <StatusIcon className="w-3 h-3" />
                        {cfg.label}
                      </div>
                      <div className="flex items-center gap-2">
                        {isUrgent  && <div className="flex items-center gap-1 text-[9px] font-mono text-rose-400/80"><Flame className="w-3 h-3" /> Urgent</div>}
                        {isWarning && <div className="flex items-center gap-1 text-[9px] font-mono text-amber-400/70"><AlertCircle className="w-3 h-3" /> Stale</div>}
                        <span className="text-[9px] font-mono text-white/20 bg-white/[0.04] border border-white/[0.06] px-2 py-1 rounded-lg">
                          #{lead.cpc_ticket_id}
                        </span>
                      </div>
                    </div>

                    {/* Property */}
                    <div className="mb-6">
                      <h3 className="text-[1.4rem] font-display font-medium text-white tracking-tight leading-tight mb-2">
                        {lead.centerpoint_jobs?.property_name || lead.centerpoint_jobs?.name}
                      </h3>
                      <div className="flex items-center gap-3 mb-1.5">
                        <span className="text-xs text-white/35 flex items-center gap-1.5 font-light">
                          <User className="w-3.5 h-3.5 text-white/20" />
                          {lead.centerpoint_jobs?.raw?._owner
                            ? (lead.centerpoint_jobs.raw._owner as string).replace(/\b\w/g, (c: string) => c.toUpperCase())
                            : "Unknown Owner"}
                        </span>
                        <div className="w-1 h-1 rounded-full bg-white/10" />
                        <span className="text-[9px] font-mono text-white/20 uppercase tracking-widest">Residential</span>
                      </div>
                      {(() => {
                        const ph = resolvePhone(lead);
                        return ph ? (
                          <div className="flex items-center gap-2">
                            <a href={`tel:${ph.replace(/\D/g,"")}`}
                              className="flex items-center gap-1.5 text-[11px] text-sky-400/60 hover:text-sky-300 transition-colors font-light"
                              onClick={e => e.stopPropagation()}
                            >
                              <Phone className="w-3 h-3 shrink-0" />
                              {ph}
                            </a>
                            <button
                              onClick={e => { e.stopPropagation(); openEditPhone(lead); }}
                              className="text-white/15 hover:text-white/50 transition-colors"
                            >
                              <PenLine className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={e => { e.stopPropagation(); openEditPhone(lead); }}
                            className="flex items-center gap-1.5 text-[11px] text-white/20 hover:text-sky-400/70 transition-colors font-light"
                          >
                            <Phone className="w-3 h-3 shrink-0" />
                            Add phone number
                          </button>
                        );
                      })()}
                      {/* Email row */}
                      {(() => {
                        const em = resolveEmail(lead);
                        return em ? (
                          <div className="flex items-center gap-2 mt-1">
                            <button
                              onClick={e => { e.stopPropagation(); openDraftEmail(lead); }}
                              className="flex items-center gap-1.5 text-[11px] text-indigo-400/50 hover:text-indigo-300 transition-colors font-light"
                            >
                              <Mail className="w-3 h-3 shrink-0" />
                              <span className="truncate">{em}</span>
                            </button>
                            <button
                              onClick={e => { e.stopPropagation(); openEditEmail(lead); }}
                              className="text-white/15 hover:text-white/50 transition-colors"
                            >
                              <PenLine className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={e => { e.stopPropagation(); openEditEmail(lead); }}
                            className="flex items-center gap-1.5 text-[11px] text-white/20 hover:text-indigo-400/70 transition-colors font-light mt-1"
                          >
                            <Mail className="w-3 h-3 shrink-0" />
                            Add email address
                          </button>
                        );
                      })()}
                    </div>

                    {/* Stats row */}
                    <div className="grid grid-cols-3 gap-2.5 mb-6">
                      {/* Attempts */}
                      <div className="bg-white/[0.025] border border-white/[0.05] rounded-[18px] p-3.5">
                        <div className="flex items-center justify-between mb-1.5">
                          <p className="text-[7px] font-mono text-white/20 uppercase tracking-[0.2em]">Attempts</p>
                          <Phone className="w-2.5 h-2.5 text-white/10" />
                        </div>
                        <p className="text-[1.4rem] font-display font-semibold leading-none">{lead.contact_attempt_count}</p>
                      </div>

                      {/* Last contact / scheduled date */}
                      <div className="bg-white/[0.025] border border-white/[0.05] rounded-[18px] p-3.5">
                        <div className="flex items-center justify-between mb-1.5">
                          <p className="text-[7px] font-mono text-white/20 uppercase tracking-[0.2em]">
                            {isScheduled ? 'Date' : 'Last Contact'}
                          </p>
                          <Clock className="w-2.5 h-2.5 text-white/10" />
                        </div>
                        <p className="text-xs font-display text-white/55 leading-tight">
                          {isScheduled && lead.scheduled_start_at
                            ? fmtDate(lead.scheduled_start_at)
                            : fmtDate(lead.last_contacted_at) || "Never"}
                        </p>
                      </div>

                      {/* Time / follow-up / idle */}
                      <div className="bg-white/[0.025] border border-white/[0.05] rounded-[18px] p-3.5">
                        <div className="flex items-center justify-between mb-1.5">
                          <p className="text-[7px] font-mono text-white/20 uppercase tracking-[0.2em]">
                            {isScheduled ? 'Duration'
                              : lead.pipeline_status === 'follow_up_needed' ? 'Follow Up'
                              : 'Idle'}
                          </p>
                          <CalendarDays className="w-2.5 h-2.5 text-white/10" />
                        </div>
                        {isScheduled ? (
                          <div>
                            <p className="text-xs font-display text-emerald-400/80 leading-tight">
                              {lead.scheduled_start_at ? fmtTime(lead.scheduled_start_at) : '—'}
                            </p>
                            <p className="text-[9px] font-mono text-white/25 mt-0.5">
                              {apptDurationMin !== null
                                ? apptDurationMin < 60 ? `${apptDurationMin} min` : `${apptDurationMin / 60} hr`
                                : '—'}
                            </p>
                          </div>
                        ) : (
                          <p className={cn("text-xs font-display leading-tight", isUrgent ? "text-rose-400/80" : isWarning ? "text-amber-400/70" : "text-white/55")}>
                            {lead.pipeline_status === 'follow_up_needed' && lead.next_follow_up_at
                              ? fmtDate(lead.next_follow_up_at)
                              : idleDays !== null ? `${idleDays}d` : "New"}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Last activity chip */}
                    {(() => {
                      const entries = parseNoteEntries(lead.lead_notes || "");
                      const last = entries.filter(e => e.isActivity).slice(-1)[0];
                      if (!last) return null;
                      const { icon: ActIcon, color } = noteEntryIcon(last.content);
                      const label = last.content.length > 42 ? last.content.slice(0, 42) + "…" : last.content;
                      return (
                        <div className="flex items-center gap-2 mb-4 bg-white/[0.025] border border-white/[0.05] rounded-2xl px-3.5 py-2.5">
                          <div className={cn("w-5 h-5 rounded-lg flex items-center justify-center shrink-0", color)}>
                            <ActIcon className="w-3 h-3" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[10px] text-white/50 font-light truncate">{label}</p>
                          </div>
                          {last.timestamp && (
                            <span className="text-[9px] font-mono text-white/20 shrink-0">{last.timestamp}</span>
                          )}
                        </div>
                      );
                    })()}

                    {/* Primary actions */}
                    <div className="flex gap-2.5 mt-auto">
                      {isScheduled ? (
                        <button
                          onClick={() => handleStartInspection(lead)}
                          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-indigo-500 hover:bg-indigo-400 active:scale-95 text-white transition-all text-sm font-medium shadow-lg shadow-indigo-500/20"
                        >
                          <PlayCircle className="w-4 h-4" />
                          Start Inspection
                        </button>
                      ) : lead.pipeline_status === 'dead_lead' ? (
                        <span className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-rose-500/10 text-rose-400/60 text-sm font-medium cursor-not-allowed">
                          <XCircle className="w-4 h-4" />
                          Lead Closed
                        </span>
                      ) : (
                        <>
                          <button
                            onClick={() => handleCall(lead)}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white hover:text-black active:scale-95 transition-all text-xs font-medium"
                          >
                            <Phone className="w-3.5 h-3.5" /> Call
                          </button>
                          <button
                            onClick={() => openFollowModal(lead)}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white hover:text-black active:scale-95 transition-all text-xs font-medium"
                          >
                            <Clock className="w-3.5 h-3.5" /> Follow-up
                          </button>
                          <button
                            onClick={() => openSchedModal(lead)}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-indigo-500/15 border border-indigo-500/25 text-indigo-300 hover:bg-indigo-500/30 active:scale-95 transition-all text-xs font-medium"
                          >
                            <Calendar className="w-3.5 h-3.5" /> Schedule
                          </button>
                        </>
                      )}
                    </div>

                    {/* Secondary actions */}
                    {lead.pipeline_status !== 'dead_lead' && (
                      <div className="mt-2.5 pt-2.5 border-t border-white/[0.05] flex items-center gap-1">
                        <button
                          onClick={() => openNotes(lead)}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-white/25 hover:text-white/60 hover:bg-white/[0.04] transition-all text-[11px] font-medium"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          Notes
                          {lead.lead_notes && <div className="w-1.5 h-1.5 rounded-full bg-indigo-400/60" />}
                        </button>
                        <button
                          onClick={() => openDraftEmail(lead)}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-indigo-400/30 hover:text-indigo-400/80 hover:bg-indigo-500/[0.06] transition-all text-[11px] font-medium"
                        >
                          <Mail className="w-3.5 h-3.5" />
                          Email
                          {lead.lead_notes?.includes("Email sent") && <div className="w-1.5 h-1.5 rounded-full bg-indigo-400/60" />}
                        </button>
                        {isScheduled ? (
                          <button
                            onClick={() => openSchedModal(lead)}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-emerald-400/40 hover:text-emerald-400/80 hover:bg-emerald-500/[0.06] transition-all text-[11px] font-medium"
                          >
                            <Calendar className="w-3.5 h-3.5" /> Reschedule
                          </button>
                        ) : null}
                        <button
                          onClick={() => handleDeadLead(lead)}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-rose-400/30 hover:text-rose-400/70 hover:bg-rose-500/[0.06] transition-all text-[11px] font-medium"
                        >
                          <XCircle className="w-3.5 h-3.5" /> Dead Lead
                        </button>
                        <button
                          onClick={(e) => handleRemoveClick(e, lead)}
                          disabled={isRemoving}
                          className={cn(
                            "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl transition-all text-[11px] font-medium",
                            isBlocked
                              ? "text-white/10 cursor-not-allowed"
                              : "text-white/20 hover:text-white/50 hover:bg-white/[0.04]"
                          )}
                        >
                          <MinusCircle className="w-3.5 h-3.5" />
                          {isRemoving ? "Removing…" : "Remove"}
                        </button>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          SCHEDULE MODAL
      ══════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {schedModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4"
          >
            <motion.div initial={{ opacity: 0, scale: 0.96, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }} transition={{ type: "spring", damping: 28, stiffness: 320 }}
              className="bg-[#0d0d0d] border border-white/10 rounded-[32px] p-8 w-full max-w-md shadow-2xl"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-7">
                <div>
                  <div className="flex items-center gap-2.5 mb-1">
                    <CalendarDays className="w-5 h-5 text-emerald-400" />
                    <h3 className="text-xl font-display font-medium">Schedule Inspection</h3>
                  </div>
                  <p className="text-sm text-white/35 font-light">{schedModal.leadName}</p>
                </div>
                <button onClick={() => setSchedModal(null)} className="p-2 rounded-2xl text-white/30 hover:text-white hover:bg-white/5 transition-all">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Date */}
              <div className="mb-6">
                <label className="text-[9px] font-mono text-white/30 uppercase tracking-widest block mb-2">Date</label>
                <input
                  type="date"
                  value={schedDate}
                  min={new Date().toISOString().split("T")[0]}
                  onChange={(e) => setSchedDate(e.target.value)}
                  className="w-full bg-white/[0.04] border border-white/10 rounded-2xl px-4 py-3 text-white text-sm focus:outline-none focus:border-indigo-500/50 [color-scheme:dark]"
                />
              </div>

              {/* Time grid */}
              <div className="mb-6">
                <label className="text-[9px] font-mono text-white/30 uppercase tracking-widest block mb-2.5">Time</label>
                <div className="grid grid-cols-4 gap-2">
                  {TIME_SLOTS.map(slot => (
                    <button
                      key={slot.value}
                      onClick={() => setSchedTime(slot.value)}
                      className={cn(
                        "py-2.5 rounded-xl text-xs font-medium transition-all",
                        schedTime === slot.value
                          ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/20"
                          : "bg-white/[0.04] text-white/35 hover:bg-white/[0.08] hover:text-white/70"
                      )}
                    >
                      {slot.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Duration */}
              <div className="mb-7">
                <label className="text-[9px] font-mono text-white/30 uppercase tracking-widest block mb-2.5">Duration</label>
                <div className="flex gap-2">
                  {DURATIONS.map(dur => (
                    <button
                      key={dur.value}
                      onClick={() => setSchedDuration(dur.value)}
                      className={cn(
                        "flex-1 py-2.5 rounded-xl text-xs font-medium transition-all",
                        schedDuration === dur.value
                          ? "bg-emerald-500/20 border border-emerald-500/40 text-emerald-300"
                          : "bg-white/[0.04] text-white/30 hover:bg-white/[0.07] hover:text-white/60"
                      )}
                    >
                      {dur.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Summary */}
              {schedDate && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="flex items-center gap-3 bg-indigo-500/[0.08] border border-indigo-500/15 rounded-2xl px-4 py-3 mb-4"
                >
                  <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0" />
                  <p className="text-sm text-indigo-300 font-medium">{schedSummary()}</p>
                </motion.div>
              )}

              {/* Clash warning */}
              {clashWarning && (
                <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                  className="flex items-start gap-3 bg-rose-500/[0.08] border border-rose-500/20 rounded-2xl px-4 py-3 mb-4"
                >
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-rose-300 font-medium">Scheduling Conflict</p>
                    <p className="text-xs text-rose-400/70 font-light mt-0.5">{clashWarning}</p>
                  </div>
                  <button onClick={() => confirmSchedule(true)}
                    className="text-[10px] font-mono text-rose-400/60 hover:text-rose-300 uppercase tracking-widest whitespace-nowrap shrink-0 transition-colors">
                    Override
                  </button>
                </motion.div>
              )}

              {/* Actions */}
              <div className="flex gap-3">
                <button onClick={() => { setSchedModal(null); setClashWarning(null); }}
                  className="flex-1 py-3 rounded-2xl bg-white/5 border border-white/10 text-white/50 hover:text-white hover:border-white/20 transition-all text-sm">
                  Cancel
                </button>
                <button
                  onClick={() => confirmSchedule(false)}
                  disabled={!schedDate || scheduling}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/30 disabled:opacity-30 disabled:cursor-not-allowed transition-all text-sm font-medium"
                >
                  {scheduling ? (
                    <><div className="w-3.5 h-3.5 border-2 border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin" /> Checking…</>
                  ) : (
                    <>Confirm Schedule <ChevronRight className="w-4 h-4" /></>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══════════════════════════════════════════════════════════════════
          FOLLOW-UP MODAL
      ══════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {followModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4"
          >
            <motion.div initial={{ opacity: 0, scale: 0.96, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }} transition={{ type: "spring", damping: 28, stiffness: 320 }}
              className="bg-[#0d0d0d] border border-white/10 rounded-[32px] p-8 w-full max-w-sm shadow-2xl"
            >
              <div className="flex items-start justify-between mb-7">
                <div>
                  <div className="flex items-center gap-2.5 mb-1">
                    <Clock className="w-5 h-5 text-orange-400" />
                    <h3 className="text-xl font-display font-medium">Schedule Follow-up</h3>
                  </div>
                  <p className="text-sm text-white/35 font-light">{followModal.leadName}</p>
                </div>
                <button onClick={() => setFollowModal(null)} className="p-2 rounded-2xl text-white/30 hover:text-white hover:bg-white/5 transition-all">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Reason pills */}
              <div className="mb-5">
                <label className="text-[9px] font-mono text-white/30 uppercase tracking-widest block mb-2.5">Reason</label>
                <div className="flex flex-wrap gap-2">
                  {["No answer", "Requested callback", "Not ready yet", "Price check", "Reviewing options"].map(r => (
                    <button
                      key={r}
                      onClick={() => setFollowReason(prev => prev === r ? "" : r)}
                      className={cn(
                        "px-3.5 py-2 rounded-xl text-xs font-medium border transition-all",
                        followReason === r
                          ? "bg-orange-500/20 border-orange-500/40 text-orange-300"
                          : "bg-white/[0.03] border-white/[0.07] text-white/30 hover:bg-white/[0.07] hover:text-white/60"
                      )}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quick picks */}
              <div className="mb-5">
                <label className="text-[9px] font-mono text-white/30 uppercase tracking-widest block mb-2.5">Follow-up Date</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: "Tomorrow",   days: 1 },
                    { label: "In 2 days",  days: 2 },
                    { label: "In 3 days",  days: 3 },
                    { label: "Next week",  days: 7 },
                  ].map(opt => {
                    const d = addDays(opt.days);
                    return (
                      <button
                        key={opt.days}
                        onClick={() => setFollowDate(d)}
                        className={cn(
                          "py-3 rounded-2xl text-sm font-medium transition-all",
                          followDate === d
                            ? "bg-orange-500/20 border border-orange-500/40 text-orange-300"
                            : "bg-white/[0.04] text-white/40 hover:bg-white/[0.08] hover:text-white/70"
                        )}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Custom date */}
              <div className="mb-5">
                <label className="text-[9px] font-mono text-white/30 uppercase tracking-widest block mb-2">Custom Date</label>
                <input
                  type="date"
                  value={followDate}
                  min={new Date().toISOString().split("T")[0]}
                  onChange={(e) => setFollowDate(e.target.value)}
                  className="w-full bg-white/[0.04] border border-white/10 rounded-2xl px-4 py-3 text-white text-sm focus:outline-none focus:border-orange-500/40 [color-scheme:dark]"
                />
              </div>

              {/* Note */}
              <div className="mb-7">
                <label className="text-[9px] font-mono text-white/30 uppercase tracking-widest block mb-2">Note (optional)</label>
                <input
                  type="text"
                  value={followNote}
                  onChange={e => setFollowNote(e.target.value)}
                  placeholder="e.g. 'Prefers mornings', 'Waiting on insurance adjuster'"
                  className="w-full bg-white/[0.04] border border-white/10 rounded-2xl px-4 py-3 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-orange-500/40"
                />
              </div>

              <div className="flex gap-3">
                <button onClick={() => setFollowModal(null)}
                  className="flex-1 py-3 rounded-2xl bg-white/5 border border-white/10 text-white/50 hover:text-white hover:border-white/20 transition-all text-sm">
                  Cancel
                </button>
                <button
                  onClick={confirmFollowUp}
                  className="flex-1 py-3 rounded-2xl bg-orange-500/15 border border-orange-500/25 text-orange-300 hover:bg-orange-500/25 transition-all text-sm font-medium"
                >
                  Set Follow-up
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══════════════════════════════════════════════════════════════════
          NOTES SLIDE PANEL
      ══════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {notesPanel && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
              onClick={() => setNotesPanel(null)}
            />
            <motion.div
              initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 32, stiffness: 340 }}
              className="fixed right-0 top-0 bottom-0 w-[440px] max-w-full bg-[#0d0d0d] border-l border-white/10 z-50 flex flex-col shadow-2xl"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-8 py-6 border-b border-white/[0.06]">
                <div>
                  <div className="flex items-center gap-2.5 mb-0.5">
                    <MessageSquare className="w-4 h-4 text-indigo-400" />
                    <h3 className="text-lg font-display font-medium">Activity Log</h3>
                  </div>
                  <p className="text-xs text-white/30 font-light">{notesPanel.leadName}</p>
                </div>
                <button onClick={() => setNotesPanel(null)} className="p-2.5 rounded-2xl text-white/30 hover:text-white hover:bg-white/5 transition-all">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Timeline */}
              <div className="flex-1 overflow-y-auto px-8 py-6 space-y-3">
                {parseNoteEntries(notesPanel.current).length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/[0.07] flex items-center justify-center mb-4">
                      <MessageSquare className="w-5 h-5 text-white/15" />
                    </div>
                    <p className="text-white/25 text-sm font-light">No activity yet</p>
                    <p className="text-white/15 text-xs mt-1">Add a note below to get started</p>
                  </div>
                ) : (
                  [...parseNoteEntries(notesPanel.current)].reverse().map((entry, i) => {
                    const { icon: EntryIcon, color } = noteEntryIcon(entry.content);
                    return (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.03 }}
                        className="flex gap-3"
                      >
                        <div className={cn("w-7 h-7 rounded-xl flex items-center justify-center shrink-0 mt-0.5", color)}>
                          <EntryIcon className="w-3.5 h-3.5" />
                        </div>
                        <div className="flex-1 bg-white/[0.025] border border-white/[0.06] rounded-2xl px-4 py-3 min-w-0">
                          {entry.timestamp && (
                            <p className="text-[9px] font-mono text-white/25 uppercase tracking-widest mb-1.5">{entry.timestamp}</p>
                          )}
                          <p className="text-sm text-white/70 font-light leading-relaxed break-words">{entry.content}</p>
                        </div>
                      </motion.div>
                    );
                  })
                )}
              </div>

              {/* Add note */}
              <div className="px-8 py-6 border-t border-white/[0.06] space-y-3">
                <textarea
                  ref={notesRef}
                  value={notesText}
                  onChange={(e) => setNotesText(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) saveNotes(); }}
                  placeholder="Add a note… (⌘↵ to save)"
                  rows={3}
                  className="w-full bg-white/[0.03] border border-white/[0.08] rounded-2xl px-4 py-3 text-sm text-white/80 placeholder:text-white/20 focus:outline-none focus:border-indigo-500/40 resize-none leading-relaxed"
                />
                <div className="flex gap-3">
                  <button onClick={() => setNotesPanel(null)}
                    className="flex-1 py-2.5 rounded-2xl bg-white/5 border border-white/10 text-white/40 hover:text-white hover:border-white/20 transition-all text-sm">
                    Close
                  </button>
                  <button onClick={saveNotes} disabled={!notesText.trim()}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/30 disabled:opacity-30 disabled:cursor-not-allowed transition-all text-sm font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Add Note
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ══════════════════════════════════════════════════════════════════
          EDIT PHONE MODAL
      ══════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {editPhoneModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4"
          >
            <motion.div initial={{ opacity: 0, scale: 0.96, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }} transition={{ type: "spring", damping: 28, stiffness: 320 }}
              className="bg-[#0d0d0d] border border-white/10 rounded-[32px] p-8 w-full max-w-sm shadow-2xl"
            >
              <div className="flex items-start justify-between mb-6">
                <div>
                  <div className="flex items-center gap-2.5 mb-1">
                    <Phone className="w-5 h-5 text-sky-400" />
                    <h3 className="text-xl font-display font-medium">
                      {editPhoneModal.current ? "Edit Phone Number" : "Add Phone Number"}
                    </h3>
                  </div>
                  <p className="text-sm text-white/35 font-light">{editPhoneModal.leadName}</p>
                </div>
                <button onClick={() => setEditPhoneModal(null)} className="p-2 rounded-2xl text-white/30 hover:text-white hover:bg-white/5 transition-all">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="mb-7">
                <label className="text-[9px] font-mono text-white/30 uppercase tracking-widest block mb-2">
                  Homeowner Phone
                </label>
                <input
                  type="tel"
                  value={editPhoneValue}
                  onChange={e => setEditPhoneValue(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") savePhone(); }}
                  placeholder="(555) 867-5309"
                  autoFocus
                  className="w-full bg-white/[0.04] border border-white/10 rounded-2xl px-4 py-3 text-white text-base placeholder:text-white/20 focus:outline-none focus:border-sky-500/40 tracking-wide"
                />
                <p className="text-[10px] text-white/20 mt-2 font-light">
                  Saved to this lead. Tap the number on the card to dial directly.
                </p>
              </div>

              <div className="flex gap-3">
                <button onClick={() => setEditPhoneModal(null)}
                  className="flex-1 py-3 rounded-2xl bg-white/5 border border-white/10 text-white/50 hover:text-white hover:border-white/20 transition-all text-sm">
                  Cancel
                </button>
                <button onClick={savePhone}
                  className="flex-1 py-3 rounded-2xl bg-sky-500/15 border border-sky-500/25 text-sky-300 hover:bg-sky-500/25 transition-all text-sm font-medium">
                  Save Number
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══════════════════════════════════════════════════════════════════
          EDIT EMAIL MODAL
      ══════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {editEmailModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4"
          >
            <motion.div initial={{ opacity: 0, scale: 0.96, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }} transition={{ type: "spring", damping: 28, stiffness: 320 }}
              className="bg-[#0d0d0d] border border-white/10 rounded-[32px] p-8 w-full max-w-sm shadow-2xl"
            >
              <div className="flex items-start justify-between mb-6">
                <div>
                  <div className="flex items-center gap-2.5 mb-1">
                    <Mail className="w-5 h-5 text-indigo-400" />
                    <h3 className="text-xl font-display font-medium">
                      {editEmailModal.current ? "Edit Email Address" : "Add Email Address"}
                    </h3>
                  </div>
                  <p className="text-sm text-white/35 font-light">{editEmailModal.leadName}</p>
                </div>
                <button onClick={() => setEditEmailModal(null)} className="p-2 rounded-2xl text-white/30 hover:text-white hover:bg-white/5 transition-all">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="mb-7">
                <label className="text-[9px] font-mono text-white/30 uppercase tracking-widest block mb-2">
                  Homeowner Email
                </label>
                <input
                  type="email"
                  value={editEmailValue}
                  onChange={e => setEditEmailValue(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") saveEmail(); }}
                  placeholder="homeowner@example.com"
                  autoFocus
                  className="w-full bg-white/[0.04] border border-white/10 rounded-2xl px-4 py-3 text-white text-base placeholder:text-white/20 focus:outline-none focus:border-indigo-500/40 tracking-wide"
                />
                <p className="text-[10px] text-white/20 mt-2 font-light">
                  Saved to this lead. Tap the address on the card to open your mail app.
                </p>
              </div>

              <div className="flex gap-3">
                <button onClick={() => setEditEmailModal(null)}
                  className="flex-1 py-3 rounded-2xl bg-white/5 border border-white/10 text-white/50 hover:text-white hover:border-white/20 transition-all text-sm">
                  Cancel
                </button>
                <button onClick={saveEmail}
                  className="flex-1 py-3 rounded-2xl bg-indigo-500/15 border border-indigo-500/25 text-indigo-300 hover:bg-indigo-500/25 transition-all text-sm font-medium">
                  Save Email
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══════════════════════════════════════════════════════════════════
          DRAFT EMAIL MODAL
      ══════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {draftEmailModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4"
          >
            <motion.div initial={{ opacity: 0, scale: 0.96, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }} transition={{ type: "spring", damping: 28, stiffness: 320 }}
              className="bg-[#0d0d0d] border border-white/10 rounded-[32px] p-8 w-full max-w-lg shadow-2xl"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-6">
                <div>
                  <div className="flex items-center gap-2.5 mb-1">
                    <Mail className="w-5 h-5 text-indigo-400" />
                    <h3 className="text-xl font-display font-medium">Draft Email</h3>
                  </div>
                  <p className="text-sm text-white/35 font-light">{draftEmailModal.leadName}</p>
                </div>
                <button onClick={() => setDraftEmailModal(null)} className="p-2 rounded-2xl text-white/30 hover:text-white hover:bg-white/5 transition-all">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* To */}
              <div className="mb-4">
                <label className="text-[9px] font-mono text-white/30 uppercase tracking-widest block mb-2">To</label>
                <input
                  type="email"
                  value={draftEmailModal.to}
                  onChange={e => setDraftEmailModal(prev => prev ? { ...prev, to: e.target.value } : prev)}
                  className="w-full bg-white/[0.04] border border-white/10 rounded-2xl px-4 py-3 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-indigo-500/40"
                />
              </div>

              {/* Subject */}
              <div className="mb-4">
                <label className="text-[9px] font-mono text-white/30 uppercase tracking-widest block mb-2">Subject</label>
                <input
                  type="text"
                  value={draftEmailModal.subject}
                  onChange={e => setDraftEmailModal(prev => prev ? { ...prev, subject: e.target.value } : prev)}
                  className="w-full bg-white/[0.04] border border-white/10 rounded-2xl px-4 py-3 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-indigo-500/40"
                />
              </div>

              {/* Body */}
              <div className="mb-7">
                <label className="text-[9px] font-mono text-white/30 uppercase tracking-widest block mb-2">Message</label>
                <textarea
                  value={draftEmailModal.body}
                  onChange={e => setDraftEmailModal(prev => prev ? { ...prev, body: e.target.value } : prev)}
                  rows={9}
                  className="w-full bg-white/[0.04] border border-white/10 rounded-2xl px-4 py-3 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-indigo-500/40 resize-none leading-relaxed"
                />
              </div>

              {/* Error banner */}
              <AnimatePresence>
                {emailError && (
                  <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    className="flex items-start gap-3 bg-rose-500/[0.08] border border-rose-500/20 rounded-2xl px-4 py-3 mb-4"
                  >
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <p className="text-sm text-rose-300 font-medium">Failed to send</p>
                      <p className="text-xs text-rose-400/70 font-light mt-0.5 break-words">{emailError}</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Sent confirmation */}
              <AnimatePresence>
                {emailSent && (
                  <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    className="flex items-center gap-3 bg-emerald-500/[0.08] border border-emerald-500/20 rounded-2xl px-4 py-3 mb-4"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <p className="text-sm text-emerald-300 font-medium">Email sent successfully via Outlook</p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Actions */}
              <div className="flex gap-3">
                <button onClick={() => setDraftEmailModal(null)}
                  className="flex-1 py-3 rounded-2xl bg-white/5 border border-white/10 text-white/50 hover:text-white hover:border-white/20 transition-all text-sm">
                  Cancel
                </button>
                <button
                  onClick={sendDraftEmail}
                  disabled={emailSending || emailSent || !draftEmailModal.to.includes("@")}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/30 disabled:opacity-40 disabled:cursor-not-allowed transition-all text-sm font-medium"
                >
                  {emailSending ? (
                    <><div className="w-3.5 h-3.5 border-2 border-indigo-400/30 border-t-indigo-400 rounded-full animate-spin" /> Sending…</>
                  ) : emailSent ? (
                    <><CheckCircle2 className="w-4 h-4" /> Sent</>
                  ) : (
                    <><Mail className="w-4 h-4" /> Send via Outlook</>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══════════════════════════════════════════════════════════════════
          CALL MODAL
      ══════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {callModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4"
          >
            <motion.div initial={{ opacity: 0, scale: 0.96, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }} transition={{ type: "spring", damping: 28, stiffness: 320 }}
              className="bg-[#0d0d0d] border border-white/10 rounded-[32px] p-8 w-full max-w-sm shadow-2xl"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-6">
                <div>
                  <div className="flex items-center gap-2.5 mb-1">
                    <Phone className="w-5 h-5 text-sky-400" />
                    <h3 className="text-xl font-display font-medium">Log Call</h3>
                  </div>
                  <p className="text-sm text-white/35 font-light">{callModal.leadName}</p>
                </div>
                <button onClick={() => setCallModal(null)} className="p-2 rounded-2xl text-white/30 hover:text-white hover:bg-white/5 transition-all">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Contact info */}
              <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-5 mb-6">
                <div className="flex items-center gap-3 mb-3">
                  <User className="w-4 h-4 text-white/20 shrink-0" />
                  <span className="text-sm text-white/60 font-light">
                    {callModal.ownerName.replace(/\b\w/g, c => c.toUpperCase())}
                  </span>
                </div>
                {callModal.phone ? (
                  <a href={`tel:${callModal.phone.replace(/\D/g, "")}`}
                    className="flex items-center gap-3 group mb-2"
                  >
                    <Phone className="w-4 h-4 text-sky-400 shrink-0" />
                    <span className="text-lg font-display font-medium text-sky-300 group-hover:text-sky-200 transition-colors">
                      {callModal.phone}
                    </span>
                    <span className="ml-auto text-[9px] font-mono text-sky-400/40 group-hover:text-sky-400/70 uppercase tracking-widest transition-colors">
                      Tap to call
                    </span>
                  </a>
                ) : (
                  <div className="flex items-center gap-3 mb-2">
                    <Phone className="w-4 h-4 text-white/15 shrink-0" />
                    <span className="text-sm text-white/25 font-light italic">No phone number on file</span>
                  </div>
                )}
                {callModal.email && (
                  <a href={`mailto:${callModal.email}`}
                    className="flex items-center gap-3 group"
                  >
                    <Mail className="w-4 h-4 text-indigo-400/60 shrink-0" />
                    <span className="text-sm text-indigo-300/70 group-hover:text-indigo-200 transition-colors truncate">
                      {callModal.email}
                    </span>
                    <span className="ml-auto text-[9px] font-mono text-indigo-400/30 group-hover:text-indigo-400/60 uppercase tracking-widest transition-colors shrink-0">
                      Email
                    </span>
                  </a>
                )}
              </div>

              {/* Outcome pills */}
              <div className="mb-6">
                <label className="text-[9px] font-mono text-white/30 uppercase tracking-widest block mb-2.5">Call Outcome</label>
                <div className="grid grid-cols-2 gap-2">
                  {([
                    { value: "reached",      label: "✓ Reached",    active: "bg-emerald-500/20 border-emerald-500/40 text-emerald-300" },
                    { value: "no_answer",    label: "No Answer",    active: "bg-amber-500/20 border-amber-500/40 text-amber-300" },
                    { value: "voicemail",    label: "Voicemail",    active: "bg-sky-500/20 border-sky-500/40 text-sky-300" },
                    { value: "wrong_number", label: "Wrong Number", active: "bg-rose-500/20 border-rose-500/40 text-rose-300" },
                  ] as const).map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setCallOutcome(opt.value)}
                      className={cn(
                        "py-3 rounded-2xl text-sm font-medium border transition-all",
                        callOutcome === opt.value
                          ? opt.active
                          : "bg-white/[0.03] border-white/[0.07] text-white/30 hover:bg-white/[0.07] hover:text-white/60"
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quick note */}
              <div className="mb-7">
                <label className="text-[9px] font-mono text-white/30 uppercase tracking-widest block mb-2">Quick Note (optional)</label>
                <input
                  type="text"
                  value={callNote}
                  onChange={e => setCallNote(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && callOutcome) confirmCall(); }}
                  placeholder="e.g. 'Interested — send quote', 'Call back Friday'"
                  className="w-full bg-white/[0.04] border border-white/10 rounded-2xl px-4 py-3 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-sky-500/40"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button onClick={() => setCallModal(null)}
                  className="flex-1 py-3 rounded-2xl bg-white/5 border border-white/10 text-white/50 hover:text-white hover:border-white/20 transition-all text-sm">
                  Cancel
                </button>
                <button
                  onClick={confirmCall}
                  disabled={!callOutcome}
                  className="flex-1 py-3 rounded-2xl bg-sky-500/15 border border-sky-500/25 text-sky-300 hover:bg-sky-500/25 disabled:opacity-30 disabled:cursor-not-allowed transition-all text-sm font-medium"
                >
                  Log Call
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══════════════════════════════════════════════════════════════════
          DEAD LEAD CONFIRMATION MODAL
      ══════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {deadLeadModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4"
          >
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-[#0d0d0d] border border-white/10 rounded-[32px] p-8 max-w-sm w-full shadow-2xl"
            >
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mb-6">
                <XCircle className="w-6 h-6 text-rose-400" />
              </div>
              <h3 className="text-xl font-display font-medium mb-3">Mark as Dead Lead?</h3>
              <p className="text-white/40 text-sm leading-relaxed mb-8">
                <span className="text-white/70 font-medium">{deadLeadModal.leadName}</span> will be marked as dead and removed from your active pipeline. This can be undone by moving it back to New Lead.
              </p>
              <div className="flex gap-3">
                <button onClick={() => setDeadLeadModal(null)}
                  className="flex-1 py-3 rounded-2xl bg-white/5 border border-white/10 text-white/50 hover:text-white hover:border-white/20 transition-all text-sm">
                  Cancel
                </button>
                <button onClick={confirmDeadLead}
                  className="flex-1 py-3 rounded-2xl bg-rose-500/15 border border-rose-500/25 text-rose-400 hover:bg-rose-500/25 transition-all text-sm font-medium">
                  Mark Dead
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══════════════════════════════════════════════════════════════════
          CONFIRM REMOVE MODAL
      ══════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {confirmModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4"
          >
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-[#0d0d0d] border border-white/10 rounded-[32px] p-8 max-w-sm w-full shadow-2xl"
            >
              <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-6">
                <MinusCircle className="w-6 h-6 text-white/40" />
              </div>
              <h3 className="text-xl font-display font-medium mb-3">Remove from Pipeline?</h3>
              <p className="text-white/40 text-sm leading-relaxed mb-8">
                <span className="text-white/70 font-medium">{confirmModal.leadName}</span> will be removed from your pipeline but kept in CenterPoint. You can re-import it from CP Inbox later.
              </p>
              <div className="flex gap-3">
                <button onClick={() => setConfirmModal(null)}
                  className="flex-1 py-3 rounded-2xl bg-white/5 border border-white/10 text-white/50 hover:text-white hover:border-white/20 transition-all text-sm">
                  Cancel
                </button>
                <button onClick={confirmRemove}
                  className="flex-1 py-3 rounded-2xl bg-rose-500/15 border border-rose-500/25 text-rose-400 hover:bg-rose-500/25 transition-all text-sm font-medium">
                  Remove
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══════════════════════════════════════════════════════════════════
          STAGE BACK CONFIRMATION MODAL
      ══════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {stageBackModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4"
          >
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-[#0d0d0d] border border-white/10 rounded-[32px] p-8 max-w-sm w-full shadow-2xl"
            >
              <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-6">
                <ChevronLeft className="w-6 h-6 text-white/40" />
              </div>
              <h3 className="text-xl font-display font-medium mb-2">
                Move back to <span className="text-white/70">{STAGE_LABELS[stageBackModal.targetIdx]}</span>?
              </h3>
              <p className="text-white/35 text-sm leading-relaxed mb-8">
                {stageBackModal.leadName} will be reset to this stage.
                {stageBackModal.targetIdx < 3 && " Any scheduled appointment will be cleared."}
              </p>
              <div className="flex gap-3">
                <button onClick={() => setStageBackModal(null)}
                  className="flex-1 py-3 rounded-2xl bg-white/5 border border-white/10 text-white/50 hover:text-white hover:border-white/20 transition-all text-sm">
                  Cancel
                </button>
                <button onClick={confirmStageBack}
                  className="flex-1 py-3 rounded-2xl bg-white/[0.07] border border-white/15 text-white/80 hover:bg-white/[0.12] transition-all text-sm font-medium">
                  Confirm
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══════════════════════════════════════════════════════════════════
          BLOCKED MODAL
      ══════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {blockedModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4"
          >
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-[#0d0d0d] border border-white/10 rounded-[32px] p-8 max-w-sm w-full shadow-2xl"
            >
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-6">
                <AlertCircle className="w-6 h-6 text-amber-400" />
              </div>
              <h3 className="text-xl font-display font-medium mb-3">Cannot Remove Lead</h3>
              <p className="text-white/40 text-sm leading-relaxed mb-8">
                <span className="text-white/70 font-medium">{blockedModal.leadName}</span> has inspection activity and cannot be removed from Pipeline by standard users.
              </p>
              
              <div className="flex flex-col gap-3">
                <button 
                  onClick={confirmForceRemove}
                  className="w-full py-3 rounded-2xl bg-rose-500/15 border border-rose-500/25 text-rose-400 hover:bg-rose-500/25 transition-all text-sm font-medium"
                >
                  Force Remove (Admin)
                </button>
                <button 
                  onClick={() => setBlockedModal(null)}
                  className="w-full py-3 rounded-2xl bg-white/5 border border-white/10 text-white/40 hover:text-white hover:border-white/20 transition-all text-sm"
                >
                  Understood
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
