import { NextResponse } from "next/server";
import OpenAI from "openai";
import { corsHeaders, handleOPTIONS, verifySession, safeJsonParse } from "../toolkit";
import { getConversationInstructions } from "./toneBuilder";
import { supabaseServer } from "../../../lib/supabase/server";

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
    const body = await req.json();

    const chatHistory = Array.isArray(body.chat_history) ? body.chat_history : [];
    const contextGathered = body.context_gathered === true;
    const sessionId: string | null = typeof body.session_id === "string" ? body.session_id : null;
    const leadId: string | null = typeof body.lead_id === "string" ? body.lead_id : null;
    const isPillSelection: boolean = body.is_pill_selection === true;
    const isPostCalendly: boolean = body.is_post_calendly === true;

    if (!chatHistory.length) {
      return NextResponse.json(
        { error: "Invalid or missing chat history." },
        { status: 400, headers: corsHeaders(origin) }
      );
    }

    const userMessageCount = chatHistory.filter((msg: any) => msg.who === "user").length;
    const instructions = getConversationInstructions(chatHistory, userMessageCount, contextGathered, isPostCalendly);

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

    const rawMessages = Array.isArray(parsed?.messages) ? parsed.messages.slice(0, 3) : [];
    const messages = rawMessages.map((m: string) =>
      typeof m === "string" ? m.replace(/, or /gi, ",\n\nor ") : m
    );
    const quickActions = Array.isArray(parsed?.quick_actions) ? parsed.quick_actions.slice(0, 3) : [];
    const resultContextGathered = typeof parsed?.context_gathered === "boolean" ? parsed.context_gathered : false;

    if (!messages.length) {
      return NextResponse.json(
        {
          messages: ["Thanks for sharing that. I'm here to help with your organizing journey."],
          quick_actions: [],
          context_gathered: false
        },
        { headers: corsHeaders(origin) }
      );
    }

    // --- Supabase: persist artifact on pill selection only ---
    if (isPillSelection && leadId) {
      try {
        const db = supabaseServer();
        const model = process.env.OPENAI_MODEL || "gpt-4.1-mini";
        const latestBotText = messages[0] ?? "";
        const summary = latestBotText.slice(0, 500);

        // Get current max version for this lead
        const { data: versionRows } = await db
          .from("ai_artifacts")
          .select("version")
          .eq("lead_id", leadId)
          .order("version", { ascending: false })
          .limit(1);

        const nextVersion = versionRows && versionRows.length > 0
          ? (versionRows[0].version as number) + 1
          : 1;

        // Mark all prior versions stale
        await db
          .from("ai_artifacts")
          .update({ is_current: false })
          .eq("lead_id", leadId);

        // Insert new artifact with full conversation snapshot
        const { error: artifactErr } = await db.from("ai_artifacts").insert({
          lead_session_id: sessionId,
          lead_id: leadId,
          artifact_type: "clarity_plan",
          version: nextVersion,
          is_current: true,
          provider: "openai",
          model,
          text: latestBotText,
          data: {
            messages,
            quick_actions: quickActions,
            context_gathered: resultContextGathered,
            full_history: chatHistory,
          },
        });

        if (artifactErr) {
          console.error("ai_artifacts insert error:", artifactErr);
        }

        // Update lead summary
        const { error: leadErr } = await db
          .from("leads")
          .update({ clarity_plan_summary: summary })
          .eq("id", leadId);

        if (leadErr) {
          console.error("leads summary update error:", leadErr);
        }
      } catch (dbErr) {
        console.error("DB write failed (non-fatal):", dbErr);
      }
    }
    // --- end Supabase ---

    return NextResponse.json(
      { messages, quick_actions: quickActions, context_gathered: resultContextGathered },
      { headers: corsHeaders(origin) }
    );
  } catch (err) {
    console.error("conversation route error:", err);
    return NextResponse.json(
      { error: "Server error while processing conversation." },
      { status: 500, headers: corsHeaders(origin) }
    );
  }
}
