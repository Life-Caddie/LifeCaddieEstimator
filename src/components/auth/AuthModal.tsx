"use client";

import React from "react";
import { GoogleSignInButton } from "./GoogleSignInButton";
import "../../styles/AuthModal.css";

type Props = {
  onBeforeSignIn: () => void;
  onCancel: () => void;
};

export function AuthModal({ onBeforeSignIn, onCancel }: Props) {
  return (
    <div className="auth-modal-backdrop" onClick={onCancel}>
      <div className="auth-modal-card" onClick={(e) => e.stopPropagation()}>
        <h2 className="auth-modal-title">Sign in to book your consultation</h2>
        <p className="auth-modal-subtitle">
          We'll hold your place and open your scheduling link right after you sign in.
        </p>
        <GoogleSignInButton onBeforeRedirect={onBeforeSignIn} />
        <button className="auth-modal-cancel" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}
