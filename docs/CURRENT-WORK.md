# AttraVoya Pro — Current Work Handoff

Last updated: 2026-09-04

This file is the engineering handoff for continuing AttraVoya Pro without relying on chat history.

## Repository and workflow

- GitHub: `Victor12-star/AttraVoya-Pro`
- Working integration branch: `develop`
- `main` is not the day-to-day development branch.
- Latest verified merged checkpoint before the current PR: Phase 7J merge commit `3f4dc70cf173d954d92a7a002813a1124eaae552`.
- Phase 7J post-merge `develop` CI `#154` passed all five workflow jobs.
- Current pull request: `#11` from `feature/phase-7k-safety-destination` into `develop`.

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

Completed and merged through PR `#9` at `cf05786c12279bf884e99312539d9f116f0de92d`.

Implemented real `/destinations/[slug]/family` discovery using the existing provider-neutral places API, factual playground/park/attraction categories, bounded 10 km requests, defensive normalization, child age bands `0–3`, `4–8`, `9–12`, `13–17` as planning context only, honest failure states, all 18 locales, and explicit guardrails against fabricated age suitability, child safety, supervision, accessibility, opening times, prices, ratings or availability.

Final-head PR CI `#148` and post-merge `develop` CI `#149` passed all five jobs.

### Phase 7J — Nearby destination discovery

Completed and merged through PR `#10` into `develop` at:

`3f4dc70cf173d954d92a7a002813a1124eaae552`

Implemented:

- real destination-aware `/nearby` experience
- validated destination context
- existing provider-neutral `/api/v1/places/nearby` API only
- factual cafés, supermarkets, pharmacies, ATMs and parking categories
- one selected category per request
- 3 km radius and capped 16-result request
- defensive normalization, deduplication and distance ordering
- genuine provider/name/address/distance/validated website fields only
- no fabricated walking times, hours, prices, ratings, accessibility, safety, popularity, crowds or availability
- category switching with loading, success, empty, error and retry states
- all 18 locales, RTL, responsive and reduced-motion behavior
- focused UI tests

Final-head PR CI `#153` and post-merge `develop` CI `#154` passed all five workflow jobs.

### Phase 7K — Verified Safety destination foundation

Current implementation is in PR `#11` from `feature/phase-7k-safety-destination` into `develop`.

The branch starts from the verified Phase 7J merge commit `3f4dc70cf173d954d92a7a002813a1124eaae552`.

Implemented:

- replaced `/destinations/[slug]/safety` unavailable shell with a real verified-emergency experience
- activated the pre-existing but empty server `emergency` module as a public read-only path
- reused the existing `EmergencyRecord` Prisma provenance model rather than inventing a parallel safety store
- new strict `/api/v1/emergency?countryCode=XX` contract with ISO2 validation
- repository filtering requires country match, `VERIFIED` status, `isPublished=true`, country-wide scope (`regionName=null`) and verification metadata
- service-level defense in depth revalidates required fields, authoritative HTTP/HTTPS source URL and `lastVerifiedAt` before a record crosses the public contract
- no emergency numbers are seeded, guessed, inferred from locale, or generated by AI
- the existing database seed continues to explicitly exclude fake emergency numbers
- shared API-client support for verified emergency records
- destination Safety UI uses only validated destination country context
- customer UI displays genuine service label, phone number, safe `tel:` action when possible, official source and last-verified date
- mismatched response country context is rejected client-side instead of showing another country's contacts
- honest empty state when AttraVoya has no verified published record
- honest error/retry behavior without exposing backend details
- basic emergency information remains public and subscription-independent
- no crime score, neighborhood-safety rating, political-risk claim, medical-access claim, travel advisory or other unsupported safety assertion was added
- all 18 locales, RTL-compatible/responsive/reduced-motion styling
- focused server and web tests

CI findings fixed without weakening the gate:

- CI `#155` caught a checkJs inference issue where the async Safety state status widened to `string`; an explicit `Promise<SafetyState>` JSDoc return contract fixed it
- CI `#156` then passed JavaScript, translations, provider smoke, lint, all tests, database, security, live-provider checks and production builds; only Prettier remained
- a temporary CI formatting diagnostic was added solely to run Prettier on the three Safety UI files inside the runner, print the exact diff, restore the files, and leave the normal format check failing
- the exact Prettier output was applied and the temporary diagnostic was completely removed; `.github/workflows/ci.yml` is back to its original blob and is not part of the final PR diff

Clean Phase 7K code checkpoint:

`6b27e62cefdfc15be327704903c2825ef7295b4d`

Clean code CI `#164` passed all five workflow jobs, including JavaScript, all 18 translation checks, provider smoke tests, ESLint, all unit/integration tests, normal `prettier --check .`, PostgreSQL/Prisma verification, dependency/secret checks, production builds and live-provider checks.

This handoff update creates a newer PR head. Do not merge PR `#11` based only on CI `#164`; require a new complete green CI run on the exact final head containing this documentation update.

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

The Safety slice is database-backed verified reference data, not a third-party live-provider lookup. A successful Safety test means the public filtering/provenance contract was verified; it does not mean emergency records exist for every country.

## Immediate next engineering step

Finish Phase 7K safely:

1. Require complete green GitHub CI on the exact final head of PR `#11` after this handoff update.
2. Fix any real failure without weakening CI.
3. Confirm PR `#11` is mergeable and still points to that exact verified head.
4. Merge PR `#11` into `develop` only after all five jobs are green.
5. Verify the resulting `develop` push CI is fully green.
6. Only then create the next feature branch from that exact verified merge commit.

## Recommended next slice

### Phase 7L — Destination currency foundation

The destination Currency page is still an unavailable shell. The project already has country/currency reference data plus a provider-neutral currency service backed by Frankfurter, with `/api/v1/currency/rates` and `/api/v1/currency/convert`. Frankfurter is also one of the real network paths exercised by the live-provider CI.

Suggested scope:

1. Inspect the destination Currency shell, country reference endpoint, shared currency client and Frankfurter normalizer before changing code.
2. Resolve the destination country's real configured currency/currencies from AttraVoya country reference data; never infer a currency from language or UI locale.
3. Use only the existing AttraVoya currency API from the browser; never call Frankfurter directly from customer code.
4. Show provider attribution/fetched date or other existing provenance fields returned by the normalized currency contract.
5. Provide a small useful conversion experience where the traveller can enter an amount and choose source currency while the destination currency is clearly identified.
6. Treat exchange rates as retrieved reference rates, not guaranteed card, cash, bank or bureau rates.
7. Never invent exchange rates, fees, spreads, ATM costs, card acceptance, cash requirements or merchant payment behavior.
8. Add honest loading, success, empty, error and retry states, including unsupported-currency handling.
9. Preserve all 18 locales, country/language/currency separation, RTL, accessibility, responsive behavior and reduced motion.
10. Add focused tests and require the complete CI gate before proceeding.

After Currency is verified and merged, inspect the still-unavailable destination Language page as the likely next isolated slice, reusing country-language reference data and the existing LibreTranslate foundation without presenting machine translation as an official language fact.

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
