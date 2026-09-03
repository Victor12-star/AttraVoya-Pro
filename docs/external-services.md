# External service architecture

AttraVoya Pro keeps external travel providers behind provider-neutral contracts.
The website, mobile app, Admin app, and business services must not depend on a
provider's raw response shape.

```text
Feature / service
      ↓
Provider contract
      ↓
Provider factory
      ↓
Provider adapter
      ↓
Normalizer
      ↓
External API
```

This design lets development use free/free-tier providers while preserving the
ability to switch providers before commercial launch.

## Phase 6A connected providers

### Geoapify — places, geocoding, routing, accommodation locations

Environment:

```env
MAPS_PROVIDER=geoapify
PLACES_PROVIDER=geoapify
ACCOMMODATION_PROVIDER=geoapify
GEOAPIFY_API_KEY=
```

Current adapter capabilities:

- address/destination autocomplete;
- nearby place search by stable AttraVoya category group;
- geocoding and reverse geocoding provider methods;
- route calculation provider method;
- accommodation **location** discovery.

Geoapify is not treated as a live room-inventory provider. The accommodation
adapter intentionally returns these fields as unavailable when Geoapify is the
source:

```text
livePrice = null
liveAvailability = null
cancellationPolicy = null
inventoryDataAvailable = false
```

That prevents a location/POI API from being misrepresented as booking data.

Official documentation:

- https://apidocs.geoapify.com/docs/geocoding/address-autocomplete/
- https://apidocs.geoapify.com/docs/geocoding/
- https://apidocs.geoapify.com/docs/places/
- https://apidocs.geoapify.com/docs/routing/

### Open-Meteo — current weather and forecast

Environment:

```env
WEATHER_PROVIDER=openmeteo
```

No key is required for the current development integration. The adapter asks for
current temperature, apparent temperature, precipitation, weather code, cloud
cover, wind, and a daily forecast. Results are normalized and cached by rounded
coordinates to avoid repeated calls caused by tiny GPS movement.

Official documentation:

- https://open-meteo.com/en/docs

### Frankfurter v2 — currency rates

Environment:

```env
CURRENCY_PROVIDER=frankfurter
```

No key is required. AttraVoya uses Frankfurter v2 rates and performs conversion
inside the application from the returned rate. Converted values are always
marked `approximate: true` because banks, card networks, ATMs, and exchange
providers can use different rates or fees.

Official documentation:

- https://frankfurter.dev/

### LibreTranslate — traveller-entered translation

Environment:

```env
TRANSLATION_PROVIDER=libretranslate
LIBRETRANSLATE_URL=http://localhost:5001
```

LibreTranslate runs in local Docker during development. Traveller-entered text
is not cached by AttraVoya's provider layer because phrases may contain private
or sensitive information. Supported language metadata may be cached.

This service is for dynamic travel communication. It is separate from the
maintained website UI dictionaries used to translate the AttraVoya interface.
Verified emergency numbers are separate from both systems and are never
machine-generated.

Official documentation:

- https://docs.libretranslate.com/
- https://docs.libretranslate.com/api/operations/translate/

## Public API routes introduced in Phase 6A

```text
GET  /api/v1/weather
GET  /api/v1/currency/rates
GET  /api/v1/currency/convert
GET  /api/v1/places/autocomplete
GET  /api/v1/places/nearby
GET  /api/v1/translation/languages
POST /api/v1/translation
GET  /api/v1/accommodation/nearby
```

All input is validated with shared Zod schemas before provider calls.

## Resilience and cost control

The provider HTTP layer implements:

- request timeout;
- controlled exponential retry for transient GET failures;
- no tight-loop retry for HTTP 429;
- provider-specific error mapping;
- response JSON validation boundaries;
- bounded TTL caches for weather, currency, geocoding and places;
- no caching of traveller-entered translation text.

A provider failure must remain isolated to the affected feature. It must not
crash an entire destination page.

## Provider credentials

Provider credentials are read only when a provider is actually called. This is
intentional: AttraVoya can run authentication, database, localization and other
features before every free API account has been created.

Never put provider keys in browser or mobile source code. Never commit `.env`.
The Admin provider-status UI may later display `API key configured` but must
never display the secret itself.

## Next provider batch

Phase 6B will connect the remaining development services through the same
architecture:

- Ticketmaster Discovery API — events;
- NewsData.io — traveller-relevant local news;
- Pexels — destination imagery;
- Resend — transactional email delivery.

Live flight fares and live accommodation room pricing remain intentionally
unavailable until approved real providers are connected. Test/sandbox prices
must never be presented as live public prices.

## Commercial-launch review

Before public/commercial launch, re-check for every provider:

- current commercial-use permission;
- pricing and quota;
- caching restrictions;
- attribution requirements;
- privacy/GDPR impact;
- production reliability and support;
- API version/deprecation policy.
