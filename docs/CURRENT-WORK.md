# AttraVoya Pro — Current Work

This file is the permanent handoff point for continuing development safely in a new ChatGPT session.

## Repository

- Repository: `Victor12-star/AttraVoya-Pro`
- Integration branch: `develop`
- Production branch: `main`
- Rule: every feature slice must pass the full GitHub Actions CI gate on the exact final PR head before merge.
- Rule: after merge, verify the resulting `develop` push CI before starting the next slice.
- Never merge a diagnostic or temporary CI configuration.

## Product rules that must stay true

- Use provider-neutral backend APIs. Browser/mobile clients must not call paid/keyed third-party APIs directly.
- Never invent live fares, availability, schedules, prices, safety data, ratings, airport codes, terminal information, medical capabilities, waiting times, opening status, medication stock, prescription availability, pharmacist availability, police staffing/response availability, supermarket stock/product availability, ATM operational/cash/card/network/currency/deposit/fee/limit/accessibility claims, parking occupancy/availability/prices/restrictions/permits/payment methods/opening hours/reservations/EV charging/vehicle limits/security/accessibility claims, café opening/menu/item/price/reservation/seating/Wi-Fi/rating/review/wait-time/dietary/delivery/takeaway/payment/accessibility/service claims, museum exhibitions, ticket prices, accessibility, or provider results.
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
- `NEWSDATA_API_KEY` was absent in CI, so this is not live keyed NewsData verification.

### Phase 7Q — Destination Airports Discovery

- PR #17 merged into `develop`.
- Final PR head: `c50b98d819f42b86018abb2f2bc712a89618902b`.
- Final PR CI #218 passed all five jobs.
- Squash merge commit: `889b26ec520571c073ef2d1821348f31e628ed0e`.
- Post-merge `develop` CI #219 passed all five jobs.
- `GEOAPIFY_API_KEY` was absent in CI, so this is not live keyed Geoapify verification.

### Phase 7R — Destination Hospitals Discovery

- PR #18 merged into `develop`.
- Final PR head: `89366de9b3669ad79639c152f5ebbe5fffb4d74f`.
- Final PR CI #225 passed all five jobs.
- Squash merge commit: `3eab22ab9d636ae055378d25cd04e76754f75a40`.
- Post-merge `develop` CI #226 passed all five jobs.

### Phase 7S — Destination Museums Discovery

- PR #19 merged into `develop`.
- Final PR head: `4c71574e27d0501f23b32a1f7b420f80e8b2ffb2`.
- Final PR CI #232 passed all five jobs.
- Squash merge commit: `787a598df2b99f7d2ded9be91cde32b54e339d74`.
- Post-merge `develop` CI #233 passed all five jobs.

### Phase 7T — Destination Pharmacies Discovery

- PR #20 merged into `develop`.
- Final PR head: `dcce535733af7c13b0d135c86a220f55390f5b86`.
- Final PR CI #241 passed all five jobs.
- Squash merge commit: `173b79c783639e1ae1257a44e985ab10a3ec44db`.
- Post-merge `develop` CI #242 passed all five jobs.

### Phase 7U — Destination Police Stations Discovery

- PR #21 merged into `develop`.
- Final PR head: `ed8b4cc9dee6ed51b1521bfede4f5502f964848c`.
- Final PR CI #247 passed all five jobs.
- Squash merge commit: `fca97e230bb97ab2d36818d5a9c943a106b557a6`.
- Post-merge `develop` CI #248 passed all five jobs.

### Phase 7V — Destination Supermarkets Discovery

- PR #22 merged into `develop`.
- Final PR head: `271db7622a7573b1e264a3243fe295631064f82f`.
- Final PR CI #254 passed all five jobs.
- Squash merge commit: `230b36e68fbf74b5c7d8af88c7a6d84d4fd3b2d3`.
- Post-merge `develop` CI #255 passed all five jobs.

### Phase 7W — Destination ATMs Discovery

- PR #23 merged into `develop`.
- Final PR head: `4d8f6fb291dfb600598b99027e93a31a2c9a5c7c`.
- Final PR CI #261 passed all five jobs.
- Squash merge commit: `697a56f207abab7af55646ce1d0dbd2f19e159e2`.
- Post-merge `develop` CI #262 passed all five jobs.

### Phase 7X — Destination Parking Discovery

- PR #24 merged into `develop`.
- Final PR head: `eed293b09a5a85c9861d77cb56e80d77cca6a7ba`.
- Final PR CI #268 passed all five top-level jobs.
- Squash merge commit: `6aba31facf49ff7f2d62ea384645cc73efcc2055`.
- Post-merge `develop` CI #269 passed all five top-level jobs.
- Parking discovery uses `apiClient.getNearbyPlaces(...)` with `PLACE_CATEGORY_GROUPS.PARKING`, mapped by the Geoapify adapter to `parking`.
- It renders only normalized location facts and does not invent occupancy or live-space availability, prices, restrictions, permits, payment methods, opening/access hours, reservations, EV charging, vehicle/height limits, security, or accessibility claims.
- A temporary branch-only formatter diagnostic was removed before the final PR head; root `format:check` was `prettier --check .` in the merged result.
- `GEOAPIFY_API_KEY` was absent in CI, so this is not live keyed Geoapify verification.

## Current phase

### Phase 7Y — Destination Cafés Discovery

Branch: `feature/phase-7y-destination-cafes`

PR: #25 — `Phase 7Y: destination cafés discovery`

Base checkpoint: `6aba31facf49ff7f2d62ea384645cc73efcc2055` — verified Phase 7X `develop` merge.

Implemented:

- `/destinations/[slug]/cafes` route using the shared strict destination selection/parser contract.
- Cafés entry point in the destination feature grid using the Lucide `Coffee` icon.
- `cafes` added to the strict destination child-route allowlist.
- Reuses `apiClient.getNearbyPlaces(...)` and the existing provider-neutral places backend; browser code never calls Geoapify directly.
- Uses `PLACE_CATEGORY_GROUPS.CAFES`, mapped by the Geoapify adapter to `catering.cafe`.
- Uses a 10 km search radius, result limit of 24, destination coordinates, and the active UI locale.
- Renders only normalized provider facts used by this slice: café/place name, formatted address, distance, provider/check time, and HTTPS website when present.
- Rejects invalid coordinates, duplicate rows, mismatched countries, mismatched providers, and unsafe website URLs.
- Does not invent, infer, or display opening hours/open-now status, menus/items, prices, reservations, seating/space availability, Wi-Fi, ratings/reviews, wait times, dietary suitability, delivery/takeaway, payment methods, accessibility, or service availability, even if unexpected provider payload fields contain those values.
- Honest loading, success, empty, provider-error, retry, and invalid-destination states.
- Copy is provided for all 18 supported UI locales.
- Focused tests cover the Café page, exact provider-neutral API request, unsupported-field omission, country/provider filtering, HTTPS safety, empty state, error privacy, retry, invalid destination, strict child route, and destination dashboard entry point.

Verification history:

- Initial implementation head `6feede2b68e655509deba4ad5c6c262ea0550864` ran PR CI #270. Production build, database, dependency/secret, live no-cost-provider, JavaScript, translations, provider smoke, ESLint, and all unit tests passed; only repository-wide Prettier flagged three files: `cafes-page-copy.js`, `cafes-page.test.jsx`, and `destination-page.test.jsx`.
- Branch-only diagnostic head `c54a7e57b5e627c76e18993aaeaf9e16bf3e4d23` ran CI #271 solely to capture exact Prettier 3.9.6 output. The diagnostic showed mechanical locale-line wrapping, one assertion-line collapse, and one missing final newline. The diagnostic configuration is not a valid merge candidate.
- Exact formatter output was applied in commits `b39ba6317af58bd947394d5a347e8ce7fced8834`, `8e3dd1dcf0ac4fda4d34e77dd738e25251842a94`, and `cfbcfe0c00b8cc41c4a4b98fff502736cd71ff34`.
- Root `package.json` was restored exactly to `"format:check": "prettier --check ."` in clean code checkpoint `8f32077d3b3746a164a00a979580a935287d0bd4`; its package blob is the normal `af4b2abbc4b5b1887f9a6293cd1a411649a69f7c`.
- Clean-code CI #275 on exact head `8f32077d3b3746a164a00a979580a935287d0bd4` passed all five top-level jobs, including repository-wide Prettier, production builds, database verification, dependency/secret checks, live no-cost-provider checks, JavaScript, translations, ESLint, and the complete unit-test suite. The web suite contains 128 passing tests across 28 files.
- `GEOAPIFY_API_KEY` is not configured in GitHub Actions. Provider smoke tests make no external Geoapify request. Therefore Phase 7Y must not be described as a live keyed Geoapify café request.

### Required next steps

1. This handoff update changes the PR head, so run the complete five-job PR CI on the exact new documentation head.
2. Confirm root `package.json` still contains `"format:check": "prettier --check ."`.
3. Verify PR #25 still targets `develop`, is mergeable, and its head SHA exactly matches the final CI-verified SHA.
4. Squash-merge PR #25 using expected-head protection.
5. Verify the resulting merge commit is the `develop` head.
6. Verify the post-merge `develop` push CI passes all five top-level jobs.
7. Only after that post-merge gate is green, mark Phase 7Y complete and inspect the current product/provider roadmap before selecting the next slice. Do not create a duplicate standalone page for functionality already covered by Family, Accommodation, Nearby, Restaurants, Shopping, or another verified destination feature.

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
