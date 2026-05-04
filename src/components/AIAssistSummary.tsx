"use client";

import { useState } from "react";
import { Sparkles, Check, Edit3, ShieldAlert, FileText, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { draftFindingSummary, type AISummaryResponse } from "@/lib/ai-summary";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  findings: string[];
  outcome: string;
  onApprove: (data: AISummaryResponse) => void;
}

export function AIAssistSummary({ findings, outcome, onApprove }: Props) {
  const [isDrafting, setIsDrafting] = useState(false);
  const [draft, setDraft] = useState<AISummaryResponse | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const handleDraft = async () => {
    setIsDrafting(true);
    // Simulate AI thinking
    await new Promise(r => setTimeout(r, 1500));
    const result = await draftFindingSummary({ findings, photosCount: 4, outcome });
    setDraft(result);
    setIsDrafting(false);
  };

  if (!draft) {
    return (
      <button
        onClick={handleDraft}
        disabled={isDrafting}
        className="w-full p-8 rounded-[32px] bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center gap-4 group hover:bg-indigo-500/20 transition-all"
      >
        {isDrafting ? (
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
            <span className="text-indigo-300 font-display font-medium">Analyzing Forensic Evidence...</span>
          </div>
        ) : (
          <>
            <Sparkles className="w-6 h-6 text-indigo-400 group-hover:scale-110 transition-transform" />
            <div className="text-left">
              <span className="block text-indigo-300 font-display font-medium">Draft Findings with AI</span>
              <span className="text-[10px] font-mono text-indigo-400/60 uppercase tracking-widest">Compliance Shield: ACTIVE</span>
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
      className="space-y-6 p-8 rounded-[40px] bg-white/[0.03] border border-white/10"
    >
      <div className="flex items-center justify-between border-b border-white/5 pb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-500 flex items-center justify-center shadow-[0_0_20px_rgba(99,102,241,0.3)]">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-display font-medium text-white">AI-Drafted Summary</h3>
            <p className="text-[10px] font-mono text-white/30 uppercase tracking-widest">Review & Approve Required</p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
          <ShieldAlert className="w-3 h-3 text-emerald-400" />
          <span className="text-[9px] font-mono text-emerald-400 uppercase tracking-wider">No Compliance Risks Detected</span>
        </div>
      </div>

      <div className="space-y-6 overflow-y-auto max-h-[400px] pr-4">
        <div className="space-y-2">
          <label className="text-[10px] font-mono text-white/30 uppercase tracking-widest">Summary Headline</label>
          <input 
            className="w-full bg-transparent text-xl font-display font-medium text-white outline-none focus:text-indigo-400 transition-colors"
            value={draft.headline}
            onChange={(e) => setDraft({...draft, headline: e.target.value})}
          />
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-mono text-white/30 uppercase tracking-widest">Forensic Finding</label>
          <textarea 
            rows={3}
            className="w-full bg-white/5 border border-white/5 rounded-2xl p-4 text-sm text-white/70 outline-none focus:border-indigo-500/30 transition-all resize-none"
            value={draft.findingSummary}
            onChange={(e) => setDraft({...draft, findingSummary: e.target.value})}
          />
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-mono text-white/30 uppercase tracking-widest">Recommended Path</label>
          <textarea 
            rows={2}
            className="w-full bg-white/5 border border-white/5 rounded-2xl p-4 text-sm text-white/70 outline-none focus:border-indigo-500/30 transition-all resize-none"
            value={draft.pathExplanation}
            onChange={(e) => setDraft({...draft, pathExplanation: e.target.value})}
          />
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-mono text-white/30 uppercase tracking-widest">Technical PDF Copy</label>
          <textarea 
            rows={2}
            className="w-full bg-white/5 border border-white/5 rounded-2xl p-4 text-[10px] font-mono text-white/50 outline-none focus:border-indigo-500/30 transition-all resize-none"
            value={draft.pdfCopy}
            onChange={(e) => setDraft({...draft, pdfCopy: e.target.value})}
          />
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-mono text-white/30 uppercase tracking-widest">Follow-up Communication</label>
          <textarea 
            rows={2}
            className="w-full bg-white/5 border border-white/5 rounded-2xl p-4 text-sm text-white/70 outline-none focus:border-indigo-500/30 transition-all resize-none italic"
            value={draft.followUpNote}
            onChange={(e) => setDraft({...draft, followUpNote: e.target.value})}
          />
        </div>
      </div>

      <div className="flex gap-4 pt-4">
        <button 
          onClick={() => setDraft(null)}
          className="flex-1 px-6 py-4 rounded-3xl bg-white/5 border border-white/10 text-xs font-display font-medium hover:bg-white/10 transition-all"
        >
          Discard Draft
        </button>
        <button 
          onClick={() => onApprove(draft)}
          className="flex-[2] px-6 py-4 rounded-3xl bg-white text-black text-xs font-display font-medium hover:bg-neutral-200 transition-all flex items-center justify-center gap-2"
        >
          <Check className="w-4 h-4" />
          Approve & Save to Dossier
        </button>
      </div>
    </motion.div>
  );
}
