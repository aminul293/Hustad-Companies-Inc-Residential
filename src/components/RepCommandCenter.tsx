"use client";

import { useState, useMemo, useEffect, useRef } from "react";
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
import { CenterPointJobs } from "@/components/CenterPointJobs";
import { HustadTickets } from "@/components/HustadTickets";
import { PipelineLeads } from "@/components/PipelineLeads";
import { MySchedule } from "@/components/MySchedule";
import { CalendarView } from "@/components/CalendarView";
import { ManagerDashboard } from "@/components/ManagerDashboard";
import { buildRepCaptureEmail } from "@/lib/rep-capture-email";

function isValidAddress(addr: string | undefined | null): addr is string {
  if (!addr) return false;
  const t = addr.trim().toLowerCase();
  return t.length > 0 && t !== "unknown address" && t !== "untitled property";
}

// ─── Import data normalization ────────────────────────────────────────────────
// Deterministic field extraction from raw pipeline/CenterPoint payloads.
// TODO: Replace individual normalizers with an AI-assisted extraction call
// (e.g. Claude API at /api/ai/extract-intake) when that endpoint is available.
// The function signature and IntakePrefill shape should stay stable.

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
  if (digits.length === 10) return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  if (digits.length === 11 && digits[0] === "1") return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  return raw.trim();
}

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

function normalizeImportData(raw: {
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
// ─────────────────────────────────────────────────────────────────────────────

type PendingImport = {
  session: SessionState;
  address: string;
  homeownerName: string;
  source: "centerpoint" | "pipeline";
  leadId?: string;
  appointmentId?: string;
};

interface Props {
  currentRep: AuthenticatedRep;
  onLoadDraft: (id: string) => void;
  onNewSession: () => void;
  onPrefillAndStart: (data: IntakePrefill) => void;
  onBack?: () => void;
  onResetSession?: () => void;
}

export function RepCommandCenter({ currentRep, onLoadDraft, onNewSession, onPrefillAndStart, onBack, onResetSession }: Props) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<string>("all");
  const [view, setView] = useState<"dashboard" | "pipeline" | "schedule" | "calendar" | "centerpoint" | "tickets" | "manager" | "settings">("dashboard");
  const [liveReps, setLiveReps] = useState<RepIdentity[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newRep, setNewRep] = useState({ name: "", role: "" });

  const [serverSessions, setServerSessions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [scheduledLeads, setScheduledLeads] = useState<any[]>([]);
  const [pendingCompletions, setPendingCompletions] = useState(0);
  const [syncWarning, setSyncWarning] = useState(false);
  const [pendingImport, setPendingImport] = useState<PendingImport | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [pendingPrefill, setPendingPrefill] = useState<IntakePrefill | null>(null);
  const [pendingDuplicate, setPendingDuplicate] = useState<{ sessionId: string; address: string } | null>(null);
  const [retryingSessionId, setRetryingSessionId] = useState<string | null>(null);
  const [draftRefreshKey, setDraftRefreshKey] = useState(0);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [copiedSessionId, setCopiedSessionId] = useState<string | null>(null);
  const [moreOpen, setMoreOpen] = useState(false);

  useEffect(() => {
    if (!confirmDeleteId) return;
    const t = setTimeout(() => setConfirmDeleteId(null), 3000);
    return () => clearTimeout(t);
  }, [confirmDeleteId]);

  // Keep a ref so event handler closures always read current server sessions
  // without needing to re-register listeners every time the async load settles.
  const serverSessionsRef = useRef<any[]>([]);
  const lastBulkRetryAt = useRef(0);

  useEffect(() => {
    setLiveReps(getLiveReps());

    const loadServerData = async () => {
      setIsLoading(true);
      try {
        const { fetchSessionsFromServer } = await import("@/lib/sync");
        const sessions = await fetchSessionsFromServer();
        if (Array.isArray(sessions)) {
          setServerSessions(sessions);
        } else {
          setServerSessions([]);
        }
      } catch (e) {
        console.warn("Failed to fetch server sessions", e);
      } finally {
        setIsLoading(false);
      }
    };

    const loadScheduledLeads = async () => {
      try {
        const res = await fetch(`/api/pipeline?repId=${currentRep.id}&t=${Date.now()}`);
        const data = await res.json();
        if (Array.isArray(data)) {
          setScheduledLeads(data.filter((l: any) => ['scheduled', 'appointment_confirmed'].includes(l.pipeline_status)));
        }
      } catch (e) {
        console.warn("Failed to fetch scheduled leads", e);
      }
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

  // Retry unsynced sessions when the browser comes back online or the tab regains focus
  useEffect(() => {
    const triggerBulkRetry = async () => {
      if (Date.now() - lastBulkRetryAt.current < 30_000) return;
      lastBulkRetryAt.current = Date.now();
      try {
        const { retryAllUnsyncedSessions } = await import("@/lib/sync");
        await retryAllUnsyncedSessions(currentRep.id);
        setDraftRefreshKey(k => k + 1);
      } catch { /* never throw from bulk retry */ }
    };

    const onOnline = () => triggerBulkRetry();
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") triggerBulkRetry();
    };

    window.addEventListener("online", onOnline);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.removeEventListener("online", onOnline);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [currentRep.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // On mount: drain the retry queue for any completions that failed in a previous session
  useEffect(() => {
    const pending = getAllPending();
    setPendingCompletions(pending.length);
    if (pending.length === 0) return;

    const process = async () => {
      for (const item of pending) {
        if (!isReadyForRetry(item)) continue;
        try {
          const res = await fetch(`/api/sessions/${item.sessionId}/complete`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ session_status: item.sessionStatus }),
          });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);

          if (item.appointmentId) {
            await fetch(`/api/appointments/${item.appointmentId}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ appointment_status: "completed" }),
            });
          }

          dequeueCompletion(item.sessionId);
        } catch {
          recordRetryAttempt(item.sessionId);
        }
      }
      setPendingCompletions(getAllPending().length);
    };

    process();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Dismiss the import modal on Escape (only when not mid-confirm)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && pendingImport && !isConfirming) setPendingImport(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pendingImport, isConfirming]);

  // Handle importing a job from CenterPoint to the active Pipeline
  useEffect(() => {
    const showImportError = (msg: string, ttl = 6000) => {
      setImportError(msg);
      setTimeout(() => setImportError(null), ttl);
    };

    const handleImportJob = (e: Event) => {
      const job = (e as CustomEvent<any>).detail;

      // Defensive: guard against null/malformed payloads before touching any field
      if (!job || !job.id || !job.attributes || typeof job.attributes !== "object") {
        showImportError("This CenterPoint job has missing data and cannot be imported.");
        return;
      }

      const address = job.attributes.propertyName as string | undefined;

      // Dedup first — prefer routing to the existing session over blocking
      const existingLocal = findDraftByImportId("centerpointId", job.id);
      if (existingLocal) {
        setPendingDuplicate({ sessionId: existingLocal, address: normalizeAddress(address) || job.id });
        return;
      }
      const existingCloud = serverSessionsRef.current.some((s: any) =>
        s.cpc_ticket_id === job.id ||
        (job.pipelineLeadId && s.pipeline_lead_id === job.pipelineLeadId)
      );
      if (existingCloud) {
        showImportError("An inspection for this CenterPoint job already exists. Find it in the dashboard.", 8000);
        return;
      }

      // Valid address → confirmation modal (existing flow)
      if (isValidAddress(address)) {
        const newSession = createSession(currentRep.id, currentRep.name, currentRep.email);
        newSession.centerpointId = job.id;
        newSession.property.address = address;
        newSession.property.homeownerPrimaryName = "";
        newSession.sessionStatus = "phase_a_active";
        setPendingImport({ session: newSession, address, homeownerName: "", source: "centerpoint" });
        return;
      }

      // Address missing/invalid → stage prefill so the rep can Fix & Start
      setPendingPrefill(normalizeImportData({ source: "centerpoint", address, centerpointId: job.id }));
    };

    const handleLaunchPipelineSession = (e: Event) => {
      const lead = (e as CustomEvent<any>).detail;

      // Defensive: guard against null/malformed payloads
      if (!lead || !lead.id) {
        showImportError("This pipeline lead has missing data and cannot be imported.");
        return;
      }

      const address = lead.centerpoint_jobs?.property_name || lead.centerpoint_jobs?.name;

      // Dedup first — prefer routing to the existing session over blocking
      const existingLocal = findDraftByImportId("pipelineLeadId", lead.id);
      if (existingLocal) {
        setPendingDuplicate({ sessionId: existingLocal, address: normalizeAddress(address) || lead.id });
        return;
      }
      const existingCloud = serverSessionsRef.current.some((s: any) =>
        s.pipeline_lead_id === lead.id ||
        (lead.cpc_ticket_id && s.cpc_ticket_id === lead.cpc_ticket_id)
      );
      if (existingCloud) {
        showImportError("An inspection for this lead already exists. Find it in the dashboard.", 8000);
        return;
      }

      const homeownerName: string = lead.centerpoint_jobs?.raw?._owner || "";
      const appointmentId: string | undefined = lead.appointmentId ?? undefined;

      // Valid address → confirmation modal (existing flow)
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

      // Address missing/invalid → stage prefill so the rep can Fix & Start
      setPendingPrefill(normalizeImportData({
        source: "pipeline",
        address,
        ownerName: homeownerName,
        email: lead.centerpoint_jobs?.raw?._email,
        phone: lead.centerpoint_jobs?.raw?._phone,
        claimNumber: lead.cpc_ticket_id,
        pipelineLeadId: lead.id,
        centerpointId: lead.cpc_ticket_id,
        appointmentId,
      }));
    };

    const handleChangeView = (e: Event) => {
      const customEvent = e as CustomEvent<any>;
      setView(customEvent.detail);
    };

    // Fired by B19 when a session reaches a terminal state.
    // detail: { sessionId, sessionStatus, appointmentId? }
    const handleSessionCompleted = async (e: Event) => {
      const { sessionId, sessionStatus, appointmentId } =
        (e as CustomEvent<{ sessionId: string; sessionStatus: string; appointmentId?: string }>).detail;
      try {
        const res = await fetch(`/api/sessions/${sessionId}/complete`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ session_status: sessionStatus }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        if (appointmentId) {
          await fetch(`/api/appointments/${appointmentId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ appointment_status: "completed" }),
          });
        }

        // Ensure any previously queued entry for this session is cleared on success
        dequeueCompletion(sessionId);
        setPendingCompletions(getAllPending().length);
      } catch (err) {
        console.error("[SESSION_COMPLETE] downstream update failed — queuing for retry:", err);
        enqueueCompletion({ sessionId, sessionStatus, appointmentId });
        setPendingCompletions(getAllPending().length);
        setSyncWarning(true);
        // Auto-dismiss the warning banner after 8 seconds
        setTimeout(() => setSyncWarning(false), 8000);
      }
    };

    window.addEventListener('importCenterPointJob', handleImportJob);
    window.addEventListener('launchPipelineSession', handleLaunchPipelineSession);
    window.addEventListener('changeView', handleChangeView);
    window.addEventListener('sessionCompleted', handleSessionCompleted);

    // Background retry loop for pending completions
    const retryInterval = setInterval(async () => {
      const pending = getAllPending();
      if (pending.length === 0) return;

      for (const item of pending) {
        if (!isReadyForRetry(item)) continue;

        console.log(`[RETRY] Attempting completion for session ${item.sessionId}...`);
        try {
          const res = await fetch(`/api/sessions/${item.sessionId}/complete`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ session_status: item.sessionStatus }),
          });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);

          if (item.appointmentId) {
            await fetch(`/api/appointments/${item.appointmentId}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ appointment_status: "completed" }),
            });
          }

          dequeueCompletion(item.sessionId);
          console.log(`[RETRY] Successfully completed session ${item.sessionId}`);
          setPendingCompletions(getAllPending().length);
        } catch (err) {
          console.error(`[RETRY] Failed for session ${item.sessionId}:`, err);
          recordRetryAttempt(item.sessionId);
          setPendingCompletions(getAllPending().length);
        }
      }
    }, 15000); // Check every 15 seconds

    return () => {
      window.removeEventListener('importCenterPointJob', handleImportJob);
      window.removeEventListener('launchPipelineSession', handleLaunchPipelineSession);
      window.removeEventListener('changeView', handleChangeView);
      window.removeEventListener('sessionCompleted', handleSessionCompleted);
      clearInterval(retryInterval);
    };
  }, [currentRep]);

  const handleConfirmImport = async () => {
    if (!pendingImport || isConfirming) return;
    setIsConfirming(true);
    const { session, source, leadId, appointmentId: importApptId } = pendingImport;
    saveSession(session);
    setPendingImport(null);

    // Fire capture-link email + patch Outlook calendar event with the camera link
    if (currentRep.email) {
      const captureUrl = `${window.location.origin}/rep-capture?s=${session.sessionId}`;

      fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: currentRep.email,
          subject: `📸 Your inspection camera link — ${session.property.address}`,
          sessionId: session.sessionId,
          html: buildRepCaptureEmail({
            captureUrl,
            address: session.property.address,
            homeownerName: session.property.homeownerPrimaryName || "",
            repName: currentRep.name,
            sessionId: session.sessionId,
          }),
        }),
      }).catch(() => {});

      // Patch the Outlook calendar event (created at scheduling time) with the camera link
      const appointmentId = importApptId ?? session.appointmentId;
      if (appointmentId) {
        try {
          const stored = JSON.parse(localStorage.getItem("hustad_outlook_events") || "{}");
          const eventId: string | undefined = stored[appointmentId];
          if (eventId) {
            fetch("/api/calendar-event", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                eventId,
                captureUrl,
                address: session.property.address,
                homeownerName: session.property.homeownerPrimaryName || "",
              }),
            }).catch(() => {});
          }
        } catch { /* localStorage unavailable */ }
      }
    }

    try {
      if (source === "pipeline" && leadId) {
        let patchOk = true;
        try {
          const res = await fetch(`/api/pipeline/${leadId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ pipeline_status: "inspection_in_progress" }),
          });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
        } catch (err) {
          console.error("Failed to update pipeline status", err);
          patchOk = false;
          saveSession({ ...session, syncStatus: "error", syncError: (err instanceof Error ? err.message : "Pipeline sync failed") });
          setImportError("Saved locally. Sync will retry when connection is restored.");
          setTimeout(() => setImportError(null), 8000);
        }
        if (patchOk) {
          setImportSuccess("Inspection started");
          setTimeout(() => setImportSuccess(null), 4000);
        }
        onLoadDraft(session.sessionId);
      } else {
        // CenterPoint import — navigate directly into the session, same as pipeline
        setDraftRefreshKey(k => k + 1);
        onLoadDraft(session.sessionId);
      }
    } finally {
      setIsConfirming(false);
    }
  };

  const handleDismissImport = () => { if (!isConfirming) setPendingImport(null); };

  const handleManualRetry = async (sessionId: string) => {
    if (retryingSessionId) return;
    setRetryingSessionId(sessionId);
    try {
      const { retrySyncSession } = await import("@/lib/sync");
      const session = loadDraftById(sessionId);
      if (!session) {
        setImportError("Session not found in local storage.");
        setTimeout(() => setImportError(null), 4000);
        return;
      }
      const ok = await retrySyncSession(session, true /* force — bypass cooldown for manual retry */);
      if (ok) {
        setImportSuccess("Sync successful — session is now Cloud Synced.");
        setTimeout(() => setImportSuccess(null), 4000);
      } else {
        setImportError("Saved locally. Sync will retry when connection is restored.");
        setTimeout(() => setImportError(null), 6000);
      }
      setDraftRefreshKey(k => k + 1);
    } catch {
      setImportError("Saved locally. Sync will retry when connection is restored.");
      setTimeout(() => setImportError(null), 6000);
    } finally {
      setRetryingSessionId(null);
    }
  };

  const drafts = useMemo(() => {
    const local = listDrafts(currentRep.id);
    // Merge server sessions into local drafts if they don't exist locally
    const merged = [...local];
    serverSessions.forEach(s => {
      if (!merged.find(m => m.sessionId === s.session_id)) {
        const addr = (s.property_address || "").trim();
        if (!addr) return; // skip server records with no address
        merged.push({
          sessionId: s.session_id,
          address: addr,
          homeownerName: s.homeowner_name || "Unknown Owner",
          repName: s.rep_name || "Unknown Rep",
          lastSavedAt: s.updated_at,
          sessionStatus: s.session_status,
          outcomeType: s.outcome_type,
          syncStatus: "synced",
          hasFollowUp: false,
          missingFieldsCount: 0,
          emergencyOverride: s.emergency_override,
          reconciliationRequired: s.crm_reconciliation_required
        });
      }
    });
    return merged
      .filter(d => {
        const addr = d.address.toLowerCase().trim();
        return addr.length > 0 && addr !== "untitled property";
      })
      .sort((a, b) => new Date(b.lastSavedAt).getTime() - new Date(a.lastSavedAt).getTime());
  }, [serverSessions, draftRefreshKey, currentRep.id]);

  const filteredDrafts = useMemo(() => {
    return drafts.filter(d => {
      const matchesSearch = d.address.toLowerCase().includes(search.toLowerCase()) || 
                            d.homeownerName.toLowerCase().includes(search.toLowerCase());
      const matchesFilter = filter === "all" || d.outcomeType === filter || (filter === "missing" && d.missingFieldsCount > 0);
      return matchesSearch && matchesFilter;
    });
  }, [drafts, search, filter]);

  const stats = useMemo(() => {
    return {
      active: drafts.filter(d => ["draft", "phase_a_active", "phase_a_complete", "rep_review_pending"].includes(d.sessionStatus)).length,
      pending: drafts.filter(d => ["deferred", "summary_locked", "authorization_pending"].includes(d.sessionStatus)).length,
      missing: drafts.filter(d => d.missingFieldsCount > 0).length,
      reconciliation: drafts.filter((d: any) => d.reconciliationRequired).length
    };
  }, [drafts]);

  return (
    <div className="flex flex-col h-full bg-[#060606] text-[#E8EDF8]">
      {/* Import error banner */}
      <AnimatePresence>
        {importError && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="flex items-center justify-between gap-3 px-6 py-3 bg-rose-500/10 border-b border-rose-500/20 text-rose-300 text-xs font-mono"
          >
            <span className="flex items-center gap-2">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              {importError}
            </span>
            <button onClick={() => setImportError(null)} className="text-rose-400/50 hover:text-rose-300 transition-colors shrink-0">
              <Info className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Import success banner */}
      <AnimatePresence>
        {importSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="flex items-center justify-between gap-3 px-6 py-3 bg-emerald-500/10 border-b border-emerald-500/20 text-emerald-300 text-xs font-mono"
          >
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              {importSuccess}
            </span>
            <button onClick={() => setImportSuccess(null)} className="text-emerald-400/50 hover:text-emerald-300 transition-colors shrink-0">
              <Info className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Incomplete import banner — offers "Fix & Start" when import data is partial */}
      <AnimatePresence>
        {pendingPrefill && (
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
                onClick={() => { onPrefillAndStart(pendingPrefill); setPendingPrefill(null); }}
                className="px-3 py-1.5 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-200 hover:bg-amber-500/30 transition-colors font-display text-[10px] font-medium"
              >
                Fix &amp; Start Inspection
              </button>
              <button onClick={() => setPendingPrefill(null)} className="text-amber-400/50 hover:text-amber-300 transition-colors">
                <Info className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Duplicate import banner — routes rep to the existing session */}
      <AnimatePresence>
        {pendingDuplicate && (
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
                onClick={() => { onLoadDraft(pendingDuplicate.sessionId); setPendingDuplicate(null); }}
                className="px-3 py-1.5 rounded-xl bg-sky-500/20 border border-sky-500/30 text-sky-200 hover:bg-sky-500/30 transition-colors font-display text-[10px] font-medium"
              >
                Open Inspection
              </button>
              <button onClick={() => setPendingDuplicate(null)} className="text-sky-400/50 hover:text-sky-300 transition-colors">
                <Info className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sync warning banner */}
      <AnimatePresence>
        {syncWarning && (
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
            <button onClick={() => setSyncWarning(false)} className="text-amber-400/50 hover:text-amber-300 transition-colors shrink-0">
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
                className="p-2.5 md:p-3 rounded-2xl bg-white/5 border border-white/10 hover:bg-white hover:text-black transition-all shrink-0"
              >
                <ArrowLeft className="w-4 h-4 md:w-5 md:h-5" />
              </button>
            )}
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <h1 className="text-xl md:text-3xl font-display font-medium tracking-tight">
                  {{ dashboard: "Inspections", pipeline: "Pipeline", schedule: "My Schedule", calendar: "Calendar", centerpoint: "CP Inbox", tickets: "Tickets", manager: "Manager", settings: "Settings" }[view]}
                </h1>
                {pendingCompletions > 0 && (
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/25 text-[9px] font-mono text-amber-400 uppercase tracking-widest">
                    <AlertCircle className="w-2.5 h-2.5" />
                    {pendingCompletions}
                  </span>
                )}
              </div>
              <p className="hidden md:block text-sm text-[#7090B0] font-light">
                {{ dashboard: "Field intelligence and session management.", pipeline: "Manage leads from reach-out to appointment scheduling.", schedule: "Appointments, conflicts, and daily work queue.", calendar: "Day and week view with conflict detection and route navigation.", centerpoint: "Jobs synced from CenterPoint Connect.", tickets: "Your managed pipeline — stages, touches, and write-back.", manager: "All-rep activity, no-shows, follow-ups, and queue health.", settings: "Manage field identities and operational parameters." }[view]}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Tab switcher — tablet/desktop only */}
            <div className="hidden md:flex items-center gap-1 p-1 bg-white/5 border border-white/10 rounded-full">
              {([
                { id: "dashboard", label: "Inspections" },
                { id: "pipeline", label: "Pipeline" },
                { id: "schedule", label: "My Schedule" },
                { id: "calendar", label: "Calendar" },
                { id: "centerpoint", label: "CP Inbox" },
                { id: "tickets", label: "Tickets" },
                { id: "manager", label: "Manager" },
                { id: "settings", label: "Settings" },
              ] as const).map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setView(tab.id)}
                  className={cn(
                    "px-4 py-2 rounded-full text-xs font-display transition-all",
                    view === tab.id ? "bg-white text-black" : "text-[#567090] hover:text-[#E8EDF8]"
                  )}
                >{tab.label}</button>
              ))}
            </div>
            {/* Mobile: settings icon shortcut */}
            <button
              onClick={() => setView("settings")}
              className={cn(
                "md:hidden p-2.5 rounded-2xl border transition-all",
                view === "settings"
                  ? "bg-white/10 border-white/20 text-white"
                  : "bg-white/5 border-white/10 text-[#567090]"
              )}
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>

        {view === "dashboard" && (
          <>
            {/* ── Stripi-style KPI balance cards ── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
              {[
                { label: "Active sessions", value: stats.active,         sub: "in field or drafting",      dot: "#533afd", dotBg: "rgba(83,58,253,0.12)"  },
                { label: "Pending review",  value: stats.pending,        sub: "deferred or locked",        dot: "#29b572", dotBg: "rgba(41,181,114,0.12)" },
                { label: "Needs attention", value: stats.missing,        sub: "missing required fields",   dot: "#d24c47", dotBg: "rgba(210,76,71,0.12)"  },
                { label: "Reconciliation",  value: stats.reconciliation, sub: "discrepancies to resolve",  dot: "#d6a800", dotBg: "rgba(214,168,0,0.12)"  },
              ].map((s, i) => (
                <div
                  key={i}
                  className="rounded-xl border border-white/[0.08] bg-white/[0.025] backdrop-blur-xl p-4 md:p-5 hover:border-white/[0.16] hover:bg-white/[0.04] transition-all duration-200"
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
                      color: "#E8EDF8",
                    }}
                  >
                    {isLoading
                      ? <span className="inline-block w-5 h-5 border-2 border-white/10 border-t-white/40 rounded-full animate-spin" />
                      : s.value}
                  </p>
                  <p className="text-[11px] font-inter font-light" style={{ color: "#567090" }}>{s.sub}</p>
                </div>
              ))}
            </div>

            {/* ── Search + Stripi tab-bar filter ── */}
            <div className="flex flex-col gap-0">
              <div className="relative w-full mb-0">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#3F5878]" />
                <input
                  type="text"
                  placeholder="Search address or homeowner..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-white/[0.03] border border-white/[0.1] rounded-t-2xl rounded-b-none py-3 md:py-3.5 pl-11 pr-6 text-sm outline-none focus:border-indigo-500/50 transition-all"
                />
              </div>
              {/* Stripi tab-bar filter */}
              <div
                className="flex items-center overflow-x-auto border border-t-0 border-white/[0.1] rounded-b-2xl px-2"
                style={{ background: "rgba(255,255,255,0.015)" }}
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
                    onClick={() => setFilter(f.id)}
                    className="px-3 py-2.5 text-xs font-inter whitespace-nowrap transition-all duration-150"
                    style={{
                      color:        filter === f.id ? "#533afd" : "#567090",
                      borderTop:    "none",
                      borderLeft:   "none",
                      borderRight:  "none",
                      borderBottom: filter === f.id ? "2px solid #533afd" : "2px solid transparent",
                      marginBottom: -1,
                      background:   "transparent",
                      fontWeight:   filter === f.id ? 500 : 300,
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

      <div className={cn("flex-1 min-h-0 overflow-hidden", ["calendar", "manager"].includes(view) ? "flex flex-col" : "overflow-y-auto px-4 py-4 md:p-8 pb-24 md:pb-8")}>
        {view === "calendar" ? (
          <CalendarView currentRep={currentRep} managerMode={view === "calendar"} />
        ) : view === "manager" ? (
          <ManagerDashboard currentRep={currentRep} />
        ) : view === "centerpoint" ? (
          <CenterPointJobs />
        ) : view === "schedule" ? (
          <MySchedule currentRep={currentRep} />
        ) : view === "pipeline" ? (
          <PipelineLeads repId={currentRep.id} repEmail={currentRep.email} />
        ) : view === "tickets" ? (
          <HustadTickets />
        ) : view === "dashboard" ? (
          <div className="space-y-4">

            {/* ── Upcoming Scheduled Inspections from Pipeline ── */}
            {scheduledLeads.length > 0 && (
              <div className="mb-2">
                <p className="text-[9px] font-mono text-emerald-400/60 uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
                  <CalendarDays className="w-3 h-3" />
                  Upcoming · {scheduledLeads.length} scheduled
                </p>
                <div className="space-y-2 mb-5">
                  {scheduledLeads.map((lead: any) => {
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
                        className="group p-5 rounded-[24px] bg-emerald-500/[0.04] border border-emerald-500/[0.12] hover:border-emerald-500/25 transition-all flex items-center justify-between"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/15 flex items-center justify-center shrink-0">
                            <CalendarDays className="w-4 h-4 text-emerald-400" />
                          </div>
                          <div>
                            <p className="text-sm font-display font-medium text-[#E8EDF8]">
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
                          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/25 text-emerald-300 hover:bg-emerald-500/25 active:scale-95 transition-all text-xs font-medium shrink-0"
                        >
                          <PlayCircle className="w-3.5 h-3.5" />
                          Start Inspection
                        </button>
                      </div>
                    );
                  })}
                </div>
                <div className="h-px bg-white/[0.05] mb-5" />
              </div>
            )}

            {filteredDrafts.length > 0 ? (
              <div className="grid grid-cols-1 gap-4">
                {filteredDrafts.map((d) => (
                  <div
                    key={d.sessionId}
                    onClick={() => onLoadDraft(d.sessionId)}
                    className="w-full group p-4 md:p-6 rounded-[24px] md:rounded-[32px] bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.04] hover:border-white/20 transition-all text-left relative overflow-hidden cursor-pointer active:scale-[0.99]"
                  >
                    {/* Subtle hover gradient */}
                    <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/0 via-indigo-500/0 to-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />

                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6 relative z-10">
                      <div className="grow space-y-3 md:space-y-4">
                        <div className="flex items-center gap-2 flex-wrap">
                          <div className={cn(
                            "px-3 py-1 rounded-full font-mono text-[9px] uppercase tracking-widest border",
                            d.syncStatus === "synced"
                              ? "bg-emerald-500/5 text-emerald-400 border-emerald-500/20"
                              : d.syncStatus === "syncing"
                              ? "bg-sky-500/5 text-sky-400 border-sky-500/20"
                              : d.syncStatus === "error"
                              ? "bg-rose-500/5 text-rose-400 border-rose-500/20"
                              : "bg-amber-500/5 text-amber-400 border-amber-500/20"
                          )}>
                            {d.syncStatus === "synced"
                              ? "Cloud Synced"
                              : d.syncStatus === "syncing"
                              ? "Syncing…"
                              : d.syncStatus === "error"
                              ? "Sync Pending"
                              : "Local Storage"}
                          </div>
                          {d.syncStatus === "error" && (
                            <button
                              onClick={(e) => { e.stopPropagation(); handleManualRetry(d.sessionId); }}
                              disabled={retryingSessionId === d.sessionId}
                              className="flex items-center gap-1.5 px-3 py-1 rounded-full font-mono text-[9px] uppercase tracking-widest border bg-rose-500/10 text-rose-300 border-rose-500/25 hover:bg-rose-500/20 transition-all disabled:opacity-50 disabled:pointer-events-none"
                            >
                              <RefreshCw className={cn("w-2.5 h-2.5", retryingSessionId === d.sessionId && "animate-spin")} />
                              {retryingSessionId === d.sessionId ? "Retrying…" : "Retry Sync"}
                            </button>
                          )}
                          {d.missingFieldsCount > 0 && (
                            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/5 border border-rose-500/20 text-[9px] font-mono text-rose-400 uppercase tracking-widest">
                              <AlertCircle className="w-3 h-3" />
                              {d.missingFieldsCount} Incomplete
                            </div>
                          )}
                          {(d as any).reconciliationRequired && (
                            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/5 border border-amber-500/20 text-[9px] font-mono text-amber-400 uppercase tracking-widest">
                              <AlertTriangle className="w-3 h-3" />
                              Needs CRM Recon
                            </div>
                          )}
                        </div>
                        <div className="space-y-1">
                          <p className="text-base md:text-xl font-display font-medium tracking-tight group-hover:text-indigo-300 transition-colors">{d.address}</p>
                          <div className="flex items-center gap-3 md:gap-6 text-[10px] md:text-[11px] font-mono text-[#567090] uppercase tracking-wider flex-wrap">
                            <span className="flex items-center gap-1.5"><User className="w-3 h-3 md:w-3.5 md:h-3.5 text-indigo-400/50" /> {d.homeownerName || "No Owner Listed"}</span>
                            <span className="flex items-center gap-1.5"><Calendar className="w-3 h-3 md:w-3.5 md:h-3.5 text-indigo-400/50" /> {new Date(d.lastSavedAt).toLocaleDateString()}</span>
                            <span className="md:hidden text-[9px] text-[#567090]">{d.sessionStatus.replace(/_/g, " ").toUpperCase()}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 md:gap-8 shrink-0">
                        <div className="text-right hidden md:block">
                          <p className="text-[9px] font-mono text-[#2D4060] uppercase tracking-[0.2em] mb-1.5">Operational Phase</p>
                          <p className="text-[10px] font-mono font-medium text-[#8BA5C5] tracking-widest">
                            {d.sessionStatus.replace(/_/g, " ").toUpperCase()}
                          </p>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirmDeleteId === d.sessionId) {
                              const activeRaw = localStorage.getItem("hustad_session_draft");
                              let isActive = false;
                              if (activeRaw) {
                                try {
                                  const active = JSON.parse(activeRaw);
                                  if (active && active.sessionId === d.sessionId) {
                                    isActive = true;
                                  }
                                } catch {}
                              }

                              deleteDraft(d.sessionId);
                              if (d.syncStatus === "synced") {
                                fetch(`/api/sessions/${d.sessionId}`, { method: "DELETE" }).catch(() => {});
                              }
                              setServerSessions(prev => prev.filter(s => s.session_id !== d.sessionId));
                              setDraftRefreshKey(k => k + 1);
                              setConfirmDeleteId(null);

                              if (isActive && onResetSession) {
                                onResetSession();
                              }
                            } else {
                              setConfirmDeleteId(d.sessionId);
                            }
                          }}
                          className={cn(
                            "flex items-center gap-1.5 rounded-xl transition-all shrink-0",
                            confirmDeleteId === d.sessionId
                              ? "px-3 py-2 bg-rose-500/20 border border-rose-500/40 text-rose-300 text-[9px] font-mono uppercase tracking-widest"
                              : "p-2 text-[#2D4060] hover:text-rose-400 hover:bg-rose-500/10 opacity-0 group-hover:opacity-100"
                          )}
                        >
                          <Trash className="w-4 h-4 shrink-0" />
                          {confirmDeleteId === d.sessionId && <span>Confirm</span>}
                        </button>
                        <div className="h-10 w-10 md:h-14 md:w-14 rounded-xl md:rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-white group-hover:scale-105 transition-all">
                          <ChevronRight className="w-5 h-5 md:w-6 md:h-6 text-[#E8EDF8] group-hover:text-black transition-colors" />
                        </div>
                      </div>
                    </div>

                    {/* Rep Camera Link */}
                    <div
                      className="mt-4 pt-4 border-t border-white/[0.05] flex items-center gap-3 relative z-10"
                      onClick={e => e.stopPropagation()}
                    >
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=64x64&data=${encodeURIComponent(`${typeof window !== "undefined" ? window.location.origin : ""}/rep-capture?s=${d.sessionId}`)}&bgcolor=0d0d1a&color=a5b4fc&qzone=1&format=png`}
                        alt="Rep capture QR"
                        className="hidden md:block w-16 h-16 rounded-xl border border-indigo-500/20 shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <Smartphone className="w-3 h-3 text-indigo-400/50" />
                          <p className="text-[9px] font-mono text-[#3F5878] uppercase tracking-[0.2em]">Rep Camera Link</p>
                        </div>
                        <p className="text-[10px] font-mono text-indigo-300/60 truncate">/rep-capture?s={d.sessionId.slice(0, 16)}…</p>
                      </div>
                      <button
                        onClick={() => {
                          const url = `${window.location.origin}/rep-capture?s=${d.sessionId}`;
                          navigator.clipboard.writeText(url);
                          setCopiedSessionId(d.sessionId);
                          setTimeout(() => setCopiedSessionId(null), 2000);
                        }}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 hover:bg-indigo-500/20 active:scale-95 transition-all text-[10px] font-mono shrink-0"
                      >
                        {copiedSessionId === d.sessionId
                          ? <><CheckIcon className="w-3.5 h-3.5" /> Copied!</>
                          : <><Copy className="w-3.5 h-3.5" /> Copy</>
                        }
                      </button>
                    </div>
                  </div>
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
            <div className="p-6 rounded-[28px] bg-white/[0.03] border border-white/[0.08] flex items-center justify-between gap-4">
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-10 h-10 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center shrink-0">
                  <Shield className="w-5 h-5 text-indigo-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-display font-medium text-[#E8EDF8] truncate">{currentRep.name}</p>
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

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h3 className="text-xl font-display font-medium">Field Operatives</h3>
                <p className="text-xs text-[#567090]">Add or manage reps authorized for forensic sessions.</p>
              </div>
              <button 
                onClick={() => setIsAdding(!isAdding)}
                className="flex items-center gap-2 text-xs font-display text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                <UserPlus className="w-4 h-4" />
                Add New Rep
              </button>
            </div>

            {isAdding && (
              <div className="p-6 rounded-[32px] bg-white/[0.03] border border-white/10 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <input 
                    className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-indigo-500/50" 
                    placeholder="Rep Full Name" 
                    value={newRep.name}
                    onChange={(e) => setNewRep({...newRep, name: e.target.value})}
                  />
                  <input 
                    className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-indigo-500/50" 
                    placeholder="Role (e.g. Director)" 
                    value={newRep.role}
                    onChange={(e) => setNewRep({...newRep, role: e.target.value})}
                  />
                </div>
                <div className="flex justify-end gap-3">
                  <button onClick={() => setIsAdding(false)} className="text-xs text-[#567090] px-4">Cancel</button>
                  <button 
                    onClick={() => {
                      saveCustomRep({ id: `custom_${Date.now()}`, name: newRep.name, role: newRep.role, active: true });
                      setIsAdding(false);
                      setNewRep({ name: "", role: "" });
                      setLiveReps(getLiveReps());
                    }}
                    className="bg-indigo-500 text-[#E8EDF8] px-6 py-2 rounded-full text-xs font-medium"
                  >
                    Save Operative
                  </button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 gap-3">
              {liveReps.map((rep) => (
                <div key={rep.id} className="p-5 rounded-[24px] bg-white/[0.02] border border-white/[0.05] flex items-center justify-between group hover:bg-white/[0.04] transition-all">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
                      <User className="w-5 h-5 text-[#567090]" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[#E8EDF8]">{rep.name}</p>
                      <p className="text-[10px] font-mono text-[#3F5878] uppercase tracking-widest">{rep.role}</p>
                    </div>
                  </div>
                  {rep.id.startsWith("custom_") && (
                    <button 
                      onClick={() => { deleteCustomRep(rep.id); setLiveReps(getLiveReps()); }}
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
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around bg-[#0a0f1a]/95 backdrop-blur-xl border-t border-white/[0.08] pb-safe">
        {([
          { id: "dashboard",   label: "Inspect",  icon: LayoutGrid },
          { id: "pipeline",    label: "Pipeline", icon: Activity },
          { id: "schedule",    label: "Schedule", icon: Calendar },
          { id: "centerpoint", label: "CP Inbox", icon: Inbox },
        ] as const).map(tab => (
          <button
            key={tab.id}
            onClick={() => { setView(tab.id); setMoreOpen(false); }}
            className={cn(
              "flex flex-col items-center gap-1 py-3 px-4 min-w-[56px] transition-all active:scale-95",
              view === tab.id ? "text-indigo-400" : "text-[#3F5878]"
            )}
          >
            <tab.icon className={cn("w-5 h-5 transition-all", view === tab.id && "drop-shadow-[0_0_6px_rgba(129,140,248,0.6)]")} />
            <span className="text-[9px] font-mono uppercase tracking-wider">{tab.label}</span>
            {view === tab.id && <span className="absolute bottom-0 w-5 h-0.5 rounded-full bg-indigo-400" />}
          </button>
        ))}
        <button
          onClick={() => setMoreOpen(prev => !prev)}
          className={cn(
            "flex flex-col items-center gap-1 py-3 px-4 min-w-[56px] transition-all active:scale-95 relative",
            moreOpen || ["calendar","tickets","manager"].includes(view) ? "text-indigo-400" : "text-[#3F5878]"
          )}
        >
          <MoreHorizontal className="w-5 h-5" />
          <span className="text-[9px] font-mono uppercase tracking-wider">More</span>
        </button>
      </nav>

      {/* ── Mobile "More" Drawer ───────────────────────────────────────────────── */}
      <AnimatePresence>
        {moreOpen && (
          <>
            <motion.div
              className="md:hidden fixed inset-0 z-30 bg-black/50 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMoreOpen(false)}
            />
            <motion.div
              className="md:hidden fixed bottom-16 left-3 right-3 z-40 rounded-[28px] bg-[#111827] border border-white/[0.1] p-2 overflow-hidden"
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.96 }}
              transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="flex items-center justify-between px-3 py-2 mb-1">
                <p className="text-[9px] font-mono text-[#3F5878] uppercase tracking-[0.2em]">More Sections</p>
                <button onClick={() => setMoreOpen(false)} className="p-1 rounded-lg text-[#3F5878] hover:text-white transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
              {([
                { id: "calendar", label: "Calendar",         icon: CalendarDays, sub: "Day & week view" },
                { id: "tickets",  label: "Hustad Tickets",   icon: CheckCircle2, sub: "Pipeline write-back" },
                { id: "manager",  label: "Manager Dashboard",icon: Activity,     sub: "All-rep activity" },
                { id: "settings", label: "Settings",         icon: Settings,     sub: "Reps & configuration" },
              ] as const).map(item => (
                <button
                  key={item.id}
                  onClick={() => { setView(item.id); setMoreOpen(false); }}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-3 rounded-2xl transition-all active:scale-[0.98] text-left",
                    view === item.id ? "bg-indigo-500/15 text-indigo-300" : "text-[#C2D0E4] hover:bg-white/5"
                  )}
                >
                  <div className={cn("p-2 rounded-xl", view === item.id ? "bg-indigo-500/20" : "bg-white/5")}>
                    <item.icon className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-sm font-display font-medium">{item.label}</p>
                    <p className="text-[10px] font-mono text-[#567090]">{item.sub}</p>
                  </div>
                  {view === item.id && <CheckIcon className="w-4 h-4 ml-auto text-indigo-400" />}
                </button>
              ))}

              {onNewSession && (
                <>
                  <div className="h-px bg-white/[0.06] my-2" />
                  <button
                    onClick={() => { onNewSession(); setMoreOpen(false); }}
                    className="w-full flex items-center gap-3 px-3 py-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 hover:bg-indigo-500/20 transition-all active:scale-[0.98]"
                  >
                    <div className="p-2 rounded-xl bg-indigo-500/20">
                      <PlayCircle className="w-4 h-4" />
                    </div>
                    <p className="text-sm font-display font-medium">New Inspection</p>
                  </button>
                </>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Import confirmation modal */}
      <AnimatePresence>
        {pendingImport && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <motion.div
              className="bg-[#111] border border-white/10 rounded-[32px] p-8 max-w-sm w-full mx-6 space-y-6"
              initial={{ scale: 0.96, opacity: 0, y: 8 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.96, opacity: 0, y: 8 }}
              transition={{ duration: 0.18 }}
            >
              <div className="space-y-1">
                <p className="text-[9px] font-mono text-[#3F5878] uppercase tracking-[0.2em]">Confirm</p>
                <h2 className="text-xl font-display font-medium tracking-tight">Start Inspection?</h2>
                <p className="text-sm text-[#7090B0] font-light">
                  Save this session locally and begin the inspection flow.
                </p>
              </div>
              <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.08] space-y-2">
                <div className="flex items-center gap-2 text-xs font-mono text-[#8BA5C5] uppercase tracking-wider">
                  <LayoutGrid className="w-3.5 h-3.5 text-indigo-400/50 shrink-0" />
                  {pendingImport.address}
                </div>
                {pendingImport.homeownerName && (
                  <div className="flex items-center gap-2 text-xs font-mono text-[#567090] uppercase tracking-wider">
                    <User className="w-3.5 h-3.5 text-indigo-400/50 shrink-0" />
                    {pendingImport.homeownerName}
                  </div>
                )}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleDismissImport}
                  disabled={isConfirming}
                  className="flex-1 py-3 rounded-2xl border border-white/10 text-sm text-[#7090B0] hover:text-[#E8EDF8] hover:border-white/20 font-display transition-all disabled:opacity-40 disabled:pointer-events-none"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmImport}
                  disabled={isConfirming}
                  className="flex-1 py-3 rounded-2xl bg-white text-black text-sm font-display font-medium hover:bg-white/90 transition-all disabled:opacity-60 disabled:pointer-events-none"
                >
                  {isConfirming ? "Starting…" : "Start Inspection"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
