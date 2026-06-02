"use client";

import { fetchCenterpointOpportunities, triggerOpportunitiesSync, fetchOpportunitiesSyncStatus } from "@/lib/api";
import { useState, useEffect, useCallback } from "react";
import { Search, RefreshCw, TrendingUp, ArrowLeft, ChevronRight, AlertCircle, Zap, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

// ─── CP opportunity statuses ───────────────────────────────────────────────────
const STATUSES: Record<string, { label: string; color: string; ring: string; chip: { bg: string; fg: string; dot: string } }> = {
  lead_opened:  { label: "Opened",   color: "bg-[#2563ba]/20 text-[#4a8fd4] border-[#2563ba]/30",  ring: "bg-[#2563ba]",   chip: { bg: "#c5daf4", fg: "#163975", dot: "#2563ba" } },
  lead_pending: { label: "Pending",  color: "bg-[#d6a800]/15 text-[#f0c000] border-[#d6a800]/30",  ring: "bg-[#d97706]",   chip: { bg: "#fef3c7", fg: "#92400e", dot: "#d97706" } },
  lead_quoted:  { label: "Quoted",   color: "bg-[#7C3AED]/15 text-[#a78bfa] border-[#7C3AED]/30",  ring: "bg-[#7C3AED]",   chip: { bg: "#ede9fe", fg: "#4c1d95", dot: "#7C3AED" } },
  lead_sold:    { label: "Accepted", color: "bg-[#2a8a82]/20 text-[#3aada3] border-[#2a8a82]/30",  ring: "bg-[#2a8a82]",   chip: { bg: "#a8d2d0", fg: "#115250", dot: "#2a8a82" } },
  lead_dead:    { label: "Dead",     color: "bg-white/5 text-[#567090] border-white/10",            ring: "bg-white/30",    chip: { bg: "#f1f5f9", fg: "#64748b", dot: "#94a3b8" } },
};

const STATUS_FILTERS = [
  { id: "",             label: "All" },
  { id: "lead_opened",  label: "Opened" },
  { id: "lead_pending", label: "Pending" },
  { id: "lead_quoted",  label: "Quoted" },
  { id: "lead_sold",    label: "Accepted" },
  { id: "lead_dead",    label: "Dead" },
];

// ─── Exact CenterPoint workflow stages in order ───────────────────────────────
const CP_STAGES = [
  "Qualify",
  "Meeting",
  "Inspection",
  "Finalize Repairs",
  "Quote Repairs",
  "Pre-Approve Replacement",
  "Estimate",
  "Finalize Replacement",
  "Quote Replacement",
  "Presentation",
  "Pending",
  "Accepted",
  "Declined",
];

// Fallback: map lead status → approximate stage name when workflowStageName is absent
const STATUS_TO_STAGE: Record<string, string> = {
  lead_opened:  "Qualify",
  lead_quoted:  "Quote Repairs",
  lead_pending: "Pending",
  lead_sold:    "Accepted",
  lead_dead:    "Declined",
};

function resolveCurrentStage(status: string, workflowStageName: string | null): string {
  // workflowStageName is the real CP stage name — use it directly when available
  if (workflowStageName) return workflowStageName;
  return STATUS_TO_STAGE[status] ?? "Qualify";
}

const OPP_TYPE_COLORS: Record<string, { bg: string; fg: string }> = {
  "Service":          { bg: "rgba(37,99,186,0.10)",  fg: "#4a8fd4" },
  "Hail/Wind Claim":  { bg: "rgba(214,168,0,0.10)",  fg: "#f0c000" },
  "Roof Replacement": { bg: "rgba(42,138,130,0.10)", fg: "#3aada3" },
};

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
}

function extractAddress(description: string | null): string {
  if (!description) return "";
  const match = description.match(/at (.+)$/i);
  return match ? match[1].trim() : description;
}

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

  const stageIndex = (stageName: string) => CP_STAGES.findIndex(s => s === stageName);

  return (
    <div className="flex flex-col h-full">

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="p-8 pb-0 space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => window.dispatchEvent(new CustomEvent("changeView", { detail: "dashboard" }))}
              className="p-3 rounded-[14px] bg-white/5 border border-white/10 hover:bg-white hover:text-black transition-all"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h2 className="text-2xl font-inter font-medium tracking-tight">Opportunities</h2>
              <p className="text-sm text-[#567090] mt-1">
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
              className={cn("p-3 bg-white/5 border border-white/10 rounded-[14px] hover:bg-white/10 transition-all", refreshing && "animate-spin")}
            >
              <RefreshCw className="w-4 h-4 text-[#7090B0]" />
            </button>
          </div>
        </div>

        {/* Search */}
        <form onSubmit={e => { e.preventDefault(); setSearch(searchInput); }} className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#3F5878]" />
          <input
            type="text"
            placeholder="Search by job number or address..."
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            className="w-full bg-white/[0.03] border border-white/[0.1] rounded-2xl py-3.5 pl-12 pr-32 text-sm outline-none focus:border-[#7C3AED]/50 transition-all"
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
          <span className="text-[10px] font-mono text-[#3F5878] uppercase tracking-widest shrink-0">Stage</span>
          {STATUS_FILTERS.map(f => (
            <button
              key={f.id}
              onClick={() => setStatusFilter(f.id)}
              className={cn(
                "px-4 py-2 rounded-lg border text-xs font-inter transition-all whitespace-nowrap shrink-0",
                statusFilter === f.id
                  ? "bg-white text-black border-white"
                  : "bg-white/5 border-white/10 text-[#7090B0] hover:bg-white/10"
              )}
            >{f.label}</button>
          ))}
        </div>
      </div>

      {/* ── Opportunity list ──────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-8 space-y-3">
        {loading ? (
          <div className="py-20 flex flex-col items-center gap-4 opacity-40">
            <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            <p className="text-sm font-mono text-[#567090]">Loading opportunities…</p>
          </div>
        ) : opps.length === 0 ? (
          <div className="py-20 text-center opacity-30">
            <TrendingUp className="w-12 h-12 mx-auto mb-4" />
            <p className="font-inter">No opportunities yet</p>
            <p className="text-xs text-[#567090] mt-2">Complete a session to create an opportunity in CenterPoint</p>
          </div>
        ) : (
          <>
            {opps.map(opp => {
              const status     = STATUSES[opp.status] ?? STATUSES["lead_opened"];
              const isDead     = opp.status === "lead_dead";
              const currentStage = resolveCurrentStage(opp.status, opp.workflow_stage_name ?? null);
              const currentIdx   = stageIndex(currentStage);
              const isExpanded = expandedId === opp.id;
              const address    = extractAddress(opp.description);
              const typeColors = OPP_TYPE_COLORS[opp.opportunity_type ?? ""] ?? { bg: "rgba(255,255,255,0.04)", fg: "#567090" };

              return (
                <motion.div
                  key={opp.id}
                  layout
                  className="rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:border-white/15 transition-all overflow-hidden"
                >
                  {/* ── Row ───────────────────────────────────────────────── */}
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : opp.id)}
                    className="w-full p-6 text-left flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-5 min-w-0">
                      {/* Coloured dot — matches Tickets layout */}
                      <div className={cn("w-2.5 h-2.5 rounded-full shrink-0", status.ring)} />

                      <div className="min-w-0">
                        <div className="flex items-center gap-3 mb-1 flex-wrap">
                          <span className="text-base font-inter font-medium text-[#E8EDF8] truncate">
                            {address || opp.name}
                          </span>
                          <span className="text-[9px] font-mono text-[#3F5878] tracking-widest">#{opp.name}</span>
                        </div>
                        <div className="flex items-center gap-3 flex-wrap">
                          {/* Stage badge */}
                          <span className={cn("px-2.5 py-0.5 rounded-lg text-[9px] font-mono uppercase tracking-widest border", status.color)}>
                            {opp.workflow_stage_name ?? status.label}
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
                          {/* Last updated */}
                          {opp.cp_updated_at ? (
                            <span className="text-[10px] font-mono text-[#354D6F]">
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
                          <p className="text-[9px] font-mono text-[#2D4060] uppercase tracking-widest mb-0.5">Value</p>
                          <p
                            className="text-sm font-inter font-medium text-[#E8EDF8]"
                            style={{ fontFeatureSettings: '"ss01" 1, "tnum" 1', letterSpacing: "-0.42px" }}
                          >
                            ${opp.price.toLocaleString()}
                          </p>
                        </div>
                      )}
                      <ChevronRight className={cn("w-4 h-4 text-[#2D4060] transition-transform duration-200", isExpanded && "rotate-90")} />
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
                        <div className="px-6 pb-6 space-y-6 border-t border-white/[0.05] pt-5">

                          {/* Stage pipeline */}
                          {isDead ? (
                            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10 w-fit">
                              <X className="w-3.5 h-3.5 text-[#567090]" />
                              <span className="text-[10px] font-mono text-[#567090] uppercase tracking-widest">Lead Dead — no further action</span>
                            </div>
                          ) : (
                            <div>
                              <p className="text-[9px] font-mono text-[#3F5878] uppercase tracking-widest mb-3">Pipeline</p>
                              <div className="flex items-center gap-1 overflow-x-auto pb-2">
                                {CP_STAGES.map((s, i) => {
                                  const isPast    = i < currentIdx;
                                  const isCurrent = i === currentIdx;
                                  const activeColor =
                                    s === "Accepted"              ? "bg-[#2a8a82]/20 text-[#3aada3] border-[#2a8a82]/30" :
                                    s === "Declined"              ? "bg-rose-500/15 text-rose-400 border-rose-500/25" :
                                    s === "Pending"               ? "bg-[#d6a800]/15 text-[#f0c000] border-[#d6a800]/30" :
                                    s === "Presentation"          ? "bg-sky-500/15 text-sky-300 border-sky-500/25" :
                                    s.startsWith("Quote")         ? "bg-[#7C3AED]/15 text-[#a78bfa] border-[#7C3AED]/30" :
                                                                    "bg-[#2563ba]/20 text-[#4a8fd4] border-[#2563ba]/30";
                                  return (
                                    <div key={s} className="flex items-center gap-1 shrink-0">
                                      <div className={cn(
                                        "px-3 py-1.5 rounded-lg text-[9px] font-mono uppercase tracking-widest border transition-all",
                                        isCurrent ? activeColor + " ring-1 ring-white/20" :
                                        isPast    ? "bg-white/5 text-[#2D4060] border-white/5" :
                                                    "bg-transparent text-[#293A58] border-white/[0.04]"
                                      )}>
                                        {s}
                                      </div>
                                      {i < CP_STAGES.length - 1 && (
                                        <div className={cn("w-4 h-[1px]", isPast ? "bg-white/20" : "bg-white/[0.05]")} />
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
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
                                <p className="text-[9px] font-mono text-[#354D6F] uppercase tracking-widest">{item.label}</p>
                                <p
                                  className="text-xs text-[#AABDCF] font-inter"
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
                              <p className="text-[9px] font-mono text-[#3F5878] uppercase tracking-widest mb-2">Description</p>
                              <p className="text-sm text-[#567090] font-inter">{opp.description}</p>
                            </div>
                          )}

                          {/* Actions */}
                          <div className="flex items-center gap-2 pt-2 border-t border-white/[0.05]">
                            <button
                              onClick={() => window.dispatchEvent(new CustomEvent("changeView", { detail: "centerpoint" }))}
                              className="flex items-center gap-2 px-5 py-2.5 rounded-[14px] bg-white/5 border border-white/10 text-[#7090B0] text-xs font-inter hover:bg-white/10 hover:text-[#E8EDF8] hover:border-white/20 active:scale-95 transition-all"
                            >
                              View Service Job in CP Inbox
                            </button>
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
                className="w-full py-4 rounded-2xl border border-white/10 text-[#567090] text-sm font-inter hover:bg-white/5 hover:text-[#AABDCF] transition-all"
              >
                Load more · {(total - opps.length).toLocaleString()} remaining
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
