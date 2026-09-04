import { DestinationSearch } from '../../../features/destinations/destination-search.jsx';
import { getRequestLocale } from '../../../i18n/request-locale.js';
import { loadMessages } from '../../../i18n/messages.js';

export default async function DestinationsPage() {
  const locale = await getRequestLocale();
  const messages = await loadMessages(locale);

  return <DestinationSearch locale={locale} messages={messages} />;
}
