"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield, RefreshCw, ChevronDown, Check, Users, X,
  LayoutDashboard, Eye, AlertTriangle, User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { fetchReps, updateRepRole } from "@/lib/api";

interface Rep {
  id: string;
  name: string;
  email: string;
  role: string;
}

const ROLES = [
  {
    id: "manager",
    label: "Manager",
    description: "Full access — all tabs, pipeline, and access control",
    icon: Shield,
    color: "text-[#4a8fd4]",
    bg: "bg-[#2563ba]/10",
    border: "border-[#2563ba]/25",
    chip: "bg-[#2563ba]/15 text-[#4a8fd4] border-[#2563ba]/25",
  },
  {
    id: "sales_rep",
    label: "Sales Rep",
    description: "Pipeline (assigned leads only), Inspections, Schedule, Calendar",
    icon: Users,
    color: "text-[#3aada3]",
    bg: "bg-[#2a8a82]/10",
    border: "border-[#2a8a82]/25",
    chip: "bg-[#2a8a82]/15 text-[#3aada3] border-[#2a8a82]/25",
  },
  {
    id: "viewer",
    label: "Viewer",
    description: "Read-only access to Pipeline and Inspections. Cannot start inspections.",
    icon: Eye,
    color: "text-[#8BA5C5]",
    bg: "bg-white/[0.04]",
    border: "border-white/10",
    chip: "bg-white/5 text-[#8BA5C5] border-white/10",
  },
] as const;

const ROLE_MAP = Object.fromEntries(ROLES.map(r => [r.id, r])) as Record<string, typeof ROLES[number]>;

const ACCESS_MATRIX: { label: string; icon: any; manager: boolean; sales_rep: boolean; viewer: boolean }[] = [
  { label: "New Leads (CenterPoint)",  icon: LayoutDashboard, manager: true,  sales_rep: false, viewer: false },
  { label: "Inspections Dashboard",    icon: LayoutDashboard, manager: true,  sales_rep: true,  viewer: true  },
  { label: "Pipeline (all leads)",     icon: Users,           manager: true,  sales_rep: false, viewer: false },
  { label: "Pipeline (assigned only)", icon: Users,           manager: false, sales_rep: true,  viewer: true  },
  { label: "My Schedule",              icon: LayoutDashboard, manager: true,  sales_rep: true,  viewer: false },
  { label: "Calendar",                 icon: LayoutDashboard, manager: true,  sales_rep: true,  viewer: false },
  { label: "Opportunities",            icon: LayoutDashboard, manager: true,  sales_rep: true,  viewer: true  },
  { label: "Manager Dashboard",        icon: Shield,          manager: true,  sales_rep: false, viewer: false },
  { label: "Access Control",           icon: Shield,          manager: true,  sales_rep: false, viewer: false },
];

export function AccessControlPanel() {
  const [reps, setReps]       = useState<Rep[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showMatrix, setShowMatrix] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const loadReps = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchReps();
      if (res.ok) {
        const json = await res.json();
        setReps(json.reps ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadReps(); }, [loadReps]);

  const handleRoleChange = async (repId: string, newRole: string) => {
    setSaving(repId);
    setSaveError(null);
    try {
      const res = await updateRepRole(repId, newRole);
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.success) {
        setReps(prev => prev.map(r => r.id === repId ? { ...r, role: newRole } : r));
        setExpanded(null);
      } else {
        setSaveError(json.error || `Save failed (${res.status}). Please try again.`);
      }
    } catch (e: any) {
      setSaveError(e.message || "Network error. Please try again.");
    } finally {
      setSaving(null);
    }
  };

  const managers   = reps.filter(r => r.role === "manager");
  const salesReps  = reps.filter(r => r.role === "sales_rep");
  const viewers    = reps.filter(r => r.role === "viewer");
  const unknown    = reps.filter(r => !["manager", "sales_rep", "viewer"].includes(r.role));

  return (
    <div className="space-y-8">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Shield className="w-5 h-5 text-[#4a8fd4]" />
            <h2 className="text-xl font-inter font-medium text-[var(--tx1)]">Access Control</h2>
          </div>
          <p className="text-sm text-[var(--tx2)] opacity-60 font-light ml-8">
            Assign workspace roles to each team member. Changes take effect on next sign-in.
          </p>
        </div>
        <button
          onClick={loadReps}
          disabled={loading}
          className="flex items-center gap-2 text-[10px] font-mono text-[var(--tx2)] opacity-60 hover:opacity-100 hover:text-[var(--tx1)] uppercase tracking-widest transition-colors"
        >
          <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
          Refresh
        </button>
      </div>

      {/* ── Role legend ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {ROLES.map(role => (
          <div
            key={role.id}
            className={cn("p-4 rounded-2xl border", role.bg, role.border)}
          >
            <div className="flex items-center gap-2 mb-2">
              <role.icon className={cn("w-4 h-4", role.color)} />
              <span className={cn("text-xs font-inter font-medium", role.color)}>{role.label}</span>
              <span className="ml-auto text-[10px] font-mono text-[var(--tx2)] opacity-40">
                {reps.filter(r => r.role === role.id).length} member{reps.filter(r => r.role === role.id).length !== 1 ? "s" : ""}
              </span>
            </div>
            <p className="text-[10px] font-inter text-[var(--tx2)] opacity-60 leading-relaxed">{role.description}</p>
          </div>
        ))}
      </div>

      {/* ── Rep list ── */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <RefreshCw className="w-5 h-5 text-[var(--tx2)] opacity-40 animate-spin" />
        </div>
      ) : reps.length === 0 ? (
        <div className="py-16 text-center">
          <Users className="w-8 h-8 text-[var(--tx2)] opacity-30 mx-auto mb-3" />
          <p className="text-sm text-[var(--tx2)] opacity-60">No team members yet. Members appear here after first sign-in.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {([
            { group: "Managers",   list: managers  },
            { group: "Sales Reps", list: salesReps },
            { group: "Viewers",    list: viewers   },
            { group: "Unassigned", list: unknown   },
          ] as const).filter(g => g.list.length > 0).map(({ group, list }) => (
            <div key={group} className="space-y-2">
              <p className="text-[9px] font-mono text-[var(--tx2)] opacity-40 uppercase tracking-[0.2em] px-1 pt-2">{group}</p>
              {list.map((rep, i) => {
                const currentRole = ROLE_MAP[rep.role] ?? ROLE_MAP["sales_rep"];
                const isExpanded = expanded === rep.id;
                const isSaving   = saving === rep.id;

                return (
                  <motion.div
                    key={rep.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-subtle)] overflow-hidden"
                  >
                    {/* Rep row */}
                    <button
                      onClick={() => setExpanded(isExpanded ? null : rep.id)}
                      className="w-full flex items-center gap-4 px-5 py-4 hover:bg-[var(--bg-elevated)] transition-all text-left"
                    >
                      <div className="w-9 h-9 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-color)] flex items-center justify-center shrink-0">
                        <User className="w-4 h-4 text-[var(--tx2)] opacity-60" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-inter font-medium text-[var(--tx1)] truncate">{rep.name}</p>
                        <p className="text-[10px] font-mono text-[var(--tx2)] opacity-60 truncate">{rep.email}</p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className={cn(
                          "text-[9px] font-mono px-2.5 py-1 rounded-full border uppercase tracking-wider",
                          currentRole.chip
                        )}>
                          {currentRole.label}
                        </span>
                        {isSaving
                          ? <RefreshCw className="w-3.5 h-3.5 text-[var(--tx2)] opacity-40 animate-spin" />
                          : <ChevronDown className={cn("w-3.5 h-3.5 text-[var(--tx2)] opacity-40 transition-transform", isExpanded && "rotate-180")} />
                        }
                      </div>
                    </button>

                    {/* Role picker */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.18 }}
                          className="overflow-hidden"
                        >
                          <div className="border-t border-[var(--border-color)] px-5 py-4 space-y-2">
                            <p className="text-[9px] font-mono text-[var(--tx2)] opacity-60 uppercase tracking-widest mb-3">
                              Assign role for {rep.name.split(" ")[0]}
                            </p>
                            {ROLES.map(role => {
                              const isActive = rep.role === role.id;
                              return (
                                <button
                                  key={role.id}
                                  onClick={() => !isActive && handleRoleChange(rep.id, role.id)}
                                  disabled={isActive || isSaving}
                                  className={cn(
                                    "w-full flex items-start gap-3 p-3 rounded-xl border transition-all text-left",
                                    isActive
                                      ? cn("cursor-default", role.bg, role.border)
                                      : "border-[var(--border-color)] bg-[var(--bg-elevated)] hover:border-[var(--border-color)] hover:bg-[var(--bg-subtle)]"
                                  )}
                                >
                                  <div className={cn("p-1.5 rounded-lg mt-0.5", isActive ? role.bg : "bg-[var(--bg-subtle)]")}>
                                    <role.icon className={cn("w-3.5 h-3.5", isActive ? role.color : "text-[var(--tx2)] opacity-60")} />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className={cn("text-xs font-inter font-medium", isActive ? role.color : "text-[var(--tx1)]")}>
                                      {role.label}
                                    </p>
                                    <p className="text-[10px] text-[var(--tx2)] opacity-60 mt-0.5 leading-relaxed">{role.description}</p>
                                  </div>
                                  {isActive && (
                                    <Check className={cn("w-3.5 h-3.5 shrink-0 mt-0.5", role.color)} />
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </div>
          ))}
        </div>
      )}

      {/* ── Access matrix toggle ── */}
      <div className="border-t border-[var(--border-color)] pt-6">
        <button
          onClick={() => setShowMatrix(v => !v)}
          className="flex items-center gap-3 text-sm font-inter text-[var(--tx2)] opacity-60 hover:opacity-100 hover:text-[var(--tx1)] transition-colors"
        >
          <Eye className="w-4 h-4" />
          {showMatrix ? "Hide" : "Show"} permission matrix
          <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", showMatrix && "rotate-180")} />
        </button>

        <AnimatePresence>
          {showMatrix && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="mt-4 rounded-2xl border border-[var(--border-color)] overflow-hidden">
                {/* Matrix header */}
                <div className="grid grid-cols-[1fr_80px_80px_80px] gap-0 px-5 py-3 border-b border-[var(--border-color)] bg-[var(--bg-subtle)]">
                  <span className="text-[9px] font-mono text-[var(--tx2)] opacity-40 uppercase tracking-widest">Feature</span>
                  {ROLES.map(r => (
                    <span key={r.id} className={cn("text-[9px] font-mono uppercase tracking-wider text-center", r.color)}>{r.label}</span>
                  ))}
                </div>
                {ACCESS_MATRIX.map((row, i) => (
                  <div
                    key={i}
                    className={cn(
                      "grid grid-cols-[1fr_80px_80px_80px] gap-0 px-5 py-3 border-b border-[var(--border-color)] last:border-0",
                      i % 2 === 0 ? "bg-transparent" : "bg-white/[0.01]"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <row.icon className="w-3.5 h-3.5 text-[var(--tx2)] opacity-40" />
                      <span className="text-[10px] font-inter text-[var(--tx2)] opacity-60">{row.label}</span>
                    </div>
                    {(["manager", "sales_rep", "viewer"] as const).map(role => (
                      <div key={role} className="flex items-center justify-center">
                        {row[role]
                          ? <Check className="w-3 h-3 text-[#3aada3]" />
                          : <span className="w-3 h-px bg-[var(--border-color)] inline-block" />
                        }
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Save error ── */}
      {saveError && (
        <div className="flex items-start gap-3 p-4 rounded-2xl bg-rose-500/[0.06] border border-rose-500/20">
          <AlertTriangle className="w-4 h-4 text-rose-400/70 shrink-0 mt-0.5" />
          <p className="text-[10px] font-mono text-rose-400/80 leading-relaxed flex-1">{saveError}</p>
          <button onClick={() => setSaveError(null)} className="text-rose-400/40 hover:text-rose-300 transition-colors shrink-0">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ── Warning ── */}
      <div className="flex items-start gap-3 p-4 rounded-2xl bg-amber-500/[0.04] border border-amber-500/15">
        <AlertTriangle className="w-4 h-4 text-amber-400/70 shrink-0 mt-0.5" />
        <p className="text-[10px] font-mono text-[var(--tx2)] opacity-60 leading-relaxed">
          Role changes require the affected user to sign out and back in to take effect.
          Pipeline lead visibility is enforced server-side — rep-filtered leads are always scoped to assigned tickets only.
        </p>
      </div>
    </div>
  );
}
