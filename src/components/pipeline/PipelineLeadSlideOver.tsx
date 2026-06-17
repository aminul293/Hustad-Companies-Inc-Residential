"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { PipelineLead } from "./pipelineTypes";
import { PipelineLeadCard } from "./PipelineLeadCard";

interface Props {
  open: boolean;
  onClose: () => void;
  lead: PipelineLead | null;
  repId?: string;
  repsMap?: Record<string, string>;
  removing: boolean;
  onStageClick:       (lead: PipelineLead, idx: number) => void;
  onCall:             (lead: PipelineLead) => void;
  onFollowUp:         (lead: PipelineLead) => void;
  onSchedule:         (lead: PipelineLead) => void;
  onStartInspection:  (lead: PipelineLead) => void;
  onNotes:            (lead: PipelineLead) => void;
  onDraftEmail:       (lead: PipelineLead) => void;
  onEditPhone:        (lead: PipelineLead) => void;
  onEditEmail:        (lead: PipelineLead) => void;
  onDeadLead:         (lead: PipelineLead) => void;
  onRemove:           (e: React.MouseEvent, lead: PipelineLead) => void;
}

export function PipelineLeadSlideOver({
  open, onClose, lead,
  ...rest
}: Props) {
  return (
    <AnimatePresence>
      {open && lead && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          />
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 bottom-0 w-full max-w-[420px] bg-[#0b0b0b] border-l border-white/10 z-50 overflow-y-auto shadow-2xl flex flex-col"
          >
            <div className="flex items-center justify-between p-6 border-b border-white/10 shrink-0">
              <h2 className="text-lg font-inter font-medium text-[#E8EDF8]">Lead Details</h2>
              <button
                onClick={onClose}
                className="p-2 -mr-2 rounded-xl text-[#7090B0] hover:text-white hover:bg-white/10 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6">
              <PipelineLeadCard
                variant="default"
                lead={lead}
                {...rest}
              />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
