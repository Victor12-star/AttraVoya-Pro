'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { ArrowRight, LockKeyhole } from 'lucide-react';

import { apiClient } from '../../lib/api-client.js';

export function ResetPasswordForm({ authMessages, messages }) {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const [pending, setPending] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState(token ? '' : messages.resetInvalid);

  async function submit(event) {
    event.preventDefault();
    if (!token) {
      setError(messages.resetInvalid);
      return;
    }

    const form = new FormData(event.currentTarget);
    const password = String(form.get('password') ?? '');
    const confirmPassword = String(form.get('confirmPassword') ?? '');
    if (password !== confirmPassword) {
      setError(messages.passwordMismatch);
      return;
    }

    setPending(true);
    setSuccess('');
    setError('');

    try {
      await apiClient.resetPassword({ token, password });
      setSuccess(messages.resetSuccess);
      event.currentTarget.reset();
    } catch {
      setError(messages.resetInvalid);
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="auth-form" onSubmit={submit}>
      <label>
        <span>{messages.newPassword}</span>
        <div className="auth-input">
          <LockKeyhole size={18} />
          <input
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            maxLength={128}
            required
          />
        </div>
      </label>
      <label>
        <span>{messages.confirmNewPassword}</span>
        <div className="auth-input">
          <LockKeyhole size={18} />
          <input
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            minLength={8}
            maxLength={128}
            required
          />
        </div>
      </label>
      {success ? (
        <p className="auth-success" role="status">
          {success}
        </p>
      ) : null}
      {error ? (
        <p className="auth-error" role="alert">
          {error}
        </p>
      ) : null}
      <button
        className="button button--dark auth-submit"
        type="submit"
        disabled={pending || !token || Boolean(success)}
      >
        {pending ? authMessages.working : messages.resetButton}
        {!pending ? <ArrowRight size={17} /> : null}
      </button>
      <p className="auth-switch">
        <Link href="/login">{messages.backToSignIn}</Link>
      </p>
    </form>
  );
}
