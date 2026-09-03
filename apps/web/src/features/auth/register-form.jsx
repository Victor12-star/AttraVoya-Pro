'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ArrowRight, LockKeyhole, Mail } from 'lucide-react';

import { apiClient } from '../../lib/api-client.js';

export function RegisterForm({ messages }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function submit(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const password = String(form.get('password') ?? '');
    const confirmPassword = String(form.get('confirmPassword') ?? '');

    setError('');
    setSuccess('');
    if (password !== confirmPassword) {
      setError(messages.registerFailed);
      return;
    }

    setPending(true);
    try {
      await apiClient.register({
        email: String(form.get('email') ?? '').trim(),
        password,
      });
      event.currentTarget.reset();
      setSuccess(messages.registered);
    } catch {
      setError(messages.registerFailed);
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="auth-form" onSubmit={submit}>
      <label>
        <span>{messages.email}</span>
        <div className="auth-input"><Mail size={18} /><input name="email" type="email" autoComplete="email" required /></div>
      </label>
      <label>
        <span>{messages.password}</span>
        <div className="auth-input"><LockKeyhole size={18} /><input name="password" type="password" minLength="8" autoComplete="new-password" required /></div>
      </label>
      <label>
        <span>{messages.confirmPassword}</span>
        <div className="auth-input"><LockKeyhole size={18} /><input name="confirmPassword" type="password" minLength="8" autoComplete="new-password" required /></div>
      </label>
      {error ? <p className="auth-error" role="alert">{error}</p> : null}
      {success ? <p className="auth-success" role="status">{success}</p> : null}
      <button className="button button--dark auth-submit" type="submit" disabled={pending}>
        {pending ? messages.working : messages.createAccount}
        {!pending ? <ArrowRight size={17} /> : null}
      </button>
      <p className="auth-switch">{messages.alreadyAccount} <Link href="/login">{messages.signIn}</Link></p>
    </form>
  );
}
