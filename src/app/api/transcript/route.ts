import { NextResponse } from "next/server";
import { corsHeaders, handleOPTIONS, verifySession } from "../toolkit";
import { uploadBlob } from "../../../lib/azureStorage";

export const runtime = "nodejs";

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
    const { chat_history } = await req.json();

    if (!Array.isArray(chat_history) || chat_history.length === 0) {
      return NextResponse.json(
        { error: "Missing or empty chat_history." },
        { status: 400, headers: corsHeaders(origin) }
      );
    }

    const container = process.env.AZURE_STORAGE_CONTAINER_TRANSCRIPTS;
    if (!container) {
      return NextResponse.json(
        { error: "Transcript storage not configured." },
        { status: 500, headers: corsHeaders(origin) }
      );
    }

    const blobName = `${Date.now()}-${crypto.randomUUID()}.json`;
    const data = Buffer.from(JSON.stringify(chat_history, null, 2));
    await uploadBlob(container, blobName, data, "application/json");

    return NextResponse.json({ ok: true }, { headers: corsHeaders(origin) });
  } catch (err) {
    console.error("transcript upload error:", err);
    return NextResponse.json(
      { error: "Server error while saving transcript." },
      { status: 500, headers: corsHeaders(origin) }
    );
  }
}
