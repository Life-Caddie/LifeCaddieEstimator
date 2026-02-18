import { NextResponse } from "next/server";
import OpenAI from "openai";
import { corsHeaders, handleOPTIONS, verifySession, safeJsonParse, SERVICES_LIST } from "../toolkit";
import { uploadBlob } from "../../../lib/azureStorage";
import { ALLOWED_GOAL_VALUES, ALLOWED_FEELING_VALUES } from "../../../constants/intake";

export const runtime = "nodejs";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function OPTIONS(req: Request) {
  return handleOPTIONS(req);
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
    if (!ALLOWED_GOAL_VALUES.includes(goal) || !ALLOWED_FEELING_VALUES.includes(feeling)) {
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

    const container = process.env.AZURE_STORAGE_CONTAINER_IMAGES;
    if (container) {
      try {
        const blobName = `${Date.now()}-${crypto.randomUUID()}-${photo.name}`;
        const buf = Buffer.from(arrayBuffer);
        await uploadBlob(container, blobName, buf, mime);
      } catch (err) {
        console.error("azure upload failed:", err);
      }
    }

    const instructions = `
You are a calm, non-judgmental downsizing & organizing guide for 'Life Caddie'.

User inputs:
- goal: ${goal}
- Feeling: ${feeling}

Chat History:
${chatHistory.map((msg: { who: string; text: string }) => `${msg.who}: ${msg.text}`).join('\n')}

Available Life Caddie Services:
${SERVICES_LIST}

Return STRICT JSON ONLY:
{
  "task": string,              // 1-2 sentences: validate the user's feelings and briefly acknowledge what you see in the photo.
  "follow_up_question": string // 1 sentence: ask ONE clarifying question designed to narrow down which Life Caddie service(s) best fit the user's situation. The question should help distinguish between service categories (e.g., do they need hands-on help vs. a plan, are they on a timeline, is this emotional or logistical, etc.).
}

Rules:
- Kind, no shame.
- Start by validating the user's feelings in 1-2 sentences.
- If safety hazards appear in the photo, mention gently.
- Ask exactly ONE clarifying question. The question must help align the user toward specific Life Caddie services.
- Do NOT recommend services yet — just ask the one question.
- Do NOT provide a task or action step. The goal is to understand the user's needs before recommending.
`.trim();

    const resp = await openai.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
      instructions,
      input: [
        {
          role: "user",
          content: [
            { type: "input_text", text: "Analyze this space photo and provide a validation of the user's feelings along with one clarifying question." },
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
    const followUpQuestion = parsed?.follow_up_question || "";

    if (!task || !followUpQuestion) {
      return NextResponse.json(
        {
          task: "Thanks for sharing that — I can see this space has a lot going on, and it makes sense that you're feeling that way.",
          follow_up_question: "Are you looking more for a structured plan to follow on your own, or would hands-on support from someone alongside you feel more helpful right now?"
        },
        { headers: corsHeaders(origin) }
      );
    }

    return NextResponse.json({ task, follow_up_question: followUpQuestion }, { headers: corsHeaders(origin) });
  } catch (err) {
    console.error("analyze route error:", err);
    return NextResponse.json(
      { error: "Server error while analyzing the image." },
      { status: 500, headers: corsHeaders(origin) }
    );
  }
}
