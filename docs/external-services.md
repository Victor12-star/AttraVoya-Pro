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

## Connected development providers

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

### Ticketmaster Discovery API — events

Environment:

```env
EVENTS_PROVIDER=ticketmaster
TICKETMASTER_API_KEY=
EVENTS_CACHE_TTL_SECONDS=3600
```

The events adapter supports destination/country/keyword/classification/date and
coordinate-radius filters. It uses Ticketmaster's current `geoPoint` location
filter instead of the deprecated raw `latlong` parameter. Responses are
normalized so AttraVoya clients do not depend on Ticketmaster's nested payload.

Prices are not invented when Ticketmaster does not return pricing information.
The current live CI check runs only when `TICKETMASTER_API_KEY` is configured in
GitHub Secrets.

Official documentation:

- https://developer.ticketmaster.com/products-and-docs/apis/discovery-api/v2/

### NewsData.io — recent traveller-relevant news

Environment:

```env
NEWS_PROVIDER=newsdata
NEWSDATA_API_KEY=
NEWS_CACHE_TTL_SECONDS=1800
```

AttraVoya uses NewsData's `latest` endpoint and exposes only a normalized article
summary: title, description, source, publication metadata, image/video URL,
countries, categories, keywords and the original article link. Full article
content is deliberately not copied into AttraVoya API responses.

The current no-cost development contract limits requests to 10 results, matching
the free-tier request ceiling. At least one narrowing filter (query, country or
category) is required to avoid wasting quota on unbounded global requests.
NewsData pagination uses the provider's opaque `nextPage` token.

The free tier is **not treated as real-time breaking news**. AttraVoya marks
normalized responses with `realtimeGuaranteed: false`. City/region filtering is
not exposed because NewsData's region feature is a higher-tier capability; a
city name can instead be used as a search query together with a country filter.

Official documentation:

- https://newsdata.io/documentation
- https://newsdata.io/blog/latest-news-endpoint/

### Pexels — destination imagery

Environment:

```env
IMAGE_PROVIDER=pexels
PEXELS_API_KEY=
IMAGES_CACHE_TTL_SECONDS=86400
```

Pexels photo search is used only to enhance AttraVoya destination and travel
experiences; AttraVoya is not an image-library or wallpaper product. Search
supports Pexels' current orientation, minimum-size, color, locale and pagination
filters. The API key is sent only from the server through the `Authorization`
header.

Normalized responses deliberately include provider and photographer attribution
metadata so every web/mobile surface can link prominently to Pexels and credit
the photographer when possible. Search responses are cached for 24 hours by
default to conserve the development quota.

Pexels currently documents a default API limit of 200 requests/hour and 20,000
requests/month. Search can return up to 80 photos per page. API clients must not
attempt to bypass provider limits or use Pexels content to reproduce Pexels'
core service.

Official documentation:

- https://www.pexels.com/api/documentation/
- https://www.pexels.com/license/
- https://www.pexels.com/terms-of-service/

## Public provider API routes

```text
GET  /api/v1/weather
GET  /api/v1/currency/rates
GET  /api/v1/currency/convert
GET  /api/v1/places/autocomplete
GET  /api/v1/places/nearby
GET  /api/v1/translation/languages
POST /api/v1/translation
GET  /api/v1/accommodation/nearby
GET  /api/v1/events
GET  /api/v1/news
GET  /api/v1/images/search
```

All input is validated with shared Zod schemas before provider calls.

## Resilience and cost control

The provider HTTP layer implements:

- request timeout;
- controlled exponential retry for transient GET failures;
- no tight-loop retry for HTTP 429;
- provider-specific error mapping;
- response JSON validation boundaries;
- bounded TTL caches for weather, currency, geocoding, places, events, news and
  destination imagery;
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

The remaining Phase 6B development integration is:

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
