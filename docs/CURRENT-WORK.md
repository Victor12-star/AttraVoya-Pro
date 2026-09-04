# AttraVoya Pro — Current Work Handoff

Last updated: 2026-09-04

This file is the engineering handoff for continuing AttraVoya Pro without relying on chat history.

## Repository

- GitHub: `Victor12-star/AttraVoya-Pro`
- Working integration branch: `develop`
- `main` is not the day-to-day development branch.
- Latest verified merged checkpoint before the current PR: Phase 7H at `05162952c277388fc143b4d45a2d8e1d94758294`.
- Phase 7H post-merge `develop` CI `#141` passed all five workflow jobs.
- Current pull request: `#9` from `feature/phase-7i-family-destination` into `develop`.

## Quality rule

Every vertical slice must follow this sequence:

1. Create a feature branch from the latest verified `develop` commit.
2. Implement one coherent slice only.
3. Open a pull request into `develop`.
4. Require all GitHub CI jobs to pass on the exact final PR head.
5. Merge only after the complete gate is green.
6. Verify the resulting `develop` push CI is also fully green.
7. Only then start the next slice.

The standard CI gate includes:

- JavaScript checks
- translation parity
- provider smoke tests
- ESLint
- unit/integration tests
- normal Prettier formatting
- PostgreSQL + Prisma verification
- dependency audit + secret scan
- production builds
- live provider checks when credentials are available

Never weaken CI to make a slice pass, and never claim a provider was live-verified when its required API key was not configured.

## Product and architecture foundation

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

Provider secrets stay server-side. Never invent live travel prices, availability, emergency facts, ratings, opening times, safety claims or other provider data.

## Phase 7 destination progress

### Phase 7A — Global destination search API

Completed and merged.

Implemented provider-neutral destination search with Geoapify city discovery, validation, normalization, deduplication, shared API-client support and tests.

### Phase 7B — Customer destination search UI

Completed and merged.

Implemented `/destinations` search, `/search` integration, loading/empty/error/retry states, real destination selection and privacy-controlled recent-search persistence.

### Phase 7C — Destination page foundation

Completed and merged through PR `#3`.

Implemented stable destination routing, validated shareable destination context, real Open-Meteo weather, configured Pexels imagery, honest provider states and destination feature entry points.

### Phase 7D — Attractions discovery

Completed and merged through PR `#4`.

Implemented real provider-backed destination attractions using the existing neutral places API, bounded search, defensive normalization and factual provider fields only.

### Phase 7E — Restaurants discovery

Completed and merged through PR `#5`.

Implemented real provider-backed restaurant discovery with validated destination context and no fabricated cuisine, ratings, menus, prices, hours or booking availability.

### Phase 7F — Beaches discovery

Completed and merged.

Implemented the neutral `beaches` category contract, Geoapify `beach` mapping, bounded coastal discovery and explicit guardrails against invented water quality, lifeguard, flag, crowd, facility or safety claims.

### Phase 7G — Shopping discovery

Completed and merged into `develop` at `ff40f33f257ba2e2cb8688d65912e01aebd76403`.

Implemented real shopping-location discovery through the existing provider-neutral places API and Geoapify shopping mapping, with no invented store directory, hours, prices, sales, ratings, parking, stock or availability.

Final PR CI `#133` and post-merge `develop` CI `#134` passed all five workflow jobs.

### Phase 7H — Accommodation discovery

Completed and merged through PR `#8` into `develop` at:

`05162952c277388fc143b4d45a2d8e1d94758294`

Implemented:

- real destination accommodation experience using validated destination context
- existing dedicated `/api/v1/accommodation/nearby` backend and shared API client
- existing server-side Geoapify accommodation adapter only
- 10 km search radius and capped 24-result request
- filters for hotels, guest houses, hostels and apartments/short-term rentals
- reusable validated top-level destination-context parser
- defensive normalization, deduplication and distance ordering
- genuine lodging name/type/address/distance/provider/validated website only
- explicit location-data-only notice because Geoapify is not live room inventory
- no fabricated room prices, live availability, cancellation rules, amenities, breakfast, kitchens, ratings or booking claims
- loading, success, empty, error and retry states
- all 18 locales, RTL, responsive and reduced-motion styling
- focused UI/context/entry tests

Final PR CI `#140` passed all five jobs on the exact final PR head. Post-merge `develop` CI `#141` also passed all five jobs before Phase 7I started.

### Phase 7I — Family destination discovery

Current implementation is in PR `#9` from `feature/phase-7i-family-destination` into `develop`.

Implemented:

- real `/destinations/[slug]/family` customer experience
- reuse of the existing provider-neutral `/api/v1/places/nearby` API; no fake dedicated Family provider
- factual nearby discovery using existing `PLAYGROUNDS`, `PARKS` and `ATTRACTIONS` category groups
- 10 km search radius and capped 12-result request per category
- defensive client normalization, deduplication and distance ordering
- valid HTTP/HTTPS websites only
- partial-category failure handling so successful sections remain usable
- required child age bands `0–3`, `4–8`, `9–12`, `13–17` as interactive planning context
- explicit notice that age selections do not mean provider places are verified for age suitability or child safety
- no fabricated age suitability, child safety, supervision, accessibility, opening times, admission prices, ratings or availability
- loading, success, empty, error and retry behavior
- localized Family copy for all 18 supported UI locales
- RTL-compatible, responsive and reduced-motion-aware styling
- focused Family UI tests

CI fixes made during the slice:

- fixed an initial locale-map syntax error caught by strict JavaScript/build checks
- corrected the age-band test to use React Testing Library event handling
- applied the exact Prettier output for the Family locale file
- a temporary formatting diagnostic was used only to print Prettier's exact diff and was fully removed afterward

Clean Phase 7I code checkpoint:

`791cb8e0435ab3a4fb4faf00021fda5e0a2f317c`

Clean PR CI `#147` passed all five workflow jobs, including JavaScript, translations, provider smoke, ESLint, unit tests, normal `prettier --check .`, PostgreSQL/Prisma, dependency/secret checks, production builds and the live-provider job.

This handoff update creates a newer PR head. Do not merge PR `#9` based only on CI `#147`; require a new complete green CI run on the exact final head containing this documentation update.

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

Therefore Geoapify-backed destination slices are covered by shared-category, adapter/API/UI tests and production builds, but do not claim a real Geoapify network request was verified by CI unless the key is configured and the live check actually runs.

## Immediate next engineering step

Finish Phase 7I safely:

1. Require a complete green GitHub CI run on the exact final head of PR `#9` after this handoff update.
2. Fix any real failure without weakening CI.
3. Confirm PR `#9` is mergeable and still points to the verified head.
4. Merge PR `#9` into `develop` only after all five jobs are green.
5. Verify the resulting `develop` push CI is fully green.
6. Create the next branch from that exact verified merge commit only after the integration gate passes.

## Recommended next slice

### Phase 7J — Nearby destination discovery foundation

Keep Nearby provider-backed and location-focused. Do not turn it into a duplicate of every existing destination vertical.

Suggested scope:

1. Inspect the current Nearby route/shell and existing `nearby` server module before changing code.
2. Reuse the validated destination context and provider-neutral places API wherever possible.
3. Define a small set of useful factual nearby categories only when the existing neutral category contract supports them.
4. Use bounded radius and result limits under existing validation constraints.
5. Normalize, deduplicate and sort real provider results defensively.
6. Show only genuine provider fields such as name, address, distance, category/provider and validated website when present.
7. Do not invent walking times, opening hours, ratings, prices, crowd levels, accessibility, safety, popularity or availability.
8. Add honest loading, success, empty, error and retry behavior, including partial-category failure if multiple requests are used.
9. Preserve all 18 locales, RTL, accessibility, responsive behavior and reduced motion.
10. Add focused tests and require the complete CI gate before proceeding.

After Nearby is fully verified and merged, continue Safety as its own coherent slice. Safety must use authoritative verified facts; never generate emergency numbers or safety claims with AI.

## Product constraints that must not be forgotten

- Budget-first trip planning is a core differentiator.
- Cheapest room is not necessarily cheapest total trip.
- Family travel must use children’s ages: `0–3`, `4–8`, `9–12`, `13–17`.
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
