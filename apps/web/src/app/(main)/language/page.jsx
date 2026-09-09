import { TravelEmergencyMode } from '../../../features/emergency/travel-emergency-mode.jsx';
import { GroundedTravelAssistant } from '../../../features/language/grounded-travel-assistant.jsx';
import { TaxiDriverCardLauncher } from '../../../features/language/taxi-driver-card-launcher.jsx';
import { TravelCompanionPage } from '../../../features/language/travel-companion-page.jsx';
import { getRequestLocale } from '../../../i18n/request-locale.js';
import { loadMessages } from '../../../i18n/messages.js';

export default async function Page() {
  const locale = await getRequestLocale();
  const messages = await loadMessages(locale);
  const googleMapsBrowserKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY ?? '';
  const safeRideGoogleEnabled = process.env.NEXT_PUBLIC_SAFE_RIDE_GOOGLE_ENABLED === 'true';

  return (
    <>
      <TravelCompanionPage locale={locale} messages={messages} />
      <GroundedTravelAssistant locale={locale} messages={messages} />
      <TravelEmergencyMode locale={locale} messages={messages} />
      <TaxiDriverCardLauncher
        locale={locale}
        messages={messages}
        googleMapsBrowserKey={googleMapsBrowserKey}
        safeRideGoogleEnabled={safeRideGoogleEnabled}
      />
    </>
  );
}
