'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ArrowRight, LockKeyhole, Mail } from 'lucide-react';

import { apiClient } from '../../lib/api-client.js';

export function LoginForm({ messages }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  async function submit(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError('');

    try {
      await apiClient.login({
        email: String(form.get('email') ?? '').trim(),
        password: String(form.get('password') ?? ''),
      });
      router.push('/trips');
      router.refresh();
    } catch {
      // Authentication responses stay generic so the UI does not help attackers
      // determine whether an email address is registered.
      setError(messages.loginFailed);
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
        <div className="auth-input"><LockKeyhole size={18} /><input name="password" type="password" autoComplete="current-password" required /></div>
      </label>
      {error ? <p className="auth-error" role="alert">{error}</p> : null}
      <button className="button button--dark auth-submit" type="submit" disabled={pending}>
        {pending ? messages.working : messages.signIn}
        {!pending ? <ArrowRight size={17} /> : null}
      </button>
      <p className="auth-switch">{messages.newHere} <Link href="/register">{messages.createAccount}</Link></p>
    </form>
  );
}
