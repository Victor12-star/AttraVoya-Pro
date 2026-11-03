'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function ChangePasswordForm() {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    if (newPassword !== confirmPassword) {
      setMessage('New passwords do not match.');
      return;
    }
    if (!/[A-Za-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      setMessage('New password must contain at least one letter and one number.');
      return;
    }
    setBusy(true);
    setMessage('');
    try {
      const response = await fetch('/api/admin/change-password', {
        method: 'POST',
        credentials: 'same-origin',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const result = await response.json();
      if (!response.ok) {
        setMessage(result.error ?? 'Password change failed.');
        return;
      }
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      router.replace('/login?passwordChanged=1');
      router.refresh();
    } catch {
      setMessage('Password change is temporarily unavailable.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="admin-login-form" onSubmit={submit}>
      <label htmlFor="security-current">Current password</label>
      <input
        id="security-current"
        type="password"
        autoComplete="current-password"
        required
        maxLength={128}
        value={currentPassword}
        onChange={(event) => setCurrentPassword(event.target.value)}
        disabled={busy}
      />
      <label htmlFor="security-new">New password</label>
      <input
        id="security-new"
        type="password"
        autoComplete="new-password"
        minLength={8}
        maxLength={128}
        required
        value={newPassword}
        onChange={(event) => setNewPassword(event.target.value)}
        disabled={busy}
      />
      <label htmlFor="security-confirm">Confirm new password</label>
      <input
        id="security-confirm"
        type="password"
        autoComplete="new-password"
        minLength={8}
        maxLength={128}
        required
        value={confirmPassword}
        onChange={(event) => setConfirmPassword(event.target.value)}
        disabled={busy}
      />
      <p className="admin-muted">
        Use 8 to 128 characters with at least one letter and one number. Changing your password
        signs out all refresh sessions. Previously issued access tokens may remain valid until they
        expire.
      </p>
      {message ? (
        <p role="alert" className="admin-login-error">
          {message}
        </p>
      ) : null}
      <button type="submit" disabled={busy}>
        {busy ? 'Updating…' : 'Change password and sign out devices'}
      </button>
    </form>
  );
}
