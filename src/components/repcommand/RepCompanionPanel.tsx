"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, ShieldAlert, CheckCircle2 } from "lucide-react";
import { getActivePrompt } from "@/lib/prompt-engine";
import { cn } from "@/lib/utils";
import type { SessionState } from "@/types/session";

export function RepCompanionPanel({ session }: { session: SessionState }) {
  const activePrompt = session ? getActivePrompt(session) : null;
  const [logged, setLogged] = useState(false);

  if (!session || !activePrompt) {
    return null; // No active prompt for this state
  }

  const handleChipClick = (chip: string) => {
    // In a real implementation, this would log to audit events or update session state
    // based on activePrompt.log_fields
    setLogged(true);
    setTimeout(() => setLogged(false), 2000);
  };

  return (
    <div className="bg-[#1C2127] border border-white/10 rounded-2xl p-4 flex flex-col gap-4 shadow-xl">
      <div className="flex items-center gap-2 text-[#7090B0] text-xs font-semibold uppercase tracking-wider">
        <MessageSquare size={14} />
        <span>Sales Brain Suggestion</span>
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-zinc-300 text-sm italic border-l-2 border-indigo-500/50 pl-3 py-1">
          "{activePrompt.rep_script}"
        </p>
        <p className="text-white font-medium text-base">
          {activePrompt.rep_question}
        </p>
      </div>

      <div className="flex flex-wrap gap-2 mt-2">
        {activePrompt.answer_chips.map((chip, idx) => (
          <button
            key={idx}
            onClick={() => handleChipClick(chip)}
            className="px-3 py-1.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-xs font-medium hover:bg-indigo-500/20 transition-colors"
          >
            {chip}
          </button>
        ))}
      </div>

      <AnimatePresence>
        {logged && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="text-emerald-400 flex items-center gap-1 text-xs mt-1"
          >
            <CheckCircle2 size={12} />
            Response logged
          </motion.div>
        )}
      </AnimatePresence>

      {activePrompt.guardrail && (
        <div className="mt-2 bg-amber-500/10 border border-amber-500/20 rounded-lg p-2.5 flex gap-2 items-start text-amber-500">
          <ShieldAlert size={14} className="mt-0.5 shrink-0" />
          <p className="text-[11px] leading-tight">
            <strong>Guardrail:</strong> {activePrompt.guardrail}
          </p>
        </div>
      )}
    </div>
  );
}
