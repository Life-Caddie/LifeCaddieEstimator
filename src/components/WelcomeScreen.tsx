"use client";

import React, { useState } from "react";
import "../styles/WelcomeScreen.css";

interface WelcomeScreenProps {
  onEnter: () => void;
}

const CameraIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#e49d5d" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
    <circle cx="12" cy="13" r="4" />
  </svg>
);

const ChatIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#e49d5d" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);

const LeafIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#e49d5d" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M17 8C8 10 5.9 16.17 3.82 19.5c1.66 1.14 3.84 1.14 5.5 0C11 18 12 15 17 8z" />
    <path d="M17 8c0 0-2 8-14 12" />
  </svg>
);

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
          src="/life-caddie-logo-simple.webp"
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
