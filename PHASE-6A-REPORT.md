# Phase 6A report — real provider platform

## Goal

Build the first real-data provider layer without introducing fake travel data or
coupling AttraVoya Pro to one vendor's response format.

## Implemented

### Shared provider infrastructure

- bounded TTL provider cache;
- timeout-aware JSON HTTP client;
- controlled retries for transient GET failures;
- no automatic retry loop for HTTP 429;
- provider authentication/rate-limit/unavailable/response errors;
- provider credentials loaded only when the affected provider is called.

### Real development adapters

- Open-Meteo weather;
- Frankfurter v2 currency conversion/rates;
- LibreTranslate local traveller translation;
- Geoapify destination autocomplete and nearby places;
- Geoapify geocoding/reverse geocoding/routing provider foundation;
- Geoapify accommodation-location discovery.

### Honest accommodation boundary

Geoapify place records are normalized into stay locations, but the API does not
invent room price, availability, cancellation policy, breakfast, or kitchen
information. Unsupported requested stay types are returned separately rather
than silently relabelled.

### API routes

- `/api/v1/weather`
- `/api/v1/currency/rates`
- `/api/v1/currency/convert`
- `/api/v1/places/autocomplete`
- `/api/v1/places/nearby`
- `/api/v1/translation/languages`
- `/api/v1/translation`
- `/api/v1/accommodation/nearby`

### Shared client

`@attravoya/api-client` now exposes methods for the new provider routes, so web,
Admin, and mobile do not duplicate request/error handling.

### Validation

New shared Zod schemas validate coordinates, forecast length, currency codes,
place categories, search radius, translation text/languages, and accommodation
filters before external calls.

## Verification performed in this environment

- Babel parser: 509 JS/JSX/MJS files parsed with zero syntax failures after the provider changes.
- Dependency-light provider smoke test: passed for provider HTTP transport, Open-Meteo normalization, Frankfurter conversion, and LibreTranslate normalization.
- Geoapify/accommodation adapter smoke test: passed using an injected HTTP response; verified no live price is invented.
- JSON parsing: checked during checkpoint packaging.

## Runtime test limitation

A full Vitest run was attempted using the dependency snapshot available in this
execution environment. It could not start because that snapshot lacks the Linux
native Rolldown binding. Internet/package installation is unavailable here, so
the missing optional native package cannot be repaired in this environment.

This is not marked as a passing test. Run the complete suite after installing
packages on the target Node 24 + pnpm development environment.

## Required local verification

```bash
corepack enable
pnpm install
pnpm check:js
pnpm test
pnpm providers:smoke
docker compose up -d
pnpm db:generate
pnpm dev:server
```

Then test the real no-key providers:

```text
GET /api/v1/weather?latitude=59.3293&longitude=18.0686&forecastDays=3
GET /api/v1/currency/convert?amount=1000&from=SEK&to=EUR
GET /api/v1/translation/languages
```

Geoapify endpoints should return a clear provider-not-configured response until
`GEOAPIFY_API_KEY` is added locally.

## What a developer should learn

A provider adapter is a translation boundary. The rest of AttraVoya should ask
for concepts such as `getForecast()` or `searchNearby()` rather than importing
Open-Meteo/Geoapify JSON formats throughout the application. That makes the
product easier to test, safer to change, and cheaper to migrate later.
