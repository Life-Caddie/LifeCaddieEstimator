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

    const chatHistoryRaw = String(form.get("chat_history") || "").trim();
    const chatHistory = chatHistoryRaw ? safeJsonParse(chatHistoryRaw) || [] : [];

    if (!Array.isArray(chatHistory) || !chatHistory.length) {
      return NextResponse.json(
        { error: "Invalid or missing chat history." },
        { status: 400, headers: corsHeaders(origin) }
      );
    }

    const instructions = `
You are Life Caddie, a calm, non-judgmental downsizing & organizing guide.

Continue the conversation based on the chat history. Provide helpful, kind responses to the user's latest message.

Chat History:
${chatHistory.map((msg: any) => `${msg.who}: ${msg.text}`).join('\n')}

Return STRICT JSON ONLY:
{
  "messages": string[],       // 1-3 short chat bubbles for the response
  "quick_actions": string[]   // 0-3 optional tappable labels
}

Rules:
- Kind, no shame.
- Keep responses concise and conversational.
- Avoid recommending buying products.
- If the user mentions progress or needs advice, offer gentle guidance.
`.trim();

    const resp = await openai.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
      instructions,
      input: [
        {
          role: "user",
          content: [
            { type: "input_text", text: "Continue the conversation based on the history." }
          ]
        }
      ],
      max_output_tokens: 400,
      store: false
    });

    const raw = resp.output_text || "";
    const parsed = safeJsonParse(raw);

    const messages = Array.isArray(parsed?.messages) ? parsed.messages.slice(0, 3) : [];
    const quick_actions = Array.isArray(parsed?.quick_actions) ? parsed.quick_actions.slice(0, 3) : [];

    if (!messages.length) {
      return NextResponse.json(
        {
          messages: [
            "Thanks for sharing that. I'm here to help with your organizing journey."
          ],
          quick_actions: []
        },
        { headers: corsHeaders(origin) }
      );
    }

    return NextResponse.json({ messages, quick_actions }, { headers: corsHeaders(origin) });
  } catch (err) {
    console.error("conversation route error:", err);
    return NextResponse.json(
      { error: "Server error while processing conversation." },
      { status: 500, headers: corsHeaders(origin) }
    );
  }
}