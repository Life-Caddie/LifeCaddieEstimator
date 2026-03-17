import { NextResponse } from "next/server";
import { jwtVerify } from "jose";
import crypto from "crypto";

export const ALLOWED_ORIGINS = new Set([
  "http://localhost:3000",
  "https://lifecaddie.org",
  "https://www.lifecaddie.org"
]);

export function corsHeaders(origin: string | null) {
  const allowOrigin = origin && ALLOWED_ORIGINS.has(origin) ? origin : "https://lifecaddie.org";
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Vary": "Origin"
  };
}

export async function handleOPTIONS(req: Request) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(req.headers.get("origin")) });
}

export function getSecret() {
  const secret = process.env.LC_SESSION_JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("LC_SESSION_JWT_SECRET must be set and at least 32 characters.");
  }
  return new TextEncoder().encode(secret);
}

export function sha256Base64Url(input: string) {
  return crypto.createHash("sha256").update(input).digest("base64url");
}

export async function verifySession(req: Request) {
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

export const SERVICES_LIST = `
1. X-Minute In-Home Assessment - On-site evaluation of the home, safety concerns, organizational challenges, and support needs to determine scope and next steps. Replace 'X'-minute with a number up to 90 minutes based on magnitude of work.
2. X-Minute Virtual Assessment - Remote consultation to assess goals, overwhelm levels, and organizational needs when in-home assessment is not required. Replace 'X'-minute with a number up to 60 minutes based on magnitude of work.
3. Automated Early Estimation - Initial automated estimate that provides a high-level sense of scope, time, and support needs before deeper assessment.
4. Safety Analysis: DIY vs. In-Person Support - Evaluation of tasks to determine what can be safely handled independently versus what requires professional assistance.
5. Safety & Overwhelm Review - Review focused on identifying physical, emotional, and cognitive overwhelm risks that may impact progress.
6. Organization Roadmap (Core Deliverable) - A personalized, step-by-step plan outlining priorities, sequencing, and recommended services for sustainable organization.
7. Personalized Life Organization Roadmap - A holistic planning document that integrates home, paperwork, routines, and life transitions into one cohesive strategy.
8. X-Day Action Plan - A short-term, realistic plan that breaks priorities into manageable weekly actions. Replace 'X'-day with a number up to 30 days, based on magnitude of work.
9. Immediate Safety & Overwhelm-Reduction Priority List - A focused list of urgent actions designed to stabilize the environment and reduce stress quickly.
10. Priority Setting Framework - A decision-support tool that helps clients determine what matters most and what to address first.
11. Timeline & Calendar Development (Preliminary Plan) - Creation of a realistic timeline and calendar structure to support follow-through and pacing.
12. Maintenance & Support Recommendations - Guidance on long-term maintenance, routines, and ongoing support options to sustain progress.
13. Paper & Document Organization Recommendations - Strategic guidance on how to organize, store, and maintain important documents and paperwork.
14. Paper & Document Triage - Hands-on or guided sorting of paperwork to reduce volume, clarify categories, and determine next actions.
15. Decluttering List & System Setup - A structured system for sorting items into temporary, preparatory, and specific categories during the decluttering process.
16. Light Digital Organization - Basic organization of digital files, photos, or inboxes to reduce digital clutter without full system overhauls.
17. Physical Organizing Support - Hands-on assistance organizing physical spaces to improve functionality, safety, and ease of use.
18. Decluttering Tape System - A visual, physical labeling system used during sessions to support decision-making and item categorization.
19. Supported Session Planning - Planning and structuring organizing sessions to ensure clarity, efficiency, and emotional readiness.
20. Phone Call Coaching - Scheduled coaching calls offering guidance, accountability, and problem-solving between sessions.
21. Real-Time Coaching (Side-by-Side) - In-the-moment coaching provided during organizing sessions to support decision-making and momentum.
22. Emotional Navigation (Side-by-Side) - Compassionate support to help clients move through emotional blocks, attachment, and overwhelm during organizing work.
23. Decision-Fatigue Reduction Support - Tools and techniques designed to minimize cognitive overload and make decisions feel more manageable.
24. Family Communication Template (Debrief Summary) - A structured template that helps communicate decisions, plans, and progress to family members clearly.
25. Family Mediation Support - Facilitated conversations to help families navigate shared spaces, expectations, and organizing-related conflict.
26. Pre-Move Sorting - Guided decluttering and sorting prior to a move to reduce volume and simplify packing.
27. Pre-Staging Packing - Strategic packing and organization in preparation for home staging or listing.
28. Pre-Sale Organizing - Organizing support focused on preparing a home for sale, showings, and transition.
29. Post-Move Setup - Assistance with unpacking, organizing, and setting up systems in a new space.
`.trim();

export function safeJsonParse(text: string) {
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
