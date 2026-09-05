# AttraVoya Pro — Current Work

This file is the permanent handoff point for continuing development safely in a new ChatGPT session.

## Repository

- Repository: `Victor12-star/AttraVoya-Pro`
- Integration branch: `develop`
- Production branch: `main`
- Rule: every feature slice must pass the full GitHub Actions CI gate on the exact final PR head before merge.
- Rule: after merge, verify the resulting `develop` push CI before starting the next slice.
- Never merge a diagnostic or temporary CI configuration.
- JavaScript only unless the owner explicitly approves TypeScript.

## Product rules that must stay true

- AttraVoya is budget-first: a traveller can enter the total budget, origin, dates/flexibility, travellers/children, interests, comfort level, accommodation preferences, and preferred currency, then receive feasible plans that stay within that budget.
- Use provider-neutral backend APIs. Browser/mobile clients must not call paid/keyed third-party APIs directly.
- Never invent live fares, availability, schedules, prices, safety data, ratings, airport codes, terminal information, medical capabilities, waiting times, opening status, medication stock, police response availability, accommodation inventory, attraction availability, café facts, or provider results.
- Clearly distinguish provider-returned facts from estimates, planning targets, or static reference data. Future planner estimates must retain explicit provenance.
- Keep provider credentials server-side.
- Keep destination routing strict so altered or incomplete share URLs do not silently render different data.
- Keep public travel data honest when provider keys are absent: show unavailable/empty states rather than fabricated content.
- Keep all supported UI locales working, including Arabic RTL behavior.
- Verified emergency contacts remain authoritative Safety data and must not be replaced by inferred place-provider medical or police-service information.
- Basic safety must never be paywalled; premium access must never imply admin privileges.
- Frontend visibility is not an authorization boundary. Protected persistence and private traveller data must be enforced on the server.
- Private travel intent and budget data should not be stored in public/shared caches.

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
- Final PR CI #268 passed all five jobs.
- Squash merge commit: `6aba31facf49ff7f2d62ea384645cc73efcc2055`.
- Post-merge `develop` CI #269 passed all five jobs.

### Phase 7Y — Destination Cafés Discovery

- PR #25 merged into `develop`.
- Final PR head: `1d93092f370bd9a52fce843808e8b68f36392c90`.
- Final PR CI #276 passed all five top-level jobs.
- Squash merge commit: `f5ab4082af2e33289650ec6e9c1d5bb799b4932d`.
- Post-merge `develop` CI #277 passed all five top-level jobs.
- This completed the thin standalone destination-category series. Do not create another near-duplicate category page unless a genuinely distinct product need appears.
- `GEOAPIFY_API_KEY` was absent in CI; provider smoke tests did not make a live keyed Geoapify request.

### Phase 7Z — Budget Planner Request Foundation

- PR #26 merged into `develop`.
- Final PR head: `9cca9a9abbfd8f64ab0b82016ae4e4ee5293e0d9`.
- Final PR CI #288 passed all five top-level jobs.
- Squash merge commit: `5fcd174a252913e1f0aa6ba47e5b3057518531fd`.
- Post-merge `develop` CI #289 passed all five top-level jobs.
- Added authenticated owner-scoped create/list/get planner-request APIs with `private, no-store` responses.
- Reused the existing `TravelPlanRequest` / `TravelStayPreference` Prisma domain; no duplicate planner schema or migration was added.
- Added currency/reference/date/traveller validation and shared API-client methods.
- Cross-user request access resolves as 404 rather than leaking existence.
- Phase 7Z intentionally did not invent destination recommendations, prices, availability, or budget allocations.

### Phase 8A — Budget Planner Web Request Flow

- PR #27 merged into `develop`.
- Final PR head: `bfa7f232d2c89d5c9cf14f2ddeb5f66a73ba3bb1`.
- Final PR CI #299 passed all five top-level jobs.
- Squash merge commit: `33012b6b9fa2035de1b10c0698d08b542e1740b9`.
- Post-merge `develop` CI #300 passed all five top-level jobs on that exact merge SHA.
- Replaced the `/trips` placeholder with the first real authenticated budget-planner workflow.
- Collects origin, fixed/flexible dates, stay length, total budget/currency, safety reserve, adults/children ages, interests, comfort level, broad lodging preferences, and family-friendly preference.
- Uses shared browser validation while the server remains authoritative.
- Loads and saves owner-scoped private planning briefs with loading, empty, authentication, unavailable/error, retry, saving, success, and validation states.
- Uses same-site cookie authentication; no second browser token store was introduced.
- Responsive UI uses existing design tokens, Lucide icons, reduced-motion support, and planner copy for all 18 supported UI locales.
- Phase 8A intentionally does not generate destination recommendations, fares, accommodation prices/inventory, availability, or budget allocations.

## Current phase

### Phase 8B — Deterministic Budget Allocation Envelope

Branch: `feature/phase-8b-budget-allocation-envelope`

PR: #28 — `Phase 8B: deterministic budget allocation envelope`

Base checkpoint: `33012b6b9fa2035de1b10c0698d08b542e1740b9` — verified Phase 8A `develop` merge with post-merge CI #300 green.

Reason for this phase:

- The traveller can now save a real planning brief, but AttraVoya still needs a transparent budget envelope before recommendation ranking or provider pricing is introduced.
- The existing Prisma domain already has `TravelPlanRecommendation`, versioned `BudgetPlan`, `BudgetLine`, pricing basis, confidence, and fit-status structures for later provider-backed planning.
- `BudgetPlan` currently belongs to a recommendation or trip rather than directly to a planning request, so Phase 8B deliberately derives a request-owned envelope instead of forcing planning targets into price-estimate persistence prematurely.
- The Prisma migration directory currently contains only `.gitkeep`; this slice therefore makes no schema or migration change.

Implemented:

- Added protected `GET /api/v1/planner/requests/:requestId/allocation`.
- Reuses owner-scoped `findOwnedRequestById`; another traveller receives 404 rather than existence disclosure.
- Allocation responses use `Cache-Control: private, no-store` because they are derived from private budget/travel intent.
- Added a pure deterministic allocation engine using integer money math for stable two-decimal totals.
- Takes the traveller's saved safety-reserve percentage from the total budget first, then allocates only the remaining spendable budget.
- Versioned planning policy key: `attravoya-budget-envelope-v1`, policy version `1`.
- Spendable-budget targets are deliberately transparent product heuristics:
  - Flights: 30%
  - Accommodation: 32%
  - Food: 15%
  - Local transport: 8%
  - Activities: 7%
  - Children's activities: 3%
  - Airport transfer: 3%
  - Travel insurance: 2%
- When no children are present, the 3% children's-activity target is set to zero and moved to general activities, making activities 10% while preserving the exact spendable total.
- Integer-cent rounding remainder is assigned deterministically to accommodation so all target amounts always add back to the exact spendable budget.
- The API labels the reserve as `USER_INPUT_DERIVED` and category allocations as `PLANNING_TARGET`.
- Provenance explicitly states `liveDataUsed: false` and `providerDataUsed: false`.
- Shared API client exposes `getBudgetAllocation(requestId)` and URL-encodes the request ID.
- Focused server/API-client tests verify exact allocation totals, child/no-child behavior, authentication, owner isolation, private caching, provenance, and encoded request IDs.

Data-honesty boundary:

- These amounts divide only the traveller's own entered budget after their chosen safety reserve.
- They are not fares, prices, quotes, availability, or destination-specific cost estimates.
- Phase 8B does not call flight, accommodation, activity, transport, or other pricing providers.
- Phase 8B does not persist these planning targets as `BudgetLine` price estimates because the database pricing-basis semantics are reserved for later provenance-aware recommendation/trip planning.
- Future provider-backed costs must be compared against these targets and retain their own live/verified/estimate provenance rather than silently replacing the distinction.

Verification history:

- Initial implementation head `05ed2ba30b48479122671d96867fe7b9438fa768` opened PR #28 and ran CI #301. PostgreSQL/Prisma and dependency/secret checks passed; code quality stopped at strict JavaScript before tests/Prettier because frozen literal target weights produced narrow numeric types and `.find()` targets were considered possibly undefined.
- Strict-JavaScript fix head `b2279ba35e8909ba03c3ab3dd3f86fb715641cce` replaced mutable `.find()` logic with explicit numeric planning weights and a category-based rounding pass. CI #302 passed strict JavaScript, translations, provider smoke, PostgreSQL/Prisma, dependency/secret, and live-provider checks. ESLint then rejected the decimal parser regex under `security/detect-unsafe-regex`; tests and Prettier correctly did not run after lint failed.
- Security/lint fix head `303e7d0ea1e90680e455bbe9bfd3eef4c9090f9b` removed the regex entirely and uses bounded character-by-character decimal validation instead.
- Clean-code PR CI #303 on exact head `303e7d0ea1e90680e455bbe9bfd3eef4c9090f9b` passed all five top-level CI jobs, including strict JavaScript, translations, provider smoke, ESLint, all unit tests, repository-wide Prettier, production builds, PostgreSQL/Prisma, dependency/secret checks, and live no-cost-provider checks.

### Required next steps

1. This handoff update changes PR #28's head. Run the complete five-job PR CI on the exact new documentation head.
2. Confirm root `package.json` remains canonical with `"format:check": "prettier --check ."` and `.github/workflows/ci.yml` remains the canonical workflow.
3. Verify PR #28 still targets `develop`, is mergeable, and its head SHA exactly matches the final CI-verified SHA.
4. Squash-merge PR #28 using expected-head protection.
5. Verify the returned merge SHA is the actual `develop` head.
6. Verify the post-merge `develop` push CI passes all five top-level jobs.
7. Only after that gate is green, start the next planner slice from the new verified `develop` SHA.
8. Best next product direction: Phase 8C should expose the verified allocation envelope in the `/trips` UI with localized category labels, clear planning-target/provenance wording, and loading/error/retry/auth states. Do not present targets as live or estimated market prices, and do not start recommendation ranking until that distinction is safely visible to users.

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
