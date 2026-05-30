"use client";
import { motion, AnimatePresence } from "framer-motion";
import { CalendarDays, CheckCircle2, AlertTriangle, ChevronRight, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { TIME_SLOTS, DURATIONS, fmtTime } from "./pipelineTypes";

interface Props {
  open: boolean;
  leadName: string;
  schedDate: string;
  schedTime: string;
  schedDuration: number;
  clashWarning: string | null;
  scheduling: boolean;
  onDateChange: (v: string) => void;
  onTimeChange: (v: string) => void;
  onDurationChange: (v: number) => void;
  onConfirm: (force?: boolean) => void;
  onClose: () => void;
}

export function ScheduleModal({
  open, leadName, schedDate, schedTime, schedDuration,
  clashWarning, scheduling, onDateChange, onTimeChange,
  onDurationChange, onConfirm, onClose,
}: Props) {
  const summary = () => {
    if (!schedDate) return null;
    const d = new Date(`${schedDate}T${schedTime}:00`);
    const dateStr = d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
    const timeStr = fmtTime(d.toISOString());
    const durStr = schedDuration < 60 ? `${schedDuration} min` : `${schedDuration / 60} hr`;
    return `${dateStr} at ${timeStr} · ${durStr}`;
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4"
        >
          <motion.div initial={{ opacity: 0, scale: 0.96, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }} transition={{ type: "spring", damping: 28, stiffness: 320 }}
            className="bg-[#0d0d0d] border border-white/10 rounded-3xl p-8 w-full max-w-md shadow-2xl"
          >
            <div className="flex items-start justify-between mb-7">
              <div>
                <div className="flex items-center gap-2.5 mb-1">
                  <CalendarDays className="w-5 h-5 text-[#2a8a82]" />
                  <h3 className="text-xl font-inter font-medium">Schedule Inspection</h3>
                </div>
                <p className="text-sm text-[#4D678A] font-light">{leadName}</p>
              </div>
              <button onClick={onClose} className="p-2 rounded-2xl text-[#3F5878] hover:text-[#E8EDF8] hover:bg-white/5 transition-all">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mb-6">
              <label className="text-[9px] font-mono text-[#3F5878] uppercase tracking-widest block mb-2">Date</label>
              <input type="date" value={schedDate} min={new Date().toISOString().split("T")[0]}
                onChange={e => onDateChange(e.target.value)}
                className="w-full bg-white/[0.04] border border-white/10 rounded-2xl px-4 py-3 text-[#E8EDF8] text-sm focus:outline-none focus:border-[#2563ba]/50 [color-scheme:dark]"
              />
            </div>

            <div className="mb-6">
              <label className="text-[9px] font-mono text-[#3F5878] uppercase tracking-widest block mb-2.5">Time</label>
              <div className="grid grid-cols-4 gap-2">
                {TIME_SLOTS.map(slot => (
                  <button key={slot.value} onClick={() => onTimeChange(slot.value)}
                    className={cn("py-2.5 rounded-xl text-xs font-medium transition-all",
                      schedTime === slot.value
                        ? "bg-[#2563ba] text-white"
                        : "bg-white/[0.04] text-[#4D678A] hover:bg-white/[0.08] hover:text-[#AABDCF]"
                    )}>{slot.label}</button>
                ))}
              </div>
            </div>

            <div className="mb-7">
              <label className="text-[9px] font-mono text-[#3F5878] uppercase tracking-widest block mb-2.5">Duration</label>
              <div className="flex gap-2">
                {DURATIONS.map(dur => (
                  <button key={dur.value} onClick={() => onDurationChange(dur.value)}
                    className={cn("flex-1 py-2.5 rounded-xl text-xs font-medium transition-all",
                      schedDuration === dur.value
                        ? "bg-[#2a8a82]/20 border border-[#2a8a82]/40 text-[#3aada3]"
                        : "bg-white/[0.04] text-[#3F5878] hover:bg-white/[0.07] hover:text-[#8BA5C5]"
                    )}>{dur.label}</button>
                ))}
              </div>
            </div>

            {schedDate && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="flex items-center gap-3 bg-[#2563ba]/[0.08] border border-[#2563ba]/15 rounded-2xl px-4 py-3 mb-4"
              >
                <CheckCircle2 className="w-4 h-4 text-[#4a8fd4] shrink-0" />
                <p className="text-sm text-[#4a8fd4] font-medium">{summary()}</p>
              </motion.div>
            )}

            {clashWarning && (
              <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                className="flex items-start gap-3 bg-rose-500/[0.08] border border-rose-500/20 rounded-2xl px-4 py-3 mb-4"
              >
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-rose-300 font-medium">Scheduling Conflict</p>
                  <p className="text-xs text-rose-400/70 font-light mt-0.5">{clashWarning}</p>
                </div>
                <button onClick={() => onConfirm(true)}
                  className="text-[10px] font-mono text-rose-400/60 hover:text-rose-300 uppercase tracking-widest whitespace-nowrap shrink-0 transition-colors">
                  Override
                </button>
              </motion.div>
            )}

            <div className="flex gap-3">
              <button onClick={onClose}
                className="flex-1 py-3 rounded-2xl bg-white/5 border border-white/10 text-[#7090B0] hover:text-[#E8EDF8] hover:border-white/20 transition-all text-sm">
                Cancel
              </button>
              <button onClick={() => onConfirm(false)} disabled={!schedDate || scheduling}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-[#2a8a82]/20 border border-[#2a8a82]/30 text-[#3aada3] hover:bg-[#2a8a82]/30 disabled:opacity-30 disabled:cursor-not-allowed transition-all text-sm font-medium"
              >
                {scheduling
                  ? <><div className="w-3.5 h-3.5 border-2 border-[#2a8a82]/30 border-t-[#3aada3] rounded-full animate-spin" /> Checking…</>
                  : <>Confirm Schedule <ChevronRight className="w-4 h-4" /></>}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
