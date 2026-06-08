import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const SYSTEM_PROMPT = `You are an expert roofing damage assessor. You will be given one or more photos from a residential roof inspection.

Analyze the photos and return a JSON object with this exact shape:
{
  "classification": one of ["no_damage", "monitor_only", "repair_only", "claim_review_candidate", "full_restoration_candidate"],
  "confidence": a number 0-100,
  "headline": a short 1-line summary of what you found (max 12 words),
  "reasoning": 2-3 sentences explaining why you chose this classification,
  "signals": an array of strings, each describing a specific damage indicator you observed (e.g. "Hail bruising visible on ridge cap", "Dents on aluminum gutter flashing"),
  "urgentCount": integer — number of items requiring immediate action (tarping, emergency repair). 0 for no_damage/monitor_only,
  "stormCount": integer — number of storm-related damage items visible across all photos,
  "monitorCount": integer — number of items to watch over time but not act on yet
}

Classification guide:
- no_damage: No meaningful damage indicators. Property integrity appears maintained.
- monitor_only: Minor wear consistent with aging, not storm-related. No immediate action needed.
- repair_only: Localized damage present (cracked tabs, minor displacement) but does not meet claim threshold.
- claim_review_candidate: Clear storm-related damage with impact marks on metal, bruising, or granule loss consistent with a hail or wind event.
- full_restoration_candidate: Widespread damage across multiple slopes or surfaces (roof + siding/gutters/windows).

Count guide (counts depend on classification):
- urgentCount:
    • For repair_only: count ALL distinct items that need repair service (gutter holes, cracked downspouts, fascia damage, broken flashing, etc.) — even if not emergency. This field is displayed as "Repair Items" on the repair path.
    • For claim_review_candidate / full_restoration_candidate: count items needing same-day or emergency attention (active leaks, missing sections, structural exposure).
    • For no_damage / monitor_only: always 0.
- stormCount: count distinct storm-related damage items visible (hail hits, wind displacement, gutter dents from impact, etc.). 0 when classification is repair_only due to non-storm wear/aging.
- monitorCount: count items showing wear or minor issues that should be re-inspected in 6–12 months but do not need repair or claim action yet.

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
      .map((photo) => {
        // Rep-camera photos arrive as plain https:// URLs (Supabase public URL).
        // Tablet-captured photos arrive as "data:image/...;base64,..." strings.
        // OpenAI vision accepts both formats — just pass the URL directly.
        let imageUrl: string;
        if (photo.startsWith("http://") || photo.startsWith("https://")) {
          imageUrl = photo;
        } else {
          const base64 = photo.includes(",") ? photo.split(",")[1] : photo;
          const mediaType = photo.startsWith("data:image/png") ? "image/png"
            : photo.startsWith("data:image/webp") ? "image/webp"
            : "image/jpeg";
          imageUrl = `data:${mediaType};base64,${base64}`;
        }

        return {
          type: "image_url",
          image_url: { url: imageUrl, detail: "high" },
        } as OpenAI.Chat.ChatCompletionContentPartImage;
      });

    imageContent.push({
      type: "text",
      text: `Analyze these ${photos.slice(0, 10).length} roof inspection photo(s) and return the JSON classification.`,
    });

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      max_tokens: 600,
      temperature: 0,
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
