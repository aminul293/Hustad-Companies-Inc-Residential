"use client";

import { useState } from "react";
import { Sparkles, Check, Edit3, ShieldAlert, FileText, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { draftFindingSummary, type AISummaryResponse } from "@/lib/ai-summary";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "@/components/ThemeProvider";

interface Props {
  findings: string[];
  photosCount: number;
  outcome: string;
  internalNotes?: string;
  onApprove: (data: AISummaryResponse) => void;
}

export function AIAssistSummary({ findings, photosCount, outcome, internalNotes, onApprove }: Props) {
  const [isDrafting, setIsDrafting] = useState(false);
  const [draft, setDraft] = useState<AISummaryResponse | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const handleDraft = async () => {
    setIsDrafting(true);
    // Simulate AI thinking
    await new Promise(r => setTimeout(r, 1500));
    const result = await draftFindingSummary({ findings, photosCount, outcome, internalNotes });
    setDraft(result);
    setIsDrafting(false);
  };

  if (!draft) {
    return (
      <button
        onClick={handleDraft}
        disabled={isDrafting}
        className={cn(
          "w-full p-8 rounded-[32px] flex items-center justify-center gap-4 group transition-all border",
          isDark 
            ? "bg-indigo-500/10 border-indigo-500/20 hover:bg-indigo-500/20" 
            : "bg-indigo-50 border-indigo-200 hover:bg-indigo-100"
        )}
      >
        {isDrafting ? (
          <div className="flex items-center gap-3">
            <div className={cn("w-5 h-5 border-2 border-t-transparent rounded-full animate-spin", isDark ? "border-indigo-400" : "border-indigo-600")} />
            <span className={cn("font-display font-medium", isDark ? "text-indigo-300" : "text-indigo-700")}>Analyzing Forensic Evidence...</span>
          </div>
        ) : (
          <>
            <Sparkles className={cn("w-6 h-6 group-hover:scale-110 transition-transform", isDark ? "text-indigo-400" : "text-indigo-600")} />
            <div className="text-left">
              <span className={cn("block font-display font-medium", isDark ? "text-indigo-300" : "text-indigo-700")}>Draft Findings with AI</span>
              <span className={cn("text-[10px] font-mono uppercase tracking-widest", isDark ? "text-indigo-400/60" : "text-indigo-600/70")}>Compliance Shield: ACTIVE</span>
            </div>
          </>
        )}
      </button>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }} 
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "space-y-6 p-8 rounded-[40px] border",
        isDark ? "bg-white/[0.03] border-white/10" : "bg-black/[0.02] border-black/10"
      )}
    >
      <div className={cn("flex items-center justify-between border-b pb-6", isDark ? "border-white/5" : "border-black/5")}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-500 flex items-center justify-center shadow-[0_0_20px_rgba(99,102,241,0.3)]">
            <Sparkles className="w-5 h-5 text-[#E8EDF8]" />
          </div>
          <div>
            <h3 className={cn("font-display font-medium", isDark ? "text-[#E8EDF8]" : "text-[#1B2B4B]")}>AI-Drafted Summary</h3>
            <p className="text-[10px] font-mono text-[#3F5878] uppercase tracking-widest">Review & Approve Required</p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
          <ShieldAlert className={cn("w-3 h-3", isDark ? "text-emerald-400" : "text-emerald-600")} />
          <span className={cn("text-[9px] font-mono uppercase tracking-wider", isDark ? "text-emerald-400" : "text-emerald-600")}>No Compliance Risks Detected</span>
        </div>
      </div>

      <div className="space-y-6 overflow-y-auto max-h-[400px] pr-4">
        <div className="space-y-2">
          <label className="text-[10px] font-mono text-[#3F5878] uppercase tracking-widest">Summary Headline</label>
          <input 
            className={cn(
              "w-full bg-transparent text-xl font-display font-medium outline-none transition-colors",
              isDark ? "text-[#E8EDF8] focus:text-indigo-400" : "text-[#1B2B4B] focus:text-indigo-600"
            )}
            value={draft.headline}
            onChange={(e) => setDraft({...draft, headline: e.target.value})}
          />
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-mono text-[#3F5878] uppercase tracking-widest">Forensic Finding</label>
          <textarea 
            rows={3}
            className={cn(
              "w-full rounded-2xl p-4 text-sm outline-none transition-all resize-none border",
              isDark ? "bg-white/5 border-white/5 text-[#AABDCF] focus:border-indigo-500/30" : "bg-black/5 border-black/5 text-[#1B2B4B] focus:border-indigo-500/40"
            )}
            value={draft.findingSummary}
            onChange={(e) => setDraft({...draft, findingSummary: e.target.value})}
          />
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-mono text-[#3F5878] uppercase tracking-widest">Recommended Path</label>
          <textarea 
            rows={2}
            className={cn(
              "w-full rounded-2xl p-4 text-sm outline-none transition-all resize-none border",
              isDark ? "bg-white/5 border-white/5 text-[#AABDCF] focus:border-indigo-500/30" : "bg-black/5 border-black/5 text-[#1B2B4B] focus:border-indigo-500/40"
            )}
            value={draft.pathExplanation}
            onChange={(e) => setDraft({...draft, pathExplanation: e.target.value})}
          />
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-mono text-[#3F5878] uppercase tracking-widest">Technical PDF Copy</label>
          <textarea 
            rows={2}
            className={cn(
              "w-full rounded-2xl p-4 text-[10px] font-mono outline-none transition-all resize-none border",
              isDark ? "bg-white/5 border-white/5 text-[#7090B0] focus:border-indigo-500/30" : "bg-black/5 border-black/5 text-[#1B2B4B] focus:border-indigo-500/40"
            )}
            value={draft.pdfCopy}
            onChange={(e) => setDraft({...draft, pdfCopy: e.target.value})}
          />
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-mono text-[#3F5878] uppercase tracking-widest">Follow-up Communication</label>
          <textarea 
            rows={2}
            className={cn(
              "w-full rounded-2xl p-4 text-sm outline-none transition-all resize-none italic border",
              isDark ? "bg-white/5 border-white/5 text-[#AABDCF] focus:border-indigo-500/30" : "bg-black/5 border-black/5 text-[#1B2B4B] focus:border-indigo-500/40"
            )}
            value={draft.followUpNote}
            onChange={(e) => setDraft({...draft, followUpNote: e.target.value})}
          />
        </div>
      </div>

      <div className="flex gap-4 pt-4">
        <button 
          onClick={() => setDraft(null)}
          className={cn(
            "flex-1 px-6 py-4 rounded-3xl border text-xs font-display font-medium transition-all",
            isDark ? "bg-white/5 border-white/10 hover:bg-white/10 text-[#E8EDF8]" : "bg-black/5 border-black/10 hover:bg-black/10 text-[#1B2B4B]"
          )}
        >
          Discard Draft
        </button>
        <button 
          onClick={() => onApprove(draft)}
          className={cn(
            "flex-[2] px-6 py-4 rounded-3xl text-xs font-display font-medium transition-all flex items-center justify-center gap-2",
            isDark ? "bg-white text-black hover:bg-neutral-200" : "bg-[#1B2B4B] text-white hover:bg-[#2A3B5B]"
          )}
        >
          <Check className="w-4 h-4" />
          Approve & Save to Dossier
        </button>
      </div>
    </motion.div>
  );
}
