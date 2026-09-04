import { CookiePreferences } from '../../components/feedback/cookie-preferences.jsx';
import { SiteFooter } from '../../components/layout/site-footer.jsx';
import { SiteHeader } from '../../components/navigation/site-header.jsx';
import { getRequestLocale } from '../../i18n/request-locale.js';
import { loadMessages } from '../../i18n/messages.js';

export default async function MainLayout({ children }) {
  const locale = await getRequestLocale();
  const messages = await loadMessages(locale);

  return (
    <div className="app-shell">
      <SiteHeader
        locale={locale}
        messages={messages}
        defaultCurrency={process.env.NEXT_PUBLIC_DEFAULT_CURRENCY ?? 'SEK'}
      />
      <main>{children}</main>
      <SiteFooter messages={messages} />
      <CookiePreferences messages={messages.cookies} />
    </div>
  );
}
