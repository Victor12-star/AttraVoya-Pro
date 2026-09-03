# Phase 4A report — Global localization foundation

## Implemented

- Added shared `@attravoya/localization` workspace package.
- Added all 249 ISO 3166-1 country codes.
- Added localized country display through `Intl.DisplayNames`.
- Added country-to-language/currency/time-zone reference metadata.
- Added 18 initial UI locales, including Arabic RTL metadata.
- Added 18 maintained message files with matching key structure.
- Added translation completeness checker.
- Added safe language preference cookie helper.
- Added optional cookie-consent state with preferences/analytics disabled by default.
- Hardened guest recent searches so they require preference consent and store only allowlisted criteria.
- Hardened browser preference validation for country/language/currency/theme.
- Added PostgreSQL seed logic for countries, languages, currencies and relationships.
- Added public cacheable `/api/v1/countries` and `/api/v1/languages` endpoints.
- Implemented the previously empty shared API client with normalized errors and web/mobile authentication transport support.
- Added documentation/ADR for localization decisions.

## Verified in this environment

- 5 localization reference tests passed with Node's built-in test runner.
- Translation parity check passed for 18 locales and 68 message keys.
- Changed JavaScript files pass `node --check` syntax validation.
- JSON and pnpm lock YAML parse successfully.

## Runtime checks still pending

The current execution environment does not contain the target Node 24.20 + pnpm dependency installation or Docker. Therefore the following are not marked complete yet:

- Prisma generate/migrate/seed against PostgreSQL;
- Fastify/Vitest country and language endpoint tests;
- full monorepo lint/checkJs/build;
- browser locale-routing and RTL end-to-end tests.

## Important design rule

Country selection may suggest a language, but never forces it. Country, preferred UI language and preferred currency remain independent user choices.
