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
- Never invent live fares, availability, schedules, prices, safety data, ratings, airport codes, terminal information, medical capabilities, waiting times, opening status, or provider results.
- Clearly distinguish provider-returned facts from estimates or static reference data.
- Keep provider credentials server-side.
- Keep destination routing strict so altered or incomplete share URLs do not silently render different data.
- Keep public travel data honest when provider keys are absent: show unavailable/empty states rather than fabricated content.
- Keep all supported UI locales working, including Arabic RTL behavior.
- Verified emergency contacts remain authoritative Safety data and must not be replaced by inferred place-provider medical information.

## Completed integration checkpoints

### Phase 7P — Destination News Discovery

Merged through PR #16 into `develop`.

- Merge commit: `7ba5f58dc0c5585274ac2cb1a0cfed3818ef3697`
- Final PR-head CI: #208 — all five top-level jobs passed.
- Post-merge `develop` CI: #209 — all five top-level jobs passed.
- The News route uses the provider-neutral News API and does not call NewsData from the browser.
- `NEWSDATA_API_KEY` was not present in CI, so this must not be described as live keyed NewsData verification.

After Phase 7P, cleanup checkpoint `16f28cee864f0ea473d9d297c8744c363a91e8e3` passed all five jobs in CI #211.

### Phase 7Q — Destination Airports Discovery

Merged through PR #17 into `develop`.

- Final clean PR head: `c50b98d819f42b86018abb2f2bc712a89618902b`
- Final PR-head CI: #218 — all five top-level jobs passed, including normal repository-wide `prettier --check .`.
- Squash merge commit: `889b26ec520571c073ef2d1821348f31e628ed0e`
- Post-merge `develop` CI: #219 — all five top-level jobs passed.
- Airport discovery uses `apiClient.getNearbyPlaces(...)` with `PLACE_CATEGORY_GROUPS.AIRPORTS`; the browser does not call Geoapify directly.
- The UI renders only supported provider facts and does not invent airport codes, terminal data, airline schedules, live flights, fares, transfer prices, availability, or “main/best/cheapest airport” claims.
- `GEOAPIFY_API_KEY` was not present in CI, so Phase 7Q must not be described as live keyed Geoapify verification.

## Current phase

### Phase 7R — Destination Hospitals Discovery

Branch: `feature/phase-7r-destination-hospitals`

PR: #18 — `Phase 7R: destination hospitals discovery`

Base checkpoint: `889b26ec520571c073ef2d1821348f31e628ed0e` — verified Phase 7Q `develop` merge.

Implemented:

- `/destinations/[slug]/hospitals` route.
- Hospitals entry point in the destination feature grid using the Lucide `Hospital` icon.
- `hospitals` added to the strict destination child-route allowlist.
- Reuses `apiClient.getNearbyPlaces(...)` and the existing provider-neutral places backend; browser code never calls Geoapify directly.
- Uses `PLACE_CATEGORY_GROUPS.HOSPITALS` with a 20 km search radius, result limit of 20, destination coordinates, and the active UI locale.
- Renders only normalized provider facts used by this slice: hospital/place name, formatted address, distance, provider, provider fetched/checked time, and HTTPS website when present.
- Rejects invalid coordinates, duplicate records, mismatched country rows, mismatched provider rows, and unsafe website URLs.
- Links users to the existing verified Safety & emergency contacts route without treating nearby-place data as emergency guidance.
- Does not invent or infer emergency-department status, medical services, opening hours, waiting times, capacity, quality, ratings, phone availability, or medical availability.
- Honest loading, success, empty, provider-error, retry, and invalid-destination states.
- Copy is provided for all 18 supported UI locales.
- Focused tests cover the hospital page, provider-neutral API request contract, strict child route, destination dashboard entry point, unsupported medical-field omission, country/provider filtering, HTTPS safety, empty state, error privacy, retry, and invalid destination behavior.

Verification history:

- Initial functional PR head `5142627bc3ca52cc810d73eac433723b6c317fab` ran CI #220. Production builds, PostgreSQL/Prisma, dependency/secret checks, live no-cost provider checks, JavaScript checks, translations, provider smoke tests, ESLint, and all unit tests passed. The only failure was repository formatting for `apps/web/src/features/destinations/hospitals-page-copy.js`.
- Branch-only diagnostic commits `96d62c1fc075c468a084d4e31c52bd055002ce0f` and `3bec60e03d6e238516da0560fe62ba49ac41c618` were used only to capture Prettier 3.9.6 output. They are diagnostic history and must never be treated as merge-ready formatter configuration.
- CI #222 confirmed the exact Prettier changes were mechanical line wrapping only; no localized text or behavior changed.
- Exact Prettier output was applied to the hospital copy, producing blob `b011dca53d33512b12b73995360a0cd01db232cd`.
- Root `package.json` was restored to the standard `"format:check": "prettier --check ."`.
- Clean Phase 7R code checkpoint before this handoff update: `be4b1f880392d369b6e1140fdc6b02f6c2cbe327`.
- CI #224 on that clean checkpoint passed all five top-level jobs, including repository-wide Prettier, production builds, database verification, dependency/secret checks, live no-cost-provider checks, JavaScript, translations, ESLint, and unit tests.
- CI environment validation reports `GEOAPIFY_API_KEY` is not configured. Provider smoke tests make no external API calls. Therefore do not claim that Phase 7R performed a live keyed Geoapify hospital request in CI.

### Required next steps

1. This handoff update changes the PR head, so run the complete five-job PR CI on the exact new documentation head.
2. Confirm root `package.json` still contains `"format:check": "prettier --check ."`.
3. Verify PR #18 still targets `develop`, is mergeable, and its head SHA exactly matches the final CI-verified SHA.
4. Squash-merge PR #18 using expected-head protection.
5. Verify the resulting merge commit is the `develop` head.
6. Verify the post-merge `develop` push CI passes all five top-level jobs.
7. Only after that post-merge gate is green, mark Phase 7R complete and choose/start Phase 7S from the verified `develop` checkpoint.

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
