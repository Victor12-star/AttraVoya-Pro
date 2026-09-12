# AttraVoya Pro — Current Work

This is the authoritative development handoff for `Victor12-star/AttraVoya-Pro`.

## Release invariant

Every feature slice must follow this sequence without shortcuts:

1. Confirm the exact `develop` HEAD and its exact push CI run.
2. Confirm all five canonical CI jobs completed successfully on that exact SHA.
3. Create a feature branch from that exact SHA.
4. Implement and test the slice on the feature branch.
5. Open a pull request to `develop`.
6. Confirm all five canonical jobs completed successfully on the exact final PR head.
7. Squash-merge using the exact expected PR head SHA.
8. Confirm the exact resulting `develop` SHA.
9. Confirm an independent push-triggered CI run on that exact `develop` SHA has all five canonical jobs green before starting another slice.

The five canonical jobs are:

- Code quality and unit tests
- Dependency and secret checks
- Live no-cost provider checks
- Production builds
- PostgreSQL and Prisma verification

Never infer 5/5 from workflow-level status alone; inspect the individual jobs. Do not bypass checks, weaken workflows, or push feature work directly to `develop`.

## Current fully verified release

Phase 10W — web session security controls — is complete.

- PR: `#112`
- Final PR head: `6971786b138fe9f762c983b216962ceee4919cc9`
- Final PR CI run: `34699789733`
- Result: all five canonical jobs passed
- Squash-merged `develop` SHA: `d68d723deca5870ccb02129edfaa0b009853a71f`
- Independent post-merge push CI run: `34699998083`
- Result: all five canonical jobs passed

Phase 10W exposes the existing owner-scoped session APIs through the web `/profile` security experience. It provides minimized browser/platform labels, safe loading/empty/error/authentication-required states, targeted session revocation, explicit sign-out-everywhere confirmation, duplicate-action protection, 18-locale copy, responsive theming, browser smoke coverage and blocking Axe accessibility coverage. Raw refresh hashes, IP hashes, tokens and other private session metadata remain unexposed.

The public-home Pixel 7 Chromium production-build resource budget established by Phases 10K and 10L remains enforced. Current hard ceilings are 215,063 bytes total same-origin transfer, 190,003 bytes JavaScript transfer, 6,366 bytes CSS transfer, and 0 bytes image transfer for that specific route. The zero-image ceiling is route-specific and must not be generalized to unrelated routes.

Performance evidence remains aggregate-only. Do not log raw resource URLs, query strings, request bodies, user identifiers, provider payloads, traveller information, child-sensitive data, tokens, or other private request-level content.

## Recent verified production-readiness sequence

The following Issue #40 slices are complete and must not be restarted:

- Phase 9X — provider circuit breaker — PR `#84`
- Phase 9Y — admin-only service metrics snapshot — PR `#85`
- Phase 9Z — API production-container contract — PR `#86`
- Phase 10A — API capacity and overload-backpressure gate — PR `#87`
- Phase 10B — overload-safe liveness/readiness probes — PR `#88`
- Phase 10C — total provider-request deadline — PR `#89`
- Phase 10D — bounded graceful shutdown — PR `#90`
- Phase 10E — deployment reliability runbook — PR `#92`
- Phase 10F — runtime CPU/memory/event-loop saturation metrics — PR `#93`
- Phase 10G — service SLO and error-budget policy — PR `#94`
- Phase 10H — request-log client-IP minimization — PR `#95`
- Phase 10I — web/mobile performance-budget contract — PR `#96`
- Phase 10J — production web build in browser CI — PR `#97`
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

PR `#91` is obsolete and was superseded by the corrected Phase 10F PR `#93`; never merge it. Obsolete Phase 9U PR `#79` is also superseded and must never be merged.

## What Phases 10M through 10W added

Phase 10M defined early, growth, and high-scale capacity-planning contracts, added measured early-capacity evidence, PostgreSQL connection-budget methodology, provider-call/cost evidence requirements, and promotion rules before higher-scale capacity can be claimed.

Phase 10N added deterministic bounded soak, spike, and post-stress health regression testing while keeping tests loopback-only and privacy-safe.

Phase 10O added atomic one-time email-verification-token and password-reset-token claiming, concurrency protection against last-writer-wins reset races, session-revocation consistency, and real PostgreSQL concurrency integration evidence.

Phase 10P added PostgreSQL indexes aligned with production authentication predicates, plus catalog verification and `EXPLAIN` evidence that the relevant predicates are indexable.

Phase 10Q added compare-and-swap refresh-token rotation so two simultaneous refresh requests using the same token cannot both succeed.

Phase 10R added deterministic evidence that one provider outage does not unnecessarily degrade unrelated provider routes or health endpoints.

Phase 10S added a guarded process-level restart/recovery harness that starts the real API against disposable PostgreSQL, verifies database-backed readiness, performs bounded SIGTERM shutdown, starts a replacement process on the same host/port/database and verifies readiness again in CI.

Phase 10T added the Prisma-generated `0_init` migration baseline, production-style `migrate deploy` CI evidence, migration-status and schema-drift verification, and explicit safe-baseline/expand-migrate-contract guidance for rolling-compatible database changes.

Phase 10U added authenticated owner-scoped session visibility with a hard result bound, privacy-minimized session metadata, idempotent targeted revocation and revoke-all-active-sessions support while preserving short-lived access-token lifetime semantics.

Phase 10V added explicit operator-configured in-process request budgets for credentialed external providers. Allowance is consumed immediately before each real upstream attempt, including retries; production fails startup when an enabled credentialed provider lacks its required budget configuration; no vendor quota values are guessed.

Phase 10W added the web account-security UI for those owner-scoped session controls, with privacy-minimized device labels, authoritative destructive-action handling, all maintained locales, responsive/accessibility behavior and blocking browser/Axe coverage.

## Existing Issue #40 foundations that must be preserved

The repository already contains production-readiness work that later slices must build on rather than duplicate:

- bounded global and route/risk-aware API rate limits, including stricter planner and provider-backed route limits;
- a 256 KiB Fastify request-body ceiling;
- provider hard timeouts, bounded retries with jitter, `Retry-After` handling, per-provider concurrency limits, queue bounds, a total logical-request deadline, a process-local circuit breaker and explicit paid-provider request budgets;
- bounded in-process provider caching with single-flight cache-miss coalescing;
- owner-scoped private planner data, keyset pagination, and planner-create idempotency;
- privacy-safe request logging and bounded process-local HTTP/provider/cache/database/runtime metrics;
- an authenticated server-side ADMIN-only service-metrics endpoint with `private, no-store` responses;
- PostgreSQL pool-exhaustion coverage and a guarded backup/restore recovery drill;
- initial recovery targets: RPO <= 15 minutes, RTO <= 60 minutes, PITR window >= 7 days, retained automated backups >= 30 days, and restore verification before launch and at least quarterly;
- measured API capacity/backpressure CI using a real disposable PostgreSQL database;
- bounded soak, stress, and spike regression evidence;
- overload-safe health probes;
- a verified non-root API production container and bounded deployment/graceful-shutdown runbook;
- process-level API restart/recovery verification;
- a Prisma migration baseline plus production-style migration deploy/status/drift gates and rolling-compatible migration guidance;
- atomic authentication token claiming and compare-and-swap refresh-session concurrency protection;
- authentication query/index review with PostgreSQL catalog and `EXPLAIN` evidence;
- owner-scoped session visibility/revocation APIs plus a privacy-minimized web session-security experience;
- provider-failure isolation;
- browser E2E, accessibility, slow-network, offline/reconnection, production-build, mobile and cross-browser coverage;
- web/mobile Core Web Vitals targets and the public-home production resource-budget gate.

Do not add Redis, queues, distributed tracing, a monitoring vendor, read replicas, shared rate-limit storage, or other distributed infrastructure merely because Issue #40 mentions them. Introduce such components only when the live architecture and measured need justify them.

## Critical privacy and provider-honesty boundaries

Never log or expose authentication tokens, cookies, refresh tokens, private request bodies, traveller private data, trip/budget details unnecessarily, children's sensitive information, raw provider payloads, secrets, credentials, or unnecessary client/IP information.

Never fabricate prices, flights, hotel availability, weather, emergency numbers, embassy/consulate information, visa requirements, passport procedures, provider availability, live travel results, or AI/LLM responses.

The AI provider boundary remains reserved. Do not claim a real LLM/model integration until one genuinely exists.

## Travel Companion safety boundaries that remain mandatory

Preserve the completed Travel Companion rules:

- embassy discovery uses the provider-neutral places boundary and Geoapify's documented `office.government.embassy` category;
- do not invent a separate consulate provider category;
- optional precise location used by embassy discovery stays runtime-only;
- provider phone, website, opening hours, or passport procedures are not presented as officially verified government information;
- lost/stolen-passport guidance remains generic and directs users to the responsible authority for exact requirements;
- emergency source URLs remain restricted to safe HTTP/HTTPS normalization and verified source/verification metadata remains visible;
- owner-scoped trip context remains authenticated, bounded, data-minimized, and `private, no-store`;
- manual destination choice must not be overwritten unexpectedly by later trip-context loading;
- Travel Companion conversation history remains session-only unless a later privacy-reviewed design explicitly changes that rule;
- all 18 maintained UI locales, accessibility, mobile behavior, Arabic RTL, reduced-motion, and theme compatibility remain supported.

## Current next-work status

Issue `#40` — production scalability, reliability, performance and user-experience readiness — remains open. Continue it only through coherent, reviewable gaps supported by the live architecture. Before naming or implementing another phase, inspect the current repository and prior PRs so already completed protections are not duplicated.

Already addressed and therefore not valid reasons for a new duplicate slice: process restart/recovery evidence, the Prisma migration baseline/deploy gate, basic owner-scoped session/device revocation controls, the web session-security experience, and first-stage credentialed-provider request budgets.

Candidate remaining gaps that still require live verification include dependency timeout-and-recovery behavior beyond the existing provider-isolation test, unproven multi-instance deployment assumptions, shared-state decisions only where the current architecture actually requires them, database N+1/hot-path evidence, deployment-platform edge/load-balancer/WAF requirements when a real public production target is selected, route-specific partial/degraded-mode UX gaps, and whether provider-budget semantics need a shared coordinator only after a measured multi-replica deployment requirement exists.

Treat those as candidate gaps, not automatic implementation instructions. Inspect first and choose the smallest genuine missing production-readiness slice.

Issue `#36` — privacy-conscious analytics/admin monitoring — also remains a standing program. Its sequencing still defers implementation until the required authoritative product/subscription actions exist and before final release hardening. Any analytics/admin dashboard remains administrator-only and must never appear in the normal traveller application.

Repository state wins over this document if newer fully verified work lands. Before starting another slice, always inspect the live `develop` SHA, its exact push CI, open PRs/issues, and relevant code paths.
