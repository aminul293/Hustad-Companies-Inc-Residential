"use client";

import { useState, useEffect } from "react";
import { Phone, Calendar, MessageSquare, User, Clock, CheckCircle2, XCircle, AlertCircle, PlayCircle, ArrowLeft, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface PipelineLead {
  id: string;
  cpc_ticket_id: string;
  pipeline_status: string;
  contact_attempt_count: number;
  last_contacted_at: string | null;
  scheduled_start_at: string | null;
  lead_notes: string | null;
  centerpoint_jobs: {
    name: string;
    property_name: string;
    owner: string;
  };
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  new_lead: { label: "New Lead", color: "text-sky-400 bg-sky-400/10 border-sky-400/20", icon: Clock },
  follow_up_needed: { label: "Follow Up", color: "text-orange-400 bg-orange-400/10 border-orange-400/20", icon: Clock },
  contact_attempted: { label: "Attempted", color: "text-amber-400 bg-amber-400/10 border-amber-400/20", icon: Phone },
  contacted: { label: "Contacted", color: "text-indigo-400 bg-indigo-400/10 border-indigo-400/20", icon: MessageSquare },
  scheduled: { label: "Scheduled", color: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20", icon: Calendar },
  inspection_in_progress: { label: "In Field", color: "text-purple-400 bg-purple-400/10 border-purple-400/20", icon: PlayCircle },
  dead_lead: { label: "Dead", color: "text-rose-400 bg-rose-400/10 border-rose-400/20", icon: XCircle },
};

export function PipelineLeads() {
  const [leads, setLeads] = useState<PipelineLead[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeads();
  }, []);

  const fetchLeads = async () => {
    try {
      const res = await fetch("/api/pipeline");
      const data = await res.json();
      setLeads(data);
    } catch (e) {
      console.error("Failed to fetch leads", e);
    } finally {
      setLoading(false);
    }
  };

  const handleCall = async (lead: PipelineLead) => {
    try {
      const res = await fetch(`/api/pipeline/${lead.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          contact_attempt_count: lead.contact_attempt_count + 1,
          last_contacted_at: new Date().toISOString(),
          pipeline_status: 'contact_attempted'
        })
      });
      if (res.ok) fetchLeads();
    } catch (e) {
      console.error(e);
    }
  };

  const handleSchedule = async (id: string) => {
    const startStr = prompt("Enter scheduled start (YYYY-MM-DD HH:MM):", new Date().toISOString().slice(0,16).replace('T',' '));
    if (!startStr) return;
    
    try {
      const res = await fetch(`/api/pipeline/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          pipeline_status: 'scheduled',
          scheduled_start_at: new Date(startStr).toISOString(),
          scheduled_end_at: new Date(new Date(startStr).getTime() + 60*60*1000).toISOString() // default 1hr
        })
      });
      if (res.ok) fetchLeads();
    } catch (e) {
      console.error(e);
    }
  };

  const handleStartInspection = (lead: PipelineLead) => {
    if (lead.pipeline_status !== 'scheduled') {
      alert("Inspection can only be started for 'Scheduled' leads.");
      return;
    }
    const event = new CustomEvent('launchPipelineSession', { detail: lead });
    window.dispatchEvent(event);
  };

  const handleDeadLead = async (id: string) => {
    if (!confirm("Mark this lead as dead?")) return;
    try {
      const res = await fetch(`/api/pipeline/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pipeline_status: 'dead_lead', dead_reason: 'Manually marked as dead' })
      });
      if (res.ok) fetchLeads();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteLead = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    console.log("Attempting to delete lead:", id);
    if (!confirm("Remove this lead from your Pipeline and return it to the CP Inbox?")) return;
    try {
      const res = await fetch(`/api/pipeline/${id}`, { method: "DELETE" });
      const data = await res.json();
      
      if (res.ok) {
        console.log("Lead removed from pipeline");
        fetchLeads();
      } else {
        alert(data.error || "Failed to remove lead");
      }
    } catch (e) {
      console.error("Removal failed:", e);
    }
  };

  const handleFollowUp = async (id: string) => {
    const dateStr = prompt("Enter next follow-up date (YYYY-MM-DD):", new Date(Date.now() + 86400000).toISOString().split('T')[0]);
    if (!dateStr) return;

    try {
      const res = await fetch(`/api/pipeline/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          pipeline_status: 'follow_up_needed',
          next_follow_up_at: new Date(dateStr).toISOString()
        })
      });
      if (res.ok) fetchLeads();
    } catch (e) {
      console.error(e);
    }
  };

  const stats = {
    total: leads.length,
    scheduled: leads.filter(l => l.pipeline_status === 'scheduled').length,
    active: leads.filter(l => !['dead_lead', 'scheduled'].includes(l.pipeline_status)).length,
    avgAttempts: leads.length ? (leads.reduce((sum, l) => sum + l.contact_attempt_count, 0) / leads.length).toFixed(1) : 0
  };

  const getProgress = (status: string) => {
    const steps = ['new_lead', 'contact_attempted', 'contacted', 'scheduled', 'inspection_in_progress'];
    const idx = steps.indexOf(status);
    return ((idx + 1) / steps.length) * 100;
  };

  return (
    <div className="p-8 space-y-8 overflow-y-auto h-full bg-black/20">
      {/* Advanced Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="flex items-center gap-6">
          <button 
            onClick={() => window.dispatchEvent(new CustomEvent('changeView', { detail: 'dashboard' }))}
            className="p-4 rounded-3xl bg-white/5 border border-white/10 hover:bg-white hover:text-black transition-all shadow-2xl"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <h2 className="text-4xl font-display font-medium tracking-tight">Sales Pipeline</h2>
            <p className="text-white/40 text-sm mt-1 font-light tracking-wide">Lead lifecycle and field conversion intelligence</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {[
            { label: "Pipeline Size", value: stats.total, icon: Clock, color: "text-indigo-400" },
            { label: "Scheduled", value: stats.scheduled, icon: Calendar, color: "text-emerald-400" },
            { label: "Avg Touches", value: stats.avgAttempts, icon: Phone, color: "text-sky-400" },
          ].map((s, i) => (
            <div key={i} className="px-6 py-4 rounded-[24px] bg-white/[0.03] border border-white/[0.08] min-w-[140px]">
              <p className="text-[9px] font-mono text-white/20 uppercase tracking-[0.2em] mb-1">{s.label}</p>
              <div className="flex items-center gap-2">
                <s.icon className={cn("w-3.5 h-3.5", s.color)} />
                <p className="text-xl font-display font-semibold">{s.value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence>
          {leads.map((lead) => {
            const config = STATUS_CONFIG[lead.pipeline_status] || STATUS_CONFIG.new_lead;
            const StatusIcon = config.icon;

            return (
              <motion.div
                key={lead.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="group bg-white/[0.02] border border-white/[0.05] rounded-[40px] p-8 hover:bg-white/[0.04] hover:border-white/20 transition-all flex flex-col h-full relative overflow-hidden"
              >
                {/* Progress Bar */}
                <div className="absolute top-0 left-0 w-full h-1 bg-white/5">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${getProgress(lead.pipeline_status)}%` }}
                    className="h-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]" 
                  />
                </div>

                <div className="flex items-center justify-between mb-8">
                  <div className={cn("flex items-center gap-2 px-4 py-1.5 rounded-full border text-[9px] font-mono uppercase tracking-widest", config.color)}>
                    <StatusIcon className="w-3.5 h-3.5" />
                    {config.label}
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={(e) => handleDeleteLead(e, lead.id)}
                      className="p-2.5 rounded-2xl text-white/20 hover:text-rose-400 hover:bg-rose-500/10 transition-all relative z-30"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <span className="text-[10px] font-mono text-white/20 uppercase tracking-widest bg-white/5 px-2 py-1 rounded-lg">#{lead.cpc_ticket_id}</span>
                  </div>
                </div>

                <div className="mb-8">
                  <h3 className="text-2xl font-display font-medium text-white mb-2 tracking-tight group-hover:text-indigo-300 transition-colors">
                    {lead.centerpoint_jobs?.property_name || lead.centerpoint_jobs?.name}
                  </h3>
                  <div className="flex items-center gap-4">
                    <p className="text-xs text-white/40 flex items-center gap-2 font-light">
                      <User className="w-4 h-4 text-indigo-400/50" />
                      {lead.centerpoint_jobs?.owner || "Unknown Owner"}
                    </p>
                    <div className="w-1 h-1 rounded-full bg-white/10" />
                    <p className="text-[10px] font-mono text-white/25 uppercase tracking-widest">Residental</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-8">
                  <div className="bg-white/[0.02] border border-white/[0.05] rounded-[24px] p-4 group-hover:bg-white/[0.04] transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[8px] font-mono text-white/20 uppercase tracking-[0.2em]">Attempts</p>
                      <Phone className="w-3 h-3 text-white/10" />
                    </div>
                    <p className="text-2xl font-display font-semibold text-white">{lead.contact_attempt_count}</p>
                  </div>
                  <div className="bg-white/[0.02] border border-white/[0.05] rounded-[24px] p-4 group-hover:bg-white/[0.04] transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[8px] font-mono text-white/20 uppercase tracking-[0.2em]">Last Contact</p>
                      <Clock className="w-3 h-3 text-white/10" />
                    </div>
                    <p className="text-xs font-display text-white/60 mt-1.5">
                      {lead.last_contacted_at ? new Date(lead.last_contacted_at).toLocaleDateString() : "Never"}
                    </p>
                  </div>
                </div>

                <div className="mt-auto flex items-center gap-3">
                  {lead.pipeline_status === 'scheduled' ? (
                    <button 
                      onClick={() => handleStartInspection(lead)}
                      className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-indigo-500 hover:bg-indigo-400 text-white transition-all text-sm font-medium"
                    >
                      <PlayCircle className="w-4 h-4" />
                      Start Inspection
                    </button>
                  ) : lead.pipeline_status === 'dead_lead' ? (
                    <span className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-rose-500/10 text-rose-400 text-sm font-medium">
                      <XCircle className="w-4 h-4" />
                      Lead Closed
                    </span>
                  ) : (
                    <>
                      <button 
                        onClick={() => handleCall(lead)}
                        className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white hover:text-black transition-all text-xs font-medium"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        Call
                      </button>
                      <button 
                        onClick={() => handleFollowUp(lead.id)}
                        className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white hover:text-black transition-all text-xs font-medium"
                      >
                        <Clock className="w-3.5 h-3.5" />
                        Follow-up
                      </button>
                      <button 
                        onClick={() => handleSchedule(lead.id)}
                        className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/30 transition-all text-xs font-medium"
                      >
                        <Calendar className="w-3.5 h-3.5" />
                        Schedule
                      </button>
                    </>
                  )}
                </div>
                
                {lead.pipeline_status !== 'dead_lead' && lead.pipeline_status !== 'scheduled' && (
                  <div className="mt-3 flex gap-2">
                    <button 
                      className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-white/30 hover:text-white transition-all text-xs font-medium"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      Notes
                    </button>
                    <button 
                      onClick={() => handleDeadLead(lead.id)}
                      className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-rose-400/50 hover:text-rose-400 hover:bg-rose-500/10 transition-all text-xs font-medium"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      Dead Lead
                    </button>
                  </div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
