"use client";
import { motion, AnimatePresence } from "framer-motion";
import {
  CalendarDays, CheckCircle2, Activity, Settings,
  PlayCircle, Check as CheckIcon, X, TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { CommandCenterView } from "./useRepCommandCenter";

interface Props {
  open: boolean;
  view: CommandCenterView;
  onNavigate: (v: CommandCenterView) => void;
  onClose: () => void;
  onNewSession?: () => void;
}

const ITEMS = [
  { id: "opportunities" as const, label: "Opportunities",    icon: TrendingUp,  sub: "Sales opps from sessions" },
  { id: "calendar"      as const, label: "Calendar",         icon: CalendarDays, sub: "Day & week view" },
  { id: "manager"       as const, label: "Manager Dashboard",icon: Activity,     sub: "All-rep activity" },
  { id: "settings"      as const, label: "Settings",         icon: Settings,     sub: "Reps & configuration" },
] as const;

export function MobileMoreDrawer({ open, view, onNavigate, onClose, onNewSession }: Props) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="md:hidden fixed inset-0 z-30 bg-black/50 backdrop-blur-sm"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="md:hidden fixed bottom-16 left-3 right-3 z-40 rounded-[28px] bg-[#111827] border border-white/[0.1] p-2 overflow-hidden"
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.96 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="flex items-center justify-between px-3 py-2 mb-1">
              <p className="text-[9px] font-mono text-[#3F5878] uppercase tracking-[0.2em]">More Sections</p>
              <button onClick={onClose} className="p-1 rounded-lg text-[#3F5878] hover:text-white transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {ITEMS.map(item => (
              <button
                key={item.id}
                onClick={() => { onNavigate(item.id); onClose(); }}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-3 rounded-2xl transition-all active:scale-[0.98] text-left",
                  view === item.id ? "bg-indigo-500/15 text-indigo-300" : "text-[#C2D0E4] hover:bg-white/5"
                )}
              >
                <div className={cn("p-2 rounded-xl", view === item.id ? "bg-indigo-500/20" : "bg-white/5")}>
                  <item.icon className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-sm font-display font-medium">{item.label}</p>
                  <p className="text-[10px] font-mono text-[#567090]">{item.sub}</p>
                </div>
                {view === item.id && <CheckIcon className="w-4 h-4 ml-auto text-indigo-400" />}
              </button>
            ))}

            {onNewSession && (
               <>
                 <div className="h-px bg-white/[0.06] my-2" />
                 <button
                   onClick={() => { onNewSession(); onClose(); }}
                   className="w-full flex items-center gap-3 px-3 py-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 hover:bg-indigo-500/20 transition-all active:scale-[0.98]"
                 >
                   <div className="p-2 rounded-xl bg-indigo-500/20">
                     <PlayCircle className="w-4 h-4" />
                   </div>
                   <p className="text-sm font-display font-medium">New Inspection</p>
                 </button>
               </>
             )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
