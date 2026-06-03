export type KeywordTag = 
  | "deductible" 
  | "insurance" 
  | "leak_urgent" 
  | "warranty" 
  | "co_owner" 
  | "hoa" 
  | "trust_barrier" 
  | "comparison";

export interface ScenarioResult {
  id: string;
  rep_action: string;
  question: string;
  log_fields: string[];
}

export function scanOpenQuestion(text: string): KeywordTag[] {
  const tags = new Set<KeywordTag>();
  if (!text) return [];
  const lower = text.toLowerCase();
  
  if (/(deductible|cost|free)/.test(lower)) tags.add("deductible");
  if (/(claim|insurance|adjuster|carrier|covered)/.test(lower)) tags.add("insurance");
  if (/(leak|water|stain|ceiling|dripping)/.test(lower)) tags.add("leak_urgent");
  if (/(warranty|guarantee|manufacturer|gaf)/.test(lower)) tags.add("warranty");
  if (/(wife|husband|spouse|co-owner|partner)/.test(lower)) tags.add("co_owner");
  if (/(hoa|association|property manager)/.test(lower)) tags.add("hoa");
  if (/(bad contractor|pressure|scam|storm chaser)/.test(lower)) tags.add("trust_barrier");
  if (/(another contractor|estimate|compare|quote)/.test(lower)) tags.add("comparison");
  
  return Array.from(tags);
}

export function evaluateScenarios(session: any): ScenarioResult[] {
  const results: ScenarioResult[] = [];
  const bd = session.buyerData || {};
  const fd = session.findings || {};
  const pathData = session.pathData || {};

  const priorities = bd.buyerPriorities || [];
  const hasPriority = (p: string) => priorities.includes(p);
  
  const insurerStatus = bd.insurerContactStatus || "not_yet";
  const outcome = fd.outcomeType || "no_damage";
  const isClaimReview = outcome === "claim_review_candidate";
  const isDirectRepair = outcome === "repair_only";
  const isMonitorOnly = outcome === "monitor_only";
  const isNoDamage = outcome === "no_damage";
  const isFullRestoration = outcome === "full_restoration_candidate";
  
  const comfort = bd.decisionComfort;
  const isSpouse = bd.anotherDecisionMakerPresent === true;
  const isSpouseAbsent = bd.anotherDecisionMakerPresent === false;
  
  const hasUrgent = (fd.urgentItemsCount || 0) > 0;
  
  const openQ = bd.buyerQuestions || "";
  const openTags = scanOpenQuestion(openQ);
  
  // S01
  if (hasPriority("insurance_process") && insurerStatus === "not_yet" && isClaimReview) {
    results.push({
      id: "S01",
      rep_action: "Open with insurance clarity. Show photos first.",
      question: "Ask if carrier should review documented storm evidence before owner pays out of pocket.",
      log_fields: ["carrier_review_interest", "insurance_readiness", "reason_if_declines"]
    });
  }
  
  // S02
  if (hasPriority("insurance_process") && insurerStatus === "already_contacted") {
    results.push({
      id: "S02",
      rep_action: "Switch to coordination. Capture claim number, carrier, adjuster, and inspection date.",
      question: "Offer to send report and coordinate with adjuster.",
      log_fields: ["carrier_name", "claim_number", "adjuster_info", "carrier_inspection_date"]
    });
  }
  
  // S03
  if (hasPriority("insurance_process") && insurerStatus === "not_sure" && isClaimReview) {
    results.push({
      id: "S03",
      rep_action: "Answer boundary before close.",
      question: "Ask what question needs to be answered before carrier contact.",
      log_fields: ["insurance_blocker_type", "carrier_contact_readiness"]
    });
  }

  // S04
  if (insurerStatus === "not_sure" && (isNoDamage || isMonitorOnly)) {
    results.push({
      id: "S04",
      rep_action: "Do not push carrier review. Explain findings do not justify claim path today.",
      question: "Are you comfortable keeping this report as a baseline for future reference?",
      log_fields: ["trust_outcome", "monitor_plan", "future_recheck_interest"]
    });
  }

  // S05
  if (hasPriority("cost_clarity") && isDirectRepair) {
    results.push({
      id: "S05",
      rep_action: "Offer one clean repair scope or two repair options.",
      question: "Is your main concern total cost, surprise cost, or timing?",
      log_fields: ["cost_concern_type", "repair_scope_requested"]
    });
  }
  
  // S06
  if (hasPriority("cost_clarity") && isClaimReview) {
    results.push({
      id: "S06",
      rep_action: "Compare direct repair vs carrier review. Use before-paying-out-of-pocket carrier review language.",
      question: "Would you rather repair out of pocket or see if insurance covers this?",
      log_fields: ["path_selected", "cost_concern_type", "carrier_review_interest"]
    });
  }

  // S07
  if (hasPriority("repair_speed") && hasUrgent) {
    results.push({
      id: "S07",
      rep_action: "Offer immediate protection before broader scope.",
      question: "Do you have any active leaks or interior staining right now?",
      log_fields: ["active_leak_flag", "urgent_repair_authorized", "urgent_next_step"]
    });
  }

  // S08
  if (hasPriority("repair_speed") && !hasUrgent) {
    results.push({
      id: "S08",
      rep_action: "Avoid false urgency. Explain timeline options and next available step.",
      question: "Is speed more important than comparing all options?",
      log_fields: ["schedule_sensitivity", "preferred_timeline"]
    });
  }

  // S09
  if (hasPriority("roof_longevity") && isMonitorOnly) {
    results.push({
      id: "S09",
      rep_action: "Close on baseline, future recheck, and trigger for action later.",
      question: "Would you like us to schedule a free recheck next year?",
      log_fields: ["ownership_horizon", "monitor_trigger", "recheck_date"]
    });
  }

  // S10
  if (hasPriority("roof_longevity") && isFullRestoration) {
    results.push({
      id: "S10",
      rep_action: "Discuss repair versus system-level certainty.",
      question: "Are you trying to get a few more years out of this, or thinking long-term?",
      log_fields: ["ownership_horizon", "repair_vs_system_preference", "scope_requested"]
    });
  }

  // S11
  if (hasPriority("warranty_coverage") && (isFullRestoration || isClaimReview)) {
    results.push({
      id: "S11",
      rep_action: "Explain material, workmanship, and enhanced warranty eligibility.",
      question: "Are you looking for the longest possible warranty, or just enough for your current plans?",
      log_fields: ["warranty_concern_type", "enhanced_warranty_interest"]
    });
  }

  // S12
  if (hasPriority("warranty_coverage") && isDirectRepair) {
    results.push({
      id: "S12",
      rep_action: "Explain repair warranty/workmanship boundary. Do not overpresent full replacement warranty.",
      question: "Are you clear on the difference between repair warranties and full replacement warranties?",
      log_fields: ["repair_warranty_question", "warranty_clarity_score"]
    });
  }

  // S13
  if (hasPriority("minimal_disruption")) {
    results.push({
      id: "S13",
      rep_action: "Ask about pets, vehicles, work-from-home, landscaping, access, and communication preference.",
      question: "Do you have pets, vehicles, or work-from-home schedules we should plan around?",
      log_fields: ["operational_constraints", "communication_preference", "access_notes"]
    });
  }

  // S14
  if (isSpouse && pathData.authorization_readiness === 'ready') {
    results.push({
      id: "S14",
      rep_action: "Send photo summary and agreement before signature unless all required decision-makers are present.",
      question: "Should we send a photo summary to your co-owner for their review?",
      log_fields: ["co_owner_name", "co_owner_email", "summary_sent", "follow_up_datetime"]
    });
  }

  // S15
  if (isSpouseAbsent && pathData.authorization_readiness === 'ready') {
    results.push({
      id: "S15",
      rep_action: "Route to send-for-review.",
      question: "What is the best time to follow up once they have reviewed the dossier?",
      log_fields: ["send_for_review_reason", "follow_up_datetime", "decision_maker_status"]
    });
  }

  // S16
  if (comfort === "clear_photos") {
    results.push({
      id: "S16",
      rep_action: "Start findings page with proof photos.",
      question: "Can you clearly see the same indicators in these photos that I see?",
      log_fields: ["photo_clarity_score", "photo_question_resolved"]
    });
  }

  // S17
  if (comfort === "urgent_vs_monitor") {
    results.push({
      id: "S17",
      rep_action: "Slow down on classification.",
      question: "Does the categorization of these items make sense to you?",
      log_fields: ["category_understood", "category_dispute_reason"]
    });
  }

  // S18
  if (comfort === "insurance_boundaries") {
    results.push({
      id: "S18",
      rep_action: "Use carrier boundary script and log whether insurance process is clear.",
      question: "Do you have any remaining questions about how insurance boundaries work here?",
      log_fields: ["insurance_boundary_understood", "insurance_question_remaining"]
    });
  }

  // S19
  if (comfort === "cost_options") {
    results.push({
      id: "S19",
      rep_action: "Ask one recommendation vs two options with tradeoffs.",
      question: "Would you prefer one recommendation or two options with tradeoffs?",
      log_fields: ["preferred_review_format", "scope_option_requested"]
    });
  }

  // S20
  if (openTags.includes("deductible")) {
    results.push({
      id: "S20",
      rep_action: "Show deductible guardrail. Ask what deductible question needs clarity. Do not imply waiver.",
      question: "What specific question do you have regarding your deductible?",
      log_fields: ["deductible_question_flag", "deductible_concern_resolved"]
    });
  }

  // S21
  if (openTags.includes("leak_urgent")) {
    results.push({
      id: "S21",
      rep_action: "Urgent prompt overrides. Ask active leak and whether interior photos are needed.",
      question: "Since you mentioned leaks, should we grab interior photos of the staining?",
      log_fields: ["active_leak_flag", "interior_damage_flag", "urgent_repair_needed"]
    });
  }

  // S22
  if (openTags.includes("trust_barrier")) {
    results.push({
      id: "S22",
      rep_action: "Use trust-first script. Show known, unknown, and what Hustad will not overstate.",
      question: "Have you had a bad experience with a contractor before that we should be aware of?",
      log_fields: ["skepticism_flag", "trust_barrier_type", "trust_improved"]
    });
  }

  // S23
  if (openTags.includes("comparison")) {
    results.push({
      id: "S23",
      rep_action: "Offer apples-to-apples comparison without attacking competitor.",
      question: "Would an apples-to-apples comparison of quotes be helpful?",
      log_fields: ["comparison_requested", "comparison_dimension", "competitor_bid_present"]
    });
  }

  // S24
  if (isNoDamage && hasPriority("insurance_process")) {
    results.push({
      id: "S24",
      rep_action: "Do not push claim. Say documentation is saved and carrier review is not recommended from today evidence.",
      question: "Are you comfortable with us simply saving this documentation as a baseline?",
      log_fields: ["no_damage_result", "claim_not_recommended_reason"]
    });
  }

  // S25
  if (isDirectRepair && pathData.selectedPath === "carrier_review") {
    results.push({
      id: "S25",
      rep_action: "Explain repair-only logic and evidence boundary. Offer direct repair scope; preserve homeowner autonomy.",
      question: "Are you clear on why the evidence points to repair rather than a full carrier review?",
      log_fields: ["repair_only_explained", "homeowner_path_preference"]
    });
  }

  // S26
  if (fd.stormRelatedItemsCount > 0 && fd.monitorItemsCount > 0) {
    results.push({
      id: "S26",
      rep_action: "Show both evidence types. Ask if storm-related vs wear/maintenance difference is understood.",
      question: "Is the difference between storm-related items and general wear clear?",
      log_fields: ["storm_vs_wear_understood", "disputed_condition_type"]
    });
  }

  // S27
  if (isClaimReview && pathData.selectedPath === "direct_repair") {
    results.push({
      id: "S27",
      rep_action: "Respect autonomy; ask once if carrier should review documented evidence before out-of-pocket spend.",
      question: "Should the carrier review this documented evidence before you spend out of pocket?",
      log_fields: ["direct_repair_preference", "carrier_review_declined_reason"]
    });
  }

  // S28
  if (isFullRestoration && bd.decisionMakerPresent === "all") {
    results.push({
      id: "S28",
      rep_action: "Use authorize-now close with carrier boundary where applicable.",
      question: "Are all decision-makers ready to authorize next steps?",
      log_fields: ["authorization_readiness", "agreement_signed", "next_step_owner"]
    });
  }

  // S29
  if (isFullRestoration && bd.decisionMakerPresent === "some_absent") {
    results.push({
      id: "S29",
      rep_action: "Use send-for-review close. Do not pressure same-visit signature.",
      question: "Should we send this for review before asking for signature?",
      log_fields: ["sent_for_review", "co_owner_summary_sent", "follow_up_datetime"]
    });
  }

  // S30
  if (bd.skippedSelfGuided) {
    results.push({
      id: "S30",
      rep_action: "Rep uses manual discovery before photos: priorities, insurance status, decision authority, decision comfort.",
      question: "Before photos, let's cover: priorities, insurance status, decision authority.",
      log_fields: ["manual_discovery_completed", "skipped_self_guided_reason"]
    });
  }

  return results;
}
