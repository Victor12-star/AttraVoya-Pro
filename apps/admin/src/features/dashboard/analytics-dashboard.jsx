'use client';

import { useEffect, useMemo, useState } from 'react';

import { createAdminApiClient } from '../../lib/api-client.js';

const WINDOW_OPTIONS = [7, 30, 90];

/**
 * @typedef {object} AnalyticsSummary
 * @property {{ days: number, start: string, end: string }} window
 * @property {{ totalRegistered: number, newRegistered: number, previousRegistered?: number, recentlyLoggedIn?: number, tripsCreated?: number, uniqueTripCreators?: number }} users
 */

/** @param {{ status?: number, code?: string } | null | undefined} error */
function analyticsErrorMessage(error) {
  if (error?.status === 401) return 'Sign in with an administrator account to view analytics.';
  if (error?.status === 403) return 'Your account does not have permission to view analytics.';
  return 'Analytics are temporarily unavailable. Please try again.';
}

function registrationChangeLabel(users) {
  if (typeof users.previousRegistered !== 'number') return '—';
  if (users.previousRegistered === 0) return 'No comparable percentage';
  const percentage =
    ((users.newRegistered - users.previousRegistered) / users.previousRegistered) * 100;
  return `${percentage.toFixed(1)}%`;
}

function tripCreatorShareLabel(users) {
  if (typeof users.uniqueTripCreators !== 'number') return '—';
  if (users.totalRegistered <= 0) return '—';
  const creators = Math.min(users.uniqueTripCreators, users.totalRegistered);
  const percentage = (creators / users.totalRegistered) * 100;
  return `${percentage.toFixed(1)}%`;
}

/**
 * @param {{
 *   apiBaseUrl?: string | null,
 *   client?: { getUserAnalytics: (input?: { days?: number }) => Promise<AnalyticsSummary> },
 * }} props
 */
export function AnalyticsDashboard({ apiBaseUrl = null, client }) {
  const analyticsClient = useMemo(
    () => client ?? (apiBaseUrl ? createAdminApiClient({ baseUrl: apiBaseUrl }) : null),
    [apiBaseUrl, client],
  );
  const [days, setDays] = useState(7);
  const [summary, setSummary] = useState(/** @type {AnalyticsSummary | null} */ (null));
  const [requestVersion, setRequestVersion] = useState(0);
  const [state, setState] = useState(analyticsClient ? 'loading' : 'error');
  const [errorMessage, setErrorMessage] = useState(
    analyticsClient ? '' : 'Analytics are not configured for this Admin deployment.',
  );

  function requestAgain() {
    setSummary(null);
    setErrorMessage('');
    setState('loading');
    setRequestVersion((value) => value + 1);
  }

  function changeDays(nextDays) {
    setDays(nextDays);
    setSummary(null);
    setErrorMessage('');
    setState('loading');
  }

  useEffect(() => {
    let active = true;

    if (!analyticsClient) {
      return () => {
        active = false;
      };
    }

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
            onChange={(event) => changeDays(Number(event.target.value))}
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
          <button type="button" onClick={requestAgain}>
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
              <span className="admin-muted">Accounts with a recent login</span>
              <strong>
                {typeof summary.users.recentlyLoggedIn === 'number'
                  ? summary.users.recentlyLoggedIn.toLocaleString()
                  : '—'}
              </strong>
            </article>
            <article className="admin-analytics-metric">
              <span className="admin-muted">Unique travelers creating trips</span>
              <strong>
                {typeof summary.users.uniqueTripCreators === 'number'
                  ? summary.users.uniqueTripCreators.toLocaleString()
                  : '—'}
              </strong>
            </article>
            <article className="admin-analytics-metric">
              <span className="admin-muted">Registered users creating trips (%)</span>
              <strong>{tripCreatorShareLabel(summary.users)}</strong>
            </article>
            <article className="admin-analytics-metric">
              <span className="admin-muted">Trips created in selected window</span>
              <strong>
                {typeof summary.users.tripsCreated === 'number'
                  ? summary.users.tripsCreated.toLocaleString()
                  : '—'}
              </strong>
            </article>
            <article className="admin-analytics-metric">
              <span className="admin-muted">New registrations</span>
              <strong>{summary.users.newRegistered.toLocaleString()}</strong>
            </article>
            <article className="admin-analytics-metric">
              <span className="admin-muted">
                Registrations in previous {summary.window.days} days
              </span>
              <strong>
                {typeof summary.users.previousRegistered === 'number'
                  ? summary.users.previousRegistered.toLocaleString()
                  : '—'}
              </strong>
            </article>
            <article className="admin-analytics-metric">
              <span className="admin-muted">Change from previous period</span>
              <strong>{registrationChangeLabel(summary.users)}</strong>
            </article>
            <article className="admin-analytics-metric">
              <span className="admin-muted">Registrations in selected window (%)</span>
              <strong>
                {summary.users.totalRegistered > 0
                  ? `${(
                      (Math.min(summary.users.newRegistered, summary.users.totalRegistered) /
                        summary.users.totalRegistered) *
                      100
                    ).toFixed(1)}%`
                  : '—'}
              </strong>
            </article>
          </div>
          <p className="admin-muted admin-analytics-footnote">
            Window: last {summary.window.days} days. Data is aggregate-only and loaded with no-store
            caching. Recent logins count accounts by their latest successful sign-in, not daily
            active users or in-app activity. Trips created counts saved trip records, not unique
            travelers or overall engagement. Unique creators are distinct accounts that saved at
            least one trip. Trip creator share uses all registered accounts as the denominator,
            not just new registrations.
          </p>
        </>
      ) : null}
    </section>
  );
}
