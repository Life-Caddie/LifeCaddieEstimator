import { NextResponse } from "next/server";
import { jwtVerify } from "jose";
import crypto from "crypto";
import OpenAI from "openai";
import { uploadImage } from "../../../lib/azureStorage";

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

function isAllowedIntention(x: string) {
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

    const intention = String(form.get("intention") || "").trim();
    const feeling = String(form.get("feeling") || "").trim();
    const photo = form.get("photo");
    const chatHistoryRaw = String(form.get("chat_history") || "").trim();
    const chatHistory = chatHistoryRaw ? safeJsonParse(chatHistoryRaw) || [] : [];

    const isFollowUp = Array.isArray(chatHistory) && chatHistory.filter(msg => msg.who === "user" && msg.text && msg.text.includes("Photo uploaded.")).length > 1;

    if (!intention || !feeling || !photo) {
      return NextResponse.json(
        { error: "Missing required fields (photo, intention, feeling)." },
        { status: 400, headers: corsHeaders(origin) }
      );
    }
    if (!isAllowedIntention(intention) || !isAllowedFeeling(feeling)) {
      return NextResponse.json(
        { error: "Invalid intention or feeling value." },
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

    // Optionally store the raw uploaded image to Azure Blob Storage
    const container = process.env.AZURE_UPLOAD_CONTAINER;
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
- Intention: ${intention}
- Feeling: ${feeling}
${isFollowUp ? "- This is a follow-up photo to improve understanding or show progress in organizing the space." : ""}

Chat History:
${chatHistory.map((msg: { who: any; text: any; }) => `${msg.who}: ${msg.text}`).join('\n')}

Return STRICT JSON ONLY:
{
  "messages": string[],       // 3–6 short chat bubbles
  "quick_actions": string[]   // 3–6 tappable labels
}

Rules:
- Kind, no shame.
- ${isFollowUp ? "Acknowledge progress and provide refined advice based on the new photo and history." : "Give a 10-minute first step."}
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

    const messages = Array.isArray(parsed?.messages) ? parsed.messages.slice(0, 6) : [];
    const quick_actions = Array.isArray(parsed?.quick_actions) ? parsed.quick_actions.slice(0, 6) : [];

    // include stored photo URL if we saved the upload to Azure
    // (the upload step may have set `req._stored_photo_url` earlier)
    // @ts-ignore
    const storedPhotoUrl = (req as any)?._stored_photo_url as string | undefined;

    if (!messages.length) {
      const payload: any = {
        messages: [
          "Thanks — I’m here with you. Let’s take one gentle step that creates immediate relief.",
          "Your first 10-minute step: choose ONE small zone (one shelf, one drawer, one counter corner). Remove anything that obviously doesn’t belong, then put back only what supports that zone’s purpose.",
          "If you tell me what kind of space this is (kitchen/closet/office/etc.), I can outline the next 2–3 zones in a calm order."
        ],
        quick_actions: ["This is a kitchen", "This is a closet", "This is an office", "Help me pick a first zone"]
      };
      if (storedPhotoUrl) payload.stored_photo_url = storedPhotoUrl;
      return NextResponse.json(payload, { headers: corsHeaders(origin) });
    }

    const respPayload: any = { messages, quick_actions };
    if (storedPhotoUrl) respPayload.stored_photo_url = storedPhotoUrl;

    return NextResponse.json(respPayload, { headers: corsHeaders(origin) });
  } catch (err) {
    console.error("analyze route error:", err);
    return NextResponse.json(
      { error: "Server error while analyzing the image." },
      { status: 500, headers: corsHeaders(origin) }
    );
  }
}