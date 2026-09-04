# AttraVoya Pro — Current Work Handoff

Last updated: 2026-09-04

This file exists so a new ChatGPT conversation can continue the project from the exact engineering checkpoint without relying on chat history alone.

## Repository

- GitHub: `Victor12-star/AttraVoya-Pro`
- Working integration branch: `develop`
- `main` is not the day-to-day development branch.
- Verified Phase 7E merge checkpoint on `develop`: `e802427e48e3d20b65a4f0cbe7238b1560788f11`.
- Phase 7E pull request `#5` is merged.
- The post-merge `develop` CI run for Phase 7E (`CI #124`) completed successfully.
- Current Phase 7F pull request: `#6` from `feature/phase-7f-beaches-discovery` into `develop`.

## Quality rule

Do not start the next vertical slice until the current one is tested. The standard gate is:

1. JavaScript checks
2. Translation parity
3. Provider smoke tests
4. ESLint
5. Unit/integration tests
6. Prettier formatting
7. PostgreSQL + Prisma verification
8. Dependency audit + secret scan
9. Production builds
10. Live provider checks when credentials are available

Never claim a provider is live-verified when its API key is not configured.

## Completed foundation

The project is a JavaScript monorepo with:

- Next.js customer website
- Next.js Admin app
- Expo/React Native mobile app
- Node.js/Fastify API
- PostgreSQL + Prisma
- Zod validation
- shared API client
- localization/global country system
- authentication/session foundation
- Guest/Free/Premium/Admin/Super Admin separation
- budget-first trip-planning domain foundation
- verified-safety architecture

Provider adapters already implemented include:

- Open-Meteo weather
- Frankfurter currency
- LibreTranslate translation
- Geoapify places/accommodation/geocoding/routing
- Ticketmaster events
- NewsData travel news
- Pexels destination imagery
- Resend transactional email

Provider secrets stay server-side. No fake live travel prices, availability, emergency facts, ratings, opening times or provider data may be shown.

## Latest customer vertical slices

### Phase 7A — Global destination search API

Merged into `develop`.

Implemented:

- `GET /api/v1/destinations/search`
- provider-neutral destination service
- Geoapify city-only discovery
- validation before provider calls
- filtering/deduplication of malformed or duplicate provider rows
- shared API-client method
- unit and Fastify integration tests

### Phase 7B — Customer destination search UI

Merged into `develop` at:

`47ca3064ceb80a108d1888db67035fee61f85bf7`

Implemented:

- dedicated destination-search UI
- `/destinations` search page
- `/search` integration for Explore queries
- loading, empty, safe provider error and retry states
- destination selection state
- recent-search persistence through the existing privacy-controlled helper
- responsive destination-search styling
- focused unit tests

### Phase 7C — Destination page foundation

Merged through pull request `#3` into `develop` at:

`1f2028242323d438efc0b8d88dddcaf9c32c88c0`

Implemented:

- stable human-readable destination route contract from normalized search selections
- validated/shareable `/destinations/[slug]` state
- selected city/country/coordinates/provider reference data without fabricating destination records
- real current weather through the existing Open-Meteo backend/API-client path
- Pexels destination imagery through the configured backend provider only
- honest image/weather loading, unavailable, error and retry states
- entry points for stays, things to do, nearby, family, currency, language, transport and safety
- responsive and RTL-safe destination-page styling
- localized destination-page copy
- destination route/page/search-selection unit tests

The Phase 7C final pull-request CI and post-merge `develop` CI both passed before work continued.

### Phase 7D — Destination attractions discovery foundation

Merged through pull request `#4` into `develop` at:

`1531d5cc0005d5a3f2ea1c3d8bd786bc382490e4`

Implemented:

- real `/destinations/[slug]/attractions` customer experience
- reuse of the existing provider-neutral `/api/v1/places/nearby` backend contract
- Geoapify places adapter with the `attractions` category group
- validated destination coordinates carried forward from Phase 7C
- 10 km search radius and capped 24-result request
- defensive normalization, deduplication and distance ordering
- genuine name, address, distance, provider and validated website fields only
- no fabricated ratings, opening times, ticket prices, popularity, accessibility facts or availability
- loading, success, empty, error and retry states
- localized copy for all 18 supported UI locales
- responsive, RTL-safe and reduced-motion-aware styling
- focused unit tests

The final Phase 7D pull-request CI (`CI #117`) and post-merge `develop` CI (`CI #118`) both passed all five workflow jobs.

### Phase 7E — Destination restaurants discovery foundation

Merged through pull request `#5` into `develop` at:

`e802427e48e3d20b65a4f0cbe7238b1560788f11`

Implemented:

- real `/destinations/[slug]/restaurants` customer experience
- reuse of the existing provider-neutral `/api/v1/places/nearby` backend contract
- Geoapify places adapter with `PLACE_CATEGORY_GROUPS.RESTAURANTS`
- validated destination coordinates carried forward from the shared destination route contract
- 5 km search radius and capped 24-result request
- restaurant child route added to the validated destination child-route allowlist
- localized Restaurants entry point added to the destination page
- defensive client normalization, deduplication and distance ordering
- restaurant name, address, distance, provider and website shown only when genuine provider data exists
- external website links accepted only for valid HTTP/HTTPS URLs
- no fabricated cuisine, ratings, menus, prices, opening times, booking availability or popularity
- loading, success, empty, error and retry states
- provider failure details are not exposed to users
- localized restaurants copy for all 18 supported UI locales
- responsive, RTL-safe and reduced-motion-aware styling
- focused unit tests

The final Phase 7E pull-request CI (`CI #123`) and post-merge `develop` CI (`CI #124`) both passed all five workflow jobs.

### Phase 7F — Destination beaches discovery foundation

Implementation is in pull request `#6` from `feature/phase-7f-beaches-discovery` into `develop`.

Implemented:

- real `/destinations/[slug]/beaches` customer experience
- added the provider-neutral shared `PLACE_CATEGORY_GROUPS.BEACHES = 'beaches'` contract because no Beaches alias previously existed
- server-side Geoapify mapping from the neutral `beaches` alias to the verified provider category `beach`
- reuse of the existing `/api/v1/places/nearby` endpoint and shared Zod validation; no duplicate Beaches endpoint
- validation automatically accepts `beaches` through `PLACE_CATEGORY_GROUP_VALUES`
- 20 km search radius and capped 24-result request for coastal discovery
- Beaches child route added to the validated destination child-route allowlist
- localized Beaches entry point added to the destination page
- defensive client normalization, deduplication and distance ordering
- beach name, address, distance, provider and website shown only when genuine provider data exists
- external website links accepted only for valid HTTP/HTTPS URLs
- no fabricated water quality, lifeguard status, flags, weather, crowd levels, facilities, accessibility, fees, opening times, safety claims or ratings
- loading, success, empty, error and retry states
- provider failure details are not exposed to users
- localized beaches copy for all 18 supported UI locales
- responsive, RTL-safe and reduced-motion-aware styling
- server mapping/API tests plus focused web UI and route tests

The clean Phase 7F code checkpoint `298d6bb54313c65feb0157c0b1d7c4d7cf01746b` passed the complete pull-request CI gate (`CI #130`), including JavaScript checks, translations, provider smoke tests, ESLint, unit/integration tests, normal Prettier, PostgreSQL/Prisma, dependency/secret checks, production builds and the live-provider job.

A temporary formatting diagnostic was used only to print Prettier's exact line-wrapping changes for three Beaches files. It was fully removed before checkpoint `298d6bb54313c65feb0157c0b1d7c4d7cf01746b`, and the repository's normal `prettier --check .` gate passed in `CI #130`.

This handoff update creates a newer Phase 7F head, so pull request `#6` must receive a new fully green CI run on its final head before merge. Do not merge based only on `CI #130`.

## Live-provider verification status

The live-provider CI verifies these real network paths successfully:

- Open-Meteo
- Frankfurter
- the CI-hosted LibreTranslate service

The following keyed provider checks are skipped because their GitHub Actions secrets are not configured:

- Geoapify: `GEOAPIFY_API_KEY`
- Ticketmaster: `TICKETMASTER_API_KEY`
- NewsData: `NEWSDATA_API_KEY`
- Pexels: `PEXELS_API_KEY`

Therefore Phase 7F Geoapify Beaches behavior is covered by shared-category, adapter/API/UI tests and production builds, but the real Geoapify network call is not yet live-verified in GitHub CI. Do not claim otherwise.

## Next engineering step

First finish Phase 7F safely:

1. Wait for a fully green GitHub CI run on the final head of pull request `#6` after this handoff update.
2. Merge pull request `#6` into `develop` only after that gate passes.
3. Verify the resulting `develop` push CI is also green.
4. Create a fresh feature branch from that verified `develop` checkpoint before modifying code for the next slice.

Recommended next slice:

### Phase 7G — Destination shopping discovery foundation

Continue Phase 7 one narrow destination slice at a time.

Suggested scope:

1. Reuse the validated destination selection and coordinate contract.
2. Reuse the existing provider-neutral `/api/v1/places/nearby` API and Geoapify places adapter; do not call Geoapify directly from the browser.
3. Reuse the existing neutral `PLACE_CATEGORY_GROUPS.SHOPPING = 'shopping'` contract and its server-side `commercial.shopping_mall` mapping.
4. Replace the existing `/destinations/[slug]/shopping` unavailable shell with a real provider-backed experience.
5. Use a bounded search radius and capped result count under the existing validation limits.
6. Normalize, deduplicate and safely render real provider results only.
7. Show only genuine provider fields such as name, address/location, distance or website when present.
8. Do not invent store lists, opening hours, prices, sales, ratings, accessibility, parking, inventory or availability.
9. Add loading, success, empty, error and retry behavior.
10. Add a localized Shopping entry point from the destination experience when the route is ready.
11. Preserve all 18 UI locales, RTL, accessibility, responsive behavior and reduced-motion handling.
12. Add focused tests and run the complete GitHub CI gate before proceeding.

After shopping passes its full gate, continue accommodation, family, nearby and safety as separate coherent slices according to the Phase 7 working plan.

## Product constraints that must not be forgotten

- Budget-first trip planning is a core differentiator.
- Cheapest room is not necessarily cheapest total trip.
- Family travel must use children’s ages (0–3, 4–8, 9–12, 13–17).
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

> Continue AttraVoya Pro from `docs/CURRENT-WORK.md` in the GitHub repository `Victor12-star/AttraVoya-Pro`. Read that file first, inspect `develop`, then continue the next unfinished phase. Keep the rule that every slice must pass GitHub CI before proceeding.

The repository and this handoff file are the source of truth if chat memory and Git history ever disagree.
