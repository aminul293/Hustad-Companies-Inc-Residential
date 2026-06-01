"use client";
import {
  ChevronRight, AlertCircle, AlertTriangle, RefreshCw,
  User, Calendar, Smartphone, Copy, Check as CheckIcon, Trash,
  FileDown, RotateCcw, Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface DraftSummary {
  sessionId: string;
  address: string;
  homeownerName: string;
  lastSavedAt: string;
  sessionStatus: string;
  syncStatus: string;
  missingFieldsCount: number;
  missingFields?: string[];
  reconciliationRequired?: boolean;
}

interface Props {
  draft: DraftSummary;
  retryingSessionId: string | null;
  confirmDeleteId: string | null;
  copiedSessionId: string | null;
  exportingPDFId: string | null;
  onOpen:       (sessionId: string) => void;
  onRetry:      (sessionId: string) => void;
  onDelete:     (sessionId: string) => void;
  onReopen:     (sessionId: string) => void;
  onExportPDF:  (sessionId: string) => void;
  onCopy:       (sessionId: string) => void;
}

export function SessionCard({
  draft: d,
  retryingSessionId, confirmDeleteId, copiedSessionId, exportingPDFId,
  onOpen, onRetry, onDelete, onReopen, onExportPDF, onCopy,
}: Props) {
  const isClosed = d.sessionStatus.startsWith("closed_");
  return (
    <div
      onClick={() => onOpen(d.sessionId)}
      className="w-full group p-4 md:p-6 rounded-[24px] md:rounded-[32px] bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.04] hover:border-white/20 transition-all text-left relative overflow-hidden cursor-pointer active:scale-[0.99]"
    >
      {/* Hover gradient */}
      <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/0 via-indigo-500/0 to-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6 relative z-10">
        <div className="grow space-y-3 md:space-y-4">
          {/* Badges */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className={cn(
              "px-3 py-1 rounded-full font-mono text-[9px] uppercase tracking-widest border",
              d.syncStatus === "synced"  ? "bg-emerald-500/5 text-emerald-400 border-emerald-500/20" :
              d.syncStatus === "syncing" ? "bg-sky-500/5 text-sky-400 border-sky-500/20" :
              d.syncStatus === "error"   ? "bg-rose-500/5 text-rose-400 border-rose-500/20" :
                                           "bg-amber-500/5 text-amber-400 border-amber-500/20"
            )}>
              {d.syncStatus === "synced"  ? "Cloud Synced" :
               d.syncStatus === "syncing" ? "Syncing…" :
               d.syncStatus === "error"   ? "Sync Pending" : "Local Storage"}
            </div>

            {d.syncStatus === "error" && (
              <button
                onClick={e => { e.stopPropagation(); onRetry(d.sessionId); }}
                disabled={retryingSessionId === d.sessionId}
                className="flex items-center gap-1.5 px-3 py-1 rounded-full font-mono text-[9px] uppercase tracking-widest border bg-rose-500/10 text-rose-300 border-rose-500/25 hover:bg-rose-500/20 transition-all disabled:opacity-50 disabled:pointer-events-none"
              >
                <RefreshCw className={cn("w-2.5 h-2.5", retryingSessionId === d.sessionId && "animate-spin")} />
                {retryingSessionId === d.sessionId ? "Retrying…" : "Retry Sync"}
              </button>
            )}

            {d.missingFieldsCount > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/5 border border-rose-500/20 text-[9px] font-mono text-rose-400 uppercase tracking-widest" title={d.missingFields ? `Missing: ${d.missingFields.join(', ')}` : undefined}>
                <AlertCircle className="w-3 h-3" />{d.missingFieldsCount} Incomplete
                {d.missingFields && d.missingFields.length > 0 && (
                  <span className="text-rose-400/60 lowercase tracking-normal font-sans ml-0.5">({d.missingFields.join(', ')})</span>
                )}
              </div>
            )}

            {d.reconciliationRequired && (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/5 border border-amber-500/20 text-[9px] font-mono text-amber-400 uppercase tracking-widest">
                <AlertTriangle className="w-3 h-3" />Needs CRM Recon
              </div>
            )}
          </div>

          {/* Address + meta */}
          <div className="space-y-1">
            <p className="text-base md:text-xl font-display font-medium tracking-tight group-hover:text-indigo-300 transition-colors">
              {d.address}
            </p>
            <div className="flex items-center gap-3 md:gap-6 text-[10px] md:text-[11px] font-mono text-[#567090] uppercase tracking-wider flex-wrap">
              <span className="flex items-center gap-1.5">
                <User className="w-3 h-3 md:w-3.5 md:h-3.5 text-indigo-400/50" />
                {d.homeownerName || "No Owner Listed"}
              </span>
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3 h-3 md:w-3.5 md:h-3.5 text-indigo-400/50" />
                {new Date(d.lastSavedAt).toLocaleDateString()}
              </span>
              <span className="md:hidden text-[9px] text-[#567090]">
                {d.sessionStatus.replace(/_/g, " ").toUpperCase()}
              </span>
            </div>
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-4 md:gap-8 shrink-0">
          <div className="text-right hidden md:block">
            <p className="text-[9px] font-mono text-[#2D4060] uppercase tracking-[0.2em] mb-1.5">Operational Phase</p>
            <p className="text-[10px] font-mono font-medium text-[#8BA5C5] tracking-widest">
              {d.sessionStatus.replace(/_/g, " ").toUpperCase()}
            </p>
          </div>

          <div className="h-10 w-10 md:h-14 md:w-14 rounded-xl md:rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-white group-hover:scale-105 transition-all">
            <ChevronRight className="w-5 h-5 md:w-6 md:h-6 text-[#E8EDF8] group-hover:text-black transition-colors" />
          </div>
        </div>
      </div>

      {/* Rep Camera Link */}
      <div
        className="mt-4 pt-4 border-t border-white/[0.05] flex items-center gap-3 relative z-10"
        onClick={e => e.stopPropagation()}
      >
        <img
          src={`https://api.qrserver.com/v1/create-qr-code/?size=64x64&data=${encodeURIComponent(`${typeof window !== "undefined" ? window.location.origin : ""}/rep-capture?s=${d.sessionId}`)}&bgcolor=0d0d1a&color=a5b4fc&qzone=1&format=png`}
          alt="Rep capture QR"
          className="hidden md:block w-16 h-16 rounded-xl border border-indigo-500/20 shrink-0"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <Smartphone className="w-3 h-3 text-indigo-400/50" />
            <p className="text-[9px] font-mono text-[#3F5878] uppercase tracking-[0.2em]">Rep Camera Link</p>
          </div>
          <p className="text-[10px] font-mono text-indigo-300/60 truncate">
            /rep-capture?s={d.sessionId.slice(0, 16)}…
          </p>
        </div>
        <button
          onClick={() => onCopy(d.sessionId)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 hover:bg-indigo-500/20 active:scale-95 transition-all text-[10px] font-mono shrink-0"
        >
          {copiedSessionId === d.sessionId
            ? <><CheckIcon className="w-3.5 h-3.5" /> Copied!</>
            : <><Copy className="w-3.5 h-3.5" /> Copy</>}
        </button>
      </div>

      {/* Action buttons */}
      <div
        className="mt-3 pt-3 border-t border-white/[0.04] flex items-center gap-2 relative z-10 flex-wrap"
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={() => onExportPDF(d.sessionId)}
          disabled={exportingPDFId === d.sessionId}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 hover:bg-indigo-500/20 active:scale-95 transition-all text-[10px] font-mono disabled:opacity-50 disabled:pointer-events-none"
        >
          {exportingPDFId === d.sessionId
            ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating…</>
            : <><FileDown className="w-3.5 h-3.5" /> Export PDF</>}
        </button>

        {isClosed && (
          <button
            onClick={() => onReopen(d.sessionId)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 hover:bg-emerald-500/20 active:scale-95 transition-all text-[10px] font-mono"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Reopen
          </button>
        )}

        <button
          onClick={() => onDelete(d.sessionId)}
          className={cn(
            "flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all text-[10px] font-mono ml-auto",
            confirmDeleteId === d.sessionId
              ? "bg-rose-500/20 border border-rose-500/40 text-rose-300"
              : "bg-rose-500/5 border border-rose-500/15 text-rose-400/60 hover:bg-rose-500/15 hover:text-rose-300"
          )}
        >
          <Trash className="w-3.5 h-3.5 shrink-0" />
          {confirmDeleteId === d.sessionId ? "Confirm Delete" : "Delete"}
        </button>
      </div>
    </div>
  );
}
