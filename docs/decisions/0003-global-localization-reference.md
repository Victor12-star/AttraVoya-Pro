# ADR 0003 — Global localization reference

## Status

Accepted.

## Context

AttraVoya Pro is global and must not hardcode a handful of countries or couple a country to one language. Storing translated names for every country in every UI locale would create duplication and constant maintenance work.

## Decision

Create the shared `@attravoya/localization` package as the canonical non-sensitive country/language/currency reference layer.

- Cover all 249 ISO 3166-1 country codes.
- Use `Intl.DisplayNames` for localized country/language/currency names where supported.
- Keep preferred country, language and currency independent.
- Seed stable reference metadata into PostgreSQL for backend relations and Admin management.
- Keep interface messages in maintained locale dictionaries.
- Keep traveller-entered translation behind `TranslationProvider`.
- Keep emergency/safety verification entirely separate from generic localization data.

## Consequences

The web, mobile and Admin applications can share one country/language model. Country selectors remain global without thousands of manually duplicated names. Adding a UI language requires a message file and review rather than database redesign.
