"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Search,
  Clock,
  ChevronRight,
  LayoutGrid,
  CheckCircle2,
  Calendar,
  CalendarDays,
  User,
  ArrowLeft,
  ArrowRight,
  AlertCircle,
  Settings,
  UserPlus,
  Trash,
  Info,
  PlayCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createSession, saveSession, listDrafts } from "@/lib/session";
import { getLiveReps, saveCustomRep, deleteCustomRep } from "@/lib/reps";
import type { RepIdentity } from "@/config/reps";
import type { AuthenticatedRep } from "@/lib/rep-identity";
import { motion, AnimatePresence } from "framer-motion";
import { CenterPointJobs } from "@/components/CenterPointJobs";
import { HustadTickets } from "@/components/HustadTickets";
import { PipelineLeads } from "@/components/PipelineLeads";

interface Props {
  currentRep: AuthenticatedRep;
  onLoadDraft: (id: string) => void;
  onNewSession: () => void;
  onBack?: () => void;
}

export function RepCommandCenter({ currentRep, onLoadDraft, onNewSession, onBack }: Props) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<string>("all");
  const [view, setView] = useState<"dashboard" | "pipeline" | "centerpoint" | "tickets" | "settings">("dashboard");
  const [liveReps, setLiveReps] = useState<RepIdentity[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newRep, setNewRep] = useState({ name: "", role: "" });

  const [serverSessions, setServerSessions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [scheduledLeads, setScheduledLeads] = useState<any[]>([]);

  useEffect(() => {
    setLiveReps(getLiveReps());

    const loadServerData = async () => {
      setIsLoading(true);
      try {
        const { fetchSessionsFromServer } = await import("@/lib/sync");
        const sessions = await fetchSessionsFromServer();
        setServerSessions(sessions);
      } catch (e) {
        console.warn("Failed to fetch server sessions", e);
      } finally {
        setIsLoading(false);
      }
    };

    const loadScheduledLeads = async () => {
      try {
        const res = await fetch(`/api/pipeline?t=${Date.now()}`);
        const data = await res.json();
        if (Array.isArray(data)) {
          setScheduledLeads(data.filter((l: any) => l.pipeline_status === 'scheduled'));
        }
      } catch (e) {
        console.warn("Failed to fetch scheduled leads", e);
      }
    };

    loadServerData();
    loadScheduledLeads();
  }, [view]);

  // Handle importing a job from CenterPoint to the active Pipeline
  useEffect(() => {
    const handleImportJob = (e: Event) => {
      const customEvent = e as CustomEvent<any>;
      const job = customEvent.detail;
      const attr = job.attributes;
      
      const repInfo = currentRep;
      
      // Initialize a new session with the rep's identity
      const newSession = createSession(repInfo.id, repInfo.name, repInfo.email);
      
      // Map CenterPoint data to SessionState property context
      newSession.centerpointId = job.id;
      newSession.property.address = attr.propertyName || "Unknown Address";
      newSession.property.homeownerPrimaryName = "";
      newSession.sessionStatus = "phase_a_active"; 
      
      // Persist to local storage and trigger the dashboard view
      saveSession(newSession);
      
      // Auto-transition to dashboard to show the new ticket
      setView("dashboard");
    };

    const handleLaunchPipelineSession = async (e: Event) => {
      const customEvent = e as CustomEvent<any>;
      const lead = customEvent.detail;
      const repInfo = currentRep;
      
      const newSession = createSession(repInfo.id, repInfo.name, repInfo.email);
      newSession.centerpointId = lead.cpc_ticket_id;
      newSession.property.address = lead.centerpoint_jobs?.property_name || lead.centerpoint_jobs?.name || "Unknown Address";
      newSession.property.homeownerPrimaryName = lead.centerpoint_jobs?.raw?._owner || "";
      newSession.sessionStatus = "phase_a_active"; 
      
      saveSession(newSession);
      
      // Update pipeline lead status to 'inspection_in_progress'
      try {
        await fetch(`/api/pipeline/${lead.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pipeline_status: 'inspection_in_progress' })
        });
      } catch (err) {
        console.error("Failed to update pipeline status", err);
      }

      onLoadDraft(newSession.sessionId);
    };

    const handleChangeView = (e: Event) => {
      const customEvent = e as CustomEvent<any>;
      setView(customEvent.detail);
    };

    window.addEventListener('importCenterPointJob', handleImportJob);
    window.addEventListener('launchPipelineSession', handleLaunchPipelineSession);
    window.addEventListener('changeView', handleChangeView);
    return () => {
      window.removeEventListener('importCenterPointJob', handleImportJob);
      window.removeEventListener('launchPipelineSession', handleLaunchPipelineSession);
      window.removeEventListener('changeView', handleChangeView);
    };
  }, [currentRep]);

  const drafts = useMemo(() => {
    const local = listDrafts(currentRep.id);
    // Merge server sessions into local drafts if they don't exist locally
    const merged = [...local];
    serverSessions.forEach(s => {
      if (!merged.find(m => m.sessionId === s.session_id)) {
        merged.push({
          sessionId: s.session_id,
          address: s.property_address || "Untitled Property",
          homeownerName: s.homeowner_name || "Unknown Owner",
          repName: s.rep_name || "Unknown Rep",
          lastSavedAt: s.updated_at,
          sessionStatus: s.session_status,
          outcomeType: s.outcome_type,
          syncStatus: "synced",
          hasFollowUp: false,
          missingFieldsCount: 0
        });
      }
    });
    return merged.sort((a, b) => new Date(b.lastSavedAt).getTime() - new Date(a.lastSavedAt).getTime());
  }, [serverSessions]);

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
      pending: drafts.filter(d => d.sessionStatus === "deferred" || d.sessionStatus === "summary_locked").length,
      missing: drafts.filter(d => d.missingFieldsCount > 0).length,
      synced: drafts.filter(d => d.syncStatus === "synced").length
    };
  }, [drafts]);

  return (
    <div className="flex flex-col h-full bg-[#060606] text-white">
      {/* Header */}
      <div className="p-8 pb-0 space-y-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {onBack && (
              <button
                onClick={onBack}
                className="p-3 rounded-2xl bg-white/5 border border-white/10 hover:bg-white hover:text-black transition-all shrink-0"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <div className="space-y-1">
              <h1 className="text-3xl font-display font-medium tracking-tight">
                {{ dashboard: "Rep Command Center", pipeline: "Sales Pipeline", centerpoint: "CP Inbox", tickets: "Hustad Tickets", settings: "System Settings" }[view]}
              </h1>
              <p className="text-sm text-white/50 font-light">
                {{ dashboard: "Field intelligence and session management.", pipeline: "Manage leads from reach-out to appointment scheduling.", centerpoint: "Jobs synced from CenterPoint Connect.", tickets: "Your managed pipeline — stages, touches, and write-back.", settings: "Manage field identities and operational parameters." }[view]}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Tab switcher */}
            <div className="flex items-center gap-1 p-1 bg-white/5 border border-white/10 rounded-full">
              {([
                { id: "dashboard", label: "Inspections" },
                { id: "pipeline", label: "Pipeline" },
                { id: "centerpoint", label: "CP Inbox" },
                { id: "tickets", label: "Tickets" },
                { id: "settings", label: "Settings" },
              ] as const).map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setView(tab.id)}
                  className={cn(
                    "px-4 py-2 rounded-full text-xs font-display transition-all",
                    view === tab.id ? "bg-white text-black" : "text-white/40 hover:text-white"
                  )}
                >{tab.label}</button>
              ))}
            </div>
            {view === "dashboard" && (
              <button
                onClick={onNewSession}
                className="px-6 py-3 bg-white text-black rounded-full font-display font-medium text-sm hover:bg-white/90 transition-all flex items-center gap-2"
              >
                New Inspection
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {view === "dashboard" && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Active Drafts", value: stats.active, icon: Clock, color: "text-indigo-400", bg: "bg-indigo-500/5" },
                { label: "Pending Auth", value: stats.pending, icon: CheckCircle2, color: "text-emerald-400", bg: "bg-emerald-500/5" },
                { label: "Missing Data", value: stats.missing, icon: AlertCircle, color: "text-rose-400", bg: "bg-rose-500/5" },
                { label: "Cloud Synced", value: stats.synced, icon: CheckCircle2, color: "text-sky-400", bg: "bg-sky-500/5" },
              ].map((s, i) => (
                <div key={i} className={cn("p-6 rounded-[32px] border border-white/[0.08] backdrop-blur-xl transition-all hover:border-white/20 hover:bg-white/[0.02] group", s.bg)}>
                  <div className="flex items-center justify-between mb-4">
                    <div className={cn("p-2 rounded-xl bg-white/5", s.color)}>
                      <s.icon className="w-4 h-4" />
                    </div>
                    <span className="text-[9px] font-mono text-white/30 uppercase tracking-[0.2em] group-hover:text-white/50 transition-colors">Live Status</span>
                  </div>
                  <p className="text-3xl font-display font-semibold tracking-tight mb-1">{s.value}</p>
                  <p className="text-[10px] font-mono text-white/40 uppercase tracking-widest">{s.label}</p>
                </div>
              ))}
            </div>

            <div className="flex flex-col md:flex-row items-center gap-4">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <input 
                  type="text" 
                  placeholder="Search by address or homeowner..." 
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-white/[0.03] border border-white/[0.1] rounded-2xl py-3.5 pl-12 pr-6 text-sm outline-none focus:border-indigo-500/50 transition-all"
                />
              </div>
              <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 w-full md:w-auto">
                {[
                  { id: "all", label: "All" },
                  { id: "missing", label: "Attention" },
                  { id: "full_restoration_candidate", label: "Restoration" },
                  { id: "claim_review_candidate", label: "Claims" },
                  { id: "repair_only", label: "Repairs" },
                  { id: "no_damage", label: "No Damage" }
                ].map(f => (
                  <button
                    key={f.id}
                    onClick={() => setFilter(f.id)}
                    className={cn(
                      "px-4 py-2 rounded-full border text-xs font-display transition-all whitespace-nowrap",
                      filter === f.id 
                        ? "bg-white text-black border-white" 
                        : "bg-white/5 border-white/10 text-white/60 hover:bg-white/10"
                    )}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-8">
        {view === "centerpoint" ? (
          <CenterPointJobs />
        ) : view === "pipeline" ? (
          <PipelineLeads />
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
                            <p className="text-sm font-display font-medium text-white">
                              {lead.centerpoint_jobs?.property_name || lead.centerpoint_jobs?.name || lead.cpc_ticket_id}
                            </p>
                            <p className="text-[10px] font-mono text-white/35 uppercase tracking-wider mt-0.5">
                              {dateStr}{timeStr ? ` · ${timeStr}` : ""}
                              {lead.centerpoint_jobs?.raw?._owner ? ` · ${lead.centerpoint_jobs.raw._owner}` : ""}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => window.dispatchEvent(new CustomEvent("launchPipelineSession", { detail: lead }))}
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
                  <button
                    key={d.sessionId}
                    onClick={() => onLoadDraft(d.sessionId)}
                    className="w-full group p-6 rounded-[32px] bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.04] hover:border-white/20 transition-all text-left relative overflow-hidden"
                  >
                    {/* Subtle hover gradient */}
                    <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/0 via-indigo-500/0 to-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                      <div className="space-y-4">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "px-3 py-1 rounded-full font-mono text-[9px] uppercase tracking-widest border",
                            d.syncStatus === "synced" 
                              ? "bg-emerald-500/5 text-emerald-400 border-emerald-500/20" 
                              : "bg-amber-500/5 text-amber-400 border-amber-500/20"
                          )}>
                            {d.syncStatus === "synced" ? "Cloud Synced" : "Local Storage"}
                          </div>
                          {d.missingFieldsCount > 0 && (
                            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/5 border border-rose-500/20 text-[9px] font-mono text-rose-400 uppercase tracking-widest">
                              <AlertCircle className="w-3 h-3" />
                              {d.missingFieldsCount} Incomplete
                            </div>
                          )}
                        </div>
                        <div className="space-y-1">
                          <p className="text-xl font-display font-medium tracking-tight group-hover:text-indigo-300 transition-colors">{d.address}</p>
                          <div className="flex items-center gap-6 text-[11px] font-mono text-white/40 uppercase tracking-wider">
                            <span className="flex items-center gap-2"><User className="w-3.5 h-3.5 text-indigo-400/50" /> {d.homeownerName || "No Owner Listed"}</span>
                            <span className="flex items-center gap-2"><Calendar className="w-3.5 h-3.5 text-indigo-400/50" /> {new Date(d.lastSavedAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-8">
                        <div className="text-right hidden md:block">
                          <p className="text-[9px] font-mono text-white/20 uppercase tracking-[0.2em] mb-1.5">Operational Phase</p>
                          <p className="text-[10px] font-mono font-medium text-white/60 tracking-widest">
                            {d.sessionStatus.replace(/_/g, " ").toUpperCase()}
                          </p>
                        </div>
                        <div className="h-14 w-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-white group-hover:scale-105 transition-all">
                          <ChevronRight className="w-6 h-6 text-white group-hover:text-black transition-colors" />
                        </div>
                      </div>
                    </div>
                  </button>
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
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h3 className="text-xl font-display font-medium">Field Operatives</h3>
                <p className="text-xs text-white/40">Add or manage reps authorized for forensic sessions.</p>
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
                  <button onClick={() => setIsAdding(false)} className="text-xs text-white/40 px-4">Cancel</button>
                  <button 
                    onClick={() => {
                      saveCustomRep({ id: `custom_${Date.now()}`, name: newRep.name, role: newRep.role, active: true });
                      setIsAdding(false);
                      setNewRep({ name: "", role: "" });
                      setLiveReps(getLiveReps());
                    }}
                    className="bg-indigo-500 text-white px-6 py-2 rounded-full text-xs font-medium"
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
                      <User className="w-5 h-5 text-white/40" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{rep.name}</p>
                      <p className="text-[10px] font-mono text-white/30 uppercase tracking-widest">{rep.role}</p>
                    </div>
                  </div>
                  {rep.id.startsWith("custom_") && (
                    <button 
                      onClick={() => { deleteCustomRep(rep.id); setLiveReps(getLiveReps()); }}
                      className="p-2 text-white/10 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-all"
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
    </div>
  );
}
