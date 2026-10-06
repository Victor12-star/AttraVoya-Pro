'use client';

import { useEffect, useMemo, useState } from 'react';

import { createAdminApiClient } from '../../lib/api-client.js';

const WINDOW_OPTIONS = [7, 30, 90];

/**
 * @typedef {object} AnalyticsSummary
 * @property {{ days: number, start: string, end: string }} window
 * @property {{ totalRegistered: number, newRegistered: number }} users
 */

/** @param {{ status?: number, code?: string } | null | undefined} error */
function analyticsErrorMessage(error) {
  if (error?.status === 401) return 'Sign in with an administrator account to view analytics.';
  if (error?.status === 403) return 'Your account does not have permission to view analytics.';
  return 'Analytics are temporarily unavailable. Please try again.';
}

/**
 * @param {{
 *   client?: { getUserAnalytics: (input?: { days?: number }) => Promise<AnalyticsSummary> },
 * }} props
 */
export function AnalyticsDashboard({ client }) {
  const analyticsClient = useMemo(() => client ?? createAdminApiClient(), [client]);
  const [days, setDays] = useState(7);
  const [summary, setSummary] = useState(/** @type {AnalyticsSummary | null} */ (null));
  const [requestVersion, setRequestVersion] = useState(0);
  const [state, setState] = useState('loading');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    let active = true;

    setState('loading');
    setErrorMessage('');

    analyticsClient
      .getUserAnalytics({ days })
      .then((result) => {
        if (!active) return;
        setSummary(result);
        setState('ready');
      })
      .catch((error) => {
        if (!active || error?.code === 'REQUEST_ABORTED') return;
        setSummary(null);
        setErrorMessage(analyticsErrorMessage(error));
        setState('error');
      });

    return () => {
      active = false;
    };
  }, [analyticsClient, days, requestVersion]);

  return (
    <section className="admin-card" aria-labelledby="analytics-title">
      <div className="admin-analytics-heading">
        <div>
          <h1 id="analytics-title">Analytics</h1>
          <p className="admin-muted">
            Privacy-safe aggregate registration metrics. No individual user activity is shown here.
          </p>
        </div>

        <label className="admin-analytics-window">
          <span>Window</span>
          <select
            aria-label="Analytics window"
            value={days}
            onChange={(event) => setDays(Number(event.target.value))}
          >
            {WINDOW_OPTIONS.map((option) => (
              <option key={option} value={option}>
                Last {option} days
              </option>
            ))}
          </select>
        </label>
      </div>

      {state === 'loading' ? (
        <p className="admin-muted" role="status">
          Loading analytics…
        </p>
      ) : null}

      {state === 'error' ? (
        <div className="admin-analytics-error" role="alert">
          <p>{errorMessage}</p>
          <button type="button" onClick={() => setRequestVersion((value) => value + 1)}>
            Retry
          </button>
        </div>
      ) : null}

      {state === 'ready' && summary ? (
        <>
          <div className="admin-analytics-grid">
            <article className="admin-analytics-metric">
              <span className="admin-muted">Total registered users</span>
              <strong>{summary.users.totalRegistered.toLocaleString()}</strong>
            </article>
            <article className="admin-analytics-metric">
              <span className="admin-muted">New registrations</span>
              <strong>{summary.users.newRegistered.toLocaleString()}</strong>
            </article>
          </div>
          <p className="admin-muted admin-analytics-footnote">
            Window: last {summary.window.days} days. Data is aggregate-only and loaded with no-store
            caching.
          </p>
        </>
      ) : null}
    </section>
  );
}
