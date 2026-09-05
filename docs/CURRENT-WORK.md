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
- Never invent live fares, availability, schedules, prices, safety data, ratings, airport codes, terminal information, or provider results.
- Clearly distinguish provider-returned facts from estimates or static reference data.
- Keep provider credentials server-side.
- Keep destination routing strict so altered or incomplete share URLs do not silently render different data.
- Keep public travel data honest when provider keys are absent: show unavailable/empty states rather than fabricated content.
- Keep all supported UI locales working, including Arabic RTL behavior.

## Completed integration checkpoint

### Phase 7P — Destination News Discovery

Merged through PR #16 into `develop`.

- Merge commit: `7ba5f58dc0c5585274ac2cb1a0cfed3818ef3697`
- Final PR-head CI: #208 — all five top-level jobs passed.
- Post-merge `develop` CI: #209 — all five top-level jobs passed.
- The News route uses the provider-neutral News API and does not call NewsData from the browser.
- News results are normalized, deduplicated, country-scoped, HTTPS-link checked, localized, and include honest provider-delay disclosure.
- `NEWSDATA_API_KEY` was not present in CI, so this must not be described as live keyed NewsData verification.

After Phase 7P, an accidental empty placeholder file was immediately removed. Cleanup checkpoint `16f28cee864f0ea473d9d297c8744c363a91e8e3` has the same application tree as the Phase 7P merge and passed all five jobs in CI #211. Phase 7Q was branched from this verified cleanup checkpoint.

## Current phase

### Phase 7Q — Destination Airports Discovery

Branch: `feature/phase-7q-destination-airports`

PR: #17 — `Phase 7Q: destination airports discovery`

Implemented:

- `/destinations/[slug]/airports` route.
- Airports entry point in the destination feature grid.
- `airports` added to the strict destination child-route allowlist.
- Reuses `apiClient.getNearbyPlaces(...)` and the existing provider-neutral places backend.
- Uses the existing `PLACE_CATEGORY_GROUPS.AIRPORTS` alias, currently mapped by the Geoapify adapter to the provider airport category.
- 50 km nearby search radius with a result limit of 20 and active UI locale.
- Renders only normalized factual provider fields used by this slice: airport/place name, formatted address, distance, provider and HTTPS website when present.
- Rejects invalid coordinates, duplicate records, mismatched country rows, mismatched provider rows and unsafe website URLs.
- Does not invent or infer airport codes, terminal information, airline schedules, live flights, fares, transfer prices, availability, or a claim that an airport is the destination's main/best/cheapest airport.
- Honest loading, empty, provider-error, retry and invalid-destination states.
- Copy is provided for all 18 supported UI locales.
- Focused tests cover the airports page, strict child route and destination dashboard entry point.

Verification history:

- Initial PR head `ede363eb9a184fd03bc7f57e3f3ff6c083584d3a` reached CI #212. JavaScript checks, translations, provider smoke tests, ESLint, unit tests, database checks, live no-cost provider checks and dependency/security checks passed; the only identified issue was Prettier formatting in three Phase 7Q files.
- A branch-only diagnostic formatter commit `86baa457f984698616fd6c54d8a2c1e168fe9959` was used only to capture exact Prettier output. It must never be merged as the final head.
- Exact Prettier output was applied to the three affected files and the normal root `format:check` command was restored to `prettier --check .` in clean code head `c7a15bac0e3c871f0189917893c8f41d85d58fdb`.

### Required next steps

1. Move `feature/phase-7q-destination-airports` to clean code commit `c7a15bac0e3c871f0189917893c8f41d85d58fdb` if it is not already there.
2. Confirm root `package.json` again contains `"format:check": "prettier --check ."`.
3. Run the full PR CI on the exact clean Phase 7Q head. All five top-level jobs must pass.
4. Because this handoff update changes the PR head, run the full PR CI again on the exact final documentation head and require all five jobs to pass.
5. Verify PR #17 still targets `develop`, is mergeable, and its head SHA is exactly the CI-verified final SHA.
6. Squash-merge PR #17 using expected-head protection.
7. Verify the merge commit becomes the `develop` head.
8. Wait for the post-merge `develop` push CI and require all five top-level jobs to pass.
9. Only after that post-merge gate is green, choose and start Phase 7R from the verified `develop` checkpoint.

## CI interpretation rule

The five top-level CI jobs are the merge gate:

- Code quality and unit tests
- Live no-cost provider checks
- Production builds
- Dependency and secret checks
- PostgreSQL and Prisma verification

A provider check that is skipped because a key is absent is not live verification of that keyed provider. Do not overstate CI coverage.

## Branch discipline

- Start each slice from the latest verified `develop` commit.
- Work on a dedicated `feature/...` branch.
- Open a PR into `develop`.
- Fix failures on the feature branch only.
- Do not weaken tests, formatter rules, validation, security boundaries, or provider honesty to make CI pass.
- When documentation is updated before merge, that documentation commit becomes the new final PR head and must pass the complete CI gate before merge.
