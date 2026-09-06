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
- Private travel intent and budget data must not be stored in public/shared caches.
- A published destination-catalog entry is not proof that a trip is affordable, available, safe for a specific traveller, or bookable. Planner candidate discovery must remain separate from provider-backed affordability evaluation.

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

### Phase 8B — Deterministic Budget Allocation Envelope

- PR #28 merged into `develop`.
- Final PR head: `dece78548189f56c9c96467a2195e50df62cc270`.
- Final PR CI #304 passed all five top-level jobs.
- Squash merge commit: `7f101b4ad7ed53a34c90eb846500cfc3eb4eb478`.
- Post-merge `develop` CI #305 passed all five top-level jobs.
- Added protected `GET /api/v1/planner/requests/:requestId/allocation` with owner-scoped 404 isolation and `private, no-store` caching.
- Uses deterministic integer-money allocation: safety reserve first, then spendable-budget targets for flights, accommodation, food, local transport, activities, children's activities, airport transfer, and travel insurance.
- Planning targets are explicitly `PLANNING_TARGET`; provenance states `liveDataUsed: false` and `providerDataUsed: false`.
- The child-activity share moves to general activities when no children are present, and deterministic rounding preserves the exact total.
- No fares, market prices, quotes, availability, destination-specific estimates, provider calls, Prisma schema changes, or pricing-line persistence were introduced.

### Phase 8C — Budget Allocation Web UI

- PR #29 merged into `develop`.
- Final PR head: `648417f757b6fef6b8634b29f2beeeebc95d5608`.
- Final PR CI #316 passed all five top-level jobs.
- Squash merge commit: `3c9d1240e6c723b65e95196b8027a470aeebc106`.
- Post-merge `develop` CI #317 passed all five top-level jobs on that exact merge SHA.
- Exposed the verified Phase 8B budget envelope on `/trips` for saved planning briefs.
- Shows total budget, user-derived safety reserve, spendable budget, and all category planning targets.
- The UI rejects payloads that claim provider/live provenance for the planning-only envelope.
- Added loading, authentication, empty/not-selected, unavailable, retry, and success states.
- Allocation copy works across all 18 supported UI locales and preserves responsive, RTL, and reduced-motion behavior.
- Phase 8C did not add destination ranking, provider pricing, fares, availability, or destination-specific cost estimates.

## Current phase

### Phase 8D — Planner Destination Candidate Foundation

Branch: `feature/phase-8d-planner-destination-candidates`

PR: #30 — `Phase 8D: add planner destination candidate foundation`

Base checkpoint: `3c9d1240e6c723b65e95196b8027a470aeebc106` — verified Phase 8C `develop` merge with post-merge CI #317 green.

Reason for this phase:

- The roadmap moves next toward budget-first destination discovery and replanning.
- The repository does not yet contain verified flight/accommodation pricing evidence sufficient to claim that a destination fits a traveller's budget.
- The database already contains a published destination catalog and later recommendation/budget-plan structures, but catalog publication is not affordability evidence.
- Phase 8D therefore establishes a private request-owned candidate-discovery contract without pretending to rank by price or persist premature recommendations.

Implemented:

- Added protected `GET /api/v1/planner/requests/:requestId/destination-candidates`.
- Reuses owner-scoped `findOwnedRequestById`; another traveller receives 404 rather than request-existence disclosure.
- Responses use `Cache-Control: private, no-store` because the candidate set is derived from private travel intent.
- Open-destination requests receive up to 20 currently `PUBLISHED` AttraVoya destination-catalog entries.
- When the request has a known origin city, that city is excluded from open-destination candidates.
- When a traveller explicitly selected `targetDestinationId`, the endpoint preserves that fixed target rather than replacing it with unrelated destinations. If that target is no longer published, the fixed-target result is empty rather than silently substituting another destination.
- Candidate records expose only catalog-supported destination/city/country fields and summary text.
- Shared API client exposes `getPlannerDestinationCandidates(requestId)` and URL-encodes the request ID.
- Added focused server tests for authentication, owner isolation, private caching, origin-city exclusion, fixed-target behavior, unpublished fixed targets, and honest provenance.
- Added API-client coverage for the encoded destination-candidate route.
- No Prisma schema or migration change was made.

Data-honesty boundary:

- Candidate mode is either `PUBLISHED_CATALOG` or `FIXED_TARGET`.
- `evaluation.budgetFit` is explicitly `NOT_EVALUATED`.
- `rankingApplied` is `false`.
- `priceDataAvailable` is `false`.
- `availabilityDataUsed` is `false`.
- Provenance is `PUBLISHED_CATALOG_CANDIDATE` from `ATTRAVOYA_PUBLISHED_DESTINATION_CATALOG` with `liveDataUsed: false`, `providerDataUsed: false`, and `pricingDataUsed: false`.
- These candidates are not affordability recommendations and are not proof that a trip is feasible or bookable.
- No flight fares, accommodation prices, quotes, availability, keyed-provider results, or other pricing evidence are invented.
- No `TravelPlanRecommendation`, `BudgetPlan`, or `BudgetLine` persistence is created in this phase.

Verification history:

- Initial implementation head `16a98114a3b04e07a29d20af1c915b41e8b86155` opened PR #30 and ran CI #318. PostgreSQL/Prisma and dependency/secret checks passed, while strict JavaScript and production build failed on the same inference issue: `excludeCityId` was not included in the inferred optional repository options type.
- Fix head `bfe27d4cd6dc75201e1258c2b4a6f4f2511aa704` added an explicit JavaScript JSDoc options type without runtime behavior changes. CI #319 then passed strict JavaScript, translations, provider smoke, ESLint, all unit tests, production builds, PostgreSQL/Prisma, dependency/secret checks, and live no-cost-provider checks. Repository-wide Prettier flagged only `packages/api-client/src/client.js`.
- Formatting head `fac3fefcaed4bd13b67c88751ae8c2bd1c08e6e5` changed only the API-client call layout to canonical Prettier form.
- PR CI #320 on exact head `fac3fefcaed4bd13b67c88751ae8c2bd1c08e6e5` passed all five top-level jobs, including strict JavaScript, translations, provider smoke, ESLint, all unit tests, repository-wide Prettier, production builds, PostgreSQL/Prisma, dependency/secret checks, and live no-cost-provider checks.

### Required next steps

1. This handoff update changes PR #30's head. Run the complete five-job PR CI on the exact new documentation head.
2. Confirm root `package.json` remains canonical with `"format:check": "prettier --check ."` and `.github/workflows/ci.yml` remains the canonical five-job workflow.
3. Verify PR #30 still targets `develop`, is mergeable, and its head SHA exactly matches the final CI-verified SHA.
4. Squash-merge PR #30 using expected-head protection.
5. Verify the returned merge SHA is the actual `develop` head.
6. Verify the post-merge `develop` push CI passes all five top-level jobs.
7. Only after that gate is green, start the next planner slice from the new verified `develop` SHA.
8. Best next product direction: introduce provider-ready affordability evidence/search in a narrow server-side slice before any destination ranking. Do not label catalog candidates affordable or feasible until verified price evidence exists, and preserve explicit provenance for every future price/estimate used in budget-fit evaluation.

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
