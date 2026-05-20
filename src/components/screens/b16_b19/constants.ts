export const CLAIM_TERMS = [
  "Hustad will document storm-related damage for coordination with your insurer.",
  "Coverage decisions remain with your insurance carrier. Hustad cannot promise outcomes.",
  "Your deductible and non-covered amounts remain your financial responsibility.",
  "You retain the right to choose your contractor regardless of claim status.",
];

export const REPAIR_TERMS = [
  "Hustad will perform specific repair items documented in today's findings.",
  "This authorization covers only the items in scope as presented.",
  "Scheduling will be confirmed after authorization. No work begins before that.",
  "This is a direct contract arrangement — not an insurance claim.",
];

export const NEXT_STEPS_CONFIG: Record<string, { headline: string; detail: string; steps: string[] }> = {
  no_damage: {
    headline: "Integrity Maintained.",
    detail: "Your property showed no storm damage. Forensic records are ready.",
    steps: ["Receive your no-damage summary via email/text.", "Hustad recommends re-inspection after significant events.", "Documentation is securely archived in the Hustad portal."],
  },
  monitor_only: {
    headline: "Monitor plan confirmed.",
    detail: "Conditions documented for proactive tracking. No action needed today.",
    steps: ["Receive your monitor summary with review triggers.", "Schedule a forensic follow-up in 12 months.", "Contact Hustad if conditions change prematurely."],
  },
  repair_only: {
    headline: "Repair authorized.",
    detail: "Thank you for choosing Hustad. Here is the restoration roadmap.",
    steps: ["Receive your signed authorization package by email.", "Production confirms scheduling within 1–2 business days.", "Final quality audit performed upon project completion."],
  },
  claim_review_candidate: {
    headline: "Claim path initiated.",
    detail: "Forensic documentation is secured for your carrier review.",
    steps: ["Receive your claim-ready package and coordination forms.", "Hustad coordinates with your carrier for inspection.", "Policy decisions remain with your insurance carrier."],
  },
  full_restoration_candidate: {
    headline: "Restoration authorized.",
    detail: "Full system restoration project is now underway.",
    steps: ["Receive your signed restoration package by email.", "Production coordinator reach-out within 48 hours.", "Material staging and schedule confirmation to follow."],
  },
};

export const DELIVERABLES: Record<string, string[]> = {
  no_damage:                   ["No-damage summary (PDF)", "Forensic photo record"],
  monitor_only:                ["Monitor summary (PDF)", "Check-in roadmap"],
  repair_only:                 ["Signed authorization (PDF)", "Production scope"],
  claim_review_candidate:      ["Claim-ready package (PDF)", "Coordination authorization"],
  full_restoration_candidate:  ["Restoration authorization (PDF)", "Warranty & Selections"],
};
