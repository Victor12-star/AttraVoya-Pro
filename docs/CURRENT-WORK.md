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
- Clearly distinguish provider-returned facts from estimates or static reference data. Future planner estimates must retain explicit provenance.
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

## Current phase

### Phase 8A — Budget Planner Web Request Flow

Branch: `feature/phase-8a-budget-planner-web-flow`

PR: #27 — `Phase 8A: budget planner web request flow`

Base checkpoint: `5fcd174a252913e1f0aa6ba47e5b3057518531fd` — verified Phase 7Z `develop` merge.

Reason for this phase:

- The secure planner-request API now exists, but `/trips` was still a placeholder.
- Phase 8A turns that route into the first real budget-first traveller workflow while keeping recommendation generation and price claims out until provenance-aware planning exists.
- Provider-search IDs are not treated as persisted internal destination IDs. Open-destination requests therefore remain genuinely open instead of fabricating database references.

Implemented:

- Replaced the `/trips` placeholder with a real budget planner form.
- Collects origin label, fixed or flexible dates, minimum/maximum nights, total budget, preferred currency, safety reserve, adults, children ages, interests, comfort level, lodging types, and family-friendly preference.
- Uses shared `createBudgetPlanRequestSchema` in the browser before submission while keeping the server authoritative.
- Persists planning briefs through the authenticated shared API client and the Phase 7Z backend endpoints.
- Loads the signed-in traveller's recent private planning briefs.
- Includes loading, empty, authentication, unavailable/error, retry, saving, success, and validation states.
- A 401 presents a sign-in action rather than exposing API internals.
- Uses same-site cookie authentication; no second browser token store was introduced.
- Responsive UI uses existing design tokens, Lucide icons, and reduced-motion support.
- Planner copy exists for all 18 supported UI locales with invariant option vocabulary safely falling back to English where appropriate.
- Focused tests cover honest rendering, exact fixed-date submission, client validation before persistence, authentication handling, private draft loading, outage retry, and absence of invented recommendation/price claims.

Deliberate boundary:

- Phase 8A stores and reviews a traveller's private planning brief only.
- It does not generate destination recommendations.
- It does not claim flight fares, accommodation prices/inventory, attraction prices, availability, or live budget feasibility.
- It does not yet allocate the total budget across flights, accommodation, food, local transport, activities, children's activities, airport transfers, or contingency reserve.
- The next planner slice should add a deterministic budget envelope/allocation foundation with explicit estimate/provenance semantics before any recommendation-ranking logic.

Verification history:

- Initial implementation CI exposed strict-JavaScript state-inference problems (`never[]` draft inference and an overly narrow lodging array). These were fixed with explicit JavaScript/JSDoc domain types; no `any` escape or type-check weakening was used.
- CI #291 then reached ESLint and identified `react-hooks/set-state-in-effect` violations. The planner was restructured rather than disabling the rule: currency starts from the server-provided default, and initial draft state changes occur from the asynchronous API completion path while retry behavior remains intact.
- Functional head `5cf3380fe49c5b012a8cac5abd8b8c6c61d5a51f` ran CI #292. Production build, PostgreSQL/Prisma, dependency/secret, live no-cost-provider checks, strict JavaScript, translations, provider smoke, ESLint, and all tests passed. Only repository-wide Prettier failed on three Phase 8A files.
- Temporary formatter diagnostics #293, #294, #295, and formatter-recovery #296 were branch-only diagnostic runs and are not valid merge candidates. They were used only to capture/apply exact Prettier 3.9.6 output.
- Exact Prettier output was applied to `budget-planner-copy.js`, `budget-planner-page.jsx`, and `budget-planner-page.test.jsx` without changing planner behavior.
- All temporary formatter/CI diagnostic configuration was removed.
- Root `package.json` is restored byte-for-byte to canonical blob `af4b2abbc4b5b1887f9a6293cd1a411649a69f7c` with `"format:check": "prettier --check ."`.
- `.github/workflows/ci.yml` is restored byte-for-byte to canonical blob `31c6b4a781f69852eaeeb2fe5fe115b265feedc8`.
- Clean Phase 8A diff against the base contains exactly five intended files: `/trips` route, planner copy, planner component, planner CSS, and planner tests.
- Clean-code checkpoint: `a73dd8c2676f22e819a6c618b0f8d9dc1f4bd291`.
- Clean-code PR CI #298 on exact head `a73dd8c2676f22e819a6c618b0f8d9dc1f4bd291` passed all five top-level CI jobs, including 133 web tests and canonical repository-wide Prettier.

### Required next steps

1. This handoff update changes PR #27's head. Run the complete five-job PR CI on the exact new documentation head.
2. Confirm root `package.json` remains canonical with `"format:check": "prettier --check ."` and `.github/workflows/ci.yml` remains the canonical workflow.
3. Verify PR #27 still targets `develop`, is mergeable, and its head SHA exactly matches the final CI-verified SHA.
4. Squash-merge PR #27 using expected-head protection.
5. Verify the returned merge SHA is the actual `develop` head.
6. Verify the post-merge `develop` push CI passes all five top-level jobs.
7. Only after that gate is green, start the next planner slice from the new verified `develop` SHA.
8. Best next product direction: deterministic budget-envelope/allocation logic with explicit estimate/provenance semantics before recommendation ranking or any live-price claim.

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
