import { LoginForm } from '../../../features/auth/login-form.jsx';
import { getAuthRecoveryMessages } from '../../../i18n/auth-recovery-messages.js';
import { getRequestLocale } from '../../../i18n/request-locale.js';
import { loadMessages } from '../../../i18n/messages.js';

export default async function LoginPage() {
  const locale = await getRequestLocale();
  const messages = await loadMessages(locale);
  const recoveryMessages = getAuthRecoveryMessages(locale);

  return (
    <section className="auth-page shell">
      <div className="auth-visual auth-visual--login" aria-hidden="true" />
      <div className="auth-card">
        <span className="eyebrow">AttraVoya Pro</span>
        <h1>{messages.auth.title}</h1>
        <p>{messages.auth.subtitle}</p>
        <LoginForm messages={messages.auth} recoveryMessages={recoveryMessages} />
      </div>
    </section>
  );
}
