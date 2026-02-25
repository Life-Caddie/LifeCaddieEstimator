"use client";

import React, { useEffect, useRef } from "react";
import type { ChatMessage } from "../lib/api";
import CalendlyEmbed from "./CalendlyEmbed";
import type { CalendlyPrefill } from "./CalendlyEmbed";

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
  onCalendlyPillClick: (text: string) => void;
  showCalendlyEmbed?: boolean;
  calendlyUrl?: string;
  calendlyPrefill?: CalendlyPrefill;
  onCalendlyScheduled?: () => void;
  onCalendlyBack?: () => void;
  schedulingComplete?: boolean;
  newMessagesStartIndex?: number;
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
  showCalendlyEmbed = false,
  calendlyUrl = "",
  calendlyPrefill = {},
  onCalendlyScheduled = () => {},
  onCalendlyBack = () => {},
  schedulingComplete = false,
  newMessagesStartIndex = -1,
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

      {showCalendlyEmbed ? (
        <CalendlyEmbed
          url={calendlyUrl}
          prefill={calendlyPrefill}
          onScheduled={onCalendlyScheduled}
          onBack={onCalendlyBack}
        />
      ) : (
        <>
          <div ref={chatlogRef} className="chatlog" aria-live="polite">
            {messages.map((m, idx) => {
              const isNew = newMessagesStartIndex >= 0 && idx >= newMessagesStartIndex;
              const cls = m.who === "user"
                ? "msg msg-user"
                : isNew ? "msg msg-bot msg-new" : "msg msg-bot";
              return (
                <div key={idx} className={cls}>
                  {renderText(m.text)}
                </div>
              );
            })}
          </div>

          {pills.length > 0 && (
            <div className="pill-row">
              {contextGathered
                ? (
                  <>
                    {pills.map((p, i) => (
                      <button
                        key={`${p}-${i}`}
                        type="button"
                        className="pill pill-cta"
                        disabled={busy}
                        onClick={() => onCalendlyPillClick(p)}
                      >
                        {p}
                      </button>
                    ))}
                    <button
                      type="button"
                      className="pill pill-cta"
                      disabled={busy}
                      onClick={() => onCalendlyPillClick("Other")}
                    >
                      Other
                    </button>
                  </>
                )
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

          {!schedulingComplete && (
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
          )}
        </>
      )}
    </div>
  );
}
