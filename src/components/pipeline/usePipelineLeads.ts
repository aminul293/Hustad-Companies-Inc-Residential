"use client";
import { fetchLeads, patchLead, deleteLead, createAppointment, deleteAppointment, sendEmail, createCalendarEvent } from "@/lib/api";
import { useState, useEffect } from "react";
import { findDraftByImportId, deleteDraft } from "@/lib/session";
import {
  PipelineLead, STAGE_MAP, STAGE_STATUSES, BLOCKED_STATUSES,
  addDays, callTimestamp, resolveEmail, resolvePhone, daysSince,
} from "./pipelineTypes";

export interface ScheduleModalState  { leadId: string; leadName: string }
export interface CallModalState      { leadId: string; leadName: string; phone: string | null; email: string | null; ownerName: string; currentNotes: string; currentAttempts: number }
export interface EditContactState    { leadId: string; leadName: string; current: string }
export interface DraftEmailState     { leadId: string; leadName: string; to: string; subject: string; body: string }
export interface SimpleModalState    { leadId: string; leadName: string }
export interface StageBackState      { leadId: string; leadName: string; targetIdx: number }

export function usePipelineLeads(repId?: string, repEmail?: string) {
  const [leads, setLeads]     = useState<PipelineLead[]>([]);
  const [isLoading, setLoading] = useState(true);
  const [removing, setRemoving] = useState<string | null>(null);

  // ── Modal state ────────────────────────────────────────────────────────────
  const [deadLeadModal,  setDeadLeadModal]  = useState<SimpleModalState | null>(null);
  const [confirmModal,   setConfirmModal]   = useState<SimpleModalState | null>(null);
  const [blockedModal,   setBlockedModal]   = useState<SimpleModalState | null>(null);
  const [schedModal,     setSchedModal]     = useState<ScheduleModalState | null>(null);
  const [callModal,      setCallModal]      = useState<CallModalState | null>(null);
  const [editPhoneModal, setEditPhoneModal] = useState<EditContactState | null>(null);
  const [editEmailModal, setEditEmailModal] = useState<EditContactState | null>(null);
  const [draftEmailModal,setDraftEmailModal]= useState<DraftEmailState | null>(null);
  const [followModal,    setFollowModal]    = useState<SimpleModalState | null>(null);
  const [stageBackModal, setStageBackModal] = useState<StageBackState | null>(null);
  const [notesPanel,     setNotesPanel]     = useState<{ leadId: string; leadName: string; current: string } | null>(null);

  // ── Schedule form state ────────────────────────────────────────────────────
  const [schedDate,     setSchedDate]     = useState("");
  const [schedTime,     setSchedTime]     = useState("09:00");
  const [schedDuration, setSchedDuration] = useState(60);
  const [clashWarning,  setClashWarning]  = useState<string | null>(null);
  const [scheduling,    setScheduling]    = useState(false);

  // ── Call form state ────────────────────────────────────────────────────────
  const [callOutcome, setCallOutcome] = useState<"reached" | "no_answer" | "voicemail" | "wrong_number" | null>(null);
  const [callNote,    setCallNote]    = useState("");

  // ── Follow-up form state ───────────────────────────────────────────────────
  const [followDate,   setFollowDate]   = useState(addDays(1));
  const [followReason, setFollowReason] = useState("");
  const [followNote,   setFollowNote]   = useState("");

  // ── Contact edit state ─────────────────────────────────────────────────────
  const [editPhoneValue, setEditPhoneValue] = useState("");
  const [editEmailValue, setEditEmailValue] = useState("");

  // ── Notes state ───────────────────────────────────────────────────────────
  const [notesText, setNotesText] = useState("");

  // ── Email state ───────────────────────────────────────────────────────────
  const [emailSending, setEmailSending] = useState(false);
  const [emailSent,    setEmailSent]    = useState(false);
  const [emailError,   setEmailError]   = useState<string | null>(null);

  // ── Data fetching ──────────────────────────────────────────────────────────
  const reloadLeads = async () => {
    try {
      const data = await fetchLeads();
      setLeads(data);
    } catch {
      setLeads([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { reloadLeads(); }, []);
  useEffect(() => {
    const handler = (e: Event) => {
      if ((e as CustomEvent).detail === "pipeline") reloadLeads();
    };
    window.addEventListener("changeView", handler);
    return () => window.removeEventListener("changeView", handler);
  }, []);

  // ── Core patch helper ──────────────────────────────────────────────────────
  const patch = async (id: string, body: Record<string, unknown>) => {
    const res = await patchLead(id, body);
    if (res.ok) reloadLeads();
  };

  // ── Call actions ───────────────────────────────────────────────────────────
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
      reached: "Reached", no_answer: "No Answer",
      voicemail: "Voicemail", wrong_number: "Wrong Number",
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

  // ── Dead lead ──────────────────────────────────────────────────────────────
  const handleDeadLead = (lead: PipelineLead) =>
    setDeadLeadModal({ leadId: lead.id, leadName: lead.centerpoint_jobs?.property_name || lead.cpc_ticket_id });

  const confirmDeadLead = async () => {
    if (!deadLeadModal) return;
    const { leadId } = deadLeadModal;
    setDeadLeadModal(null);
    await patch(leadId, { pipeline_status: "dead_lead", dead_reason: "Manually marked as dead" });
  };

  // ── Start inspection ───────────────────────────────────────────────────────
  const handleStartInspection = (lead: PipelineLead) => {
    if (!["scheduled", "appointment_confirmed"].includes(lead.pipeline_status)) return;
    const apptId = lead.appointments?.find(a => a.assigned_rep_id === repId)?.id ||
                   lead.appointments?.[0]?.id;
    window.dispatchEvent(new CustomEvent("launchPipelineSession", { detail: { ...lead, appointmentId: apptId } }));
  };

  // ── Stage navigation ───────────────────────────────────────────────────────
  const handleStageClick = (lead: PipelineLead, targetIdx: number) => {
    if (BLOCKED_STATUSES.includes(lead.pipeline_status)) return;
    if (targetIdx === 4) return;
    const currentIdx = STAGE_MAP[lead.pipeline_status] ?? 0;
    if (targetIdx === currentIdx && lead.pipeline_status === STAGE_STATUSES[targetIdx]) return;
    if (targetIdx === 3) { openSchedModal(lead); return; }
    if (targetIdx < currentIdx) {
      setStageBackModal({ leadId: lead.id, leadName: lead.centerpoint_jobs?.property_name || lead.cpc_ticket_id, targetIdx });
      return;
    }
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
    if (targetIdx < 3) {
      updates.scheduled_start_at = null;
      updates.scheduled_end_at = null;
      const lead = leads.find(l => l.id === leadId);
      if (lead?.appointments?.length) {
        await Promise.all(lead.appointments.map(a =>
          deleteAppointment(a.id)
        ));
      }
      if (lead && lead.scheduled_start_at) {
        fireCancellationEmail(leadId, lead.scheduled_start_at);
      }
    }
    if (targetIdx < 1) updates.next_follow_up_at = null;
    await patch(leadId, updates);
  };

  // ── Schedule ───────────────────────────────────────────────────────────────
  const fireCancellationEmail = (leadId: string, prevStart: string) => {
    const lead = leads.find(l => l.id === leadId);
    if (!lead) return;
    const em = resolveEmail(lead);
    if (!em) return;
    const ownerFirst = ((lead.centerpoint_jobs?.raw?._owner as string) || "there").split(" ")[0];
    const propertyName = lead.centerpoint_jobs?.property_name || lead.centerpoint_jobs?.name || leadId;
    const date = new Date(prevStart);
    const dateStr = date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
    const timeStr = date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });

    const html = `<div style="max-width:580px;margin:0 auto;padding:40px 32px;background:#ffffff;font-family:Arial,sans-serif;"><div style="background:#0f0f0f;border-radius:16px;padding:28px 32px;margin-bottom:28px;"><p style="margin:0 0 4px;font-size:11px;color:#666;text-transform:uppercase;letter-spacing:0.15em;">Hustad Companies</p><h1 style="margin:0;font-size:22px;color:#ffffff;font-weight:600;">Inspection Cancelled</h1></div><p style="font-size:16px;color:#1a1a1a;margin:0 0 20px;">Hi ${ownerFirst},</p><p style="font-size:15px;color:#333;line-height:1.6;margin:0 0 24px;">Your storm inspection at <strong>${propertyName}</strong> originally scheduled for <strong>${dateStr} at ${timeStr}</strong> has been cancelled.</p><p style="font-size:15px;color:#333;line-height:1.6;margin:0 0 24px;">If you would like to reschedule or have any questions, please contact our office at (402) 934-2173 or reply to this email.</p><p style="font-size:15px;color:#333;margin:0 0 4px;">Best regards,</p><p style="font-size:15px;color:#1a1a1a;font-weight:600;margin:0 0 4px;">Hustad Companies</p><p style="font-size:14px;color:#666;margin:0;">(402) 934-2173</p></div>`;
    const subject = `Inspection Cancelled — ${propertyName}`;
    sendEmail({ to: em, subject, html }).then(async () => {
      const entry = `[${callTimestamp()}] Cancellation email sent to ${em} (originally ${dateStr} at ${timeStr})`;
      const currentNotes = lead.lead_notes || "";
      await patch(leadId, { lead_notes: currentNotes ? `${currentNotes}\n${entry}` : entry });
    }).catch(() => {});
  };

  const fireScheduleEmail = (leadId: string, start: Date, durationMin: number) => {
    const lead = leads.find(l => l.id === leadId);
    if (!lead) return;
    const em = resolveEmail(lead);
    if (!em) return;
    const ownerFirst = ((lead.centerpoint_jobs?.raw?._owner as string) || "there").split(" ")[0];
    const propertyName = lead.centerpoint_jobs?.property_name || lead.centerpoint_jobs?.name || leadId;
    const dateStr = start.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
    const timeStr = start.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
    const durStr  = durationMin < 60 ? `${durationMin} minutes` : `${durationMin / 60} hour${durationMin > 60 ? "s" : ""}`;
    const html = `<div style="max-width:580px;margin:0 auto;padding:40px 32px;background:#ffffff;font-family:Arial,sans-serif;"><div style="background:#0f0f0f;border-radius:16px;padding:28px 32px;margin-bottom:28px;"><p style="margin:0 0 4px;font-size:11px;color:#666;text-transform:uppercase;letter-spacing:0.15em;">Hustad Companies</p><h1 style="margin:0;font-size:22px;color:#ffffff;font-weight:600;">Inspection Confirmed</h1></div><p style="font-size:16px;color:#1a1a1a;margin:0 0 20px;">Hi ${ownerFirst},</p><p style="font-size:15px;color:#333;line-height:1.6;margin:0 0 24px;">Your storm inspection at <strong>${propertyName}</strong> has been scheduled.</p><div style="background:#f7f7f7;border-radius:12px;padding:20px 24px;margin:0 0 24px;"><table style="width:100%;border-collapse:collapse;"><tr><td style="padding:6px 0;font-size:13px;color:#888;width:90px;">Date</td><td style="font-size:14px;color:#1a1a1a;font-weight:600;">${dateStr}</td></tr><tr><td style="padding:6px 0;font-size:13px;color:#888;">Time</td><td style="font-size:14px;color:#1a1a1a;font-weight:600;">${timeStr}</td></tr><tr><td style="padding:6px 0;font-size:13px;color:#888;">Duration</td><td style="font-size:14px;color:#1a1a1a;font-weight:600;">Approx. ${durStr}</td></tr><tr><td style="padding:6px 0;font-size:13px;color:#888;">Address</td><td style="font-size:14px;color:#1a1a1a;font-weight:600;">${propertyName}</td></tr></table></div><p style="font-size:15px;color:#333;margin:0 0 4px;">Best regards,</p><p style="font-size:15px;color:#1a1a1a;font-weight:600;margin:0 0 4px;">Hustad Companies</p><p style="font-size:14px;color:#666;margin:0;">(402) 934-2173</p></div>`;
    const subject = `Inspection Confirmed — ${dateStr} at ${timeStr} · ${propertyName}`;
    sendEmail({ to: em, subject, html }).then(async () => {
      const entry = `[${callTimestamp()}] Confirmation email sent to ${em} — ${dateStr} at ${timeStr}`;
      const currentNotes = lead.lead_notes || "";
      await patch(leadId, { lead_notes: currentNotes ? `${currentNotes}\n${entry}` : entry });
    }).catch(() => {});
  };

  const fireCalendarEvent = async (leadId: string, start: Date, end: Date, appointmentId?: string) => {
    if (!repEmail) return;
    const lead = leads.find(l => l.id === leadId);
    const address = lead?.centerpoint_jobs?.property_name || lead?.centerpoint_jobs?.name || leadId;
    const homeownerName = (lead?.centerpoint_jobs?.raw?._owner as string) || "";
    try {
      const res = await createCalendarEvent({ subject: `Storm Inspection — ${address}`, startAt: start.toISOString(), endAt: end.toISOString(), address, homeownerName });
      if (res.ok && appointmentId) {
        const { eventId } = await res.json();
        if (eventId) {
          const stored = JSON.parse(localStorage.getItem("hustad_outlook_events") || "{}");
          stored[appointmentId] = eventId;
          localStorage.setItem("hustad_outlook_events", JSON.stringify(stored));
        }
      }
    } catch { /* non-fatal */ }
  };

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
    if (repId && !force) {
      setScheduling(true);
      setClashWarning(null);
      try {
        const res = await createAppointment({ pipeline_lead_id: schedModal.leadId, rep_id: repId, appointment_start_at: start.toISOString(), appointment_end_at: end.toISOString() });
        if (res.status === 409) { const data = await res.json(); setClashWarning(data.message || "Schedule conflict detected."); return; }
        if (!res.ok) throw new Error("Failed to create appointment");
        const apptData = await res.json();
        const appointmentId: string | undefined = apptData.appointment?.id;
        setSchedModal(null); setClashWarning(null);
        fireScheduleEmail(schedModal.leadId, start, schedDuration);
        fireCalendarEvent(schedModal.leadId, start, end, appointmentId);
        await reloadLeads();
      } catch { /* handled by UI */ } finally { setScheduling(false); }
    } else {
      setSchedModal(null); setClashWarning(null);
      fireScheduleEmail(schedModal.leadId, start, schedDuration);
      fireCalendarEvent(schedModal.leadId, start, end);
      await patch(schedModal.leadId, { pipeline_status: "scheduled", scheduled_start_at: start.toISOString(), scheduled_end_at: end.toISOString() });
    }
  };

  // ── Follow-up ──────────────────────────────────────────────────────────────
  const openFollowModal = (lead: PipelineLead) => {
    setFollowModal({ leadId: lead.id, leadName: lead.centerpoint_jobs?.property_name || lead.cpc_ticket_id });
    setFollowDate(addDays(1)); setFollowReason(""); setFollowNote("");
  };

  const confirmFollowUp = async () => {
    if (!followModal || !followDate) return;
    const lead = leads.find(l => l.id === followModal.leadId);
    const currentNotes = lead?.lead_notes || "";
    const updates: Record<string, unknown> = { pipeline_status: "follow_up_needed", next_follow_up_at: new Date(followDate + "T00:00:00").toISOString() };
    const parts = [followReason, followNote.trim()].filter(Boolean);
    if (parts.length > 0) {
      const entry = `[${callTimestamp()}] Follow-up set: ${parts.join(" · ")}`;
      updates.lead_notes = currentNotes ? `${currentNotes}\n${entry}` : entry;
    }
    setFollowModal(null);
    await patch(followModal.leadId, updates);
  };

  // ── Notes ──────────────────────────────────────────────────────────────────
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

  // ── Phone / email edit ─────────────────────────────────────────────────────
  const openEditPhone = (lead: PipelineLead) => {
    setEditPhoneModal({ leadId: lead.id, leadName: lead.centerpoint_jobs?.property_name || lead.cpc_ticket_id, current: lead.owner_phone || "" });
    setEditPhoneValue(lead.owner_phone || "");
  };
  const savePhone = async () => {
    if (!editPhoneModal) return;
    setEditPhoneModal(null);
    await patch(editPhoneModal.leadId, { owner_phone: editPhoneValue.trim() || null });
  };

  const openEditEmail = (lead: PipelineLead) => {
    setEditEmailModal({ leadId: lead.id, leadName: lead.centerpoint_jobs?.property_name || lead.cpc_ticket_id, current: lead.owner_email || "" });
    setEditEmailValue(lead.owner_email || "");
  };
  const saveEmail = async () => {
    if (!editEmailModal) return;
    setEditEmailModal(null);
    await patch(editEmailModal.leadId, { owner_email: editEmailValue.trim() || null });
  };

  // ── Draft email ────────────────────────────────────────────────────────────
  const openDraftEmail = (lead: PipelineLead) => {
    const em = resolveEmail(lead);
    if (!em) { openEditEmail(lead); return; }
    const ownerFirst = ((lead.centerpoint_jobs?.raw?._owner as string) || "there").split(" ")[0];
    const propertyName = lead.centerpoint_jobs?.property_name || lead.centerpoint_jobs?.name || lead.cpc_ticket_id;
    setDraftEmailModal({
      leadId: lead.id, leadName: propertyName, to: em,
      subject: `Storm Inspection Follow-up — ${propertyName}`,
      body: `Hi ${ownerFirst},\n\nI'm reaching out regarding the storm inspection for your property at ${propertyName}.\n\nBased on our assessment, we'd like to schedule a time to walk you through our findings and recommend next steps for your roof.\n\nPlease let me know when you're available, or feel free to call us at your convenience — we'd love to help you get this taken care of quickly.\n\nBest regards,\nHustad Companies\n(402) 934-2173`,
    });
    setEmailSending(false); setEmailSent(false); setEmailError(null);
  };

  const sendDraftEmail = async () => {
    if (!draftEmailModal) return;
    setEmailSending(true); setEmailError(null);
    try {
      const htmlBody = draftEmailModal.body.split("\n").map(line =>
        line.trim() ? `<p style="margin:0 0 14px;font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:#1a1a1a;">${line}</p>` : `<br/>`
      ).join("");
      const html = `<div style="max-width:580px;margin:0 auto;padding:36px 32px;background:#ffffff;">${htmlBody}</div>`;
      const res = await sendEmail({ to: draftEmailModal.to, subject: draftEmailModal.subject, html });
      if (!res.ok) { const data = await res.json().catch(() => ({})); throw new Error(data.error || data.message || `Server error ${res.status}`); }
      setEmailSent(true);
      const lead = leads.find(l => l.id === draftEmailModal.leadId);
      const currentNotes = lead?.lead_notes || "";
      const entry = `[${callTimestamp()}] Email sent to ${draftEmailModal.to} — "${draftEmailModal.subject}"`;
      const ADVANCED = ["contact_attempted","contacted","follow_up_needed","scheduled","appointment_confirmed","inspection_in_progress","inspection_completed","signed","closed","dead_lead"];
      await patch(draftEmailModal.leadId, {
        lead_notes: currentNotes ? `${currentNotes}\n${entry}` : entry,
        last_contacted_at: new Date().toISOString(),
        contact_attempt_count: (lead?.contact_attempt_count ?? 0) + 1,
        pipeline_status: lead && !ADVANCED.includes(lead.pipeline_status) ? "contact_attempted" : lead?.pipeline_status,
      });
      setTimeout(() => setDraftEmailModal(null), 1800);
    } catch (e: any) {
      setEmailError(e.message || "Failed to send email. Please try again.");
    } finally { setEmailSending(false); }
  };

  // ── Remove ─────────────────────────────────────────────────────────────────
  const handleRemoveClick = (e: React.MouseEvent, lead: PipelineLead) => {
    e.preventDefault(); e.stopPropagation();
    if (BLOCKED_STATUSES.includes(lead.pipeline_status)) {
      setBlockedModal({ leadId: lead.id, leadName: lead.centerpoint_jobs?.property_name || lead.cpc_ticket_id });
      return;
    }
    setConfirmModal({ leadId: lead.id, leadName: lead.centerpoint_jobs?.property_name || lead.cpc_ticket_id });
  };

  const purgeLinkedLocalDraft = (leadId: string) => {
    const sessionId = findDraftByImportId("pipelineLeadId", leadId);
    if (sessionId) deleteDraft(sessionId);
  };

  const confirmRemove = async () => {
    if (!confirmModal) return;
    const { leadId } = confirmModal;
    setConfirmModal(null); setRemoving(leadId);
    try {
      const res = await deleteLead(leadId);
      const data = await res.json();
      if (res.ok) { purgeLinkedLocalDraft(leadId); setLeads(p => p.filter(l => l.id !== leadId)); setTimeout(reloadLeads, 300); }
      else if (res.status === 403) setBlockedModal(confirmModal);
    } catch { } finally { setRemoving(null); }
  };

  const confirmForceRemove = async () => {
    if (!blockedModal) return;
    const { leadId } = blockedModal;
    setBlockedModal(null); setRemoving(leadId);
    try {
      const res = await deleteLead(leadId, true);
      if (res.ok) { purgeLinkedLocalDraft(leadId); setLeads(p => p.filter(l => l.id !== leadId)); setTimeout(reloadLeads, 300); }
    } catch { } finally { setRemoving(null); }
  };

  // ── Stats ──────────────────────────────────────────────────────────────────
  const stats = {
    total: leads.filter(l => !["dead_lead","closed"].includes(l.pipeline_status)).length,
    scheduled: leads.filter(l => ["scheduled","appointment_confirmed"].includes(l.pipeline_status)).length,
    avgAttempts: leads.length ? (leads.reduce((s, l) => s + l.contact_attempt_count, 0) / leads.length).toFixed(1) : "0.0",
    urgent: leads.filter(l => {
      if (!["new_lead","contact_attempted","follow_up_needed","contacted"].includes(l.pipeline_status)) return false;
      const d = daysSince(l.last_contacted_at);
      return d !== null && d >= 7;
    }).length,
  };

  return {
    // data
    leads, isLoading, removing, stats,
    // modal state
    deadLeadModal, confirmModal, blockedModal, schedModal,
    callModal, editPhoneModal, editEmailModal, draftEmailModal,
    followModal, stageBackModal, notesPanel,
    // schedule form
    schedDate, schedTime, schedDuration, clashWarning, scheduling,
    setSchedDate, setSchedTime, setSchedDuration,
    // call form
    callOutcome, callNote, setCallOutcome, setCallNote,
    // follow-up form
    followDate, followReason, followNote,
    setFollowDate, setFollowReason, setFollowNote,
    // contact edit
    editPhoneValue, editEmailValue, setEditPhoneValue, setEditEmailValue,
    // notes
    notesText, setNotesText,
    // email
    emailSending, emailSent, emailError,
    setDraftEmailModal,
    // actions
    handleCall, confirmCall,
    handleDeadLead, confirmDeadLead,
    handleStartInspection, handleStageClick, confirmStageBack,
    openSchedModal, confirmSchedule,
    openFollowModal, confirmFollowUp,
    openNotes, saveNotes,
    openEditPhone, savePhone,
    openEditEmail, saveEmail,
    openDraftEmail, sendDraftEmail,
    handleRemoveClick, confirmRemove, confirmForceRemove,
    // modal closers
    setDeadLeadModal, setConfirmModal, setBlockedModal,
    setSchedModal, setCallModal, setEditPhoneModal,
    setEditEmailModal, setFollowModal, setStageBackModal, setNotesPanel,
  };
}
