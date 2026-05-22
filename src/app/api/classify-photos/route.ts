import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const SYSTEM_PROMPT = `You are an expert roofing damage assessor. You will be given one or more photos from a residential roof inspection.

Analyze the photos and return a JSON object with this exact shape:
{
  "classification": one of ["no_damage", "monitor_only", "repair_only", "claim_review_candidate", "full_restoration_candidate"],
  "confidence": a number 0-100,
  "headline": a short 1-line summary of what you found,
  "reasoning": 2-3 sentences explaining why you chose this classification,
  "signals": an array of strings, each describing a specific damage indicator you observed (e.g. "Hail bruising visible on ridge cap", "Dents on aluminum gutter flashing")
}

Classification guide:
- no_damage: No meaningful damage indicators. Property integrity appears maintained.
- monitor_only: Minor wear consistent with aging, not storm-related. No immediate action needed.
- repair_only: Localized damage present (cracked tabs, minor displacement) but does not meet claim threshold.
- claim_review_candidate: Clear storm-related damage with impact marks on metal, bruising, or granule loss consistent with a hail or wind event.
- full_restoration_candidate: Widespread damage across multiple slopes or surfaces (roof + siding/gutters/windows).

Be conservative — only escalate to claim_review or full_restoration when clear evidence exists. If photo quality is too low to assess, set confidence below 50 and explain in reasoning.

Return ONLY valid JSON. No markdown, no explanation outside the JSON.`;

export async function POST(req: NextRequest) {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  try {
    const { photos } = await req.json() as { photos: string[] };

    if (!photos || photos.length === 0) {
      return NextResponse.json({ error: "No photos provided" }, { status: 400 });
    }

    // Build the content array — up to 10 photos to stay within token limits
    const imageContent: OpenAI.Chat.ChatCompletionContentPart[] = photos
      .slice(0, 10)
      .map((dataUrl) => {
        // dataUrl is either "data:image/jpeg;base64,..." or already a plain base64 string
        const base64 = dataUrl.includes(",") ? dataUrl.split(",")[1] : dataUrl;
        const mediaType = dataUrl.startsWith("data:image/png") ? "image/png"
          : dataUrl.startsWith("data:image/webp") ? "image/webp"
          : "image/jpeg";

        return {
          type: "image_url",
          image_url: {
            url: `data:${mediaType};base64,${base64}`,
            detail: "high",
          },
        } as OpenAI.Chat.ChatCompletionContentPartImage;
      });

    imageContent.push({
      type: "text",
      text: `Analyze these ${photos.slice(0, 10).length} roof inspection photo(s) and return the JSON classification.`,
    });

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      max_tokens: 600,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: imageContent },
      ],
    });

    const raw = response.choices[0]?.message?.content ?? "";

    let result;
    try {
      result = JSON.parse(raw);
    } catch {
      // GPT sometimes wraps in markdown — strip it
      const cleaned = raw.replace(/```json\n?/g, "").replace(/```/g, "").trim();
      result = JSON.parse(cleaned);
    }

    return NextResponse.json(result);
  } catch (err: any) {
    console.error("[classify-photos]", err);
    return NextResponse.json(
      { error: err?.message ?? "Classification failed" },
      { status: 500 }
    );
  }
}
