"use client";

import type { OutcomeType } from "@/types/session";

const OUTCOME_CONFIG: Record<
  OutcomeType,
  { label: string; bg: string; text: string; dot: string }
> = {
  no_damage: {
    label: "No Damage Found",
    bg: "bg-green-50",
    text: "text-green-800",
    dot: "bg-green-500",
  },
  monitor_only: {
    label: "Monitor Only",
    bg: "bg-blue-50",
    text: "text-blue-800",
    dot: "bg-blue-400",
  },
  repair_only: {
    label: "Repair Needed",
    bg: "bg-amber-50",
    text: "text-amber-800",
    dot: "bg-amber-500",
  },
  claim_review_candidate: {
    label: "Claim Review Candidate",
    bg: "bg-orange-50",
    text: "text-orange-800",
    dot: "bg-orange-500",
  },
  full_restoration_candidate: {
    label: "Full Restoration Candidate",
    bg: "bg-red-50",
    text: "text-red-800",
    dot: "bg-red-500",
  },
};

export function OutcomeBadge({ outcome }: { outcome: OutcomeType }) {
  const cfg = OUTCOME_CONFIG[outcome];
  return (
    <span className={`outcome-badge ${cfg.bg} ${cfg.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

export function OutcomeCard({ outcome }: { outcome: OutcomeType }) {
  const cfg = OUTCOME_CONFIG[outcome];
  return (
    <div className={`rounded-2xl px-5 py-4 ${cfg.bg} border border-current/10`}>
      <div className="flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
        <span className={`font-body font-semibold text-base ${cfg.text}`}>
          {cfg.label}
        </span>
      </div>
    </div>
  );
}
