"use client";

import { fetchCenterpointOpportunities, triggerOpportunitiesSync, fetchOpportunitiesSyncStatus, patchCenterpointOpportunity } from "@/lib/api";
import { useState, useEffect, useCallback, useRef } from "react";
import {
  Search, RefreshCw, TrendingUp, ArrowLeft, ChevronRight, AlertCircle, Zap, X, Trash,
  MessageSquare, CheckCircle2, Clock, CalendarDays, Phone, Mail,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

// ─── CP opportunity statuses ───────────────────────────────────────────────────
const STATUSES: Record<string, { label: string; color: string; ring: string; chip: { bg: string; fg: string; dot: string } }> = {
  lead_opened:  { label: "Opened",   color: "bg-[#2563ba]/20 text-[#4a8fd4] border-[#2563ba]/30",  ring: "bg-[#2563ba]",   chip: { bg: "#c5daf4", fg: "#163975", dot: "#2563ba" } },
  lead_pending: { label: "Pending",  color: "bg-[#d6a800]/15 text-[#f0c000] border-[#d6a800]/30",  ring: "bg-[#d97706]",   chip: { bg: "#fef3c7", fg: "#92400e", dot: "#d97706" } },
  lead_quoted:  { label: "Quoted",   color: "bg-[#7C3AED]/15 text-[#a78bfa] border-[#7C3AED]/30",  ring: "bg-[#7C3AED]",   chip: { bg: "#ede9fe", fg: "#4c1d95", dot: "#7C3AED" } },
  lead_sold:    { label: "Accepted", color: "bg-[#2a8a82]/20 text-[#3aada3] border-[#2a8a82]/30",  ring: "bg-[#2a8a82]",   chip: { bg: "#a8d2d0", fg: "#115250", dot: "#2a8a82" } },
  lead_dead:    { label: "Dead",     color: "bg-[var(--bg-subtle)] text-[var(--tx2)] border-[var(--border-color)]", ring: "bg-[var(--border-color)]", chip: { bg: "#f1f5f9", fg: "#64748b", dot: "#94a3b8" } },
};

const STATUS_FILTERS = [
  { id: "",             label: "All" },
  { id: "lead_opened",  label: "Opened" },
  { id: "lead_pending", label: "Pending" },
  { id: "lead_quoted",  label: "Quoted" },
  { id: "lead_sold",    label: "Accepted" },
  { id: "lead_dead",    label: "Dead" },
];

// ─── Real CP workflow stage pipeline ──────────────────────────────────────────
const CP_STAGES = [
  { key: "qualify",      label: "Qualify" },
  { key: "inspection",   label: "Inspection" },
  { key: "quoted",       label: "Quoted" },
  { key: "presentation", label: "Presentation" },
  { key: "pending",      label: "Pending" },
  { key: "accepted",     label: "Accepted" },
];

const NAME_TO_STAGE: Record<string, string> = {
  "qualify": "qualify", "meeting": "qualify",
  "inspection": "inspection",
  "finalize repairs": "quoted", "quote repairs": "quoted",
  "pre-approve replacement": "quoted", "estimate": "quoted",
  "finalize replacement": "quoted", "quote replacement": "quoted",
  "quoted": "quoted",
  "presentation": "presentation",
  "pending": "pending",
  "accepted": "accepted",
};

const STATUS_TO_STAGE: Record<string, string> = {
  lead_opened: "qualify", lead_quoted: "quoted",
  lead_pending: "pending", lead_sold: "accepted",
};

function resolveStageKey(status: string, displayStatus: string, workflowStageName: string | null): string {
  if (workflowStageName) {
    const k = NAME_TO_STAGE[workflowStageName.toLowerCase().trim()];
    if (k) return k;
  }
  const dk = NAME_TO_STAGE[displayStatus.toLowerCase().trim()];
  if (dk) return dk;
  return STATUS_TO_STAGE[status] ?? "qualify";
}

const OPP_TYPE_COLORS: Record<string, { bg: string; fg: string }> = {
  "Service":          { bg: "rgba(37,99,186,0.10)",  fg: "#4a8fd4" },
  "Hail/Wind Claim":  { bg: "rgba(214,168,0,0.10)",  fg: "#f0c000" },
  "Roof Replacement": { bg: "rgba(42,138,130,0.10)", fg: "#3aada3" },
};

// ─── Follow-up time slots ──────────────────────────────────────────────────────
const FU_TIME_SLOTS = [
  { label: "7 AM",  value: "07:00" }, { label: "8 AM",  value: "08:00" },
  { label: "9 AM",  value: "09:00" }, { label: "10 AM", value: "10:00" },
  { label: "11 AM", value: "11:00" }, { label: "12 PM", value: "12:00" },
  { label: "1 PM",  value: "13:00" }, { label: "2 PM",  value: "14:00" },
  { label: "3 PM",  value: "15:00" }, { label: "4 PM",  value: "16:00" },
  { label: "5 PM",  value: "17:00" }, { label: "6 PM",  value: "18:00" },
];

interface CPOpportunity {
  id: string;
  cp_id: string;
  name: string;
  opportunity_type: string | null;
  domain: string | null;
  status: string;
  display_status: string;
  description: string | null;
  billed_company_id: number | null;
  price: number;
  cp_created_at: string | null;
  cp_updated_at: string | null;
  latest_stage_transitioned_at: string | null;
  workflow_stage_name: string | null;
  synced_at: string;
  opp_notes: string | null;
  follow_up_at: string | null;
}

function extractAddress(description: string | null): string {
  if (!description) return "";
  const match = description.match(/at (.+)$/i);
  return match ? match[1].trim() : description;
}

// ─── Activity note helpers ────────────────────────────────────────────────────
function callTimestamp() {
  const now = new Date();
  return now.toLocaleDateString("en-US", { month: "short", day: "numeric" }) + ", " +
    now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
}

function parseNoteEntries(notes: string) {
  if (!notes) return [];
  const entries: { timestamp: string | null; content: string }[] = [];
  let currentTimestamp: string | null = null;
  let currentLines: string[] = [];

  const flush = () => {
    const content = currentLines.join("\n").trim();
    if (content) entries.push({ timestamp: currentTimestamp, content });
    currentLines = [];
    currentTimestamp = null;
  };

  for (const line of notes.split("\n")) {
    const m = line.match(/^\[([^\]]+)\]\s*(.*)/);
    if (m) {
      flush();
      currentTimestamp = m[1];
      if (m[2].trim()) currentLines.push(m[2]);
    } else {
      currentLines.push(line);
    }
  }
  flush();
  return entries;
}

function noteIcon(content: string) {
  if (content.startsWith("Follow-up set")) return { icon: Clock,        color: "text-orange-400 bg-orange-400/10" };
  if (content.startsWith("Email sent"))    return { icon: Mail,         color: "text-[#2563ba] bg-[#2563ba]/10" };
  if (content.startsWith("Called"))        return { icon: Phone,        color: "text-[#3aada3] bg-[#3aada3]/10" };
  return                                          { icon: MessageSquare, color: "text-[#354D6F] bg-white/5" };
}

function fmtFollowUp(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }) +
    " · " + d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
}

function isOverdue(iso: string | null) {
  return iso ? new Date(iso) < new Date() : false;
}

// ─── Activity Log Panel ───────────────────────────────────────────────────────
function ActivityLogPanel({
  opp, onClose, onSaved,
}: {
  opp: CPOpportunity;
  onClose: () => void;
  onSaved: (updated: Partial<CPOpportunity>) => void;
}) {
  const [newNote, setNewNote]     = useState("");
  const [saving, setSaving]       = useState(false);
  const textareaRef               = useRef<HTMLTextAreaElement>(null);
  const entries                   = parseNoteEntries(opp.opp_notes ?? "");

  useEffect(() => { setTimeout(() => textareaRef.current?.focus(), 100); }, []);

  const handleSave = async () => {
    if (!newNote.trim() || saving) return;
    setSaving(true);
    const ts      = callTimestamp();
    const entry   = `[${ts}] ${newNote.trim()}`;
    const merged  = opp.opp_notes ? opp.opp_notes + "\n" + entry : entry;
    try {
      const res = await patchCenterpointOpportunity(opp.cp_id, { opp_notes: merged });
      if (res.ok) {
        onSaved({ opp_notes: merged });
        setNewNote("");
      }
    } finally { setSaving(false); }
  };

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 32, stiffness: 340 }}
        className="fixed right-0 top-0 bottom-0 w-[440px] max-w-full bg-[var(--bg-elevated)] border-l border-[var(--border-color)] z-50 flex flex-col shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-6 border-b border-[var(--border-color)]">
          <div>
            <div className="flex items-center gap-2.5 mb-0.5">
              <MessageSquare className="w-4 h-4 text-[#2563ba]" />
              <h3 className="text-lg font-inter font-medium">Activity Log</h3>
            </div>
            <p className="text-xs text-[var(--tx2)] opacity-60 font-light">
              {extractAddress(opp.description) || opp.name}
            </p>
          </div>
          <button onClick={onClose} className="p-2.5 rounded-2xl text-[var(--tx2)] opacity-60 hover:opacity-100 hover:text-[var(--tx1)] hover:bg-[var(--bg-subtle)] transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Entries */}
        <div className="flex-1 overflow-y-auto px-8 py-6 space-y-3">
          {entries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-12 h-12 rounded-2xl bg-[var(--bg-subtle)] border border-[var(--border-color)] flex items-center justify-center mb-4">
                <MessageSquare className="w-5 h-5 text-[var(--tx2)] opacity-40" />
              </div>
              <p className="text-[var(--tx2)] opacity-60 text-sm font-light">No activity yet</p>
              <p className="text-[var(--tx2)] opacity-40 text-xs mt-1">Add a note below to get started</p>
            </div>
          ) : (
            [...entries].reverse().map((entry, i) => {
              const { icon: EntryIcon, color } = noteIcon(entry.content);
              return (
                <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }} className="flex gap-3"
                >
                  <div className={cn("w-7 h-7 rounded-xl flex items-center justify-center shrink-0 mt-0.5", color)}>
                    <EntryIcon className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1 bg-[var(--bg-subtle)] border border-[var(--border-color)] rounded-2xl px-4 py-3 min-w-0">
                    {entry.timestamp && (
                      <p className="text-[9px] font-mono text-[var(--tx2)] opacity-60 uppercase tracking-widest mb-1.5">{entry.timestamp}</p>
                    )}
                    <p className="text-sm text-[var(--tx1)] font-light leading-relaxed break-words whitespace-pre-wrap">{entry.content}</p>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>

        {/* Input */}
        <div className="px-8 py-6 border-t border-[var(--border-color)] space-y-3">
          <textarea
            ref={textareaRef}
            value={newNote}
            onChange={e => setNewNote(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSave(); }}
            placeholder="Add a note… (⌘↵ to save)"
            rows={3}
            className="w-full bg-[var(--bg-subtle)] border border-[var(--border-color)] rounded-2xl px-4 py-3 text-sm text-[var(--tx1)] placeholder:text-[var(--tx2)] focus:outline-none focus:border-[#2563ba]/40 resize-none leading-relaxed"
          />
          <div className="flex gap-3">
            <button onClick={onClose}
              className="flex-1 py-2.5 rounded-2xl bg-[var(--bg-subtle)] border border-[var(--border-color)] text-[var(--tx2)] opacity-60 hover:opacity-100 hover:text-[var(--tx1)] transition-all text-sm">
              Close
            </button>
            <button onClick={handleSave} disabled={!newNote.trim() || saving}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-2xl bg-[#2563ba]/20 border border-[#2563ba]/30 text-[#4a8fd4] hover:bg-[#2563ba]/30 disabled:opacity-30 disabled:cursor-not-allowed transition-all text-sm font-medium">
              {saving
                ? <><div className="w-3.5 h-3.5 border-2 border-[#2563ba]/30 border-t-[#4a8fd4] rounded-full animate-spin" /> Saving…</>
                : <><CheckCircle2 className="w-3.5 h-3.5" /> Add Note</>}
            </button>
          </div>
        </div>
      </motion.div>
    </>
  );
}

// ─── Follow-up Modal ──────────────────────────────────────────────────────────
function FollowUpModal({
  opp, onClose, onSaved,
}: {
  opp: CPOpportunity;
  onClose: () => void;
  onSaved: (updated: Partial<CPOpportunity>) => void;
}) {
  const today    = new Date().toISOString().split("T")[0];
  const [date, setDate]   = useState(opp.follow_up_at ? new Date(opp.follow_up_at).toISOString().split("T")[0] : today);
  const [time, setTime]   = useState(opp.follow_up_at
    ? `${String(new Date(opp.follow_up_at).getHours()).padStart(2, "0")}:${String(new Date(opp.follow_up_at).getMinutes()).padStart(2, "0")}`
    : "09:00");
  const [saving, setSaving] = useState(false);

  const summary = date
    ? new Date(`${date}T${time}:00`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }) +
      " at " + new Date(`${date}T${time}:00`).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })
    : null;

  const handleConfirm = async () => {
    if (!date || saving) return;
    setSaving(true);
    const iso    = new Date(`${date}T${time}:00`).toISOString();
    const ts     = callTimestamp();
    const entry  = `[${ts}] Follow-up set for ${summary}`;
    const merged = opp.opp_notes ? opp.opp_notes + "\n" + entry : entry;

    try {
      const res = await patchCenterpointOpportunity(opp.cp_id, { follow_up_at: iso, opp_notes: merged });
      if (res.ok) {
        onSaved({ follow_up_at: iso, opp_notes: merged });
        onClose();
      }
    } finally { setSaving(false); }
  };

  const handleClear = async () => {
    setSaving(true);
    try {
      const res = await patchCenterpointOpportunity(opp.cp_id, { follow_up_at: null });
      if (res.ok) {
        onSaved({ follow_up_at: null });
        onClose();
      }
    } finally { setSaving(false); }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4"
    >
      <motion.div initial={{ opacity: 0, scale: 0.96, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }} transition={{ type: "spring", damping: 28, stiffness: 320 }}
        className="bg-[var(--bg-elevated)] border border-[var(--border-color)] rounded-3xl p-8 w-full max-w-md shadow-2xl"
      >
        <div className="flex items-start justify-between mb-7">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <CalendarDays className="w-5 h-5 text-orange-400" />
              <h3 className="text-xl font-inter font-medium">Schedule Follow-up</h3>
            </div>
            <p className="text-sm text-[var(--tx2)] opacity-60 font-light">
              {extractAddress(opp.description) || opp.name}
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-2xl text-[var(--tx2)] opacity-60 hover:opacity-100 hover:text-[var(--tx1)] hover:bg-[var(--bg-subtle)] transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="mb-6">
          <label className="text-[9px] font-mono text-[var(--tx2)] opacity-60 uppercase tracking-widest block mb-2">Date</label>
          <input type="date" value={date} min={today}
            onChange={e => setDate(e.target.value)}
            className="w-full bg-[var(--bg-subtle)] border border-[var(--border-color)] rounded-2xl px-4 py-3 text-[var(--tx1)] text-sm focus:outline-none focus:border-orange-400/50 [color-scheme:light] dark:[color-scheme:dark]"
          />
        </div>

        <div className="mb-7">
          <label className="text-[9px] font-mono text-[var(--tx2)] opacity-60 uppercase tracking-widest block mb-2.5">Time</label>
          <div className="grid grid-cols-4 gap-2">
            {FU_TIME_SLOTS.map(slot => (
              <button key={slot.value} onClick={() => setTime(slot.value)}
                className={cn("py-2.5 rounded-xl text-xs font-medium transition-all",
                  time === slot.value
                    ? "bg-orange-500/20 border border-orange-500/40 text-orange-300"
                    : "bg-[var(--bg-subtle)] text-[var(--tx2)] opacity-60 hover:bg-[var(--bg-elevated)] hover:opacity-100"
                )}>{slot.label}</button>
            ))}
          </div>
        </div>

        {summary && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="flex items-center gap-3 bg-orange-500/[0.08] border border-orange-500/15 rounded-2xl px-4 py-3 mb-6"
          >
            <Clock className="w-4 h-4 text-orange-400 shrink-0" />
            <p className="text-sm text-orange-300 font-medium">{summary}</p>
          </motion.div>
        )}

        <div className="flex gap-3">
          {opp.follow_up_at && (
            <button onClick={handleClear} disabled={saving}
              className="px-4 py-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20 disabled:opacity-30 transition-all text-sm">
              Clear
            </button>
          )}
          <button onClick={onClose}
            className="flex-1 py-3 rounded-2xl bg-[var(--bg-subtle)] border border-[var(--border-color)] text-[var(--tx2)] opacity-60 hover:opacity-100 hover:text-[var(--tx1)] transition-all text-sm">
            Cancel
          </button>
          <button onClick={handleConfirm} disabled={!date || saving}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-orange-500/20 border border-orange-500/30 text-orange-300 hover:bg-orange-500/30 disabled:opacity-30 disabled:cursor-not-allowed transition-all text-sm font-medium"
          >
            {saving
              ? <><div className="w-3.5 h-3.5 border-2 border-orange-400/30 border-t-orange-300 rounded-full animate-spin" /> Saving…</>
              : <><ChevronRight className="w-4 h-4" /> Confirm</>}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function CenterPointOpportunities() {
  const [opps, setOpps]               = useState<CPOpportunity[]>([]);
  const [loading, setLoading]         = useState(true);
  const [refreshing, setRefreshing]   = useState(false);
  const [syncing, setSyncing]         = useState(false);
  const [syncResult, setSyncResult]   = useState<string | null>(null);
  const [totalCached, setTotalCached] = useState(0);
  const [total, setTotal]             = useState(0);
  const [page, setPage]               = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch]           = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [expandedId, setExpandedId]   = useState<string | null>(null);

  // ── Activity log + follow-up state ─────────────────────────────────────────
  const [activityOpp, setActivityOpp]   = useState<CPOpportunity | null>(null);
  const [followUpOpp, setFollowUpOpp]   = useState<CPOpportunity | null>(null);

  const patchLocal = (cpId: string, updates: Partial<CPOpportunity>) => {
    setOpps(prev => prev.map(o => o.cp_id === cpId ? { ...o, ...updates } : o));
    setActivityOpp(prev => prev?.cp_id === cpId ? { ...prev, ...updates } : prev);
  };

  const fetchOpps = useCallback(async (opts?: { refresh?: boolean; newPage?: number }) => {
    const isRefresh  = opts?.refresh;
    const targetPage = opts?.newPage ?? page;
    const isInitial  = targetPage === 1;
    if (isRefresh) setRefreshing(true); else if (isInitial) setLoading(true);

    try {
      const params: Record<string, string> = { page: String(targetPage), size: "25" };
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;

      const res = await fetchCenterpointOpportunities(params);
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const data = await res.json();

      if (data?.data) {
        if (isInitial) setOpps(data.data);
        else setOpps(prev => [...prev, ...data.data]);
        setTotal(data.meta?.total ?? 0);
      }
    } catch { /* non-fatal */ }
    finally { setLoading(false); setRefreshing(false); }
  }, [search, statusFilter, page]);

  const fetchCount = useCallback(async () => {
    try {
      const res = await fetchOpportunitiesSyncStatus();
      const data = await res.json();
      setTotalCached(data.total_cached ?? 0);
    } catch {}
  }, []);

  const handleSync = async () => {
    setSyncing(true); setSyncResult(null);
    try {
      const res  = await triggerOpportunitiesSync();
      const data = await res.json();
      if (data.ok) {
        const parts = [];
        if (data.discovered > 0) parts.push(`${data.discovered} discovered`);
        if (data.refreshed  > 0) parts.push(`${data.refreshed} refreshed`);
        setSyncResult(parts.length ? parts.join(" · ") : "Up to date");
        setTimeout(() => { setOpps([]); fetchOpps({ refresh: true, newPage: 1 }); fetchCount(); }, 400);
      } else {
        setSyncResult(`Error: ${data.error}`);
      }
    } catch (e: any) { setSyncResult(`Error: ${e.message}`); }
    finally { setSyncing(false); }
  };

  useEffect(() => { fetchCount(); }, [fetchCount]);
  useEffect(() => { setPage(1); fetchOpps({ newPage: 1 }); }, [search, statusFilter]);

  const stageIndex = (key: string) => CP_STAGES.findIndex(s => s.key === key);

  const handleDelete = async (cpId: string) => {
    if (!confirm("Are you sure you want to delete this opportunity? This will remove it from the tablet cache.")) return;
    try {
      const res = await fetch(`/api/centerpoint/opportunities/${cpId}`, { method: "DELETE" });
      if (res.ok) {
        setOpps(prev => prev.filter(o => o.cp_id !== cpId));
        setTotal(prev => prev - 1);
      } else {
        alert("Failed to delete opportunity");
      }
    } catch (e: any) {
      alert(`Error: ${e.message}`);
    }
  };

  return (
    <div className="flex flex-col h-full">

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="p-8 pb-0 space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => window.dispatchEvent(new CustomEvent("changeView", { detail: "dashboard" }))}
              className="p-3 rounded-[14px] bg-[var(--bg-subtle)] border border-[var(--border-color)] hover:bg-[var(--tx1)] hover:text-[var(--bg-base)] transition-all"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h2 className="text-2xl font-inter font-medium tracking-tight">Opportunities</h2>
              <p className="text-sm text-[var(--tx2)] opacity-60 mt-1">
                {total.toLocaleString()} opportunities
                {totalCached > 0 && ` · ${totalCached.toLocaleString()} cached`}
                {syncResult && (
                  <span className="ml-2 text-[10px] font-mono text-[#7C3AED]/70">{syncResult}</span>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSync}
              disabled={syncing}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-[14px] border text-xs font-inter transition-all",
                syncing
                  ? "bg-[#7C3AED]/10 border-[#7C3AED]/20 text-[#7C3AED]/50 cursor-not-allowed"
                  : "bg-[#7C3AED]/10 border-[#7C3AED]/20 text-[#a78bfa] hover:bg-[#7C3AED]/20"
              )}
            >
              <Zap className={cn("w-3.5 h-3.5", syncing && "animate-pulse")} />
              {syncing ? "Refreshing…" : "Refresh Status"}
            </button>
            <button
              onClick={() => fetchOpps({ refresh: true, newPage: 1 })}
              className={cn("p-3 bg-[var(--bg-subtle)] border border-[var(--border-color)] rounded-[14px] hover:bg-[var(--bg-elevated)] transition-all", refreshing && "animate-spin")}
            >
              <RefreshCw className="w-4 h-4 text-[var(--tx2)] opacity-60" />
            </button>
          </div>
        </div>

        {/* Search */}
        <form onSubmit={e => { e.preventDefault(); setSearch(searchInput); }} className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--tx2)] opacity-60" />
          <input
            type="text"
            placeholder="Search by job number or address..."
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            className="w-full bg-[var(--bg-subtle)] border border-[var(--border-color)] text-[var(--tx1)] rounded-2xl py-3.5 pl-12 pr-32 text-sm outline-none focus:border-[#7C3AED]/50 transition-all"
          />
          <button
            type="submit"
            className="absolute right-3 top-1/2 -translate-y-1/2 px-4 py-1.5 bg-[#7C3AED]/20 border border-[#7C3AED]/30 rounded-xl text-xs text-[#a78bfa] hover:bg-[#7C3AED]/30 transition-all"
          >
            Search
          </button>
        </form>

        {/* Status filter chips */}
        <div className="flex items-center gap-3 overflow-x-auto pb-1">
          <span className="text-[10px] font-mono text-[var(--tx2)] opacity-60 uppercase tracking-widest shrink-0">Stage</span>
          {STATUS_FILTERS.map(f => (
            <button
              key={f.id}
              onClick={() => setStatusFilter(f.id)}
              className={cn(
                "px-4 py-2 rounded-lg border text-xs font-inter transition-all whitespace-nowrap shrink-0",
                statusFilter === f.id
                  ? "bg-[var(--tx1)] text-[var(--bg-base)] border-[var(--tx1)]"
                  : "bg-[var(--bg-subtle)] border-[var(--border-color)] text-[var(--tx2)] opacity-60 hover:opacity-100 hover:bg-[var(--bg-elevated)]"
              )}
            >{f.label}</button>
          ))}
        </div>
      </div>

      {/* ── Opportunity list ──────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-8 space-y-3">
        {loading ? (
          <div className="py-20 flex flex-col items-center gap-4 opacity-40">
            <div className="w-8 h-8 border-2 border-[var(--border-color)] border-t-[var(--tx2)] rounded-full animate-spin" />
            <p className="text-sm font-mono text-[var(--tx2)] opacity-60">Loading opportunities…</p>
          </div>
        ) : opps.length === 0 ? (
          <div className="py-20 text-center opacity-30">
            <TrendingUp className="w-12 h-12 mx-auto mb-4" />
            <p className="font-inter">No opportunities yet</p>
            <p className="text-xs text-[var(--tx2)] opacity-60 mt-2">Complete a session to create an opportunity in CenterPoint</p>
          </div>
        ) : (
          <>
            {opps.map(opp => {
              const stageKey   = resolveStageKey(opp.status, opp.display_status, opp.workflow_stage_name ?? null);

              let statusKey = opp.status;
              if (stageKey === "quoted" || stageKey === "presentation") statusKey = "lead_quoted";
              else if (stageKey === "pending") statusKey = "lead_pending";
              else if (stageKey === "accepted") statusKey = "lead_sold";
              else if (stageKey === "qualify" || stageKey === "inspection") statusKey = "lead_opened";

              const status     = STATUSES[statusKey] ?? STATUSES["lead_opened"];
              const isDead     = opp.status === "lead_dead";
              const currentIdx = stageIndex(stageKey);
              const isExpanded = expandedId === opp.id;
              const address    = extractAddress(opp.description);
              const typeColors = OPP_TYPE_COLORS[opp.opportunity_type ?? ""] ?? { bg: "rgba(255,255,255,0.04)", fg: "#567090" };
              const hasFollowUp = !!opp.follow_up_at;
              const overdue     = isOverdue(opp.follow_up_at);
              const noteCount   = parseNoteEntries(opp.opp_notes ?? "").length;

              return (
                <motion.div
                  key={opp.id}
                  layout
                  className="rounded-2xl bg-[var(--bg-subtle)] border border-[var(--border-color)] hover:bg-[var(--bg-elevated)] transition-all overflow-hidden"
                >
                  {/* ── Row ───────────────────────────────────────────────── */}
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : opp.id)}
                    className="w-full p-6 text-left flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-5 min-w-0">
                      {/* Coloured dot */}
                      <div className={cn("w-2.5 h-2.5 rounded-full shrink-0", status.ring)} />

                      <div className="min-w-0">
                        <div className="flex items-center gap-3 mb-1 flex-wrap">
                          <span className="text-base font-inter font-medium text-[var(--tx1)] truncate">
                            {address || opp.name}
                          </span>
                          <span className="text-[9px] font-mono text-[var(--tx2)] opacity-60 tracking-widest">#{opp.name}</span>
                        </div>
                        <div className="flex items-center gap-3 flex-wrap">
                          {/* Stage badge */}
                          <span className={cn("px-2.5 py-0.5 rounded-lg text-[9px] font-mono uppercase tracking-widest border", status.color)}>
                            {opp.workflow_stage_name || opp.display_status || status.label}
                          </span>
                          {/* Opportunity type tag */}
                          {opp.opportunity_type && (
                            <span
                              className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-mono uppercase tracking-wider"
                              style={{ background: typeColors.bg, color: typeColors.fg }}
                            >
                              {opp.opportunity_type}
                            </span>
                          )}
                          {/* Follow-up badge */}
                          {hasFollowUp && (
                            <span className={cn(
                              "inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[9px] font-mono border",
                              overdue
                                ? "bg-rose-500/10 border-rose-500/20 text-rose-400"
                                : "bg-orange-500/10 border-orange-500/20 text-orange-400"
                            )}>
                              <Clock className="w-2.5 h-2.5" />
                              {overdue ? "Overdue · " : ""}{fmtFollowUp(opp.follow_up_at!)}
                            </span>
                          )}
                          {/* Note count badge */}
                          {noteCount > 0 && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[9px] font-mono bg-[#2563ba]/10 border border-[#2563ba]/20 text-[#4a8fd4]">
                              <MessageSquare className="w-2.5 h-2.5" />
                              {noteCount}
                            </span>
                          )}
                          {/* Last updated */}
                          {opp.cp_updated_at ? (
                            <span className="text-[10px] font-mono text-[var(--tx2)] opacity-60">
                              Updated {new Date(opp.cp_updated_at).toLocaleDateString()}
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-[10px] font-mono text-amber-500/50">
                              <AlertCircle className="w-3 h-3" /> Not yet synced
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-6 shrink-0">
                      {opp.price > 0 && (
                        <div className="text-right hidden md:block">
                          <p className="text-[9px] font-mono text-[var(--tx2)] opacity-40 uppercase tracking-widest mb-0.5">Value</p>
                          <p
                            className="text-sm font-inter font-medium text-[var(--tx1)]"
                            style={{ fontFeatureSettings: '"ss01" 1, "tnum" 1', letterSpacing: "-0.42px" }}
                          >
                            ${opp.price.toLocaleString()}
                          </p>
                        </div>
                      )}
                      <ChevronRight className={cn("w-4 h-4 text-[var(--tx2)] opacity-40 transition-transform duration-200", isExpanded && "rotate-90")} />
                    </div>
                  </button>

                  {/* ── Expanded detail ────────────────────────────────────── */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="px-6 pb-6 space-y-6 border-t border-[var(--border-color)] pt-5">

                          {/* Stage pipeline */}
                          {isDead ? (
                            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--bg-subtle)] border border-[var(--border-color)] w-fit">
                              <X className="w-3.5 h-3.5 text-[var(--tx2)] opacity-60" />
                              <span className="text-[10px] font-mono text-[var(--tx2)] opacity-60 uppercase tracking-widest">Lead Dead — no further action</span>
                            </div>
                          ) : (
                            <div>
                              <p className="text-[9px] font-mono text-[var(--tx2)] opacity-60 uppercase tracking-widest mb-3">Pipeline</p>
                              <div className="flex items-center gap-1 overflow-x-auto pb-2">
                                {CP_STAGES.map((s, i) => {
                                  const isPast    = i < currentIdx;
                                  const isCurrent = i === currentIdx;
                                  const activeColor =
                                    s.key === "accepted"    ? "bg-[#2a8a82]/20 text-[#3aada3] border-[#2a8a82]/30" :
                                    s.key === "pending"     ? "bg-[#d6a800]/15 text-[#f0c000] border-[#d6a800]/30" :
                                    s.key === "quoted"      ? "bg-[#7C3AED]/15 text-[#a78bfa] border-[#7C3AED]/30" :
                                    s.key === "presentation"? "bg-sky-500/15 text-sky-300 border-sky-500/25" :
                                                              "bg-[#2563ba]/20 text-[#4a8fd4] border-[#2563ba]/30";
                                  return (
                                    <div key={s.key} className="flex items-center gap-1 shrink-0">
                                      <div className={cn(
                                        "px-3 py-1.5 rounded-lg text-[9px] font-mono uppercase tracking-widest border transition-all",
                                        isCurrent ? activeColor + " ring-1 ring-white/20" :
                                        isPast    ? "bg-[var(--bg-subtle)] text-[var(--tx2)] opacity-40 border-[var(--border-color)]" :
                                                    "bg-transparent text-[var(--tx2)] opacity-30 border-[var(--border-color)]"
                                      )}>
                                        {s.label}
                                      </div>
                                      {i < CP_STAGES.length - 1 && (
                                        <div className={cn("w-4 h-[1px]", isPast ? "bg-[var(--border-color)]" : "bg-[var(--border-color)] opacity-40")} />
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* Follow-up banner (if set) */}
                          {opp.follow_up_at && (
                            <div className={cn(
                              "flex items-center gap-3 px-4 py-3 rounded-2xl border",
                              overdue
                                ? "bg-rose-500/[0.06] border-rose-500/20"
                                : "bg-orange-500/[0.06] border-orange-500/15"
                            )}>
                              <Clock className={cn("w-4 h-4 shrink-0", overdue ? "text-rose-400" : "text-orange-400")} />
                              <div className="flex-1 min-w-0">
                                <p className={cn("text-[9px] font-mono uppercase tracking-widest mb-0.5", overdue ? "text-rose-400/60" : "text-orange-400/60")}>
                                  {overdue ? "Overdue Follow-up" : "Scheduled Follow-up"}
                                </p>
                                <p className={cn("text-sm font-medium", overdue ? "text-rose-300" : "text-orange-300")}>
                                  {fmtFollowUp(opp.follow_up_at)}
                                </p>
                              </div>
                              <button
                                onClick={(e) => { e.stopPropagation(); setFollowUpOpp(opp); }}
                                className={cn("text-[10px] font-mono uppercase tracking-widest transition-colors", overdue ? "text-rose-400/60 hover:text-rose-300" : "text-orange-400/60 hover:text-orange-300")}
                              >
                                Edit
                              </button>
                            </div>
                          )}

                          {/* Meta grid */}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {[
                              { label: "Job #",        value: opp.name },
                              { label: "Type",         value: opp.opportunity_type ?? "—" },
                              { label: "CP Stage",     value: opp.workflow_stage_name ?? (opp.display_status || "—") },
                              { label: "Status",       value: opp.display_status || "—" },
                              { label: "Price",        value: opp.price > 0 ? `$${opp.price.toLocaleString()}` : "—", isMoney: opp.price > 0 },
                              { label: "Last Updated", value: opp.cp_updated_at ? new Date(opp.cp_updated_at).toLocaleDateString() : "—" },
                              { label: "Created",      value: opp.cp_created_at ? new Date(opp.cp_created_at).toLocaleDateString() : "—" },
                              { label: "CP ID",        value: opp.cp_id },
                            ].map((item: { label: string; value: string; isMoney?: boolean }) => (
                              <div key={item.label} className="space-y-1">
                                <p className="text-[9px] font-mono text-[var(--tx2)] opacity-60 uppercase tracking-widest">{item.label}</p>
                                <p
                                  className="text-xs text-[var(--tx1)] font-inter"
                                  style={item.isMoney ? { fontFeatureSettings: '"ss01" 1, "tnum" 1', letterSpacing: "-0.39px" } : undefined}
                                >
                                  {item.value}
                                </p>
                              </div>
                            ))}
                          </div>

                          {/* Description */}
                          {opp.description && (
                            <div>
                              <p className="text-[9px] font-mono text-[var(--tx2)] opacity-60 uppercase tracking-widest mb-2">Description</p>
                              <p className="text-sm text-[var(--tx2)] opacity-60 font-inter">{opp.description}</p>
                            </div>
                          )}

                          {/* Actions */}
                          <div className="flex items-center gap-2 pt-2 border-t border-[var(--border-color)] flex-wrap">
                            <button
                              onClick={() => window.dispatchEvent(new CustomEvent("changeView", { detail: "centerpoint" }))}
                              className="flex items-center gap-2 px-5 py-2.5 rounded-[14px] bg-[var(--bg-subtle)] border border-[var(--border-color)] text-[var(--tx2)] opacity-60 text-xs font-inter hover:bg-[var(--bg-elevated)] hover:opacity-100 hover:text-[var(--tx1)] active:scale-95 transition-all"
                            >
                              View Service Job in CP Inbox
                            </button>

                            {/* Activity Log button */}
                            <button
                              onClick={(e) => { e.stopPropagation(); setActivityOpp(opp); }}
                              className="flex items-center gap-2 px-5 py-2.5 rounded-[14px] bg-[#2563ba]/10 border border-[#2563ba]/20 text-[#4a8fd4] text-xs font-inter hover:bg-[#2563ba]/20 active:scale-95 transition-all"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                              Activity{noteCount > 0 ? ` (${noteCount})` : ""}
                            </button>

                            {/* Follow-up button */}
                            <button
                              onClick={(e) => { e.stopPropagation(); setFollowUpOpp(opp); }}
                              className={cn(
                                "flex items-center gap-2 px-5 py-2.5 rounded-[14px] text-xs font-inter border active:scale-95 transition-all",
                                hasFollowUp && overdue
                                  ? "bg-rose-500/10 border-rose-500/20 text-rose-400 hover:bg-rose-500/20"
                                  : hasFollowUp
                                  ? "bg-orange-500/10 border-orange-500/20 text-orange-400 hover:bg-orange-500/20"
                                  : "bg-orange-500/10 border-orange-500/20 text-orange-400 hover:bg-orange-500/20"
                              )}
                            >
                              <Clock className="w-3.5 h-3.5" />
                              {hasFollowUp ? "Edit Follow-up" : "Schedule Follow-up"}
                            </button>

                            <div className="ml-auto">
                              <button
                                onClick={(e) => { e.stopPropagation(); handleDelete(opp.cp_id); }}
                                className="flex items-center gap-2 px-4 py-2.5 rounded-[14px] bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-inter hover:bg-rose-500/20 active:scale-95 transition-all"
                              >
                                <Trash className="w-4 h-4" />
                                Force Delete
                              </button>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}

            {opps.length < total && (
              <button
                onClick={() => { const next = page + 1; setPage(next); fetchOpps({ newPage: next }); }}
                className="w-full py-4 rounded-2xl border border-[var(--border-color)] text-[var(--tx2)] opacity-60 text-sm font-inter hover:bg-[var(--bg-subtle)] hover:opacity-100 hover:text-[var(--tx1)] transition-all"
              >
                Load more · {(total - opps.length).toLocaleString()} remaining
              </button>
            )}
          </>
        )}
      </div>

      {/* ── Activity Log Panel ────────────────────────────────────────────── */}
      <AnimatePresence>
        {activityOpp && (
          <ActivityLogPanel
            opp={activityOpp}
            onClose={() => setActivityOpp(null)}
            onSaved={(updates) => patchLocal(activityOpp.cp_id, updates)}
          />
        )}
      </AnimatePresence>

      {/* ── Follow-up Modal ───────────────────────────────────────────────── */}
      <AnimatePresence>
        {followUpOpp && (
          <FollowUpModal
            opp={followUpOpp}
            onClose={() => setFollowUpOpp(null)}
            onSaved={(updates) => { patchLocal(followUpOpp.cp_id, updates); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
