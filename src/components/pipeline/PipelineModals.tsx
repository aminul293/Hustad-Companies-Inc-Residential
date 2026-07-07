"use client";
import { motion, AnimatePresence } from "framer-motion";
import {
  Phone, Mail, User, Clock,
  XCircle, MinusCircle, ChevronLeft,
  AlertCircle, CheckCircle2, X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { addDays, STAGE_LABELS } from "./pipelineTypes";

// ─── Shared modal shell ───────────────────────────────────────────────────────
function ModalShell({ children, onClose }: { children: React.ReactNode; onClose?: () => void }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4"
    >
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }} transition={{ type: "spring", damping: 28, stiffness: 320 }}
        className="bg-[var(--bg-elevated)] border border-[var(--border-color)] rounded-3xl p-8 w-full max-w-sm shadow-2xl"
      >
        {children}
      </motion.div>
    </motion.div>
  );
}

// ─── Call Modal ───────────────────────────────────────────────────────────────
interface CallModalProps {
  open: boolean;
  leadName: string;
  phone: string | null;
  email: string | null;
  ownerName: string;
  callOutcome: "reached" | "no_answer" | "voicemail" | "wrong_number" | null;
  callNote: string;
  onOutcomeChange: (v: "reached" | "no_answer" | "voicemail" | "wrong_number") => void;
  onNoteChange: (v: string) => void;
  onConfirm: () => void;
  onClose: () => void;
}
export function CallModal({ open, leadName, phone, email, ownerName, callOutcome, callNote, onOutcomeChange, onNoteChange, onConfirm, onClose }: CallModalProps) {
  return (
    <AnimatePresence>
      {open && (
        <ModalShell>
          <div className="flex items-start justify-between mb-6">
            <div>
              <div className="flex items-center gap-2.5 mb-1"><Phone className="w-5 h-5 text-sky-400" /><h3 className="text-xl font-inter font-medium">Log Call</h3></div>
              <p className="text-sm text-[var(--tx2)] opacity-60 font-light">{leadName}</p>
            </div>
            <button onClick={onClose} className="p-2 rounded-2xl text-[var(--tx2)] opacity-60 hover:opacity-100 hover:text-[var(--tx1)] hover:bg-[var(--bg-subtle)] transition-all"><X className="w-4 h-4" /></button>
          </div>
          <div className="bg-[var(--bg-subtle)] border border-[var(--border-color)] rounded-2xl p-5 mb-6">
            <div className="flex items-center gap-3 mb-3"><User className="w-4 h-4 text-[var(--tx2)] opacity-40 shrink-0" /><span className="text-sm text-[var(--tx1)] font-light">{ownerName.replace(/\b\w/g, c => c.toUpperCase())}</span></div>
            {phone ? (
              <a href={`tel:${phone.replace(/\D/g, "")}`} className="flex items-center gap-3 group mb-2">
                <Phone className="w-4 h-4 text-sky-400 shrink-0" />
                <span className="text-lg font-inter font-medium text-sky-300 group-hover:text-sky-200 transition-colors">{phone}</span>
                <span className="ml-auto text-[9px] font-mono text-sky-400/40 group-hover:text-sky-400/70 uppercase tracking-widest transition-colors">Tap to call</span>
              </a>
            ) : (
              <div className="flex items-center gap-3 mb-2"><Phone className="w-4 h-4 text-[var(--tx2)] opacity-30 shrink-0" /><span className="text-sm text-[var(--tx2)] opacity-40 font-light italic">No phone number on file</span></div>
            )}
            {email && (
              <a href={`mailto:${email}`} className="flex items-center gap-3 group">
                <Mail className="w-4 h-4 text-[#2563ba]/60 shrink-0" />
                <span className="text-sm text-[#4a8fd4]/70 group-hover:text-[#4a8fd4] transition-colors truncate">{email}</span>
                <span className="ml-auto text-[9px] font-mono text-[#2563ba]/30 group-hover:text-[#2563ba]/60 uppercase tracking-widest transition-colors shrink-0">Email</span>
              </a>
            )}
          </div>
          <div className="mb-6">
            <label className="text-[9px] font-mono text-[var(--tx2)] opacity-60 uppercase tracking-widest block mb-2.5">Call Outcome</label>
            <div className="grid grid-cols-2 gap-2">
              {([
                { value: "reached",      label: "✓ Reached",    active: "bg-[#2a8a82]/20 border-[#2a8a82]/40 text-[#3aada3]" },
                { value: "no_answer",    label: "No Answer",    active: "bg-amber-500/20 border-amber-500/40 text-amber-300" },
                { value: "voicemail",    label: "Voicemail",    active: "bg-sky-500/20 border-sky-500/40 text-sky-300" },
                { value: "wrong_number", label: "Wrong Number", active: "bg-rose-500/20 border-rose-500/40 text-rose-300" },
              ] as const).map(opt => (
                <button key={opt.value} onClick={() => onOutcomeChange(opt.value)}
                  className={cn("py-3 rounded-2xl text-sm font-medium border transition-all",
                    callOutcome === opt.value ? opt.active : "bg-[var(--bg-subtle)] border-[var(--border-color)] text-[var(--tx2)] opacity-60 hover:bg-[var(--bg-elevated)] hover:opacity-100"
                  )}>{opt.label}</button>
              ))}
            </div>
          </div>
          <div className="mb-7">
            <label className="text-[9px] font-mono text-[var(--tx2)] opacity-60 uppercase tracking-widest block mb-2">Quick Note (optional)</label>
            <input type="text" value={callNote} onChange={e => onNoteChange(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && callOutcome) onConfirm(); }}
              placeholder="e.g. 'Interested — send quote', 'Call back Friday'"
              className="w-full bg-[var(--bg-subtle)] border border-[var(--border-color)] rounded-2xl px-4 py-3 text-[var(--tx1)] text-sm placeholder:text-[var(--tx2)] focus:outline-none focus:border-sky-500/40"
            />
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 py-3 rounded-2xl bg-[var(--bg-subtle)] border border-[var(--border-color)] text-[var(--tx2)] opacity-60 hover:opacity-100 hover:text-[var(--tx1)] hover:border-[var(--border-color)] transition-all text-sm">Cancel</button>
            <button onClick={onConfirm} disabled={!callOutcome}
              className="flex-1 py-3 rounded-2xl bg-sky-500/15 border border-sky-500/25 text-sky-300 hover:bg-sky-500/25 disabled:opacity-30 disabled:cursor-not-allowed transition-all text-sm font-medium">
              Log Call
            </button>
          </div>
        </ModalShell>
      )}
    </AnimatePresence>
  );
}

// ─── Draft Email Modal ────────────────────────────────────────────────────────
interface DraftEmailModalProps {
  open: boolean;
  leadName: string;
  to: string;
  subject: string;
  body: string;
  sending: boolean;
  sent: boolean;
  error: string | null;
  onToChange: (v: string) => void;
  onSubjectChange: (v: string) => void;
  onBodyChange: (v: string) => void;
  onSend: () => void;
  onClose: () => void;
}
export function DraftEmailModal({ open, leadName, to, subject, body, sending, sent, error, onToChange, onSubjectChange, onBodyChange, onSend, onClose }: DraftEmailModalProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4"
        >
          <motion.div initial={{ opacity: 0, scale: 0.96, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }} transition={{ type: "spring", damping: 28, stiffness: 320 }}
            className="bg-[var(--bg-elevated)] border border-[var(--border-color)] rounded-3xl p-8 w-full max-w-lg shadow-2xl"
          >
            <div className="flex items-start justify-between mb-6">
              <div><div className="flex items-center gap-2.5 mb-1"><Mail className="w-5 h-5 text-[#2563ba]" /><h3 className="text-xl font-inter font-medium">Draft Email</h3></div><p className="text-sm text-[var(--tx2)] opacity-60 font-light">{leadName}</p></div>
              <button onClick={onClose} className="p-2 rounded-2xl text-[var(--tx2)] opacity-60 hover:opacity-100 hover:text-[var(--tx1)] hover:bg-[var(--bg-subtle)] transition-all"><X className="w-4 h-4" /></button>
            </div>
            <div className="mb-4"><label className="text-[9px] font-mono text-[var(--tx2)] opacity-60 uppercase tracking-widest block mb-2">To</label><input type="email" value={to} onChange={e => onToChange(e.target.value)} className="w-full bg-[var(--bg-subtle)] border border-[var(--border-color)] rounded-2xl px-4 py-3 text-[var(--tx1)] text-sm focus:outline-none focus:border-[#2563ba]/40" /></div>
            <div className="mb-4"><label className="text-[9px] font-mono text-[var(--tx2)] opacity-60 uppercase tracking-widest block mb-2">Subject</label><input type="text" value={subject} onChange={e => onSubjectChange(e.target.value)} className="w-full bg-[var(--bg-subtle)] border border-[var(--border-color)] rounded-2xl px-4 py-3 text-[var(--tx1)] text-sm focus:outline-none focus:border-[#2563ba]/40" /></div>
            <div className="mb-7"><label className="text-[9px] font-mono text-[var(--tx2)] opacity-60 uppercase tracking-widest block mb-2">Message</label><textarea value={body} onChange={e => onBodyChange(e.target.value)} rows={9} className="w-full bg-[var(--bg-subtle)] border border-[var(--border-color)] rounded-2xl px-4 py-3 text-[var(--tx1)] text-sm focus:outline-none focus:border-[#2563ba]/40 resize-none leading-relaxed" /></div>
            <AnimatePresence>
              {error && (<motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex items-start gap-3 bg-rose-500/[0.08] border border-rose-500/20 rounded-2xl px-4 py-3 mb-4"><AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" /><div className="min-w-0"><p className="text-sm text-rose-300 font-medium">Failed to send</p><p className="text-xs text-rose-400/70 font-light mt-0.5 break-words">{error}</p></div></motion.div>)}
              {sent && (<motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex items-center gap-3 bg-[#2a8a82]/[0.08] border border-[#2a8a82]/20 rounded-2xl px-4 py-3 mb-4"><CheckCircle2 className="w-4 h-4 text-[#3aada3] shrink-0" /><p className="text-sm text-[#3aada3] font-medium">Email sent successfully via Outlook</p></motion.div>)}
            </AnimatePresence>
            <div className="flex gap-3">
              <button onClick={onClose} className="flex-1 py-3 rounded-2xl bg-[var(--bg-subtle)] border border-[var(--border-color)] text-[var(--tx2)] opacity-60 hover:opacity-100 hover:text-[var(--tx1)] hover:border-[var(--border-color)] transition-all text-sm">Cancel</button>
              <button onClick={onSend} disabled={sending || sent || !to.includes("@")}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-[#2563ba]/20 border border-[#2563ba]/30 text-[#4a8fd4] hover:bg-[#2563ba]/30 disabled:opacity-40 disabled:cursor-not-allowed transition-all text-sm font-medium">
                {sending ? <><div className="w-3.5 h-3.5 border-2 border-[#2563ba]/30 border-t-[#4a8fd4] rounded-full animate-spin" />Sending…</> : sent ? <><CheckCircle2 className="w-4 h-4" />Sent</> : <><Mail className="w-4 h-4" />Send via Outlook</>}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Edit Phone Modal ─────────────────────────────────────────────────────────
interface EditContactModalProps { open: boolean; leadName: string; current: string; value: string; onChange: (v: string) => void; onSave: () => void; onClose: () => void; }
export function EditPhoneModal({ open, leadName, current, value, onChange, onSave, onClose }: EditContactModalProps) {
  return (
    <AnimatePresence>{open && (<ModalShell>
      <div className="flex items-start justify-between mb-6"><div><div className="flex items-center gap-2.5 mb-1"><Phone className="w-5 h-5 text-sky-400" /><h3 className="text-xl font-inter font-medium">{current ? "Edit Phone Number" : "Add Phone Number"}</h3></div><p className="text-sm text-[var(--tx2)] opacity-60 font-light">{leadName}</p></div><button onClick={onClose} className="p-2 rounded-2xl text-[var(--tx2)] opacity-60 hover:opacity-100 hover:text-[var(--tx1)] hover:bg-[var(--bg-subtle)] transition-all"><X className="w-4 h-4" /></button></div>
      <div className="mb-7"><label className="text-[9px] font-mono text-[var(--tx2)] opacity-60 uppercase tracking-widest block mb-2">Homeowner Phone</label><input type="tel" value={value} onChange={e => onChange(e.target.value)} onKeyDown={e => { if (e.key === "Enter") onSave(); }} placeholder="(555) 867-5309" autoFocus className="w-full bg-[var(--bg-subtle)] border border-[var(--border-color)] rounded-2xl px-4 py-3 text-[var(--tx1)] text-base placeholder:text-[var(--tx2)] focus:outline-none focus:border-sky-500/40 tracking-wide" /><p className="text-[10px] text-[var(--tx2)] opacity-40 mt-2 font-light">Saved to this lead. Tap the number on the card to dial directly.</p></div>
      <div className="flex gap-3"><button onClick={onClose} className="flex-1 py-3 rounded-2xl bg-[var(--bg-subtle)] border border-[var(--border-color)] text-[var(--tx2)] opacity-60 hover:opacity-100 hover:text-[var(--tx1)] hover:border-[var(--border-color)] transition-all text-sm">Cancel</button><button onClick={onSave} className="flex-1 py-3 rounded-2xl bg-sky-500/15 border border-sky-500/25 text-sky-300 hover:bg-sky-500/25 transition-all text-sm font-medium">Save Number</button></div>
    </ModalShell>)}</AnimatePresence>
  );
}

// ─── Edit Email Modal ─────────────────────────────────────────────────────────
export function EditEmailModal({ open, leadName, current, value, onChange, onSave, onClose }: EditContactModalProps) {
  return (
    <AnimatePresence>{open && (<ModalShell>
      <div className="flex items-start justify-between mb-6"><div><div className="flex items-center gap-2.5 mb-1"><Mail className="w-5 h-5 text-[#2563ba]" /><h3 className="text-xl font-inter font-medium">{current ? "Edit Email Address" : "Add Email Address"}</h3></div><p className="text-sm text-[var(--tx2)] opacity-60 font-light">{leadName}</p></div><button onClick={onClose} className="p-2 rounded-2xl text-[var(--tx2)] opacity-60 hover:opacity-100 hover:text-[var(--tx1)] hover:bg-[var(--bg-subtle)] transition-all"><X className="w-4 h-4" /></button></div>
      <div className="mb-7"><label className="text-[9px] font-mono text-[var(--tx2)] opacity-60 uppercase tracking-widest block mb-2">Homeowner Email</label><input type="email" value={value} onChange={e => onChange(e.target.value)} onKeyDown={e => { if (e.key === "Enter") onSave(); }} placeholder="homeowner@example.com" autoFocus className="w-full bg-[var(--bg-subtle)] border border-[var(--border-color)] rounded-2xl px-4 py-3 text-[var(--tx1)] text-base placeholder:text-[var(--tx2)] focus:outline-none focus:border-[#2563ba]/40 tracking-wide" /><p className="text-[10px] text-[var(--tx2)] opacity-40 mt-2 font-light">Saved to this lead. Tap the address on the card to open your mail app.</p></div>
      <div className="flex gap-3"><button onClick={onClose} className="flex-1 py-3 rounded-2xl bg-[var(--bg-subtle)] border border-[var(--border-color)] text-[var(--tx2)] opacity-60 hover:opacity-100 hover:text-[var(--tx1)] hover:border-[var(--border-color)] transition-all text-sm">Cancel</button><button onClick={onSave} className="flex-1 py-3 rounded-2xl bg-[#2563ba]/15 border border-[#2563ba]/25 text-[#4a8fd4] hover:bg-[#2563ba]/25 transition-all text-sm font-medium">Save Email</button></div>
    </ModalShell>)}</AnimatePresence>
  );
}

// ─── Follow-up Modal ──────────────────────────────────────────────────────────
interface FollowModalProps { open: boolean; leadName: string; followDate: string; followReason: string; followNote: string; onDateChange: (v: string) => void; onReasonChange: (v: string) => void; onNoteChange: (v: string) => void; onConfirm: () => void; onClose: () => void; }
export function FollowUpModal({ open, leadName, followDate, followReason, followNote, onDateChange, onReasonChange, onNoteChange, onConfirm, onClose }: FollowModalProps) {
  return (
    <AnimatePresence>{open && (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4">
        <motion.div initial={{ opacity: 0, scale: 0.96, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: 12 }} transition={{ type: "spring", damping: 28, stiffness: 320 }} className="bg-[var(--bg-elevated)] border border-[var(--border-color)] rounded-3xl p-8 w-full max-w-sm shadow-2xl">
          <div className="flex items-start justify-between mb-7"><div><div className="flex items-center gap-2.5 mb-1"><Clock className="w-5 h-5 text-orange-400" /><h3 className="text-xl font-inter font-medium">Schedule Follow-up</h3></div><p className="text-sm text-[var(--tx2)] opacity-60 font-light">{leadName}</p></div><button onClick={onClose} className="p-2 rounded-2xl text-[var(--tx2)] opacity-60 hover:opacity-100 hover:text-[var(--tx1)] hover:bg-[var(--bg-subtle)] transition-all"><X className="w-4 h-4" /></button></div>
          <div className="mb-5"><label className="text-[9px] font-mono text-[var(--tx2)] opacity-60 uppercase tracking-widest block mb-2.5">Reason</label><div className="flex flex-wrap gap-2">{["No answer","Requested callback","Not ready yet","Price check","Reviewing options"].map(r => (<button key={r} onClick={() => onReasonChange(followReason === r ? "" : r)} className={cn("px-3.5 py-2 rounded-xl text-xs font-medium border transition-all", followReason === r ? "bg-orange-500/20 border-orange-500/40 text-orange-300" : "bg-[var(--bg-subtle)] border-[var(--border-color)] text-[var(--tx2)] opacity-60 hover:bg-[var(--bg-elevated)] hover:opacity-100")}>{r}</button>))}</div></div>
          <div className="mb-5"><label className="text-[9px] font-mono text-[var(--tx2)] opacity-60 uppercase tracking-widest block mb-2.5">Follow-up Date</label><div className="grid grid-cols-2 gap-2">{[{label:"Tomorrow",days:1},{label:"In 2 days",days:2},{label:"In 3 days",days:3},{label:"Next week",days:7}].map(opt => { const d = addDays(opt.days); return (<button key={opt.days} onClick={() => onDateChange(d)} className={cn("py-3 rounded-2xl text-sm font-medium transition-all", followDate === d ? "bg-orange-500/20 border border-orange-500/40 text-orange-300" : "bg-[var(--bg-subtle)] text-[var(--tx2)] opacity-60 hover:bg-[var(--bg-elevated)] hover:opacity-100")}>{opt.label}</button>);})}</div></div>
          <div className="mb-5"><label className="text-[9px] font-mono text-[var(--tx2)] opacity-60 uppercase tracking-widest block mb-2">Custom Date</label><input type="date" value={followDate} min={new Date().toISOString().split("T")[0]} onChange={e => onDateChange(e.target.value)} className="w-full bg-[var(--bg-subtle)] border border-[var(--border-color)] rounded-2xl px-4 py-3 text-[var(--tx1)] text-sm focus:outline-none focus:border-orange-500/40 [color-scheme:light] dark:[color-scheme:dark]" /></div>
          <div className="mb-7"><label className="text-[9px] font-mono text-[var(--tx2)] opacity-60 uppercase tracking-widest block mb-2">Note (optional)</label><input type="text" value={followNote} onChange={e => onNoteChange(e.target.value)} placeholder="e.g. 'Prefers mornings'" className="w-full bg-[var(--bg-subtle)] border border-[var(--border-color)] rounded-2xl px-4 py-3 text-[var(--tx1)] text-sm placeholder:text-[var(--tx2)] focus:outline-none focus:border-orange-500/40" /></div>
          <div className="flex gap-3"><button onClick={onClose} className="flex-1 py-3 rounded-2xl bg-[var(--bg-subtle)] border border-[var(--border-color)] text-[var(--tx2)] opacity-60 hover:opacity-100 hover:text-[var(--tx1)] hover:border-[var(--border-color)] transition-all text-sm">Cancel</button><button onClick={onConfirm} className="flex-1 py-3 rounded-2xl bg-orange-500/15 border border-orange-500/25 text-orange-300 hover:bg-orange-500/25 transition-all text-sm font-medium">Set Follow-up</button></div>
        </motion.div>
      </motion.div>
    )}</AnimatePresence>
  );
}

// ─── Confirmation Modals ──────────────────────────────────────────────────────
interface ConfirmProps { open: boolean; leadName: string; onConfirm: () => void; onClose: () => void; }

export function DeadLeadModal({ open, leadName, onConfirm, onClose }: ConfirmProps) {
  return (<AnimatePresence>{open && (<ModalShell><div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mb-6"><XCircle className="w-6 h-6 text-rose-400" /></div><h3 className="text-xl font-inter font-medium mb-3">Mark as Dead Lead?</h3><p className="text-[var(--tx2)] opacity-60 text-sm leading-relaxed mb-8"><span className="text-[var(--tx1)] opacity-100 font-medium">{leadName}</span> will be marked as dead and removed from your active pipeline. This can be undone by moving it back to New Lead.</p><div className="flex gap-3"><button onClick={onClose} className="flex-1 py-3 rounded-2xl bg-[var(--bg-subtle)] border border-[var(--border-color)] text-[var(--tx2)] opacity-60 hover:opacity-100 hover:text-[var(--tx1)] hover:border-[var(--border-color)] transition-all text-sm">Cancel</button><button onClick={onConfirm} className="flex-1 py-3 rounded-2xl bg-rose-500/15 border border-rose-500/25 text-rose-400 hover:bg-rose-500/25 transition-all text-sm font-medium">Mark Dead</button></div></ModalShell>)}</AnimatePresence>);
}

export function ConfirmRemoveModal({ open, leadName, onConfirm, onClose }: ConfirmProps) {
  return (<AnimatePresence>{open && (<ModalShell><div className="w-12 h-12 rounded-2xl bg-[var(--bg-subtle)] border border-[var(--border-color)] flex items-center justify-center mb-6"><MinusCircle className="w-6 h-6 text-[var(--tx2)]" /></div><h3 className="text-xl font-inter font-medium mb-3">Remove from Pipeline?</h3><p className="text-[var(--tx2)] opacity-60 text-sm leading-relaxed mb-8"><span className="text-[var(--tx1)] opacity-100 font-medium">{leadName}</span> will be removed from your pipeline but kept in CenterPoint. You can re-import it from CP Inbox later.</p><div className="flex gap-3"><button onClick={onClose} className="flex-1 py-3 rounded-2xl bg-[var(--bg-subtle)] border border-[var(--border-color)] text-[var(--tx2)] opacity-60 hover:opacity-100 hover:text-[var(--tx1)] hover:border-[var(--border-color)] transition-all text-sm">Cancel</button><button onClick={onConfirm} className="flex-1 py-3 rounded-2xl bg-rose-500/15 border border-rose-500/25 text-rose-400 hover:bg-rose-500/25 transition-all text-sm font-medium">Remove</button></div></ModalShell>)}</AnimatePresence>);
}

export function BlockedModal({ open, leadName, onForceRemove, onClose }: { open: boolean; leadName: string; onForceRemove: () => void; onClose: () => void }) {
  return (<AnimatePresence>{open && (<ModalShell><div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-6"><AlertCircle className="w-6 h-6 text-amber-400" /></div><h3 className="text-xl font-inter font-medium mb-3">Cannot Remove Lead</h3><p className="text-[var(--tx2)] opacity-60 text-sm leading-relaxed mb-8"><span className="text-[var(--tx1)] opacity-100 font-medium">{leadName}</span> has inspection activity and cannot be removed from Pipeline by standard users.</p><div className="flex flex-col gap-3"><button onClick={onForceRemove} className="w-full py-3 rounded-2xl bg-rose-500/15 border border-rose-500/25 text-rose-400 hover:bg-rose-500/25 transition-all text-sm font-medium">Force Remove (Admin)</button><button onClick={onClose} className="w-full py-3 rounded-2xl bg-[var(--bg-subtle)] border border-[var(--border-color)] text-[var(--tx2)] opacity-60 hover:opacity-100 hover:text-[var(--tx1)] hover:border-[var(--border-color)] transition-all text-sm">Understood</button></div></ModalShell>)}</AnimatePresence>);
}

export function StageBackModal({ open, leadName, targetIdx, onConfirm, onClose }: { open: boolean; leadName: string; targetIdx: number; onConfirm: () => void; onClose: () => void }) {
  return (<AnimatePresence>{open && (<ModalShell><div className="w-12 h-12 rounded-2xl bg-[var(--bg-subtle)] border border-[var(--border-color)] flex items-center justify-center mb-6"><ChevronLeft className="w-6 h-6 text-[var(--tx2)]" /></div><h3 className="text-xl font-inter font-medium mb-2">Move back to <span className="text-[var(--tx1)]">{STAGE_LABELS[targetIdx]}</span>?</h3><p className="text-[var(--tx2)] opacity-60 text-sm leading-relaxed mb-8">{leadName} will be reset to this stage.{targetIdx < 3 && " Any scheduled appointments and calendar inspection sessions will be cleared from your schedule."}</p><div className="flex gap-3"><button onClick={onClose} className="flex-1 py-3 rounded-2xl bg-[var(--bg-subtle)] border border-[var(--border-color)] text-[var(--tx2)] opacity-60 hover:opacity-100 hover:text-[var(--tx1)] hover:border-[var(--border-color)] transition-all text-sm">Cancel</button><button onClick={onConfirm} className="flex-1 py-3 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-color)] text-[var(--tx1)] hover:bg-[var(--bg-subtle)] transition-all text-sm font-medium">Confirm</button></div></ModalShell>)}</AnimatePresence>);
}
