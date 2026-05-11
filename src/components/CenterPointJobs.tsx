"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, ChevronRight, RefreshCw, Building2, ArrowRight, CloudDownload, CheckCircle2, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

// ─── Stage pipeline ────────────────────────────────────────────────────────────
const STAGES: Record<string, { label: string; next: string | null; color: string; ring: string }> = {
  lead_opened:   { label: "New Lead",    next: "lead_pending",  color: "bg-sky-500/20 text-sky-300 border-sky-500/30",      ring: "bg-sky-500" },
  lead_pending:  { label: "Pending",     next: "lead_quoted",   color: "bg-blue-500/20 text-blue-300 border-blue-500/30",    ring: "bg-blue-500" },
  lead_quoted:   { label: "Quoted",      next: "lead_sold",     color: "bg-amber-500/20 text-amber-300 border-amber-500/30", ring: "bg-amber-500" },
  lead_sold:     { label: "Sold",        next: "opened",        color: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30", ring: "bg-emerald-500" },
  dead_lead:     { label: "Dead Lead",   next: null,            color: "bg-rose-500/20 text-rose-300 border-rose-500/30",    ring: "bg-rose-500" },
  opened:        { label: "Opened",      next: "scheduled",     color: "bg-indigo-500/20 text-indigo-300 border-indigo-500/30", ring: "bg-indigo-500" },
  scheduled:     { label: "Scheduled",   next: "started",       color: "bg-violet-500/20 text-violet-300 border-violet-500/30", ring: "bg-violet-500" },
  started:       { label: "In Progress", next: "completed",     color: "bg-purple-500/20 text-purple-300 border-purple-500/30", ring: "bg-purple-500" },
  completed:     { label: "Completed",   next: "invoiced",      color: "bg-teal-500/20 text-teal-300 border-teal-500/30",    ring: "bg-teal-500" },
  invoiced:      { label: "Invoiced",    next: "closed",        color: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",    ring: "bg-cyan-500" },
  closed:        { label: "Closed Out",  next: null,            color: "bg-white/10 text-white/40 border-white/10",          ring: "bg-white/30" },
};

const STAGE_ORDER = ["lead_opened","lead_pending","lead_quoted","lead_sold","dead_lead","opened","scheduled","started","completed","invoiced","closed"];

const STATUS_FILTERS = [
  { id: "all", label: "All Stages" },
  { id: "lead_opened", label: "New Lead" },
  { id: "lead_pending", label: "Pending" },
  { id: "lead_quoted", label: "Quoted" },
  { id: "lead_sold", label: "Sold" },
  { id: "opened", label: "Opened" },
  { id: "scheduled", label: "Scheduled" },
  { id: "started", label: "In Progress" },
  { id: "completed", label: "Completed" },
  { id: "invoiced", label: "Invoiced" },
  { id: "closed", label: "Closed" },
];

interface CPJob {
  id: string;
  inbox_status: string;
  promotedAt: string | null;
  promotedTicketId: string | null;
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

  const fetchJobs = useCallback(async (opts?: { refresh?: boolean; newPage?: number }) => {
    const isRefresh = opts?.refresh;
    const targetPage = opts?.newPage ?? page;
    const isInitial = targetPage === 1;

    if (isRefresh) setRefreshing(true); else if (isInitial) setLoading(true);

    try {
      const params = new URLSearchParams({ page: String(targetPage) });
      if (search) params.set("search", search);
      if (statusFilter) params.set("status", statusFilter);

      const res = await fetch(`/api/centerpoint?${params.toString()}&t=${Date.now()}`);
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Server responded with status ${res.status}`);
      }

      const data = await res.json();

      if (data?.data) {
        if (isInitial) {
          setJobs(data.data);
          // Set totalJobs to the count of jobs matching the current filter
          setTotalJobs(data.meta?.page?.total ?? 0);
        } else {
          setJobs(prev => [...prev, ...data.data]);
        }
      }
    } catch (e: any) {
      console.error("CenterPoint fetch error:", e);
      // We could set an error state here if needed
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [search, statusFilter, page]);

  const fetchSyncStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/centerpoint/sync");
      const data = await res.json();
      const lastCompleted = (data.logs ?? []).find((l: any) => l.status === "completed");
      setSyncStatus(prev => ({
        ...prev,
        lastSync: lastCompleted?.completed_at ?? null,
        totalCached: data.total_cached ?? 0,
      }));
    } catch {}
  }, []);

  const handleSync = async () => {
    setSyncStatus(prev => ({ ...prev, syncing: true, result: null }));
    try {
      const res = await fetch("/api/centerpoint/sync", { method: "POST" });
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

  const handleLoadMore = () => {
    const next = page + 1;
    setPage(next);
    fetchJobs({ newPage: next });
  };

  const handleStageTransition = async (job: CPJob, nextStatus: string) => {
    setTransitioningId(job.id);
    try {
      const res = await fetch(`/api/centerpoint/${job.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });

      if (res.ok) {
        setJobs(prev => prev.map(j =>
          j.id === job.id
            ? { ...j, attributes: { ...j.attributes, status: nextStatus, displayStatus: STAGES[nextStatus]?.label ?? nextStatus } }
            : j
        ));
      }
    } catch (e) {
      console.error("Stage transition failed", e);
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
    return -1;
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-8 pb-0 space-y-6">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => window.dispatchEvent(new CustomEvent('changeView', { detail: 'dashboard' }))}
            className="p-3 rounded-full bg-white/5 border border-white/10 hover:bg-white hover:text-black transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="min-w-0">
            <h2 className="text-2xl font-display font-medium tracking-tight">CenterPoint Jobs</h2>
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              <p className="text-sm text-white/40">
                {totalJobs.toLocaleString()} jobs
                {syncStatus.totalCached > 0 && ` · ${syncStatus.totalCached.toLocaleString()} cached`}
              </p>
              {syncStatus.lastSync && (
                <span className="flex items-center gap-1 text-[10px] font-mono text-white/25 uppercase tracking-widest">
                  <CheckCircle2 className="w-3 h-3 text-emerald-500/50" />
                  synced {new Date(syncStatus.lastSync).toLocaleString()}
                </span>
              )}
              {syncStatus.result && (
                <span className="text-[10px] font-mono text-indigo-400/70">{syncStatus.result}</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {/* Sync from CenterPoint → Supabase */}
            <button
              onClick={handleSync}
              disabled={syncStatus.syncing}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-full border text-xs font-display transition-all",
                syncStatus.syncing
                  ? "bg-indigo-500/10 border-indigo-500/20 text-indigo-400/50 cursor-not-allowed"
                  : "bg-indigo-500/10 border-indigo-500/20 text-indigo-300 hover:bg-indigo-500/20"
              )}
            >
              <CloudDownload className={cn("w-3.5 h-3.5", syncStatus.syncing && "animate-pulse")} />
              {syncStatus.syncing ? "Syncing…" : "Sync Now"}
            </button>
            {/* Refresh list from Supabase */}
            <button
              onClick={() => fetchJobs({ refresh: true, newPage: 1 })}
              className={cn("p-3 bg-white/5 border border-white/10 rounded-full hover:bg-white/10 transition-all", refreshing && "animate-spin")}
            >
              <RefreshCw className="w-4 h-4 text-white/50" />
            </button>
          </div>
        </div>

        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <input
            type="text"
            placeholder="Search by job number or property name..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full bg-white/[0.03] border border-white/[0.1] rounded-2xl py-3.5 pl-12 pr-32 text-sm outline-none focus:border-indigo-500/50 transition-all"
          />
          <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2 px-4 py-1.5 bg-indigo-500/20 border border-indigo-500/30 rounded-xl text-xs text-indigo-300 hover:bg-indigo-500/30 transition-all">
            Search
          </button>
        </form>

        {/* Stage filter */}
        <div className="flex items-center gap-3 overflow-x-auto pb-1">
          <span className="text-[10px] font-mono text-white/30 uppercase tracking-widest shrink-0">Stage</span>
          {STATUS_FILTERS.map(f => (
            <button
              key={f.id}
              onClick={() => setStatusFilter(f.id)}
              className={cn(
                "px-4 py-2 rounded-full border text-xs font-display transition-all whitespace-nowrap shrink-0",
                statusFilter === f.id ? "bg-white text-black border-white" : "bg-white/5 border-white/10 text-white/50 hover:bg-white/10"
              )}
            >{f.label}</button>
          ))}
        </div>
      </div>

      {/* Job list */}
      <div className="flex-1 overflow-y-auto p-8 space-y-3">
        {loading ? (
          <div className="py-20 flex flex-col items-center gap-4 opacity-40">
            <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            <p className="text-sm font-mono text-white/40">Loading from CenterPoint...</p>
          </div>
        ) : jobs.length === 0 ? (
          <div className="py-20 text-center opacity-30">
            <Building2 className="w-12 h-12 mx-auto mb-4" />
            <p className="font-display">No jobs found</p>
          </div>
        ) : (
          <>
            {jobs.map((job) => {
              const attr = job.attributes;
              const stage = STAGES[attr.status] ?? { label: attr.displayStatus, next: null, color: "bg-white/10 text-white/40 border-white/10", ring: "bg-white/30" };
              const nextStage = stage.next;
              const isExpanded = expandedId === job.id;
              const isTransitioning = transitioningId === job.id;
              const currentIndex = stageIndex(attr.status);

              return (
                <motion.div
                  key={job.id}
                  layout
                  className="rounded-[28px] bg-white/[0.02] border border-white/[0.06] hover:border-white/15 transition-all overflow-hidden"
                >
                  {/* Job row */}
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : job.id)}
                    className="w-full p-6 text-left flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-5 min-w-0">
                      {/* Stage dot */}
                      <div className={cn("w-2.5 h-2.5 rounded-full shrink-0", stage.ring)} />

                      <div className="min-w-0">
                        <div className="flex items-center gap-3 mb-1 flex-wrap">
                          <span className="text-base font-display font-medium text-white truncate">
                            {attr.propertyName || attr.name || `Job #${job.id}`}
                          </span>
                          <span className="text-[9px] font-mono text-white/30 tracking-widest">#{attr.name}</span>
                        </div>
                        <div className="flex items-center gap-4 flex-wrap">
                          <span className={cn("px-2.5 py-0.5 rounded-full text-[9px] font-mono uppercase tracking-widest border", stage.color)}>
                            {stage.label}
                          </span>
                          {attr.domain && (
                            <span className="text-[10px] font-mono text-white/30 uppercase tracking-wider">{attr.domain}</span>
                          )}
                          {(attr.opportunityType || attr.workType) && (
                            <span className="text-[10px] font-mono text-white/30">{attr.opportunityType || attr.workType}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-6 shrink-0">
                      {attr.price > 0 && (
                        <div className="text-right hidden md:block">
                          <p className="text-[9px] font-mono text-white/20 uppercase tracking-widest mb-0.5">Value</p>
                          <p className="text-sm font-display font-medium text-white">
                            ${attr.price.toLocaleString()}
                          </p>
                        </div>
                      )}
                      <ChevronRight className={cn("w-4 h-4 text-white/20 transition-transform duration-200", isExpanded && "rotate-90")} />
                    </div>
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
                        <div className="px-6 pb-6 space-y-6 border-t border-white/[0.05] pt-5">

                          {/* Stage pipeline */}
                          <div>
                            <p className="text-[9px] font-mono text-white/30 uppercase tracking-widest mb-3">Stage Pipeline</p>
                            <div className="flex items-center gap-1 overflow-x-auto pb-2">
                              {STAGE_ORDER.map((s, i) => {
                                const isPast = i < currentIndex;
                                const isCurrent = i === currentIndex;
                                return (
                                  <div key={s} className="flex items-center gap-1 shrink-0">
                                    <div className={cn(
                                      "px-3 py-1.5 rounded-full text-[9px] font-mono uppercase tracking-widest border transition-all",
                                      isCurrent ? stage.color + " ring-1 ring-white/20" :
                                      isPast ? "bg-white/5 text-white/20 border-white/5" :
                                      "bg-transparent text-white/15 border-white/[0.04]"
                                    )}>
                                      {STAGES[s]?.label ?? s}
                                    </div>
                                    {i < STAGE_ORDER.length - 1 && (
                                      <div className={cn("w-4 h-[1px]", isPast ? "bg-white/20" : "bg-white/[0.05]")} />
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
                              { label: "Price", value: attr.price > 0 ? `$${attr.price.toLocaleString()}` : "—" },
                              { label: "Last Updated", value: new Date(attr.updatedAt).toLocaleDateString() },
                              { label: "Hustad Type", value: attr.customWithLabels?.serviceTypeHustad || "—" },
                              { label: "Created", value: new Date(attr.createdAt).toLocaleDateString() },
                            ].map(item => (
                              <div key={item.label} className="space-y-1">
                                <p className="text-[9px] font-mono text-white/25 uppercase tracking-widest">{item.label}</p>
                                <p className="text-xs text-white/70 font-display">{item.value}</p>
                              </div>
                            ))}
                          </div>

                          {/* Stage transition CTA & Import to Pipeline */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2 border-t border-white/[0.05]">
                            <div>
                              <p className="text-[10px] font-mono text-white/30 uppercase tracking-widest mb-2">Actions</p>
                              <div className="flex items-center gap-3">
                                {nextStage ? (
                                  <button
                                    onClick={() => handleStageTransition(job, nextStage)}
                                    disabled={isTransitioning}
                                    className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/10 text-white text-xs font-display font-medium hover:bg-white/20 active:scale-95 transition-all disabled:opacity-50"
                                  >
                                    {isTransitioning ? (
                                      <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                    ) : (
                                      <ArrowRight className="w-3.5 h-3.5" />
                                    )}
                                    Move to {STAGES[nextStage]?.label ?? nextStage}
                                  </button>
                                ) : (
                                  <span className="text-[10px] font-mono text-white/20 uppercase tracking-widest">Final stage</span>
                                )}

                                {job.inbox_status === 'imported_to_pipeline' ? (
                                  <span className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs font-display text-emerald-400">
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    In Pipeline
                                  </span>
                                ) : (
                                  <button
                                    onClick={async () => {
                                      setPromotingId(job.id);
                                      try {
                                        const res = await fetch("/api/pipeline", {
                                          method: "POST",
                                          headers: { "Content-Type": "application/json" },
                                          body: JSON.stringify({ job }),
                                        });
                                        if (res.ok) {
                                          // Update local state to show it's imported
                                          setJobs(prev => prev.map(j => 
                                            j.id === job.id ? { ...j, inbox_status: 'imported_to_pipeline' } : j
                                          ));
                                          // Auto-transition to Pipeline view
                                          const event = new CustomEvent('changeView', { detail: 'pipeline' });
                                          window.dispatchEvent(event);
                                        }
                                      } catch (e) {
                                        console.error("Import to pipeline failed", e);
                                      } finally {
                                        setPromotingId(null);
                                      }
                                    }}
                                    disabled={promotingId === job.id}
                                    className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-indigo-500 text-white text-xs font-display font-medium hover:bg-indigo-400 active:scale-95 transition-all shadow-[0_0_15px_rgba(99,102,241,0.3)] disabled:opacity-50"
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
                className="w-full py-4 rounded-2xl border border-white/10 text-white/40 text-sm font-display hover:bg-white/5 hover:text-white/70 transition-all"
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
