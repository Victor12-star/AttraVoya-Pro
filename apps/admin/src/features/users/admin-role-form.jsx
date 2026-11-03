'use client';

import { useState } from 'react';

export function AdminRoleForm() {
  const [email, setEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [action, setAction] = useState('grant');
  const [message, setMessage] = useState('');
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(false);
    setMessage('');
    try {
      const response = await fetch('/api/admin/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        cache: 'no-store',
        body: JSON.stringify({ email, currentPassword, action }),
      });
      const result = await response.json();
      if (!response.ok) {
        setError(true);
        setMessage(result.error ?? 'Unable to update administrator access.');
        return;
      }
      setMessage(result.changed
        ? `Administrator access ${action === 'grant' ? 'granted' : 'revoked'}. Previous sessions were revoked.`
        : 'No change was needed; the account already has the requested role state.');
      setCurrentPassword('');
    } catch {
      setError(true);
      setMessage('Role management is temporarily unavailable.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="admin-login-form" onSubmit={submit}>
      <label htmlFor="admin-role-email">Existing verified account email</label>
      <input id="admin-role-email" type="email" required autoComplete="off"
        maxLength={320} value={email} disabled={busy}
        onChange={(event) => setEmail(event.target.value)} />
      <label htmlFor="admin-role-action">Administrative action</label>
      <select id="admin-role-action" value={action} disabled={busy}
        onChange={(event) => setAction(event.target.value)}>
        <option value="grant">Assign Admin role</option>
        <option value="revoke">Remove Admin role</option>
      </select>
      <label htmlFor="admin-role-password">Confirm your owner password</label>
      <input id="admin-role-password" type="password" required autoComplete="current-password"
        value={currentPassword} disabled={busy}
        onChange={(event) => setCurrentPassword(event.target.value)} />
      <p className="admin-muted">
        The other person must already have a verified account. Only the Admin role can be changed
        here. Super Admin ownership cannot be transferred or removed here.
      </p>
      {message ? <p role={error ? 'alert' : 'status'}>{message}</p> : null}
      <button type="submit" disabled={busy}>
        {busy ? 'Updating…' : action === 'grant' ? 'Confirm Admin role assignment' : 'Confirm Admin role removal'}
      </button>
    </form>
  );
}
