"use client";

import React, { useEffect, useState } from "react";
import { GOALS, FEELINGS } from "../constants/intake";

type Props = {
  busy: boolean;
  onSubmit: (photo: File, goal: string, feeling: string) => void;
  onPrivacyNote: () => void;
  onReset: () => void;
  userHeader: React.ReactNode;
};

function formatMB(bytes: number) {
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

export default function IntakeForm({ busy, onSubmit, onPrivacyNote, onReset, userHeader }: Props) {
  const [goal, setGoal] = useState("");
  const [feeling, setFeeling] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [previewDetails, setPreviewDetails] = useState("");
  const [imageWarning, setImageWarning] = useState("");
  const [honeypotValue, setHoneypotValue] = useState("");

  useEffect(() => {
    if (!photo) {
      setPreviewUrl("");
      setPreviewDetails("");
      setImageWarning("");
      return;
    }
    const url = URL.createObjectURL(photo);
    setPreviewUrl(url);
    setPreviewDetails(`${photo.name} • ${formatMB(photo.size)}`);

    if (!photo.type.startsWith("image/")) {
      setImageWarning("Please choose an image file.");
    } else if (photo.size > 5_000_000) {
      setImageWarning(
        "This photo is over 5MB. On phones, smaller images upload more reliably. If possible, use a lower-resolution photo."
      );
    } else {
      setImageWarning("");
    }

    return () => URL.revokeObjectURL(url);
  }, [photo]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (honeypotValue.trim()) return;
    if (!photo || !goal || !feeling) return;
    onSubmit(photo, goal, feeling);
  }

  return (
    <div className="card card-primary">
      <div className="card-header">
        <div className="flex-row">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/life-caddie-logo-simple.webp" className="brand-logo" alt="Life Caddie" />
          <h2 className="h2">Upload + 2 quick questions</h2>
        </div>
        <div className="flex-row">{userHeader}</div>
      </div>

      <div className="card-body">
        <form onSubmit={handleSubmit}>
          <div className="hp">
            <label>Leave this blank</label>
            <input value={honeypotValue} onChange={(e) => setHoneypotValue(e.target.value)} />
          </div>

          <label className="label" htmlFor="photo">Upload a photo of your space</label>
          <input
            id="photo"
            type="file"
            accept="image/*"
            capture="environment"
            disabled={busy}
            className="file"
            onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
          />

          {previewUrl && (
            <details key={previewUrl} className="preview">
              <summary className="preview-summary">
                <span>{previewDetails}</span>
              </summary>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={previewUrl} alt="Selected photo preview" className="preview-img" />
            </details>
          )}

          {imageWarning && <div className="warn">{imageWarning}</div>}

          <label className="label"><span className="label-dot" aria-hidden="true">●</span>1) My goal for this space</label>
          <select
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            disabled={busy}
            aria-label="goal"
            className="select"
          >
            <option value="">Choose a goal</option>
            {GOALS.map((x) => (
              <option key={x.value} value={x.value} title={x.sub}>
                {x.label}
              </option>
            ))}
          </select>

          <label className="label"><span className="label-dot" aria-hidden="true">●</span>2) How the space is making me feel</label>
          <select
            value={feeling}
            onChange={(e) => setFeeling(e.target.value)}
            disabled={busy}
            aria-label="Feeling"
            className="select"
          >
            <option value="">Choose how the space makes you feel</option>
            {FEELINGS.map((x) => (
              <option key={x.value} value={x.value} title={x.sub}>
                {x.label}
              </option>
            ))}
          </select>

          <div className="sticky-bar">
            <button type="submit" disabled={busy} className={`btn ${busy ? "btn-disabled" : ""}`}>
              Get my Clarity Plan
            </button>

            <div className="row-btns">
              <button type="button" onClick={onReset} disabled={busy} className="btn-secondary">
                Reset
              </button>
              <button type="button" onClick={onPrivacyNote} disabled={busy} className="btn-secondary">
                Privacy note
              </button>
            </div>

            <div className="hint">
              You'll get a short, gentle plan first. If you want to save it or go deeper, you can share details later.
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
