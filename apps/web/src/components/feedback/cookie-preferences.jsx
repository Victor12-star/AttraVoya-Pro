'use client';

import { useEffect, useState } from 'react';
import { Cookie, Settings2, X } from 'lucide-react';

import {
  acceptAllOptionalCookies,
  readCookieConsent,
  rejectNonEssentialCookies,
  saveCookieConsent,
} from '../../lib/cookie-consent.js';

export function CookiePreferences({ messages }) {
  const [visible, setVisible] = useState(false);
  const [manage, setManage] = useState(false);
  const [preferences, setPreferences] = useState(false);
  const [analytics, setAnalytics] = useState(false);

  useEffect(() => {
    const consent = readCookieConsent();
    setPreferences(consent.preferences);
    setAnalytics(consent.analytics);
    setVisible(!consent.decidedAt);
  }, []);

  if (!visible) return null;

  function closeWith(consent) {
    setPreferences(consent.preferences);
    setAnalytics(consent.analytics);
    setVisible(false);
  }

  return (
    <aside className="cookie-panel" aria-label={messages.title}>
      <div className="cookie-panel__icon" aria-hidden="true">
        <Cookie size={19} />
      </div>
      <div className="cookie-panel__content">
        <div className="cookie-panel__heading">
          <h2>{messages.title}</h2>
          <button
            className="icon-button icon-button--small"
            type="button"
            aria-label="Close"
            onClick={() => setVisible(false)}
          >
            <X size={16} />
          </button>
        </div>
        <p>{messages.description}</p>

        {manage ? (
          <div className="cookie-options">
            <label>
              <input type="checkbox" checked disabled /> {messages.essential}
            </label>
            <label>
              <input
                type="checkbox"
                checked={preferences}
                onChange={(event) => setPreferences(event.target.checked)}
              />{' '}
              {messages.preferences}
            </label>
            <label>
              <input
                type="checkbox"
                checked={analytics}
                onChange={(event) => setAnalytics(event.target.checked)}
              />{' '}
              {messages.analytics}
            </label>
          </div>
        ) : null}

        <div className="cookie-panel__actions">
          <button
            className="button button--dark"
            type="button"
            onClick={() => closeWith(acceptAllOptionalCookies())}
          >
            {messages.acceptAll}
          </button>
          <button
            className="button button--secondary"
            type="button"
            onClick={() => closeWith(rejectNonEssentialCookies())}
          >
            {messages.rejectNonEssential}
          </button>
          {manage ? (
            <button
              className="button button--ghost"
              type="button"
              onClick={() => closeWith(saveCookieConsent({ preferences, analytics }))}
            >
              {messages.manage}
            </button>
          ) : (
            <button className="button button--ghost" type="button" onClick={() => setManage(true)}>
              <Settings2 size={16} /> {messages.manage}
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
