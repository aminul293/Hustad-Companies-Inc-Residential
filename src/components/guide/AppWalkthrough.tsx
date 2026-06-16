"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Pause, Play, Maximize2, Minimize2, Volume2, VolumeX } from "lucide-react";
import { cn } from "@/lib/utils";

// ── Step definitions ──────────────────────────────────────────────────────────

interface Step {
  id: number;
  title: string;
  desc: string;
  // cursor target as % of screen width/height
  cursor: { x: number; y: number };
  // highlight ring as % position + size
  highlight: { x: number; y: number; w: number; h: number };
  screen: React.FC<{ highlight: boolean }>;
}

const STEP_DURATION = 4000; // ms each step plays
const STEP_GAP      = 10000; // ms pause between steps

// ── Shared screen chrome ──────────────────────────────────────────────────────

function AppChrome({ children, activeTab }: { children: React.ReactNode; activeTab: "leads" | "inspect" | "pipeline" }) {
  const tabs = [
    { id: "leads",    label: "New Leads" },
    { id: "inspect",  label: "Inspect" },
    { id: "pipeline", label: "Pipeline" },
  ] as const;
  return (
    <div className="flex flex-col h-full bg-[#060606] text-[#E8EDF8] select-none overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#1e3050] shrink-0">
        <div>
          <p className="text-[9px] font-mono uppercase tracking-[0.25em] text-[#567090]">Hustad Residential</p>
          <p className="text-sm font-semibold text-[#E8EDF8]" style={{ fontFamily: "'Playfair Display', serif" }}>Command Center</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-[#1e3050] border border-[#2d4060] flex items-center justify-center">
            <span className="text-[9px] text-[#8BA5C5] font-bold">QA</span>
          </div>
        </div>
      </div>
      {/* Content */}
      <div className="flex-1 overflow-hidden">{children}</div>
      {/* Bottom nav */}
      <div className="flex items-center border-t border-[#1e3050] shrink-0">
        {tabs.map(t => (
          <div
            key={t.id}
            className={cn(
              "flex-1 flex flex-col items-center gap-0.5 py-2.5 text-[9px] font-mono uppercase tracking-wider border-t-2 transition-colors",
              activeTab === t.id
                ? "border-[#4a8fd4] text-[#4a8fd4]"
                : "border-transparent text-[#567090]"
            )}
          >
            <div className={cn("w-1.5 h-1.5 rounded-full mb-0.5", activeTab === t.id ? "bg-[#4a8fd4]" : "bg-transparent")} />
            {t.label}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Individual screens ────────────────────────────────────────────────────────

const S1_CommandCenter: React.FC<{ highlight: boolean }> = ({ highlight }) => (
  <div className="relative h-full">
    <img
      src="/screenshots/P00_rep_launch.png"
      alt="Command Center"
      className="w-full h-full object-cover object-top"
    />
    {highlight && (
      <div
        className="absolute animate-pulse"
        style={{ bottom: "3.5%", left: "7%", width: "30%", height: "6%",
          border: "2px solid #4a8fd4", borderRadius: "8px",
          boxShadow: "0 0 16px rgba(74,143,212,0.5)", background: "rgba(74,143,212,0.08)" }}
      />
    )}
  </div>
);

const S2_NewLeads: React.FC<{ highlight: boolean }> = ({ highlight }) => {
  const jobs = [
    { name: "Martinez, Carlos", addr: "4821 Birchwood Ln, Madison WI", status: "New", date: "Jun 12" },
    { name: "Thompson, Rachel", addr: "1103 Oakridge Dr, Fitchburg WI", status: "New", date: "Jun 13" },
    { name: "Patel, Anita",     addr: "887 Crescent Ave, Middleton WI", status: "New", date: "Jun 14" },
  ];
  return (
    <AppChrome activeTab="leads">
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between px-3 py-2.5 border-b border-[#1e3050] shrink-0">
          <p className="text-xs text-[#8BA5C5]">3 jobs from CenterPoint</p>
          <div className="relative">
            <button className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-semibold text-white transition-all",
              highlight ? "bg-[#4a8fd4] shadow-[0_0_16px_rgba(74,143,212,0.6)]" : "bg-[#2563ba]"
            )}>
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Sync Now
            </button>
            {highlight && <div className="absolute inset-0 rounded-lg border-2 border-[#4a8fd4] animate-ping opacity-60" />}
          </div>
        </div>
        <div className="flex-1 overflow-auto divide-y divide-[#1e3050]">
          {jobs.map((j, i) => (
            <div key={i} className="flex items-center gap-3 px-3 py-3 hover:bg-[#0d1525]">
              <div className="w-8 h-8 rounded-full bg-[#1e3050] flex items-center justify-center shrink-0">
                <span className="text-[10px] text-[#4a8fd4] font-bold">{j.name[0]}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-[#E8EDF8] truncate">{j.name}</p>
                <p className="text-[10px] text-[#567090] truncate">{j.addr}</p>
              </div>
              <div className="text-right shrink-0">
                <span className="text-[9px] font-mono bg-[#1e3050] text-[#4a8fd4] px-1.5 py-0.5 rounded">{j.status}</span>
                <p className="text-[9px] text-[#567090] mt-0.5">{j.date}</p>
              </div>
              <svg className="w-3.5 h-3.5 text-[#2d4060] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
            </div>
          ))}
        </div>
      </div>
    </AppChrome>
  );
};

const S3_Syncing: React.FC<{ highlight: boolean }> = ({ highlight: _highlight }) => (
  <AppChrome activeTab="leads">
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-[#1e3050] shrink-0">
        <p className="text-xs text-[#8BA5C5]">Syncing from CenterPoint…</p>
        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-semibold text-[#8BA5C5] bg-[#141f33]">
          <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Syncing…
        </button>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center gap-3">
        <div className="w-10 h-10 rounded-full border-2 border-[#4a8fd4] border-t-transparent animate-spin" />
        <p className="text-xs text-[#567090] font-mono">Pulling jobs from CenterPoint…</p>
        <div className="flex gap-1.5 mt-1">
          {[0,1,2].map(i => (
            <div key={i} className="w-1.5 h-1.5 rounded-full bg-[#2d4060] animate-pulse" style={{ animationDelay: `${i * 0.2}s` }} />
          ))}
        </div>
      </div>
    </div>
  </AppChrome>
);

const S4_OpenJob: React.FC<{ highlight: boolean }> = ({ highlight }) => {
  const jobs = [
    { name: "Martinez, Carlos", addr: "4821 Birchwood Ln, Madison WI", status: "New", date: "Jun 12", active: true },
    { name: "Thompson, Rachel", addr: "1103 Oakridge Dr, Fitchburg WI", status: "New", date: "Jun 13", active: false },
    { name: "Patel, Anita",     addr: "887 Crescent Ave, Middleton WI", status: "New", date: "Jun 14", active: false },
  ];
  return (
    <AppChrome activeTab="leads">
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between px-3 py-2.5 border-b border-[#1e3050] shrink-0">
          <p className="text-xs text-[#8BA5C5]">3 jobs synced</p>
          <div className="flex items-center gap-1.5 px-2 py-1 rounded text-[10px] text-[#27774a] bg-[#27774a]/10 font-mono">
            <div className="w-1.5 h-1.5 rounded-full bg-[#27774a]" /> Synced
          </div>
        </div>
        <div className="flex-1 overflow-auto divide-y divide-[#1e3050]">
          {jobs.map((j, i) => (
            <div key={i} className={cn(
              "flex items-center gap-3 px-3 py-3 transition-all",
              j.active && highlight
                ? "bg-[#1a2d4f] border-l-2 border-[#4a8fd4] shadow-[0_0_20px_rgba(74,143,212,0.15)]"
                : "hover:bg-[#0d1525]"
            )}>
              <div className={cn("w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                j.active && highlight ? "bg-[#2563ba]" : "bg-[#1e3050]")}>
                <span className={cn("text-[10px] font-bold", j.active && highlight ? "text-white" : "text-[#4a8fd4]")}>{j.name[0]}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-[#E8EDF8] truncate">{j.name}</p>
                <p className="text-[10px] text-[#567090] truncate">{j.addr}</p>
              </div>
              <svg className={cn("w-3.5 h-3.5 shrink-0", j.active && highlight ? "text-[#4a8fd4]" : "text-[#2d4060]")} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
            </div>
          ))}
        </div>
      </div>
    </AppChrome>
  );
};

const S5_ImportPipeline: React.FC<{ highlight: boolean }> = ({ highlight }) => (
  <AppChrome activeTab="leads">
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-[#1e3050] shrink-0">
        <svg className="w-4 h-4 text-[#567090]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
        <p className="text-xs font-semibold text-[#E8EDF8]">Martinez, Carlos</p>
      </div>
      <div className="flex-1 overflow-auto px-3 py-3 space-y-2.5">
        <div className="bg-[#0d1525] border border-[#1e3050] rounded-xl p-3 space-y-1.5">
          <p className="text-[9px] font-mono uppercase tracking-widest text-[#567090]">Property</p>
          <p className="text-xs font-semibold text-[#E8EDF8]">4821 Birchwood Ln</p>
          <p className="text-[10px] text-[#8BA5C5]">Madison, WI 53711</p>
        </div>
        <div className="bg-[#0d1525] border border-[#1e3050] rounded-xl p-3 space-y-1.5">
          <p className="text-[9px] font-mono uppercase tracking-widest text-[#567090]">Homeowner</p>
          <p className="text-xs font-semibold text-[#E8EDF8]">Carlos Martinez</p>
          <p className="text-[10px] text-[#8BA5C5]">(608) 555-0142 · carlos@email.com</p>
        </div>
        <div className="bg-[#0d1525] border border-[#1e3050] rounded-xl p-3 space-y-1.5">
          <p className="text-[9px] font-mono uppercase tracking-widest text-[#567090]">Storm Event</p>
          <p className="text-xs font-semibold text-[#E8EDF8]">Hail · May 28, 2026</p>
          <p className="text-[10px] text-[#8BA5C5]">Reported: 1.25" hail diameter</p>
        </div>
      </div>
      <div className="px-3 pb-4 shrink-0">
        <div className="relative">
          <button className={cn(
            "w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all",
            highlight
              ? "bg-[#2a8a82] text-white shadow-[0_0_24px_rgba(42,138,130,0.5)]"
              : "bg-[#1a6358] text-[#a8e0da]"
          )}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Import to Pipeline
          </button>
          {highlight && <div className="absolute inset-0 rounded-xl border-2 border-[#3aada3] animate-ping opacity-50" />}
        </div>
      </div>
    </div>
  </AppChrome>
);

const S6_PipelineTab: React.FC<{ highlight: boolean }> = ({ highlight }) => (
  <AppChrome activeTab="pipeline">
    <div className="flex flex-col h-full px-3 py-3 gap-2.5">
      <div className="flex items-center justify-between shrink-0">
        <p className="text-xs font-semibold text-[#E8EDF8]">My Pipeline</p>
        <span className="text-[10px] font-mono bg-[#1e3050] text-[#4a8fd4] px-2 py-0.5 rounded-full">1 lead</span>
      </div>
      {/* Stages bar */}
      <div className="flex gap-1 shrink-0">
        {["New Lead","Contacted","Scheduled","Inspection"].map((s, i) => (
          <div key={s} className={cn("flex-1 text-center py-1 rounded text-[8px] font-mono uppercase tracking-wide",
            i === 0 ? "bg-[#2563ba]/20 text-[#4a8fd4] border border-[#2563ba]/30" : "bg-[#141f33] text-[#2d4060]")}>
            {s}
          </div>
        ))}
      </div>
      {/* Lead card */}
      <div className={cn(
        "bg-[#0d1525] border rounded-xl p-3 transition-all",
        highlight ? "border-[#4a8fd4] shadow-[0_0_20px_rgba(74,143,212,0.2)]" : "border-[#1e3050]"
      )}>
        <div className="flex items-start justify-between mb-2">
          <div>
            <p className="text-xs font-semibold text-[#E8EDF8]">Carlos Martinez</p>
            <p className="text-[10px] text-[#567090]">4821 Birchwood Ln · Madison WI</p>
          </div>
          <span className="text-[9px] font-mono bg-[#2563ba]/15 text-[#4a8fd4] border border-[#2563ba]/25 px-1.5 py-0.5 rounded">New Lead</span>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-[#567090]">
          <span>Hail · May 28</span>
          <span>·</span>
          <span>Imported just now</span>
        </div>
      </div>
      <div className="flex-1 flex items-center justify-center">
        <p className="text-[10px] text-[#2d4060] font-mono text-center">Move the lead through stages<br/>by calling and scheduling</p>
      </div>
    </div>
  </AppChrome>
);

const S7_Schedule: React.FC<{ highlight: boolean }> = ({ highlight }) => (
  <AppChrome activeTab="pipeline">
    <div className="flex flex-col h-full px-3 py-3 gap-2.5">
      <div className="flex items-center justify-between shrink-0">
        <p className="text-xs font-semibold text-[#E8EDF8]">My Pipeline</p>
        <span className="text-[10px] font-mono bg-[#1e3050] text-[#4a8fd4] px-2 py-0.5 rounded-full">1 lead</span>
      </div>
      <div className="bg-[#0d1525] border border-[#1e3050] rounded-xl p-3">
        <div className="flex items-start justify-between mb-2">
          <div>
            <p className="text-xs font-semibold text-[#E8EDF8]">Carlos Martinez</p>
            <p className="text-[10px] text-[#567090]">4821 Birchwood Ln · Madison WI</p>
          </div>
          <span className="text-[9px] font-mono bg-[#1e4d8c]/20 text-[#4a8fd4] border border-[#1e4d8c]/30 px-1.5 py-0.5 rounded">Contacted</span>
        </div>
        <div className="flex gap-2 mt-3">
          <div className="relative flex-1">
            <button className={cn(
              "w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-[11px] font-semibold transition-all",
              highlight
                ? "bg-[#4a8fd4] text-white shadow-[0_0_16px_rgba(74,143,212,0.5)]"
                : "bg-[#1a2d4f] text-[#4a8fd4] border border-[#2563ba]/30"
            )}>
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              Schedule Inspection
            </button>
            {highlight && <div className="absolute inset-0 rounded-lg border border-[#4a8fd4] animate-ping opacity-40" />}
          </div>
          <button className="px-3 py-2 rounded-lg text-[11px] text-[#567090] bg-[#141f33] border border-[#1e3050]">Log Call</button>
        </div>
      </div>
      {/* Schedule modal overlay */}
      {highlight && (
        <div className="bg-[#141f33] border border-[#2d4060] rounded-xl p-3 shadow-elevated">
          <p className="text-[10px] font-mono uppercase tracking-widest text-[#4a8fd4] mb-2">Schedule Inspection</p>
          <div className="grid grid-cols-3 gap-1 mb-2">
            {["Mon Jun 16","Tue Jun 17","Wed Jun 18"].map((d,i) => (
              <button key={d} className={cn("py-1.5 rounded text-[9px] text-center", i===0 ? "bg-[#2563ba] text-white" : "bg-[#1e3050] text-[#567090]")}>{d}</button>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-1">
            {["9:00 AM","10:00 AM","1:00 PM"].map((t,i) => (
              <button key={t} className={cn("py-1.5 rounded text-[9px] text-center", i===1 ? "bg-[#2563ba] text-white" : "bg-[#1e3050] text-[#567090]")}>{t}</button>
            ))}
          </div>
        </div>
      )}
    </div>
  </AppChrome>
);

const S8_StartInspection: React.FC<{ highlight: boolean }> = ({ highlight }) => (
  <AppChrome activeTab="pipeline">
    <div className="flex flex-col h-full px-3 py-3 gap-2.5">
      <div className="flex items-center justify-between shrink-0">
        <p className="text-xs font-semibold text-[#E8EDF8]">My Pipeline</p>
        <span className="text-[10px] font-mono bg-[#1e3050] text-[#4a8fd4] px-2 py-0.5 rounded-full">1 lead</span>
      </div>
      <div className="bg-[#0d1525] border border-[#1e3050] rounded-xl p-3">
        <div className="flex items-start justify-between mb-1.5">
          <div>
            <p className="text-xs font-semibold text-[#E8EDF8]">Carlos Martinez</p>
            <p className="text-[10px] text-[#567090]">4821 Birchwood Ln · Madison WI</p>
          </div>
          <span className="text-[9px] font-mono bg-[#1e4d8c]/25 text-[#4a8fd4] border border-[#1e4d8c]/35 px-1.5 py-0.5 rounded">Scheduled</span>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-[#3aada3] mb-3">
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          Mon Jun 16 · 10:00 AM
        </div>
        <div className="relative">
          <button className={cn(
            "w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all",
            highlight
              ? "bg-[#2563ba] text-white shadow-[0_0_24px_rgba(37,99,186,0.6)]"
              : "bg-[#1a2d4f] text-[#4a8fd4] border border-[#2563ba]/30"
          )}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <polygon points="5 3 19 12 5 21 5 3" fill={highlight ? "white" : "none"} />
            </svg>
            Start Inspection
          </button>
          {highlight && <div className="absolute inset-0 rounded-xl border-2 border-[#4a8fd4] animate-ping opacity-40" />}
        </div>
      </div>
    </div>
  </AppChrome>
);

// ── Steps config ──────────────────────────────────────────────────────────────

const STEPS: Step[] = [
  {
    id: 1,
    title: "Open the Command Center",
    desc: "Tap New Leads in the bottom navigation bar to see jobs synced from CenterPoint Connect.",
    cursor: { x: 17, y: 93 },
    highlight: { x: 5, y: 90, w: 32, h: 8 },
    screen: S1_CommandCenter,
  },
  {
    id: 2,
    title: "Tap Sync Now",
    desc: "Pull the latest jobs assigned to you from CenterPoint. The list refreshes automatically after sync.",
    cursor: { x: 76, y: 18 },
    highlight: { x: 60, y: 12, w: 36, h: 13 },
    screen: S2_NewLeads,
  },
  {
    id: 3,
    title: "Jobs are syncing…",
    desc: "CenterPoint sends all assigned jobs to your device. This takes a few seconds on first load.",
    cursor: { x: 50, y: 50 },
    highlight: { x: 35, y: 42, w: 30, h: 16 },
    screen: S3_Syncing,
  },
  {
    id: 4,
    title: "Tap a job to open it",
    desc: "Tap any job row to review the homeowner's property details, contact info, and storm event data.",
    cursor: { x: 50, y: 30 },
    highlight: { x: 2, y: 20, w: 96, h: 18 },
    screen: S4_OpenJob,
  },
  {
    id: 5,
    title: "Import to Pipeline",
    desc: "Tap Import to Pipeline. This creates a lead card in your Pipeline tab so you can track it through to inspection.",
    cursor: { x: 50, y: 88 },
    highlight: { x: 5, y: 82, w: 90, h: 12 },
    screen: S5_ImportPipeline,
  },
  {
    id: 6,
    title: "Lead appears in Pipeline",
    desc: "Your Pipeline tab now shows the lead at New Lead stage. Work it forward by calling and confirming the appointment.",
    cursor: { x: 50, y: 40 },
    highlight: { x: 3, y: 28, w: 94, h: 22 },
    screen: S6_PipelineTab,
  },
  {
    id: 7,
    title: "Schedule the Inspection",
    desc: "Once the homeowner confirms — tap Schedule Inspection, pick the date and time, and confirm. The lead moves to Scheduled.",
    cursor: { x: 38, y: 52 },
    highlight: { x: 3, y: 46, w: 58, h: 11 },
    screen: S7_Schedule,
  },
  {
    id: 8,
    title: "Start Inspection",
    desc: "At the property, tap Start Inspection. The 20-screen tablet flow launches — Phase A begins with the homeowner present.",
    cursor: { x: 50, y: 68 },
    highlight: { x: 3, y: 60, w: 94, h: 14 },
    screen: S8_StartInspection,
  },
];

// ── Animated cursor ───────────────────────────────────────────────────────────

function DemoCursor({ x, y, clicking }: { x: number; y: number; clicking: boolean }) {
  return (
    <div
      className="absolute pointer-events-none z-20 transition-all duration-500 ease-in-out"
      style={{ left: `${x}%`, top: `${y}%`, transform: "translate(-50%, -50%)" }}
    >
      <div className={cn(
        "w-5 h-5 rounded-full border-2 border-[#4a8fd4] bg-white/90 shadow-[0_2px_12px_rgba(0,0,0,0.4)] transition-transform duration-150",
        clicking ? "scale-75" : "scale-100"
      )} />
      {clicking && (
        <div className="absolute inset-0 rounded-full border border-[#4a8fd4] animate-ping opacity-70" />
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function AppWalkthrough() {
  const [step, setStep] = useState(0);
  const [clicking, setClicking] = useState(false);
  const [playing, setPlaying] = useState(true);
  const [progress, setProgress] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const [voice, setVoice] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const gapRef   = useRef<NodeJS.Timeout | null>(null);
  const progressRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const current = STEPS[step];

  // Cancel any in-progress gap and jump immediately
  const cancelGap = () => {
    if (gapRef.current) { clearTimeout(gapRef.current); gapRef.current = null; }
    setTransitioning(false);
  };

  const advance = () => { cancelGap(); setStep(s => (s + 1) % STEPS.length); };
  const prev    = () => { cancelGap(); setStep(s => (s - 1 + STEPS.length) % STEPS.length); };

  // ESC to exit fullscreen
  useEffect(() => {
    if (!fullscreen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setFullscreen(false); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [fullscreen]);

  // Voice guidance — OpenAI TTS (nova voice)
  useEffect(() => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    if (!voice) return;

    let cancelled = false;
    const text = `${current.title}. ${current.desc}`;

    fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    })
      .then(res => res.blob())
      .then(blob => {
        if (cancelled) return;
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audioRef.current = audio;
        audio.play().catch(() => {});
        audio.onended = () => URL.revokeObjectURL(url);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
      if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    };
  }, [step, voice, current.title, current.desc]);

  // Stop audio on unmount
  useEffect(() => {
    return () => { if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; } };
  }, []);

  // click pulse 800ms before step ends
  useEffect(() => {
    setClicking(false);
    setProgress(0);
    const clickTimer = setTimeout(() => setClicking(true), STEP_DURATION - 900);
    const clickOff   = setTimeout(() => setClicking(false), STEP_DURATION - 200);
    return () => { clearTimeout(clickTimer); clearTimeout(clickOff); };
  }, [step]);

  // auto-advance with gap between steps
  useEffect(() => {
    if (!playing) {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (gapRef.current)   clearTimeout(gapRef.current);
      setTransitioning(false);
      return;
    }
    // Play step for STEP_DURATION, then hold for STEP_GAP, then advance
    timerRef.current = setTimeout(() => {
      setTransitioning(true);
      gapRef.current = setTimeout(() => {
        setTransitioning(false);
        setStep(s => (s + 1) % STEPS.length);
      }, STEP_GAP);
    }, STEP_DURATION);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (gapRef.current)   clearTimeout(gapRef.current);
    };
  }, [playing, step]);

  // progress bar — freezes at 100% during gap, resets on new step
  useEffect(() => {
    if (!playing || transitioning) return;
    setProgress(0);
    const start = Date.now();
    progressRef.current = setInterval(() => {
      setProgress(Math.min(((Date.now() - start) / STEP_DURATION) * 100, 100));
    }, 50);
    return () => { if (progressRef.current) clearInterval(progressRef.current); };
  }, [playing, step, transitioning]);

  const Screen = current.screen;

  const inner = (
    <div className={cn(
      "bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl overflow-hidden shadow-card",
      fullscreen && "w-full max-w-sm"
    )}>
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-3.5 border-b border-[var(--border-color)]">
        <div className="w-2 h-2 rounded-full bg-[#4a8fd4]" />
        <p className="text-xs font-mono uppercase tracking-widest text-[var(--tx3)]">App Walkthrough</p>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-[10px] font-mono text-[var(--tx5)]">Step {current.id} of {STEPS.length}</span>
          <button
            onClick={() => setVoice(v => !v)}
            className={cn(
              "w-6 h-6 rounded flex items-center justify-center transition-colors",
              voice ? "text-[#4a8fd4]" : "text-[var(--tx4)] hover:text-[var(--tx1)]"
            )}
            title={voice ? "Mute voice guidance" : "Enable voice guidance"}
          >
            {voice ? <Volume2 size={13} /> : <VolumeX size={13} />}
          </button>
          <button
            onClick={() => setFullscreen(f => !f)}
            className="w-6 h-6 rounded flex items-center justify-center text-[var(--tx4)] hover:text-[var(--tx1)] transition-colors"
            title={fullscreen ? "Exit fullscreen (Esc)" : "Fullscreen"}
          >
            {fullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
          </button>
        </div>
      </div>

      {/* Screen + cursor */}
      <div className="relative mx-auto" style={{ width: "100%", aspectRatio: "9/14", maxHeight: fullscreen ? "calc(100vh - 160px)" : "420px", overflow: "hidden" }}>
        <div className="absolute inset-0">
          <Screen highlight={clicking} />
        </div>
        <DemoCursor x={current.cursor.x} y={current.cursor.y} clicking={clicking} />
        {/* Gap overlay — shown between steps */}
        {transitioning && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-10">
            <div className="flex gap-1.5">
              {[0, 150, 300].map(delay => (
                <div
                  key={delay}
                  className="w-2 h-2 rounded-full bg-white/70 animate-bounce"
                  style={{ animationDelay: `${delay}ms` }}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Progress bar */}
      <div className="h-0.5 bg-[var(--bg-elevated)]">
        <div
          className={cn("h-full bg-[#4a8fd4] transition-none", transitioning && "animate-pulse")}
          style={{ width: transitioning ? "100%" : (playing ? `${progress}%` : "0%") }}
        />
      </div>

      {/* Step info */}
      <div className="px-5 py-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-[var(--tx1)] mb-0.5">{current.title}</p>
            <p className="text-xs text-[var(--tx3)] leading-relaxed">{current.desc}</p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={prev}
              className="w-7 h-7 rounded-full border border-[var(--border-color)] bg-[var(--bg-elevated)] flex items-center justify-center text-[var(--tx3)] hover:text-[var(--tx1)] transition-colors"
            >
              <ChevronLeft size={13} />
            </button>
            <button
              onClick={() => setPlaying(p => !p)}
              className="w-7 h-7 rounded-full border border-[var(--border-color)] bg-[var(--bg-elevated)] flex items-center justify-center text-[var(--tx3)] hover:text-[var(--tx1)] transition-colors"
            >
              {playing ? <Pause size={11} /> : <Play size={11} />}
            </button>
            <button
              onClick={advance}
              className="w-7 h-7 rounded-full border border-[var(--border-color)] bg-[var(--bg-elevated)] flex items-center justify-center text-[var(--tx3)] hover:text-[var(--tx1)] transition-colors"
            >
              <ChevronRight size={13} />
            </button>
          </div>
        </div>

        {/* Step dots */}
        <div className="flex gap-1.5 mt-3">
          {STEPS.map((s, i) => (
            <button
              key={s.id}
              onClick={() => { setStep(i); setPlaying(true); }}
              className={cn(
                "h-1 rounded-full transition-all",
                i === step ? "bg-[#4a8fd4] w-5" : "bg-[var(--border-color)] w-1.5 hover:bg-[var(--tx4)]"
              )}
            />
          ))}
        </div>
      </div>
    </div>
  );

  if (fullscreen) {
    return (
      <div
        className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
        onClick={(e) => { if (e.target === e.currentTarget) setFullscreen(false); }}
      >
        {inner}
      </div>
    );
  }

  return inner;
}
