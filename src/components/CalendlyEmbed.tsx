'use client';

import React from 'react';
import { InlineWidget, useCalendlyEventListener } from 'react-calendly';

export type CalendlyPrefill = {
  email?: string;
  customAnswers?: {
    a1?: string;
    a2?: string;
  };
};

type Props = {
  url: string;
  prefill: CalendlyPrefill;
  onScheduled: () => void;
  onBack: () => void;
};

export default function CalendlyEmbed({ url, prefill, onScheduled, onBack }: Props) {
  useCalendlyEventListener({
    onEventScheduled: onScheduled,
  });

  return (
    <div className="calendly-embed-container">
      <div className="calendly-embed-header">
        <button
          type="button"
          className="btn-secondary btn-sm"
          onClick={onBack}
        >
          ← Back to chat
        </button>
        <p className="calendly-context-note">
          Your session details will be shared with your consultant.
        </p>
      </div>
      <InlineWidget
        url={url}
        prefill={prefill}
        styles={{ minWidth: '280px', height: '660px' }}
      />
    </div>
  );
}
