"use client";
import { useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, CheckCircle2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { parseNoteEntries, noteEntryIcon } from "./pipelineTypes";

interface Props {
  open: boolean;
  leadName: string;
  existingNotes: string;
  newNoteText: string;
  onNoteChange: (v: string) => void;
  onSave: () => void;
  onClose: () => void;
}

export function NotesPanel({ open, leadName, existingNotes, newNoteText, onNoteChange, onSave, onClose }: Props) {
  const notesRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (open) setTimeout(() => notesRef.current?.focus(), 100);
  }, [open]);

  const entries = parseNoteEntries(existingNotes);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={onClose} />
          <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 32, stiffness: 340 }}
            className="fixed right-0 top-0 bottom-0 w-[440px] max-w-full bg-[var(--bg-elevated)] border-l border-[var(--border-color)] z-50 flex flex-col shadow-2xl"
          >
            <div className="flex items-center justify-between px-8 py-6 border-b border-[var(--border-color)]">
              <div>
                <div className="flex items-center gap-2.5 mb-0.5">
                  <MessageSquare className="w-4 h-4 text-[#2563ba]" />
                  <h3 className="text-lg font-inter font-medium">Activity Log</h3>
                </div>
                <p className="text-xs text-[var(--tx2)] opacity-60 font-light">{leadName}</p>
              </div>
              <button onClick={onClose} className="p-2.5 rounded-2xl text-[var(--tx2)] opacity-60 hover:opacity-100 hover:text-[var(--tx1)] hover:bg-[var(--bg-subtle)] transition-all">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-8 py-6 space-y-3">
              {entries.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-[var(--bg-subtle)] border border-[var(--border-color)] flex items-center justify-center mb-4">
                    <MessageSquare className="w-5 h-5 text-[var(--tx2)] opacity-40" />
                  </div>
                  <p className="text-[var(--tx2)] opacity-60 text-sm font-light">No activity yet</p>
                  <p className="text-[var(--tx2)] opacity-40 text-xs mt-1">Add a note below to get started</p>
                </div>
              ) : (
                [...entries].reverse().map((entry, i) => {
                  const { icon: EntryIcon, color } = noteEntryIcon(entry.content);
                  return (
                    <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }} className="flex gap-3"
                    >
                      <div className={cn("w-7 h-7 rounded-xl flex items-center justify-center shrink-0 mt-0.5", color)}>
                        <EntryIcon className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex-1 bg-[var(--bg-subtle)] border border-[var(--border-color)] rounded-2xl px-4 py-3 min-w-0">
                        {entry.timestamp && (
                          <p className="text-[9px] font-mono text-[var(--tx2)] opacity-60 uppercase tracking-widest mb-1.5">{entry.timestamp}</p>
                        )}
                        <p className="text-sm text-[var(--tx1)] font-light leading-relaxed break-words whitespace-pre-wrap">{entry.content}</p>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>

            <div className="px-8 py-6 border-t border-[var(--border-color)] space-y-3">
              <textarea ref={notesRef} value={newNoteText} onChange={e => onNoteChange(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) onSave(); }}
                onPaste={e => {
                  const pasted = e.clipboardData.getData("text");
                  const el = e.currentTarget;
                  const start = el.selectionStart ?? newNoteText.length;
                  const end   = el.selectionEnd   ?? newNoteText.length;
                  e.preventDefault();
                  onNoteChange(newNoteText.slice(0, start) + pasted + newNoteText.slice(end));
                }}
                placeholder="Add a note… (⌘↵ to save)" rows={3}
                className="w-full bg-[var(--bg-subtle)] border border-[var(--border-color)] rounded-2xl px-4 py-3 text-sm text-[var(--tx1)] placeholder:text-[var(--tx2)] focus:outline-none focus:border-[#2563ba]/40 resize-none leading-relaxed"
              />
              <div className="flex gap-3">
                <button onClick={onClose}
                  className="flex-1 py-2.5 rounded-2xl bg-[var(--bg-subtle)] border border-[var(--border-color)] text-[var(--tx2)] opacity-60 hover:opacity-100 hover:text-[var(--tx1)] hover:border-[var(--border-color)] transition-all text-sm">
                  Close
                </button>
                <button onClick={onSave} disabled={!newNoteText.trim()}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-2xl bg-[#2563ba]/20 border border-[#2563ba]/30 text-[#4a8fd4] hover:bg-[#2563ba]/30 disabled:opacity-30 disabled:cursor-not-allowed transition-all text-sm font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Add Note
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
