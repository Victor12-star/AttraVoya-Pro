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

Phase 10AP — mobile route failure containment — is complete.

- PR: `#133`
- Final PR head: `f8b60985ed7110ecc2d5b57c63ce497c7cddda11`
- Final PR CI run: `34866326214`
- Result: all five canonical jobs passed
- Squash-merged `develop` SHA: `b0e2013d9ef753e3fca7c38e40bb02ba992a1ffe`
- Independent post-merge push CI run: `34866922973`
- Result: all five canonical jobs passed

Phase 10AP contains mobile route render failures through Expo Router's supported layout-level screen boundary, presents an accessible retry experience without exposing internal diagnostics, and activates focused mobile recovery tests. It also repairs the previously dormant mobile test setup so future mobile safeguards can be verified rather than silently passing with no tests.

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
- Phase 10X — protect planner list PostgreSQL hot path — PR `#114`
- Phase 10Y — fail closed on unsupported production replica topology — PR `#115`
- Phase 10Z — bound planner list relation queries — PR `#116`
- Phase 10AA — harden accommodation photo gallery — PR `#117`
- Phase 10AB — contain accommodation gallery keyboard focus — PR `#118`
- Phase 10AC — make provider budgets replica-safe — PR `#119`
- Phase 10AD — prove process-local provider cache safety — PR `#120`
- Phase 10AE — make API rate limits replica-safe — PR `#121`
- Phase 10AF — prove provider circuit replica safety — PR `#122`
- Phase 10AG — define replica metrics aggregation topology — PR `#123`
- Phase 10AH — make budget navigation immediately responsive — PR `#124`
- Phase 10AI — add immediate route loading skeleton — PR `#125`
- Phase 10AJ — localize route recovery experience — PR `#126`
- Phase 10AK — preserve client deadlines with cancellation — PR `#127`
- Phase 10AL — cancel abandoned destination searches — PR `#128`
- Phase 10AM — stabilize client abort classification — PR `#129`
- Maintenance handoff synchronization through Phase 10AM — PR `#130`
- Phase 10AN — cancel abandoned destination provider requests — PR `#131`
- Phase 10AO — bound shared API responses — PR `#132`
- Phase 10AP — contain mobile route failures — PR `#133`

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

## What Phases 10X through 10AV added

Phases 10X and 10Z protect the planner-list PostgreSQL hot path with bounded query behavior and relation-query evidence. Phase 10Y makes production reject unsupported replica configurations rather than silently running unsafe process-local controls across multiple instances.

Phases 10AC through 10AG define truthful replica behavior for paid-provider budgets, provider caching, API rate limits, provider circuit state and service metrics. The request hot paths remain process-local and fast; multi-replica deployment requires the explicit supported topology and external per-instance metrics aggregation rather than hidden database or network writes.

Phases 10AA and 10AB harden the accommodation photo gallery, including keyboard-focus containment. Phases 10AH through 10AJ add immediate duplicate-safe budget navigation feedback, a lightweight route loading skeleton and localized safe route-error recovery without increasing normal-route data traffic.

Phases 10AK through 10AM keep client requests bounded when screens supply cancellation signals, stop abandoned destination searches early and classify caller cancellation separately from deadline expiry across web, admin and mobile consumers.

Phase 10AN extends cancellation to the destination dashboard's independent weather and image requests, including superseded retries, while preserving partial and degraded states. Phase 10AO bounds JSON response reads in the shared web and mobile API client, rejects oversized declared responses before reading, stops undeclared streams once they cross the two-mebibyte default boundary, and preserves safe request-identifiable errors. Phase 10AP contains mobile route render failures with an accessible retry surface, private diagnostics, verified Expo production export and an active mobile unit-test foundation.

Phase 10AQ rejects successful non-JSON responses while preserving vendor `+json` media types and valid 204 responses. Phase 10AR rejects null, array and primitive successful JSON bodies at the shared client boundary so malformed envelopes cannot reach feature code as trusted data.

Phase 10AS keeps mobile secure-token retrieval inside the shared request deadline so a stalled platform bridge cannot leave a request pending forever. Phase 10AT makes capacity/backpressure evidence deterministic across aligned rate-limit window rollover by deriving a stronger burst from the production request ceiling.

Phase 10AU gives failed Travel Companion country-reference loading a localized, accessible retry with cancellation and stale-result protection. Phase 10AV extends active cancellation to abandoned phrasebook and emergency-reference requests while retaining generation guards and grounded-data honesty.

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
- web/mobile Core Web Vitals targets and the public-home production resource-budget gate;
- bounded shared-client JSON response reads for declared and streamed payloads;
- mobile nested-route render-failure containment with an accessible retry surface and active mobile recovery tests.
- successful-response media-type and top-level object-envelope validation in the shared client;
- request-deadline coverage for stalled mobile secure-token retrieval;
- rollover-safe capacity/backpressure CI evidence derived from the production rate limit;
- localized Travel Companion reference retry plus cancellation of stale country, phrasebook and emergency requests.

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

Already addressed and therefore not valid reasons for a new duplicate slice: process restart/recovery evidence, the Prisma migration baseline/deploy gate, planner-list hot-path query bounds, basic owner-scoped session/device revocation controls, the web session-security experience, replica-safe process-local rate limits/provider budgets/cache/circuit state, external per-instance metrics topology, global web route loading/recovery states, client request deadlines, abandoned destination-search and dashboard-provider cancellation, bounded and structurally validated shared-client JSON responses, stalled mobile token-retrieval deadlines, rollover-safe capacity evidence, mobile nested-route render recovery, and Travel Companion country/phrasebook/emergency request recovery and cancellation.

Candidate remaining gaps that still require live verification include dependency timeout-and-recovery behavior beyond the existing provider-isolation tests, database N+1 or hot-path evidence outside the verified planner-list path, deployment-platform edge/load-balancer/WAF requirements when a real public production target is selected, route-specific partial/degraded-mode UX gaps, and operational integration of an external metrics collector only when a concrete multi-replica target is selected.

Treat those as candidate gaps, not automatic implementation instructions. Inspect first and choose the smallest genuine missing production-readiness slice.

Issue `#36` — privacy-conscious analytics/admin monitoring — also remains a standing program. Its sequencing still defers implementation until the required authoritative product/subscription actions exist and before final release hardening. Any analytics/admin dashboard remains administrator-only and must never appear in the normal traveller application.

Repository state wins over this document if newer fully verified work lands. Before starting another slice, always inspect the live `develop` SHA, its exact push CI, open PRs/issues, and relevant code paths.
