# AttraVoya Pro — Next Chat Handoff

Continue `Victor12-star/AttraVoya-Pro` from the exact live repository state. Do not repeat completed work.

## First action in a new chat

1. Fetch `develop` and record its exact SHA.
2. Inspect the exact push-triggered CI run attached to that SHA.
3. Verify all five canonical jobs individually rather than relying on workflow-level success.
4. Re-read `docs/CURRENT-WORK.md` and this file from that exact SHA.
5. Inspect open pull requests/issues and the live code before choosing any new slice.
6. Do not restart any completed Phase 9X through Phase 10L production-readiness work.

## Current fully verified release

Phase 10L — production mobile resource-budget enforcement — is complete.

- PR: `#99`
- Final PR head: `1deda20f332c6079cdc4bf83bc540ab128e2dc3d`
- Final PR CI run: `34498521735`
- All five canonical jobs passed
- Exact squash-merged `develop`: `7f5e4cf50c8c7fe0f3a83ed0007d6741e5952a95`
- Post-merge push CI run: `34498982812`
- All five canonical jobs passed

Phase 10L enforces the public-home Pixel 7 Chromium production-build resource budget established from two stable Phase 10K measurements. Current hard ceilings are 215,063 bytes total same-origin transfer, 190,003 bytes JavaScript transfer, 6,366 bytes CSS transfer, and 0 bytes image transfer for that specific route.

The zero image ceiling is route-specific. Do not treat it as a global prohibition on legitimate images. Any later budget revision must be based on measured evidence and review; never silently raise a threshold just to make CI green.

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

PR `#91` is obsolete and superseded by Phase 10F PR `#93`; never merge it. Its old failed CI is historical audit evidence, not the current release state. The similarly obsolete Phase 9U PR `#79` must also never be merged.

## Existing protections that should not be reimplemented

Before choosing another Issue #40 slice, remember that the live repository already has:

- 256 KiB request-body limiting;
- global and route/risk-aware rate limits for authentication/planner/provider-heavy traffic plus separate bounded health-probe limits;
- provider timeouts, bounded retries with jitter, `Retry-After`, concurrency bulkheads, queue bounds, total request deadlines and circuit breaking;
- in-process provider cache with single-flight miss coalescing;
- owner-scoped planner access, bounded pagination and planner-create idempotency;
- privacy-safe structured logging and bounded HTTP/provider/cache/database/runtime metrics;
- ADMIN-only `private, no-store` service metrics;
- PostgreSQL pool-exhaustion checks and guarded logical backup/restore CI;
- Phase 9I recovery targets: RPO <= 15 minutes, RTO <= 60 minutes, PITR >= 7 days, automated backup retention >= 30 days, and restore verification before launch and at least quarterly;
- production API container verification, deployment draining/shutdown runbook and overload-safe readiness/liveness;
- browser/mobile/cross-browser E2E, accessibility, slow-network and reconnect coverage;
- a production-build web test path plus measured and enforced public-home mobile resource budgets.

Do not introduce Redis, durable queues, shared rate-limit state, read replicas, external observability vendors or distributed tracing until a concrete measured/deployment need exists and the privacy/security boundary is defined.

## Critical Travel Companion boundaries

- The server AI integration remains only a reserved provider boundary; do not fake an LLM/model call or branding.
- Ground answers in approved AttraVoya contracts and explicitly decline unsupported questions rather than hallucinating.
- Keep Travel Companion conversation history session-only unless a later privacy-reviewed design explicitly changes that rule.
- Embassy discovery uses the provider-neutral places boundary and Geoapify's documented `office.government.embassy` category; do not invent a separate consulate provider category.
- Do not present provider phone/site/opening-hours/passport-procedure fields as officially verified government information.
- Preserve verified emergency provenance and safe HTTP/HTTPS source-link normalization.
- Do not invent emergency contacts, consular contacts, travel prices, hotel/flight availability, weather, visa/passport rules, or other unsupported live facts.
- Preserve all 18 maintained UI locales, accessibility, mobile behavior, RTL, reduced-motion, and theme behavior.

## Release rule

Every new slice must use the normal gate:

1. start from the latest exact `develop` SHA whose push CI has all five jobs green;
2. create a dedicated branch;
3. open a PR into `develop`;
4. exact final PR head must pass all five canonical jobs;
5. squash-merge using expected-head protection;
6. exact resulting `develop` SHA must independently pass all five canonical jobs on a push-triggered run before any later slice starts.

The canonical jobs are:

1. Code quality and unit tests
2. Dependency and secret checks
3. Live no-cost provider checks
4. Production builds
5. PostgreSQL and Prisma verification

Never weaken CI, security, privacy, provider-honesty, accessibility, or data-integrity controls to get green status.

## Next-work status

Issue `#40` remains the active broad production-readiness program, but the next implementation slice is not automatically predetermined. Inspect the live code before selecting a gap. Plausible remaining areas include concurrent-edit conflict handling, wider measured traffic/cost tiers, stress/soak/spike evidence, query/index review, additional route-specific performance evidence, and multi-replica/shared-infrastructure work only when measured need justifies it.

Issue `#36` remains the separate privacy-conscious analytics/admin-monitoring program. Its existing sequencing still defers implementation until the necessary authoritative product/subscription actions exist and before final release hardening. Any analytics dashboard must stay administrator-only and out of the normal traveller application.

Repository state always wins over this handoff if newer verified work has landed.