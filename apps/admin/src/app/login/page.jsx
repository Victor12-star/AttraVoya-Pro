'use client';

import { useState } from 'react';

export default function AdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  async function signIn(event) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setMessage('');
    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        cache: 'no-store',
      });
      const result = await response.json();
      if (!response.ok) {
        setMessage(result.error ?? 'Unable to sign in. Please try again.');
        return;
      }
      window.location.assign('/dashboard/analytics');
    } catch {
      setMessage('Sign in is temporarily unavailable. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="admin-main">
      <section className="admin-card admin-login-card">
        <h1>Admin sign in</h1>
        <p className="admin-muted">Use an authorized AttraVoya Pro administrator account.</p>
        <form onSubmit={signIn} className="admin-login-form">
          <label htmlFor="admin-email">Email address</label>
          <input
            id="admin-email"
            type="email"
            autoComplete="username"
            required
            maxLength={320}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            disabled={busy}
          />
          <label htmlFor="admin-password">Password</label>
          <input
            id="admin-password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            disabled={busy}
          />
          {message ? <p role="alert" className="admin-login-error">{message}</p> : null}
          <button type="submit" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
        </form>
      </section>
    </main>
  );
}
