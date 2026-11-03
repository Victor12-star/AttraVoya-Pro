'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export function SessionSecurityPanel() {
  const router = useRouter();
  const [sessions, setSessions] = useState(
    /** @type {Array<{id:string;userAgent:string|null;createdAt:string;lastUsedAt:string;expiresAt:string}>} */ ([]),
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    async function fetchSessions() {
      setLoading(true);
      setError('');
      try {
        const response = await fetch('/api/admin/sessions', {
          credentials: 'same-origin',
          cache: 'no-store',
          signal: controller.signal,
        });
        const data = await response.json();
        if (cancelled) return;
        if (!response.ok) {
          setError(data.error ?? 'Unable to load sessions.');
          return;
        }
        setSessions(data.sessions ?? []);
      } catch {
        if (!cancelled) setError('Unable to load sessions.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void fetchSessions();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [refresh]);

  async function revokeSession(sessionId) {
    if (busy) return;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const response = await fetch(`/api/admin/sessions/${encodeURIComponent(sessionId)}`, {
        method: 'DELETE',
        credentials: 'same-origin',
        cache: 'no-store',
      });
      const result = await response.json();
      if (!response.ok) {
        setError(result.error ?? 'Unable to revoke this session.');
      } else {
        setMessage(
          'Session revoked. Previously issued access tokens may remain valid until expiration.',
        );
        setRefresh((value) => value + 1);
      }
    } catch {
      setError('Unable to revoke this session.');
    } finally {
      setBusy(false);
    }
  }

  async function revokeAll(event) {
    event.preventDefault();
    if (busy || confirmation !== 'SIGN OUT ALL') return;
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/admin/sessions', {
        method: 'DELETE',
        credentials: 'same-origin',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmation }),
      });
      const result = await response.json();
      if (!response.ok) {
        setError(result.error ?? 'Unable to revoke sessions.');
        return;
      }
      setConfirmation('');
      router.replace('/login?sessionsRevoked=1');
      router.refresh();
    } catch {
      setError('Unable to revoke sessions.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="admin-card admin-security-sessions">
      <h2>Devices &amp; active sessions</h2>
      <p className="admin-muted">
        Review sessions associated with your account and revoke those you do not recognize. Refresh
        sessions are revoked immediately, but issued access tokens can remain usable until their
        short expiration period.
      </p>
      <button
        type="button"
        disabled={loading || busy}
        onClick={() => setRefresh((value) => value + 1)}
      >
        Refresh sessions
      </button>
      {loading ? <p role="status">Loading sessions…</p> : null}
      {error ? <p role="alert">{error}</p> : null}
      {message ? <p role="status">{message}</p> : null}
      {!loading && !error && sessions.length === 0 ? (
        <p>No active refresh sessions found.</p>
      ) : null}
      {!loading && sessions.length > 0 ? (
        <ul className="admin-session-list">
          {sessions.map((session) => (
            <li key={session.id}>
              <div>
                <strong>{session.userAgent || 'Unknown device or browser'}</strong>
                <p className="admin-muted">
                  Last used: {new Date(session.lastUsedAt).toLocaleString()}
                </p>
                <p className="admin-muted">
                  Expires: {new Date(session.expiresAt).toLocaleString()}
                </p>
              </div>
              <button type="button" disabled={busy} onClick={() => revokeSession(session.id)}>
                Revoke session
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <form className="admin-security-emergency" onSubmit={revokeAll}>
        <h3>Emergency: sign out all devices</h3>
        <p className="admin-muted">
          If you suspect unauthorized access, revoke all refresh sessions, then change your password
          and secure your email account. This will sign out this browser too.
        </p>
        <label htmlFor="emergency-confirmation">Type SIGN OUT ALL to confirm</label>
        <input
          id="emergency-confirmation"
          value={confirmation}
          disabled={busy}
          onChange={(event) => setConfirmation(event.target.value)}
          autoComplete="off"
          required
        />
        <button type="submit" disabled={busy || confirmation !== 'SIGN OUT ALL'}>
          {busy ? 'Revoking…' : 'Sign out all devices'}
        </button>
      </form>
    </section>
  );
}
