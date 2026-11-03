'use client';

import { useState } from 'react';

export function AdminInviteForm() {
  const [email, setEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState(false);

  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(false);
    setMessage('');
    try {
      const response = await fetch('/api/admin/invitations', {
        method: 'POST',
        credentials: 'same-origin',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, currentPassword }),
      });
      const result = await response.json();
      if (!response.ok) {
        setError(true);
        setMessage(result.error ?? 'Could not send invitation.');
        return;
      }
      setMessage('Registration invitation sent. Once the person verifies their account, use Assign Admin role to grant access.');
      setCurrentPassword('');
      setEmail('');
    } catch {
      setError(true);
      setMessage('Invitation email service is temporarily unavailable.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="admin-login-form" onSubmit={submit}>
      <label htmlFor="invite-admin-email">Administrator email address</label>
      <input
        id="invite-admin-email"
        type="email"
        autoComplete="off"
        placeholder="colleague@example.com"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        maxLength={320}
        required
        disabled={busy}
      />
      <label htmlFor="invite-owner-password">Confirm your owner password</label>
      <input
        id="invite-owner-password"
        type="password"
        autoComplete="current-password"
        value={currentPassword}
        onChange={(event) => setCurrentPassword(event.target.value)}
        required
        disabled={busy}
      />
      <p className="admin-muted">
        The invitation links to regular account registration; it does not grant administrator privileges.
        After email verification, you must separately assign the Admin role below.
      </p>
      {message ? <p role={error ? 'alert' : 'status'}>{message}</p> : null}
      <button type="submit" disabled={busy}>
        {busy ? 'Sending invitation…' : 'Send administrator registration invitation'}
      </button>
    </form>
  );
}
