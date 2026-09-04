import { ProviderResponseError } from '../../errors/app-error.js';
import { requireProviderCredential } from '../http/provider-credentials.js';

const RESEND_EMAILS_ENDPOINT = 'https://api.resend.com/emails';

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function actionUrl(webUrl, path, token) {
  const url = new URL(path, webUrl);
  url.searchParams.set('token', token);
  return url.toString();
}

function verificationContent(webUrl, token) {
  const url = actionUrl(webUrl, '/verify-email', token);
  const safeUrl = escapeHtml(url);

  return {
    subject: 'Verify your AttraVoya Pro email',
    text: `Welcome to AttraVoya Pro. Verify your email by opening this link: ${url}\n\nThis link expires in 24 hours. If you did not create this account, you can ignore this email.`,
    html: `<p>Welcome to AttraVoya Pro.</p><p><a href="${safeUrl}">Verify your email</a></p><p>This link expires in 24 hours. If you did not create this account, you can ignore this email.</p>`,
  };
}

function passwordResetContent(webUrl, token) {
  const url = actionUrl(webUrl, '/reset-password', token);
  const safeUrl = escapeHtml(url);

  return {
    subject: 'Reset your AttraVoya Pro password',
    text: `Reset your AttraVoya Pro password by opening this link: ${url}\n\nThis link expires in 1 hour. If you did not request a password reset, you can ignore this email.`,
    html: `<p>We received a request to reset your AttraVoya Pro password.</p><p><a href="${safeUrl}">Reset your password</a></p><p>This link expires in 1 hour. If you did not request a password reset, you can ignore this email.</p>`,
  };
}

export function createResendEmailProvider({ http, apiKey, from, webUrl }) {
  function key() {
    return requireProviderCredential(apiKey, 'Resend', 'RESEND_API_KEY');
  }

  function sender() {
    return requireProviderCredential(from, 'Resend', 'EMAIL_FROM');
  }

  async function send({ to, content }) {
    const recipient = String(to ?? '').trim();
    if (!recipient) throw new TypeError('Email recipient is required.');

    const payload = await http.requestJson(RESEND_EMAILS_ENDPOINT, {
      method: 'POST',
      retry: false,
      headers: {
        Authorization: `Bearer ${key()}`,
      },
      body: {
        from: sender(),
        to: [recipient],
        subject: content.subject,
        text: content.text,
        html: content.html,
      },
    });

    if (!payload || typeof payload.id !== 'string' || !payload.id.trim()) {
      throw new ProviderResponseError('Resend returned an unexpected email response.');
    }

    return {
      provider: 'resend',
      messageId: payload.id,
    };
  }

  return {
    name: 'resend',

    sendVerificationEmail({ to, token }) {
      return send({ to, content: verificationContent(webUrl, token) });
    },

    sendPasswordResetEmail({ to, token }) {
      return send({ to, content: passwordResetContent(webUrl, token) });
    },
  };
}
