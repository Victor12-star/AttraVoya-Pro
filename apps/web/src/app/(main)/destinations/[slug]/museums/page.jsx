import { getCountryDisplayName } from '@attravoya/localization';

import { parseDestinationSelection } from '../../../../../features/destinations/destination-route.js';
import { MuseumsDestinationPage } from '../../../../../features/destinations/museums-page.jsx';
import { loadMessages } from '../../../../../i18n/messages.js';
import { getRequestLocale } from '../../../../../i18n/request-locale.js';

export default async function DestinationMuseumsRoutePage({ params, searchParams }) {
  const [{ slug }, resolvedSearchParams, locale] = await Promise.all([
    params,
    searchParams,
    getRequestLocale(),
  ]);
  const messages = await loadMessages(locale);
  const destination = parseDestinationSelection({ slug, searchParams: resolvedSearchParams });

  return (
    <MuseumsDestinationPage
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
