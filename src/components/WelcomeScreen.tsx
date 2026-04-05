"use client";

import React, { useState } from "react";
import { CameraIcon, ChatIcon, LeafIcon } from "./icons/StepIcons";
import "../styles/WelcomeScreen.css";

interface WelcomeScreenProps {
  onEnter: () => void;
}

const STEPS = [
  {
    icon: <CameraIcon />,
    label: "Upload a photo",
    desc: "Any space that's been on your mind",
  },
  {
    icon: <ChatIcon />,
    label: "Two questions",
    desc: "Your goal and how it makes you feel",
  },
  {
    icon: <LeafIcon />,
    label: "Your Clarity Plan",
    desc: "A calm, personal first step",
  },
];

export default function WelcomeScreen({ onEnter }: WelcomeScreenProps) {
  const [exiting, setExiting] = useState(false);

  function handleEnter() {
    setExiting(true);
    setTimeout(onEnter, 380);
  }

  return (
    <div
      className={`welcome-overlay${exiting ? " welcome-exit" : ""}`}
      role="dialog"
      aria-modal="true"
      aria-label="Welcome to Life Caddie"
    >
      <div className="welcome-grain" aria-hidden="true" />

      <div className="welcome-content">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/LifeCaddieSymbolLarge.png"
          className="welcome-logo"
          alt="Life Caddie"
        />

        <h1 className="welcome-headline">
          Your space is trying<br />to tell you something.
        </h1>

        <p className="welcome-sub">
          Upload a photo, answer two honest questions,<br />
          and get a calm plan for what to do next.
        </p>

        <div className="welcome-steps" aria-label="How it works">
          {STEPS.map((step, i) => (
            <div
              className="welcome-step"
              key={i}
              style={{ animationDelay: `${700 + i * 120}ms` }}
            >
              <div className="welcome-step-icon">{step.icon}</div>
              <span className="welcome-step-label">{step.label}</span>
              <span className="welcome-step-desc">{step.desc}</span>
            </div>
          ))}
        </div>

        <button className="welcome-cta" onClick={handleEnter}>
          Begin
        </button>
      </div>
    </div>
  );
}
