"use client";

import React, { useState } from "react";
import { GoogleSignInButton } from "../components/auth/GoogleSignInButton";
import { UserMenu } from "../components/auth/UserMenu";
import IntakeForm from "../components/IntakeForm";
import ChatView from "../components/ChatView";
import { useAuthEmail } from "../hooks/useAuthEmail";
import { analyzeSpace, sendConversation, uploadTranscript } from "../lib/api";
import { GOALS, FEELINGS, WELCOME_MESSAGE } from "../constants/intake";
import type { ChatMessage } from "../lib/api";
import '../styles/SpaceClarityTool.css';

const PLACEHOLDER_ANALYZING = "Uploading and analyzing…";
const PLACEHOLDER_THINKING = "Thinking…";

function appendMessage(messages: ChatMessage[], text: string, who: ChatMessage["who"] = "bot"): ChatMessage[] {
  return [...messages, { who, text }];
}

function removeLastPlaceholder(messages: ChatMessage[], placeholder: string): ChatMessage[] {
  const copy = [...messages];
  if (copy.length && copy[copy.length - 1].who === "bot" && copy[copy.length - 1].text === placeholder) {
    copy.pop();
  }
  return copy;
}

function replaceLastPlaceholder(messages: ChatMessage[], placeholder: string, errorText: string): ChatMessage[] {
  const copy = [...messages];
  if (copy.length && copy[copy.length - 1].who === "bot" && copy[copy.length - 1].text === placeholder) {
    copy[copy.length - 1] = { who: "bot", text: errorText };
  } else {
    copy.push({ who: "bot", text: errorText });
  }
  return copy;
}

export default function SpaceClarityTool() {
  const [busy, setBusy] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<"Ready" | "Working…" | "Check connection">("Ready");
  const [submitted, setSubmitted] = useState(false);

  const [messages, setMessages] = useState<ChatMessage[]>([{ who: "bot", text: WELCOME_MESSAGE }]);
  const [pills, setPills] = useState<string[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [contextGathered, setContextGathered] = useState(false);

  const userEmail = useAuthEmail();

  async function handleConversation(userText: string) {
    if (busy) return;

    const withUserMsg = appendMessage(messages, userText, "user");
    setMessages(appendMessage(withUserMsg, PLACEHOLDER_THINKING));
    setBusy(true);
    setConnectionStatus("Working…");

    try {
      const result = await sendConversation(withUserMsg, contextGathered);

      setMessages((prev) => {
        let updated = removeLastPlaceholder(prev, PLACEHOLDER_THINKING);
        const outMessages = Array.isArray(result.messages) ? result.messages.slice(0, 3) : [];
        for (const m of outMessages) {
          updated = appendMessage(updated, String(m));
        }
        return updated;
      });

      setPills(Array.isArray(result.quick_actions) ? result.quick_actions.slice(0, 3) : []);
      setContextGathered(typeof result.context_gathered === "boolean" ? result.context_gathered : false);
      setConnectionStatus("Ready");
    } catch (err) {
      console.error(err);
      setMessages((prev) =>
        replaceLastPlaceholder(prev, PLACEHOLDER_THINKING, "I couldn't respond right now. Try again or check your connection.")
      );
      setConnectionStatus("Check connection");
    } finally {
      setBusy(false);
    }
  }

  async function handleSubmit(photo: File, goal: string, feeling: string) {
    const goalLabel = GOALS.find((x) => x.value === goal)?.label ?? goal;
    const feelingLabel = FEELINGS.find((x) => x.value === feeling)?.label ?? feeling;

    const userText = `Photo uploaded.\nGoal: ${goalLabel}\nFeeling: ${feelingLabel}`;
    const withUserMsg = appendMessage(messages, userText, "user");
    setMessages(appendMessage(withUserMsg, PLACEHOLDER_ANALYZING));

    setSubmitted(true);
    setBusy(true);
    setConnectionStatus("Working…");
    setPills([]);

    try {
      const result = await analyzeSpace(photo, goal, feeling, withUserMsg);

      setMessages((prev) => {
        let updated = removeLastPlaceholder(prev, PLACEHOLDER_ANALYZING);
        if (result.task && result.follow_up_question) {
          updated = appendMessage(updated, result.task);
          updated = appendMessage(updated, result.follow_up_question);
        }
        return updated;
      });

      setConnectionStatus("Ready");
    } catch (err) {
      console.error(err);
      setMessages((prev) =>
        replaceLastPlaceholder(
          prev,
          PLACEHOLDER_ANALYZING,
          "I couldn't generate your plan right now.\n\nTry again with a smaller photo, or check your connection."
        )
      );
      setConnectionStatus("Check connection");
    } finally {
      setBusy(false);
    }
  }

  function handleReset() {
    setPills([]);
    setChatInput("");
    setConnectionStatus("Ready");
    setSubmitted(false);
    setContextGathered(false);
    setMessages([{ who: "bot", text: WELCOME_MESSAGE }]);
  }

  function handlePrivacyNote() {
    setMessages((prev) =>
      appendMessage(
        prev,
        "Privacy note:\n• Start anonymous.\n• Only upload what you're comfortable sharing.\n• Avoid including faces, mail, or personal documents.\n\n(When you publish this, add your exact retention policy—e.g., auto-delete images after 24 hours.)"
      )
    );
  }

  function handleSendMessage() {
    const text = chatInput.trim();
    if (!text || busy) return;
    setChatInput("");
    handleConversation(text);
  }

  return (
    <div className="wrap">
      <div className="grid">
        {!submitted ? (
          <IntakeForm
            busy={busy}
            onSubmit={handleSubmit}
            onPrivacyNote={handlePrivacyNote}
            onReset={handleReset}
            userHeader={userEmail ? <UserMenu /> : <GoogleSignInButton />}
          />
        ) : (
          <ChatView
            messages={messages}
            pills={pills}
            contextGathered={contextGathered}
            connectionStatus={connectionStatus}
            busy={busy}
            chatInput={chatInput}
            onChatInputChange={setChatInput}
            onSendMessage={handleSendMessage}
            onPillClick={(text) => handleConversation(text)}
            onCalendlyOpen={() => uploadTranscript(messages).catch(console.error)}
          />
        )}
      </div>
    </div>
  );
}
