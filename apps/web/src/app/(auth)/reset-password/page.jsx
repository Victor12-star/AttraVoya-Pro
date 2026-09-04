import { ResetPasswordForm } from '../../../features/auth/reset-password-form.jsx';
import { getAuthRecoveryMessages } from '../../../i18n/auth-recovery-messages.js';
import { loadMessages } from '../../../i18n/messages.js';
import { getRequestLocale } from '../../../i18n/request-locale.js';

export default async function ResetPasswordPage() {
  const locale = await getRequestLocale();
  const messages = await loadMessages(locale);
  const recoveryMessages = getAuthRecoveryMessages(locale);

  return (
    <section className="auth-page shell">
      <div className="auth-visual auth-visual--login" aria-hidden="true" />
      <div className="auth-card">
        <span className="eyebrow">AttraVoya Pro</span>
        <h1>{recoveryMessages.resetTitle}</h1>
        <p>{recoveryMessages.resetSubtitle}</p>
        <ResetPasswordForm authMessages={messages.auth} messages={recoveryMessages} />
      </div>
    </section>
  );
}
