"use client";

import React, { useEffect, useRef } from "react";
import CalendarButton from "./CalendarButton";
import type { ChatMessage } from "../lib/api";

type Props = {
  messages: ChatMessage[];
  pills: string[];
  contextGathered: boolean;
  connectionStatus: "Ready" | "Working…" | "Check connection";
  busy: boolean;
  chatInput: string;
  onChatInputChange: (value: string) => void;
  onSendMessage: () => void;
  onPillClick: (text: string) => void;
  onCalendlyOpen?: () => void;
};

export default function ChatView({
  messages,
  pills,
  contextGathered,
  connectionStatus,
  busy,
  chatInput,
  onChatInputChange,
  onSendMessage,
  onPillClick,
  onCalendlyOpen,
}: Props) {
  const chatlogRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!chatlogRef.current) return;
    chatlogRef.current.scrollTop = chatlogRef.current.scrollHeight;
  }, [messages, pills]);

  return (
    <div className="card card-secondary">
      <div className="card-header">
        <h2 className="h2">Your Life Caddie Plan</h2>
        <span className="badge">{connectionStatus}</span>
      </div>

      <div ref={chatlogRef} className="chatlog" aria-live="polite">
        {messages.map((m, idx) => (
          <div key={idx} className={`msg ${m.who === "user" ? "msg-user" : "msg-bot"}`}>
            {m.text}
          </div>
        ))}
      </div>

      {pills.length > 0 && (
        <div className="pill-row">
          {contextGathered
            ? pills.map((p, i) => (
                <CalendarButton
                  key={`${p}-${i}`}
                  url="https://calendly.com/lifecaddie/consultation"
                  text={p}
                  disabled={busy}
                  onOpen={onCalendlyOpen}
                />
              ))
            : pills.map((p, i) => (
                <button
                  key={`${p}-${i}`}
                  type="button"
                  className="pill"
                  disabled={busy}
                  onClick={() => onPillClick(p)}
                >
                  {p}
                </button>
              ))}
        </div>
      )}

      <div className="chat-bar">
        <input
          value={chatInput}
          onChange={(e) => onChatInputChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onSendMessage();
            }
          }}
          disabled={busy}
          placeholder='Optional: add one detail (e.g., "this is my pantry")…'
          className="chat-input"
        />
        <button type="button" onClick={onSendMessage} disabled={busy} className="btn" style={{ width: "auto" }}>
          Send
        </button>
      </div>
    </div>
  );
}
