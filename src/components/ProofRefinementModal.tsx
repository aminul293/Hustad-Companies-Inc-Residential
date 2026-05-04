"use client";

import { useState } from "react";
import { X, Check, EyeOff, ShieldAlert, Tag, BarChart3, AlertTriangle, Layers } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import type { PhotoAsset, PhotoTag, PhotoSeverity } from "@/types/session";

interface Props {
  photo: PhotoAsset;
  allPhotos: PhotoAsset[];
  onSave: (updated: PhotoAsset) => void;
  onCancel: () => void;
}

const TAG_OPTIONS: { value: PhotoTag; label: string }[] = [
  { value: "shingle", label: "Shingle" },
  { value: "ridge", label: "Ridge" },
  { value: "soft_metal", label: "Soft Metal" },
  { value: "siding", label: "Siding" },
  { value: "screen", label: "Screen" },
  { value: "gutter", label: "Gutter" },
  { value: "flashing", label: "Flashing" },
  { value: "urgent_protection", label: "Urgent" },
  { value: "monitor_only", label: "Monitor Only" },
];

const SEVERITY_OPTIONS: { value: PhotoSeverity; label: string; color: string }[] = [
  { value: "low", label: "Low", color: "text-emerald-400" },
  { value: "medium", label: "Medium", color: "text-sky-400" },
  { value: "high", label: "High", color: "text-amber-400" },
  { value: "critical", label: "Critical", color: "text-rose-500" },
];

export function ProofRefinementModal({ photo, allPhotos, onSave, onCancel }: Props) {
  const [tags, setTags] = useState<PhotoTag[]>(photo.tags || []);
  const [severity, setSeverity] = useState<PhotoSeverity | undefined>(photo.severity);
  const [isSensitive, setIsSensitive] = useState(photo.isSensitive || false);
  const [comparisonId, setComparisonId] = useState(photo.comparisonAssetId);

  const toggleTag = (tag: PhotoTag) => {
    setTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  };

  const handleSave = () => {
    onSave({
      ...photo,
      tags,
      severity,
      isSensitive,
      comparisonAssetId: comparisonId
    });
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[250] bg-black/95 backdrop-blur-3xl flex items-center justify-center p-6"
    >
      <div className="max-w-5xl w-full bg-[#0F0F0F] border border-white/10 rounded-[48px] overflow-hidden flex flex-col lg:flex-row h-[80vh]">
        
        {/* Left: Preview */}
        <div className="flex-1 bg-black relative overflow-hidden group">
          <img src={photo.dataUrl} alt="Preview" className="w-full h-full object-contain" />
          
          <div className="absolute top-8 left-8 flex flex-col gap-3">
            {tags.map(t => (
              <span key={t} className="px-3 py-1 rounded-lg bg-indigo-500 text-[8px] font-mono text-white uppercase tracking-widest border border-indigo-400 shadow-lg">
                {t.replace('_', ' ')}
              </span>
            ))}
          </div>

          {severity && (
            <div className={cn(
              "absolute bottom-8 left-8 px-4 py-2 rounded-xl bg-black/80 border border-white/10 backdrop-blur-md flex items-center gap-3",
              SEVERITY_OPTIONS.find(s => s.value === severity)?.color
            )}>
              <ShieldAlert className="w-4 h-4" />
              <span className="text-[10px] font-mono uppercase tracking-widest font-bold">Severity: {severity}</span>
            </div>
          )}

          {isSensitive && (
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center">
              <div className="flex flex-col items-center gap-4">
                <EyeOff className="w-12 h-12 text-white/40" />
                <p className="text-[10px] font-mono text-white/40 uppercase tracking-[0.4em]">Sensitive Content // Hidden from Buyer</p>
              </div>
            </div>
          )}
        </div>

        {/* Right: Controls */}
        <div className="w-full lg:w-[400px] p-10 border-l border-white/10 flex flex-col overflow-y-auto custom-scrollbar">
          <div className="flex items-center justify-between mb-10">
            <h2 className="text-xl font-display font-medium text-white tracking-tight">Refine Proof</h2>
            <button onClick={onCancel} className="p-2 rounded-xl hover:bg-white/5 text-white/40">
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="space-y-10">
            {/* Tagging */}
            <section className="space-y-4">
              <div className="flex items-center gap-3 text-white/30">
                <Tag className="w-4 h-4" />
                <span className="text-[9px] font-mono uppercase tracking-widest font-bold">Forensic Tagging</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {TAG_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => toggleTag(opt.value)}
                    className={cn(
                      "px-4 py-2 rounded-xl text-[9px] font-mono uppercase tracking-widest border transition-all",
                      tags.includes(opt.value) 
                        ? "bg-indigo-500 border-indigo-400 text-white" 
                        : "bg-white/5 border-white/10 text-white/40 hover:border-white/20"
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </section>

            {/* Severity */}
            <section className="space-y-4">
              <div className="flex items-center gap-3 text-white/30">
                <BarChart3 className="w-4 h-4" />
                <span className="text-[9px] font-mono uppercase tracking-widest font-bold">Evidence Severity</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {SEVERITY_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setSeverity(opt.value)}
                    className={cn(
                      "px-4 py-3 rounded-2xl text-[10px] font-mono uppercase tracking-widest border transition-all text-left flex items-center justify-between",
                      severity === opt.value 
                        ? "bg-white/10 border-white/20 text-white" 
                        : "bg-transparent border-white/5 text-white/20 hover:border-white/10"
                    )}
                  >
                    <span>{opt.label}</span>
                    <div className={cn("w-1.5 h-1.5 rounded-full", opt.color.replace('text-', 'bg-'))} />
                  </button>
                ))}
              </div>
            </section>

            {/* Comparison View */}
            <section className="space-y-4">
              <div className="flex items-center gap-3 text-white/30">
                <Layers className="w-4 h-4" />
                <span className="text-[9px] font-mono uppercase tracking-widest font-bold">Forensic Comparison (Before/After)</span>
              </div>
              <select 
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-xs text-white outline-none"
                value={comparisonId || ""}
                onChange={(e) => setComparisonId(e.target.value || undefined)}
              >
                <option value="">No Comparison Asset</option>
                {allPhotos.filter(p => p.assetId !== photo.assetId).map(p => (
                  <option key={p.assetId} value={p.assetId}>
                    Compare with {p.category} - {p.assetId.slice(-4)}
                  </option>
                ))}
              </select>
            </section>

            {/* Privacy & Sensitivity */}
            <section className="space-y-4">
              <div className="flex items-center gap-3 text-white/30">
                <ShieldAlert className="w-4 h-4" />
                <span className="text-[9px] font-mono uppercase tracking-widest font-bold">Privacy Controls</span>
              </div>
              <button
                onClick={() => setIsSensitive(!isSensitive)}
                className={cn(
                  "w-full flex items-center justify-between p-5 rounded-3xl border transition-all text-left",
                  isSensitive ? "bg-rose-500/10 border-rose-500/30 text-rose-400" : "bg-white/5 border-white/10 text-white/40"
                )}
              >
                <div className="flex items-center gap-4">
                  <EyeOff className="w-5 h-5" />
                  <div className="space-y-0.5">
                    <p className="text-[10px] font-mono uppercase tracking-widest font-bold">Hide from Buyer</p>
                    <p className="text-[8px] opacity-60">Suppresses image from portal/PDF views.</p>
                  </div>
                </div>
                <div className={cn("w-10 h-6 rounded-full relative transition-colors", isSensitive ? "bg-rose-500" : "bg-white/10")}>
                  <div className={cn("absolute top-1 w-4 h-4 rounded-full bg-white transition-all", isSensitive ? "left-5" : "left-1")} />
                </div>
              </button>
            </section>
          </div>

          <div className="mt-auto pt-10">
            <button
              onClick={handleSave}
              className="w-full py-5 rounded-full bg-white text-black font-display font-bold hover:bg-neutral-200 transition-all flex items-center justify-center gap-3 shadow-2xl shadow-white/10"
            >
              <Check className="w-5 h-5" />
              <span>Lock Proof Configuration</span>
            </button>
          </div>
        </div>

      </div>
    </motion.div>
  );
}
