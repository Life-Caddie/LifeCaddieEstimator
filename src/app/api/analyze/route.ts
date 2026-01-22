import { NextResponse } from "next/server";
import OpenAI from "openai";
import { corsHeaders, handleOPTIONS, verifySession, safeJsonParse } from "../toolkit";
import { uploadImage } from "../../../lib/azureStorage";

export const runtime = "nodejs";

const openai = new OpenAI({ apiKey: process.env.API_KEY });

export async function OPTIONS(req: Request) {
  return handleOPTIONS(req);
}

function isAllowedGoal(x: string) {
  return ["moving", "prepping_to_downsize", "reset", "staging", "caregiving", "other"].includes(x);
}

function isAllowedFeeling(x: string) {
  return ["overwhelmed", "excited", "sad", "motivated", "other"].includes(x);
}

export async function POST(req: Request) {
  const origin = req.headers.get("origin");

  const session = await verifySession(req);
  if (!session.ok) {
    return NextResponse.json(
      { error: "Unauthorized", reason: session.reason },
      { status: 401, headers: corsHeaders(origin) }
    );
  }

  try {
    const form = await req.formData();

    const goal = String(form.get("goal") || "").trim();
    const feeling = String(form.get("feeling") || "").trim();
    const photo = form.get("photo");
    const chatHistoryRaw = String(form.get("chat_history") || "").trim();
    const chatHistory = chatHistoryRaw ? safeJsonParse(chatHistoryRaw) || [] : [];

    if (!goal || !feeling || !photo) {
      return NextResponse.json(
        { error: "Missing required fields (photo, goal, feeling)." },
        { status: 400, headers: corsHeaders(origin) }
      );
    }
    if (!isAllowedGoal(goal) || !isAllowedFeeling(feeling)) {
      return NextResponse.json(
        { error: "Invalid goal or feeling value." },
        { status: 400, headers: corsHeaders(origin) }
      );
    }
    if (!(photo instanceof File)) {
      return NextResponse.json(
        { error: "Invalid photo upload." },
        { status: 400, headers: corsHeaders(origin) }
      );
    }

    if (photo.size > 5_000_000) {
      return NextResponse.json(
        { error: "Photo too large. Please use a smaller image (try under 5MB)." },
        { status: 413, headers: corsHeaders(origin) }
      );
    }

    const mime = photo.type || "image/jpeg";
    if (!mime.startsWith("image/")) {
      return NextResponse.json(
        { error: "Uploaded file must be an image." },
        { status: 400, headers: corsHeaders(origin) }
      );
    }

    const arrayBuffer = await photo.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");
    const dataUrl = `data:${mime};base64,${base64}`;

    // Optionally store the raw uploaded image to Azure Blob Storage
    const container = process.env.AZURE_STORAGE_CONTAINER_IMAGES;
    if (container) {
      try {
        const blobName = `${Date.now()}-${crypto.randomUUID()}-${(photo as File).name}`;
        const buf = Buffer.from(arrayBuffer);
        const stored = await uploadImage(container, blobName, buf, mime);
        // attach stored URL to the response payload (non-breaking addition)
        // we'll add it to the success fallback below if parsing fails; otherwise include in JSON response
        // temporarily store on req local var (we'll include later)
        // @ts-ignore
        (req as any)._stored_photo_url = stored.url;
      } catch (err) {
        console.error("azure upload failed:", err);
      }
    }

    const instructions = `
You are Life Caddie, a calm, non-judgmental downsizing & organizing guide.

User inputs:
- goal: ${goal}
- Feeling: ${feeling}

Chat History:
${chatHistory.map((msg: { who: any; text: any; }) => `${msg.who}: ${msg.text}`).join('\n')}

Return STRICT JSON ONLY:
{
  "task": string, // 3-4 sentances
  "follow_up_question": string // 1-2 sentances
}

Rules:
- Kind, no shame.
- Should start with and a sentance to validate the users feelings.
- Avoid recommending buying products.
- If safety hazards appear, mention gently.
- Gently provide a quick task the user could do, based on the provided image.
- Questions should be about the client, and their goal holistically.
`.trim();

    const resp = await openai.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
      instructions,
      input: [
        {
          role: "user",
          content: [
            { type: "input_text", text: "Analyze this space photo and generate the Clarity Plan with a quick task and follow-up question." },
            { type: "input_image", image_url: dataUrl, detail: "auto" }

          ]
        }
      ],
      max_output_tokens: 650,
      store: false
    });

    const raw = resp.output_text || "";
    const parsed = safeJsonParse(raw);

    const task = parsed?.task || "";
    const follow_up_question = parsed?.follow_up_question || "";

    if (!task || !follow_up_question) {
      return NextResponse.json(
        {
          messages: [
            "Thanks — I’m here with you. Let’s take one gentle step that creates immediate relief.",
            "Your first 10-minute step: choose ONE small zone (one shelf, one drawer, one counter corner). Remove anything that obviously doesn’t belong, then put back only what supports that zone’s purpose.",
            "If you tell me what kind of space this is (kitchen/closet/office/etc.), I can outline the next 2–3 zones in a calm order."
          ]
        },
        { headers: corsHeaders(origin) }
      );
    }

    return NextResponse.json({ task, follow_up_question }, { headers: corsHeaders(origin) });
  } catch (err) {
    console.error("analyze route error:", err);
    return NextResponse.json(
      { error: "Server error while analyzing the image." },
      { status: 500, headers: corsHeaders(origin) }
    );
  }
}
