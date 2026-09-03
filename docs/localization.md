# Localization architecture

AttraVoya Pro treats **country**, **language**, and **currency** as separate user preferences. A traveller may live in Sweden, prefer English UI text, and still choose SEK as the home currency.

## Global country coverage

`@attravoya/localization` contains the complete 249-code ISO 3166-1 country reference set used by the platform. Country names are localized at runtime with `Intl.DisplayNames`, so the same country can appear as `Germany`, `Tyskland`, `Alemania`, etc. without maintaining hundreds of duplicate country-name translations in PostgreSQL.

The shared country reference also carries non-safety metadata used to seed PostgreSQL, including ISO codes, associated languages, current currencies, and available IANA time zones. Emergency numbers are **not** part of this reference data and must use the separately verified emergency workflow.

## UI languages

Initial application UI locales:

`en`, `sv`, `es`, `fr`, `de`, `it`, `pt`, `pl`, `nl`, `no`, `da`, `fi`, `tr`, `ar`, `zh`, `ja`, `ko`, `hi`.

The architecture supports adding more UI locales without changing feature components. Spoken languages are broader than UI locales and are stored independently in PostgreSQL.

## Interface translation vs traveller translation

These are deliberately different systems:

- **Interface localization** uses maintained application message files. Navigation, forms, errors, buttons and accessibility labels must not depend on a live translation API.
- **Traveller translation** will use the `TranslationProvider` abstraction (LibreTranslate during development) for user-entered phrases.

This split keeps application navigation predictable, cacheable and SEO-friendly and prevents a translation-provider outage from making the site unusable.

## Translation completeness

Run:

```bash
pnpm translations:check
```

The checker ensures every enabled UI locale has exactly the same message keys as English and rejects missing/blank messages.

Baseline translations require native-speaker review before a locale is enabled for public commercial release. Safety-critical phrases require a separate verified-content review and must never be assumed correct merely because an automatic translation exists.

## Right-to-left support

Arabic is configured as `rtl`. Layout components should use logical CSS properties (`margin-inline`, `padding-inline`, `inset-inline`, etc.) where practical so components naturally support both LTR and RTL layouts.

## Locale preference cookie

The website may mirror only the selected UI locale into the non-sensitive `attravoya_locale` preference cookie. Authentication cookies are separate HttpOnly cookies. Large values such as recent searches do not belong in cookies.

## Next.js routing integration

The shared data/message foundation is complete before page construction. Locale-prefixed Next.js routing will be activated with a mature routing layer during the customer-site phase after dependency installation can regenerate the lockfile in the target Node 24/pnpm environment. Do not create a second competing translation system in the meantime.
