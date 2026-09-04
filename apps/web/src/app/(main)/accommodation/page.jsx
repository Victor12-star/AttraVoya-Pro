import { getCountryDisplayName } from '@attravoya/localization';

import { AccommodationPage } from '../../../features/destinations/accommodation-page.jsx';
import { parseDestinationContext } from '../../../features/destinations/destination-context.js';
import { loadMessages } from '../../../i18n/messages.js';
import { getRequestLocale } from '../../../i18n/request-locale.js';

export default async function AccommodationRoutePage({ searchParams }) {
  const [resolvedSearchParams, locale] = await Promise.all([searchParams, getRequestLocale()]);
  const messages = await loadMessages(locale);
  const destination = parseDestinationContext(resolvedSearchParams);

  return (
    <AccommodationPage
      destination={
        destination
          ? {
              ...destination,
              countryDisplayName:
                getCountryDisplayName(destination.countryCode, locale) ?? destination.countryCode,
            }
          : null
      }
      locale={locale}
      messages={messages}
    />
  );
}
