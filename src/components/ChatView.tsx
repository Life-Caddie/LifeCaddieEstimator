"use client";

import React, { useEffect, useRef } from "react";
import type { ChatMessage } from "../lib/api";

function renderText(text: string): React.ReactNode {
  const linkRegex = /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g;
  return text.split("\n").map((line, lineIdx) => {
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    linkRegex.lastIndex = 0;
    while ((match = linkRegex.exec(line)) !== null) {
      if (match.index > lastIndex) parts.push(line.slice(lastIndex, match.index));
      parts.push(
        <a key={match.index} href={match[2]} target="_blank" rel="noopener noreferrer">
          {match[1]}
        </a>
      );
      lastIndex = match.index + match[0].length;
    }
    if (lastIndex < line.length) parts.push(line.slice(lastIndex));
    return (
      <React.Fragment key={lineIdx}>
        {lineIdx > 0 && <br />}
        {parts.length > 0 ? parts : line}
      </React.Fragment>
    );
  });
}

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
  onCalendlyPillClick: () => void;
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
  onCalendlyPillClick,
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
            {renderText(m.text)}
          </div>
        ))}
      </div>

      {pills.length > 0 && (
        <div className="pill-row">
          {contextGathered
            ? pills.map((p, i) => (
                <button
                  key={`${p}-${i}`}
                  type="button"
                  className="pill"
                  disabled={busy}
                  onClick={onCalendlyPillClick}
                >
                  {p}
                </button>
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
