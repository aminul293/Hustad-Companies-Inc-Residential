import { SessionState } from "@/types/session";

export interface PromptRule {
  rule_id: string;
  stage: string;
  priority_rank: number;
  trigger: (session: SessionState) => boolean;
  rep_script: string;
  rep_question: string;
  answer_chips: string[];
  log_fields: string[];
  guardrail?: string;
}

export const PROMPT_RULES: PromptRule[] = [
  {
    rule_id: "CLAIM_REVIEW_WAITING_INSURANCE_001",
    stage: "recommendation",
    priority_rank: 10, // Higher is higher priority
    trigger: (session) => {
      const isClaimCandidate = session.findings.outcomeType === "claim_review_candidate";
      const isWaiting = session.buyerData?.claimStatus === "waiting_for_inspection" || !session.buyerData?.claimStatus;
      return isClaimCandidate && isWaiting;
    },
    rep_script: "I will keep this clean: what we documented, what it may indicate, and what your carrier decides.",
    rep_question: "Before you spend your own money on repairs, would you like your carrier to review the documented storm evidence?",
    answer_chips: ["Yes, organize documentation", "I have questions first", "I prefer direct repair", "Send to co-owner"],
    log_fields: ["carrier_review_interest", "path_selected", "objection_code", "follow_up_datetime"],
    guardrail: "Do not imply coverage approval. Carrier determines coverage."
  },
  {
    rule_id: "REPAIR_DIAGNOSTIC_001",
    stage: "recommendation",
    priority_rank: 5,
    trigger: (session) => session.findings.outcomeType === "repair_only",
    rep_script: "Based on our inspection, the damage is localized and can be addressed without a full replacement.",
    rep_question: "Would you like to review the repair estimate and next steps?",
    answer_chips: ["Yes, show estimate", "I need to discuss it", "Not right now"],
    log_fields: ["repair_interest", "follow_up_datetime"],
    guardrail: "Do not promise that this repair guarantees the roof won't leak elsewhere."
  },
  {
    rule_id: "DIRECT_BUY_001",
    stage: "recommendation",
    priority_rank: 5,
    trigger: (session) => session.findings.outcomeType === "full_restoration_candidate",
    rep_script: "The condition of the roof suggests that a full replacement is the most practical long-term solution.",
    rep_question: "Are you interested in exploring replacement options and financing?",
    answer_chips: ["Yes, show options", "What about repairs?", "Send to co-owner"],
    log_fields: ["replacement_interest", "financing_interest", "follow_up_datetime"],
    guardrail: "Focus on facts: age, condition, leaks. Avoid high-pressure sales tactics."
  }
];

export function getActivePrompt(session: SessionState): PromptRule | null {
  const activeRules = PROMPT_RULES.filter((rule) => rule.trigger(session));
  
  if (activeRules.length === 0) return null;
  
  // Return the highest priority rule
  return activeRules.sort((a, b) => b.priority_rank - a.priority_rank)[0];
}
