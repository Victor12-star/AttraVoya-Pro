'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ArrowRight, Mail } from 'lucide-react';

import { apiClient } from '../../lib/api-client.js';

export function ForgotPasswordForm({ authMessages, messages }) {
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  async function submit(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setStatus('');
    setError('');

    try {
      await apiClient.forgotPassword(String(form.get('email') ?? '').trim());
      // The API deliberately returns the same response whether the account
      // exists or not, preventing account enumeration from this screen.
      setStatus(messages.resetSent);
    } catch {
      setError(messages.resetFailed);
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="auth-form" onSubmit={submit}>
      <label>
        <span>{authMessages.email}</span>
        <div className="auth-input">
          <Mail size={18} />
          <input name="email" type="email" autoComplete="email" required />
        </div>
      </label>
      {status ? (
        <p className="auth-success" role="status">
          {status}
        </p>
      ) : null}
      {error ? (
        <p className="auth-error" role="alert">
          {error}
        </p>
      ) : null}
      <button className="button button--dark auth-submit" type="submit" disabled={pending}>
        {pending ? authMessages.working : messages.sendReset}
        {!pending ? <ArrowRight size={17} /> : null}
      </button>
      <p className="auth-switch">
        <Link href="/login">{messages.backToSignIn}</Link>
      </p>
    </form>
  );
}
