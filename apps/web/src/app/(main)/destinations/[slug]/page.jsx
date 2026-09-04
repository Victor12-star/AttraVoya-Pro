import { getCountryDisplayName } from '@attravoya/localization';

import { DestinationPage } from '../../../../features/destinations/destination-page.jsx';
import { parseDestinationSelection } from '../../../../features/destinations/destination-route.js';
import { loadMessages } from '../../../../i18n/messages.js';
import { getRequestLocale } from '../../../../i18n/request-locale.js';

export default async function DestinationRoutePage({ params, searchParams }) {
  const [{ slug }, resolvedSearchParams, locale] = await Promise.all([
    params,
    searchParams,
    getRequestLocale(),
  ]);
  const messages = await loadMessages(locale);
  const destination = parseDestinationSelection({ slug, searchParams: resolvedSearchParams });

  return (
    <DestinationPage
      destination={
        destination
          ? {
              ...destination,
              countryDisplayName: getCountryDisplayName(destination.countryCode, locale),
            }
          : null
      }
      locale={locale}
      messages={messages}
    />
  );
}
