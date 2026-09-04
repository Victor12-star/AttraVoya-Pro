# AttraVoya Pro — Current Work Handoff

Last updated: 2026-09-04

This file exists so a new ChatGPT conversation can continue the project from the exact engineering checkpoint without relying on chat history alone.

## Repository

- GitHub: `Victor12-star/AttraVoya-Pro`
- Working integration branch: `develop`
- `main` is not the day-to-day development branch.
- Current `develop` checkpoint before this handoff document: `47ca3064ceb80a108d1888db67035fee61f85bf7`

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

## Latest completed customer vertical slices

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

## Important current limitation

Geoapify adapter behavior is covered by automated tests, but the real Geoapify network call is not live-verified in GitHub until `GEOAPIFY_API_KEY` is added to GitHub Actions Secrets.

The same rule applies to other keyed providers if their secrets are not configured.

## Next engineering step

Continue from `develop` and create a fresh feature branch before modifying code.

Recommended next slice:

### Phase 7C — Destination page foundation

Build the first real destination page around a selected destination, without inventing data.

Suggested scope:

1. Establish a stable destination identifier/route strategy from search selection.
2. Build `/destinations/[slug]` as a real page instead of the unavailable shell.
3. Show only provider/reference data we genuinely have: city, country, coordinates/provider source where appropriate.
4. Add real weather through Open-Meteo.
5. Add destination imagery through Pexels only when configured; otherwise use an honest unavailable/image-neutral state rather than fake imagery.
6. Add entry points for stays, things to do, nearby, family, currency, language, transport and safety without pretending those child pages are complete.
7. Add loading, empty, error and retry behavior.
8. Preserve localization and RTL compatibility.
9. Add unit/integration tests.
10. Run the full GitHub CI gate and do not proceed until green.

After Phase 7C, continue destination vertical slices one at a time (weather/details, nearby, attractions/restaurants, accommodation, family, safety, etc.) with a test gate after each.

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
