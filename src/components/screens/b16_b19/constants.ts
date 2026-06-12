export const CLAIM_TERMS = [
  "Hustad will document storm-related damage for coordination with your insurer.",
  "Coverage decisions remain with your insurance carrier. Hustad cannot promise outcomes.",
  "Your deductible and non-covered amounts remain your financial responsibility.",
  "You retain the right to choose your contractor regardless of claim status.",
];

export const REPAIR_TERMS = [
  "Hustad will prepare a proposal for the specific replacement items documented in today's findings.",
  "This request covers only the items in scope as presented.",
  "Scheduling will be confirmed after you review and accept the proposal.",
  "This is a direct replacement path — not an insurance claim.",
];

export const NEXT_STEPS_CONFIG: Record<string, { headline: string; detail: string; steps: string[]; finishLabel: string }> = {
  no_damage: {
    headline: "No damage documented. Records archived.",
    detail: "Your inspection is complete. No project or claim path is indicated based on today's findings.",
    steps: [
      "Your no-damage summary will be emailed and archived.",
      "Keep this documentation — it establishes a pre-loss baseline for future events.",
      "Hustad recommends a re-inspection after any significant hail or wind event.",
    ],
    finishLabel: "Archive Findings & Close",
  },
  monitor_only: {
    headline: "Monitor conditions documented.",
    detail: "No urgent repair or claim path is indicated today. Conditions are flagged for future tracking.",
    steps: [
      "Your monitor summary will be emailed with re-inspection trigger conditions.",
      "A follow-up inspection is recommended within 12 months.",
      "Contact Hustad if any of the flagged conditions worsen before your next scheduled review.",
    ],
    finishLabel: "Confirm Monitor Plan & Close",
  },
  repair_only: {
    headline: "Direct replacement proposal requested.",
    detail: "A targeted replacement proposal is being prepared without an insurance claim.",
    steps: [
      "Your proposal request summary will be emailed immediately.",
      "Our estimating department will prepare your custom proposal.",
      "We will send the proposal for your review within 2–3 business days.",
    ],
    finishLabel: "Submit Request & Close",
  },
  claim_review_candidate: {
    headline: "Storm package secured. Carrier review initiated.",
    detail: "Your documented findings and authorization are ready for insurance carrier review.",
    steps: [
      "Check your email for the full forensic report and authorization package.",
      "File or confirm your active claim with your insurance carrier.",
      "Coordinate the carrier adjuster inspection with your Hustad representative.",
      "Coverage decisions are made by your carrier — Hustad will support the process.",
    ],
    finishLabel: "Sync & Close Session",
  },
  full_restoration_candidate: {
    headline: "Full restoration authorized.",
    detail: "System restoration is now underway. Here is what happens next.",
    steps: [
      "Your signed restoration authorization will be emailed immediately.",
      "A production coordinator will reach out within 48 hours.",
      "Material staging and crew scheduling follow carrier approval.",
    ],
    finishLabel: "Submit Restoration Order & Close",
  },
  deferred: {
    headline: "Review package sent to decision maker.",
    detail: "The dossier and executable agreement are en route. The session remains open until authorization is received.",
    steps: [
      "The recipient will receive the full report, photos, and agreement for review.",
      "A follow-up task has been created for your scheduled call-back time.",
      "You will be notified when the remote party opens or signs the agreement.",
      "Contact Hustad at any time to answer questions before authorization.",
    ],
    finishLabel: "Send Package & Close Session",
  },
};

export const DELIVERABLES: Record<string, string[]> = {
  no_damage:                   ["No-damage summary (PDF)", "Forensic photo record"],
  monitor_only:                ["Monitor summary (PDF)", "Check-in roadmap"],
  repair_only:                 ["Proposal request (PDF)", "Production scope"],
  claim_review_candidate:      ["Claim-ready package (PDF)", "Coordination authorization"],
  full_restoration_candidate:  ["Restoration authorization (PDF)", "Warranty & Selections"],
  deferred:                    ["Forensic report (PDF)", "Executable agreement (Unsigned)", "Co-owner summary"],
};

export type AgreementSection = { heading: string; body: string };

export const AGREEMENT_SECTIONS: AgreementSection[] = [
  {
    heading: "1. Parties and Property",
    body: "This Insurance Contingency Agreement (“Agreement”) is entered into between the property owner(s) identified at the time of signing (“Homeowner”) and Hustad Companies, Inc., a Wisconsin corporation (“Contractor”). This Agreement applies to the property address documented in the associated inspection session. Both parties agree that the inspection findings recorded by the Contractor’s representative on the date of this Agreement constitute the factual basis for the scope of work described herein.",
  },
  {
    heading: "2. Scope of Work",
    body: "Contractor agrees to perform the exterior restoration or repair services identified in the inspection findings summary presented during this session. The scope is limited to the items documented, photographed, and classified during today's inspection. No work beyond the documented scope will be performed without a written change order signed by the Homeowner. The Contractor's recommendation is based solely on findings observed at the property and does not include speculative or preventive items not documented today.",
  },
  {
    heading: "3. Insurance Contingency",
    body: "This Agreement is contingent upon the Homeowner's insurance carrier approving coverage for the documented scope of work. If the carrier denies coverage in full, the Homeowner may cancel this Agreement within 3 business days of receiving written notice of denial at no penalty. If the carrier approves partial coverage, the parties will review the approved scope and agree in writing before work begins. The Contractor will not begin production work until insurance coverage determination has been received and confirmed in writing. Hustad Companies is not a licensed public adjuster and will not negotiate claim terms with the Homeowner's carrier on the Homeowner's behalf.",
  },
  {
    heading: "4. Compensation and Payment",
    body: "Compensation for work performed under this Agreement shall be the amount approved by the Homeowner's insurance carrier for the documented scope, including applicable overhead and profit, as established by the carrier's written settlement. The Homeowner's deductible, any depreciation withheld pending completion, and any non-covered items agreed to separately remain the financial responsibility of the Homeowner. The Contractor will not waive, absorb, or rebate any portion of the insurance deductible as prohibited under Wisconsin Statute § 100.65. Final invoicing will be provided upon project completion.",
  },
  {
    heading: "5. Scheduling and Production",
    body: "Following insurance approval and written authorization from the Homeowner, the Contractor will schedule the work within a reasonable timeframe subject to production capacity, material availability, and weather conditions. The Homeowner agrees to provide reasonable access to the property for pre-production measurements, material delivery, and the work itself. The Contractor will notify the Homeowner at least 48 hours in advance of the production start date.",
  },
  {
    heading: "6. Homeowner Obligations",
    body: "The Homeowner agrees to: (a) promptly file or confirm an active insurance claim for the documented storm event if not already filed; (b) notify the Contractor within 5 business days of any written communication received from the insurance carrier regarding this claim; (c) provide the Contractor access to any carrier-issued Explanation of Benefits, adjuster reports, or coverage decisions within 5 business days of receipt; and (d) not authorize any other contractor to perform work on the documented scope while this Agreement is active without written notice to Hustad Companies.",
  },
  {
    heading: "7. Wisconsin Cancellation Rights",
    body: "You have the right to cancel this Agreement without penalty within 3 business days of the date signed. To cancel, you must provide written notice to Hustad Companies, Inc. by mail, email, or hand delivery. This right of cancellation is in addition to any right of cancellation provided under Wisconsin law if your insurance carrier denies coverage. Notice of cancellation should be directed to: Hustad Companies, Inc., Madison, Wisconsin. This disclosure is provided in compliance with Wisconsin Statute § 100.65 and regulations promulgated by the Wisconsin Department of Agriculture, Trade and Consumer Protection (DATCP).",
  },
  {
    heading: "8. Representations and Warranties",
    body: "The Contractor represents that it is licensed to perform roofing and exterior restoration work in the State of Wisconsin, carries appropriate general liability and workers' compensation insurance, and will perform all work in a workmanlike manner consistent with applicable building codes. The Homeowner represents that they are the legal owner or authorized agent of the property and have the authority to enter into this Agreement. The Contractor's workmanship warranty terms are separate from and in addition to any manufacturer warranty associated with installed materials, and will be provided in writing upon project completion.",
  },
  {
    heading: "9. Dispute Resolution",
    body: "In the event of a dispute arising from this Agreement, the parties agree to first attempt resolution through direct negotiation. If negotiation is unsuccessful within 30 days, disputes shall be submitted to binding arbitration in Dane County, Wisconsin under the rules of the American Arbitration Association. This Agreement shall be governed by and construed in accordance with the laws of the State of Wisconsin.",
  },
];

export const WISCONSIN_CLAIM_NOTICE = {
  heading: "Wisconsin notice — insurance claim work",
  lines: [
    "Under Wisconsin law, a contractor may not pay, waive, or rebate all or part of an insurance deductible.",
    "You have the right to cancel this agreement within 3 business days of signing.",
    "Hustad Companies is not a licensed public adjuster and cannot negotiate your claim with your insurer.",
    "Coverage decisions are made solely by your insurance carrier. Hustad makes no guarantee of claim approval.",
    "This notice is required by the Wisconsin Department of Agriculture, Trade and Consumer Protection (DATCP).",
  ],
};
