import { getCountryDisplayName } from '@attravoya/localization';

import { parseDestinationSelection } from '../../../../../features/destinations/destination-route.js';
import { TransportDestinationPage } from '../../../../../features/destinations/transport-page.jsx';
import { loadMessages } from '../../../../../i18n/messages.js';
import { getRequestLocale } from '../../../../../i18n/request-locale.js';

export default async function DestinationTransportRoutePage({ params, searchParams }) {
  const [{ slug }, resolvedSearchParams, locale] = await Promise.all([
    params,
    searchParams,
    getRequestLocale(),
  ]);
  const messages = await loadMessages(locale);
  const destination = parseDestinationSelection({ slug, searchParams: resolvedSearchParams });
  const googleMapsBrowserKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY ?? '';
  const safeRideGoogleEnabled = process.env.NEXT_PUBLIC_SAFE_RIDE_GOOGLE_ENABLED === 'true';

  return (
    <TransportDestinationPage
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
      googleMapsBrowserKey={googleMapsBrowserKey}
      safeRideGoogleEnabled={safeRideGoogleEnabled}
    />
  );
}
