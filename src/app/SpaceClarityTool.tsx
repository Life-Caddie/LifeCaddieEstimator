"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { GoogleSignInButton } from "../components/auth/GoogleSignInButton";
import { UserMenu } from "../components/auth/UserMenu";
import CalendarButton from "../components/CalendarButton";
import { supabaseBrowser } from "../lib/supabase/browser";
import '../styles/SpaceClarityTool.css';

const supabase = {
  auth: {
    // Minimal client-side fallback to avoid requiring ../lib/supabaseClient during build.
    // This attempts a simple redirect if a redirect URL is provided; adjust to your auth flow.
    signInWithOAuth: async ({ provider, options }: { provider: string; options?: { redirectTo?: string } }) => {
      if (typeof window === "undefined") {
        return { error: new Error("Supabase auth unavailable on server") };
      }
      try {
        if (options?.redirectTo) {
          window.location.href = options.redirectTo;
        } else {
          // Fallback: navigate to root (replace with your auth entry if available)
          window.location.href = window.location.origin;
        }
        return { error: null };
      } catch (err) {
        return { error: err as Error };
      }
    },
  },
};

type Msg = { who: "bot" | "user"; text: string };

const GOALS = [
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
  const [goal, setgoal] = useState<string>("");
  const [feeling, setFeeling] = useState<string>("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [previewMeta, setPreviewMeta] = useState<string>("");
  const [imgWarn, setImgWarn] = useState<string>("");

  const [busy, setBusy] = useState(false);
  const [connBadge, setConnBadge] = useState<"Ready" | "Working…" | "Check connection">("Ready");
  const [submitted, setSubmitted] = useState(false);

  const [messages, setMessages] = useState<Msg[]>([]);
  const [pills, setPills] = useState<string[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [context_gathered, setContext_gathered] = useState(false);

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
          "Hi — I’m your Life Caddie.\n\nUpload a photo and tap the two options. I’ll give you a gentle first-step plan that matches your goal and how you’re feeling.",
      },
    ]);
  }, []);

  useEffect(() => {
    if (!chatlogRef.current) return;
    chatlogRef.current.scrollTop = chatlogRef.current.scrollHeight;
  }, [messages, pills]);

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

  // Track auth state to show UserMenu vs Sign-in button
  useEffect(() => {
    const supabase = supabaseBrowser();

    supabase.auth.getUser().then(({ data }) => {
      setUserEmail(data.user?.email ?? null);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserEmail(session?.user?.email ?? null);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  async function getSessionToken() {
    const r = await fetch(`${apiBase}/api/session`, { method: "GET" });
    if (!r.ok) throw new Error("Session token request failed");
    const data = await r.json();
    if (!data.token) throw new Error("No session token returned");
    return data.token as string;
  }

  async function converse(messages: Msg[], contextGathered: boolean) {
    const token = await getSessionToken();
    const fd = new FormData();
    fd.append("chat_history", JSON.stringify(messages));
    fd.append("context_gathered", String(contextGathered));

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

    return (await resp.json()) as { messages?: string[]; quick_actions?: string[]; context_gathered?: boolean };
  }

  async function analyzeSpace(file: File, goalVal: string, feelingVal: string, messages: Msg[]) {
    // if honeypot filled, quietly return a harmless response
    if ((websiteHp || "").trim()) {
      return {
        task: "Choose ONE small zone (one shelf, one drawer, or one counter corner). Remove anything that obviously doesn't belong.",
        follow_up_question: "What kind of space is this—kitchen, closet, bedroom, office, or something else?",
      };
    }

    const token = await getSessionToken();
    const fd = new FormData();
    fd.append("photo", file);
    fd.append("goal", goalVal);
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

    return (await resp.json()) as { task?: string; follow_up_question?: string };
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!photo) {
      addMessage("Please upload a photo first (any angle is fine).", "bot");
      return;
    }
    if (!goal) {
      addMessage("Please choose an goal (tap one of the options).", "bot");
      return;
    }
    if (!feeling) {
      addMessage("Please choose how the space is making you feel (tap one option).", "bot");
      return;
    }

    const iLabel = GOALS.find((x) => x.value === goal)?.label ?? goal;
    const fLabel = FEELINGS.find((x) => x.value === feeling)?.label ?? feeling;

    const userMsg = `Photo uploaded.\nGoal: ${iLabel}\nFeeling: ${fLabel}`;
    const updatedMessages = [...messages, { who: "user", text: userMsg } as Msg];
    setMessages(updatedMessages);

    setSubmitted(true);
    setBusy(true);
    setConnBadge("Working…");
    setPills([]);
    const thinkingId = crypto.randomUUID();

    setMessages((prev) => [...prev, { who: "bot", text: "Uploading and analyzing…", } as Msg]);

    try {
      const result = await analyzeSpace(photo, goal, feeling, updatedMessages);

      setMessages((prev) => {
        const copy = [...prev];
        if (copy.length && copy[copy.length - 1].who === "bot" && copy[copy.length - 1].text === "Uploading and analyzing…") {
          copy.pop();
        }
        return copy;
      });

      if (result.task && result.follow_up_question) {
        addMessage(result.task, "bot");
        addMessage(result.follow_up_question, "bot");
      }


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
    setgoal("");
    setFeeling("");
    setPhoto(null);
    setPreviewUrl("");
    setPreviewMeta("");
    setImgWarn("");
    setPills([]);
    setChatInput("");
    setConnBadge("Ready");
    setWebsiteHp("");
    setSubmitted(false);
    setMessages([
      {
        who: "bot",
        text:
          "Hi — I’m your Life Caddie.\n\nUpload a photo and tap the two options. I’ll give you a gentle first-step plan that matches your goal and how you’re feeling.",
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

    setMessages((prev) => [...prev, { who: "bot", text: "Thinking…", } as Msg]);

    try {
      const result = await converse(updatedMessages, context_gathered);

      setMessages((prev) => {
        const copy = [...prev];
        if (copy.length && copy[copy.length - 1].who === "bot" && copy[copy.length - 1].text === "Thinking…") {
          copy.pop();
        }
        return copy;
      });

      const outMsgs = Array.isArray(result.messages) ? result.messages.slice(0, 3) : [];
      const outPills = Array.isArray(result.quick_actions) ? result.quick_actions.slice(0, 3) : [];
      const outContextGathered = typeof result.context_gathered === "boolean" ? result.context_gathered : false;

      outMsgs.forEach((m) => addMessage(String(m), "bot"));
      if (outContextGathered) {
        setPills(["schedule_meeting", "learn_more"]);
      } else {
        setPills(outPills);
      }
      setContext_gathered(outContextGathered);

      setConnBadge("Ready");
    } catch (err) {
      console.error(err);

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
    <div className="wrap">
      <div className="grid">
        {!submitted ? (
          <div className="card card-primary">
          <div className="card-header">
            <h2 className="h2">Upload + 2 quick questions</h2>
            <div className="flex-row">
              {userEmail ? <UserMenu /> : <GoogleSignInButton />}
            </div>
          </div>

          <div className="card-body">
            <form onSubmit={onSubmit}>
              {/* Honeypot */}
              <div className="hp">
                <label>Leave this blank</label>
                <input value={websiteHp} onChange={(e) => setWebsiteHp(e.target.value)} />
              </div>

              <label className="label" htmlFor="photo">Upload a photo of your space</label>
              <input
                id="photo"
                type="file"
                accept="image/*"
                // @ts-ignore: capture is valid on input but not in TS dom types
                capture="environment"
                disabled={busy}
                className="file"
                onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
              />

              {previewUrl ? (
                <div className="preview">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={previewUrl} alt="Selected photo preview" className="preview-img" />
                  <div className="small">{previewMeta}</div>
                </div>
              ) : null}

              {imgWarn ? <div className="warn">{imgWarn}</div> : null}

              <label className="label">1) My goal for this space</label>
              <select
                value={goal}
                onChange={(e) => setgoal(e.target.value)}
                disabled={busy}
                aria-label="goal"
                className="select"
              >
                <option value="">Choose a goal</option>
                {GOALS.map((x) => (
                  <option key={x.value} value={x.value} title={x.sub}>
                    {x.label}
                  </option>
                ))}
              </select>

              <label className="label">2) How the space is making me feel</label>
              <select
                value={feeling}
                onChange={(e) => setFeeling(e.target.value)}
                disabled={busy}
                aria-label="Feeling"
                className="select"
              >
                <option value="">Choose how the space makes you feel</option>
                {FEELINGS.map((x) => (
                  <option key={x.value} value={x.value} title={x.sub}>
                    {x.label}
                  </option>
                ))}
              </select>

              <div className="sticky-bar">
                <button type="submit" disabled={busy} className={`btn ${busy ? "btn-disabled" : ""}`}>
                  Get my Clarity Plan
                </button>

                <div className="row-btns">
                  <button type="button" onClick={onReset} disabled={busy} className="btn-secondary">
                    Reset
                  </button>
                  <button type="button" onClick={onPrivacyNote} disabled={busy} className="btn-secondary">
                    Privacy note
                  </button>
                </div>

                <div className="hint">
                  You’ll get a short, gentle plan first. If you want to save it or go deeper, you can share details later.
                </div>
              </div>
            </form>
          </div>
        </div>
        ) : null}

        {submitted ? (
          <div className="card card-secondary">
          <div className="card-header">
            <h2 className="h2">Your Life Caddie Plan</h2>
            <span className="badge">{connBadge}</span>
          </div>

          <div ref={chatlogRef} className="chatlog" aria-live="polite">
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={`msg ${m.who === "user" ? "msg-user" : "msg-bot"}`}
              >
                {m.text}
              </div>
            ))}
          </div>

          {pills.length ? (
            <div className="pill-row">
              {pills.length === 2 && pills[0] === "schedule_meeting" && pills[1] === "learn_more" ? (
                <>
                  <CalendarButton
                    url="https://calendly.com/lifecaddie/consultation"
                    text="Schedule meeting"
                    disabled={busy}
                  />

                  <button
                    type="button"
                    className="pill"
                    disabled={busy}
                    onClick={() => {
                      if (busy) return;
                      window.open("https://www.lifecaddie.org/new-services-for-successful-and-amazing-results/", "_blank", "noopener");
                    }}
                  >
                    Learn more
                  </button>
                </>
              ) : (
                pills.map((p, i) => (
                  <button
                    key={`${p}-${i}`}
                    type="button"
                    className="pill"
                    disabled={busy}
                    onClick={async () => {
                      if (busy) return;
                      const updatedMessages = [...messages, { who: "user", text: p } as Msg];
                      setMessages(updatedMessages);

                      setBusy(true);
                      setConnBadge("Working…");

                      setMessages((prev) => [...prev, { who: "bot", text: "Thinking…", } as Msg]);

                      try {
                        const result = await converse(updatedMessages, context_gathered);

                        setMessages((prev) => {
                          const copy = [...prev];
                          if (copy.length && copy[copy.length - 1].who === "bot" && copy[copy.length - 1].text === "Thinking…") {
                            copy.pop();
                          }
                          return copy;
                        });

                        const outMsgs = Array.isArray(result.messages) ? result.messages.slice(0, 3) : [];
                        const outPills = Array.isArray(result.quick_actions) ? result.quick_actions.slice(0, 3) : [];
                        const outContextGathered = typeof result.context_gathered === "boolean" ? result.context_gathered : false;

                        outMsgs.forEach((m) => addMessage(String(m), "bot"));
                        if (outContextGathered) {
                          setPills(["schedule_meeting", "learn_more"]);
                        } else {
                          setPills(outPills);
                        }
                        setContext_gathered(outContextGathered);

                        setConnBadge("Ready");
                      } catch (err) {
                        console.error(err);

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
                    }}
                  >
                    {p}
                  </button>
                ))
              )}
            </div>
          ) : null}

          <div className="chat-bar">
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
              placeholder='Optional: add one detail (e.g., "this is my pantry")…'
              className="chat-input"
            />
            <button type="button" onClick={onSendChat} disabled={busy} className="btn" style={{ width: "auto" }}>
              Send
            </button>
          </div>
        </div>
        ) : null}
      </div>
    </div>
  );
}
