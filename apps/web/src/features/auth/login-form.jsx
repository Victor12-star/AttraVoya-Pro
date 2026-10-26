'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ArrowRight, LockKeyhole, Mail } from 'lucide-react';

import { apiClient } from '../../lib/api-client.js';

export function LoginForm({ messages, recoveryMessages, returnTo = '/trips' }) {
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
      // A successful password response alone does not prove that the browser
      // retained the HttpOnly session cookie after the first-party proxy.
      try {
        await apiClient.listAuthSessions();
      } catch {
        // The password request completed, but the browser has not proved it
        // can use its HttpOnly session. Avoid falsely blaming credentials.
        setError(
          'Sign-in was accepted, but this browser could not confirm your session. Check that cookies are allowed, then try again.',
        );
        return;
      }
      window.dispatchEvent(new Event('attravoya:auth-changed'));
      router.push(returnTo);
      router.refresh();
    } catch (error) {
      // Only genuine credential failures use the generic sign-in message.
      // A blocked or unavailable API must not be presented as a bad password.
      if (error?.status === 429) {
        setError('Too many sign-in attempts. Please try again later.');
      } else if (!error?.status || error.status >= 500 || error.status === 404) {
        setError('Sign-in service is unavailable. Please try again later.');
      } else {
        setError(messages.loginFailed);
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="auth-form" onSubmit={submit}>
      <label>
        <span>{messages.email}</span>
        <div className="auth-input">
          <Mail size={18} />
          <input name="email" type="email" autoComplete="email" required />
        </div>
      </label>
      <label>
        <span>{messages.password}</span>
        <div className="auth-input">
          <LockKeyhole size={18} />
          <input name="password" type="password" autoComplete="current-password" required />
        </div>
      </label>
      <p className="auth-switch">
        <Link href="/forgot-password">{recoveryMessages.forgotLink}</Link>
      </p>
      {error ? (
        <p className="auth-error" role="alert">
          {error}
        </p>
      ) : null}
      <button className="button button--dark auth-submit" type="submit" disabled={pending}>
        {pending ? messages.working : messages.signIn}
        {!pending ? <ArrowRight size={17} /> : null}
      </button>
      <p className="auth-switch">
        {messages.newHere} <Link href="/register">{messages.createAccount}</Link>
      </p>
    </form>
  );
}
