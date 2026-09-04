# AttraVoya Pro — Current Work Handoff

Last updated: 2026-09-04

This file exists so a new ChatGPT conversation can continue the project from the exact engineering checkpoint without relying on chat history alone.

## Repository

- GitHub: `Victor12-star/AttraVoya-Pro`
- Working integration branch: `develop`
- `main` is not the day-to-day development branch.
- Verified Phase 7C merge checkpoint on `develop`: `1f2028242323d438efc0b8d88dddcaf9c32c88c0`.
- Phase 7C pull request `#3` is merged.
- The post-merge `develop` CI run for Phase 7C (`CI #109`) completed successfully.
- Current Phase 7D pull request: `#4` from `feature/phase-7d-attractions-discovery` into `develop`.

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

The Phase 7A PR CI passed before merge.

### Phase 7B — Customer destination search UI

Merged into `develop` at commit:

`47ca3064ceb80a108d1888db67035fee61f85bf7`

Implemented:

- dedicated destination-search UI
- `/destinations` search page
- `/search` integration for Explore queries
- loading state
- empty state
- safe provider error state
- retry action
- destination selection state
- recent-search persistence through the existing privacy-controlled recent-search helper
- responsive destination-search styling
- unit tests for loading/results/selection/error/retry/empty/client-side validation

The Phase 7B branch CI completed successfully before merge (`CI #96`).

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
- strict JavaScript, React lint and formatting compliance

The Phase 7C final pull-request CI and post-merge `develop` CI both passed before work continued.

### Phase 7D — Destination attractions discovery foundation

Implementation is in pull request `#4` from `feature/phase-7d-attractions-discovery` into `develop`.

Implemented:

- real `/destinations/[slug]/attractions` customer experience
- reuse of the existing provider-neutral `/api/v1/places/nearby` backend contract rather than creating a duplicate attractions endpoint
- existing Geoapify places adapter with the `attractions` category group
- validated destination coordinates carried forward from the Phase 7C route contract
- 10 km search radius and a capped 24-result request
- defensive client rendering of normalized provider results
- deduplication and distance ordering of returned places
- name, address, distance, provider and website shown only when genuine provider data exists
- external website links accepted only for valid HTTP/HTTPS URLs
- no fabricated ratings, opening times, ticket prices, popularity, accessibility facts or availability
- loading, success, empty, error and retry states
- localized attractions copy for all 18 supported UI locales
- responsive, RTL-safe and reduced-motion-aware styling
- unit tests covering provider calls, real result rendering, unsafe website rejection, empty state, provider failure/retry and malformed destination state

The Phase 7D code checkpoint `c8ea1b60e12bce2cdc9e632af4577fbb274e95c8` passed the complete pull-request CI gate (`CI #116`), including JavaScript checks, translations, provider smoke tests, ESLint, unit tests, Prettier, PostgreSQL/Prisma, dependency/secret checks and production builds.

This handoff update creates a newer Phase 7D head, so pull request `#4` must receive a new fully green CI run on its final head before merge. Do not merge based only on `CI #116`.

## Live-provider verification status

The `CI #116` live-provider job verified these real network paths successfully:

- Open-Meteo
- Frankfurter
- the CI-hosted LibreTranslate service

The following keyed provider checks were skipped because their GitHub Actions secrets are not configured:

- Geoapify: `GEOAPIFY_API_KEY`
- Ticketmaster: `TICKETMASTER_API_KEY`
- NewsData: `NEWSDATA_API_KEY`
- Pexels: `PEXELS_API_KEY`

Therefore Phase 7D Geoapify behavior is covered by automated adapter/API/UI tests and production builds, but the real Geoapify network call is not yet live-verified in GitHub CI. Do not claim otherwise.

## Next engineering step

First finish Phase 7D safely:

1. Wait for a fully green GitHub CI run on the final head of pull request `#4`.
2. Merge pull request `#4` into `develop` only after that gate passes.
3. Verify the resulting `develop` push CI is also green.
4. Create a fresh feature branch from that verified `develop` checkpoint before modifying code for the next slice.

Recommended next slice:

### Phase 7E — Destination restaurants discovery foundation

Continue Phase 7's destination vertical one narrow slice at a time.

Suggested scope:

1. Reuse the validated destination selection and coordinate contract from Phase 7C.
2. Reuse the existing provider-neutral `/api/v1/places/nearby` API and Geoapify places adapter rather than calling providers directly from the browser.
3. Use the existing `restaurants` place category group with strict radius/result-limit validation.
4. Normalize, deduplicate and safely render real provider results only.
5. Build the selected destination's `/restaurants` experience.
6. Show only fields that genuinely exist, such as name, address/location, distance, cuisine/category or website when actually supplied by the provider contract.
7. Do not invent ratings, menus, prices, opening hours, booking availability or popularity.
8. Add loading, success, empty, error and retry behavior.
9. Preserve all 18 UI locales, RTL, accessibility and responsive behavior.
10. Add focused tests and run the complete GitHub CI gate before proceeding.

After restaurants passes its full gate, continue beaches/shopping, accommodation, family, nearby and safety as separate coherent slices according to the Phase 7 working plan.

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
