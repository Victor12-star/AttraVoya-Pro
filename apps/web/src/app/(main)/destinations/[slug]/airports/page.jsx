import { getCountryDisplayName } from '@attravoya/localization';

import { AirportsDestinationPage } from '../../../../../features/destinations/airports-page.jsx';
import { parseDestinationSelection } from '../../../../../features/destinations/destination-route.js';
import { loadMessages } from '../../../../../i18n/messages.js';
import { getRequestLocale } from '../../../../../i18n/request-locale.js';

export default async function DestinationAirportsRoutePage({ params, searchParams }) {
  const [{ slug }, resolvedSearchParams, locale] = await Promise.all([
    params,
    searchParams,
    getRequestLocale(),
  ]);
  const messages = await loadMessages(locale);
  const destination = parseDestinationSelection({ slug, searchParams: resolvedSearchParams });

  return (
    <AirportsDestinationPage
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
