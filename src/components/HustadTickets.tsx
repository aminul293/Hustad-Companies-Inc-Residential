"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, ChevronRight, RefreshCw, Ticket, ArrowRight, Phone, Mail, MessageSquare, User, Plus, CheckCircle2, AlertCircle, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

// ─── Hustad ticket pipeline ────────────────────────────────────────────────────
const STAGES: Record<string, { label: string; next: string | null; color: string; ring: string; cpWriteback?: string }> = {
  new:             { label: "New",          next: "contacted",       color: "bg-sky-500/20 text-sky-300 border-sky-500/30",         ring: "bg-sky-500" },
  contacted:       { label: "Contacted",    next: "appointment_set", color: "bg-blue-500/20 text-blue-300 border-blue-500/30",       ring: "bg-blue-500" },
  appointment_set: { label: "Appt Set",     next: "inspection_done", color: "bg-violet-500/20 text-violet-300 border-violet-500/30", ring: "bg-violet-500" },
  inspection_done: { label: "Inspected",    next: "estimate_sent",   color: "bg-purple-500/20 text-purple-300 border-purple-500/30", ring: "bg-purple-500" },
  estimate_sent:   { label: "Quoted",       next: "follow_up",       color: "bg-amber-500/20 text-amber-300 border-amber-500/30",    ring: "bg-amber-500" },
  follow_up:       { label: "Follow Up",    next: "signed",          color: "bg-orange-500/20 text-orange-300 border-orange-500/30", ring: "bg-orange-500" },
  signed:          { label: "Signed",       next: "job_scheduled",   color: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30", ring: "bg-emerald-500", cpWriteback: "lead_sold" },
  job_scheduled:   { label: "Scheduled",    next: "job_started",     color: "bg-teal-500/20 text-teal-300 border-teal-500/30",       ring: "bg-teal-500",   cpWriteback: "scheduled" },
  job_started:     { label: "In Progress",  next: "job_completed",   color: "bg-indigo-500/20 text-indigo-300 border-indigo-500/30", ring: "bg-indigo-500", cpWriteback: "started" },
  job_completed:   { label: "Completed",    next: "invoiced",        color: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",       ring: "bg-cyan-500",   cpWriteback: "completed" },
  invoiced:        { label: "Invoiced",     next: "closed_won",      color: "bg-lime-500/20 text-lime-300 border-lime-500/30",       ring: "bg-lime-500",   cpWriteback: "invoiced" },
  closed_won:      { label: "Closed Won",   next: null,              color: "bg-green-500/20 text-green-300 border-green-500/30",    ring: "bg-green-500",  cpWriteback: "closed" },
  closed_lost:     { label: "Closed Lost",  next: null,              color: "bg-rose-500/20 text-rose-300 border-rose-500/30",       ring: "bg-rose-500",   cpWriteback: "lead_dead" },
};

const STAGE_ORDER = ["new","contacted","appointment_set","inspection_done","estimate_sent","follow_up","signed","job_scheduled","job_started","job_completed","invoiced","closed_won"];

const STAGE_FILTERS = [
  { id: "", label: "All" },
  { id: "new", label: "New" },
  { id: "contacted", label: "Contacted" },
  { id: "appointment_set", label: "Appt Set" },
  { id: "inspection_done", label: "Inspected" },
  { id: "estimate_sent", label: "Quoted" },
  { id: "follow_up", label: "Follow Up" },
  { id: "signed", label: "Signed" },
  { id: "job_scheduled", label: "Scheduled" },
  { id: "job_started", label: "In Progress" },
  { id: "job_completed", label: "Completed" },
  { id: "invoiced", label: "Invoiced" },
  { id: "closed_won", label: "Closed Won" },
  { id: "closed_lost", label: "Closed Lost" },
];

const TOUCH_METHODS = ["call", "text", "email", "in_person", "door_knock"] as const;
const TOUCH_OUTCOMES = ["reached", "voicemail", "no_answer", "scheduled", "not_interested", "callback_requested"] as const;

const METHOD_ICONS: Record<string, typeof Phone> = {
  call: Phone, text: MessageSquare, email: Mail,
  in_person: User, door_knock: User,
};

interface Touch {
  id: string;
  rep_name: string;
  method: string;
  outcome: string;
  notes: string;
  occurred_at: string;
}

interface HustadTicket {
  id: string;
  cp_job_id: string | null;
  cp_job_name: string | null;
  property_name: string;
  property_address: string;
  client_name: string;
  client_email: string;
  client_phone: string;
  assigned_rep_name: string;
  stage: string;
  notes: string;
  price: number;
  last_cp_writeback_stage: string | null;
  last_cp_writeback_at: string | null;
  promoted_at: string;
  updated_at: string;
  ticket_touches: Touch[];
}

export function HustadTickets() {
  const [tickets, setTickets] = useState<HustadTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [stageFilter, setStageFilter] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [advancingId, setAdvancingId] = useState<string | null>(null);
  const [addingTouchId, setAddingTouchId] = useState<string | null>(null);
  const [touchForm, setTouchForm] = useState({ method: "call", outcome: "reached", notes: "", rep_name: "" });
  const [savingTouch, setSavingTouch] = useState(false);
  const [editingNotes, setEditingNotes] = useState<string | null>(null);
  const [notesValue, setNotesValue] = useState("");

  const fetchTickets = useCallback(async (opts?: { refresh?: boolean; newPage?: number }) => {
    const isRefresh = opts?.refresh;
    const targetPage = opts?.newPage ?? page;
    if (isRefresh) setRefreshing(true); else setLoading(true);

    try {
      const params = new URLSearchParams({ page: String(targetPage) });
      if (search) params.set("search", search);
      if (stageFilter) params.set("stage", stageFilter);

      const res = await fetch(`/api/tickets?${params}`);
      const data = await res.json();

      if (data?.data) {
        if (targetPage === 1) setTickets(data.data);
        else setTickets(prev => [...prev, ...data.data]);
        setTotal(data.meta?.page?.total ?? 0);
      }
    } catch (e) {
      console.error("Tickets fetch error", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [search, stageFilter, page]);

  useEffect(() => {
    setPage(1);
    fetchTickets({ newPage: 1 });
  }, [search, stageFilter]);

  const handleAdvanceStage = async (ticket: HustadTicket, nextStage: string) => {
    setAdvancingId(ticket.id);
    try {
      const res = await fetch(`/api/tickets/${ticket.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage: nextStage }),
      });
      if (res.ok) {
        setTickets(prev => prev.map(t =>
          t.id === ticket.id ? { ...t, stage: nextStage } : t
        ));
      }
    } catch (e) {
      console.error("Stage advance failed", e);
    } finally {
      setAdvancingId(null);
    }
  };

  const handleAddTouch = async (ticket: HustadTicket) => {
    setSavingTouch(true);
    try {
      const res = await fetch(`/api/tickets/${ticket.id}/touches`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(touchForm),
      });
      if (res.ok) {
        const data = await res.json();
        setTickets(prev => prev.map(t =>
          t.id === ticket.id
            ? { ...t, ticket_touches: [data.touch, ...t.ticket_touches] }
            : t
        ));
        setAddingTouchId(null);
        setTouchForm({ method: "call", outcome: "reached", notes: "", rep_name: "" });
      }
    } catch (e) {
      console.error("Touch failed", e);
    } finally {
      setSavingTouch(false);
    }
  };

  const handleSaveNotes = async (ticket: HustadTicket) => {
    try {
      await fetch(`/api/tickets/${ticket.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: notesValue }),
      });
      setTickets(prev => prev.map(t =>
        t.id === ticket.id ? { ...t, notes: notesValue } : t
      ));
    } catch (e) {
      console.error("Notes save failed", e);
    } finally {
      setEditingNotes(null);
    }
  };

  const stageIndex = (s: string) => STAGE_ORDER.indexOf(s);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-8 pb-0 space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => window.dispatchEvent(new CustomEvent('changeView', { detail: 'dashboard' }))}
              className="p-3 rounded-full bg-white/5 border border-white/10 hover:bg-white hover:text-black transition-all"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h2 className="text-2xl font-display font-medium tracking-tight">Hustad Tickets</h2>
              <p className="text-sm text-white/40 mt-1">
                {total.toLocaleString()} tickets · managed pipeline
              </p>
            </div>
          </div>
          <button
            onClick={() => fetchTickets({ refresh: true, newPage: 1 })}
            className={cn("p-3 bg-white/5 border border-white/10 rounded-full hover:bg-white/10 transition-all", refreshing && "animate-spin")}
          >
            <RefreshCw className="w-4 h-4 text-white/50" />
          </button>
        </div>

        {/* Search */}
        <form onSubmit={(e) => { e.preventDefault(); setSearch(searchInput); }} className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <input
            type="text"
            placeholder="Search by property, client, or job number..."
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
          {STAGE_FILTERS.map(f => (
            <button
              key={f.id}
              onClick={() => setStageFilter(f.id)}
              className={cn(
                "px-4 py-2 rounded-full border text-xs font-display transition-all whitespace-nowrap shrink-0",
                stageFilter === f.id ? "bg-white text-black border-white" : "bg-white/5 border-white/10 text-white/50 hover:bg-white/10"
              )}
            >{f.label}</button>
          ))}
        </div>
      </div>

      {/* Ticket list */}
      <div className="flex-1 overflow-y-auto p-8 space-y-3">
        {loading ? (
          <div className="py-20 flex flex-col items-center gap-4 opacity-40">
            <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            <p className="text-sm font-mono text-white/40">Loading tickets...</p>
          </div>
        ) : tickets.length === 0 ? (
          <div className="py-20 text-center opacity-30">
            <Ticket className="w-12 h-12 mx-auto mb-4" />
            <p className="font-display">No tickets yet</p>
            <p className="text-xs text-white/40 mt-2">Push jobs from CenterPoint to create tickets</p>
          </div>
        ) : (
          <>
            {tickets.map((ticket) => {
              const stage = STAGES[ticket.stage] ?? STAGES.new;
              const nextStage = stage.next;
              const isExpanded = expandedId === ticket.id;
              const currentIndex = stageIndex(ticket.stage);
              const touches = ticket.ticket_touches ?? [];
              const lastTouch = touches[0];

              return (
                <motion.div
                  key={ticket.id}
                  layout
                  className="rounded-[28px] bg-white/[0.02] border border-white/[0.06] hover:border-white/15 transition-all overflow-hidden"
                >
                  {/* Ticket row */}
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : ticket.id)}
                    className="w-full p-6 text-left flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-5 min-w-0">
                      <div className={cn("w-2.5 h-2.5 rounded-full shrink-0", stage.ring)} />
                      <div className="min-w-0">
                        <div className="flex items-center gap-3 mb-1 flex-wrap">
                          <span className="text-base font-display font-medium text-white truncate">
                            {ticket.property_name}
                          </span>
                          {ticket.cp_job_name && (
                            <span className="text-[9px] font-mono text-white/30 tracking-widest">#{ticket.cp_job_name}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 flex-wrap">
                          <span className={cn("px-2.5 py-0.5 rounded-full text-[9px] font-mono uppercase tracking-widest border", stage.color)}>
                            {stage.label}
                          </span>
                          {ticket.client_name && (
                            <span className="text-[10px] font-mono text-white/30">{ticket.client_name}</span>
                          )}
                          {lastTouch && (
                            <span className="text-[10px] font-mono text-white/25">
                              Last touch: {new Date(lastTouch.occurred_at).toLocaleDateString()} · {lastTouch.outcome.replace(/_/g, " ")}
                            </span>
                          )}
                          {touches.length === 0 && (
                            <span className="flex items-center gap-1 text-[10px] font-mono text-amber-500/50">
                              <AlertCircle className="w-3 h-3" /> No touches yet
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-6 shrink-0">
                      <div className="text-right hidden md:block">
                        <p className="text-[9px] font-mono text-white/20 uppercase tracking-widest mb-0.5">Touches</p>
                        <p className="text-sm font-display font-medium text-white">{touches.length}</p>
                      </div>
                      {ticket.price > 0 && (
                        <div className="text-right hidden md:block">
                          <p className="text-[9px] font-mono text-white/20 uppercase tracking-widest mb-0.5">Value</p>
                          <p className="text-sm font-display font-medium text-white">${Number(ticket.price).toLocaleString()}</p>
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
                            <p className="text-[9px] font-mono text-white/30 uppercase tracking-widest mb-3">Pipeline</p>
                            <div className="flex items-center gap-1 overflow-x-auto pb-2">
                              {STAGE_ORDER.map((s, i) => {
                                const isPast = i < currentIndex;
                                const isCurrent = i === currentIndex;
                                const stg = STAGES[s];
                                return (
                                  <div key={s} className="flex items-center gap-1 shrink-0">
                                    <div className={cn(
                                      "px-3 py-1.5 rounded-full text-[9px] font-mono uppercase tracking-widest border transition-all",
                                      isCurrent ? stg.color + " ring-1 ring-white/20" :
                                      isPast ? "bg-white/5 text-white/20 border-white/5" :
                                      "bg-transparent text-white/15 border-white/[0.04]"
                                    )}>
                                      {stg.label}
                                    </div>
                                    {i < STAGE_ORDER.length - 1 && (
                                      <div className={cn("w-4 h-[1px]", isPast ? "bg-white/20" : "bg-white/[0.05]")} />
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {/* Meta grid */}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {[
                              { label: "Client", value: ticket.client_name || "—" },
                              { label: "Phone", value: ticket.client_phone || "—" },
                              { label: "Email", value: ticket.client_email || "—" },
                              { label: "Rep", value: ticket.assigned_rep_name || "—" },
                              { label: "CP Job", value: ticket.cp_job_name ? `#${ticket.cp_job_name}` : "—" },
                              { label: "Price", value: ticket.price > 0 ? `$${Number(ticket.price).toLocaleString()}` : "—" },
                              { label: "Promoted", value: new Date(ticket.promoted_at).toLocaleDateString() },
                              { label: "CP Writeback", value: ticket.last_cp_writeback_stage
                                  ? `${ticket.last_cp_writeback_stage} · ${new Date(ticket.last_cp_writeback_at!).toLocaleDateString()}`
                                  : "None yet" },
                            ].map(item => (
                              <div key={item.label} className="space-y-1">
                                <p className="text-[9px] font-mono text-white/25 uppercase tracking-widest">{item.label}</p>
                                <p className="text-xs text-white/70 font-display">{item.value}</p>
                              </div>
                            ))}
                          </div>

                          {/* Notes */}
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-[9px] font-mono text-white/30 uppercase tracking-widest">Notes</p>
                              {editingNotes === ticket.id ? (
                                <div className="flex items-center gap-2">
                                  <button onClick={() => setEditingNotes(null)} className="text-[10px] text-white/30 hover:text-white/60">Cancel</button>
                                  <button onClick={() => handleSaveNotes(ticket)} className="text-[10px] text-indigo-400 hover:text-indigo-300">Save</button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => { setEditingNotes(ticket.id); setNotesValue(ticket.notes || ""); }}
                                  className="text-[10px] font-mono text-white/25 hover:text-white/60 uppercase tracking-widest"
                                >Edit</button>
                              )}
                            </div>
                            {editingNotes === ticket.id ? (
                              <textarea
                                value={notesValue}
                                onChange={(e) => setNotesValue(e.target.value)}
                                rows={3}
                                className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-sm text-white/70 outline-none focus:border-indigo-500/50 resize-none"
                              />
                            ) : (
                              <p className="text-sm text-white/40 font-display">{ticket.notes || "No notes yet."}</p>
                            )}
                          </div>

                          {/* Touch log */}
                          <div>
                            <div className="flex items-center justify-between mb-3">
                              <p className="text-[9px] font-mono text-white/30 uppercase tracking-widest">
                                Touch Log · {touches.length} contacts
                              </p>
                              <button
                                onClick={() => setAddingTouchId(addingTouchId === ticket.id ? null : ticket.id)}
                                className="flex items-center gap-1.5 text-[10px] font-mono text-indigo-400/70 hover:text-indigo-300 uppercase tracking-widest"
                              >
                                <Plus className="w-3 h-3" />
                                Add Touch
                              </button>
                            </div>

                            {/* Add touch form */}
                            <AnimatePresence>
                              {addingTouchId === ticket.id && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: "auto", opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  className="overflow-hidden mb-3"
                                >
                                  <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08] space-y-3">
                                    <div className="grid grid-cols-2 gap-3">
                                      <div>
                                        <p className="text-[9px] font-mono text-white/30 uppercase tracking-widest mb-1.5">Method</p>
                                        <div className="flex flex-wrap gap-1.5">
                                          {TOUCH_METHODS.map(m => (
                                            <button key={m}
                                              onClick={() => setTouchForm(f => ({ ...f, method: m }))}
                                              className={cn(
                                                "px-3 py-1 rounded-full text-[10px] font-mono border transition-all",
                                                touchForm.method === m ? "bg-white text-black border-white" : "bg-white/5 border-white/10 text-white/40 hover:bg-white/10"
                                              )}
                                            >{m.replace(/_/g, " ")}</button>
                                          ))}
                                        </div>
                                      </div>
                                      <div>
                                        <p className="text-[9px] font-mono text-white/30 uppercase tracking-widest mb-1.5">Outcome</p>
                                        <div className="flex flex-wrap gap-1.5">
                                          {TOUCH_OUTCOMES.map(o => (
                                            <button key={o}
                                              onClick={() => setTouchForm(f => ({ ...f, outcome: o }))}
                                              className={cn(
                                                "px-3 py-1 rounded-full text-[10px] font-mono border transition-all",
                                                touchForm.outcome === o ? "bg-white text-black border-white" : "bg-white/5 border-white/10 text-white/40 hover:bg-white/10"
                                              )}
                                            >{o.replace(/_/g, " ")}</button>
                                          ))}
                                        </div>
                                      </div>
                                    </div>
                                    <input
                                      placeholder="Rep name"
                                      value={touchForm.rep_name}
                                      onChange={(e) => setTouchForm(f => ({ ...f, rep_name: e.target.value }))}
                                      className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-indigo-500/50"
                                    />
                                    <textarea
                                      placeholder="Notes (optional)"
                                      value={touchForm.notes}
                                      onChange={(e) => setTouchForm(f => ({ ...f, notes: e.target.value }))}
                                      rows={2}
                                      className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-indigo-500/50 resize-none"
                                    />
                                    <div className="flex justify-end gap-2">
                                      <button onClick={() => setAddingTouchId(null)} className="text-xs text-white/30 px-4">Cancel</button>
                                      <button
                                        onClick={() => handleAddTouch(ticket)}
                                        disabled={savingTouch}
                                        className="px-5 py-2 rounded-full bg-indigo-500 text-white text-xs font-display hover:bg-indigo-400 disabled:opacity-50 transition-all"
                                      >
                                        {savingTouch ? "Saving…" : "Log Touch"}
                                      </button>
                                    </div>
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>

                            {/* Touch entries */}
                            {touches.length === 0 ? (
                              <p className="text-[10px] font-mono text-white/20">No touches logged yet.</p>
                            ) : (
                              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                                {touches.map((touch) => {
                                  const Icon = METHOD_ICONS[touch.method] ?? Phone;
                                  return (
                                    <div key={touch.id} className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                                      <div className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center shrink-0 mt-0.5">
                                        <Icon className="w-3.5 h-3.5 text-white/40" />
                                      </div>
                                      <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <span className="text-[10px] font-mono text-white/60 uppercase tracking-widest">{touch.outcome.replace(/_/g, " ")}</span>
                                          <span className="text-[9px] font-mono text-white/25">{touch.method.replace(/_/g, " ")}</span>
                                          {touch.rep_name && <span className="text-[9px] font-mono text-white/25">· {touch.rep_name}</span>}
                                          <span className="text-[9px] font-mono text-white/20 ml-auto">{new Date(touch.occurred_at).toLocaleDateString()}</span>
                                        </div>
                                        {touch.notes && <p className="text-xs text-white/40 mt-1">{touch.notes}</p>}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>

                          {/* Stage advance + close lost */}
                          <div className="flex items-center justify-between pt-2 border-t border-white/[0.05]">
                            <div className="flex items-center gap-2">
                              {nextStage && (
                                <button
                                  onClick={() => handleAdvanceStage(ticket, nextStage)}
                                  disabled={advancingId === ticket.id}
                                  className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-white text-black text-xs font-display font-medium hover:bg-white/90 active:scale-95 transition-all disabled:opacity-50"
                                >
                                  {advancingId === ticket.id
                                    ? <div className="w-3.5 h-3.5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                                    : <ArrowRight className="w-3.5 h-3.5" />
                                  }
                                  {STAGES[nextStage]?.label ?? nextStage}
                                  {STAGES[nextStage]?.cpWriteback && (
                                    <span className="text-[9px] font-mono opacity-50 ml-1">→ CP</span>
                                  )}
                                </button>
                              )}
                              {ticket.stage !== "closed_lost" && ticket.stage !== "closed_won" && (
                                <button
                                  onClick={() => handleAdvanceStage(ticket, "closed_lost")}
                                  className="px-4 py-2.5 rounded-full bg-rose-500/10 border border-rose-500/20 text-xs font-display text-rose-400 hover:bg-rose-500/20 transition-all"
                                >
                                  Close Lost
                                </button>
                              )}
                            </div>
                            {STAGES[ticket.stage]?.cpWriteback && (
                              <div className="flex items-center gap-1.5">
                                <CheckCircle2 className="w-3 h-3 text-emerald-500/50" />
                                <span className="text-[9px] font-mono text-white/25">Will sync to CP at this stage</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}

            {tickets.length < total && (
              <button
                onClick={() => { const next = page + 1; setPage(next); fetchTickets({ newPage: next }); }}
                className="w-full py-4 rounded-2xl border border-white/10 text-white/40 text-sm font-display hover:bg-white/5 hover:text-white/70 transition-all"
              >
                Load more · {(total - tickets.length).toLocaleString()} remaining
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
