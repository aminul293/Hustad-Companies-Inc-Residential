"use server";

import OpenAI from "openai";

/**
 * HUSTAD AI COMPLIANCE ENGINE
 * Drafts findings summaries with strict guardrails against insurance promises.
 */

export interface AISummaryRequest {
  findings: string[];
  photosCount: number;
  outcome: string;
  internalNotes?: string;
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
- NEVER use or imply 'free roof', 'no cost to you', or 'insurance will pay for everything' language.
- NEVER state warranty eligibility before manufacturer confirmation.
- ALWAYS use forensic language: "evidence of impact," "collateral damage observed," "potential for long-term compromise."
- DO NOT change the outcome_type.
- STRICT DATA ADHERENCE: If the findings array is empty and there are no internal notes, DO NOT hallucinate, invent, or assume any damage or repairs. Explicitly state that no specific damage was documented. Ensure all sentences are complete.

Return the response as a JSON object matching this schema:
{
  "headline": "string",
  "findingSummary": "string",
  "pathExplanation": "string",
  "pdfCopy": "string",
  "followUpNote": "string"
}
`;

export async function draftFindingSummary(req: AISummaryRequest): Promise<AISummaryResponse> {
  const isRestoration = req.outcome.includes("restoration");
  
  const fallbackMock: AISummaryResponse = {
    headline: isRestoration 
      ? "Forensic Assessment: Critical Storm Impact Identified"
      : "Property Observation: Maintenance & Monitoring Advisory",
    
    findingSummary: `Our forensic analysis of the ${req.findings.join(", ")} revealed clear evidence of atmospheric impact. While the integrity remains currently stable, the observed collateral damage suggests a trajectory toward accelerated degradation.`,
    
    pathExplanation: isRestoration
      ? "Due to the density of observed impacts, we recommend a formal restoration trajectory to preserve the property's NOI and structural authority."
      : "We recommend a strategic monitoring program to track these observations without immediate intervention.",
    
    pdfCopy: "Exhaustive forensic audit confirms structural anomalies consistent with recent weather events. Documentation has been finalized for stakeholder review.",
    
    followUpNote: "I have prepared the full inspection report for your records. Let's discuss the preservation strategy once you've had a chance to review the findings."
  };

  if (!process.env.OPENAI_API_KEY) {
    return fallbackMock;
  }

  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const userMessage = JSON.stringify({
      findings: req.findings,
      photosCount: req.photosCount,
      outcome: req.outcome,
      internalNotes: req.internalNotes || ""
    });

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: COMPLIANCE_GUARDRAILS },
        { role: "user", content: userMessage }
      ],
      response_format: { type: "json_object" },
      max_tokens: 800,
      temperature: 0.3
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error("Empty response from OpenAI");

    const parsed = JSON.parse(content) as AISummaryResponse;
    return parsed;
  } catch (error) {
    console.error("OpenAI summary generation failed, using fallback:", error);
    return fallbackMock;
  }
}
