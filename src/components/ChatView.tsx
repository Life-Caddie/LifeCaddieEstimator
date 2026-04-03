"use client";

import React, { useEffect, useRef } from "react";
import type { ChatMessage } from "../lib/api";
import CalendlyEmbed from "./CalendlyEmbed";
import type { CalendlyPrefill } from "./CalendlyEmbed";

const bulletRegex = /^([•\-*]|\d+\.) /;

function renderText(text: string, highlightBullets = false): React.ReactNode {
  const linkRegex = /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g;
  return text.split("\n").map((line, lineIdx) => {
    const bulletMatch = highlightBullets ? line.match(bulletRegex) : null;
    const lineBody = bulletMatch ? line.slice(bulletMatch[0].length) : line;

    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    linkRegex.lastIndex = 0;
    while ((match = linkRegex.exec(lineBody)) !== null) {
      if (match.index > lastIndex) parts.push(lineBody.slice(lastIndex, match.index));
      parts.push(
        <a key={match.index} href={match[2]} target="_blank" rel="noopener noreferrer">
          {match[1]}
        </a>
      );
      lastIndex = match.index + match[0].length;
    }
    if (lastIndex < lineBody.length) parts.push(lineBody.slice(lastIndex));
    return (
      <React.Fragment key={lineIdx}>
        {lineIdx > 0 && <br />}
        {bulletMatch && <span className="bullet-marker">{bulletMatch[0]}</span>}
        {parts.length > 0 ? parts : lineBody}
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
  onHowItWorks?: () => void;
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
  onHowItWorks,
}: Props) {
  const chatlogRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!chatlogRef.current) return;
    chatlogRef.current.scrollTop = chatlogRef.current.scrollHeight;
  }, [messages, pills]);

  return (
    <div className="card card-secondary">
      <div className="card-header">
        <div className="flex-row">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/life-caddie-logo-simple.webp" className="brand-logo" alt="Life Caddie" />
          <h2 className="h2">Your Life Caddie Plan</h2>
        </div>
        <div className="flex-row">
          {onHowItWorks && (
            <button
              type="button"
              className="how-it-works-trigger"
              onClick={onHowItWorks}
              aria-label="How it works"
            >
              ?
            </button>
          )}
          <span className="badge">{connectionStatus}</span>
        </div>
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
                  {renderText(m.text, m.who !== "user")}
                </div>
              );
            })}
          </div>

          {pills.length > 0 && (
            <div className="pill-row">
              {pills.map((p, i) => (
                <button
                  key={`${p}-${i}`}
                  type="button"
                  className={contextGathered ? "pill pill-cta" : "pill"}
                  disabled={busy}
                  onClick={() => contextGathered ? onCalendlyPillClick(p) : onPillClick(p)}
                >
                  {p}
                </button>
              ))}
              {contextGathered && (
                <button
                  type="button"
                  className="pill pill-cta"
                  disabled={busy}
                  onClick={() => onCalendlyPillClick("Other")}
                >
                  Other
                </button>
              )}
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
              <button type="button" onClick={onSendMessage} disabled={busy} className="btn btn-auto">
                Send
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
