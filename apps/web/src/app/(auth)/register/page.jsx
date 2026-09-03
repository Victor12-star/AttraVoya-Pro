import { RegisterForm } from '../../../features/auth/register-form.jsx';
import { getRequestLocale } from '../../../i18n/request-locale.js';
import { loadMessages } from '../../../i18n/messages.js';

export default async function RegisterPage() {
  const locale = await getRequestLocale();
  const messages = await loadMessages(locale);

  return (
    <section className="auth-page shell">
      <div className="auth-visual auth-visual--register" aria-hidden="true" />
      <div className="auth-card">
        <span className="eyebrow">AttraVoya Pro</span>
        <h1>{messages.auth.registerTitle}</h1>
        <p>{messages.auth.registerSubtitle}</p>
        <RegisterForm messages={messages.auth} />
      </div>
    </section>
  );
}
