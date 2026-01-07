"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

type Msg = { who: "bot" | "user"; text: string };

const INTENTIONS = [
  { value: "moving", label: "Moving", sub: "Pack + decide what comes" },
  { value: "prepping_to_downsize", label: "Prepping to downsize", sub: "Right-size for next chapter" },
  { value: "reset", label: "Reset", sub: "Calm + functional refresh" },
  { value: "staging", label: "Staging", sub: "Make it show-ready" },
  { value: "caregiving", label: "Caregiving", sub: "Make care easier" },
  { value: "other", label: "Other", sub: "Something else" },
] as const;

const FEELINGS = [
  { value: "overwhelmed", label: "Overwhelmed", sub: "Too much to hold" },
  { value: "excited", label: "Excited", sub: "Ready to begin" },
  { value: "sad", label: "Sad", sub: "Tender transition" },
  { value: "motivated", label: "Motivated", sub: "Let’s make progress" },
  { value: "other", label: "Other", sub: "Mixed / unsure" },
] as const;

function formatMB(bytes: number) {
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

export default function SpaceClarityTool() {
  const [intention, setIntention] = useState<string>("");
  const [feeling, setFeeling] = useState<string>("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [previewMeta, setPreviewMeta] = useState<string>("");
  const [imgWarn, setImgWarn] = useState<string>("");

  const [busy, setBusy] = useState(false);
  const [connBadge, setConnBadge] = useState<"Ready" | "Working…" | "Check connection">("Ready");

  const [messages, setMessages] = useState<Msg[]>([]);
  const [pills, setPills] = useState<string[]>([]);
  const [chatInput, setChatInput] = useState("");

  // honeypot: bots sometimes fill hidden fields
  const [websiteHp, setWebsiteHp] = useState("");

  const chatlogRef = useRef<HTMLDivElement | null>(null);

  const apiBase = useMemo(() => {
    // In dev, this page and the API are same origin.
    // In production, if you host API elsewhere, switch to: "https://api.lifecaddie.org"
    return "";
  }, []);

  function addMessage(text: string, who: "bot" | "user" = "bot") {
    setMessages((prev) => [...prev, { who, text }]);
  }

  // initial welcome
  useEffect(() => {
    setMessages([
      {
        who: "bot",
        text:
          "Hi — I’m your Life Caddie.\n\nUpload a photo and tap the two options. I’ll give you a gentle first-step plan that matches your intention and how you’re feeling.",
      },
    ]);
  }, []);

  // autoscroll chat
  useEffect(() => {
    if (!chatlogRef.current) return;
    chatlogRef.current.scrollTop = chatlogRef.current.scrollHeight;
  }, [messages, pills]);

  // manage preview URL lifecycle
  useEffect(() => {
    if (!photo) {
      setPreviewUrl("");
      setPreviewMeta("");
      setImgWarn("");
      return;
    }
    const url = URL.createObjectURL(photo);
    setPreviewUrl(url);
    setPreviewMeta(`${photo.name} • ${formatMB(photo.size)}`);

    if (!photo.type.startsWith("image/")) {
      setImgWarn("Please choose an image file.");
    } else if (photo.size > 5_000_000) {
      setImgWarn(
        "This photo is over 5MB. On phones, smaller images upload more reliably. If possible, use a lower-resolution photo."
      );
    } else {
      setImgWarn("");
    }

    return () => URL.revokeObjectURL(url);
  }, [photo]);

  async function getSessionToken() {
    const r = await fetch(`${apiBase}/api/session`, { method: "GET" });
    if (!r.ok) throw new Error("Session token request failed");
    const data = await r.json();
    if (!data.token) throw new Error("No session token returned");
    return data.token as string;
  }

  async function converse(messages: Msg[]) {
    const token = await getSessionToken();
    const fd = new FormData();
    fd.append("chat_history", JSON.stringify(messages));

    const resp = await fetch(`${apiBase}/api/conversation`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: fd,
    });

    if (resp.status === 401) throw new Error("Unauthorized (session invalid/expired).");
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error(err.error || `Conversation failed (${resp.status}).`);
    }

    return (await resp.json()) as { messages?: string[]; quick_actions?: string[] };
  }

  async function analyzeSpace(file: File, intentionVal: string, feelingVal: string, messages: Msg[]) {
    // if honeypot filled, quietly return a harmless response
    if ((websiteHp || "").trim()) {
      return {
        messages: [
          "Thanks — I’ve got you.\n\nYour first 10-minute step: choose ONE small zone (one shelf, one drawer, one counter corner). Remove anything that obviously doesn’t belong, then put back only what supports that zone’s purpose.",
        ],
        quick_actions: [],
      };
    }

    const token = await getSessionToken();
    const fd = new FormData();
    fd.append("photo", file);
    fd.append("intention", intentionVal);
    fd.append("feeling", feelingVal);
    fd.append("chat_history", JSON.stringify(messages));

    const resp = await fetch(`${apiBase}/api/analyze`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: fd,
    });

    if (resp.status === 401) throw new Error("Unauthorized (session invalid/expired).");
    if (resp.status === 413) {
      const err = await resp.json().catch(() => ({}));
      throw new Error(err.error || "Photo too large. Please use a smaller image.");
    }
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error(err.error || `Analyze failed (${resp.status}).`);
    }

    return (await resp.json()) as { messages?: string[]; quick_actions?: string[] };
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!photo) {
      addMessage("Please upload a photo first (any angle is fine).", "bot");
      return;
    }
    if (!intention) {
      addMessage("Please choose an intention (tap one of the options).", "bot");
      return;
    }
    if (!feeling) {
      addMessage("Please choose how the space is making you feel (tap one option).", "bot");
      return;
    }

    const iLabel = INTENTIONS.find((x) => x.value === intention)?.label ?? intention;
    const fLabel = FEELINGS.find((x) => x.value === feeling)?.label ?? feeling;

    const userMsg = `Photo uploaded.\nIntention: ${iLabel}\nFeeling: ${fLabel}`;
    const updatedMessages = [...messages, { who: "user", text: userMsg } as Msg];
    setMessages(updatedMessages);

    setBusy(true);
    setConnBadge("Working…");
    setPills([]);
    const thinkingId = crypto.randomUUID();

    // show temporary thinking bubble
    setMessages((prev) => [...prev, { who: "bot", text: "Uploading and analyzing…", } as Msg]);

    try {
      const result = await analyzeSpace(photo, intention, feeling, updatedMessages);

      // remove the last thinking bubble (simple approach)
      setMessages((prev) => {
        const copy = [...prev];
        // remove last message if it's the thinking text
        if (copy.length && copy[copy.length - 1].who === "bot" && copy[copy.length - 1].text === "Uploading and analyzing…") {
          copy.pop();
        }
        return copy;
      });

      const outMsgs = Array.isArray(result.messages) ? result.messages.slice(0, 6) : [];
      const outPills = Array.isArray(result.quick_actions) ? result.quick_actions.slice(0, 6) : [];

      outMsgs.forEach((m) => addMessage(String(m), "bot"));
      setPills(outPills);

      addMessage(
        "If you want to tailor the next step, add one detail below (for example: what kind of space this is).",
        "bot"
      );

      setConnBadge("Ready");
    } catch (err) {
      console.error(err);

      // replace thinking with error text
      setMessages((prev) => {
        const copy = [...prev];
        if (copy.length && copy[copy.length - 1].who === "bot" && copy[copy.length - 1].text === "Uploading and analyzing…") {
          copy[copy.length - 1] =
            { who: "bot", text: "I couldn’t generate your plan right now.\n\nTry again with a smaller photo, or check your connection." };
        } else {
          copy.push({ who: "bot", text: "I couldn’t generate your plan right now.\n\nTry again with a smaller photo, or check your connection." });
        }
        return copy;
      });

      setConnBadge("Check connection");
    } finally {
      setBusy(false);
    }
  }

  function onReset() {
    setIntention("");
    setFeeling("");
    setPhoto(null);
    setPreviewUrl("");
    setPreviewMeta("");
    setImgWarn("");
    setPills([]);
    setChatInput("");
    setConnBadge("Ready");
    setWebsiteHp("");
    setMessages([
      {
        who: "bot",
        text:
          "Hi — I’m your Life Caddie.\n\nUpload a photo and tap the two options. I’ll give you a gentle first-step plan that matches your intention and how you’re feeling.",
      },
    ]);
  }

  function onPrivacyNote() {
    addMessage(
      "Privacy note:\n• Start anonymous.\n• Only upload what you’re comfortable sharing.\n• Avoid including faces, mail, or personal documents.\n\n(When you publish this, add your exact retention policy—e.g., auto-delete images after 24 hours.)",
      "bot"
    );
  }

  async function onSendChat() {
    const text = chatInput.trim();
    if (!text || busy) return;
    const updatedMessages = [...messages, { who: "user", text } as Msg];
    setMessages(updatedMessages);
    setChatInput("");

    setBusy(true);
    setConnBadge("Working…");

    // show temporary thinking bubble
    setMessages((prev) => [...prev, { who: "bot", text: "Thinking…", } as Msg]);

    try {
      const result = await converse(updatedMessages);

      // remove the last thinking bubble
      setMessages((prev) => {
        const copy = [...prev];
        if (copy.length && copy[copy.length - 1].who === "bot" && copy[copy.length - 1].text === "Thinking…") {
          copy.pop();
        }
        return copy;
      });

      const outMsgs = Array.isArray(result.messages) ? result.messages.slice(0, 3) : [];
      const outPills = Array.isArray(result.quick_actions) ? result.quick_actions.slice(0, 3) : [];

      outMsgs.forEach((m) => addMessage(String(m), "bot"));
      setPills(outPills);

      setConnBadge("Ready");
    } catch (err) {
      console.error(err);

      // replace thinking with error text
      setMessages((prev) => {
        const copy = [...prev];
        if (copy.length && copy[copy.length - 1].who === "bot" && copy[copy.length - 1].text === "Thinking…") {
          copy[copy.length - 1] =
            { who: "bot", text: "I couldn’t respond right now. Try again or check your connection." };
        } else {
          copy.push({ who: "bot", text: "I couldn’t respond right now. Try again or check your connection." });
        }
        return copy;
      });

      setConnBadge("Check connection");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={styles.wrap}>
      <div style={styles.grid}>
        {/* LEFT: intake */}
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <h2 style={styles.h2}>Upload + 2 quick questions</h2>
            <span style={styles.badge}>Anonymous to start</span>
          </div>

          <div style={styles.cardBody}>
            <form onSubmit={onSubmit}>
              {/* Honeypot */}
              <div style={styles.hp}>
                <label>Leave this blank</label>
                <input value={websiteHp} onChange={(e) => setWebsiteHp(e.target.value)} />
              </div>

              <label style={styles.label} htmlFor="photo">Upload a photo of your space</label>
              <input
                id="photo"
                type="file"
                accept="image/*"
                // @ts-ignore: capture is valid on input but not in TS dom types
                capture="environment"
                disabled={busy}
                style={styles.file}
                onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
              />

              {previewUrl ? (
                <div style={styles.preview}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={previewUrl} alt="Selected photo preview" style={styles.previewImg} />
                  <div style={styles.small}>{previewMeta}</div>
                </div>
              ) : null}

              {imgWarn ? <div style={styles.warn}>{imgWarn}</div> : null}

              <label style={styles.label}>1) Intention</label>
              <select
                value={intention}
                onChange={(e) => setIntention(e.target.value)}
                disabled={busy}
                aria-label="Intention"
                style={styles.select}
              >
                <option value="">Choose an intention</option>
                {INTENTIONS.map((x) => (
                  <option key={x.value} value={x.value} title={x.sub}>
                    {x.label}
                  </option>
                ))}
              </select>

              <label style={styles.label}>2) How the space is making me feel</label>
              <select
                value={feeling}
                onChange={(e) => setFeeling(e.target.value)}
                disabled={busy}
                aria-label="Feeling"
                style={styles.select}
              >
                <option value="">Choose how the space makes you feel</option>
                {FEELINGS.map((x) => (
                  <option key={x.value} value={x.value} title={x.sub}>
                    {x.label}
                  </option>
                ))}
              </select>

              <div style={styles.stickyBar}>
                <button type="submit" disabled={busy} style={{ ...styles.btn, ...(busy ? styles.btnDisabled : {}) }}>
                  Get my Clarity Plan
                </button>

                <div style={styles.rowBtns}>
                  <button type="button" onClick={onReset} disabled={busy} style={styles.btnSecondary}>
                    Reset
                  </button>
                  <button type="button" onClick={onPrivacyNote} disabled={busy} style={styles.btnSecondary}>
                    Privacy note
                  </button>
                </div>

                <div style={styles.hint}>
                  You’ll get a short, gentle plan first. If you want to save it or go deeper, you can share details later.
                </div>
              </div>
            </form>
          </div>
        </div>

        {/* RIGHT: chat */}
        <div style={{ ...styles.card, background: "#f6f7f9" }}>
          <div style={styles.cardHeader}>
            <h2 style={styles.h2}>Your Life Caddie Plan</h2>
            <span style={styles.badge}>{connBadge}</span>
          </div>

          <div ref={chatlogRef} style={styles.chatlog} aria-live="polite">
            {messages.map((m, idx) => (
              <div
                key={idx}
                style={{
                  ...styles.msg,
                  ...(m.who === "user" ? styles.msgUser : styles.msgBot),
                }}
              >
                {m.text}
              </div>
            ))}
          </div>

          {pills.length ? (
            <div style={styles.pillRow}>
              {pills.map((p, i) => (
                <button
                  key={`${p}-${i}`}
                  type="button"
                  style={styles.pill}
                  disabled={busy}
                  onClick={() => {
                    addMessage(p, "user");
                    addMessage("Got it. If you’d like, add one detail below and I’ll tailor the next step.", "bot");
                  }}
                >
                  {p}
                </button>
              ))}
            </div>
          ) : null}

          <div style={styles.chatBar}>
            <input
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  onSendChat();
                }
              }}
              disabled={busy}
              placeholder='Optional: add one detail (e.g., “this is my pantry”)…'
              style={styles.chatInput}
            />
            <button type="button" onClick={onSendChat} disabled={busy} style={{ ...styles.btn, width: "auto" }}>
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Inline styles keep this self-contained (no extra CSS files needed right now)
const styles: Record<string, React.CSSProperties> = {
  wrap: { maxWidth: 960, margin: "0 auto", padding: 16, fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif" },
  grid: { display: "grid", gridTemplateColumns: "1fr 1.15fr", gap: 14, alignItems: "start" },

  card: { border: "1px solid #e5e7eb", borderRadius: 16, background: "#fff", overflow: "hidden", boxShadow: "0 1px 0 rgba(17,24,39,0.03)" },
  cardHeader: { padding: "14px 14px 10px", borderBottom: "1px solid #e5e7eb", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 },
  cardBody: { padding: 14 },
  h2: { margin: 0, fontSize: 15 },
  badge: { fontSize: 12, color: "#6b7280", border: "1px solid #e5e7eb", padding: "4px 10px", borderRadius: 999, background: "#fff" },

  label: { display: "block", fontSize: 13, color: "#6b7280", margin: "12px 0 6px" },
  file: { width: "100%", border: "1px dashed #e5e7eb", padding: "14px 12px", borderRadius: 14, background: "#f6f7f9", fontSize: 14 },

  preview: { marginTop: 10, border: "1px solid #e5e7eb", borderRadius: 14, padding: 10, background: "#fafafa" },
  previewImg: { width: "100%", borderRadius: 12, display: "block" },
  small: { fontSize: 12, color: "#6b7280", marginTop: 6 },

  warn: { marginTop: 10, padding: "10px 12px", borderRadius: 14, background: "#fff7ed", border: "1px solid #fed7aa", color: "#9a3412", fontSize: 13, lineHeight: 1.35 },

  choiceGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 },
  choice: {
    border: "1px solid #e5e7eb",
    borderRadius: 14,
    background: "#fff",
    padding: 12,
    textAlign: "left",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    minHeight: 48,
  },
  choiceSelected: { borderColor: "#111827", boxShadow: "0 0 0 2px rgba(17,24,39,.08) inset", background: "#fbfbfb" },
  choiceTitle: { fontWeight: 650, fontSize: 14 },
  choiceSub: { fontSize: 12, color: "#6b7280" },
  dot: { width: 14, height: 14, borderRadius: 999, border: "2px solid #e5e7eb", flex: "0 0 auto" },
  dotSelected: { borderColor: "#111827", background: "#111827" },

  stickyBar: {
    position: "sticky",
    bottom: 0,
    background: "linear-gradient(to top, rgba(255,255,255,0.98), rgba(255,255,255,0.80))",
    paddingTop: 10,
    marginTop: 10,
  },

  btn: { width: "100%", border: "none", background: "#111827", color: "#fff", fontWeight: 700, padding: "12px 14px", borderRadius: 14, cursor: "pointer", fontSize: 15 },
  btnDisabled: { opacity: 0.55, cursor: "not-allowed" },
  btnSecondary: { width: "100%", background: "#fff", color: "#111827", border: "1px solid #e5e7eb", fontWeight: 700, padding: "12px 14px", borderRadius: 14, cursor: "pointer", fontSize: 15 },
  rowBtns: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 10 },

  hint: { fontSize: 12, color: "#6b7280", marginTop: 10, lineHeight: 1.35 },

  chatlog: { padding: 14, display: "flex", flexDirection: "column", gap: 10, height: 540, overflow: "auto" },
  msg: { maxWidth: "92%", border: "1px solid #e5e7eb", borderRadius: 16, padding: "10px 12px", background: "#fff", lineHeight: 1.35, whiteSpace: "pre-wrap", fontSize: 14 },
  msgUser: { alignSelf: "flex-end", background: "#111827", color: "#fff", borderColor: "#111827" },
  msgBot: { alignSelf: "flex-start" },

  pillRow: { display: "flex", gap: 8, flexWrap: "wrap", padding: "0 14px 14px" },
  pill: { fontSize: 12, border: "1px solid #e5e7eb", background: "#fff", borderRadius: 999, padding: "7px 10px", cursor: "pointer" },

  chatBar: { borderTop: "1px solid #e5e7eb", background: "#fff", padding: 10, display: "flex", gap: 10, alignItems: "center" },
  chatInput: { flex: 1, border: "1px solid #e5e7eb", borderRadius: 14, padding: "10px 12px", fontSize: 14 },
  select: { width: "100%", border: "1px solid #e5e7eb", borderRadius: 14, padding: "10px 12px", fontSize: 14, background: "#fff" },

  hp: { position: "absolute", left: -9999, width: 1, height: 1, overflow: "hidden" },
};

// Responsive layout tweaks (without CSS files)
// Next.js doesn’t allow media queries in inline styles, so we do a simple runtime tweak:
if (typeof window !== "undefined") {
  const mq = window.matchMedia("(max-width: 920px)");
  const apply = () => {
    // @ts-ignore
    styles.grid.gridTemplateColumns = mq.matches ? "1fr" : "1fr 1.15fr";
    // @ts-ignore
    styles.chatlog.height = mq.matches ? 420 : 540;
    // @ts-ignore
    styles.choiceGrid.gridTemplateColumns = window.matchMedia("(max-width: 420px)").matches ? "1fr" : "1fr 1fr";
    // @ts-ignore
    styles.rowBtns.gridTemplateColumns = window.matchMedia("(max-width: 420px)").matches ? "1fr" : "1fr 1fr";
  };
  apply();
  mq.addEventListener?.("change", apply);
}