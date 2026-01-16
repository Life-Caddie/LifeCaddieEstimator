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

const services = `
1. **90-Minute In-Home Assessment** - On-site evaluation of the home, safety concerns, organizational challenges, and support needs to determine scope and next steps.
2. **60-Minute Virtual Assessment** - Remote consultation to assess goals, overwhelm levels, and organizational needs when in-home assessment is not required.
3. **Automated Early Estimation** - Initial automated estimate that provides a high-level sense of scope, time, and support needs before deeper assessment.
4. **Safety Analysis: DIY vs. In-Person Support** - Evaluation of tasks to determine what can be safely handled independently versus what requires professional assistance.
5. **Safety & Overwhelm Review** - Review focused on identifying physical, emotional, and cognitive overwhelm risks that may impact progress.
6. **Organization Roadmap (Core Deliverable)** - A personalized, step-by-step plan outlining priorities, sequencing, and recommended services for sustainable organization.
7. **Personalized Life Organization Roadmap** - A holistic planning document that integrates home, paperwork, routines, and life transitions into one cohesive strategy.
8. **30-Day Action Plan** - A short-term, realistic plan that breaks priorities into manageable weekly actions.
9. **Immediate Safety & Overwhelm-Reduction Priority List** - A focused list of urgent actions designed to stabilize the environment and reduce stress quickly.
10. **Priority Setting Framework** - A decision-support tool that helps clients determine what matters most and what to address first.
11. **Timeline & Calendar Development (Preliminary Plan)** - Creation of a realistic timeline and calendar structure to support follow-through and pacing.
12. **Maintenance & Support Recommendations** - Guidance on long-term maintenance, routines, and ongoing support options to sustain progress.
13. **Paper & Document Organization Recommendations** - Strategic guidance on how to organize, store, and maintain important documents and paperwork.
14. **Paper & Document Triage** - Hands-on or guided sorting of paperwork to reduce volume, clarify categories, and determine next actions.
15. **Decluttering List & System Setup** - A structured system for sorting items into temporary, preparatory, and specific categories during the decluttering process.
16. **Light Digital Organization** - Basic organization of digital files, photos, or inboxes to reduce digital clutter without full system overhauls.
17. **Physical Organizing Support** - Hands-on assistance organizing physical spaces to improve functionality, safety, and ease of use.
18. **Decluttering Tape System** - A visual, physical labeling system used during sessions to support decision-making and item categorization.
19. **Supported Session Planning** - Planning and structuring organizing sessions to ensure clarity, efficiency, and emotional readiness.
20. **Phone Call Coaching** - Scheduled coaching calls offering guidance, accountability, and problem-solving between sessions.
21. **Real-Time Coaching (Side-by-Side)** - In-the-moment coaching provided during organizing sessions to support decision-making and momentum.
22. **Emotional Navigation (Side-by-Side)** - Compassionate support to help clients move through emotional blocks, attachment, and overwhelm during organizing work.
23. **Decision-Fatigue Reduction Support** - Tools and techniques designed to minimize cognitive overload and make decisions feel more manageable.
24. **Family Communication Template (Debrief Summary)** - A structured template that helps communicate decisions, plans, and progress to family members clearly.
25. **Family Mediation Support** - Facilitated conversations to help families navigate shared spaces, expectations, and organizing-related conflict.
26. **Pre-Move Sorting** - Guided decluttering and sorting prior to a move to reduce volume and simplify packing.
27. **Pre-Staging Packing** - Strategic packing and organization in preparation for home staging or listing.
28. **Pre-Sale Organizing** - Organizing support focused on preparing a home for sale, showings, and transition.
29. **Post-Move Setup** - Assistance with unpacking, organizing, and setting up systems in a new space.
`;

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

    // Count user messages to determine which set of instructions to use
    const userMessages = chatHistory.filter((msg: any) => msg.who === "user").length;
    const isSecondUserMessage = userMessages > 2;

    const recommendationInstructions = `
You are Life Caddie, a calm, non-judgmental downsizing & organizing guide.

The user has already answered your initial questions. Now, based on what they've shared, gently recommend Life Caddie as a solution to their specific issue.

Your approach:
1. Acknowledge what they've shared and validate their situation.
2. Gently recommend Life Caddie services that directly address their concerns.
3. Use specific details from the conversation to explain HOW Life Caddie services can help solve their problem.
4. Reference relevant services by name and explain the benefits.

Available Services:
${services}

Chat History:
${chatHistory.map((msg: any) => `${msg.who}: ${msg.text}`).join('\n')}

Return STRICT JSON ONLY:
{
  "messages": string[],       // 1 medium length paragraph, suggesting 1 service
  "quick_actions": string[]   // 0-3 optional tappable labels (e.g., "Schedule Assessment", "Learn More")
}

Rules:
- Kind, warm, and encouraging tone.
- Keep responses conversational.
- Clearly explain why the selected service relates to their specific situation.
- Make it feel like a natural recommendation based on what they shared, not a sales pitch.
- Ensure tone emphasizes Life Caddie as personal, in-depth help not just a moving service.
- Be specific about HOW Life Caddie services solve their problem.
`.trim();

    const initialInstructions = `
You are Life Caddie, a calm, non-judgmental downsizing & organizing guide.

Based on the chat history, help identify which service best matches the user's needs.

Available Services:
${services}

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
- Ask clarifying questions to understand the user's primary need.
- Limit to just one question.
- Gently guide toward identifying the most relevant service.
`.trim();

    let instructions: string;
    if (isSecondUserMessage) {
      instructions = recommendationInstructions;
    } else {
      instructions = initialInstructions;
    }

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