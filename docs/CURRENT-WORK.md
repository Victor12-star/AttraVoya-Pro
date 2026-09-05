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

## Current phase

### Phase 7Z — Budget Planner Request Foundation

Branch: `feature/phase-7z-budget-planner-request-foundation`

PR: #26 — `Phase 7Z: budget planner request foundation`

Base checkpoint: `f5ab4082af2e33289650ec6e9c1d5bb799b4932d` — verified Phase 7Y `develop` merge.

Reason for this phase:

- The existing Prisma schema already contains the correct planner domain: `TravelPlanRequest`, `TravelStayPreference`, recommendations, versioned `BudgetPlan`, pricing provenance, trips, and actual expenses.
- Therefore the correct architecture is to activate that domain rather than create a second budget model or parallel planner.
- Phase 7Z intentionally establishes the secure traveller-owned planning brief before recommendation generation or provider pricing.

Implemented:

- Protected `POST /api/v1/planner/requests` endpoint to persist a planning brief.
- Protected `GET /api/v1/planner/requests` endpoint to list only the authenticated traveller's requests.
- Protected `GET /api/v1/planner/requests/:requestId` endpoint with owner-scoped lookup; another user's request resolves as 404 rather than leaking existence.
- Existing PostgreSQL-backed authentication hook is required before planner persistence/read access.
- Planner responses use `Cache-Control: private, no-store` because the payload contains private travel intent and budget information.
- Reuses existing `TravelPlanRequest` and `TravelStayPreference` Prisma models. No duplicate planner schema and no migration were added.
- Reuses shared `createBudgetPlanRequestSchema` plus accommodation preference validation.
- Strengthens date-mode validation so fixed-date and flexible-window fields cannot be silently mixed.
- Enforces traveller-count limits before persistence.
- Normalizes the budget currency code and validates it against stored currency reference data.
- Validates optional target destination as an existing `PUBLISHED` destination.
- Validates optional origin city and airport references and rejects mismatched city/airport combinations.
- Persists new requests as `DRAFT` only.
- Maps Prisma Decimal/date values into stable API-safe strings and date values without exposing ownership metadata or database internals.
- Shared API client now exposes create/list/get planner-request methods for web and mobile consumers.
- Focused tests cover unauthenticated rejection, valid persistence/defaults, owner isolation, contradictory dates, traveller limits, unsupported currency, inconsistent origin references, and shared API-client behavior.

Deliberate boundary:

- Phase 7Z does not generate destination recommendations.
- It does not allocate the budget across flights, accommodation, food, local transport, activities, children's activities, transfers, and reserve yet.
- It does not fetch or claim fares, accommodation availability/prices, attraction prices, or any other live provider pricing.
- Recommendation generation and budget allocation must build on this verified request foundation and preserve explicit estimate/provider provenance.

Verification history:

- Initial implementation head `ae2c3752fabb6fcd9a2ebae35eaa46513e9d1f24` ran PR CI #278. Production build, PostgreSQL/Prisma, dependency/secret, live no-cost-provider, JavaScript, translations, provider smoke, ESLint, and all functional tests passed; only repository-wide Prettier failed on six files.
- Branch-only formatter diagnostic head `2a658e08672fc883d463b588e3d5e9003f0d18b0` ran CI #279 to print exact Prettier 3.9.6 rewrites. It was diagnostic only and is not a valid merge candidate.
- Exact formatter output was applied mechanically to `apps/server/src/app.js`, planner routes/service/tests, `packages/api-client/src/client.js`, and `packages/validation/src/budget-planner.js` without changing planner behavior.
- Root `package.json` was restored byte-for-byte to the normal `"format:check": "prettier --check ."` blob `af4b2abbc4b5b1887f9a6293cd1a411649a69f7c`.
- Clean-code checkpoint: `00a36d18af661cce66aacea9a21e1cb3387238bb`.
- Clean-code PR CI #287 on exact head `00a36d18af661cce66aacea9a21e1cb3387238bb` passed all five top-level CI jobs, including repository-wide Prettier.

### Required next steps

1. This handoff update changes PR #26's head. Run the complete five-job PR CI on the exact new documentation head.
2. Confirm root `package.json` blob remains `af4b2abbc4b5b1887f9a6293cd1a411649a69f7c` with `"format:check": "prettier --check ."`.
3. Verify PR #26 still targets `develop`, is mergeable, and its head SHA exactly matches the final CI-verified SHA.
4. Squash-merge PR #26 using expected-head protection.
5. Verify the returned merge SHA is the actual `develop` head.
6. Verify the post-merge `develop` push CI passes all five top-level jobs.
7. Only after that gate is green, start the next planner slice from the new verified `develop` SHA.
8. Best next product direction: expose the verified planner request foundation through a real authenticated budget-planner web flow, then add deterministic budget allocation/provenance before any recommendation-ranking logic. Do not jump directly to fake/live pricing.

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
