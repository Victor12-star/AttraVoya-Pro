# AttraVoya Pro — Current Work Handoff

Last updated: 2026-09-04

This file exists so a new ChatGPT conversation can continue the project from the exact engineering checkpoint without relying on chat history alone.

## Repository

- GitHub: `Victor12-star/AttraVoya-Pro`
- Working integration branch: `develop`
- `main` is not the day-to-day development branch.
- `develop` checkpoint before the Phase 7C pull request: `fb33a821b0e9a3bb83fce62013d2a772f9f5bac1`
- Phase 7C pull request: `#3` from `feature/phase-7c-destination-page` into `develop`.

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

Provider secrets stay server-side. No fake live travel prices, availability, emergency facts, ratings, or provider data may be shown.

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

Implementation is in pull request `#3` from `feature/phase-7c-destination-page` into `develop`.

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
- strict JavaScript, React lint and formatting compliance fixes discovered by CI

Phase 7C must not be treated as merged until pull request `#3` has a fully green GitHub CI run on its final head commit. Do not bypass this gate.

## Important current limitation

Geoapify adapter behavior is covered by automated tests, but the real Geoapify network call is not live-verified in GitHub until `GEOAPIFY_API_KEY` is added to GitHub Actions Secrets.

The same rule applies to other keyed providers if their secrets are not configured. Pexels imagery must remain honestly unavailable when its configured key/provider is unavailable; do not substitute fake destination imagery.

## Next engineering step

After Phase 7C pull request `#3` is merged into `develop`, create a fresh feature branch before modifying code.

Recommended next slice:

### Phase 7D — Destination attractions discovery foundation

Continue Phase 7's destination vertical one narrow slice at a time. Start with attractions before expanding into restaurants, beaches or shopping.

Suggested scope:

1. Reuse the validated destination selection/coordinate contract from Phase 7C.
2. Add a provider-neutral attractions discovery service through the existing Geoapify places adapter rather than calling providers directly from the browser.
3. Define a strict attraction query/response contract and validate coordinates, categories, radius and result limits before provider calls.
4. Normalize and deduplicate provider results and reject malformed rows.
5. Build the selected destination's `/attractions` experience with real provider results only.
6. Show useful reference fields that genuinely exist, such as name, category, distance/location and provider attribution where available.
7. Do not invent ratings, opening hours, ticket prices, popularity, accessibility facts or availability when the provider does not supply them.
8. Add loading, success, empty, error and retry behavior.
9. Preserve localization, RTL, accessibility and responsive behavior.
10. Add API/service/UI tests and run the complete GitHub CI gate before proceeding to the next destination slice.

After attractions passes its full gate, continue restaurants, beaches/shopping, accommodation, family, nearby and safety as separate coherent slices according to the Phase 7 working plan.

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
