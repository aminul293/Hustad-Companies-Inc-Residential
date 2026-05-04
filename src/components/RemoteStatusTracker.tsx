"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  Send, Eye, CheckCircle2, MessageSquare, Phone, 
  PenTool, XCircle, Clock, RefreshCw, ExternalLink 
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { RemoteReviewStatus } from "@/types/session";

interface Props {
  token: string;
  recipientEmail: string;
  recipientName: string;
}

const STATUS_CONFIG: Record<RemoteReviewStatus, { label: string; icon: any; color: string }> = {
  sent: { label: "Link Sent", icon: Send, color: "text-white/40" },
  opened: { label: "Opened", icon: Eye, color: "text-sky-400" },
  viewed: { label: "Reviewed Findings", icon: Eye, color: "text-indigo-400" },
  question_submitted: { label: "Question Asked", icon: MessageSquare, color: "text-amber-400" },
  callback_requested: { label: "Callback Requested", icon: Phone, color: "text-emerald-400" },
  approved: { label: "Approved", icon: CheckCircle2, color: "text-emerald-400" },
  signed: { label: "Signed Remotely", icon: PenTool, color: "text-emerald-500" },
  declined: { label: "Declined", icon: XCircle, color: "text-rose-400" },
  expired: { label: "Expired", icon: Clock, color: "text-white/20" },
};

export function RemoteStatusTracker({ token, recipientEmail, recipientName }: Props) {
  const [status, setStatus] = useState<RemoteReviewStatus>("sent");
  const [history, setHistory] = useState<{status: RemoteReviewStatus; at: string}[]>([]);
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/session?token=${token}`);
      if (!res.ok) return;
      const data = await res.json();
      if (data.remoteReview) {
        setStatus(data.remoteReview.status);
        setHistory(data.remoteReview.statusHistory || []);
        setQuestions(data.remoteReview.questions || []);
      }
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { fetchStatus(); const i = setInterval(fetchStatus, 15000); return () => clearInterval(i); }, [token]);

  const config = STATUS_CONFIG[status];
  const StatusIcon = config.icon;

  const TIMELINE_STEPS: RemoteReviewStatus[] = ["sent","opened","viewed","signed"];

  return (
    <div className="p-8 rounded-[40px] bg-white/[0.02] border border-white/[0.06] space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center bg-white/5 border border-white/10", config.color)}>
            <StatusIcon className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[9px] font-mono text-white/30 uppercase tracking-widest">Remote Review Status</p>
            <p className={cn("text-sm font-display font-medium", config.color)}>{config.label}</p>
          </div>
        </div>
        <button onClick={fetchStatus} disabled={loading} className="p-2 rounded-xl hover:bg-white/5 transition-all">
          <RefreshCw className={cn("w-4 h-4 text-white/30", loading && "animate-spin")} />
        </button>
      </div>

      {/* Recipient */}
      <div className="flex items-center gap-3 text-xs text-white/40">
        <span className="font-mono">To:</span>
        <span className="text-white/60">{recipientName || recipientEmail}</span>
      </div>

      {/* Timeline */}
      <div className="flex items-center gap-1">
        {TIMELINE_STEPS.map((step, i) => {
          const stepIdx = TIMELINE_STEPS.indexOf(step);
          const currentIdx = TIMELINE_STEPS.indexOf(status);
          const isSpecial = !TIMELINE_STEPS.includes(status) && (status === "question_submitted" || status === "callback_requested" || status === "approved");
          const reached = currentIdx >= stepIdx || (isSpecial && stepIdx <= 2) || status === "signed";
          const isCurrent = step === status || (isSpecial && stepIdx === 2);
          return (
            <div key={step} className="flex items-center flex-1">
              <div className={cn("w-3 h-3 rounded-full border-2 transition-all", reached ? "bg-indigo-500 border-indigo-400" : "bg-transparent border-white/10", isCurrent && "ring-2 ring-indigo-400/30 ring-offset-2 ring-offset-[#060606]")} />
              {i < TIMELINE_STEPS.length - 1 && <div className={cn("flex-1 h-0.5 mx-1", reached && stepIdx < currentIdx ? "bg-indigo-500" : "bg-white/5")} />}
            </div>
          );
        })}
      </div>
      <div className="flex justify-between text-[8px] font-mono text-white/20 uppercase tracking-widest">
        {TIMELINE_STEPS.map(s => <span key={s}>{s.replace(/_/g,' ')}</span>)}
      </div>

      {/* Questions */}
      {questions.length > 0 && (
        <div className="space-y-3 pt-2 border-t border-white/5">
          <p className="text-[9px] font-mono text-amber-400 uppercase tracking-widest">Questions Received</p>
          {questions.map((q: any) => (
            <div key={q.questionId} className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/10">
              <p className="text-xs text-white/70">{q.questionText}</p>
              <p className="text-[9px] font-mono text-white/20 mt-2">{q.askerName} • {new Date(q.askedAt).toLocaleString()}</p>
            </div>
          ))}
        </div>
      )}

      {/* History */}
      {history.length > 0 && (
        <details className="group">
          <summary className="text-[9px] font-mono text-white/20 uppercase tracking-widest cursor-pointer hover:text-white/40">Activity Log ({history.length})</summary>
          <div className="mt-3 space-y-1">
            {history.map((h, i) => (
              <div key={i} className="flex items-center gap-3 text-[10px] text-white/30">
                <span className="font-mono">{new Date(h.at).toLocaleTimeString()}</span>
                <span className={STATUS_CONFIG[h.status]?.color}>{STATUS_CONFIG[h.status]?.label}</span>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
