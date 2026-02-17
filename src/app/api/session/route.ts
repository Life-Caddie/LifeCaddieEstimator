import { NextResponse } from "next/server";
import { SignJWT } from "jose";
import crypto from "crypto";
import { corsHeaders, handleOPTIONS, getSecret, sha256Base64Url } from "../toolkit";

export const runtime = "nodejs";

export async function OPTIONS(req: Request) {
  return handleOPTIONS(req);
}

export async function GET(req: Request) {
  try {
    const origin = req.headers.get("origin") || "";
    const ua = req.headers.get("user-agent") || "unknown";

    const now = Math.floor(Date.now() / 1000);
    const exp = now + 10 * 60;

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
