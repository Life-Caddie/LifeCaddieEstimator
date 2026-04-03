"use client";

import React, { useEffect } from "react";
import "../styles/HowItWorksPanel.css";

interface HowItWorksPanelProps {
  onClose: () => void;
}

const CameraIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#e49d5d" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
    <circle cx="12" cy="13" r="4" />
  </svg>
);

const ChatIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#e49d5d" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);

const LeafIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#e49d5d" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M17 8C8 10 5.9 16.17 3.82 19.5c1.66 1.14 3.84 1.14 5.5 0C11 18 12 15 17 8z" />
    <path d="M17 8c0 0-2 8-14 12" />
  </svg>
);

const STEPS = [
  {
    icon: <CameraIcon />,
    label: "Upload a photo",
    desc: "Take a photo of any space that's been weighing on you — it doesn't need to be tidy or finished.",
  },
  {
    icon: <ChatIcon />,
    label: "Answer two questions",
    desc: "Tell us your goal for the space and how it's making you feel right now. That's it.",
  },
  {
    icon: <LeafIcon />,
    label: "Receive your Clarity Plan",
    desc: "You'll get a short, calm plan focused on one achievable first step — tailored to you.",
  },
];

export default function HowItWorksPanel({ onClose }: HowItWorksPanelProps) {
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return (
    <>
      <div className="hiw-backdrop" onClick={onClose} aria-hidden="true" />
      <div
        className="hiw-panel"
        role="dialog"
        aria-modal="true"
        aria-label="How Life Caddie works"
      >
        <div className="hiw-header">
          <h2 className="hiw-title">How it works</h2>
          <button className="hiw-close" onClick={onClose} aria-label="Close panel">
            ×
          </button>
        </div>

        <p className="hiw-intro">
          Life Caddie is a quiet thinking partner for when your space feels like too much.
          No judgment, no pressure — just a clear first step.
        </p>

        <div className="hiw-steps">
          {STEPS.map((step, i) => (
            <div className="hiw-step" key={i}>
              <div className="hiw-step-icon">{step.icon}</div>
              <div className="hiw-step-text">
                <span className="hiw-step-label">{step.label}</span>
                <span className="hiw-step-desc">{step.desc}</span>
              </div>
            </div>
          ))}
        </div>

        <p className="hiw-footer">
          Starting is free and anonymous. No account needed.
        </p>
      </div>
    </>
  );
}
