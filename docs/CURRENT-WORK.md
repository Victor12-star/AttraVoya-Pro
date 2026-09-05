# AttraVoya Pro — Current Work

This file is the permanent handoff point for continuing development safely in a new ChatGPT session.

## Repository

- Repository: `Victor12-star/AttraVoya-Pro`
- Integration branch: `develop`
- Production branch: `main`
- Rule: every feature slice must pass the full GitHub Actions CI gate before merge.
- Rule: after merge, verify the `develop` push CI before starting the next slice.
- Never merge a diagnostic or temporary CI configuration.

## Product rules that must stay true

- Use provider-neutral backend APIs. Browser/mobile clients must not call paid/keyed third-party APIs directly.
- Never invent live fares, availability, schedules, prices, safety data, ratings, airport codes, terminal information, medical capabilities, waiting times, opening status, medication stock, prescription availability, pharmacist availability, police staffing/response availability, supermarket stock/product availability, ATM operational/cash/card/network/currency/deposit/fee/limit/accessibility claims, parking occupancy/availability/prices/restrictions/permits/payment methods/opening hours/reservations/EV charging/vehicle limits/security/accessibility claims, museum exhibitions, ticket prices, accessibility, or provider results.
- Clearly distinguish provider-returned facts from estimates or static reference data.
- Keep provider credentials server-side.
- Keep destination routing strict so altered or incomplete share URLs do not silently render different data.
- Keep public travel data honest when provider keys are absent: show unavailable/empty states rather than fabricated content.
- Keep all supported UI locales working, including Arabic RTL behavior.
- Verified emergency contacts remain authoritative Safety data and must not be replaced by inferred place-provider medical or police-service information.

## Completed integration checkpoints

### Phase 7P — Destination News Discovery

- PR #16 merged into `develop`.
- Merge commit: `7ba5f58dc0c5585274ac2cb1a0cfed3818ef3697`.
- Final PR CI #208 and post-merge `develop` CI #209 passed all five top-level jobs.
- Uses the provider-neutral News API; the browser does not call NewsData directly.
- `NEWSDATA_API_KEY` was absent in CI, so this is not live keyed NewsData verification.

### Phase 7Q — Destination Airports Discovery

- PR #17 merged into `develop`.
- Final PR head: `c50b98d819f42b86018abb2f2bc712a89618902b`.
- Final PR CI #218 passed all five jobs.
- Squash merge commit: `889b26ec520571c073ef2d1821348f31e628ed0e`.
- Post-merge `develop` CI #219 passed all five jobs.
- Uses provider-neutral nearby places and does not invent airport codes, terminals, schedules, live flights, fares, transfer prices, availability, or main/best/cheapest-airport claims.
- `GEOAPIFY_API_KEY` was absent in CI, so this is not live keyed Geoapify verification.

### Phase 7R — Destination Hospitals Discovery

- PR #18 merged into `develop`.
- Final PR head: `89366de9b3669ad79639c152f5ebbe5fffb4d74f`.
- Final PR CI #225 passed all five jobs.
- Squash merge commit: `3eab22ab9d636ae055378d25cd04e76754f75a40`.
- Post-merge `develop` CI #226 passed all five jobs.
- Hospital discovery uses provider-neutral nearby places and links to verified Safety & emergency contacts.
- It does not invent or infer emergency-department status, medical services, opening hours, waiting times, capacity, quality, ratings, or availability.
- `GEOAPIFY_API_KEY` was absent in CI, so this is not live keyed Geoapify verification.

### Phase 7S — Destination Museums Discovery

- PR #19 merged into `develop`.
- Final PR head: `4c71574e27d0501f23b32a1f7b420f80e8b2ffb2`.
- Final PR CI #232 passed all five jobs.
- Squash merge commit: `787a598df2b99f7d2ded9be91cde32b54e339d74`.
- Post-merge `develop` CI #233 passed all five jobs.
- Museum discovery uses `apiClient.getNearbyPlaces(...)` with the existing provider-neutral museum category.
- It renders only supported normalized location facts and does not invent exhibitions, opening hours, ticket prices, accessibility, ratings, or availability.
- `GEOAPIFY_API_KEY` was absent in CI, so this is not live keyed Geoapify verification.

### Phase 7T — Destination Pharmacies Discovery

- PR #20 merged into `develop`.
- Final PR head: `dcce535733af7c13b0d135c86a220f55390f5b86`.
- Final PR CI #241 passed all five jobs.
- Squash merge commit: `173b79c783639e1ae1257a44e985ab10a3ec44db`.
- Post-merge `develop` CI #242 passed all five jobs.
- Pharmacy discovery uses the provider-neutral nearby places API and links to verified Safety & emergency contacts.
- It does not invent or infer medication stock, prescription or pharmacist availability, opening status, medication prices, services, medical advice, or suitability for urgent care.
- `GEOAPIFY_API_KEY` was absent in CI, so this is not live keyed Geoapify verification.

### Phase 7U — Destination Police Stations Discovery

- PR #21 merged into `develop`.
- Final PR head: `ed8b4cc9dee6ed51b1521bfede4f5502f964848c`.
- Final PR CI #247 passed all five jobs.
- Squash merge commit: `fca97e230bb97ab2d36818d5a9c943a106b557a6`.
- Post-merge `develop` CI #248 passed all five jobs.
- Police discovery uses the provider-neutral nearby places API and links to verified Safety & emergency contacts.
- It does not invent or infer station type, opening status, staffing, response availability, phone availability, emergency handling, or walk-in availability.
- `GEOAPIFY_API_KEY` was absent in CI, so this is not live keyed Geoapify verification.

### Phase 7V — Destination Supermarkets Discovery

- PR #22 merged into `develop`.
- Final PR head: `271db7622a7573b1e264a3243fe295631064f82f`.
- Final PR CI #254 passed all five top-level jobs.
- Squash merge commit: `230b36e68fbf74b5c7d8af88c7a6d84d4fd3b2d3`.
- Post-merge `develop` CI #255 passed all five top-level jobs.
- Supermarket discovery uses `apiClient.getNearbyPlaces(...)` with `PLACE_CATEGORY_GROUPS.SUPERMARKETS`, mapped by the Geoapify adapter to `commercial.supermarket`.
- It renders only supported normalized location facts and does not invent opening status, stock, product availability, prices, promotions, delivery, collection, queues, or payment methods.
- A temporary branch-only formatter diagnostic was used during the PR and was removed before final verification; root `format:check` remained `prettier --check .` in the merged result.
- `GEOAPIFY_API_KEY` was absent in CI, so this is not live keyed Geoapify verification.

### Phase 7W — Destination ATMs Discovery

- PR #23 merged into `develop`.
- Final PR head: `4d8f6fb291dfb600598b99027e93a31a2c9a5c7c`.
- Final PR CI #261 passed all five top-level jobs.
- Squash merge commit: `697a56f207abab7af55646ce1d0dbd2f19e159e2`.
- Post-merge `develop` CI #262 passed all five top-level jobs.
- ATM discovery uses `apiClient.getNearbyPlaces(...)` with `PLACE_CATEGORY_GROUPS.ATMS`, mapped by the Geoapify adapter to `service.financial.atm`.
- It renders only normalized location facts and does not invent operational status, cash availability, supported cards/networks, currencies/denominations, deposits, fees, withdrawal limits, access hours, or accessibility claims.
- A temporary branch-only formatter diagnostic was removed before the final PR head; root `format:check` was `prettier --check .` in the merged result.
- `GEOAPIFY_API_KEY` was absent in CI, so this is not live keyed Geoapify verification.

## Current phase

### Phase 7X — Destination Parking Discovery

Branch: `feature/phase-7x-destination-parking`

PR: #24 — `Phase 7X: destination parking discovery`

Base checkpoint: `697a56f207abab7af55646ce1d0dbd2f19e159e2` — verified Phase 7W `develop` merge.

Implemented:

- `/destinations/[slug]/parking` route.
- Parking entry point in the destination feature grid using a Lucide parking icon.
- `parking` added to the strict destination child-route allowlist.
- Reuses `apiClient.getNearbyPlaces(...)` and the existing provider-neutral places backend; browser code never calls Geoapify directly.
- Uses `PLACE_CATEGORY_GROUPS.PARKING`, mapped by the Geoapify adapter to `parking`.
- Uses a 10 km search radius, result limit of 24, destination coordinates, and the active UI locale.
- Renders only normalized provider facts used by this slice: parking/place name, formatted address, distance, provider/check time, and HTTPS website when present.
- Rejects invalid coordinates, duplicate rows, mismatched countries, mismatched providers, and unsafe website URLs.
- Does not invent, infer, or display parking occupancy or live-space availability, prices, restrictions, permits, payment methods, opening/access hours, reservation status, EV charging, vehicle/height limits, security, or accessibility claims, even if unexpected provider payload fields contain those values.
- Honest loading, success, empty, provider-error, retry, and invalid-destination states.
- Copy is provided for all 18 supported UI locales.
- Focused tests cover the Parking page, exact provider-neutral API request, unsupported parking-field omission, country/provider filtering, HTTPS safety, empty state, error privacy, retry, invalid destination, strict child route, and destination dashboard entry point.

Verification history:

- Initial implementation head `0abfcc0f8db28af0758c71f6cb724f858e36cf3b` ran PR CI #263. Production build, database, dependency/secret, live no-cost-provider, JavaScript, translations, provider smoke, ESLint, and all unit tests passed; only repository-wide Prettier flagged `apps/web/tests/unit/parking-page.test.jsx`.
- A first formatting-only correction in `c2e6e22a4c83e604581b475928e7bac2f9ef774f` ran CI #264. All functional gates again passed, including 123 web tests and production build, but Prettier still flagged only the Parking test.
- Branch-only diagnostic head `379619120093c235c3871785c4d7b4ba92f09afa` ran CI #265 solely to capture exact Prettier 3.9.6 output for that one test. It showed only mechanical single-line formatting for the dynamic import and four JSX `render(...)` calls. This diagnostic configuration must never be merged.
- Exact formatter output was applied in `81b26c5722d40dc35d31a5f65dd5e53817e97f41`.
- Root `package.json` was restored to `"format:check": "prettier --check ."` in clean code checkpoint `882f450690a8a51ef0ba647ed32f0b5f994cab7f`.
- Clean-code CI #267 on exact head `882f450690a8a51ef0ba647ed32f0b5f994cab7f` passed all five top-level jobs, including repository-wide Prettier, production builds, database verification, dependency/secret checks, live no-cost-provider checks, JavaScript, translations, ESLint, and the complete unit-test suite.
- `GEOAPIFY_API_KEY` is not configured in GitHub Actions. Provider smoke tests make no external Geoapify request. Therefore Phase 7X must not be described as a live keyed Geoapify parking request.

### Required next steps

1. This handoff update changes the PR head, so run the complete five-job PR CI on the exact new documentation head.
2. Confirm root `package.json` still contains `"format:check": "prettier --check ."`.
3. Verify PR #24 still targets `develop`, is mergeable, and its head SHA exactly matches the final CI-verified SHA.
4. Squash-merge PR #24 using expected-head protection.
5. Verify the resulting merge commit is the `develop` head.
6. Verify the post-merge `develop` push CI passes all five top-level jobs.
7. Only after that post-merge gate is green, mark Phase 7X complete and choose/start the next uncovered provider-backed destination slice from the verified `develop` checkpoint.

## CI interpretation rule

The five top-level CI jobs are the merge gate:

- Code quality and unit tests
- Live no-cost provider checks
- Production builds
- Dependency and secret checks
- PostgreSQL and Prisma verification

A provider smoke test that makes no external request, or a live check that omits a keyed provider because its secret is absent, is not live verification of that keyed provider. Do not overstate CI coverage.

## Branch discipline

- Start each slice from the latest verified `develop` commit.
- Work on a dedicated `feature/...` branch.
- Open a PR into `develop`.
- Fix failures on the feature branch only.
- Do not weaken tests, formatter rules, validation, security boundaries, or provider honesty to make CI pass.
- When documentation is updated before merge, that documentation commit becomes the new final PR head and must pass the complete CI gate before merge.
