import { NextResponse } from "next/server";
import OpenAI from "openai";
import crypto from "crypto";
import { corsHeaders, handleOPTIONS, verifySession, safeJsonParse, SERVICES_LIST } from "../toolkit";
import { uploadImage } from "../../../lib/azureStorage";
import { ALLOWED_GOAL_VALUES, ALLOWED_FEELING_VALUES } from "../../../constants/intake";
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
    const form = await req.formData();

    const goal = String(form.get("goal") || "").trim();
    const feeling = String(form.get("feeling") || "").trim();
    const photo = form.get("photo");
    const chatHistoryRaw = String(form.get("chat_history") || "").trim();
    const chatHistory = chatHistoryRaw ? safeJsonParse(chatHistoryRaw) || [] : [];

    if (!goal || !feeling || !photo) {
      return NextResponse.json(
        { error: "Missing required fields (photo, goal, feeling)." },
        { status: 400, headers: corsHeaders(origin) }
      );
    }
    if (!ALLOWED_GOAL_VALUES.includes(goal) || !ALLOWED_FEELING_VALUES.includes(feeling)) {
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

    const arrayBuffer = await photo.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");
    const dataUrl = `data:${mime};base64,${base64}`;

    // Upload photo to Azure — hoist blobName so we can track it in files table
    const imageContainer = process.env.AZURE_STORAGE_CONTAINER_IMAGES;
    const storageAccount = process.env.AZURE_STORAGE_ACCOUNT_NAME || "lcclaritydevstor";
    let photoBlobName: string | null = null;

    if (imageContainer) {
      try {
        photoBlobName = `${Date.now()}-${crypto.randomUUID()}-${photo.name}`;
        const buf = Buffer.from(arrayBuffer);
        await uploadImage(imageContainer, photoBlobName, buf, mime);
      } catch (err) {
        console.error("azure photo upload failed:", err);
        photoBlobName = null;
      }
    }

    const instructions = `
You are a calm, non-judgmental downsizing & organizing guide for 'Life Caddie'.

User inputs:
- goal: ${goal}
- Feeling: ${feeling}

Chat History:
${chatHistory.map((msg: { who: string; text: string }) => `${msg.who}: ${msg.text}`).join('\n')}

Available Life Caddie Services:
${SERVICES_LIST}

Return STRICT JSON ONLY:
{
  "task": string,              // 1-2 sentences: validate the user's feelings and briefly acknowledge what you see in the photo.
  "follow_up_question": string // 1 sentence: ask ONE clarifying question designed to narrow down which Life Caddie service(s) best fit the user's situation. The question should help distinguish between service categories (e.g., do they need hands-on help vs. a plan, are they on a timeline, is this emotional or logistical, etc.).
}

Rules:
- Kind, no shame.
- Start by validating the user's feelings in 1-2 sentences.
- If safety hazards appear in the photo, mention gently.
- Ask exactly ONE clarifying question. The question must help align the user toward specific Life Caddie services.
- Do NOT recommend services yet — just ask the one question.
- Do NOT provide a task or action step. The goal is to understand the user's needs before recommending.
`.trim();

    const resp = await openai.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
      instructions,
      input: [
        {
          role: "user",
          content: [
            { type: "input_text", text: "Analyze this space photo and provide a validation of the user's feelings along with one clarifying question." },
            { type: "input_image", image_url: dataUrl, detail: "auto" }
          ]
        }
      ],
      max_output_tokens: 650,
      store: false
    });

    const raw = resp.output_text || "";
    const parsed = safeJsonParse(raw);

    const task = parsed?.task || "";
    const followUpQuestion = parsed?.follow_up_question || "";

    if (!task || !followUpQuestion) {
      return NextResponse.json(
        {
          task: "Thanks for sharing that — I can see this space has a lot going on, and it makes sense that you're feeling that way.",
          follow_up_question: "Are you looking more for a structured plan to follow on your own, or would hands-on support from someone alongside you feel more helpful right now?"
        },
        { headers: corsHeaders(origin) }
      );
    }

    // --- Supabase: persist session, lead, files, and ai_artifacts ---
    let leadId: string | null = null;
    let sessionId: string | null = null;
    try {
      const clientToken = String(form.get("client_token") || "").trim();
      const locale = String(form.get("locale") || "").trim();
      const timezone = String(form.get("timezone") || "").trim();
      const ua = req.headers.get("user-agent") || "";
      const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "";
      const ipHash = ip ? crypto.createHash("sha256").update(ip).digest("hex") : null;
      const model = process.env.OPENAI_MODEL || "gpt-4.1-mini";

      const db = supabaseServer();

      // 1. Upsert lead_session
      if (clientToken) {
        const { data: sessionRow, error: sessionErr } = await db
          .from("lead_sessions")
          .upsert(
            {
              client_token: clientToken,
              user_agent: ua || null,
              ip_hash: ipHash,
              locale: locale || null,
              timezone: timezone || null,
              last_seen_at: new Date().toISOString(),
            },
            { onConflict: "client_token" }
          )
          .select("id")
          .single();

        if (sessionErr) {
          console.error("lead_sessions upsert error:", sessionErr);
        } else {
          sessionId = sessionRow?.id ?? null;
        }
      }

      // 2. Insert lead
      const { data: leadRow, error: leadErr } = await db
        .from("leads")
        .insert({
          lead_session_id: sessionId,
          intake_intention: goal,
          intake_feeling: feeling,
        })
        .select("id")
        .single();

      if (leadErr) {
        console.error("leads insert error:", leadErr);
      } else {
        leadId = leadRow?.id ?? null;
      }

      // 3. Insert files record for the intake photo
      let photoFileId: string | null = null;
      if (photoBlobName && imageContainer && leadId) {
        const { data: photoFileRow, error: photoFileErr } = await db
          .from("files")
          .insert({
            lead_session_id: sessionId,
            lead_id: leadId,
            file_type: "room_image",
            storage_account: storageAccount,
            container: imageContainer,
            blob_path: photoBlobName,
            content_type: mime,
            byte_size: photo.size,
            is_intake_photo: true,
          })
          .select("id")
          .single();

        if (photoFileErr) {
          console.error("files (photo) insert error:", photoFileErr);
        } else {
          photoFileId = photoFileRow?.id ?? null;
        }
      }

      // 4. Upload AI response as JSON to Azure transcript container
      const transcriptContainer = process.env.AZURE_STORAGE_CONTAINER_TRANSCRIPTS;
      let transcriptFileId: string | null = null;

      if (transcriptContainer && leadId) {
        const transcriptPayload = JSON.stringify({
          goal,
          feeling,
          task,
          follow_up_question: followUpQuestion,
          model,
          created_at: new Date().toISOString(),
        });
        const transcriptBuf = Buffer.from(transcriptPayload, "utf-8");
        const transcriptBlobName = `clarity-plan-${leadId}.json`;

        try {
          await uploadImage(transcriptContainer, transcriptBlobName, transcriptBuf, "application/json");

          // 5. Insert files record for the transcript JSON
          const { data: transcriptFileRow, error: transcriptFileErr } = await db
            .from("files")
            .insert({
              lead_session_id: sessionId,
              lead_id: leadId,
              file_type: "transcript",
              storage_account: storageAccount,
              container: transcriptContainer,
              blob_path: transcriptBlobName,
              content_type: "application/json",
              byte_size: transcriptBuf.byteLength,
              transcript_format: "json",
              transcript_version: 1,
            })
            .select("id")
            .single();

          if (transcriptFileErr) {
            console.error("files (transcript) insert error:", transcriptFileErr);
          } else {
            transcriptFileId = transcriptFileRow?.id ?? null;
          }
        } catch (uploadErr) {
          console.error("azure transcript upload failed:", uploadErr);
        }
      }

      // 6. Insert ai_artifacts record — source_file_id → photo, data links to transcript file
      if (leadId) {
        const { error: artifactErr } = await db.from("ai_artifacts").insert({
          lead_session_id: sessionId,
          lead_id: leadId,
          source_file_id: photoFileId,
          artifact_type: "clarity_plan",
          version: 1,
          is_current: true,
          provider: "openai",
          model,
          text: task,
          data: {
            task,
            follow_up_question: followUpQuestion,
            transcript_file_id: transcriptFileId,
          },
        });

        if (artifactErr) {
          console.error("ai_artifacts insert error:", artifactErr);
        }
      }
    } catch (dbErr) {
      console.error("DB write failed (non-fatal):", dbErr);
    }
    // --- end Supabase ---

    return NextResponse.json(
      { task, follow_up_question: followUpQuestion, leadId, sessionId },
      { headers: corsHeaders(origin) }
    );
  } catch (err) {
    console.error("analyze route error:", err);
    return NextResponse.json(
      { error: "Server error while analyzing the image." },
      { status: 500, headers: corsHeaders(origin) }
    );
  }
}
