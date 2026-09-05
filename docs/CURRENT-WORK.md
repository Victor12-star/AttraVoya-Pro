# AttraVoya Pro — Current Work Handoff

Last updated: 2026-09-05

This file is the engineering handoff for continuing AttraVoya Pro without relying on chat history.

## Repository and workflow

- GitHub: `Victor12-star/AttraVoya-Pro`
- Working integration branch: `develop`
- `main` is not the day-to-day development branch.
- Latest verified merged checkpoint before the current PR: Phase 7M squash merge `5550c835b18ec2596c0b5f17264bf82325924cf3`.
- Phase 7M post-merge `develop` CI `#183` passed all five workflow jobs.
- Current pull request: `#14` from `feature/phase-7n-destination-transport` into `develop`.

Every vertical slice must follow this sequence:

1. Create a feature branch from the latest verified `develop` commit.
2. Implement one coherent slice only.
3. Open a pull request into `develop`.
4. Require all GitHub CI jobs to pass on the exact final PR head.
5. Merge only after the complete gate is green.
6. Verify the resulting `develop` push CI is also fully green.
7. Only then start the next slice.

The standard CI gate includes JavaScript checks, translation parity, provider smoke tests, ESLint, unit/integration tests, normal repository-wide Prettier formatting, PostgreSQL/Prisma verification, dependency/secret checks, production builds, and live-provider checks when credentials are available.

Never weaken CI to make a slice pass, and never claim a provider was live-verified when its required API key was not configured.

## Product and architecture foundation

The project is a JavaScript monorepo with a Next.js customer website, Next.js Admin app, Expo/React Native mobile app, Node.js/Fastify API, PostgreSQL/Prisma, Zod validation, shared API client, localization/global country system, authentication/session foundation, Guest/Free/Premium/Admin/Super Admin separation, budget-first trip-planning domain foundation, and verified-safety architecture.

Provider adapters already implemented include:

- Open-Meteo weather
- Frankfurter currency
- LibreTranslate translation
- Geoapify places/accommodation/geocoding/routing
- Ticketmaster events
- NewsData travel news
- Pexels destination imagery
- Resend transactional email

Provider secrets stay server-side. Never invent live travel prices, availability, emergency facts, ratings, opening times, exchange rates, safety claims, language facts, transport facts, event availability, or other provider data.

## Phase 7 destination progress

Completed and merged destination slices:

- Phase 7A — Global destination search API
- Phase 7B — Customer destination search UI
- Phase 7C — Destination page foundation
- Phase 7D — Attractions discovery
- Phase 7E — Restaurants discovery
- Phase 7F — Beaches discovery
- Phase 7G — Shopping discovery
- Phase 7H — Accommodation discovery
- Phase 7I — Family destination discovery
- Phase 7J — Nearby destination discovery
- Phase 7K — Verified Safety destination foundation
- Phase 7L — Destination currency and exchange
- Phase 7M — Destination Language foundation

Important verified later checkpoints:

- Phase 7G merged at `ff40f33f257ba2e2cb8688d65912e01aebd76403`; PR CI `#133` and post-merge CI `#134` green.
- Phase 7H merged at `05162952c277388fc143b4d45a2d8e1d94758294`; PR CI `#140` and post-merge CI `#141` green.
- Phase 7I merged at `cf05786c12279bf884e99312539d9f116f0de92d`; PR CI `#148` and post-merge CI `#149` green.
- Phase 7J merged at `3f4dc70cf173d954d92a7a002813a1124eaae552`; PR CI `#153` and post-merge CI `#154` green.
- Phase 7K merged at `2a6706dc9df52bcf35ddd844ac0a3a6fd2d9674f`; final PR CI `#165` and post-merge CI `#166` green.
- Phase 7L merged through PR `#12` by squash at `52da70966f08c03cd9b241d4e026ed334b6a1713`; final PR CI `#174` and post-merge `develop` CI `#175` green.
- Phase 7M merged through PR `#13` by squash at `5550c835b18ec2596c0b5f17264bf82325924cf3`; final PR CI `#182` and post-merge `develop` CI `#183` green.

### Phase 7M — Destination Language foundation

Completed and merged.

Key behavior now in `develop`:

- real destination-aware Language experience
- factual language data comes only from AttraVoya country reference data
- official/common status is never inferred from translation support or UI locale
- provider-neutral translation endpoints reused; browser never calls LibreTranslate directly
- optional machine translation appears only for provider-supported destination languages
- malformed/mismatched translation responses are rejected
- machine translation is clearly non-authoritative
- all 18 locales, RTL, responsive and reduced-motion support

### Phase 7N — Destination transport foundation

Current implementation is in PR `#14` from `feature/phase-7n-destination-transport` into `develop`.

The branch starts from the verified Phase 7M merge commit:

`5550c835b18ec2596c0b5f17264bf82325924cf3`

Implemented:

- replaced the destination Transport shell with a real destination-aware routing experience
- added provider-neutral public route `GET /api/v1/maps/route`
- reused the existing server-side Geoapify maps/routing adapter; browser never calls Geoapify directly
- shared validation accepts exactly two route points and only `walk`, `bicycle`, or `drive`
- identical start/end points and unsupported modes are rejected before the provider is called
- public response is intentionally conservative: provider, checked/fetched time, travel mode, distance and duration
- raw provider legs/geometry are not exposed in this first customer slice
- user searches a real place in the destination country through the existing provider-neutral places API, selects a provider result, then explicitly requests a route
- destination-country mismatches and malformed place/route responses are rejected defensively
- changing travel mode recalculates the selected route
- honest loading, empty, error and retry states
- route distance/time are clearly labeled as provider-calculated planning values
- no claims of live traffic, public-transport timetables, fares, ticket prices, disruptions, accessibility or service availability
- all 18 locales, RTL compatibility, responsive behavior, accessible controls and reduced-motion support
- focused Maps API, API-client and Transport UI tests

CI findings/fixes:

- initial strict JavaScript failure was fixed by making the non-null destination and async return contracts explicit
- the isolated Maps test exposed eager environment loading; `maps.routes.js` now lazy-loads the real maps provider factory only when no provider is injected, preserving production behavior and improving testability
- CI `#186` then passed JavaScript, translations, provider smoke, ESLint, all tests, PostgreSQL/Prisma, dependency/secret checks, production builds and live-provider checks; only Prettier failed on four files
- a temporary formatter diagnostic used repository Prettier `3.9.6` to print the exact four-file diff
- exact formatter output was applied to `transport-page-copy.js`, `transport-page.jsx`, `transport-page.test.jsx` and `provider-requests.js`
- the temporary diagnostic was removed and root `package.json` was restored byte-for-byte to original blob `af4b2abbc4b5b1887f9a6293cd1a411649a69f7c`, with normal `prettier --check .`

Clean Phase 7N code checkpoint before this handoff update:

`965dc114ad9a5983c0b6f31e2dc35899715b0b4b`

Clean code CI `#188` passed all five workflow jobs, including strict JavaScript, translation checks, provider smoke tests, ESLint, all unit/integration tests, normal repository-wide Prettier, PostgreSQL/Prisma verification, dependency/secret checks, production builds and live-provider checks.

This documentation update creates a newer PR head. Do not merge PR `#14` based only on CI `#188`; require a new complete green CI run on the exact final head containing this handoff update.

## Live-provider verification status

The live-provider CI currently verifies these real network paths:

- Open-Meteo
- Frankfurter
- CI-hosted LibreTranslate

Keyed provider checks are skipped when their GitHub Actions secrets are not configured, including:

- Geoapify (`GEOAPIFY_API_KEY`)
- Ticketmaster (`TICKETMASTER_API_KEY`)
- NewsData (`NEWSDATA_API_KEY`)
- Pexels (`PEXELS_API_KEY`)

Therefore Phase 7N routing is covered by validation, adapter/API/UI tests and production builds, but **do not claim a real Geoapify routing network request was verified by GitHub CI** unless `GEOAPIFY_API_KEY` is configured and the live check actually runs.

Likewise, a passing live-provider job does not prove Ticketmaster, NewsData or Pexels networking when their keys are absent.

Safety remains database-backed verified reference data, not a third-party live-provider lookup.

## Immediate next engineering step

Finish Phase 7N safely:

1. Require complete green GitHub CI on the exact final head of PR `#14` after this handoff update.
2. Fix any real failure without weakening CI.
3. Confirm PR `#14` is mergeable and still points to that exact verified head.
4. Merge PR `#14` into `develop` only after all five jobs are green, using expected-head protection.
5. Verify the resulting `develop` push CI is fully green.
6. Only then create the next feature branch from that exact verified merge commit.

## Recommended next slice

### Phase 7O — Destination events discovery

Repository inspection shows the provider-neutral Events backend and API-client exposure already exist:

- server route: `GET /api/v1/events`
- existing Ticketmaster provider adapter/factory/service
- shared event-query validation already supports city/country/coordinates/date range, pagination and sorting
- shared API client already exposes `getEvents(query)`

There is not yet a destination Events card/slice in the current destination feature grid, so the next narrow customer slice should reuse this existing backend rather than create duplicate Ticketmaster logic.

Suggested Phase 7O scope:

1. Start from the exact verified post-merge Phase 7N `develop` commit.
2. Inspect the existing Events normalizer/provider response and public schema before rendering fields.
3. Add a destination-aware `/destinations/[slug]/events` route and destination feature entry point.
4. Query through AttraVoya's existing `/api/v1/events` contract only; provider secrets remain server-side.
5. Use validated destination city/country/coordinates and active locale where supported.
6. Display only real normalized provider fields actually returned; do not invent ticket availability, prices, popularity, ratings, age suitability, opening times or event status.
7. Validate external URLs before rendering them and reject malformed/mismatched provider data.
8. Add honest loading, success, empty, error and retry states.
9. Preserve all 18 locales, RTL, accessibility, responsive behavior and reduced motion.
10. Add focused provider/API/UI tests and require the complete CI gate before merge.

Ticket purchasing, live ticket inventory/prices, recommendations and richer event detail should remain separate provider-backed slices unless the inspected provider contract genuinely supports them.

## Product constraints that must not be forgotten

- Budget-first trip planning is a core differentiator.
- Cheapest room is not necessarily cheapest total trip.
- Family travel must use children's ages: `0–3`, `4–8`, `9–12`, `13–17`.
- Basic emergency/safety functionality is never paywalled.
- Official emergency numbers must come from authoritative verified data, never AI.
- Premium never grants Admin permissions.
- Frontend visibility is never an authorization boundary.
- Use JavaScript only unless the product owner explicitly approves TypeScript.
- Use Lucide icons consistently.
- Avoid generic AI-template visuals, fake testimonials, fake statistics and fake live data.
- Whole-app language support and country/language/currency separation must remain intact.
- All new async UI features need loading, success, empty, error and retry behavior where useful.
- Every visible interactive control must genuinely work.
- Do not call a phase complete unless the relevant runtime/CI tests actually passed.

## How to resume in a new chat

Tell ChatGPT:

> Continue AttraVoya Pro from `docs/CURRENT-WORK.md` in GitHub repository `Victor12-star/AttraVoya-Pro`. Read that file first, inspect `develop`, then continue the next unfinished phase. Keep the rule that every slice must pass GitHub CI before proceeding.

The repository and this handoff are the source of truth if chat memory and Git history ever disagree.
