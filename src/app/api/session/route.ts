import { NextResponse } from "next/server";
import { SignJWT } from "jose";
import crypto from "crypto";

export const runtime = "nodejs";

const ALLOWED_ORIGINS = new Set([
  "http://localhost:3000",
  "https://lifecaddie.org",
  "https://www.lifecaddie.org"
]);

function corsHeaders(origin: string | null) {
  const allowOrigin = origin && ALLOWED_ORIGINS.has(origin) ? origin : "https://lifecaddie.org";
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "GET,OPTIONS",
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

export async function GET(req: Request) {
  try {
    const origin = req.headers.get("origin") || "";
    const ua = req.headers.get("user-agent") || "unknown";

    const now = Math.floor(Date.now() / 1000);
    const exp = now + 10 * 60; // 10 minutes

    const token = await new SignJWT({
      uaHash: sha256Base64Url(ua),
      originHash: origin ? sha256Base64Url(origin) : "",
      nonce: crypto.randomBytes(16).toString("hex")
    })
      .setProtectedHeader({ alg: "HS256", typ: "JWT" })
      .setIssuedAt(now)
      .setExpirationTime(exp)
      .setIssuer("lifecaddie")
      .setAudience("lifecaddie-space-tool")
      .sign(getSecret());

    return NextResponse.json(
      { token, expires_in_seconds: exp - now },
      { headers: corsHeaders(req.headers.get("origin")) }
    );
  } catch (err) {
    console.error("session route error:", err);
    return NextResponse.json(
      { error: "Unable to create session token." },
      { status: 500, headers: corsHeaders(req.headers.get("origin")) }
    );
  }
}