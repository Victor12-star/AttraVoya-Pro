import { getCountryDisplayName } from '@attravoya/localization';

import { HospitalsDestinationPage } from '../../../../../features/destinations/hospitals-page.jsx';
import { parseDestinationSelection } from '../../../../../features/destinations/destination-route.js';
import { loadMessages } from '../../../../../i18n/messages.js';
import { getRequestLocale } from '../../../../../i18n/request-locale.js';

export default async function DestinationHospitalsRoutePage({ params, searchParams }) {
  const [{ slug }, resolvedSearchParams, locale] = await Promise.all([
    params,
    searchParams,
    getRequestLocale(),
  ]);
  const messages = await loadMessages(locale);
  const destination = parseDestinationSelection({ slug, searchParams: resolvedSearchParams });

  return (
    <HospitalsDestinationPage
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
