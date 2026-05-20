"use client";
import { fetchLeads, patchLead, completeSession, deleteSession, patchAppointment, deleteAppointment, sendEmail, patchCalendarEvent } from "@/lib/api";
import { useState, useEffect, useRef, useMemo } from "react";
import {
  createSession, saveSession, listDrafts,
  findDraftByImportId, loadDraftById, deleteDraft,
} from "@/lib/session";
import type { SessionState } from "@/types/session";
import { getLiveReps, saveCustomRep, deleteCustomRep } from "@/lib/reps";
import {
  enqueueCompletion, dequeueCompletion, getAllPending,
  recordRetryAttempt, isReadyForRetry,
} from "@/lib/sessionRetryQueue";
import type { RepIdentity } from "@/config/reps";
import type { AuthenticatedRep } from "@/lib/rep-identity";
import { buildRepCaptureEmail } from "@/lib/rep-capture-email";

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function isValidAddress(addr: string | undefined | null): addr is string {
  if (!addr) return false;
  const t = addr.trim().toLowerCase();
  return t.length > 0 && t !== "unknown address" && t !== "untitled property";
}

function normalizeAddress(raw: string | undefined | null): string {
  return (raw ?? "").replace(/\s+/g, " ").trim();
}
function normalizeName(raw: string | undefined | null): string {
  return (raw ?? "").trim().replace(/\b\w/g, c => c.toUpperCase());
}
function normalizeEmail(raw: string | undefined | null): string {
  return (raw ?? "").trim().toLowerCase();
}
function normalizePhone(raw: string | undefined | null): string {
  if (!raw) return "";
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) return `(${digits.slice(0,3)}) ${digits.slice(3,6)}-${digits.slice(6)}`;
  if (digits.length === 11 && digits[0] === "1") return `(${digits.slice(1,4)}) ${digits.slice(4,7)}-${digits.slice(7)}`;
  return raw.trim();
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type IntakePrefill = {
  source: "pipeline" | "centerpoint";
  address: string;
  homeownerName: string;
  homeownerEmail: string;
  homeownerMobile: string;
  claimNumber: string;
  pipelineLeadId?: string;
  centerpointId?: string;
  appointmentId?: string;
};

export type PendingImport = {
  session: SessionState;
  address: string;
  homeownerName: string;
  source: "centerpoint" | "pipeline";
  leadId?: string;
  appointmentId?: string;
};

export function normalizeImportData(raw: {
  source: "pipeline" | "centerpoint";
  address?: string | null;
  ownerName?: string | null;
  email?: string | null;
  phone?: string | null;
  claimNumber?: string | null;
  pipelineLeadId?: string;
  centerpointId?: string;
  appointmentId?: string;
}): IntakePrefill {
  return {
    source: raw.source,
    address: normalizeAddress(raw.address),
    homeownerName: normalizeName(raw.ownerName),
    homeownerEmail: normalizeEmail(raw.email),
    homeownerMobile: normalizePhone(raw.phone),
    claimNumber: (raw.claimNumber ?? "").trim(),
    pipelineLeadId: raw.pipelineLeadId,
    centerpointId: raw.centerpointId,
    appointmentId: raw.appointmentId,
  };
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export type CommandCenterView =
  | "dashboard" | "pipeline" | "schedule" | "calendar"
  | "centerpoint" | "tickets" | "manager" | "settings";

interface Props {
  currentRep: AuthenticatedRep;
  onLoadDraft: (id: string) => void;
  onPrefillAndStart: (data: IntakePrefill) => void;
  onResetSession?: () => void;
}

export function useRepCommandCenter({ currentRep, onLoadDraft, onPrefillAndStart, onResetSession }: Props) {
  const [view, setView]               = useState<CommandCenterView>("dashboard");
  const [search, setSearch]           = useState("");
  const [filter, setFilter]           = useState("all");
  const [liveReps, setLiveReps]       = useState<RepIdentity[]>([]);
  const [isAdding, setIsAdding]       = useState(false);
  const [newRep, setNewRep]           = useState({ name: "", role: "" });
  const [serverSessions, setServerSessions]   = useState<any[]>([]);
  const [isLoading, setIsLoading]             = useState(false);
  const [scheduledLeads, setScheduledLeads]   = useState<any[]>([]);
  const [pendingCompletions, setPendingCompletions] = useState(0);
  const [syncWarning, setSyncWarning]         = useState(false);
  const [pendingImport, setPendingImport]     = useState<PendingImport | null>(null);
  const [importError, setImportError]         = useState<string | null>(null);
  const [importSuccess, setImportSuccess]     = useState<string | null>(null);
  const [isConfirming, setIsConfirming]       = useState(false);
  const [pendingPrefill, setPendingPrefill]   = useState<IntakePrefill | null>(null);
  const [pendingDuplicate, setPendingDuplicate] = useState<{ sessionId: string; address: string } | null>(null);
  const [retryingSessionId, setRetryingSessionId] = useState<string | null>(null);
  const [draftRefreshKey, setDraftRefreshKey] = useState(0);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [copiedSessionId, setCopiedSessionId] = useState<string | null>(null);
  const [moreOpen, setMoreOpen]               = useState(false);

  const serverSessionsRef = useRef<any[]>([]);
  const lastBulkRetryAt   = useRef(0);

  // Auto-dismiss delete confirm after 3s
  useEffect(() => {
    if (!confirmDeleteId) return;
    const t = setTimeout(() => setConfirmDeleteId(null), 3000);
    return () => clearTimeout(t);
  }, [confirmDeleteId]);

  // Load server data + scheduled leads whenever view changes
  useEffect(() => {
    setLiveReps(getLiveReps());

    const loadServerData = async () => {
      setIsLoading(true);
      try {
        const { fetchSessionsFromServer } = await import("@/lib/sync");
        const sessions = await fetchSessionsFromServer();
        setServerSessions(Array.isArray(sessions) ? sessions : []);
      } catch { /* non-fatal */ } finally { setIsLoading(false); }
    };

    const loadScheduledLeads = async () => {
      try {
        const data = await fetchLeads(currentRep.id);
        setScheduledLeads(data.filter((l: any) => ["scheduled","appointment_confirmed"].includes(l.pipeline_status)));
      } catch { /* non-fatal */ }
    };

    loadServerData();
    loadScheduledLeads();

    if (view === "dashboard") {
      const triggerRetry = async () => {
        if (Date.now() - lastBulkRetryAt.current < 30_000) return;
        lastBulkRetryAt.current = Date.now();
        try {
          const { retryAllUnsyncedSessions } = await import("@/lib/sync");
          await retryAllUnsyncedSessions(currentRep.id);
          setDraftRefreshKey(k => k + 1);
        } catch { /* never throw from bulk retry */ }
      };
      triggerRetry();
    }
  }, [view]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { serverSessionsRef.current = serverSessions; }, [serverSessions]);

  // Retry on online / tab focus
  useEffect(() => {
    const triggerBulkRetry = async () => {
      if (Date.now() - lastBulkRetryAt.current < 30_000) return;
      lastBulkRetryAt.current = Date.now();
      try {
        const { retryAllUnsyncedSessions } = await import("@/lib/sync");
        await retryAllUnsyncedSessions(currentRep.id);
        setDraftRefreshKey(k => k + 1);
      } catch { /* never throw */ }
    };
    const onOnline = () => triggerBulkRetry();
    const onVis    = () => { if (document.visibilityState === "visible") triggerBulkRetry(); };
    window.addEventListener("online", onOnline);
    document.addEventListener("visibilitychange", onVis);
    return () => { window.removeEventListener("online", onOnline); document.removeEventListener("visibilitychange", onVis); };
  }, [currentRep.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Drain retry queue on mount
  useEffect(() => {
    const pending = getAllPending();
    setPendingCompletions(pending.length);
    if (pending.length === 0) return;
    const process = async () => {
      for (const item of pending) {
        if (!isReadyForRetry(item)) continue;
        try {
          const res = await completeSession(item.sessionId, item.sessionStatus);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          if (item.appointmentId) {
            await patchAppointment(item.appointmentId, { appointment_status: "completed" });
          }
          dequeueCompletion(item.sessionId);
        } catch { recordRetryAttempt(item.sessionId); }
      }
      setPendingCompletions(getAllPending().length);
    };
    process();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Escape key dismisses import modal
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && pendingImport && !isConfirming) setPendingImport(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pendingImport, isConfirming]);

  // Global event listeners (import, pipeline launch, view change, session complete, retry loop)
  useEffect(() => {
    const showImportError = (msg: string, ttl = 6000) => {
      setImportError(msg);
      setTimeout(() => setImportError(null), ttl);
    };

    const handleImportJob = (e: Event) => {
      const job = (e as CustomEvent<any>).detail;
      if (!job?.id || !job.attributes || typeof job.attributes !== "object") {
        showImportError("This CenterPoint job has missing data and cannot be imported.");
        return;
      }
      const address = job.attributes.propertyName as string | undefined;
      const existingLocal = findDraftByImportId("centerpointId", job.id);
      if (existingLocal) { setPendingDuplicate({ sessionId: existingLocal, address: normalizeAddress(address) || job.id }); return; }
      const existingCloud = serverSessionsRef.current.some((s: any) => s.cpc_ticket_id === job.id || (job.pipelineLeadId && s.pipeline_lead_id === job.pipelineLeadId));
      if (existingCloud) { showImportError("An inspection for this CenterPoint job already exists. Find it in the dashboard.", 8000); return; }
      if (isValidAddress(address)) {
        const newSession = createSession(currentRep.id, currentRep.name, currentRep.email);
        newSession.centerpointId = job.id;
        newSession.property.address = address;
        newSession.property.homeownerPrimaryName = "";
        newSession.sessionStatus = "phase_a_active";
        setPendingImport({ session: newSession, address, homeownerName: "", source: "centerpoint" });
        return;
      }
      setPendingPrefill(normalizeImportData({ source: "centerpoint", address, centerpointId: job.id }));
    };

    const handleLaunchPipelineSession = (e: Event) => {
      const lead = (e as CustomEvent<any>).detail;
      if (!lead?.id) { showImportError("This pipeline lead has missing data and cannot be imported."); return; }
      const address = lead.centerpoint_jobs?.property_name || lead.centerpoint_jobs?.name;
      const existingLocal = findDraftByImportId("pipelineLeadId", lead.id);
      if (existingLocal) { setPendingDuplicate({ sessionId: existingLocal, address: normalizeAddress(address) || lead.id }); return; }
      const existingCloud = serverSessionsRef.current.some((s: any) => s.pipeline_lead_id === lead.id || (lead.cpc_ticket_id && s.cpc_ticket_id === lead.cpc_ticket_id));
      if (existingCloud) { showImportError("An inspection for this lead already exists. Find it in the dashboard.", 8000); return; }
      const homeownerName: string = lead.centerpoint_jobs?.raw?._owner || "";
      const appointmentId: string | undefined = lead.appointmentId ?? undefined;
      if (isValidAddress(address)) {
        const newSession = createSession(currentRep.id, currentRep.name, currentRep.email);
        newSession.centerpointId = lead.cpc_ticket_id;
        newSession.pipelineLeadId = lead.id;
        newSession.appointmentId = appointmentId;
        newSession.property.address = address;
        newSession.property.homeownerPrimaryName = homeownerName;
        newSession.sessionStatus = "phase_a_active";
        setPendingImport({ session: newSession, address, homeownerName, source: "pipeline", leadId: lead.id, appointmentId });
        return;
      }
      setPendingPrefill(normalizeImportData({ source: "pipeline", address, ownerName: homeownerName, email: lead.centerpoint_jobs?.raw?._email, phone: lead.centerpoint_jobs?.raw?._phone, claimNumber: lead.cpc_ticket_id, pipelineLeadId: lead.id, centerpointId: lead.cpc_ticket_id, appointmentId }));
    };

    const handleChangeView = (e: Event) => setView((e as CustomEvent<any>).detail);

    const handleSessionCompleted = async (e: Event) => {
      const { sessionId, sessionStatus, appointmentId } = (e as CustomEvent<{ sessionId: string; sessionStatus: string; appointmentId?: string }>).detail;
      try {
        const res = await completeSession(sessionId, sessionStatus);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        if (appointmentId) {
          await patchAppointment(appointmentId, { appointment_status: "completed" });
        }
        dequeueCompletion(sessionId);
        setPendingCompletions(getAllPending().length);
      } catch (err) {
        enqueueCompletion({ sessionId, sessionStatus, appointmentId });
        setPendingCompletions(getAllPending().length);
        setSyncWarning(true);
        setTimeout(() => setSyncWarning(false), 8000);
      }
    };

    window.addEventListener("importCenterPointJob",    handleImportJob);
    window.addEventListener("launchPipelineSession",   handleLaunchPipelineSession);
    window.addEventListener("changeView",              handleChangeView);
    window.addEventListener("sessionCompleted",        handleSessionCompleted);

    const retryInterval = setInterval(async () => {
      const pending = getAllPending();
      if (pending.length === 0) return;
      for (const item of pending) {
        if (!isReadyForRetry(item)) continue;
        try {
          const res = await completeSession(item.sessionId, item.sessionStatus);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          if (item.appointmentId) {
            await patchAppointment(item.appointmentId, { appointment_status: "completed" });
          }
          dequeueCompletion(item.sessionId);
          setPendingCompletions(getAllPending().length);
        } catch {
          recordRetryAttempt(item.sessionId);
          setPendingCompletions(getAllPending().length);
        }
      }
    }, 15000);

    return () => {
      window.removeEventListener("importCenterPointJob",   handleImportJob);
      window.removeEventListener("launchPipelineSession",  handleLaunchPipelineSession);
      window.removeEventListener("changeView",             handleChangeView);
      window.removeEventListener("sessionCompleted",       handleSessionCompleted);
      clearInterval(retryInterval);
    };
  }, [currentRep]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Actions ────────────────────────────────────────────────────────────────

  const handleConfirmImport = async () => {
    if (!pendingImport || isConfirming) return;
    setIsConfirming(true);
    const { session, source, leadId, appointmentId: importApptId } = pendingImport;
    saveSession(session);
    setPendingImport(null);
    if (currentRep.email) {
      const captureUrl = `${window.location.origin}/rep-capture?s=${session.sessionId}`;
      fetch("/api/send-email", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: currentRep.email, subject: `📸 Your inspection camera link — ${session.property.address}`, sessionId: session.sessionId, html: buildRepCaptureEmail({ captureUrl, address: session.property.address, homeownerName: session.property.homeownerPrimaryName || "", repName: currentRep.name, sessionId: session.sessionId }) }),
      }).catch(() => {});
      const appointmentId = importApptId ?? session.appointmentId;
      if (appointmentId) {
        try {
          const stored = JSON.parse(localStorage.getItem("hustad_outlook_events") || "{}");
          const eventId: string | undefined = stored[appointmentId];
          if (eventId) {
            patchCalendarEvent({ eventId, captureUrl, address: session.property.address, homeownerName: session.property.homeownerPrimaryName || "" }).catch(() => {});
          }
        } catch { /* localStorage unavailable */ }
      }
    }
    try {
      if (source === "pipeline" && leadId) {
        try {
          const res = await patchLead(leadId, { pipeline_status: "inspection_in_progress" });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          setImportSuccess("Inspection started");
          setTimeout(() => setImportSuccess(null), 4000);
        } catch (err) {
          saveSession({ ...session, syncStatus: "error", syncError: (err instanceof Error ? err.message : "Pipeline sync failed") });
          setImportError("Saved locally. Sync will retry when connection is restored.");
          setTimeout(() => setImportError(null), 8000);
        }
        onLoadDraft(session.sessionId);
      } else {
        setDraftRefreshKey(k => k + 1);
        onLoadDraft(session.sessionId);
      }
    } finally { setIsConfirming(false); }
  };

  const handleDismissImport = () => { if (!isConfirming) setPendingImport(null); };

  const handleManualRetry = async (sessionId: string) => {
    if (retryingSessionId) return;
    setRetryingSessionId(sessionId);
    try {
      const { retrySyncSession } = await import("@/lib/sync");
      const session = loadDraftById(sessionId);
      if (!session) { setImportError("Session not found in local storage."); setTimeout(() => setImportError(null), 4000); return; }
      const ok = await retrySyncSession(session, true);
      if (ok) { setImportSuccess("Sync successful — session is now Cloud Synced."); setTimeout(() => setImportSuccess(null), 4000); }
      else    { setImportError("Saved locally. Sync will retry when connection is restored."); setTimeout(() => setImportError(null), 6000); }
      setDraftRefreshKey(k => k + 1);
    } catch {
      setImportError("Saved locally. Sync will retry when connection is restored.");
      setTimeout(() => setImportError(null), 6000);
    } finally { setRetryingSessionId(null); }
  };

  const handleDeleteDraft = (sessionId: string) => {
    if (confirmDeleteId !== sessionId) { setConfirmDeleteId(sessionId); return; }
    let isActive = false;
    try {
      const activeRaw = localStorage.getItem("hustad_session_draft");
      if (activeRaw) { const active = JSON.parse(activeRaw); if (active?.sessionId === sessionId) isActive = true; }
    } catch {}
    deleteDraft(sessionId);
    const draft = drafts.find(d => d.sessionId === sessionId);
    if (draft?.syncStatus === "synced") deleteSession(sessionId);
    setServerSessions(prev => prev.filter(s => s.session_id !== sessionId));
    setDraftRefreshKey(k => k + 1);
    setConfirmDeleteId(null);
    if (isActive && onResetSession) onResetSession();
  };

  const handleAddRep = () => {
    saveCustomRep({ id: `custom_${Date.now()}`, name: newRep.name, role: newRep.role, active: true });
    setIsAdding(false);
    setNewRep({ name: "", role: "" });
    setLiveReps(getLiveReps());
  };

  // ── Derived data ───────────────────────────────────────────────────────────

  const drafts = useMemo(() => {
    const local  = listDrafts(currentRep.id);
    const merged = [...local];
    serverSessions.forEach(s => {
      if (!merged.find(m => m.sessionId === s.session_id)) {
        const addr = (s.property_address || "").trim();
        if (!addr) return;
        merged.push({ sessionId: s.session_id, address: addr, homeownerName: s.homeowner_name || "Unknown Owner", repName: s.rep_name || "Unknown Rep", lastSavedAt: s.updated_at, sessionStatus: s.session_status, outcomeType: s.outcome_type, syncStatus: "synced", hasFollowUp: false, missingFieldsCount: 0, emergencyOverride: s.emergency_override, reconciliationRequired: s.crm_reconciliation_required });
      }
    });
    return merged
      .filter(d => { const a = d.address.toLowerCase().trim(); return a.length > 0 && a !== "untitled property"; })
      .sort((a, b) => new Date(b.lastSavedAt).getTime() - new Date(a.lastSavedAt).getTime());
  }, [serverSessions, draftRefreshKey, currentRep.id]);

  const filteredDrafts = useMemo(() =>
    drafts.filter(d => {
      const matchSearch = d.address.toLowerCase().includes(search.toLowerCase()) || d.homeownerName.toLowerCase().includes(search.toLowerCase());
      const matchFilter = filter === "all" || d.outcomeType === filter || (filter === "missing" && d.missingFieldsCount > 0);
      return matchSearch && matchFilter;
    }),
  [drafts, search, filter]);

  const stats = useMemo(() => ({
    active:        drafts.filter(d => ["draft","phase_a_active","phase_a_complete","rep_review_pending"].includes(d.sessionStatus)).length,
    pending:       drafts.filter(d => ["deferred","summary_locked","authorization_pending"].includes(d.sessionStatus)).length,
    missing:       drafts.filter(d => d.missingFieldsCount > 0).length,
    reconciliation:drafts.filter((d: any) => d.reconciliationRequired).length,
  }), [drafts]);

  return {
    // view
    view, setView, moreOpen, setMoreOpen,
    // search/filter
    search, setSearch, filter, setFilter,
    // reps
    liveReps, setLiveReps, isAdding, setIsAdding, newRep, setNewRep,
    handleAddRep,
    // data
    isLoading, scheduledLeads, drafts, filteredDrafts, stats,
    // import flow
    pendingImport, pendingPrefill, setPendingPrefill,
    pendingDuplicate, setPendingDuplicate,
    importError, setImportError, importSuccess, setImportSuccess,
    isConfirming, handleConfirmImport, handleDismissImport,
    // session actions
    retryingSessionId, handleManualRetry,
    confirmDeleteId, handleDeleteDraft,
    copiedSessionId, setCopiedSessionId,
    // sync
    pendingCompletions, syncWarning, setSyncWarning,
    draftRefreshKey,
  };
}
