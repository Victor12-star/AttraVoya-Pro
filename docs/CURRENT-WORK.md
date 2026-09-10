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

Phase 10L — production mobile resource-budget enforcement — is complete.

- PR: `#99`
- Final PR head: `1deda20f332c6079cdc4bf83bc540ab128e2dc3d`
- Final PR CI run: `34498521735`
- Result: all five canonical jobs passed
- Squash-merged `develop` SHA: `7f5e4cf50c8c7fe0f3a83ed0007d6741e5952a95`
- Independent post-merge push CI run: `34498982812`
- Result: all five canonical jobs passed

Phase 10L turns the reproducible Phase 10K Pixel 7 Chromium production measurement into a blocking release gate for the public home route. The hard ceilings are 215,063 bytes total same-origin transfer, 190,003 bytes JavaScript transfer, 6,366 bytes CSS transfer, and 0 bytes image transfer for this route. These thresholds use the larger of two stable Phase 10K measurements plus 10% headroom. The zero-image ceiling is route-specific and must not be generalized to unrelated routes.

Performance evidence remains aggregate-only. Do not log raw resource URLs, query strings, request bodies, user identifiers, provider payloads, traveller information, child-sensitive data, tokens, or other private request-level content.

## Recent verified production-readiness sequence

The live repository has advanced well beyond the older Phase 9W checkpoint. The following slices are complete and must not be restarted:

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

PR `#91` is obsolete and was superseded by the corrected Phase 10F PR `#93`. It must never be merged. Its historical failed check is retained only as GitHub audit history. The active obsolete branch was moved to the verified Phase 10F commit `8063edf83858f350a8c2ba47fc1561a41bc2b4cd`; do not use it for new work.

## Existing Issue #40 foundations that must be preserved

The repository already contains production-readiness work that later slices must build on rather than duplicate:

- bounded global and route/risk-aware API rate limits, including stricter planner and provider-backed route limits;
- a 256 KiB Fastify request-body ceiling;
- provider hard timeouts, bounded retries with jitter, `Retry-After` handling, per-provider concurrency limits, queue bounds, a total logical-request deadline, and a process-local circuit breaker;
- bounded in-process provider caching with single-flight cache-miss coalescing;
- owner-scoped private planner data, keyset pagination, and planner-create idempotency;
- privacy-safe request logging and bounded process-local HTTP/provider/cache/database/runtime metrics;
- an authenticated server-side ADMIN-only service-metrics endpoint with `private, no-store` responses;
- PostgreSQL connection-pool exhaustion coverage and a guarded backup/restore recovery drill;
- initial recovery targets already defined by Phase 9I: RPO <= 15 minutes, RTO <= 60 minutes, PITR window >= 7 days, retained automated backups >= 30 days, and restore verification before launch and at least quarterly;
- API capacity/backpressure CI using a real disposable PostgreSQL database, plus overload-safe health probes;
- a verified non-root API production container and deployment/graceful-shutdown runbook;
- browser E2E, accessibility, slow-network, offline/reconnection, production-build, mobile and cross-browser coverage;
- web/mobile Core Web Vitals targets and the public-home production resource-budget gate.

Do not add Redis, queues, distributed tracing, a monitoring vendor, read replicas, shared rate-limit storage, or other distributed infrastructure merely because Issue #40 mentions them. Introduce such components only when the live architecture and measured need justify them.

## Travel Companion safety boundaries that remain mandatory

Preserve the completed Phase 9U/9V/9W rules:

- embassy discovery uses the provider-neutral places boundary and Geoapify's documented `office.government.embassy` category;
- do not invent a separate consulate provider category;
- optional precise location used by embassy discovery stays runtime-only;
- provider phone, website, opening hours, or passport procedures are not presented as officially verified government information;
- lost/stolen-passport guidance remains generic and directs users to the responsible authority for exact requirements;
- no fake LLM/model claim until a real provider is implemented behind the reserved AI boundary;
- no invented emergency number, consular contact, hotel availability, price, weather, flight, visa, passport rule, or other unsupported fact;
- emergency source URLs remain restricted to safe HTTP/HTTPS normalization and verified source/verification metadata remains visible;
- owner-scoped trip context remains authenticated, bounded, data-minimized, and `private, no-store`;
- manual destination choice must not be overwritten unexpectedly by later trip-context loading;
- all 18 maintained UI locales, accessibility, mobile behavior, RTL, reduced-motion, and theme compatibility remain supported.

Obsolete Phase 9U PR `#79` was closed as superseded and must never be merged.

## Current next-work status

Issue `#40` — production scalability, reliability, performance and user-experience readiness — remains open. Continue it only through coherent, reviewable gaps supported by the live architecture. Before naming or implementing another phase, inspect the current repository and prior PRs so already completed protections are not duplicated.

Remaining areas may include concurrency-conflict handling for mutable records, broader measured traffic/cost tiers, stress/soak/spike evidence, production multi-replica/shared-infrastructure decisions when justified by measured deployment needs, deeper query/index review, and additional graceful-degradation or route-specific performance evidence. Treat these as candidate gaps, not automatic implementation instructions; verify each against the live code first.

Issue `#36` — privacy-conscious analytics/admin monitoring — also remains a standing program. Its sequencing still defers implementation until the required authoritative product/subscription actions exist and before final release hardening. Any analytics/admin dashboard remains administrator-only and must never appear in the normal traveller application.

Repository state wins over this document if newer fully verified work lands. Before starting another slice, always inspect the live `develop` SHA, its exact push CI, open PRs/issues, and relevant code paths.
