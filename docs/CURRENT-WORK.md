# AttraVoya Pro — Current Work Handoff

Last updated: 2026-09-04

This file is the engineering handoff for continuing AttraVoya Pro without relying on chat history.

## Repository and workflow

- GitHub: `Victor12-star/AttraVoya-Pro`
- Working integration branch: `develop`
- `main` is not the day-to-day development branch.
- Latest verified merged checkpoint before the current PR: Phase 7I merge commit `cf05786c12279bf884e99312539d9f116f0de92d`.
- Phase 7I post-merge `develop` CI `#149` passed all five workflow jobs.
- Current pull request: `#10` from `feature/phase-7j-nearby-destination` into `develop`.

Every vertical slice must follow this sequence:

1. Create a feature branch from the latest verified `develop` commit.
2. Implement one coherent slice only.
3. Open a pull request into `develop`.
4. Require all GitHub CI jobs to pass on the exact final PR head.
5. Merge only after the complete gate is green.
6. Verify the resulting `develop` push CI is also fully green.
7. Only then start the next slice.

The standard CI gate includes JavaScript checks, translation parity, provider smoke tests, ESLint, unit/integration tests, normal Prettier formatting, PostgreSQL/Prisma verification, dependency/secret checks, production builds, and live-provider checks when credentials are available.

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

Provider secrets stay server-side. Never invent live travel prices, availability, emergency facts, ratings, opening times, safety claims or other provider data.

## Phase 7 destination progress

### Phase 7A — Global destination search API

Completed and merged. Implemented provider-neutral destination search with Geoapify city discovery, validation, normalization, deduplication, shared API-client support and tests.

### Phase 7B — Customer destination search UI

Completed and merged. Implemented `/destinations` search, `/search` integration, loading/empty/error/retry states, real destination selection and privacy-controlled recent-search persistence.

### Phase 7C — Destination page foundation

Completed and merged through PR `#3`. Implemented stable destination routing, validated shareable destination context, real Open-Meteo weather, configured Pexels imagery, honest provider states and destination feature entry points.

### Phase 7D — Attractions discovery

Completed and merged through PR `#4`. Implemented real provider-backed destination attractions through the neutral places API with bounded search and factual provider fields only.

### Phase 7E — Restaurants discovery

Completed and merged through PR `#5`. Implemented real provider-backed restaurant discovery with validated destination context and no fabricated cuisine, ratings, menus, prices, hours or booking availability.

### Phase 7F — Beaches discovery

Completed and merged. Implemented the neutral `beaches` category contract, Geoapify `beach` mapping, bounded coastal discovery and explicit guardrails against invented water quality, lifeguard, flag, crowd, facility or safety claims.

### Phase 7G — Shopping discovery

Completed and merged into `develop` at `ff40f33f257ba2e2cb8688d65912e01aebd76403`. Final PR CI `#133` and post-merge CI `#134` passed all five jobs.

### Phase 7H — Accommodation discovery

Completed and merged through PR `#8` at `05162952c277388fc143b4d45a2d8e1d94758294`. The slice uses the dedicated accommodation API and server-side Geoapify adapter, 10 km/24-result bounds, lodging-type filters, validated destination context, defensive normalization, and location-data-only honesty. No room prices, live availability, cancellation rules, amenities, breakfast, kitchens, ratings or booking claims are fabricated. Final PR CI `#140` and post-merge CI `#141` passed all five jobs.

### Phase 7I — Family destination discovery

Completed and merged through PR `#9` at:

`cf05786c12279bf884e99312539d9f116f0de92d`

Implemented:

- real `/destinations/[slug]/family` customer experience
- reuse of `/api/v1/places/nearby`; no fake dedicated Family provider
- factual `PLAYGROUNDS`, `PARKS` and `ATTRACTIONS` discovery
- 10 km radius and capped 12-result requests per category
- defensive normalization, deduplication and distance ordering
- child age bands `0–3`, `4–8`, `9–12`, `13–17` as planning context only
- explicit guardrail that provider results are not verified for age suitability or child safety
- no fabricated suitability, safety, supervision, accessibility, opening times, prices, ratings or availability
- loading, success, empty, error and retry behavior
- all 18 locales, RTL, responsive and reduced-motion styling
- focused tests

Final-head PR CI `#148` and post-merge `develop` CI `#149` passed all five jobs.

### Phase 7J — Nearby destination discovery

Current implementation is in PR `#10` from `feature/phase-7j-nearby-destination` into `develop`.

Implemented:

- replaced the top-level `/nearby` shell with a real destination-aware nearby experience
- reused the validated top-level destination-context parser
- reused the existing provider-neutral `/api/v1/places/nearby` API instead of building a redundant Nearby backend
- factual nearby categories: cafés, supermarkets, pharmacies, ATMs and parking
- one selected category at a time to keep requests bounded and the page focused
- 3 km search radius and capped 16-result request
- browser calls only AttraVoya's shared API; no direct Geoapify call from the client
- defensive result normalization, deduplication and distance ordering
- genuine provider name, place name, address, distance and validated HTTP/HTTPS website only
- no fabricated walking times, opening hours, prices, ratings, accessibility, safety, popularity, crowd levels or availability
- category switching plus honest loading, success, empty, error and retry states
- all 18 supported locales
- RTL-compatible, responsive and reduced-motion-aware styling
- focused Nearby UI tests

CI caught an initial malformed locale-map wrapper in `nearby-page-copy.js`; the file was replaced with the same 18 translations under a simpler typed `Object.freeze` declaration. This fixed both strict JavaScript and production-build parsing without weakening CI.

Clean Phase 7J code checkpoint:

`c7554bc738f490c44623f7b0f9ca9a213eb533a8`

Clean PR CI `#152` passed all five workflow jobs, including JavaScript, translations, provider smoke, ESLint, unit tests, normal Prettier, PostgreSQL/Prisma, dependency/secret checks, production builds and live-provider checks.

This documentation update creates a newer PR head. Do not merge PR `#10` based only on CI `#152`; require a new complete green CI run on the exact final head containing this handoff update.

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

Finish Phase 7J safely:

1. Require complete green GitHub CI on the exact final head of PR `#10` after this handoff update.
2. Fix any real failure without weakening CI.
3. Confirm PR `#10` is mergeable and still points to the verified head.
4. Merge PR `#10` into `develop` only after all five jobs are green.
5. Verify the resulting `develop` push CI is fully green.
6. Only then branch the next slice from that exact verified merge commit.

## Recommended next slice

### Phase 7K — Safety destination foundation

Safety must be authoritative and conservative. Never generate emergency numbers or safety claims with AI.

Suggested scope:

1. Inspect the existing Safety destination shell, safety server module, reference-data models and admin safety tooling before changing code.
2. Establish the authoritative data source/contract for official emergency numbers and country/city safety facts before exposing them to customers.
3. Reuse validated destination context and country code; do not infer emergency numbers from locale, language or nearby categories.
4. Clearly separate verified official facts from provider/news context and from generic travel guidance.
5. Basic emergency/safety functionality must never be paywalled.
6. Do not invent crime levels, neighborhood safety, medical access, political stability, emergency contacts, advisories or risk scores.
7. Add source/provenance and last-verified metadata where authoritative facts are shown.
8. Add honest unavailable states when verified data is missing rather than falling back to AI-generated facts.
9. Preserve all 18 locales, RTL, accessibility, responsive behavior and reduced motion.
10. Add focused tests and require the complete CI gate before proceeding.

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
