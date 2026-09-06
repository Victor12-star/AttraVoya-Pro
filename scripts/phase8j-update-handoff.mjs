import { readFileSync, writeFileSync } from 'node:fs';

const path = 'docs/CURRENT-WORK.md';
const text = readFileSync(path, 'utf8');
const marker = '### Phase 8I — Fail-Closed Affordability Evaluation Policy';
const index = text.indexOf(marker);
if (index < 0) throw new Error('Phase 8I handoff marker was not found.');

const replacement = `### Phase 8I — Fail-Closed Affordability Evaluation Policy

- PR #35 merged into \`develop\`.
- Final PR head: \`8b02302a383322e62119f212622b1e7851c45cea\`.
- Final PR CI #362 passed all five top-level jobs.
- Squash merge commit: \`f2f4708ac8ff510b5d36df3345aa033cf1dd1545\`.
- Post-merge \`develop\` CI #363 passed all five top-level jobs on that exact merge SHA.
- Added versioned policy \`attravoya-affordability-evaluation-v1\` as a separate layer over the evidence gate.
- Incomplete, duplicated, malformed, currency-mismatched, unverified, or otherwise inconsistent evidence fails closed to \`NOT_EVALUATED\`.
- Complete verified category-total evidence is summed as a bounded range and compared with \`spendableBudget\`, so the traveller's selected safety reserve remains protected.
- Complete upper bound at or below spendable budget produces \`COMFORTABLE\`; a range crossing the budget produces \`TIGHT\`; a complete lower bound above budget produces \`OVER_BUDGET\`.
- \`rankingEligible\` remains false in every outcome. Availability, inventory, bookability, and provider-offer validity remain separate concepts.
- No provider adapter, provider credential, Prisma schema change, migration, recommendation persistence, \`BudgetPlan\`, \`BudgetLine\`, or client evidence-write path was added.

### Phase 8J — Remaining Verified Cost-Evidence Collector Contracts

Branch: \`feature/phase-8j-remaining-cost-evidence-contracts\`

PR: #37 — \`Phase 8J: add remaining verified cost-evidence collector contracts\`

Base checkpoint: \`f2f4708ac8ff510b5d36df3345aa033cf1dd1545\` — verified Phase 8I \`develop\` merge with post-merge CI #363 green.

Implemented:

- Extended the same strict server-only verified pricing-evidence boundary to all positive planner cost categories: \`FLIGHTS\`, \`ACCOMMODATION\`, \`FOOD\`, \`LOCAL_TRANSPORT\`, \`ACTIVITIES\`, \`CHILDREN_ACTIVITIES\`, \`AIRPORT_TRANSFER\`, and \`TRAVEL_INSURANCE\`.
- Only \`LIVE\` or \`VERIFIED_PRICE\` evidence can enter the verified path; estimates, user-entered amounts, unavailable values, invalid ranges, wrong currencies, missing provider identity, and malformed evidence fail closed.
- Raw provider-specific fields are stripped before planner responses are built.
- All eight collectors are injected server-side only. No browser/mobile evidence-write API exists.
- Missing collectors are explicit \`NOT_CONFIGURED\`; null results are \`UNAVAILABLE\`; invalid/failed collectors are \`FAILED\`; trusted normalized results are \`COLLECTED\`.
- No new live pricing provider is configured by this phase. Production must not treat a missing provider as zero cost, a planning estimate, or proof of affordability.
- Ticketmaster remains event discovery only in the current integration; its normalized event contract does not provide ticket pricing and is not promoted into activity-cost evidence.
- Focused tests prove all-eight-category \`NOT_CONFIGURED\` behavior, test-only complete verified collection, raw provider-field stripping, estimate rejection, and Phase 8I evaluation with ranking still disabled.
- No Prisma schema change, migration, recommendation ranking, recommendation persistence, \`BudgetPlan\`, or \`BudgetLine\` persistence was added.

Verification history:

- Exact clean implementation head \`4b9b3253fb7a5e7597abd774b1785a24cdce25d6\` ran PR CI #369.
- PR CI #369 passed all five top-level jobs: Code quality and unit tests, Live no-cost provider checks, Production builds, Dependency and secret checks, and PostgreSQL and Prisma verification.
- Strict JavaScript, translation checks, provider smoke tests, ESLint, all unit tests, repository-wide Prettier, production build, database validation/tests, dependency/secret checks, and live no-cost provider checks passed on that exact implementation head.
- This does not constitute live verification of flight or the six newly injectable pricing categories because no trusted production pricing collectors were configured for them.

## Mandatory privacy-conscious analytics and admin monitoring phase

Before production readiness is declared, implement the dedicated requirement in \`docs/PRIVACY-ANALYTICS-ADMIN-MONITORING.md\` and GitHub Issue #36.

- The analytics/monitoring dashboard itself is strictly owner/admin-only inside the protected admin application. It must never appear in the normal traveller UI or ordinary USER navigation.
- Users may see only legally/privacy-required surfaces such as privacy notices, consent/preferences where applicable, and data-rights controls.
- Required aggregate metrics include registered/new users, DAU/WAU/MAU, Free/Premium subscription aggregates, subscription lifecycle metrics, trips, planning briefs, searches, and justified operational health signals.
- Use privacy-by-design/default, data minimization, documented purpose/lawful-basis assessment, consent where required, retention/deletion controls, pseudonymous identifiers where linkage is necessary, small-cohort privacy controls, and aggregate-first dashboard reads.
- Ordinary analytics must not contain passwords/tokens, raw email/phone, unnecessary precise locations, private trip content, detailed budgets, children's identities, sensitive/special-category data, raw support/chat text, or full provider payloads.
- Enforce a dedicated server-side analytics permission/RBAC boundary. Hiding UI links is not authorization.
- Analytics and monitoring must receive dedicated authorization, privacy-leakage, metric-correctness, retention/deletion, idempotency, consent, performance/load, and security tests before release.

### Required next steps

1. This handoff update changes PR #37's head. Run the complete five-job PR CI on the exact new documentation head.
2. Confirm root \`package.json\` still uses canonical \`\"format:check\": \"prettier --check .\"\` and \`.github/workflows/ci.yml\` remains the canonical five-job workflow.
3. Verify PR #37 still targets \`develop\`, is mergeable, contains no temporary updater/workflow/marker files, and its head SHA exactly matches the final CI-verified SHA.
4. Squash-merge PR #37 using expected-head protection.
5. Verify the returned merge SHA is the actual \`develop\` head.
6. Verify the post-merge \`develop\` push CI passes all five top-level jobs.
7. Only after that gate is green, inspect the planner roadmap/current architecture and start the next genuinely distinct slice from the new verified \`develop\` SHA.
8. Do not enable recommendation ranking merely because complete test evidence can now reach the evaluator. Production pricing evidence and a separate explicit ranking policy are still required.

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

- Start each slice from the latest verified \`develop\` commit.
- Work on a dedicated \`feature/...\` branch.
- Open a PR into \`develop\`.
- Fix failures on the feature branch only.
- Do not weaken tests, formatter rules, validation, security boundaries, privacy boundaries, or provider honesty to make CI pass.
- When documentation is updated before merge, that documentation commit becomes the new final PR head and must pass the complete CI gate before merge.
`;

writeFileSync(path, text.slice(0, index) + replacement, 'utf8');
