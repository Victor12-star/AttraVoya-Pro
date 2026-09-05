# AttraVoya Pro — Next Chat Handoff

This file records the exact stopping point from 5 September 2026 so development can continue safely in a new ChatGPT conversation without repeating work or weakening CI discipline.

## Repository

- Repository: `Victor12-star/AttraVoya-Pro`
- Integration branch: `develop`
- Production branch: `main`
- Active feature branch: `feature/phase-8b-budget-allocation-envelope`
- Active PR: #28 — `Phase 8B: deterministic budget allocation envelope`
- Separate handoff branch: `handoff/phase-8b-stop-2026-09-05`
- JavaScript only unless the owner explicitly approves TypeScript.

## Exact stopping point

Phase 8A is fully complete and verified:

- PR #27 merged into `develop`.
- Final PR head: `bfa7f232d2c89d5c9cf14f2ddeb5f66a73ba3bb1`.
- Final PR CI #299 passed all five top-level jobs.
- Squash merge commit: `33012b6b9fa2035de1b10c0698d08b542e1740b9`.
- Post-merge `develop` CI #300 passed all five jobs on that exact merge SHA.

Phase 8B implementation is complete and the final PR head is already fully CI-verified, but PR #28 has NOT been merged yet.

Current PR #28 state at the stopping point:

- State: OPEN
- Base: `develop`
- Base SHA: `33012b6b9fa2035de1b10c0698d08b542e1740b9`
- Head branch: `feature/phase-8b-budget-allocation-envelope`
- Exact final PR head: `dece78548189f56c9c96467a2195e50df62cc270`
- Mergeable: true
- Final PR CI: #304
- CI #304 passed all five top-level jobs on exact head `dece78548189f56c9c96467a2195e50df62cc270`.
- Root `package.json` was verified canonical at blob `af4b2abbc4b5b1887f9a6293cd1a411649a69f7c` with `"format:check": "prettier --check ."`.
- `.github/workflows/ci.yml` was verified canonical at blob `31c6b4a781f69852eaeeb2fe5fe115b265feedc8`.
- Do NOT add another commit to PR #28 before merge unless a new defect is discovered, because doing so would invalidate CI #304 as the final-head verification.

## Phase 8B — what was implemented

Phase 8B adds the first deterministic allocation layer on top of the private planner request foundation.

### API and ownership

- Added authenticated `GET /api/v1/planner/requests/:requestId/allocation`.
- Uses the existing owner-scoped planner repository lookup.
- Another traveller's request resolves as 404 instead of revealing existence.
- Allocation responses use `Cache-Control: private, no-store` because they are derived from private travel intent and budget data.
- Shared API client exposes `getBudgetAllocation(requestId)` and URL-encodes the request ID.

### Deterministic allocation policy

- Policy key: `attravoya-budget-envelope-v1`.
- Policy version: `1`.
- Integer money math is used so all two-decimal totals remain stable and exact.
- The traveller's chosen safety reserve is taken from the entered total budget first.
- Only the remaining spendable budget is allocated across planning categories.

Spendable-budget targets:

- Flights: 30%
- Accommodation: 32%
- Food: 15%
- Local transport: 8%
- Activities: 7%
- Children's activities: 3%
- Airport transfer: 3%
- Travel insurance: 2%

When the request has no children:

- Children's activities becomes 0%.
- That 3% is moved to general activities, so activities becomes 10%.
- Total spendable allocation remains exact.

Any integer-cent rounding remainder is assigned deterministically to accommodation so all category amounts add back exactly to the spendable budget.

### Provenance / honesty rules

- Safety reserve basis: `USER_INPUT_DERIVED`.
- Category allocation basis: `PLANNING_TARGET`.
- Provenance explicitly returns:
  - `liveDataUsed: false`
  - `providerDataUsed: false`
- These amounts divide the traveller's own entered budget only.
- They are NOT fares, prices, quotes, availability, or destination-specific cost estimates.
- Phase 8B calls no flight, accommodation, activity, transport, or pricing provider.
- The targets are intentionally not persisted as `BudgetLine` price estimates yet, because later provider-backed costs must preserve their own `LIVE`, `VERIFIED_PRICE`, `ESTIMATE`, `USER_ENTERED`, or `UNAVAILABLE` provenance semantics.

## Phase 8B verification history

- Initial implementation head: `05ed2ba30b48479122671d96867fe7b9438fa768`.
- CI #301: database/security passed, but strict JavaScript failed because literal target weights produced narrow numeric types and `.find()` results were possibly undefined.
- Strict-JS fix head: `b2279ba35e8909ba03c3ab3dd3f86fb715641cce`.
- CI #302: strict JavaScript, translations, provider smoke, database, security, and live-provider jobs passed; ESLint then rejected the decimal parser regex under `security/detect-unsafe-regex`.
- Security/lint fix head: `303e7d0ea1e90680e455bbe9bfd3eef4c9090f9b`.
- CI #303: all five top-level jobs passed, including strict JavaScript, translations, provider smoke, ESLint, all unit tests, repository-wide Prettier, production builds, PostgreSQL/Prisma, dependency/secret checks, and live no-cost-provider checks.
- Documentation update produced final head `dece78548189f56c9c96467a2195e50df62cc270`.
- Final PR CI #304 on exact final head `dece78548189f56c9c96467a2195e50df62cc270`: ALL FIVE TOP-LEVEL JOBS GREEN.

## First action in the new chat — do this before any new feature work

1. Read this file first.
2. Fetch PR #28 metadata again and confirm it is still open, targets `develop`, is mergeable, and its head is still exactly `dece78548189f56c9c96467a2195e50df62cc270`.
3. Reconfirm root `package.json` still has canonical `"format:check": "prettier --check ."` and `.github/workflows/ci.yml` remains canonical.
4. Squash-merge PR #28 using expected-head protection with exact head SHA `dece78548189f56c9c96467a2195e50df62cc270`.
5. Capture the returned squash merge SHA.
6. Verify that exact returned SHA is the actual current `develop` head.
7. Find the `develop` push-triggered CI run for that exact merge SHA.
8. Require all five top-level jobs to pass:
   - Code quality and unit tests
   - Live no-cost provider checks
   - Production builds
   - Dependency and secret checks
   - PostgreSQL and Prisma verification
9. Only after the post-merge `develop` CI is fully green may Phase 8B be marked complete and Phase 8C begin.

## Next product slice after Phase 8B post-merge CI is green

### Phase 8C — Budget Allocation UI Exposure

Start a new dedicated feature branch from the exact verified Phase 8B `develop` merge SHA.

Recommended scope:

- Expose the verified Phase 8B allocation envelope in the `/trips` budget-planner UI.
- Let a traveller view the safety reserve, spendable budget, and category targets for a saved planning brief.
- Use localized category labels and explanatory copy for all 18 supported UI locales.
- Make the distinction visually and verbally explicit that these are planning targets from the traveller's own budget, not market prices or live estimates.
- Preserve authenticated/private behavior.
- Include loading, success, unavailable/error, retry, authentication, and empty/not-selected states as appropriate.
- Use Lucide icons, current design tokens, responsive layout, reduced-motion support, and RTL-safe behavior.
- Add focused web tests for correct amounts, provenance wording, auth handling, retry/error state, and the absence of unsupported live-price/availability claims.

Do NOT do these things in Phase 8C:

- Do not introduce destination recommendation ranking yet.
- Do not invent flight fares, accommodation rates, activity costs, transport prices, or availability.
- Do not silently label planning targets as estimates.
- Do not call keyed providers directly from browser/mobile clients.
- Do not weaken tests, formatter rules, strict JavaScript, security, or private caching to make CI pass.

## Standing product and engineering rules

- AttraVoya is budget-first.
- Browser/mobile uses provider-neutral backend APIs only.
- Provider credentials remain server-side.
- Never invent live fares, prices, availability, schedules, safety/medical/emergency facts, airport codes, opening status, ratings, stock, ATM status, parking availability, or provider-returned facts.
- Explicitly distinguish provider-returned facts, verified data, estimates, user-entered values, and planning targets.
- Verified Safety/emergency contacts are authoritative and are never replaced by nearby-place provider results.
- Basic safety must never be paywalled.
- Premium access must never imply admin privileges.
- Frontend visibility is not authorization.
- Private planner/budget data must remain owner-scoped and must not be cached publicly.
- Keep all 18 UI locales working, including Arabic RTL behavior.
- Use Lucide icons only.
- Every feature slice must pass all five top-level GitHub CI jobs on the exact final PR head before merge.
- After every merge, the resulting `develop` push CI must pass all five jobs before starting the next slice.
- Never merge temporary diagnostic formatter or CI configuration.
- Provider smoke tests that make no external calls are not live verification of keyed providers. Do not overstate provider verification.

## Important note about this handoff branch

This handoff file is intentionally stored on a separate branch so PR #28's already-CI-verified final head is left untouched. Do not merge this handoff branch into `develop`; it exists only so a new chat can recover the exact stopping point safely.
