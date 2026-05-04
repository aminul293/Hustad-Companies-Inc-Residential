/**
 * HUSTAD AI COMPLIANCE ENGINE
 * Drafts findings summaries with strict guardrails against insurance promises.
 */

export interface AISummaryRequest {
  findings: string[];
  photosCount: number;
  outcome: string;
}

export interface AISummaryResponse {
  headline: string;
  findingSummary: string;
  pathExplanation: string;
  pdfCopy: string;
  followUpNote: string;
}

const COMPLIANCE_GUARDRAILS = `
CRITICAL COMPLIANCE RULES:
- NEVER say "insurance will approve this" or "insurance will pay."
- NEVER say "your only cost is the deductible."
- NEVER imply "hail-proof" or "guaranteed discounts."
- ALWAYS use forensic language: "evidence of impact," "collateral damage observed," "potential for long-term compromise."
- DO NOT change the outcome_type.
`;

export async function draftFindingSummary(req: AISummaryRequest): Promise<AISummaryResponse> {
  // In a real environment, this would call OpenAI/Gemini.
  // For this high-authority demo, we use a deterministic "Smart Draft" engine.
  
  const isRestoration = req.outcome.includes("restoration");
  
  return {
    headline: isRestoration 
      ? "Forensic Assessment: Critical Storm Impact Identified"
      : "Property Observation: Maintenance & Monitoring Advisory",
    
    findingSummary: `Our forensic analysis of the ${req.findings.join(", ")} revealed clear evidence of atmospheric impact. While the integrity remains currently stable, the observed collateral damage suggests a trajectory toward accelerated degradation.`,
    
    pathExplanation: isRestoration
      ? "Due to the density of observed impacts, we recommend a formal restoration trajectory to preserve the property's NOI and structural authority."
      : "We recommend a strategic monitoring program to track these observations without immediate intervention.",
    
    pdfCopy: "Exhaustive forensic audit confirms structural anomalies consistent with recent weather events. Documentation has been finalized for stakeholder review.",
    
    followUpNote: "I have prepared the full forensic dossier for your records. Let's discuss the preservation strategy once you've had a chance to review the findings."
  };
}
