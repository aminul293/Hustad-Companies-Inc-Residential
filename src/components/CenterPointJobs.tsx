"use client";

import { fetchCenterpointJobs, fetchCenterpointSyncStatus, triggerCenterpointSync, patchCenterpointJob, createPipelineLead, unlinkPipelineByTicket, assignLeadByJob, unassignLead, fetchCurrentUser, fetchReps, fetchLeads } from "@/lib/api";
import { useState, useEffect, useCallback } from "react";
import { Search, ChevronRight, RefreshCw, Building2, ArrowRight, CloudDownload, CheckCircle2, ArrowLeft, X, UserPlus, User, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

// ─── Stage pipeline ────────────────────────────────────────────────────────────
// Stripi-style chip config: bg/fg match Stripi semantic tokens; dot is a colored indicator
const STAGES: Record<string, {
  label: string;
  next: string | null;
  color: string;
  ring: string;
  chip: { bg: string; fg: string; dot: string };
}> = {
  new_service: { label: "New Service", next: "accepted", color: "bg-sky-500/20 text-sky-300 border-sky-500/30", ring: "bg-sky-400", chip: { bg: "#d0e4f7", fg: "#1e4d8c", dot: "#2563ba" } },
  accepted: { label: "Accepted", next: "scheduled", color: "bg-[#2563ba]/20 text-[#4a8fd4] border-[#2563ba]/30", ring: "bg-[#2563ba]", chip: { bg: "#c5daf4", fg: "#163975", dot: "#2563ba" } },
  scheduled: { label: "Scheduled", next: "started", color: "bg-[#1e4d8c]/25 text-[#4a8fd4] border-[#1e4d8c]/35", ring: "bg-[#1e4d8c]", chip: { bg: "#b9d0ef", fg: "#123068", dot: "#1e4d8c" } },
  started: { label: "In Progress", next: "completed", color: "bg-[#2a8a82]/20 text-[#3aada3] border-[#2a8a82]/30", ring: "bg-[#2a8a82]", chip: { bg: "#b8d9d7", fg: "#165955", dot: "#2a8a82" } },
  completed: { label: "Completed", next: "closed", color: "bg-[#2a8a82]/25 text-[#3aada3] border-[#2a8a82]/35", ring: "bg-[#3aada3]", chip: { bg: "#a8d2d0", fg: "#115250", dot: "#2a8a82" } },
  closed: { label: "Closed Out", next: null, color: "bg-white/10 text-[#567090] border-white/10", ring: "bg-white/30", chip: { bg: "#f6f9fc", fg: "#64748d", dot: "#94a3b8" } },
};

const STAGE_ORDER = ["new_service", "accepted", "scheduled", "started", "completed", "closed"];

const STATUS_FILTERS = [
  { id: "all", label: "All Stages" },
  { id: "new_service", label: "New Service" },
  { id: "accepted", label: "Accepted" },
  { id: "scheduled", label: "Scheduled" },
  { id: "started", label: "In Progress" },
  { id: "completed", label: "Completed" },
  { id: "closed", label: "Closed Out" },
];

interface CPJob {
  id: string;
  inbox_status: string;
  promotedAt: string | null;
  promotedTicketId: string | null;
  cpAdditionalManagers: string | null;
  attributes: {
    name: string;
    propertyName: string | null;
    opportunityType: string | null;
    workType: string | null;
    domain: string;
    status: string;
    displayStatus: string;
    price: number;
    startDate: string | null;
    createdAt: string;
    updatedAt: string;
    latestStageTransitionedAt: string | null;
    custom: { description: string | null };
    customWithLabels: { serviceTypeHustad: string | null };
  };
}

interface SyncStatus {
  lastSync: string | null;
  totalCached: number;
  syncing: boolean;
  result: string | null;
}

export function CenterPointJobs() {
  const [jobs, setJobs] = useState<CPJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [totalJobs, setTotalJobs] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [transitioningId, setTransitioningId] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    lastSync: null,
    totalCached: 0,
    syncing: false,
    result: null,
  });
  const [promotingId, setPromotingId] = useState<string | null>(null);
  const [unlinkingId, setUnlinkingId] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [stagePickerJobId, setStagePickerJobId] = useState<string | null>(null);

  // Role-aware assign-rep state
  const [userRole, setUserRole] = useState<string | null>(null);
  const [reps, setReps] = useState<{ id: string; name: string; email: string }[]>([]);
  const [assigningJobId, setAssigningJobId] = useState<string | null>(null);
  const [savingAssignId, setSavingAssignId] = useState<string | null>(null);
  const [unassigningId, setUnassigningId] = useState<string | null>(null);
  const [jobAssignments, setJobAssignments] = useState<Record<string, string>>({}); // cpcTicketId → repId

  const fetchJobs = useCallback(async (opts?: { refresh?: boolean; newPage?: number }) => {
    const isRefresh = opts?.refresh;
    const targetPage = opts?.newPage ?? page;
    const isInitial = targetPage === 1;

    if (isRefresh) setRefreshing(true); else if (isInitial) setLoading(true);

    try {
      const params = new URLSearchParams({ page: String(targetPage) });
      if (search) params.set("search", search);
      if (statusFilter && statusFilter !== "all") params.set("status", statusFilter);

      const res = await fetchCenterpointJobs(Object.fromEntries(params.entries()));
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Server responded with status ${res.status}`);
      }

      const data = await res.json();

      if (data?.data) {
        if (isInitial) {
          setJobs(data.data);
        } else {
          setJobs(prev => [...prev, ...data.data]);
        }
        setTotalJobs(data.meta?.page?.total ?? 0);
      }
    } catch (e: any) {
      /* non-fatal */
      // We could set an error state here if needed
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [search, statusFilter, page]);

  const fetchSyncStatus = useCallback(async () => {
    try {
      const res = await fetchCenterpointSyncStatus();
      const data = await res.json();
      const lastCompleted = (data.logs ?? []).find((l: any) => l.status === "completed");
      setSyncStatus(prev => ({
        ...prev,
        lastSync: lastCompleted?.completed_at ?? null,
        totalCached: data.total_cached ?? 0,
      }));
    } catch { }
  }, []);

  const handleSync = async () => {
    setSyncStatus(prev => ({ ...prev, syncing: true, result: null }));
    try {
      const res = await triggerCenterpointSync();
      const data = await res.json();
      if (data.ok) {
        setSyncStatus(prev => ({
          ...prev,
          syncing: false,
          result: `Synced ${data.upserted} jobs`,
          lastSync: new Date().toISOString(),
        }));
        // Refresh the list from Supabase
        // Clear current list to force a clean re-render
        setJobs([]);
        // Wait 800ms for DB to settle, then refresh
        setTimeout(() => {
          fetchJobs({ refresh: true, newPage: 1 });
          fetchSyncStatus();
        }, 800);
      } else {
        setSyncStatus(prev => ({ ...prev, syncing: false, result: `Error: ${data.error}` }));
      }
    } catch (e: any) {
      setSyncStatus(prev => ({ ...prev, syncing: false, result: `Error: ${e.message}` }));
    }
  };

  useEffect(() => {
    fetchSyncStatus();
  }, [fetchSyncStatus]);

  useEffect(() => {
    setPage(1);
    fetchJobs({ newPage: 1 });
  }, [search, statusFilter]);

  useEffect(() => {
    (async () => {
      const me = await fetchCurrentUser();
      if (!me) return;
      setUserRole(me.role);
      if (me.role === "manager") {
        const [repsRes, leads] = await Promise.all([fetchReps(), fetchLeads()]);
        if (repsRes.ok) {
          const json = await repsRes.json();
          setReps(json.reps ?? []);
        }
        const existing: Record<string, string> = {};
        for (const lead of leads) {
          if (lead.cpc_ticket_id && lead.assigned_rep_id) {
            existing[lead.cpc_ticket_id] = lead.assigned_rep_id;
          }
        }
        setJobAssignments(existing);
      }
    })();
  }, []);

  const handleAssignRep = async (cpcTicketId: string, repId: string) => {
    setSavingAssignId(cpcTicketId);
    try {
      const res = await assignLeadByJob(cpcTicketId, repId);
      if (res.ok) {
        setJobAssignments(prev => ({ ...prev, [cpcTicketId]: repId }));
        setAssigningJobId(null);
      } else {
        const err = await res.json().catch(() => ({}));
        setImportError(err.error || "Failed to assign rep. Please try again.");
        setTimeout(() => setImportError(null), 6000);
      }
    } finally {
      setSavingAssignId(null);
    }
  };

  const handleUnassignRep = async (cpcTicketId: string) => {
    setUnassigningId(cpcTicketId);
    try {
      const res = await unassignLead(cpcTicketId);
      if (res.ok) {
        setJobAssignments(prev => {
          const next = { ...prev };
          delete next[cpcTicketId];
          return next;
        });
      } else {
        const err = await res.json().catch(() => ({}));
        setImportError(err.error || "Failed to unassign rep. Please try again.");
        setTimeout(() => setImportError(null), 6000);
      }
    } finally {
      setUnassigningId(null);
    }
  };

  const isManager = userRole === "manager";

  const parseCpManagers = (raw: string | null | undefined): string[] => {
    if (!raw) return [];
    try { return JSON.parse(raw); } catch { return []; }
  };

  // Returns the rep ID for the first CP Additional Manager that matches our reps list.
  const getCpRepId = (job: CPJob): string | null => {
    const names = parseCpManagers(job.cpAdditionalManagers);
    for (const name of names) {
      const lower = name.toLowerCase();
      const match = reps.find(r =>
        r.name.toLowerCase() === lower ||
        r.name.toLowerCase().includes(lower) ||
        lower.includes(r.name.toLowerCase())
      );
      if (match) return match.id;
    }
    return null;
  };

  const handleLoadMore = () => {
    const next = page + 1;
    setPage(next);
    fetchJobs({ newPage: next });
  };

  const handleStageTransition = async (job: CPJob, nextStatus: string) => {
    setTransitioningId(job.id);
    try {
      const res = await patchCenterpointJob(job.id, { status: nextStatus });

      if (res.ok) {
        setJobs(prev => prev.map(j =>
          j.id === job.id
            ? { ...j, attributes: { ...j.attributes, status: nextStatus, displayStatus: STAGES[nextStatus]?.label ?? nextStatus } }
            : j
        ));
      }
    } catch (e) {
      /* non-fatal */
    } finally {
      setTransitioningId(null);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
  };

  const stageIndex = (status: string) => {
    const s = status.toLowerCase().replace(/\s+/g, "_");
    const idx = STAGE_ORDER.indexOf(s);
    if (idx !== -1) return idx;
    // Handle aliases
    if (s === "closed_out") return STAGE_ORDER.indexOf("closed");
    if (s === "opened") return STAGE_ORDER.indexOf("accepted");
    return -1;
  };

  return (
    <div className="flex flex-col h-full">
      {/* Import error banner */}
      <AnimatePresence>
        {importError && (
          <motion.div
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="flex items-center justify-between gap-3 px-6 py-3 bg-rose-500/10 border-b border-rose-500/20 text-rose-300 text-xs font-mono"
          >
            <span className="flex items-center gap-2">
              <X className="w-3.5 h-3.5 shrink-0" />
              {importError}
            </span>
            <button onClick={() => setImportError(null)} className="text-rose-400/50 hover:text-rose-300 transition-colors shrink-0">
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="p-4 md:p-8 pb-0 space-y-4 md:space-y-6">
        <div className="flex items-start gap-3">
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('changeView', { detail: 'dashboard' }))}
            className="p-2.5 md:p-3 rounded-[14px] bg-[var(--bg-subtle)] border border-[var(--border-color)] hover:bg-[var(--border-color)] transition-all shrink-0 mt-0.5"
          >
            <ArrowLeft className="w-4 h-4 md:w-5 md:h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl md:text-2xl font-inter font-medium tracking-tight">CenterPoint Jobs</h2>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <p className="text-xs md:text-sm text-[var(--tx2)] opacity-60">
                {totalJobs.toLocaleString()} jobs
                {syncStatus.totalCached > 0 && ` · ${syncStatus.totalCached.toLocaleString()} cached`}
              </p>
              {syncStatus.lastSync && (
                <span className="flex items-center gap-1 text-[10px] font-mono text-[var(--tx2)] opacity-50 uppercase tracking-widest">
                  <CheckCircle2 className="w-3 h-3 text-[#2a8a82]/50" />
                  <span className="hidden sm:inline">synced </span>{new Date(syncStatus.lastSync).toLocaleString()}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={handleSync}
              disabled={syncStatus.syncing}
              className={cn(
                "flex items-center gap-1.5 px-3 md:px-4 py-2 md:py-2.5 rounded-[14px] border text-xs font-inter transition-all",
                syncStatus.syncing
                  ? "bg-[#2563ba]/10 border-[#2563ba]/20 text-[#2563ba]/50 cursor-not-allowed"
                  : "bg-[#2563ba]/10 border-[#2563ba]/20 text-[#4a8fd4] hover:bg-[#2563ba]/20"
              )}
            >
              <CloudDownload className={cn("w-3.5 h-3.5", syncStatus.syncing && "animate-pulse")} />
              <span className="hidden sm:inline">{syncStatus.syncing ? "Syncing…" : "Sync Now"}</span>
            </button>
            <button
              onClick={() => fetchJobs({ refresh: true, newPage: 1 })}
              className={cn("p-2 md:p-3 bg-[var(--bg-subtle)] border border-[var(--border-color)] rounded-[14px] hover:bg-[var(--border-color)] transition-all", refreshing && "animate-spin")}
            >
              <RefreshCw className="w-3.5 h-3.5 md:w-4 md:h-4 text-[var(--tx2)] opacity-60" />
            </button>
          </div>
        </div>

        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--tx2)] opacity-40" />
          <input
            type="text"
            placeholder="Search by job number or property..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full bg-[var(--bg-subtle)] border border-[var(--border-color)] rounded-2xl py-3 pl-10 pr-24 text-sm outline-none focus:border-[#2563ba]/50 transition-all text-[var(--tx1)] placeholder:text-[var(--tx2)] placeholder:opacity-40"
          />
          <button type="submit" className="absolute right-2.5 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-[#2563ba]/20 border border-[#2563ba]/30 rounded-xl text-xs text-[#4a8fd4] hover:bg-[#2563ba]/30 transition-all">
            Search
          </button>
        </form>

        {/* Filters */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {STATUS_FILTERS.map((f) => {
            const isActive = statusFilter === f.id;
            return (
              <button
                key={f.id}
                onClick={() => setStatusFilter(f.id)}
                className={cn(
                  "px-3 md:px-4 py-1.5 rounded-full text-xs font-inter whitespace-nowrap transition-all border shrink-0",
                  isActive
                    ? "bg-[#2563ba]/20 border-[#2563ba]/30 text-[#4a8fd4]"
                    : "bg-[var(--bg-subtle)] border-[var(--border-color)] text-[var(--tx2)] opacity-70 hover:opacity-100"
                )}
              >
                {f.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Job list */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-2 md:space-y-3">
        {loading ? (
          <div className="py-20 flex flex-col items-center gap-4 opacity-40">
            <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            <p className="text-sm font-mono text-[#567090]">Loading from CenterPoint...</p>
          </div>
        ) : jobs.length === 0 ? (
          <div className="py-20 text-center opacity-30">
            <Building2 className="w-12 h-12 mx-auto mb-4" />
            <p className="font-inter">No jobs found</p>
          </div>
        ) : (
          <>
            {jobs.map((job) => {
              const attr = job.attributes;
              const normalizedStatus = attr.status === "opened" ? "accepted" : attr.status;
              const stage = STAGES[normalizedStatus] ?? { label: attr.displayStatus, next: null, color: "bg-white/10 text-[#567090] border-white/10", ring: "bg-white/30", chip: { bg: "#f6f9fc", fg: "#64748d", dot: "#94a3b8" } };
              const nextStage = stage.next;
              const isExpanded = expandedId === job.id;
              const isTransitioning = transitioningId === job.id;
              const currentIndex = stageIndex(attr.status);

              return (
                <motion.div
                  key={job.id}
                  layout
                  className="rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-color)] hover:border-[#2563ba]/30 transition-all overflow-hidden"
                >
                  {/* Job row */}
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : job.id)}
                    className="w-full p-4 md:p-6 text-left"
                  >
                    {/* Mobile: stacked layout / Desktop: single row */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        {/* Top row: status chip + ticket number */}
                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                          <span
                            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded shrink-0"
                            style={{
                              background: stage.chip.bg,
                              color: stage.chip.fg,
                              fontSize: 11,
                              fontFamily: "'Inter', system-ui, sans-serif",
                              fontWeight: 400,
                              fontFeatureSettings: '"ss01" 1, "tnum" 1',
                              whiteSpace: "nowrap",
                            }}
                          >
                            <span
                              className="w-1.5 h-1.5 rounded-full shrink-0"
                              style={{ background: stage.chip.dot }}
                            />
                            {stage.label}
                          </span>
                          <span className="text-[10px] font-mono text-[var(--tx2)] opacity-50 tracking-widest">#{attr.name}</span>
                        </div>
                        {/* Property name — full width, no truncation */}
                        <p className="text-sm md:text-base font-inter font-semibold text-[var(--tx1)] leading-snug mb-1">
                          {attr.propertyName || attr.name || `Job #${job.id}`}
                        </p>
                        {/* Meta row */}
                        <div className="flex items-center gap-3 flex-wrap">
                          {attr.domain && (
                            <span className="text-[10px] font-mono text-[var(--tx2)] opacity-60 uppercase tracking-wider">{attr.domain}</span>
                          )}
                          {(attr.opportunityType || attr.workType) && (
                            <span className="text-[10px] font-mono text-[var(--tx2)] opacity-60">{attr.opportunityType || attr.workType}</span>
                          )}
                          {jobAssignments[attr.name] ? (
                            <span className="text-[10px] font-inter text-[#3aada3]">
                              {reps.find(r => r.id === jobAssignments[attr.name])?.name ?? "Assigned"}
                            </span>
                          ) : parseCpManagers(job.cpAdditionalManagers)[0] ? (
                            <span className="text-[10px] font-inter text-[#3aada3]/70">
                              {parseCpManagers(job.cpAdditionalManagers)[0]}
                            </span>
                          ) : null}
                        </div>
                      </div>

                      {/* Right side: assign button + chevron */}
                      <div className="flex items-center gap-2 shrink-0 pt-0.5">
                        {attr.price > 0 && (
                          <div className="text-right hidden md:block">
                            <p className="text-[9px] font-mono text-[var(--tx2)] opacity-50 uppercase tracking-widest mb-0.5">Value</p>
                            <p className="text-sm font-inter font-normal text-[var(--tx1)]" style={{ fontFeatureSettings: '"ss01" 1, "tnum" 1', letterSpacing: "-0.42px" }}>
                              ${attr.price.toLocaleString()}
                            </p>
                          </div>
                        )}

                      {/* Inline assign-rep — manager only */}
                      {isManager && (
                        <div className="relative" onClick={e => e.stopPropagation()}>
                          {!jobAssignments[attr.name] && getCpRepId(job) ? (
                            <button
                              onClick={() => handleAssignRep(attr.name, getCpRepId(job)!)}
                              disabled={savingAssignId === attr.name}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[10px] font-mono transition-all bg-[#2a8a82]/10 border-[#2a8a82]/25 text-[#3aada3] hover:bg-[#2a8a82]/20"
                            >
                              {savingAssignId === attr.name
                                ? <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                                : <UserPlus className="w-2.5 h-2.5" />
                              }
                              Assign
                            </button>
                          ) : (
                            <button
                              onClick={() => setAssigningJobId(assigningJobId === job.id ? null : job.id)}
                              disabled={savingAssignId === attr.name}
                              className={cn(
                                "flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[10px] font-mono transition-all",
                                jobAssignments[attr.name]
                                  ? "bg-[#2a8a82]/10 border-[#2a8a82]/25 text-[#3aada3]"
                                  : "bg-[var(--bg-subtle)] border-[var(--border-color)] text-[var(--tx2)] hover:text-[var(--tx1)]"
                              )}
                            >
                              {savingAssignId === attr.name
                                ? <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                                : <UserPlus className="w-2.5 h-2.5" />
                              }
                              {jobAssignments[attr.name] ? "Reassign" : "Assign"}
                            </button>
                          )}

                          <AnimatePresence>
                            {assigningJobId === job.id && reps.length > 0 && (
                              <motion.div
                                initial={{ opacity: 0, y: -4, scale: 0.97 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -4, scale: 0.97 }}
                                transition={{ duration: 0.12 }}
                                className="absolute right-0 top-full mt-2 z-20 w-52 rounded-xl border border-[var(--border-color)] bg-[var(--bg-elevated)] shadow-2xl overflow-hidden"
                              >
                                <p className="px-3 py-2 text-[9px] font-mono text-[var(--tx2)] opacity-50 uppercase tracking-widest border-b border-[var(--border-color)]">
                                  Assign to rep
                                </p>
                                {reps.map(rep => (
                                  <button
                                    key={rep.id}
                                    onClick={() => handleAssignRep(attr.name, rep.id)}
                                    className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-[var(--bg-subtle)] transition-colors text-left"
                                  >
                                    <User className="w-3 h-3 text-[var(--tx2)] opacity-50 shrink-0" />
                                    <span className="text-xs font-inter text-[var(--tx1)] truncate flex-1">{rep.name}</span>
                                    {jobAssignments[attr.name] === rep.id && (
                                      <Check className="w-3 h-3 text-[#3aada3] shrink-0" />
                                    )}
                                  </button>
                                ))}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      )}

                      <ChevronRight className={cn("w-4 h-4 text-[var(--tx2)] opacity-40 transition-transform duration-200", isExpanded && "rotate-90")} />
                      </div>{/* end right side */}
                    </div>{/* end outer flex */}
                  </button>

                  {/* Expanded detail */}
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
                          <div>
                            <p className="text-[9px] font-mono text-[var(--tx2)] opacity-60 uppercase tracking-widest mb-3">Stage Pipeline</p>
                            <div className="flex items-center gap-1 flex-wrap">
                              {STAGE_ORDER.map((s, i) => {
                                const isPast = i < currentIndex;
                                const isCurrent = i === currentIndex;
                                return (
                                  <div key={s} className="flex items-center gap-1 shrink-0">
                                    <div className={cn(
                                      "px-3 py-1.5 rounded-lg text-[9px] font-mono uppercase tracking-widest border transition-all",
                                      isCurrent ? stage.color + " ring-1 ring-white/20" :
                                        isPast ? "bg-[var(--bg-subtle)] text-[var(--tx2)] opacity-60 border-[var(--border-color)]" :
                                          "bg-transparent text-[var(--tx2)] opacity-30 border-[var(--border-color)]"
                                    )}>
                                      {STAGES[s]?.label ?? s}
                                    </div>
                                    {i < STAGE_ORDER.length - 1 && (
                                      <div className={cn("w-4 h-[1px] bg-[var(--border-color)]", isPast ? "opacity-60" : "opacity-30")} />
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {/* Meta */}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {[
                              { label: "Job #", value: attr.name },
                              { label: "Domain", value: attr.domain },
                              { label: "Type", value: attr.opportunityType || attr.workType || "—" },
                              { label: "Start Date", value: attr.startDate ? new Date(attr.startDate).toLocaleDateString() : "—" },
                              { label: "Price", value: attr.price > 0 ? `$${attr.price.toLocaleString()}` : "—", isMoney: attr.price > 0 },
                              { label: "Last Updated", value: new Date(attr.updatedAt).toLocaleDateString() },
                              { label: "Hustad Type", value: attr.customWithLabels?.serviceTypeHustad || "—" },
                              { label: "Created", value: new Date(attr.createdAt).toLocaleDateString() },
                            ].map((item: { label: string; value: string; isMoney?: boolean }) => (
                              <div key={item.label} className="space-y-1">
                                <p className="text-[9px] font-mono text-[var(--tx2)] opacity-50 uppercase tracking-widest">{item.label}</p>
                                <p
                                  className="text-xs text-[var(--tx1)] font-inter"
                                  style={item.isMoney ? { fontFamily: "'Inter', system-ui, sans-serif", fontFeatureSettings: '"ss01" 1, "tnum" 1', letterSpacing: "-0.39px", fontWeight: 400 } : undefined}
                                >
                                  {item.value}
                                </p>
                              </div>
                            ))}
                          </div>

                          {/* Assign rep — manager only */}
                          {isManager && (
                            <div className="border-t border-[var(--border-color)] pt-5">
                              <p className="text-[9px] font-mono text-[var(--tx2)] opacity-60 uppercase tracking-widest mb-3">Assigned Rep</p>
                              <div className="flex items-center gap-3 flex-wrap">
                                {jobAssignments[attr.name] ? (
                                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#2a8a82]/10 border border-[#2a8a82]/25">
                                    <User className="w-3.5 h-3.5 text-[#3aada3]" />
                                    <span className="text-xs font-inter text-[#3aada3]">
                                      {reps.find(r => r.id === jobAssignments[attr.name])?.name ?? "Assigned"}
                                    </span>
                                  </div>
                                ) : parseCpManagers(job.cpAdditionalManagers)[0] ? (
                                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#2a8a82]/05 border border-[#2a8a82]/15">
                                    <User className="w-3.5 h-3.5 text-[#3aada3]/60" />
                                    <span className="text-xs font-inter text-[#3aada3]/60">
                                      {parseCpManagers(job.cpAdditionalManagers)[0]}
                                    </span>
                                    <span className="text-[9px] font-mono text-[#2a8a82]/50 uppercase tracking-widest">from CP</span>
                                  </div>
                                ) : (
                                  <span className="text-xs font-inter text-[var(--tx2)] opacity-50">Unassigned</span>
                                )}
                                {jobAssignments[attr.name] && (
                                  <button
                                    onClick={() => handleUnassignRep(attr.name)}
                                    disabled={unassigningId === attr.name || savingAssignId === attr.name}
                                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-500/[0.06] border border-rose-500/20 text-[10px] font-mono text-rose-400/70 hover:text-rose-300 hover:border-rose-500/35 transition-all disabled:opacity-40"
                                  >
                                    {unassigningId === attr.name
                                      ? <RefreshCw className="w-3 h-3 animate-spin" />
                                      : <X className="w-3 h-3" />
                                    }
                                    Unassign
                                  </button>
                                )}
                                {/* CP pre-assignment: show Confirm button that directly assigns, plus Choose Rep */}
                                {!jobAssignments[attr.name] && getCpRepId(job) && (
                                  <button
                                    onClick={() => handleAssignRep(attr.name, getCpRepId(job)!)}
                                    disabled={savingAssignId === attr.name}
                                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#2a8a82]/10 border border-[#2a8a82]/25 text-[10px] font-mono text-[#3aada3] hover:bg-[#2a8a82]/20 transition-all disabled:opacity-40"
                                  >
                                    {savingAssignId === attr.name
                                      ? <RefreshCw className="w-3 h-3 animate-spin" />
                                      : <UserPlus className="w-3 h-3" />
                                    }
                                    Confirm Assignment
                                  </button>
                                )}
                                <div className="relative">
                                  <button
                                    onClick={() => setAssigningJobId(assigningJobId === `detail-${job.id}` ? null : `detail-${job.id}`)}
                                    disabled={savingAssignId === attr.name || unassigningId === attr.name}
                                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-color)] text-[10px] font-mono text-[var(--tx2)] hover:text-[var(--tx1)] transition-all"
                                  >
                                    {savingAssignId === attr.name
                                      ? <RefreshCw className="w-3 h-3 animate-spin" />
                                      : <UserPlus className="w-3 h-3" />
                                    }
                                    {jobAssignments[attr.name] ? "Reassign" : "Choose Rep"}
                                  </button>

                                  <AnimatePresence>
                                    {assigningJobId === `detail-${job.id}` && reps.length > 0 && (
                                      <motion.div
                                        initial={{ opacity: 0, y: -4, scale: 0.97 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: -4, scale: 0.97 }}
                                        transition={{ duration: 0.12 }}
                                        className="absolute left-0 top-full mt-2 z-20 w-52 rounded-xl border border-[var(--border-color)] bg-[var(--bg-elevated)] shadow-2xl overflow-hidden"
                                      >
                                        <p className="px-3 py-2 text-[9px] font-mono text-[var(--tx2)] opacity-50 uppercase tracking-widest border-b border-[var(--border-color)]">
                                          Assign to rep
                                        </p>
                                        {reps.map(rep => (
                                          <button
                                            key={rep.id}
                                            onClick={() => handleAssignRep(attr.name, rep.id)}
                                            className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-[var(--bg-subtle)] transition-colors text-left"
                                          >
                                            <User className="w-3 h-3 text-[var(--tx2)] opacity-50 shrink-0" />
                                            <span className="text-xs font-inter text-[var(--tx1)] truncate flex-1">{rep.name}</span>
                                            {jobAssignments[attr.name] === rep.id && (
                                              <Check className="w-3 h-3 text-[#3aada3] shrink-0" />
                                            )}
                                          </button>
                                        ))}
                                      </motion.div>
                                    )}
                                  </AnimatePresence>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Stage transition CTA & Import to Pipeline */}
                          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pt-2 border-t border-white/[0.05]">
                            <div className="flex-1 min-w-0">
                              <p className="text-[10px] font-mono text-[#3F5878] uppercase tracking-widest mb-2">Actions</p>

                              {/* Stage picker — inline when open */}
                              {stagePickerJobId === job.id ? (
                                <div className="space-y-2">
                                  <p className="text-[9px] font-mono text-[#3F5878] uppercase tracking-widest">Select new stage</p>
                                  <div className="flex flex-wrap gap-1.5">
                                    {STAGE_ORDER.map((s) => (
                                      <button
                                        key={s}
                                        disabled={isTransitioning || s === attr.status}
                                        onClick={() => {
                                          setStagePickerJobId(null);
                                          handleStageTransition(job, s);
                                        }}
                                        className={cn(
                                          "px-3 py-1.5 rounded-lg text-[9px] font-mono uppercase tracking-widest border transition-all",
                                          s === attr.status
                                            ? "bg-[var(--bg-subtle)] text-[var(--tx2)] opacity-60 border-[var(--border-color)] cursor-default"
                                            : "bg-[var(--bg-subtle)] border-[var(--border-color)] text-[var(--tx2)] opacity-60 hover:bg-[#2563ba]/20 hover:border-[#2563ba]/40 hover:text-[#4a8fd4] hover:opacity-100 active:scale-95"
                                        )}
                                      >
                                        {STAGES[s]?.label ?? s}
                                      </button>
                                    ))}
                                    <button
                                      onClick={() => setStagePickerJobId(null)}
                                      className="px-3 py-1.5 rounded-lg text-[9px] font-mono uppercase tracking-widest border border-[var(--border-color)] text-[var(--tx2)] opacity-60 hover:bg-[var(--bg-subtle)] hover:opacity-100 transition-all"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-center gap-3 flex-wrap">
                                  {nextStage ? (
                                    <button
                                      onClick={() => handleStageTransition(job, nextStage)}
                                      disabled={isTransitioning}
                                      className="flex items-center gap-2 px-5 py-2.5 rounded-[14px] bg-[var(--bg-subtle)] text-[var(--tx1)] text-xs font-inter font-medium hover:bg-[var(--bg-elevated)] active:scale-95 transition-all disabled:opacity-50"
                                    >
                                      {isTransitioning ? (
                                        <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                      ) : (
                                        <ArrowRight className="w-3.5 h-3.5" />
                                      )}
                                      Move to {STAGES[nextStage]?.label ?? nextStage}
                                    </button>
                                  ) : null}
                                  <button
                                    onClick={() => setStagePickerJobId(job.id)}
                                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-[14px] bg-[var(--bg-subtle)] border border-[var(--border-color)] text-[var(--tx2)] opacity-60 text-[10px] font-mono uppercase tracking-widest hover:bg-[var(--bg-elevated)] hover:opacity-100 hover:border-[var(--border-color)] active:scale-95 transition-all"
                                  >
                                    <RefreshCw className="w-3 h-3" />
                                    Change Stage
                                  </button>

                                  {job.inbox_status === 'imported_to_pipeline' ? (
                                    <span className="flex items-center gap-1 rounded-[14px] bg-[#2a8a82]/10 border border-[#2a8a82]/25 text-xs font-inter text-[#3aada3] overflow-hidden">
                                      <span className="flex items-center gap-2 pl-4 pr-2 py-2.5">
                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                        In Pipeline
                                      </span>
                                      <button
                                        onClick={async (e) => {
                                          e.stopPropagation();
                                          setUnlinkingId(job.id);
                                          try {
                                            const res = await unlinkPipelineByTicket(job.attributes.name);
                                            if (res.ok) {
                                              setJobs(prev => prev.map(j =>
                                                j.id === job.id ? { ...j, inbox_status: '' } : j
                                              ));
                                            }
                                          } catch (e) {
                                            /* non-fatal */
                                          } finally {
                                            setUnlinkingId(null);
                                          }
                                        }}
                                        disabled={unlinkingId === job.id}
                                        title="Remove from Pipeline"
                                        className="pr-3 pl-1 py-2.5 text-[#3aada3]/50 hover:text-rose-400 hover:bg-rose-500/10 transition-all disabled:opacity-40"
                                      >
                                        <X className="w-3 h-3" />
                                      </button>
                                    </span>
                                  ) : (
                                    <button
                                      disabled={promotingId === job.id}
                                      className="flex items-center gap-2 px-5 py-2.5 rounded-[14px] bg-[#2563ba] text-white text-xs font-inter font-medium hover:bg-[#1e4d8c] active:scale-95 transition-all disabled:opacity-50"
                                      onClick={async () => {
                                        setPromotingId(job.id);
                                        setImportError(null);
                                        try {
                                          const res = await createPipelineLead({ job });
                                          if (res.ok) {
                                            setJobs(prev => prev.map(j =>
                                              j.id === job.id ? { ...j, inbox_status: 'imported_to_pipeline' } : j
                                            ));
                                            window.dispatchEvent(new CustomEvent('changeView', { detail: 'pipeline' }));
                                          } else {
                                            const err = await res.json().catch(() => ({}));
                                            setImportError(err.error || "Import failed. Please try again.");
                                            setTimeout(() => setImportError(null), 6000);
                                          }
                                        } catch {
                                          setImportError("Network error — check your connection and try again.");
                                          setTimeout(() => setImportError(null), 6000);
                                        } finally {
                                          setPromotingId(null);
                                        }
                                      }}
                                    >
                                      {promotingId === job.id ? (
                                        <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                      ) : (
                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                      )}
                                      Import to Pipeline
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}

            {/* Load more */}
            {jobs.length < totalJobs && (
              <button
                onClick={handleLoadMore}
                className="w-full py-4 rounded-2xl border border-white/10 text-[#567090] text-sm font-inter hover:bg-white/5 hover:text-[#AABDCF] transition-all"
              >
                Load more · {(totalJobs - jobs.length).toLocaleString()} remaining
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
