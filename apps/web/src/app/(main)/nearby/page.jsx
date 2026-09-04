import { getCountryDisplayName } from '@attravoya/localization';

import { NearbyDestinationPage } from '../../../features/destinations/nearby-page.jsx';
import { parseDestinationContext } from '../../../features/destinations/destination-context.js';
import { loadMessages } from '../../../i18n/messages.js';
import { getRequestLocale } from '../../../i18n/request-locale.js';

export default async function NearbyRoutePage({ searchParams }) {
  const [resolvedSearchParams, locale] = await Promise.all([searchParams, getRequestLocale()]);
  const messages = await loadMessages(locale);
  const destination = parseDestinationContext(resolvedSearchParams);

  return (
    <NearbyDestinationPage
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
