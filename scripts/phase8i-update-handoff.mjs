import { readFileSync, writeFileSync } from 'node:fs';

const path = 'docs/CURRENT-WORK.md';
const text = readFileSync(path, 'utf8');
const start = text.indexOf('## Current phase\n');
const end = text.indexOf('## CI interpretation rule\n');

if (start < 0 || end < 0 || end <= start) {
  throw new Error('Could not locate the current-phase handoff section.');
}

const replacement = `## Completed integration checkpoints — continued again

### Phase 8H — Planner Candidate Evidence Web UI

- PR #34 merged into \`develop\`.
- Final PR head: \`7a78e3c4cc798ed2d12eaa66e54001b53766dd38\`.
- Final PR CI #356 passed all five top-level jobs.
- Squash merge commit: \`901a6e58d99dd298c5cf41106569ecb937ad1280\`.
- Post-merge \`develop\` CI #357 passed all five top-level jobs on that exact merge SHA.
- Added the authenticated \`/trips\` destination-candidate evidence surface for saved planning briefs.
- Published catalog candidates remain explicitly unranked and affordability-unevaluated until evidence policy allows otherwise.
- Affordability evidence is fetched only after an explicit traveller inspection action, not automatically for every destination.
- Unsafe candidate/evidence payloads are rejected client-side rather than rendered as trustworthy travel information.
- Verified market-pricing ranges retain provider, pricing basis, and fetch-time provenance; missing/provider states remain explicit.
- Authentication, loading, empty, error/retry, responsive, RTL, reduced-motion, and all 18 supported locale requirements are covered.
- No provider configuration, evidence-write endpoint, schema migration, affordability conclusion, ranking, or booking claim was introduced.

## Current phase

### Phase 8I — Fail-Closed Affordability Evaluation Policy

Branch: \`feature/phase-8i-affordability-evaluation-policy\`

PR: #35 — \`Phase 8I: add fail-closed affordability evaluation policy\`

Base checkpoint: \`901a6e58d99dd298c5cf41106569ecb937ad1280\` — verified Phase 8H \`develop\` merge with post-merge CI #357 green.

Reason for this phase:

- Phase 8H exposed the honest evidence state, but the system still needed a separate, explicit rule for deciding budget fit once all required evidence becomes complete.
- Evidence completeness by itself must never silently enable ranking or affordability claims.
- The evaluation must protect the traveller's safety reserve and fail closed when complete evidence is malformed or internally inconsistent.

Implemented:

- Added versioned evaluation policy \`attravoya-affordability-evaluation-v1\` as a separate layer on top of the existing evidence gate.
- Incomplete evidence returns unchanged and remains \`budgetFit: NOT_EVALUATED\`, with ranking and affordability confirmation disabled.
- Complete evidence is accepted for evaluation only when every required category is uniquely represented by verified category-total pricing evidence using the planner budget currency, accepted pricing basis, valid confidence, bounded range, provider identity, external ID, and source timestamp.
- Malformed, duplicated, currency-mismatched, unverified, or otherwise inconsistent complete evidence fails closed to \`NOT_EVALUATED\` and disables \`evidenceReady\` rather than producing a budget-fit result.
- The evaluator sums the complete verified category-total evidence range and compares it with \`spendableBudget\`, not \`totalBudget\`; the user-selected safety reserve therefore remains protected.
- A complete upper bound at or below spendable budget produces \`COMFORTABLE\` and may set \`affordabilityConfirmed: true\` for budget fit only.
- A range that crosses the spendable budget produces \`TIGHT\` and does not confirm affordability.
- A complete lower bound above spendable budget produces \`OVER_BUDGET\`.
- \`rankingEligible\` remains false in every evaluation outcome; ranking requires a later explicit policy.
- Availability, inventory, booking, and provider-offer validity remain separate and are not inferred from budget fit.
- Added focused unit tests for incomplete evidence, comfortable fit, tight/straddling range, over-budget range, safety-reserve protection, and malformed complete evidence.
- Wired the evaluator after server-side evidence collection without changing today's production result: current required evidence remains incomplete because only flight/accommodation collector contracts exist.
- No provider adapter, provider credential, Prisma schema change, migration, recommendation persistence, \`BudgetPlan\`, \`BudgetLine\`, or client evidence-write path was added.

Verification history:

- Exact implementation head \`ab0236c7c38955f1f5a502959fb456ccbc93adee\` ran PR CI #358.
- PR CI #358 passed all five top-level jobs: Code quality and unit tests, Live no-cost provider checks, Production builds, Dependency and secret checks, and PostgreSQL and Prisma verification.
- Strict JavaScript, translation checks, provider smoke tests, ESLint, all unit tests, repository-wide Prettier, production build, database validation/tests, dependency/secret checks, and live no-cost provider checks passed on that exact implementation head.
- CI #358 does not constitute live flight-provider verification because \`FLIGHT_PROVIDER\` remains \`none\`, and keyed providers without secrets are not overstated as live-verified.

### Required next steps

1. This handoff update changes PR #35's head. Run the complete five-job PR CI on the exact new documentation head.
2. Confirm root \`package.json\` still uses canonical \`"format:check": "prettier --check ."\` and \`.github/workflows/ci.yml\` remains the canonical five-job workflow.
3. Verify PR #35 still targets \`develop\`, is mergeable, contains no temporary updater files, and its head SHA exactly matches the final CI-verified SHA.
4. Squash-merge PR #35 using expected-head protection.
5. Verify the returned merge SHA is the actual \`develop\` head.
6. Verify the post-merge \`develop\` push CI passes all five top-level jobs.
7. Only after that gate is green, start the next planner slice from the new verified \`develop\` SHA.
8. The next slice must not enable recommendation ranking merely because the evaluator exists. Inspect remaining evidence-category gaps first; production cannot reach a complete affordability evaluation until trustworthy evidence contracts exist for the other required budget categories.

## Standing final release-readiness requirement

After functional development is complete and before production readiness is declared, perform a dedicated deep hardening phase covering security, testing, resilience, and monitoring. This must include authentication/authorization and API security review, OWASP-focused and penetration-style testing, secret/dependency and supply-chain review, database and privacy/data-protection review, input/rate-limit/abuse testing, end-to-end and cross-platform testing, accessibility, performance/load/stress/concurrency testing, failure/recovery and backup/restore testing, logging/audit review, health checks, metrics, alerting, error tracking, uptime monitoring, and incident-response readiness. Findings must be fixed and the relevant gates rerun; tests or security controls must not be weakened to achieve green status.

`;

writeFileSync(path, text.slice(0, start) + replacement + text.slice(end), 'utf8');
