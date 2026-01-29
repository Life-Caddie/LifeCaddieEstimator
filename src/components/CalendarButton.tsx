'use client';

import React, { useEffect, useState } from "react";
import { PopupModal } from "react-calendly";

type Props = {
  url: string;
  text?: string;
  disabled?: boolean;
};

export default function CalendarButton({ url, text = "Schedule meeting", disabled = false }: Props) {
  const [open, setOpen] = useState(false);
  const [rootEl, setRootEl] = useState<HTMLElement | null>(null);

  useEffect(() => {
    // react-calendly uses portals; ensure we have a root element to attach to
    // In Next.js the document exists only on the client, and this file is a client component.
    setRootEl(document.getElementById("root") ?? document.getElementById("__next") ?? document.body);
  }, []);

  const pillStyle: React.CSSProperties = {
    fontSize: 12,
    border: "1px solid #e5e7eb",
    background: "#fff",
    borderRadius: 999,
    padding: "7px 10px",
    cursor: disabled ? "not-allowed" : "pointer",
  };

  return (
    <>
      <button type="button" disabled={disabled} onClick={() => setOpen(true)} style={pillStyle}>
        {text}
      </button>

      {rootEl ? (
        <PopupModal
          url={url}
          rootElement={rootEl}
          open={open}
          onModalClose={() => setOpen(false)}
        />
      ) : null}
    </>
  );
}
