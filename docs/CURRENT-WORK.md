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
- Never invent live fares, availability, schedules, prices, safety data, ratings, airport codes, terminal information, medical capabilities, waiting times, opening status, medication stock, prescription availability, pharmacist availability, museum exhibitions, ticket prices, accessibility, or provider results.
- Clearly distinguish provider-returned facts from estimates or static reference data.
- Keep provider credentials server-side.
- Keep destination routing strict so altered or incomplete share URLs do not silently render different data.
- Keep public travel data honest when provider keys are absent: show unavailable/empty states rather than fabricated content.
- Keep all supported UI locales working, including Arabic RTL behavior.
- Verified emergency contacts remain authoritative Safety data and must not be replaced by inferred place-provider medical information.

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

## Current phase

### Phase 7T — Destination Pharmacies Discovery

Branch: `feature/phase-7t-destination-pharmacies`

PR: #20 — `Phase 7T: destination pharmacies discovery`

Base checkpoint: `787a598df2b99f7d2ded9be91cde32b54e339d74` — verified Phase 7S `develop` merge.

Implemented:

- `/destinations/[slug]/pharmacies` route.
- Pharmacies entry point in the destination feature grid using the Lucide `Pill` icon.
- `pharmacies` added to the strict destination child-route allowlist.
- Reuses `apiClient.getNearbyPlaces(...)` and the existing provider-neutral places backend; browser code never calls Geoapify directly.
- Uses `PLACE_CATEGORY_GROUPS.PHARMACIES` with a 10 km search radius, result limit of 20, destination coordinates, and the active UI locale.
- Renders only normalized provider facts used by this slice: pharmacy/place name, formatted address, distance, provider/check time, and HTTPS website when present.
- Rejects invalid coordinates, duplicate rows, mismatched countries, mismatched providers, and unsafe website URLs.
- Links to the existing verified Safety & emergency route for authoritative emergency contacts.
- Does not invent, infer, or display medication stock, prescription availability, pharmacist availability, opening status, medication prices, pharmacy services, medical advice, or suitability for urgent care, even if unexpected provider payload fields contain them.
- Honest loading, success, empty, provider-error, retry, and invalid-destination states.
- Copy is provided for all 18 supported UI locales.
- Focused tests cover the Pharmacy page, exact provider-neutral API request, medical-field omission, country/provider filtering, HTTPS safety, empty state, error privacy, retry, invalid destination, strict child route, and destination dashboard entry point.

Verification history:

- Initial implementation/test head `1a3dd6677beb160c5a4ed814de8e846a54f9d872` ran CI #234. Production build, database, dependency/secret, live no-cost-provider, JavaScript, translations, provider smoke, ESLint, and all unit tests passed; only repository formatting flagged `apps/web/src/features/destinations/pharmacies-page-copy.js`.
- Branch-only diagnostic head `074eb07c7213e9fe3bcd75a4706c80e15acc413f` ran CI #235 solely to capture Prettier 3.9.6 output. It showed mechanical line wrapping of long localized `intro` strings only. This diagnostic configuration is not merge-ready and must never be merged.
- The exact wrapping was applied and root `package.json` restored to `"format:check": "prettier --check ."`; clean candidate `a9b59f58f36d150c4f51cee428ba569177acb72b` ran CI #237. All functional, build, database, security, provider, JavaScript, translation, lint, and unit tests passed, but Prettier still flagged only the same copy file.
- Inspection showed the reconstructed copy file lacked Prettier's required final newline. A second branch-only diagnostic head `15d9c77a5d2fb21a1896d2fff86faafdeef4d2a7` was used only to inspect the remaining file-level difference and was superseded before becoming a merge candidate.
- The final newline was added without changing localized text or behavior; root `package.json` was again restored to standard repository-wide `prettier --check .`.
- Clean Phase 7T code checkpoint before this handoff update: `db0d6254cc01ab7cc215049b5ff020532536955c`.
- CI #240 on that clean checkpoint passed all five top-level jobs, including repository-wide Prettier, production builds, database verification, dependency/secret checks, live no-cost-provider checks, JavaScript, translations, ESLint, and the complete unit-test suite.
- `GEOAPIFY_API_KEY` is not configured in GitHub Actions. Provider smoke tests make no external API calls. Therefore Phase 7T must not be described as a live keyed Geoapify pharmacy request.

### Required next steps

1. This handoff update changes the PR head, so run the complete five-job PR CI on the exact new documentation head.
2. Confirm root `package.json` still contains `"format:check": "prettier --check ."`.
3. Verify PR #20 still targets `develop`, is mergeable, and its head SHA exactly matches the final CI-verified SHA.
4. Squash-merge PR #20 using expected-head protection.
5. Verify the resulting merge commit is the `develop` head.
6. Verify the post-merge `develop` push CI passes all five top-level jobs.
7. Only after that post-merge gate is green, mark Phase 7T complete and choose/start the next uncovered destination slice from the verified `develop` checkpoint.

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
