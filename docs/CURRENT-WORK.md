# AttraVoya Pro — Current Work Handoff

Last updated: 2026-09-05

This file is the engineering handoff for continuing AttraVoya Pro without relying on chat history.

## Repository and workflow

- GitHub: `Victor12-star/AttraVoya-Pro`
- Working integration branch: `develop`
- `main` is not the day-to-day development branch.
- Latest verified merged checkpoint before the current PR: Phase 7N merge `2eafc1f745ea347b52af695d2980fc9ef7dcba01`.
- Phase 7N post-merge `develop` CI `#190` passed.
- Current feature branch: `feature/phase-7o-destination-events`.
- Current pull request: `#15` from `feature/phase-7o-destination-events` into `develop`.

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
- Phase 7N — Destination transport foundation

Important verified checkpoints:

- Phase 7G merged at `ff40f33f257ba2e2cb8688d65912e01aebd76403`; PR CI `#133` and post-merge CI `#134` green.
- Phase 7H merged at `05162952c277388fc143b4d45a2d8e1d94758294`; PR CI `#140` and post-merge CI `#141` green.
- Phase 7I merged at `cf05786c12279bf884e99312539d9f116f0de92d`; PR CI `#148` and post-merge CI `#149` green.
- Phase 7J merged at `3f4dc70cf173d954d92a7a002813a1124eaae552`; PR CI `#153` and post-merge CI `#154` green.
- Phase 7K merged at `2a6706dc9df52bcf35ddd844ac0a3a6fd2d9674f`; final PR CI `#165` and post-merge CI `#166` green.
- Phase 7L merged through PR `#12` by squash at `52da70966f08c03cd9b241d4e026ed334b6a1713`; final PR CI `#174` and post-merge `develop` CI `#175` green.
- Phase 7M merged through PR `#13` by squash at `5550c835b18ec2596c0b5f17264bf82325924cf3`; final PR CI `#182` and post-merge `develop` CI `#183` green.
- Phase 7N merged through PR `#14` at `2eafc1f745ea347b52af695d2980fc9ef7dcba01`; post-merge `develop` CI `#190` green.

## Phase 7O — Destination events discovery

Current implementation is in PR `#15` from `feature/phase-7o-destination-events` into `develop`.

The branch starts from the verified Phase 7N merge commit:

`2eafc1f745ea347b52af695d2980fc9ef7dcba01`

Implemented:

- added destination route `/destinations/[slug]/events`
- added Events entry point from the destination experience
- reused the existing provider-neutral Events backend and shared `apiClient.getEvents(...)`
- browser code never calls Ticketmaster directly and Ticketmaster credentials stay server-side
- event searches use the selected destination latitude/longitude, restrict to the destination country, search within 50 km, request up to 20 events, sort upcoming events by date ascending, and use the active locale
- UI renders only normalized factual provider data: event name, provider date/time when supplied, venue, address/city, provider classifications, provider identity, safe event URL, and provider checked/fetched time
- no ticket prices, live ticket inventory, ratings, popularity, availability or booking guarantees are invented or implied
- explicit customer disclaimer explains those provider limitations
- unsafe event URLs such as `javascript:` are rejected
- events whose returned country does not match the selected destination country are rejected
- honest loading, success, empty, provider-error, retry and invalid-destination states
- all 18 supported UI locales are present and Arabic RTL behavior remains supported
- focused Events UI tests cover real normalized rendering, `apiClient.getEvents()` contract, country mismatch filtering, unsafe URL rejection, honest empty/error states, retry, invalid destination handling, and absence of unsupported fake price data

### Phase 7O CI findings and fixes

- CI `#191` failed at strict JavaScript because `Intl.DateTimeFormat` options using `dateStyle` and `timeStyle` were inferred as generic strings; explicit formatter-option typing fixed this without runtime behavior changes.
- CI `#192` then exposed a unit-test bug: the test rejected any UI text containing the word `price`, even though the truthful safety disclaimer legitimately contains `prices`.
- The test was corrected to inject unsupported fake provider value `SEK 999` and verify that specific value is not rendered. Do not revert to `queryByText(/price/i)`.
- CI `#193` passed all functional gates and failed only repository Prettier on three Phase 7O files.
- A controlled diagnostic used repository Prettier `3.9.6` to determine the exact mechanical formatting changes.
- CI `#195` confirmed JavaScript, translations, provider smoke, ESLint and unit tests were green; only the formatting check failed on the diagnostic head.
- Final mechanical formatting was applied to `events-page-copy.js`, `events-page.jsx`, and `events-page.test.jsx`.
- Root `package.json` is restored to the normal script: `"format:check": "prettier --check ."`.
- No temporary formatter diagnostic command may be merged.

Clean Phase 7O code checkpoint before this handoff update:

`21c920ccec6f1bf9376513d3179372eaab82c79a`

PR CI `#196` on that checkpoint passed all five top-level jobs:

- Code quality and unit tests
- PostgreSQL and Prisma verification
- Production builds
- Live no-cost provider checks
- Dependency and secret checks

The code-quality job passed environment validation, Prisma generation, strict JavaScript, translations, provider smoke tests, ESLint, unit tests, and the normal repository-wide Prettier check.

This documentation update creates a newer PR head. Do not merge PR `#15` based only on CI `#196`; require a new complete green CI run on the exact final head containing this handoff update.

## Live-provider verification status

The live-provider CI currently verifies real network paths that do not depend on missing keyed-provider secrets, including:

- Open-Meteo
- Frankfurter
- CI-hosted LibreTranslate

Keyed provider checks may be skipped when their GitHub Actions secrets are not configured, including:

- Geoapify (`GEOAPIFY_API_KEY`)
- Ticketmaster (`TICKETMASTER_API_KEY`)
- NewsData (`NEWSDATA_API_KEY`)
- Pexels (`PEXELS_API_KEY`)
- Resend where applicable

Therefore Phase 7O has adapter/API/UI/test and production-build coverage, but **do not claim a real Ticketmaster network request was verified by GitHub CI** unless `TICKETMASTER_API_KEY` is configured and the live-provider job actually confirms it.

A passing live-provider job does not by itself prove keyed-provider networking when the relevant secret is absent.

Safety remains database-backed verified reference data, not an AI-generated fact source.

## Immediate next engineering step

Finish Phase 7O safely:

1. Require complete green GitHub CI on the exact final head of PR `#15` after this handoff update.
2. Fix any real failure without weakening CI.
3. Recheck PR `#15`:
   - base is `develop`
   - head is `feature/phase-7o-destination-events`
   - PR is mergeable
   - all checks are green on the exact current head
4. Merge PR `#15` into `develop` using the normal merge method and expected-head SHA protection.
5. Verify `develop` points to the resulting merge commit.
6. Verify the resulting `develop` push CI is fully green across all five top-level jobs.
7. Only then mark Phase 7O complete and choose/start the next phase from that exact verified `develop` commit.

Do not create a new Phase 7O branch and do not redo completed Phase 7O work.

## Product constraints that must not be forgotten

- Budget-first trip planning is a core differentiator.
- The user should eventually be able to enter a total budget and receive realistic destination/trip options that fit it.
- Budget allocation should cover flights, accommodation, food, local transportation, activities, children's activities, airport transfers, and a contingency/safety margin.
- Real provider data must always be distinguished from estimates.
- Cheapest room is not necessarily cheapest total trip.
- Accommodation support should include legitimate lodging types beyond hotels, including guest houses, B&Bs, hostels, apartments, serviced apartments, aparthotels, vacation rentals, family rooms, budget hotels, resorts and campsites.
- Family travel must use children's ages: `0–3`, `4–8`, `9–12`, `13–17`.
- Basic emergency/safety functionality is never paywalled.
- Official emergency numbers must come from authoritative verified data, never AI.
- Premium never grants Admin permissions.
- Frontend visibility is never an authorization boundary.
- Use JavaScript only unless the product owner explicitly approves TypeScript.
- Use Lucide icons consistently.
- Maintain mobile responsiveness, localization, RTL support, accessibility, strong security and scalable architecture.
- Avoid generic AI-template visuals, fake testimonials, fake statistics and fake live data.
- Whole-app language support and country/language/currency separation must remain intact.
- All new async UI features need loading, success, empty, error and retry behavior where useful.
- Every visible interactive control must genuinely work.
- Do not call a phase complete unless the relevant runtime/CI tests actually passed.

## How to resume in a new chat

Tell ChatGPT:

> Continue AttraVoya Pro from `docs/CURRENT-WORK.md` in GitHub repository `Victor12-star/AttraVoya-Pro`. Read that file first, inspect the current `develop` branch and any active feature PR, then continue only from the exact unfinished checkpoint. Keep the rule that every final feature head and post-merge `develop` CI must be completely green before proceeding.

The repository and this handoff are the source of truth if chat memory and Git history ever disagree.
