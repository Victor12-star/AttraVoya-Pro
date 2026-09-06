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
- A planning target is not a market price. Future affordability decisions must be based on explicit, provenance-aware evidence and must stay unevaluated when required evidence is missing.

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

### Phase 8D — Planner Destination Candidate Foundation

- PR #30 merged into `develop`.
- Final PR head: `ce076bbe805c71c7475db0335fffa77d6a441b0e`.
- Final PR CI #321 passed all five top-level jobs.
- Squash merge commit: `03a01ea0b8a75b01decc1ab2cd8b22a2780ec567`.
- Post-merge `develop` CI #322 passed all five top-level jobs on that exact merge SHA.
- Added protected `GET /api/v1/planner/requests/:requestId/destination-candidates` with owner-scoped 404 isolation and `private, no-store` caching.
- Open-destination requests receive up to 20 currently published AttraVoya destination-catalog entries, excluding a known origin city.
- Fixed-target requests preserve only the saved target and never silently substitute another destination.
- Candidate provenance is `PUBLISHED_CATALOG_CANDIDATE`; `budgetFit` is `NOT_EVALUATED`, no ranking is applied, and no pricing/provider/availability data is used.
- Added shared API-client support and focused tests for authentication, owner isolation, fixed-target behavior, candidate honesty, and encoded IDs.
- No recommendation, `BudgetPlan`, `BudgetLine`, Prisma schema, or migration change was introduced.

### Phase 8E — Affordability Evidence Gate

- PR #31 merged into `develop`.
- Final PR head: `60d23ae6d5c7962bf1a98894dd5a2f3f545f1362`.
- Final PR CI #325 passed all five top-level jobs.
- Squash merge commit: `a5eac63826d499f1e4e8da8b2af22834fd8a7d92`.
- Post-merge `develop` CI #326 passed all five top-level jobs on that exact merge SHA.
- Added protected `GET /api/v1/planner/requests/:requestId/destination-candidates/:destinationId/affordability-evidence` with owner-scoped 404 isolation and `private, no-store` caching.
- Reuses the saved traveller request, valid published candidate, and deterministic budget envelope to create a provider-ready evidence-search context.
- Fixed-target requests can evaluate only their saved target; open requests can evaluate only destinations in the current published candidate set.
- Versioned evidence policy `attravoya-affordability-evidence-v1` keeps all positive budget categories explicit as required evidence.
- Market evidence remains empty until collected server-side; `budgetFit` remains `NOT_EVALUATED`, `rankingEligible` remains false, and `affordabilityConfirmed` remains false.
- No fares, lodging prices, quotes, availability, recommendation ranking, Prisma schema changes, migrations, `BudgetPlan`, or `BudgetLine` persistence were introduced.

### Phase 8F — Accommodation Pricing Evidence Contract

- PR #32 merged into `develop`.
- Final PR head: `8df0bddb17b8ee0a595f37749b537761e678edfc`.
- Final PR CI #333 passed all five top-level jobs.
- Squash merge commit: `e4de8b1a2f8174e8bf16bb3b7508d8cce32b497f`.
- Post-merge `develop` CI #334 passed all five top-level jobs on that exact merge SHA.
- Added a server-internal accommodation pricing-evidence normalization and collection boundary.
- Only `LIVE` or `VERIFIED_PRICE` evidence can enter the verified market-evidence path.
- Evidence requires bounded non-negative price ranges, planner-budget currency, confidence, provider identity, external ID, and source-fetch timestamp.
- Raw provider-specific fields are stripped before planner responses are built.
- `ESTIMATE`, `USER_ENTERED`, and `UNAVAILABLE` cannot masquerade as verified accommodation market evidence.
- Added optional server-only `plannerAccommodationPricingCollector` injection; no client evidence-write API exists.
- Missing, empty, invalid, and valid collector states remain explicit as `NOT_CONFIGURED`, `UNAVAILABLE`, `FAILED`, and `COLLECTED`.
- Geoapify remains accommodation-location discovery only and is not treated as live room pricing or inventory.
- Even valid accommodation pricing evidence does not set budget fit, confirm affordability, enable ranking, or claim availability/bookability.
- No Prisma schema change, migration, `TravelPlanRecommendation`, `BudgetPlan`, `BudgetLine`, or `AccommodationOption` persistence was added.

## Completed integration checkpoints — continued

### Phase 8G — Shared Market Pricing Evidence Core + Flight Contract

- PR #33 merged into `develop`.
- Final PR head: `cc638410998c491af7787ad87c93d33f2b02b1d1`.
- Final PR CI #336 passed all five top-level jobs.
- Squash merge commit: `dcc42476e91f40496a2174a9be6c0ca9e7ea49d7`.
- Post-merge `develop` CI #337 passed all five top-level jobs on that exact merge SHA.
- Generalized verified market-pricing normalization so accommodation and flight evidence share one strict server-only contract.
- Verified pricing bases remain only `LIVE` and `VERIFIED_PRICE`, with bounded category-total ranges, planner-budget currency, confidence, provider identity, external ID, and source-fetch timestamp.
- Added a fail-closed server-only flight collector path while `FLIGHT_PROVIDER` remains `none`; missing flight collection is explicit and never interpreted as zero cost.
- Browser/mobile clients still cannot manufacture market evidence, and Geoapify remains accommodation-location discovery rather than room pricing or inventory.
- Even collected flight/accommodation evidence leaves `budgetFit` as `NOT_EVALUATED`, `rankingEligible` false, and `affordabilityConfirmed` false until required evidence is complete and a separate evaluation rule exists.
- No Prisma schema change, migration, live flight adapter, recommendation persistence, `BudgetPlan`, or `BudgetLine` persistence was introduced.

## Completed integration checkpoints — continued again

### Phase 8H — Planner Candidate Evidence Web UI

- PR #34 merged into `develop`.
- Final PR head: `7a78e3c4cc798ed2d12eaa66e54001b53766dd38`.
- Final PR CI #356 passed all five top-level jobs.
- Squash merge commit: `901a6e58d99dd298c5cf41106569ecb937ad1280`.
- Post-merge `develop` CI #357 passed all five top-level jobs on that exact merge SHA.
- Added the authenticated `/trips` destination-candidate evidence surface for saved planning briefs.
- Published catalog candidates remain explicitly unranked and affordability-unevaluated until evidence policy allows otherwise.
- Affordability evidence is fetched only after an explicit traveller inspection action, not automatically for every destination.
- Unsafe candidate/evidence payloads are rejected client-side rather than rendered as trustworthy travel information.
- Verified market-pricing ranges retain provider, pricing basis, and fetch-time provenance; missing/provider states remain explicit.
- Authentication, loading, empty, error/retry, responsive, RTL, reduced-motion, and all 18 supported locale requirements are covered.
- No provider configuration, evidence-write endpoint, schema migration, affordability conclusion, ranking, or booking claim was introduced.

## Current phase

### Phase 8I — Fail-Closed Affordability Evaluation Policy

- PR #35 merged into `develop`.
- Final PR head: `8b02302a383322e62119f212622b1e7851c45cea`.
- Final PR CI #362 passed all five top-level jobs.
- Squash merge commit: `f2f4708ac8ff510b5d36df3345aa033cf1dd1545`.
- Post-merge `develop` CI #363 passed all five top-level jobs on that exact merge SHA.
- Added versioned policy `attravoya-affordability-evaluation-v1` as a separate layer over the evidence gate.
- Incomplete, duplicated, malformed, currency-mismatched, unverified, or otherwise inconsistent evidence fails closed to `NOT_EVALUATED`.
- Complete verified category-total evidence is summed as a bounded range and compared with `spendableBudget`, so the traveller's selected safety reserve remains protected.
- Complete upper bound at or below spendable budget produces `COMFORTABLE`; a range crossing the budget produces `TIGHT`; a complete lower bound above budget produces `OVER_BUDGET`.
- `rankingEligible` remains false in every outcome. Availability, inventory, bookability, and provider-offer validity remain separate concepts.
- No provider adapter, provider credential, Prisma schema change, migration, recommendation persistence, `BudgetPlan`, `BudgetLine`, or client evidence-write path was added.

### Phase 8J — Remaining Verified Cost-Evidence Collector Contracts

Branch: `feature/phase-8j-remaining-cost-evidence-contracts`

PR: #37 — `Phase 8J: add remaining verified cost-evidence collector contracts`

Base checkpoint: `f2f4708ac8ff510b5d36df3345aa033cf1dd1545` — verified Phase 8I `develop` merge with post-merge CI #363 green.

Implemented:

- Extended the same strict server-only verified pricing-evidence boundary to all positive planner cost categories: `FLIGHTS`, `ACCOMMODATION`, `FOOD`, `LOCAL_TRANSPORT`, `ACTIVITIES`, `CHILDREN_ACTIVITIES`, `AIRPORT_TRANSFER`, and `TRAVEL_INSURANCE`.
- Only `LIVE` or `VERIFIED_PRICE` evidence can enter the verified path; estimates, user-entered amounts, unavailable values, invalid ranges, wrong currencies, missing provider identity, and malformed evidence fail closed.
- Raw provider-specific fields are stripped before planner responses are built.
- All eight collectors are injected server-side only. No browser/mobile evidence-write API exists.
- Missing collectors are explicit `NOT_CONFIGURED`; null results are `UNAVAILABLE`; invalid/failed collectors are `FAILED`; trusted normalized results are `COLLECTED`.
- No new live pricing provider is configured by this phase. Production must not treat a missing provider as zero cost, a planning estimate, or proof of affordability.
- Ticketmaster remains event discovery only in the current integration; its normalized event contract does not provide ticket pricing and is not promoted into activity-cost evidence.
- Focused tests prove all-eight-category `NOT_CONFIGURED` behavior, test-only complete verified collection, raw provider-field stripping, estimate rejection, and Phase 8I evaluation with ranking still disabled.
- No Prisma schema change, migration, recommendation ranking, recommendation persistence, `BudgetPlan`, or `BudgetLine` persistence was added.

Verification history:

- Exact clean implementation head `4b9b3253fb7a5e7597abd774b1785a24cdce25d6` ran PR CI #369.
- PR CI #369 passed all five top-level jobs: Code quality and unit tests, Live no-cost provider checks, Production builds, Dependency and secret checks, and PostgreSQL and Prisma verification.
- Strict JavaScript, translation checks, provider smoke tests, ESLint, all unit tests, repository-wide Prettier, production build, database validation/tests, dependency/secret checks, and live no-cost provider checks passed on that exact implementation head.
- This does not constitute live verification of flight or the six newly injectable pricing categories because no trusted production pricing collectors were configured for them.
- Phase 8J final PR head `f2d4c6b1fe005e76a87e177be3e529c5d6f2fd1d` passed final PR CI #374, was squash-merged as `cd12f6b5964ed589a19580426d1b7c9ba3c42dff`, and post-merge CI #375 passed all five jobs.
- Cleanup commit `d14e16e4a3c82f15fd6cb17242946addafab9d96` restored the exact same Phase 8J tree after an accidental temporary marker and passed cleanup CI #377. It is the verified Phase 8K base.

### Phase 8K — Verified Affordability Result Web UI

Branch: `feature/phase-8k-affordability-result-ui`

PR: #38 — `Phase 8K: show verified affordability results`

Base checkpoint: `d14e16e4a3c82f15fd6cb17242946addafab9d96`, the verified Phase 8J-equivalent develop tree with cleanup CI #377 green.

Implemented:

- Aligned the web planner with the Phase 8I affordability evaluator so valid `COMFORTABLE`, `TIGHT`, and `OVER_BUDGET` results are accepted safely.
- Added a strict browser contract. It independently sums every collected category range and requires those totals to match the server evaluation-policy range.
- Currency mismatches, duplicate categories, malformed evidence, invented statuses, inconsistent arithmetic, and ranking unlock attempts fail closed.
- `rankingEligible` remains false. Budget fit does not imply ranking, recommendation, availability, suitability, or bookability.
- Before evidence inspection, catalog candidates show only that they are not ranked. Affordability status appears only after an evidence request.
- Evaluated results show the verified total evidence range and spendable budget while preserving the safety reserve.
- Added result copy for all 18 supported locales, including Arabic, plus focused contract and React tests.
- No ranking, recommendation persistence, booking flow, new provider integration, schema change, migration, or client evidence-write path was added.

Verification history:

- Exact clean implementation head `21fe7bae57d86664f39edd6a8284350f27f650be` ran PR CI #386.
- PR CI #386 passed all five top-level jobs, including strict JavaScript, the complete unit suite, repository-wide Prettier, production build, database verification, security checks, and live no-cost provider checks.
- Live-provider CI must not be overstated as proof of keyed pricing providers that are not configured.

## Mandatory privacy-conscious analytics and admin monitoring phase

Before production readiness is declared, implement the dedicated requirement in `docs/PRIVACY-ANALYTICS-ADMIN-MONITORING.md` and GitHub Issue #36.

- The analytics/monitoring dashboard itself is strictly owner/admin-only inside the protected admin application. It must never appear in the normal traveller UI or ordinary USER navigation.
- Users may see only legally/privacy-required surfaces such as privacy notices, consent/preferences where applicable, and data-rights controls.
- Required aggregate metrics include registered/new users, DAU/WAU/MAU, Free/Premium subscription aggregates, subscription lifecycle metrics, trips, planning briefs, searches, and justified operational health signals.
- Use privacy-by-design/default, data minimization, documented purpose/lawful-basis assessment, consent where required, retention/deletion controls, pseudonymous identifiers where linkage is necessary, small-cohort privacy controls, and aggregate-first dashboard reads.
- Ordinary analytics must not contain passwords/tokens, raw email/phone, unnecessary precise locations, private trip content, detailed budgets, children's identities, sensitive/special-category data, raw support/chat text, or full provider payloads.
- Enforce a dedicated server-side analytics permission/RBAC boundary. Hiding UI links is not authorization.
- Analytics and monitoring must receive dedicated authorization, privacy-leakage, metric-correctness, retention/deletion, idempotency, consent, performance/load, and security tests before release.

### Required next steps

1. This handoff update changes PR #38's head. Run the complete five-job PR CI on the exact final documentation-inclusive head.
2. Confirm root `package.json` still uses canonical `"format:check": "prettier --check ."` and `.github/workflows/ci.yml` remains the canonical five-job workflow.
3. Verify PR #38 targets `develop`, is mergeable, contains only the six intended Phase 8K product/test files plus this handoff update, and contains no temporary helper files.
4. Squash-merge PR #38 using expected-head protection.
5. Verify the returned merge SHA is the actual `develop` head and its push CI passes all five top-level jobs.
6. Only after that gate is green, inspect the planner roadmap and start the next distinct slice from the new verified `develop` SHA.
7. Do not enable recommendation ranking merely because verified budget fit can now be displayed. Ranking requires a separate explicit policy and trustworthy production evidence; availability and bookability remain separate.

## Standing final release-readiness requirement

After functional development is complete and before production readiness is declared, perform a dedicated deep hardening phase covering security, testing, resilience, privacy, and monitoring. This must include authentication/authorization and API security review, OWASP-focused and penetration-style testing, secret/dependency and supply-chain review, database and privacy/data-protection review, input/rate-limit/abuse testing, end-to-end and cross-platform testing, accessibility, performance/load/stress/concurrency testing, failure/recovery and backup/restore testing, logging/audit review, health checks, metrics, alerting, error tracking, uptime monitoring, and incident-response readiness. The privacy-conscious analytics/admin-monitoring requirement must be implemented and included in this review. Findings must be fixed and relevant gates rerun; tests or security controls must not be weakened to achieve green status.

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
- Do not weaken tests, formatter rules, validation, security boundaries, privacy boundaries, or provider honesty to make CI pass.
- When documentation is updated before merge, that documentation commit becomes the new final PR head and must pass the complete CI gate before merge.
