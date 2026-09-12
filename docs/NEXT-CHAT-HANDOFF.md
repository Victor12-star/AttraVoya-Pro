# AttraVoya Pro — Next Chat Handoff

Continue `Victor12-star/AttraVoya-Pro` from the exact live repository state. Do not repeat completed work.

## First action in a new chat

1. Fetch `develop` and record its exact SHA.
2. Inspect the exact push-triggered CI run attached to that SHA.
3. Verify all five canonical jobs individually rather than relying on workflow-level success.
4. Re-read `docs/CURRENT-WORK.md` and this file from that exact SHA.
5. Inspect open pull requests, Issue `#40`, and the relevant live code before choosing any new slice.
6. Do not restart completed production-readiness work through Phase 10W.

## Current fully verified release

Phase 10W — web session security controls — is complete.

- PR: `#112`
- Final PR head: `6971786b138fe9f762c983b216962ceee4919cc9`
- Final PR CI run: `34699789733`
- All five canonical jobs passed
- Exact squash-merged `develop`: `d68d723deca5870ccb02129edfaa0b009853a71f`
- Post-merge push CI run: `34699998083`
- All five canonical jobs passed

Phase 10W exposes the existing Phase 10U owner-scoped session APIs through the web `/profile` security experience. It uses deliberately coarse browser/platform labels, never renders raw refresh hashes/IP hashes/tokens, provides safe loading/error/authentication/empty states, supports targeted revoke and explicit sign-out-everywhere confirmation, prevents duplicate destructive actions, preserves 18 locales and theme/reduced-motion/RTL behavior, and is covered by browser smoke plus blocking Axe accessibility checks.

## Completed production-readiness sequence

The live repository has already completed these Issue #40 slices:

- Phase 9X — provider circuit breaker — PR `#84`
- Phase 9Y — admin-only service metrics — PR `#85`
- Phase 9Z — API production container — PR `#86`
- Phase 10A — API capacity/backpressure gate — PR `#87`
- Phase 10B — overload-safe health probes — PR `#88`
- Phase 10C — bounded total provider-request duration — PR `#89`
- Phase 10D — bounded graceful shutdown — PR `#90`
- Phase 10E — deployment reliability runbook — PR `#92`
- Phase 10F — runtime saturation metrics — PR `#93`
- Phase 10G — SLO/error-budget contract — PR `#94`
- Phase 10H — request-log client-IP minimization — PR `#95`
- Phase 10I — web/mobile performance-budget contract — PR `#96`
- Phase 10J — optimized production web build in browser CI — PR `#97`
- Phase 10K — measured production mobile resource baseline — PR `#98`
- Phase 10L — blocking production mobile resource budgets — PR `#99`
- Maintenance handoff synchronization through Phase 10L — PR `#100`
- Phase 10M — measured capacity tiers and load-test evidence — PR `#101`
- Phase 10N — bounded stress, soak and spike regression suite — PR `#102`
- Phase 10O — database concurrency and authentication token claims — PR `#103`
- Phase 10P — authentication query/index review — PR `#104`
- Phase 10Q — concurrent refresh-session overwrite prevention — PR `#105`
- Phase 10R — provider failure isolation — PR `#106`
- Maintenance handoff synchronization through Phase 10R — merged before Phase 10S
- Phase 10S — API restart and database recovery verification — PR `#108`
- Phase 10T — Prisma migration baseline and deploy gate — PR `#109`
- Phase 10U — owner-scoped session controls — PR `#110`
- Phase 10V — paid-provider request budgets — PR `#111`
- Phase 10W — web session security controls — PR `#112`

PR `#91` is obsolete and superseded by Phase 10F PR `#93`; never merge it. Obsolete Phase 9U PR `#79` must also never be merged.

## What the newest slices prove

- Phase 10S verifies real API process replacement against disposable PostgreSQL: readiness, bounded SIGTERM shutdown, restart on the same host/port/database, and readiness again.
- Phase 10T adds the Prisma `0_init` migration baseline, production-style `migrate deploy`, migration-status/schema-drift CI checks and safe rolling-compatible migration guidance.
- Phase 10U exposes bounded, authenticated, owner-scoped active-session visibility plus idempotent targeted revocation and revoke-all behavior with minimized metadata.
- Phase 10V adds explicit operator-configured request budgets for credentialed external providers and consumes budget immediately before each real upstream attempt, including retries, without guessing vendor limits.
- Phase 10W provides the traveller-facing web session-security experience on top of Phase 10U with privacy minimization, authoritative destructive actions, accessibility and browser evidence.

## Existing protections that should not be reimplemented

Before choosing another Issue #40 slice, remember that the live repository already has:

- 256 KiB request-body limiting;
- global and route/risk-aware rate limits for authentication/planner/provider-heavy traffic plus separate bounded health-probe limits;
- provider timeouts, bounded retries with jitter, `Retry-After`, concurrency bulkheads, queue bounds, total request deadlines, circuit breaking and first-stage paid-provider request budgets;
- in-process provider cache with single-flight miss coalescing;
- owner-scoped planner access, bounded pagination and planner-create idempotency;
- privacy-safe structured logging and bounded HTTP/provider/cache/database/runtime metrics;
- ADMIN-only `private, no-store` service metrics;
- PostgreSQL pool-exhaustion checks and guarded logical backup/restore CI;
- recovery targets: RPO <= 15 minutes, RTO <= 60 minutes, PITR >= 7 days, automated backup retention >= 30 days, and restore verification before launch and at least quarterly;
- measured early-capacity evidence and PostgreSQL connection-budget methodology;
- bounded stress, soak and spike regression testing;
- production API container verification, deployment draining/shutdown runbook and overload-safe readiness/liveness;
- deterministic process-level API restart/recovery evidence;
- Prisma migration baseline plus production-style deploy/status/drift verification and rolling-compatible migration guidance;
- atomic authentication token claims and compare-and-swap refresh-token rotation;
- authentication query/index review with PostgreSQL catalog and `EXPLAIN` evidence;
- owner-scoped session listing/revocation APIs and the web session-security experience;
- deterministic provider-failure isolation;
- browser/mobile/cross-browser E2E, accessibility, slow-network and reconnect coverage;
- a production-build web test path plus measured and enforced public-home mobile resource budgets.

Do not introduce Redis, durable queues, shared rate-limit state, read replicas, external observability vendors or distributed tracing until a concrete measured/deployment need exists and the privacy/security boundary is defined.

## Performance budget that remains enforced

The public-home Pixel 7 Chromium production-build hard ceilings remain:

- total same-origin transfer: 215,063 bytes;
- JavaScript transfer: 190,003 bytes;
- CSS transfer: 6,366 bytes;
- image transfer: 0 bytes on this specific route.

The zero-image ceiling is route-specific. Never silently raise a resource threshold just to make CI pass.

## Critical privacy and provider-honesty boundaries

Never log or expose authentication tokens, cookies, refresh tokens, private request bodies, traveller private data, unnecessary trip/budget details, children's sensitive information, raw provider payloads, secrets, credentials, or unnecessary client/IP information.

Never invent prices, flights, hotel availability, weather, emergency numbers, embassy/consulate information, visa requirements, passport procedures, provider availability, live travel results, provider quota values or AI/LLM responses. The AI provider boundary remains reserved until a real model integration genuinely exists.

## Critical Travel Companion boundaries

- Keep Travel Companion conversation history session-only unless a later privacy-reviewed design explicitly changes that rule.
- Embassy discovery uses the provider-neutral places boundary and Geoapify's documented `office.government.embassy` category; do not invent a separate consulate provider category.
- Optional precise location remains runtime-only where designed.
- Do not present provider phone/site/opening-hours/passport-procedure fields as officially verified government information.
- Preserve verified emergency provenance and safe HTTP/HTTPS source-link normalization.
- Preserve authenticated owner-scoped trip context and do not unexpectedly overwrite manual destination choices.
- Preserve all 18 maintained UI locales, accessibility, mobile behavior, Arabic RTL, reduced-motion, and theme behavior.

## Release rule

Every new slice must use the normal gate:

1. start from the latest exact `develop` SHA whose push CI has all five jobs green;
2. create a dedicated branch;
3. implement one coherent slice with meaningful tests;
4. open a PR into `develop`;
5. freeze the exact final PR head and verify all five canonical jobs individually on that SHA;
6. re-fetch PR/base/head before merge;
7. squash-merge using expected-head protection;
8. confirm the exact resulting `develop` SHA;
9. verify an independent push-triggered CI run on that exact SHA has all five canonical jobs green before any later slice starts.

The canonical jobs are:

1. Code quality and unit tests
2. Dependency and secret checks
3. Live no-cost provider checks
4. Production builds
5. PostgreSQL and Prisma verification

Never weaken CI, security, privacy, provider-honesty, accessibility, performance budgets, or data-integrity controls to obtain green status.

## Next-work status

Issue `#40` remains the active broad production-readiness program, but the next functional slice is not automatically predetermined. Inspect the live code first.

Already completed and not valid reasons to duplicate work: API restart/recovery verification, the Prisma migration baseline/deploy gate, basic owner-scoped session/device revocation controls, the web session-security experience, and first-stage credentialed-provider request budgets.

Candidate genuine gaps to investigate now include dependency timeout/recovery behavior beyond the existing provider-isolation test, unproven multi-instance deployment assumptions, shared-state decisions only where the architecture actually requires them, database N+1/hot-path evidence, deployment-platform edge/load-balancer/WAF requirements once a concrete public production target exists, route-specific partial/degraded-mode UX gaps, and whether provider-budget coordination must become shared only after a measured multi-replica need is demonstrated.

These are candidates only. Do not add Redis, queues, read replicas, distributed tracing, monitoring vendors, or other shared infrastructure simply because Issue `#40` mentions them.

Issue `#36` remains the separate privacy-conscious analytics/admin-monitoring program. Its existing sequencing still defers implementation until the necessary authoritative product/subscription actions exist and before final release hardening. Any analytics dashboard must stay administrator-only and out of the normal traveller application.

Repository state always wins over this handoff if newer verified work has landed.
