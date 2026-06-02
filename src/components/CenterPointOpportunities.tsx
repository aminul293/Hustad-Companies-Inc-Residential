"use client";

import { fetchCenterpointOpportunities, triggerOpportunitiesSync, fetchOpportunitiesSyncStatus } from "@/lib/api";
import { useState, useEffect, useCallback } from "react";
import { Search, ChevronRight, RefreshCw, TrendingUp, ArrowLeft, CheckCircle2, X, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

// ─── Status chip colours (keyed on CP status field) ────────────────────────────
const STATUS_CHIP: Record<string, { label: string; color: string; chip: { bg: string; fg: string; dot: string } }> = {
  lead_opened:  { label: "Opened",   color: "bg-[#2563ba]/20 text-[#4a8fd4] border-[#2563ba]/30", chip: { bg: "#c5daf4", fg: "#163975", dot: "#2563ba" } },
  lead_pending: { label: "Pending",  color: "bg-[#d6a800]/15 text-[#f0c000] border-[#d6a800]/30", chip: { bg: "#fef3c7", fg: "#92400e", dot: "#d97706" } },
  lead_quoted:  { label: "Quoted",   color: "bg-[#7C3AED]/15 text-[#a78bfa] border-[#7C3AED]/30", chip: { bg: "#ede9fe", fg: "#4c1d95", dot: "#7C3AED" } },
  lead_sold:    { label: "Accepted", color: "bg-[#2a8a82]/20 text-[#3aada3] border-[#2a8a82]/30", chip: { bg: "#a8d2d0", fg: "#115250", dot: "#2a8a82" } },
  lead_dead:    { label: "Dead",     color: "bg-white/5 text-[#567090] border-white/10",           chip: { bg: "#f1f5f9", fg: "#64748b", dot: "#94a3b8" } },
};

// ─── Real CenterPoint workflow stages (condensed) ──────────────────────────────
// Full CP order: Qualify → Meeting → Inspection → Finalize Repairs → Quote Repairs
// → Pre-Approve Replacement → Estimate → Finalize Replacement → Quote Replacement
// → Presentation → Pending → Accepted → Declined
const CP_STAGES = [
  { key: "qualify",      label: "Qualify" },
  { key: "inspection",   label: "Inspection" },
  { key: "quoted",       label: "Quoted" },
  { key: "presentation", label: "Presentation" },
  { key: "pending",      label: "Pending" },
  { key: "accepted",     label: "Accepted" },
];

// Map a CP stage name (workflowStage or displayStatus) → CP_STAGES key
const NAME_TO_STAGE: Record<string, string> = {
  "qualify":                    "qualify",
  "meeting":                    "qualify",
  "inspection":                 "inspection",
  "finalize repairs":           "quoted",
  "quote repairs":              "quoted",
  "pre-approve replacement":    "quoted",
  "estimate":                   "quoted",
  "finalize replacement":       "quoted",
  "quote replacement":          "quoted",
  "quoted":                     "quoted",
  "presentation":               "presentation",
  "pending":                    "pending",
  "accepted":                   "accepted",
};

// Fallback: map status field → stage key
const STATUS_TO_STAGE: Record<string, string> = {
  lead_opened:  "qualify",
  lead_quoted:  "quoted",
  lead_pending: "pending",
  lead_sold:    "accepted",
};

// Priority: workflowStageName (actual CP stage) > displayStatus > status field
function resolveStageKey(status: string, displayStatus: string, workflowStageName: string | null): string {
  if (workflowStageName) {
    const key = NAME_TO_STAGE[workflowStageName.toLowerCase().trim()];
    if (key) return key;
  }
  const dsKey = NAME_TO_STAGE[displayStatus.toLowerCase().trim()];
  if (dsKey) return dsKey;
  return STATUS_TO_STAGE[status] ?? "qualify";
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
  const [expandedId, setExpandedId]   = useState<string | null>(null);

  const fetchOpps = useCallback(async (opts?: { refresh?: boolean; newPage?: number }) => {
    const isRefresh  = opts?.refresh;
    const targetPage = opts?.newPage ?? page;
    const isInitial  = targetPage === 1;

    if (isRefresh) setRefreshing(true); else if (isInitial) setLoading(true);

    try {
      const params: Record<string, string> = { page: String(targetPage), size: "25" };
      if (search) params.search = search;

      const res = await fetchCenterpointOpportunities(params);
      if (!res.ok) throw new Error(`Server error ${res.status}`);

      const data = await res.json();
      if (data?.data) {
        if (isInitial) setOpps(data.data);
        else setOpps(prev => [...prev, ...data.data]);
        setTotal(data.meta?.total ?? 0);
      }
    } catch {
      /* non-fatal */
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [search, page]);

  const fetchCount = useCallback(async () => {
    try {
      const res = await fetchOpportunitiesSyncStatus();
      const data = await res.json();
      setTotalCached(data.total_cached ?? 0);
    } catch {}
  }, []);

  const handleSync = async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res  = await triggerOpportunitiesSync();
      const data = await res.json();
      if (data.ok) {
        const parts = [];
        if (data.discovered > 0) parts.push(`${data.discovered} discovered`);
        if (data.refreshed  > 0) parts.push(`${data.refreshed} refreshed`);
        setSyncResult(parts.length ? parts.join(" · ") : "Up to date");
        setTimeout(() => {
          setOpps([]);
          fetchOpps({ refresh: true, newPage: 1 });
          fetchCount();
        }, 400);
      } else {
        setSyncResult(`Error: ${data.error}`);
      }
    } catch (e: any) {
      setSyncResult(`Error: ${e.message}`);
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => { fetchCount(); }, [fetchCount]);
  useEffect(() => {
    setPage(1);
    fetchOpps({ newPage: 1 });
  }, [search]);

  const handleLoadMore = () => {
    const next = page + 1;
    setPage(next);
    fetchOpps({ newPage: next });
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
  };

  const stageIndex = (stageKey: string) => CP_STAGES.findIndex(s => s.key === stageKey);

  return (
    <div className="flex flex-col h-full">

      {/* Header */}
      <div className="p-8 pb-0 space-y-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => window.dispatchEvent(new CustomEvent("changeView", { detail: "dashboard" }))}
            className="p-3 rounded-[14px] bg-white/5 border border-white/10 hover:bg-white hover:text-black transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="min-w-0 flex-1">
            <h2 className="text-2xl font-inter font-medium tracking-tight">Opportunities</h2>
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              <p className="text-sm text-[#567090]">
                {total.toLocaleString()} opportunities
                {totalCached > 0 && ` · ${totalCached.toLocaleString()} cached`}
              </p>
              {syncResult && (
                <span className="text-[10px] font-mono text-[#7C3AED]/70">{syncResult}</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {/* Refresh status from CenterPoint */}
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
            {/* Reload list from Supabase */}
            <button
              onClick={() => fetchOpps({ refresh: true, newPage: 1 })}
              className={cn("p-3 bg-white/5 border border-white/10 rounded-[14px] hover:bg-white/10 transition-all", refreshing && "animate-spin")}
            >
              <RefreshCw className="w-4 h-4 text-[#7090B0]" />
            </button>
          </div>
        </div>

        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="relative">
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
      </div>

      {/* Opportunity list */}
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
            <p className="text-sm mt-1 text-[#567090]">Complete a session to create an opportunity in CenterPoint</p>
          </div>
        ) : (
          <>
            {opps.map(opp => {
              const stage = STATUS_CHIP[opp.status] ?? STATUS_CHIP["lead_opened"];
              const isDead = opp.status === "lead_dead";
              const currentStageKey = resolveStageKey(opp.status, opp.display_status, opp.workflow_stage_name ?? null);
              const currentIdx = stageIndex(currentStageKey);
              const isExpanded = expandedId === opp.id;
              const address = extractAddress(opp.description);
              const typeColors = OPP_TYPE_COLORS[opp.opportunity_type ?? ""] ?? { bg: "rgba(255,255,255,0.04)", fg: "#567090" };

              return (
                <motion.div
                  key={opp.id}
                  layout
                  className="rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:border-white/15 transition-all overflow-hidden"
                >
                  {/* Row */}
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : opp.id)}
                    className="w-full p-6 text-left flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-5 min-w-0">
                      {/* Status chip */}
                      <span
                        className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded shrink-0"
                        style={{
                          background: stage.chip.bg,
                          color: stage.chip.fg,
                          fontSize: 11,
                          fontFamily: "'Inter', system-ui, sans-serif",
                          fontWeight: 400,
                          whiteSpace: "nowrap",
                        }}
                      >
                        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: stage.chip.dot }} />
                        {stage.label}
                      </span>

                      <div className="min-w-0">
                        <div className="flex items-center gap-3 mb-0.5 flex-wrap">
                          <span className="text-base font-inter font-medium text-[#E8EDF8] truncate">
                            {address || opp.name}
                          </span>
                          <span className="text-[9px] font-mono text-[#3F5878] tracking-widest">#{opp.name}</span>
                        </div>
                        <div className="flex items-center gap-3 flex-wrap">
                          {opp.opportunity_type && (
                            <span
                              className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-mono uppercase tracking-wider"
                              style={{ background: typeColors.bg, color: typeColors.fg }}
                            >
                              {opp.opportunity_type}
                            </span>
                          )}
                          {opp.domain && (
                            <span className="text-[10px] font-mono text-[#3F5878] uppercase tracking-wider">{opp.domain}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-6 shrink-0">
                      {opp.price > 0 && (
                        <div className="text-right hidden md:block">
                          <p className="text-[9px] font-mono text-[#2D4060] uppercase tracking-widest mb-0.5">Value</p>
                          <p
                            className="text-sm font-inter font-normal text-[#E8EDF8]"
                            style={{ fontFeatureSettings: '"ss01" 1, "tnum" 1', letterSpacing: "-0.42px" }}
                          >
                            ${opp.price.toLocaleString()}
                          </p>
                        </div>
                      )}
                      <ChevronRight className={cn("w-4 h-4 text-[#2D4060] transition-transform duration-200", isExpanded && "rotate-90")} />
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
                          {!isDead && (
                            <div>
                              <p className="text-[9px] font-mono text-[#3F5878] uppercase tracking-widest mb-3">Stage Pipeline</p>
                              <div className="flex items-center gap-1 flex-wrap">
                                {CP_STAGES.map((s, i) => {
                                  const isPast    = i < currentIdx;
                                  const isCurrent = i === currentIdx;
                                  const activeColor =
                                    s.key === "accepted"  ? "bg-[#2a8a82]/20 text-[#3aada3] border-[#2a8a82]/30" :
                                    s.key === "pending"   ? "bg-[#d6a800]/15 text-[#f0c000] border-[#d6a800]/30" :
                                    s.key === "quoted"    ? "bg-[#7C3AED]/15 text-[#a78bfa] border-[#7C3AED]/30" :
                                                            "bg-[#2563ba]/20 text-[#4a8fd4] border-[#2563ba]/30";
                                  return (
                                    <div key={s.key} className="flex items-center gap-1 shrink-0">
                                      <div className={cn(
                                        "px-3 py-1.5 rounded-lg text-[9px] font-mono uppercase tracking-widest border transition-all",
                                        isCurrent ? activeColor + " ring-1 ring-white/20" :
                                        isPast    ? "bg-white/5 text-[#2D4060] border-white/5" :
                                                    "bg-transparent text-[#293A58] border-white/[0.04]"
                                      )}>
                                        {s.label}
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

                          {isDead && (
                            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10 w-fit">
                              <X className="w-3.5 h-3.5 text-[#567090]" />
                              <span className="text-[10px] font-mono text-[#567090] uppercase tracking-widest">Lead Dead — no further action</span>
                            </div>
                          )}

                          {/* Meta grid */}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {[
                              { label: "Job #",        value: opp.name },
                              { label: "Type",         value: opp.opportunity_type ?? "—" },
                              { label: "Domain",       value: opp.domain ?? "—" },
                              { label: "Status",       value: opp.display_status || opp.status || "—" },
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
                            <div className="pt-1 border-t border-white/[0.05]">
                              <p className="text-[9px] font-mono text-[#354D6F] uppercase tracking-widest mb-1">Description</p>
                              <p className="text-xs text-[#7090B0] font-inter">{opp.description}</p>
                            </div>
                          )}

                          {/* View in CP Inbox link */}
                          <div className="pt-2 border-t border-white/[0.05]">
                            <button
                              onClick={() => {
                                window.dispatchEvent(new CustomEvent("changeView", { detail: "centerpoint" }));
                              }}
                              className="flex items-center gap-2 px-4 py-2.5 rounded-[14px] bg-white/[0.03] border border-white/[0.08] text-[#567090] text-[10px] font-mono uppercase tracking-widest hover:bg-white/[0.07] hover:text-[#7090B0] hover:border-white/15 active:scale-95 transition-all"
                            >
                              <CheckCircle2 className="w-3 h-3" />
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
                onClick={handleLoadMore}
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
