import { NextResponse } from "next/server";
import { jwtVerify } from "jose";
import crypto from "crypto";
import OpenAI from "openai";

export const runtime = "nodejs";

const openai = new OpenAI({ apiKey: process.env.API_KEY });

const ALLOWED_ORIGINS = new Set([
  "http://localhost:3000",
  "https://lifecaddie.org",
  "https://www.lifecaddie.org"
]);

function corsHeaders(origin: string | null) {
  const allowOrigin = origin && ALLOWED_ORIGINS.has(origin) ? origin : "https://lifecaddie.org";
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Vary": "Origin"
  };
}

export async function OPTIONS(req: Request) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(req.headers.get("origin")) });
}

function getSecret() {
  const secret = process.env.LC_SESSION_JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("LC_SESSION_JWT_SECRET must be set and at least 32 characters.");
  }
  return new TextEncoder().encode(secret);
}

function sha256Base64Url(input: string) {
  return crypto.createHash("sha256").update(input).digest("base64url");
}

async function verifySession(req: Request) {
  const auth = req.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";

  if (!token) return { ok: false as const, reason: "missing_token" };

  try {
    const { payload } = await jwtVerify(token, getSecret(), {
      issuer: "lifecaddie",
      audience: "lifecaddie-space-tool"
    });

    const ua = req.headers.get("user-agent") || "unknown";
    const origin = req.headers.get("origin") || "";

    const uaHash = sha256Base64Url(ua);
    const originHash = origin ? sha256Base64Url(origin) : "";

    if (payload.uaHash !== uaHash) return { ok: false as const, reason: "ua_mismatch" };
    if (origin && payload.originHash && payload.originHash !== originHash) return { ok: false as const, reason: "origin_mismatch" };

    return { ok: true as const };
  } catch {
    return { ok: false as const, reason: "invalid_or_expired" };
  }
}

function isAllowedGoal(x: string) {
  return ["moving", "prepping_to_downsize", "reset", "staging", "caregiving", "other"].includes(x);
}
function isAllowedFeeling(x: string) {
  return ["overwhelmed", "excited", "sad", "motivated", "other"].includes(x);
}

function safeJsonParse(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    const a = text.indexOf("{");
    const b = text.lastIndexOf("}");
    if (a >= 0 && b > a) {
      try {
        return JSON.parse(text.slice(a, b + 1));
      } catch {}
    }
  }
  return null;
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

    const isFollowUp = Array.isArray(chatHistory) && chatHistory.filter(msg => msg.who === "user" && msg.text && msg.text.includes("Photo uploaded.")).length > 1;

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

    // Mobile-friendly limits
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

    // Convert to base64 data URL for the model call
    const arrayBuffer = await photo.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");
    const dataUrl = `data:${mime};base64,${base64}`;

    const instructions = `
You are Life Caddie, a calm, non-judgmental downsizing & organizing guide.

User inputs:
- goal: ${goal}
- Feeling: ${feeling}
${isFollowUp ? "- This is a follow-up photo to improve understanding or show progress in organizing the space." : ""}

Chat History:
${chatHistory.map((msg: { who: any; text: any; }) => `${msg.who}: ${msg.text}`).join('\n')}

Return STRICT JSON ONLY:
${isFollowUp ? `{
  "messages": string[],       // 3–6 short chat bubbles
  "quick_actions": string[]   // 3–6 tappable labels
}` : `{
  "first_step": string,       // Start with "Based on what I see..." or similar. Briefly describe the space/situation, then suggest ONE concrete 10-minute action with a short reason why (e.g., "...because it creates immediate relief and momentum")
  "question": string,         // A clarifying question to get more context
  "quick_actions": string[]   // 2–4 suggested tappable labels or quick responses
}`}

Rules:
- Kind, no shame.
${isFollowUp ? "- Acknowledge progress and provide refined advice based on the new photo and history." : "- first_step format: Start by acknowledging what you see (e.g., 'Based on what I see in your space...' or 'I notice...'), then provide ONE concrete, doable action that takes 10 minutes, then briefly explain why this helps (relief, momentum, focus, etc.).\n- question should help narrow down the next steps.\n- quick_actions can be quick answers to the question or alternative approaches."}
- Avoid recommending buying products.
- If safety hazards appear, mention gently.
`.trim();

    const resp = await openai.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
      instructions,
      input: [
        {
          role: "user",
          content: [
            { type: "input_text", text: isFollowUp ? "Analyze this follow-up photo for progress or improved understanding of the space." : "Analyze this space photo and generate the Clarity Plan." },
            { type: "input_image", image_url: dataUrl, detail: "auto" }

          ]
        }
      ],
      max_output_tokens: 650,
      store: false
    });

    const raw = resp.output_text || "";
    const parsed = safeJsonParse(raw);

    if (isFollowUp) {
      const messages = Array.isArray(parsed?.messages) ? parsed.messages.slice(0, 6) : [];
      const quick_actions = Array.isArray(parsed?.quick_actions) ? parsed.quick_actions.slice(0, 6) : [];

      if (!messages.length) {
        return NextResponse.json(
          {
            messages: [
              "Thanks — I'm here with you. Let's take one gentle step that creates immediate relief.",
              "Your first 10-minute step: choose ONE small zone (one shelf, one drawer, one counter corner). Remove anything that obviously doesn't belong, then put back only what supports that zone's purpose.",
              "If you tell me what kind of space this is (kitchen/closet/office/etc.), I can outline the next 2–3 zones in a calm order."
            ],
            quick_actions: ["This is a kitchen", "This is a closet", "This is an office", "Help me pick a first zone"]
          },
          { headers: corsHeaders(origin) }
        );
      }

      return NextResponse.json({ messages, quick_actions }, { headers: corsHeaders(origin) });
    } else {
      const first_step = parsed?.first_step || "";
      const question = parsed?.question || "";
      const quick_actions = Array.isArray(parsed?.quick_actions) ? parsed.quick_actions.slice(0, 4) : [];

      if (!first_step || !question) {
        return NextResponse.json(
          {
            first_step: "Choose ONE small zone (one shelf, one drawer, or one counter corner). Remove anything that obviously doesn't belong.",
            question: "What kind of space is this—kitchen, closet, bedroom, office, or something else?",
            quick_actions: ["Kitchen", "Closet", "Bedroom", "Office"]
          },
          { headers: corsHeaders(origin) }
        );
      }

      return NextResponse.json({ first_step, question, quick_actions }, { headers: corsHeaders(origin) });
    }
  } catch (err) {
    console.error("analyze route error:", err);
    return NextResponse.json(
      { error: "Server error while analyzing the image." },
      { status: 500, headers: corsHeaders(origin) }
    );
  }
}
