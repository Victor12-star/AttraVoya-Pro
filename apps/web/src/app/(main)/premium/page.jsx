import { SubscriptionStatusPage } from '../../../features/subscriptions/subscription-status-page.jsx';
import { getSubscriptionStatusCopy } from '../../../features/subscriptions/subscription-status-copy.js';
import { getRequestLocale } from '../../../i18n/request-locale.js';
import { loadMessages } from '../../../i18n/messages.js';

export default async function PremiumPage() {
  const locale = await getRequestLocale();
  const messages = await loadMessages(locale);

  return (
    <SubscriptionStatusPage
      locale={locale}
      copy={getSubscriptionStatusCopy(locale)}
      common={messages.common}
      signInLabel={messages.navigation.signIn}
    />
  );
}
