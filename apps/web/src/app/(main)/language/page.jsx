import { TravelCompanionPage } from '../../../features/language/travel-companion-page.jsx';
import { getRequestLocale } from '../../../i18n/request-locale.js';
import { loadMessages } from '../../../i18n/messages.js';

export default async function Page() {
  const locale = await getRequestLocale();
  const messages = await loadMessages(locale);

  return <TravelCompanionPage locale={locale} messages={messages} />;
}
