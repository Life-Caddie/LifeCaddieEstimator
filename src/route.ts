import OpenAI from "openai";
import { NextResponse } from "next/server";

export const runtime = "nodejs"; // use Node runtime for larger payloads / easier buffers

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // keep this server-side only :contentReference[oaicite:1]{index=1}
});

type AnalyzeRequest = {
  intention: string;
  feeling: string;
  image: string; // data URL: "data:image/jpeg;base64,..."
  context_version?: string;
};

type AnalyzeResponse = {
  messages: string[];
  quick_actions?: string[];
};

function isDataUrlImage(s: string) {
  return typeof s === "string" && /^data:image\/(png|jpeg|jpg|webp);base64,/.test(s);
}

function clampArrayStrings(arr: unknown, maxItems: number, maxLen: number): string[] {
  if (!Array.isArray(arr)) return [];
  return arr
    .filter((x) => typeof x === "string")
    .map((x) => x.slice(0, maxLen))
    .slice(0, maxItems);
}

function safeJsonParse(text: string): any | null {
  // Try direct JSON parse first
  try {
    return JSON.parse(text);
  } catch {}

  // If the model wrapped JSON in text, try to extract the first {...} block
  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    const maybe = text.slice(firstBrace, lastBrace + 1);
    try {
      return JSON.parse(maybe);
    } catch {}
  }
  return null;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as AnalyzeRequest;

    const intention = (body.intention || "").trim();
    const feeling = (body.feeling || "").trim();
    const image = body.image;

    if (!intention || !feeling) {
      return NextResponse.json(
        { error: "Missing required fields: intention and feeling." },
        { status: 400 }
      );
    }

    if (!image || !isDataUrlImage(image)) {
      return NextResponse.json(
        { error: "Missing or invalid image. Provide a base64 data URL (png/jpg/webp)." },
        { status: 400 }
      );
    }

    // Optional: basic payload size guard (data URLs can get huge)
    // Rough check: 8MB of base64 string length is already quite large.
    if (image.length > 8_000_000) {
      return NextResponse.json(
        { error: "Image is too large. Please upload a smaller photo (try under ~3–4MB)." },
        { status: 413 }
      );
    }

    // Life Caddie “voice” + output contract
    const instructions = `
You are Life Caddie, a calm, non-judgmental downsizing & organizing guide.
The user uploaded a photo of a home space and answered:
- Intention: ${intention}
- Feeling: ${feeling}

Your job: produce a gentle, encouraging "Clarity Plan" that reduces overwhelm.

OUTPUT FORMAT (JSON ONLY):
{
  "messages": string[],         // 3–6 chat bubbles; short paragraphs; practical + kind
  "quick_actions": string[]     // 3–6 tappable options (e.g., "This is a kitchen", "Help me pick a first zone")
}

Rules:
- Do NOT shame, do NOT say “just declutter”.
- Suggest a first step that fits in 10 minutes.
- Avoid recommending buying products.
- If the image suggests safety hazards (blocking exits, stacked unstable items), mention gently.
- Return STRICT JSON ONLY (no markdown, no extra text).
`.trim();

    // Vision input format: content array includes input_text + input_image :contentReference[oaicite:2]{index=2}
    const response = await openai.responses.create({
      // Choose a fast/affordable model for lead-gen MVP; adjust as desired :contentReference[oaicite:3]{index=3}
      model: process.env.OPENAI_MODEL || "gpt-5.2",
      instructions,
      input: [
        {
          role: "user",
          content: [
            { type: "input_text", text: "Analyze this space photo and generate the Clarity Plan." },
            { type: "input_image", image_url: image },
          ],
        },
      ],
      // Keep it tight (you can adjust)
      max_output_tokens: 650,
      // You can store=false if you prefer not to store responses on provider side
      store: false,
      // reasoning is optional; for speed/cost you can keep it low on reasoning models :contentReference[oaicite:4]{index=4}
      reasoning: { effort: "low" } as any,
    });

    const raw = response.output_text || "";
    const parsed = safeJsonParse(raw);

    // Validate and sanitize output
    const messages = clampArrayStrings(parsed?.messages, 6, 900);
    const quick_actions = clampArrayStrings(parsed?.quick_actions, 6, 60);

    // Fallback if model didn't comply
    if (messages.length === 0) {
      const fallback: AnalyzeResponse = {
        messages: [
          "Thanks — I’m here with you. Based on what you shared, let’s take one gentle step that creates immediate relief.",
          "Your first 10-minute step: pick ONE small zone (a counter corner, one shelf, one drawer). Remove anything that obviously doesn’t belong, then put back only what supports that zone’s purpose.",
          "If you tell me what kind of space this is (kitchen/closet/office/etc.), I can outline the next 2–3 zones in a calm order.",
        ],
        quick_actions: ["This is a kitchen", "This is a closet", "This is an office", "Help me pick a first zone"],
      };
      return NextResponse.json(fallback);
    }

    const out: AnalyzeResponse = {
      messages,
      quick_actions,
    };

    return NextResponse.json(out);
  } catch (err: any) {
    console.error("Analyze route error:", err);
    return NextResponse.json(
      { error: "Server error while analyzing the image." },
      { status: 500 }
    );
  }
}
