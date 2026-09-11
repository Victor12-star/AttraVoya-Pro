import { SessionSecurityPage } from '../../../features/profile/session-security-page.jsx';
import { getSessionSecurityCopy } from '../../../features/profile/session-security-copy.js';
import { getRequestLocale } from '../../../i18n/request-locale.js';
import { loadMessages } from '../../../i18n/messages.js';

export default async function ProfilePage() {
  const locale = await getRequestLocale();
  const messages = await loadMessages(locale);

  return (
    <SessionSecurityPage
      locale={locale}
      copy={getSessionSecurityCopy(locale)}
      common={messages.common}
      signInLabel={messages.navigation.signIn}
    />
  );
}
