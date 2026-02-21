'use client';

import React, { useEffect, useState } from "react";
import { PopupModal } from "react-calendly";

type Props = {
  url: string;
  text?: string;
  disabled?: boolean;
  onOpen?: () => void;
};

export default function CalendarButton({ url, text = "Schedule meeting", disabled = false, onOpen }: Props) {
  const [open, setOpen] = useState(false);
  const [rootEl, setRootEl] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setRootEl(document.getElementById("root") ?? document.getElementById("__next") ?? document.body);
  }, []);

  return (
    <>
      <button type="button" disabled={disabled} onClick={() => { onOpen?.(); setOpen(true); }} className="pill">
        {text}
      </button>

      {rootEl && (
        <PopupModal
          url={url}
          rootElement={rootEl}
          open={open}
          onModalClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
