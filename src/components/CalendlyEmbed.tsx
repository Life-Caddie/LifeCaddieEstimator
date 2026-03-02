'use client';

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
        <div className="flex-row">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/life-caddie-logo-simple.webp" className="brand-logo" alt="Life Caddie" />
          <button
            type="button"
            className="btn-secondary btn-sm"
            onClick={onBack}
          >
            ← Back to chat
          </button>
        </div>
        <p className="calendly-context-note">
          Your session details will be shared with your consultant.
        </p>
      </div>
      <div className="calendly-widget-wrap">
        <InlineWidget
          url={url}
          prefill={prefill}
          styles={{ minWidth: '280px', height: '100%' }}
        />
      </div>
    </div>
  );
}
