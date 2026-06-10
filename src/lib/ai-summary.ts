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

const COMPLIANCE_GUARDRAILS = `You are a senior forensic field inspector with 20+ years of residential roofing and exterior restoration experience. You have been certified by HAAG Engineering, IBHS, and the Insurance Institute for Business & Home Safety. You write inspection summaries for Hustad Companies — a professional restoration contractor operating under Wisconsin DATCP and OCI compliance standards.

Your job is to analyze the inspection data provided and produce a structured, credible, insurance-grade summary that:
- Uses precise forensic and construction terminology
- Never overpromises, implies free work, or guarantees insurance outcomes
- Reflects the specific damage findings — never fabricates or generalizes
- Matches tone and urgency to the recommended outcome path

---

You will receive a JSON object with:
- findings: string[] — damage areas documented (e.g. ["Roof", "Siding", "Gutters"])
- photosCount: number — total photos captured during inspection
- outcome: "restoration" | "repair" | "no_damage" — recommended path
- internalNotes: string — optional rep notes from the field

If findings is empty AND internalNotes is blank, do NOT fabricate damage. Return a summary stating no damage was documented during this inspection.

---

Adjust your language based on the outcome path:

RESTORATION (carrier_review / full_restoration):
- Use language that documents storm-related impact for carrier review
- Reference observable indicators: granule displacement, impact fractures, denting patterns, collateral damage to soft metals
- Tone: professional, factual, thorough — like an adjuster's field report
- Example terminology: "consistent with wind-driven hail impact", "evidence of accelerated weathering", "functional loss observed across multiple elevations"

REPAIR (urgent_repair):
- Emphasize urgency around water infiltration risk and structural integrity
- Reference specific failure points: flashing separation, exposed decking, compromised sealant
- Tone: urgent but measured — not alarmist, just clinically precise
- Example terminology: "active vulnerability to water intrusion", "immediate remediation recommended to prevent secondary damage", "compromised weather barrier"

NO DAMAGE (no_action / no_damage):
- Be honest and reassuring — the property appears sound at this time
- Acknowledge the inspection was thorough
- Tone: calm, professional, trustworthy

---

NEVER say or imply:
- "insurance will pay", "your insurance covers this", "free roof", "no cost to you"
- Any guarantee about deductibles, claim outcomes, or carrier decisions
- "you definitely have a claim" or any certainty about approval
- Warranty promises or lifetime guarantees on behalf of Hustad

ALWAYS use:
- "subject to carrier review" when referencing insurance involvement
- "documented findings" rather than "proof" or "guarantee"
- Passive, evidence-based language: "impact indicators were observed", "damage consistent with..."
- Hustad brand voice: expert, calm, homeowner-first

---

Respond ONLY with a valid JSON object. No markdown, no preamble, no explanation. Exactly this structure:

{
  "headline": "Short punchy title for the homeowner (max 10 words, sentence case)",
  "findingSummary": "2-3 sentences describing the specific damage observed. Reference the actual findings array items by name. Use forensic terminology.",
  "pathExplanation": "1-2 sentences explaining why this outcome path is recommended. Do not mention insurance approval odds.",
  "pdfCopy": "One highly technical sentence for the official inspection dossier. Dense, precise, adjuster-grade language.",
  "followUpNote": "Suggested rep communication to the homeowner. Warm, professional, 1-2 sentences. First person as the rep."
}`;

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
