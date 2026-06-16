import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

export async function POST(req: NextRequest) {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const { text } = (await req.json()) as { text: string };
  if (!text?.trim()) {
    return NextResponse.json({ error: "No text provided" }, { status: 400 });
  }

  const response = await openai.audio.speech.create({
    model: "tts-1-hd",
    voice: "nova",
    input: text.slice(0, 500),
    speed: 0.95,
  });

  const buffer = Buffer.from(await response.arrayBuffer());

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "audio/mpeg",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
