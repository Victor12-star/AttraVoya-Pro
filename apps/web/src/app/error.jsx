'use client';

import { useEffect, useState } from 'react';

import { loadMessages } from '../i18n/messages.js';

const FALLBACK_COPY = Object.freeze({
  retry: 'Try again',
  unavailable: 'Temporarily unavailable',
});

function currentDocumentLocale() {
  return globalThis.document?.documentElement?.lang || 'en';
}

/**
 * Customer-site route error boundary. It exposes only safe recovery copy and
 * resolves maintained interface messages from the locale already on the page.
 *
 * @param {{ reset: () => void }} props
 */
export default function WebError({ reset }) {
  const [copy, setCopy] = useState(FALLBACK_COPY);

  useEffect(() => {
    let active = true;

    loadMessages(currentDocumentLocale())
      .then((messages) => {
        if (!active) return;
        setCopy({
          retry: messages.common.retry,
          unavailable: messages.common.unavailable,
        });
      })
      .catch(() => {
        // Keep the dependency-free English fallback when locale chunks cannot load.
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <main className="feature-page">
      <div className="shell">
        <section className="feature-page__card" role="alert">
          <span className="eyebrow">AttraVoya Pro</span>
          <h1>{copy.unavailable}</h1>
          <div className="feature-page__actions">
            <button className="button button--dark" type="button" onClick={() => reset()}>
              {copy.retry}
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
