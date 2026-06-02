import { SessionState } from "@/types/session";

export function generateCrmNote(session: SessionState): string {
  const motion = session.findings.outcomeType;
  const nextStepOwner = "Rep";
  const nextStepDate = session.followUpTasks?.[0]?.dueDate || "Unknown";
  const nextStepAction = session.followUpTasks?.[0]?.description || "Follow up";
  const nextStep = `[${nextStepOwner} / ${nextStepAction} / ${nextStepDate}]`;

  const buyerState = session.buyerData?.buyerState || "Unknown";
  const decisionStyle = session.buyerData?.decisionStyle || "Unknown";
  const recommendedPath = session.pathData?.selectedPath || "None selected";
  const recommendation = `${recommendedPath} selected`;

  if (motion === "claim_review_candidate") {
    const concern = session.buyerData?.primaryConcern || "Storm damage";
    const eventDate = "Unknown"; // Update as needed based on session data
    const activeLeak = session.findings?.urgentProtectionRecommended ? "Yes" : "No";
    const claimStatus = session.buyerData?.claimStatus || "Not filed";
    
    return [
      `Motion: Storm documentation review.`,
      `Homeowner concern: ${concern}.`,
      `Event date if known: ${eventDate}.`,
      `Evidence provided: Inspection photos captured.`,
      `Active leak: ${activeLeak}.`,
      `Claim status: ${claimStatus}.`,
      `Buyer state: ${buyerState}.`,
      `Decision style: ${decisionStyle}.`,
      `Recommendation: ${recommendation}.`,
      `Review gates: claim/coverage/deductible language human review.`,
      `Next step: ${nextStep}.`
    ].join(" ");
  }

  if (motion === "repair_only") {
    const symptom = session.buyerData?.primaryConcern || "Repair needed";
    const urgency = session.findings?.urgentProtectionRecommended ? "Active" : "Stable";

    return [
      `Motion: Repair diagnostic.`,
      `Symptom: ${symptom}.`,
      `Location: Roof/Exterior.`,
      `Evidence: Inspection photos captured.`,
      `Urgency: ${urgency}.`,
      `Recommendation: ${recommendation}.`,
      `Scope boundary: Known exclusions apply.`,
      `Next step: ${nextStep}.`
    ].join(" ");
  }

  if (motion === "full_restoration_candidate") {
    const goal = session.buyerData?.primaryConcern || "Replacement";
    const decisionMakers = session.buyerData?.decisionMakerName || "Homeowner";
    const financing = session.buyerData?.financingInterest ? "Yes" : "No";

    return [
      `Motion: Direct-buy replacement.`,
      `Goal: ${goal}.`,
      `Decision makers: ${decisionMakers}.`,
      `Prior bids: Unknown.`,
      `Financing interest: ${financing}.`,
      `Key criteria: Warranty/Aesthetics.`,
      `Proposal status: Presented.`,
      `Next step: ${nextStep}.`
    ].join(" ");
  }

  // Fallback / Maintenance
  return [
    `Motion: Maintenance/tune-up.`,
    `Reason: Routine.`,
    `Roof age: Unknown.`,
    `Findings: ${session.findings?.repNotes || "No notes"}.`,
    `Recommendation: ${recommendation}.`,
    `Next review trigger: Next storm.`,
    `Next step: ${nextStep}.`
  ].join(" ");
}
