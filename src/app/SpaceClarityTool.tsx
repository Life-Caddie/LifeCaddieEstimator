"use client";

import React, { useState, useEffect } from "react";
import { AuthModal } from "../components/auth/AuthModal";
import IntakeForm from "../components/IntakeForm";
import ChatView from "../components/ChatView";
import WelcomeScreen from "../components/WelcomeScreen";
import HowItWorksPanel from "../components/HowItWorksPanel";
import { useAuthEmail } from "../hooks/useAuthEmail";
import { useClientToken } from "../hooks/useClientToken";
import { analyzeSpace, sendConversation } from "../lib/api";
import {
  saveConversationForAuth,
  loadConversationState,
  clearConversationState,
} from "../lib/conversationStorage";
import { GOALS, FEELINGS, WELCOME_MESSAGE } from "../constants/intake";
import type { ChatMessage } from "../lib/api";
import '../styles/SpaceClarityTool.css';

const CALENDLY_URL = "https://calendly.com/lifecaddie/consultation";
const PLACEHOLDER_ANALYZING = "Uploading and analyzing…";
const PLACEHOLDER_THINKING = "Thinking…";

function appendMessage(messages: ChatMessage[], text: string, who: ChatMessage["who"] = "bot"): ChatMessage[] {
  return [...messages, { who, text }];
}

function resolveLastPlaceholder(messages: ChatMessage[], placeholder: string, replacement?: string): ChatMessage[] {
  const copy = [...messages];
  const isMatch = copy.length > 0 && copy[copy.length - 1].who === "bot" && copy[copy.length - 1].text === placeholder;
  if (replacement === undefined) {
    if (isMatch) copy.pop();
  } else if (isMatch) {
    copy[copy.length - 1] = { who: "bot", text: replacement };
  } else {
    copy.push({ who: "bot", text: replacement });
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

  const [leadId, setLeadId] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [clickedPillText, setClickedPillText] = useState<string | null>(null);

  const [showWelcome, setShowWelcome] = useState(true);
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showCalendlyEmbed, setShowCalendlyEmbed] = useState(false);
  const [schedulingComplete, setSchedulingComplete] = useState(false);
  const [newMessagesStartIndex, setNewMessagesStartIndex] = useState(-1);

  const userEmail = useAuthEmail();
  const clientToken = useClientToken();

  // On mount: suppress welcome screen if already seen this session
  useEffect(() => {
    if (sessionStorage.getItem('lc_welcome_seen')) setShowWelcome(false);
  }, []);

  // On mount: check for ?calendly=1 — restore saved conversation and auto-open Calendly embed
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("calendly") !== "1") return;

    const saved = loadConversationState();
    if (!saved) return;

    setMessages(saved.messages);
    setPills(saved.pills);
    setContextGathered(saved.contextGathered);
    setLeadId(saved.leadId);
    setSessionId(saved.sessionId);
    setClickedPillText(saved.clickedPillText ?? null);
    setSubmitted(true);
    setShowCalendlyEmbed(true);
    clearConversationState();

    // Remove the URL param without a page reload
    const url = new URL(window.location.href);
    url.searchParams.delete("calendly");
    window.history.replaceState({}, "", url.toString());
  }, []);

  function handleCalendlyPillClick(pillText: string) {
    setClickedPillText(pillText);
    if (userEmail) {
      setShowCalendlyEmbed(true);
    } else {
      setShowAuthModal(true);
    }
  }

  function handleCalendlyBack() {
    setShowCalendlyEmbed(false);
  }

  async function handleCalendlyScheduled() {
    setShowCalendlyEmbed(false);
    if (busy) return;

    const newStartIdx = messages.length;
    const withMsg = appendMessage(messages, PLACEHOLDER_THINKING);
    setMessages(withMsg);
    setBusy(true);
    setConnectionStatus("Working…");

    try {
      const result = await sendConversation(messages, contextGathered, sessionId, leadId, false, true);

      setMessages((prev) => {
        let updated = resolveLastPlaceholder(prev, PLACEHOLDER_THINKING);
        const outMessages = Array.isArray(result.messages) ? result.messages.slice(0, 3) : [];
        for (const m of outMessages) {
          updated = appendMessage(updated, String(m));
        }
        return updated;
      });

      setNewMessagesStartIndex(newStartIdx);
      setSchedulingComplete(true);
      setPills([]);
      setConnectionStatus("Ready");
    } catch (err) {
      console.error(err);
      setMessages((prev) =>
        resolveLastPlaceholder(prev, PLACEHOLDER_THINKING, "You're all set! We'll see you at your consultation.")
      );
      setNewMessagesStartIndex(newStartIdx);
      setSchedulingComplete(true);
      setConnectionStatus("Ready");
    } finally {
      setBusy(false);
    }
  }

  function handleSaveAndSignIn() {
    saveConversationForAuth({ messages, pills, contextGathered, leadId, sessionId, clickedPillText });
  }

  async function handleConversation(userText: string, isPill = false) {
    if (busy) return;

    const withUserMsg = appendMessage(messages, userText, "user");
    setMessages(appendMessage(withUserMsg, PLACEHOLDER_THINKING));
    setBusy(true);
    setConnectionStatus("Working…");

    try {
      const result = await sendConversation(withUserMsg, contextGathered, sessionId, leadId, isPill);

      setMessages((prev) => {
        let updated = resolveLastPlaceholder(prev, PLACEHOLDER_THINKING);
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
        resolveLastPlaceholder(prev, PLACEHOLDER_THINKING, "I couldn't respond right now. Try again or check your connection.")
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
      const locale = navigator.language || "";
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
      const result = await analyzeSpace(photo, goal, feeling, withUserMsg, clientToken ?? "", locale, timezone);

      setMessages((prev) => {
        let updated = resolveLastPlaceholder(prev, PLACEHOLDER_ANALYZING);
        if (result.task && result.follow_up_question) {
          updated = appendMessage(updated, result.task);
          updated = appendMessage(updated, result.follow_up_question);
        }
        return updated;
      });

      if (result.leadId) setLeadId(result.leadId);
      if (result.sessionId) setSessionId(result.sessionId);

      setConnectionStatus("Ready");
    } catch (err) {
      console.error(err);
      setMessages((prev) =>
        resolveLastPlaceholder(
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
    setLeadId(null);
    setSessionId(null);
    setClickedPillText(null);
    setShowCalendlyEmbed(false);
    setSchedulingComplete(false);
    setNewMessagesStartIndex(-1);
    setShowAuthModal(false);
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
    handleConversation(text, false);
  }

  const calendlyPrefill = {
    email: userEmail || "",
    customAnswers: {
      a1: clickedPillText || "",
      a2: leadId || "",
    },
  };

  return (
    <div className="wrap">
      {showWelcome && (
        <WelcomeScreen
          onEnter={() => { sessionStorage.setItem('lc_welcome_seen', '1'); setShowWelcome(false); }}
        />
      )}

      {showHowItWorks && (
        <HowItWorksPanel onClose={() => setShowHowItWorks(false)} />
      )}

      <div className="grid">
        {!submitted ? (
          <IntakeForm
            busy={busy}
            onSubmit={handleSubmit}
            onPrivacyNote={handlePrivacyNote}
            onReset={handleReset}
            onHowItWorks={() => setShowHowItWorks(true)}
            userHeader={null}
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
            onPillClick={(text) => handleConversation(text, true)}
            onCalendlyPillClick={handleCalendlyPillClick}
            showCalendlyEmbed={showCalendlyEmbed}
            calendlyUrl={CALENDLY_URL}
            calendlyPrefill={calendlyPrefill}
            onCalendlyScheduled={handleCalendlyScheduled}
            onCalendlyBack={handleCalendlyBack}
            schedulingComplete={schedulingComplete}
            newMessagesStartIndex={newMessagesStartIndex}
            onHowItWorks={() => setShowHowItWorks(true)}
          />
        )}
      </div>

      {showAuthModal && (
        <AuthModal
          onBeforeSignIn={handleSaveAndSignIn}
          onCancel={() => setShowAuthModal(false)}
        />
      )}
    </div>
  );
}
