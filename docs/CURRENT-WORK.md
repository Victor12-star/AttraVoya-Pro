# AttraVoya Pro — Current Work Handoff

Last updated: 2026-09-04

This file is the engineering source of truth for continuing the project without relying on chat history.

## Repository

- GitHub: `Victor12-star/AttraVoya-Pro`
- Working integration branch: `develop`
- `main` is not the day-to-day development branch.
- Verified Phase 7G merge checkpoint on `develop`: `ff40f33f257ba2e2cb8688d65912e01aebd76403`.
- Phase 7G pull request `#7` is merged.
- Post-merge `develop` CI for Phase 7G (`CI #134`) passed all five workflow jobs.
- Current Phase 7H pull request: `#8` from `feature/phase-7h-accommodation-discovery` into `develop`.
- Clean Phase 7H code checkpoint: `552c51c5f465d383a215e92f6da97ca20db3aa84`.
- Clean Phase 7H code CI (`CI #139`) passed all five workflow jobs before this handoff update.

## Non-negotiable quality rule

Every slice follows this sequence:

1. create a fresh feature branch from verified `develop`
2. implement one coherent vertical slice
3. open a pull request into `develop`
4. require the exact final PR head to pass the complete CI gate
5. merge only after every required job is green
6. require the resulting `develop` push CI to pass before starting the next slice

The standard gate includes:

- JavaScript checks
- translation parity
- provider smoke tests
- ESLint
- unit/integration tests
- Prettier formatting
- PostgreSQL + Prisma verification
- dependency audit + secret scan
- production builds
- live provider checks where credentials are available

Never merge failed or pending code. Never claim a keyed provider is live-network verified when its GitHub Actions key is not configured.

## Product/data rules

- Real provider data only. Never invent live fares, prices, availability, ratings, opening hours, weather, safety facts or provider records.
- Clearly distinguish live/retrieved data, estimates and unavailable/unknown data.
- Provider credentials remain server-side.
- New async UI must have honest loading, success, empty, error and retry behavior where useful.
- Preserve all 18 supported UI locales, RTL, accessibility, responsive design and reduced-motion handling.
- Use JavaScript unless the product owner explicitly approves TypeScript.
- Use Lucide icons consistently.
- Every visible interactive control must genuinely work.
- Budget-first trip planning remains a core differentiator.
- Cheapest room is not necessarily cheapest total trip.
- Family planning must account for child age bands: 0–3, 4–8, 9–12 and 13–17.
- Basic emergency/safety functionality is never paywalled.
- Official emergency numbers must come from authoritative verified data, never AI.
- Premium never grants Admin permissions.
- Frontend visibility is never an authorization boundary.

## Completed foundation

The JavaScript monorepo includes:

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

Provider adapters include:

- Open-Meteo weather
- Frankfurter currency
- LibreTranslate translation
- Geoapify places/accommodation/geocoding/routing
- Ticketmaster events
- NewsData travel news
- Pexels destination imagery
- Resend transactional email

## Phase 7 customer destination slices

### Phase 7A — Global destination search API

Merged into `develop`.

Implemented:

- `GET /api/v1/destinations/search`
- provider-neutral destination service
- Geoapify city-only discovery
- validation before provider calls
- malformed/duplicate provider-row filtering
- shared API-client method
- unit and Fastify integration tests

### Phase 7B — Customer destination search UI

Merged into `develop` at `47ca3064ceb80a108d1888db67035fee61f85bf7`.

Implemented dedicated `/destinations` search, `/search` integration, honest async states, provider-backed destination selection, privacy-controlled recent searches, responsive UI and focused tests.

### Phase 7C — Destination page foundation

Merged through PR `#3` at `1f2028242323d438efc0b8d88dddcaf9c32c88c0`.

Implemented stable validated destination routes, real Open-Meteo current weather, Pexels imagery, provider attribution, honest unavailable/retry states, destination feature entry points, localization, RTL/responsive styling and route/page tests.

### Phase 7D — Attractions discovery

Merged through PR `#4` at `1531d5cc0005d5a3f2ea1c3d8bd786bc382490e4`.

Implemented real `/destinations/[slug]/attractions` using provider-neutral `/api/v1/places/nearby`, a 10 km/24-result request, genuine provider fields only, safe websites, localization, honest async states and tests. Final PR CI `#117` and post-merge CI `#118` passed.

### Phase 7E — Restaurants discovery

Merged through PR `#5` at `e802427e48e3d20b65a4f0cbe7238b1560788f11`.

Implemented real `/destinations/[slug]/restaurants` using the shared places API, a 5 km/24-result request, destination entry point, genuine provider fields only, safe websites, localization and tests. No cuisine, ratings, menus, prices, hours, bookings or popularity are fabricated. Final PR CI `#123` and post-merge CI `#124` passed.

### Phase 7F — Beaches discovery

Merged through PR `#6` at `72c2b34e7d1d13200afaa557c006f8a5e70435fd`.

Implemented:

- real `/destinations/[slug]/beaches`
- provider-neutral `BEACHES` category and server-side Geoapify `beach` mapping
- shared places API reuse
- 20 km/24-result request
- defensive normalization/deduplication/distance ordering
- genuine name/address/distance/provider/website fields only
- no invented water quality, lifeguard, flag, weather, crowd, facility, accessibility, fee or safety claims
- all 18 locales, RTL/responsive/reduced-motion styling and focused tests

Final PR CI `#131` and post-merge `develop` CI `#132` passed all five workflow jobs.

### Phase 7G — Shopping discovery

Merged through PR `#7` into `develop` at `ff40f33f257ba2e2cb8688d65912e01aebd76403`.

Implemented:

- real `/destinations/[slug]/shopping`
- reuse of provider-neutral `/api/v1/places/nearby`
- existing `SHOPPING` alias mapped server-side to Geoapify `commercial.shopping_mall`
- 10 km/24-result request
- defensive normalization/deduplication/distance ordering
- genuine name/address/distance/provider/website fields only
- no invented store directory, hours, prices, sales, ratings, accessibility, parking, stock or availability
- localized Shopping destination entry point
- all 18 locales, responsive/RTL/reduced-motion styling and focused tests

Final PR CI `#133` and post-merge `develop` CI `#134` passed all five workflow jobs.

### Phase 7H — Accommodation discovery

Current implementation is in PR `#8` from `feature/phase-7h-accommodation-discovery` into `develop`.

Implemented:

- real destination accommodation experience at `/accommodation` using validated destination context
- reuse of the existing dedicated `/api/v1/accommodation/nearby` backend and shared API client
- existing server-side Geoapify accommodation adapter only; no browser provider calls
- 10 km/24-result request
- type filters for hotels, guest houses, hostels and apartments/short-term rentals
- reusable validated top-level destination-context parser for later Nearby/Transport work
- defensive client normalization, deduplication and distance ordering
- genuine lodging name, normalized accommodation type, address, distance, provider and validated website only
- explicit location-data-only notice because the connected Geoapify adapter is not live lodging inventory
- no fabricated room prices, live availability, cancellation rules, amenities, breakfast, kitchens, ratings or booking claims
- loading, success, empty, error and retry states
- all 18 locales, RTL/responsive/reduced-motion styling
- focused accommodation UI, destination-context and destination-entry tests

The clean Phase 7H code checkpoint `552c51c5f465d383a215e92f6da97ca20db3aa84` passed complete PR CI `#139`, including normal Prettier and production builds.

A temporary formatter diagnostic was used only to print Prettier's exact wrapping changes after CI identified formatting-only issues. The diagnostic workflow change was fully removed, the clean branch diff returned to the eight intended Phase 7H files, and normal `pnpm format:check` passed in CI `#139`.

This handoff update creates a newer PR head. Do not merge PR `#8` based only on CI `#139`; require a new complete green CI run on the exact final head containing this documentation update.

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

Therefore Geoapify-backed destination slices are covered by adapter/API/UI tests and production builds, but do not claim a real Geoapify network call was verified by CI unless the key is configured and the live check actually runs.

## Immediate next engineering step

Finish Phase 7H safely:

1. Wait for complete GitHub CI on the exact final head of PR `#8` after this handoff update.
2. Fix any real failure without weakening CI.
3. Merge PR `#8` into `develop` only when all five workflow jobs are green.
4. Verify the resulting `develop` push CI is fully green.
5. Only then create the next feature branch from that exact verified merge commit.

## Recommended next slice

### Phase 7I — Family destination discovery foundation

Keep the slice factual and age-aware without claiming provider places are suitable for a child age unless real data supports that claim.

Suggested scope:

1. Replace `/destinations/[slug]/family` unavailable shell with a real family-planning discovery experience.
2. Reuse the validated destination contract and existing provider-neutral places API rather than pretending a dedicated family provider exists.
3. Use factual nearby categories such as playgrounds, parks and attractions through existing category groups.
4. Capture/retain child ages using the product age bands 0–3, 4–8, 9–12 and 13–17 as trip-planning context.
5. Do not infer or invent age suitability, child safety, accessibility, admission prices, opening hours or facilities from category membership alone.
6. Keep provider results clearly separated from age-planning context.
7. Add honest loading, success, empty, error and retry behavior.
8. Preserve all 18 locales, RTL, accessibility, responsive behavior and reduced motion.
9. Add focused tests and require the complete CI gate before proceeding.

After Family, continue Nearby and Safety as separate coherent slices; do not combine unrelated verticals into one PR.

## How to resume in a new chat

Tell ChatGPT:

> Continue AttraVoya Pro from `docs/CURRENT-WORK.md` in GitHub repository `Victor12-star/AttraVoya-Pro`. Read that file first, inspect `develop`, then continue the next unfinished phase. Keep the rule that every slice must pass GitHub CI before proceeding.

The repository and this handoff are the source of truth if chat memory and Git history disagree.
