import { VerifyEmailForm } from '../../../features/auth/verify-email-form.jsx';
import { getAuthRecoveryMessages } from '../../../i18n/auth-recovery-messages.js';
import { loadMessages } from '../../../i18n/messages.js';
import { getRequestLocale } from '../../../i18n/request-locale.js';

export default async function VerifyEmailPage() {
  const locale = await getRequestLocale();
  const messages = await loadMessages(locale);
  const recoveryMessages = getAuthRecoveryMessages(locale);

  return (
    <section className="auth-page shell">
      <div className="auth-visual auth-visual--login" aria-hidden="true" />
      <div className="auth-card">
        <span className="eyebrow">AttraVoya Pro</span>
        <h1>{recoveryMessages.verifyTitle}</h1>
        <p>{recoveryMessages.verifySubtitle}</p>
        <VerifyEmailForm authMessages={messages.auth} messages={recoveryMessages} />
      </div>
    </section>
  );
}
