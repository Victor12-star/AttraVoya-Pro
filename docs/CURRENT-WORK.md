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

Phase 10R — provider failure isolation — is complete.

- PR: `#106`
- Final PR head: `4e72ac4103b5c77ebdb773b0b6229d68788d3801`
- Final PR CI run: `34520682649`
- Result: all five canonical jobs passed
- Squash-merged `develop` SHA: `5960fec326e1a730701e7c116eaed6676ccdaaf8`
- Independent post-merge push CI run: `34521122460`
- Result: all five canonical jobs passed

Phase 10R adds deterministic application-level integration evidence that one external-provider outage does not unnecessarily take down unrelated API functionality. The test makes the weather provider unavailable and verifies that the weather route returns HTTP 503 with the existing `PROVIDER_UNAVAILABLE` contract while an unrelated currency route, liveness, and readiness remain HTTP 200.

No fake provider data, distributed infrastructure, privacy weakening, or flaky live dependency was introduced.

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

PR `#91` is obsolete and was superseded by the corrected Phase 10F PR `#93`; never merge it. Obsolete Phase 9U PR `#79` is also superseded and must never be merged.

## What Phases 10M through 10R added

Phase 10M defined early, growth, and high-scale capacity-planning contracts, added measured early-capacity evidence, PostgreSQL connection-budget methodology, provider-call/cost evidence requirements, and promotion rules before higher-scale capacity can be claimed.

Phase 10N added deterministic bounded soak, spike, and post-stress health regression testing while keeping tests loopback-only and privacy-safe.

Phase 10O added atomic one-time email-verification-token and password-reset-token claiming, concurrency protection against last-writer-wins reset races, session-revocation consistency, and real PostgreSQL concurrency integration evidence.

Phase 10P added PostgreSQL indexes aligned with production authentication predicates, plus catalog verification and `EXPLAIN` evidence that the relevant predicates are indexable.

Phase 10Q added compare-and-swap refresh-token rotation so two simultaneous refresh requests using the same token cannot both succeed.

Phase 10R added deterministic evidence that one provider outage does not unnecessarily degrade unrelated provider routes or health endpoints.

## Existing Issue #40 foundations that must be preserved

The repository already contains production-readiness work that later slices must build on rather than duplicate:

- bounded global and route/risk-aware API rate limits, including stricter planner and provider-backed route limits;
- a 256 KiB Fastify request-body ceiling;
- provider hard timeouts, bounded retries with jitter, `Retry-After` handling, per-provider concurrency limits, queue bounds, a total logical-request deadline, and a process-local circuit breaker;
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
- atomic authentication token claiming and refresh-session concurrency protection;
- authentication query/index review with PostgreSQL catalog and `EXPLAIN` evidence;
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

Candidate remaining gaps that still require live verification include restart/recovery-path evidence, dependency timeout-and-recovery behavior beyond the existing provider-isolation test, multi-instance deployment assumptions that are not yet proven, shared-state decisions only where the current architecture actually requires them, database N+1/hot-path evidence, rolling-deployment/backward-compatible migration evidence, route-specific loading/error/degraded-mode UX gaps, additional session/device/revocation production-risk controls, and measurable provider quota/cost protections.

Treat those as candidate gaps, not automatic implementation instructions. Inspect first and choose the smallest genuine missing production-readiness slice.

Issue `#36` — privacy-conscious analytics/admin monitoring — also remains a standing program. Its sequencing still defers implementation until the required authoritative product/subscription actions exist and before final release hardening. Any analytics/admin dashboard remains administrator-only and must never appear in the normal traveller application.

Repository state wins over this document if newer fully verified work lands. Before starting another slice, always inspect the live `develop` SHA, its exact push CI, open PRs/issues, and relevant code paths.
