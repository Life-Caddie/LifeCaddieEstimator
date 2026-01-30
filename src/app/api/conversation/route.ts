import { NextResponse } from "next/server";
import OpenAI from "openai";
import { corsHeaders, handleOPTIONS, verifySession, safeJsonParse } from "../toolkit";
import { getConversationInstructions } from "./toneBuilder";

export const runtime = "nodejs";

const openai = new OpenAI({ apiKey: process.env.API_KEY });

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

    const chatHistoryRaw = String(form.get("chat_history") || "").trim();
    const chatHistory = chatHistoryRaw ? safeJsonParse(chatHistoryRaw) || [] : [];

    if (!Array.isArray(chatHistory) || !chatHistory.length) {
      return NextResponse.json(
        { error: "Invalid or missing chat history." },
        { status: 400, headers: corsHeaders(origin) }
      );
    }

    const userMessages = chatHistory.filter((msg: any) => msg.who === "user").length;
    const contextGatheredRaw = String(form.get("context_gathered") || "false").trim();
    const contextGathered = contextGatheredRaw === "true";
    
    // Get initial response to check if context has been gathered
    let instructions = getConversationInstructions(chatHistory, userMessages, contextGathered);

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
    const context_gathered = typeof parsed?.context_gathered === "boolean" ? parsed.context_gathered : false;

    if (!messages.length) {
      return NextResponse.json(
        {
          messages: [
            "Thanks for sharing that. I'm here to help with your organizing journey."
          ],
          quick_actions: [],
          context_gathered: false
        },
        { headers: corsHeaders(origin) }
      );
    }

    return NextResponse.json({ messages, quick_actions, context_gathered }, { headers: corsHeaders(origin) });
  } catch (err) {
    console.error("conversation route error:", err);
    return NextResponse.json(
      { error: "Server error while processing conversation." },
      { status: 500, headers: corsHeaders(origin) }
    );
  }
}