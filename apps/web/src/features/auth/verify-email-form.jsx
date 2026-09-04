'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { ArrowRight, Mail } from 'lucide-react';

import { apiClient } from '../../lib/api-client.js';

export function VerifyEmailForm({ authMessages, messages }) {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const [verifyPending, setVerifyPending] = useState(false);
  const [verifySuccess, setVerifySuccess] = useState('');
  const [verifyError, setVerifyError] = useState(token ? '' : messages.verifyInvalid);
  const [resendPending, setResendPending] = useState(false);
  const [resendStatus, setResendStatus] = useState('');
  const [resendError, setResendError] = useState('');

  async function verify(event) {
    event.preventDefault();
    if (!token) {
      setVerifyError(messages.verifyInvalid);
      return;
    }

    setVerifyPending(true);
    setVerifySuccess('');
    setVerifyError('');
    try {
      // Verification is button-driven rather than automatic on mount. This
      // prevents React development double-effects from consuming a one-time token twice.
      await apiClient.verifyEmail(token);
      setVerifySuccess(messages.verifySuccess);
    } catch {
      setVerifyError(messages.verifyInvalid);
    } finally {
      setVerifyPending(false);
    }
  }

  async function resend(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setResendPending(true);
    setResendStatus('');
    setResendError('');

    try {
      await apiClient.resendVerification(String(form.get('email') ?? '').trim());
      // The response is intentionally generic so this form cannot reveal
      // whether an address is registered or already verified.
      setResendStatus(messages.resendSent);
    } catch {
      setResendError(messages.resendFailed);
    } finally {
      setResendPending(false);
    }
  }

  return (
    <div className="auth-form">
      <form onSubmit={verify}>
        {verifySuccess ? (
          <p className="auth-success" role="status">
            {verifySuccess}
          </p>
        ) : null}
        {verifyError ? (
          <p className="auth-error" role="alert">
            {verifyError}
          </p>
        ) : null}
        <button
          className="button button--dark auth-submit"
          type="submit"
          disabled={verifyPending || !token || Boolean(verifySuccess)}
        >
          {verifyPending ? authMessages.working : messages.verifyButton}
          {!verifyPending ? <ArrowRight size={17} /> : null}
        </button>
      </form>

      <p className="auth-switch">{messages.resendPrompt}</p>
      <form className="auth-form" onSubmit={resend}>
        <label>
          <span>{authMessages.email}</span>
          <div className="auth-input">
            <Mail size={18} />
            <input name="email" type="email" autoComplete="email" required />
          </div>
        </label>
        {resendStatus ? (
          <p className="auth-success" role="status">
            {resendStatus}
          </p>
        ) : null}
        {resendError ? (
          <p className="auth-error" role="alert">
            {resendError}
          </p>
        ) : null}
        <button className="button button--dark auth-submit" type="submit" disabled={resendPending}>
          {resendPending ? authMessages.working : messages.resendButton}
        </button>
      </form>
      <p className="auth-switch">
        <Link href="/login">{messages.backToSignIn}</Link>
      </p>
    </div>
  );
}
