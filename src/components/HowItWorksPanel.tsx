"use client";

import React, { useEffect } from "react";
import { CameraIcon, ChatIcon, LeafIcon } from "./icons/StepIcons";
import "../styles/HowItWorksPanel.css";

interface HowItWorksPanelProps {
  onClose: () => void;
}

const STEPS = [
  {
    icon: <CameraIcon size={22} />,
    label: "Upload a photo",
    desc: "Take a photo of any space that's been weighing on you — it doesn't need to be tidy or finished.",
  },
  {
    icon: <ChatIcon size={22} />,
    label: "Answer two questions",
    desc: "Tell us your goal for the space and how it's making you feel right now. That's it.",
  },
  {
    icon: <LeafIcon size={22} />,
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
