"use client";
import { motion, AnimatePresence } from "framer-motion";
import { LayoutGrid, User } from "lucide-react";
import type { PendingImport } from "./useRepCommandCenter";

interface Props {
  pendingImport: PendingImport | null;
  isConfirming: boolean;
  onConfirm: () => void;
  onDismiss: () => void;
}

export function ImportConfirmModal({ pendingImport, isConfirming, onConfirm, onDismiss }: Props) {
  return (
    <AnimatePresence>
      {pendingImport && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          <motion.div
            className="bg-[#111] border border-white/10 rounded-[32px] p-8 max-w-sm w-full mx-6 space-y-6"
            initial={{ scale: 0.96, opacity: 0, y: 8 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.96, opacity: 0, y: 8 }}
            transition={{ duration: 0.18 }}
          >
            <div className="space-y-1">
              <p className="text-[9px] font-mono text-[#3F5878] uppercase tracking-[0.2em]">Confirm</p>
              <h2 className="text-xl font-display font-medium tracking-tight">Start Inspection?</h2>
              <p className="text-sm text-[#7090B0] font-light">
                Save this session locally and begin the inspection flow.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.08] space-y-2">
              <div className="flex items-center gap-2 text-xs font-mono text-[#8BA5C5] uppercase tracking-wider">
                <LayoutGrid className="w-3.5 h-3.5 text-indigo-400/50 shrink-0" />
                {pendingImport.address}
              </div>
              {pendingImport.homeownerName && (
                <div className="flex items-center gap-2 text-xs font-mono text-[#567090] uppercase tracking-wider">
                  <User className="w-3.5 h-3.5 text-indigo-400/50 shrink-0" />
                  {pendingImport.homeownerName}
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={onDismiss}
                disabled={isConfirming}
                className="flex-1 py-3 rounded-2xl border border-white/10 text-sm text-[#7090B0] hover:text-[#E8EDF8] hover:border-white/20 font-display transition-all disabled:opacity-40 disabled:pointer-events-none"
              >
                Cancel
              </button>
              <button
                onClick={onConfirm}
                disabled={isConfirming}
                className="flex-1 py-3 rounded-2xl bg-white text-black text-sm font-display font-medium hover:bg-white/90 transition-all disabled:opacity-60 disabled:pointer-events-none"
              >
                {isConfirming ? "Starting…" : "Start Inspection"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
