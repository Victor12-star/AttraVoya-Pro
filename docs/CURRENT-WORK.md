# AttraVoya Pro — Current Work Handoff

Last updated: 2026-09-05

This file is the engineering handoff for continuing AttraVoya Pro without relying on chat history.

## Repository and workflow

- GitHub: `Victor12-star/AttraVoya-Pro`
- Working integration branch: `develop`
- `main` is not the day-to-day development branch.
- Latest verified merged checkpoint before the current PR: Phase 7L squash merge `52da70966f08c03cd9b241d4e026ed334b6a1713`.
- Phase 7L post-merge `develop` CI `#175` passed all five workflow jobs.
- Current pull request: `#13` from `feature/phase-7m-destination-language` into `develop`.

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

Provider secrets stay server-side. Never invent live travel prices, availability, emergency facts, ratings, opening times, exchange rates, safety claims, language facts, transport facts, or other provider data.

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

Important verified later checkpoints:

- Phase 7G merged at `ff40f33f257ba2e2cb8688d65912e01aebd76403`; PR CI `#133` and post-merge CI `#134` green.
- Phase 7H merged at `05162952c277388fc143b4d45a2d8e1d94758294`; PR CI `#140` and post-merge CI `#141` green.
- Phase 7I merged at `cf05786c12279bf884e99312539d9f116f0de92d`; PR CI `#148` and post-merge CI `#149` green.
- Phase 7J merged at `3f4dc70cf173d954d92a7a002813a1124eaae552`; PR CI `#153` and post-merge CI `#154` green.
- Phase 7K merged at `2a6706dc9df52bcf35ddd844ac0a3a6fd2d9674f`; final PR CI `#165` and post-merge CI `#166` green.
- Phase 7L merged through PR `#12` by squash at `52da70966f08c03cd9b241d4e026ed334b6a1713`; final PR CI `#174` and post-merge `develop` CI `#175` passed all five jobs.

### Phase 7L — Destination currency and exchange

Completed and merged.

Key behavior now in `develop`:

- real `/destinations/[slug]/currency` destination-aware experience
- destination currencies resolved only from AttraVoya country reference data
- browser uses AttraVoya's existing currency API only; Frankfurter remains server-side
- indicative conversion with strict response validation and bounded amounts
- saved traveller currency used only when the configured provider supports it
- explicit disclaimer that bank/card/cash/payment-provider rates and fees may differ
- no fabricated spread, fee, ATM cost, payment acceptance, merchant behavior or availability
- honest loading, reference-empty, provider-unavailable, invalid-input, conversion-error and retry states
- all 18 locales, RTL, responsive and reduced-motion support

The Phase 7L formatter diagnostic was removed before merge. Root `package.json` remained/restored to original blob `af4b2abbc4b5b1887f9a6293cd1a411649a69f7c`.

### Phase 7M — Destination Language foundation

Current implementation is in PR `#13` from `feature/phase-7m-destination-language` into `develop`.

The branch starts from the verified Phase 7L merge commit:

`52da70966f08c03cd9b241d4e026ed334b6a1713`

Implemented:

- replaced `/destinations/[slug]/language` unavailable shell with a real destination-aware Language experience
- reused validated destination route/context and localized country display name
- destination-language facts come only from AttraVoya country reference data
- factual language fields are defensively normalized and deduplicated: code, stored name/native name, writing direction, official/common flags and rank
- official/common language status is never inferred from UI locale, translation support or machine translation
- language cards preserve native-script direction and clearly distinguish official/common flags
- reused existing provider-neutral `/api/v1/translation/languages` and `/api/v1/translation` backend contracts
- browser never calls LibreTranslate directly
- optional short-phrase machine translation appears only when the configured provider actually lists at least one destination language as supported
- translator uses `source: auto` and a destination-language target selected only from the provider-supported intersection
- malformed translation responses or a mismatched returned target are rejected instead of displayed
- machine translation is clearly labeled as potentially inaccurate and not an official language source
- traveller-entered text follows the existing no-store translation route; customer copy explains that it is sent through AttraVoya to the configured translation provider and not cached by this route
- factual language information remains visible even if machine-translation support lookup fails
- honest reference-loading, reference-empty, reference-error, translator-support-error, unsupported-provider-language, invalid-input, translation-error and retry states
- all 18 supported UI locales
- RTL-compatible, responsive, accessible focus behavior and reduced-motion styling
- seven focused Language UI tests covering factual reference data, backend-only translation, unsupported languages, provider-support retry, mismatched response rejection, empty reference and invalid destination behavior

CI findings/fixes:

- initial Phase 7M PR CI `#176` passed JavaScript, translations, provider smoke, ESLint, all tests, PostgreSQL/Prisma, dependency/secret checks, production builds and live-provider checks; only Prettier failed on three new JavaScript files
- temporary diagnostic CI `#177` ran repository Prettier `3.9.6` only on those three files, printed the exact diff, restored the runner files and intentionally failed the formatting step
- all seven new Language tests passed during the diagnostic; the web workspace had 68 passing tests
- exact Prettier output was applied to `language-page-copy.js`, `language-page.jsx` and `language-page.test.jsx`
- the three resulting blob hashes matched the diagnostic targets exactly: `fa28cdaf2c5f73a1739b02dc618a591d38ee50e1`, `69b2a8612c00062b3a63d2990b0ec27fd7295507`, and `1a01037a01ccd0107c9f72422bc06c622e479883`
- the temporary diagnostic was completely removed; root `package.json` is restored byte-for-byte to original blob `af4b2abbc4b5b1887f9a6293cd1a411649a69f7c` and is not part of the final PR diff
- final feature diff before this handoff update contains exactly five intended Language files

Clean Phase 7M code checkpoint before this handoff update:

`5a913cebc3dee46740e33526dcc55e58378d0502`

Clean code CI `#181` passed all five workflow jobs, including strict JavaScript, all translation checks, provider smoke tests, ESLint, all unit/integration tests, normal repository-wide `prettier --check .`, PostgreSQL/Prisma verification, dependency/secret checks, production builds and live-provider checks.

This documentation update creates a newer PR head. Do not merge PR `#13` based only on CI `#181`; require a new complete green CI run on the exact final head containing this handoff update.

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

Therefore Geoapify-backed destination slices are covered by contracts, adapter/API/UI tests and production builds, but do not claim a real Geoapify network request was verified by CI unless its key is configured and the live check actually runs.

LibreTranslate is exercised by the live-provider CI. Destination-language facts still come from country reference data; a successful translation-provider check does not make machine translation an authoritative language source.

Safety is database-backed verified reference data, not a third-party live-provider lookup. A successful Safety test verifies the filtering/provenance contract; it does not mean verified emergency records exist for every country.

## Immediate next engineering step

Finish Phase 7M safely:

1. Require complete green GitHub CI on the exact final head of PR `#13` after this handoff update.
2. Fix any real failure without weakening CI.
3. Confirm PR `#13` is mergeable and still points to that exact verified head.
4. Squash-merge PR `#13` into `develop` only after all five jobs are green.
5. Verify the resulting `develop` push CI is fully green.
6. Only then create the next feature branch from that exact verified merge commit.

## Recommended next slice

### Phase 7N — Destination transport foundation

The destination overview currently links the Transport card to `/transport` with validated destination context, but `/transport` is still only a generic `FeaturePage` shell.

The backend already has a server-side Geoapify maps adapter with geocoding, reverse geocoding and routing methods, including a normalized routing path. That does **not** by itself prove a safe public transport API contract already exists; Phase 7N must inspect server modules/routes, validation, API-client exposure and provider normalization before wiring any customer transport behavior.

Suggested Phase 7N scope:

1. Start from the exact verified post-merge Phase 7M `develop` commit.
2. Inspect `/transport`, maps/routing integration, maps normalizer/contract/factory, server route exposure, shared validation and API client before changing code.
3. Define one small provider-neutral transport/routing contract rather than exposing Geoapify directly to the browser.
4. Reuse validated destination context and server-side Geoapify credentials only.
5. Validate coordinates, waypoint count, transport mode and all provider-response geometry/distance/duration fields before they cross the public contract.
6. Begin with factual routing information the provider actually supplies; do not invent transit schedules, fares, ticket prices, service frequency, taxi prices, accessibility, disruption status or availability.
7. If current Geoapify routing does not provide real public-transit timetable/fare data, label the capability accordingly instead of presenting route geometry as live transit service.
8. Add honest loading, success, empty, error and retry states and reject malformed/mismatched provider responses.
9. Preserve all 18 locales, RTL, accessibility, responsive behavior and reduced motion.
10. Add focused server/API/UI tests and require the complete CI gate before merge.

Keep taxi-fare estimates, airport transfers, live transit schedules, tickets and broader transport discovery as separate provider-backed slices unless the inspected transport data source genuinely supports them.

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
