# AttraVoya Pro working plan

This plan is both the engineering roadmap and the learning roadmap. Work moves
in controlled phases; a phase is not complete until its checks pass or any
remaining limitation is documented honestly.

## Working rhythm

For each phase:

1. **Understand** — inspect the existing code and dependencies before editing.
2. **Design** — define the domain/API/security decision and record important reasoning.
3. **Implement** — change the smallest coherent set of files needed for a working slice.
4. **Verify** — syntax, lint, tests, build/runtime checks, and security checks appropriate to the phase.
5. **Explain** — document the important files and concepts in plain language.
6. **Checkpoint** — create a clean archive before moving to the next phase.

Normal engineering decisions are made without repeatedly stopping the product
owner. Product, branding, pricing, destructive changes, provider-account, and
legal/commercial decisions are surfaced for approval.

## Phase 1 — Foundation repair

Status: completed foundation checkpoint; runtime verification still depends on a
Node 24 + pnpm + Docker development environment.

- monorepo and environment configuration;
- PostgreSQL and LibreTranslate Docker services;
- Fastify liveness/readiness;
- request IDs, safe logging, base security headers, CORS and rate limits;
- local secret generation and environment validation.

**Learn:** monorepo, environment variables, Docker, liveness vs readiness.

## Phase 2 — Database and budget-first domain

Status: core schema established and continuing to evolve before first migration.

- identity, roles, permissions, plans and entitlements;
- countries, languages, currencies, cities, destinations and airports;
- budget-first travel requests and recommendations;
- versioned budget plans and actual trip expenses;
- verified emergency information;
- provider status, feature flags and audit history;
- accommodation preferences and whole-trip lodging cost snapshots.

**Learn:** model, table, relation, primary key, foreign key, index, migration.

## Phase 3 — Backend security architecture

Status: core authentication/session foundation implemented; runtime integration verification remains pending on the target environment.

- stable API error contract;
- JWT access-token verification;
- database-backed account/role/permission checks;
- route authorization hooks;
- authentication endpoints and secure refresh sessions;
- route-specific brute-force/rate limits;
- email verification and password reset foundation;
- security tests for auth and permission bypass.

**Learn:** route → validation → controller → service → repository → database,
authentication vs authorization, JWT, session, RBAC.

## Phase 4 — Global localization foundation

Status: Phase 4A shared reference/message/API foundation implemented; locale-prefixed page routing and visual language selector continue with the customer design shell.

- global ISO country data;
- country/language/currency preferences kept separate;
- Next.js locale routing and full interface dictionaries;
- language selector in the main header;
- localized country names;
- Arabic/right-to-left layout;
- translation completeness checks.

**Learn:** internationalization (i18n), localization (l10n), locale, RTL.

## Phase 5 — Professional design system

Status: Phase 5A customer design shell implemented; full Next.js browser/build verification awaits the target Linux SWC/Node 24 + pnpm runtime.

- original AttraVoya Pro visual identity based on modern professional travel UX research;
- typography, spacing, colors, radius, surfaces, shadows and motion tokens;
- Light/Dark/System themes;
- Lucide icons for web/admin/mobile;
- accessible buttons, forms, search, menus, dialogs, cards and feedback states;
- no AI-generated icons or generic AI-template aesthetic.

**Learn:** design tokens, reusable components, responsive design, accessibility.

## Phase 6 — Real provider platform

Status: Phase 6A core provider infrastructure and the first real development adapters are implemented; full runtime integration tests remain pending on the target Node 24 + pnpm + Docker environment.

- provider contracts, factories, registries and normalizers;
- caching, deduplication, timeouts and controlled retries;
- Geoapify, Open-Meteo, Frankfurter and local LibreTranslate first;
- Ticketmaster, NewsData, Pexels and Resend next;
- flights/live room prices remain explicitly unavailable until a real approved provider exists.

**Learn:** adapter pattern, API normalization, rate limits, caching, failure isolation.

## Phase 7 — Customer website vertical slices

Build each feature end-to-end instead of creating disconnected pages:

1. homepage + global search;
2. destination page;
3. restaurants / attractions / beaches / shopping;
4. accommodation choices + Stay Near What Matters;
5. family/children planning;
6. weather / currency / translation / events / news;
7. nearby;
8. safety/emergency;
9. trips and favorites;
10. budget-first destination discovery and replanning;
11. flight/accommodation provider-ready search.

Every slice includes database/API/UI/translation/accessibility/testing as needed.

## Phase 8 — Admin

- users, roles, subscriptions and Premium status;
- country/city/destination/reference data;
- verified emergency records;
- provider health, feature flags and audit logs;
- localization status.

## Phase 9 — Mobile

Reuse the same backend. Prioritize Explore, Trips, Nearby, GPS, maps, emergency,
translation, currency, family planning and Trip Mode.

## Phase 10 — Security and quality gate

- authentication/authorization/RBAC tests;
- Premium/Admin bypass tests;
- IDOR, XSS, CSRF where applicable, injection and rate-limit tests;
- security headers/CSP/CORS/cookie/session checks;
- dependency and secret scanning;
- accessibility, responsive, performance and button/workflow tests.

## Phase 11 — Documentation and release preparation

Complete README and architecture/API/database/auth/security/accessibility/testing/
deployment/provider documentation. Re-check commercial API terms, privacy/GDPR,
production hosting and monitoring before public launch.

## Definition of done

A feature is complete only when the applicable items are true:

- working implementation;
- validation and authorization;
- safe error handling;
- loading/success/empty/error/disabled states;
- complete UI translation;
- accessible keyboard/touch/screen-reader behavior;
- responsive layout;
- meaningful comments for non-obvious decisions;
- automated tests;
- no exposed secrets or unresolved critical errors.


## Current checkpoint — Phase 6A

The first real provider platform is implemented: shared timeout/retry/error/cache infrastructure plus Open-Meteo, Frankfurter v2, LibreTranslate, Geoapify place/geocoding/routing foundations, and honest accommodation-location discovery. New provider routes are validated through shared Zod schemas and exposed through the shared API client. Live flight fares and live room prices remain deliberately unavailable rather than fabricated.
