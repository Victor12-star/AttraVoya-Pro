# AttraVoya Pro — Next Chat Handoff

Continue `Victor12-star/AttraVoya-Pro` from the exact live repository state. Do not repeat completed work.

## First action in a new chat

1. Fetch `develop` and record its exact SHA.
2. Inspect the exact push-triggered CI run attached to that SHA.
3. Verify all five canonical jobs individually rather than relying on workflow-level success.
4. Re-read `docs/CURRENT-WORK.md` and this file from that exact SHA.
5. Inspect open pull requests, Issue `#40`, and the relevant live code before choosing any new slice.
6. Do not restart completed production-readiness or subscription work through Phase 10CX.

## Current fully verified release

Phase 10DB — server-owned RevenueCat / Google Play product mapping — is complete and release-verified.

- PR: `#203`
- Final PR head: `fda9495e0c00cd042522448d7212cd736ebe0ff1`
- Final PR CI run: `36036423519`
- All five canonical jobs passed on the exact final PR head
- Exact squash-merged `develop`: `10a7b7160e2726f5e1afa7974e6ff22d62c9d418`
- Post-merge push CI run: `36037329944`
- All five canonical jobs passed

The verified subscription sequence now includes the complete guarded Stripe web purchase path plus the first two intentionally separate RevenueCat Android trust slices. Phase 10DA authenticates RevenueCat webhook evidence internally against exact raw bytes. Phase 10DB adds server-owned Google Play subscription/base-plan identifiers and maps only the configured provider products to `PRO_MONTHLY` and `PRO_YEARLY`. Neither phase grants Pro from client state or provider product names alone.

Public RevenueCat ingress, subscriber/App User ID ownership resolution, verified lifecycle normalization, authoritative subscription mutation, refunds/revocations, restore semantics, RevenueCat mobile SDK integration, Google Play purchase UI and future Apple In-App Purchase remain separate later slices. The Stripe web checkout path must not be reused for mobile store billing.

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
- Maintenance handoff synchronization through Phase 10AP — PR `#134`
- Phase 10AQ — reject unexpected API response formats — PR `#135`
- Phase 10AR — validate successful API envelopes — PR `#136`
- Phase 10AS — bound mobile token retrieval — PR `#137`
- Phase 10AT — make capacity gate rollover-safe — PR `#138`
- Phase 10AU — recover Travel Companion references — PR `#139`
- Phase 10AV — cancel abandoned assistant requests — PR `#140`
- Phase 10AW — synchronize reliability handoff — PR `#141`
- Phase 10AX — stabilize destination page CI test — PR `#142`
- Phase 10AY — bound Travel Companion relation queries — PR `#143`
- Phase 10AZ — verify live database outage recovery — PR `#144`
- Phase 10BA — bound country reference relation queries — PR `#145`
- Phase 10BB — bound emergency reference responses — PR `#146`
- Phase 10BC — bound language reference responses — PR `#147`
- Phase 10BD — bound country reference responses — PR `#148`
- Phase 10BE — add secure account deletion — PR `#149`
- Phase 10BF — establish adaptive design foundations — PR `#150`
- Phase 10BG — modernize the mobile application shell — PR `#151`
- Phase 10BH — add safe reusable mobile feedback states — PR `#152`
- Phase 10BI — add bounded mobile query boundary — PR `#153`
- Phase 10BJ — add safe mobile API boundary — PR `#154`
- Phase 10BK — upgrade CI actions to Node.js 24 — PR `#155`
- Phase 10BL — pin canonical CI to Ubuntu 24.04 — PR `#156`
- Phase 10BM — add secure mobile access-token storage — PR `#157`
- Phase 10BN — add cookie-free mobile refresh sessions — PR `#158`
- Phase 10BO — coordinate secure mobile session refresh — PR `#159`
- Phase 10BP — connect mobile authentication entry — PR `#160`
- Phase 10BQ — connect mobile account registration — PR `#161`
- Phase 10BR — add safe mobile password recovery request — PR `#162`
- Phase 10BS — add mobile verification recovery — PR `#163`
- Phase 10BT — restore mobile session identity and profile — PR `#164`
- Phase 10BU — add secure in-app account deletion — PR `#165`
- Phase 10BV — add public web account deletion flow — PR `#166`
- Phase 10BW — publish the public privacy policy — PR `#167`
- Phase 10BX — publish the public terms of service — PR `#168`
- Maintenance handoff synchronization through Phase 10BX — PR `#169`
- Phase 10BY — establish authoritative Free and Pro entitlements — PR `#170`
- Phase 10BZ — centralize server entitlement authorization — PR `#171`
- Phase 10CA — publish truthful web subscription status — PR `#172`
- Phase 10CB — publish truthful mobile subscription status — PR `#173`
- Phase 10CC — add verified billing event ledger — PR `#174`
- Phase 10CD — add idempotent verified billing event recording — PR `#175`
- Phase 10CE — make billing-event terminalization concurrency-safe — PR `#176`
- Phase 10CF — apply verified subscription state transactionally — PR `#178`
- Phase 10CG — establish provider verification evidence boundary — PR `#179`
- Phase 10CH — add internal Stripe webhook signature verifier — PR `#180`
- Phase 10CI — enforce provider subscription identity — PR `#181`
- Phase 10CJ — process verified Stripe subscription events internally — PR `#182`
- Phase 10CK — add opt-in Stripe webhook ingress — PR `#183`
- Phase 10CL — synchronize subscription handoff through Phase 10CK — PR `#184`
- Phase 10CM — establish Stripe purchase configuration — PR `#185`
- Phase 10CN — define server-owned Stripe checkout policy — PR `#186`
- Phase 10CO — add server-owned checkout attempt idempotency — PR `#187`
- Phase 10CP — add internal Stripe Checkout Session creation — PR `#189`
- Phase 10CQ — bridge verified checkout completion to pending ownership — PR `#190`
- Phase 10CR — block duplicate subscription checkout — PR `#191`
- Phase 10CS — make Stripe webhook dispatch order-safe — PR `#192`
- Phase 10CT — expose authenticated Stripe checkout entry — PR `#193`
- Phase 10CU — expose truthful Stripe checkout availability — PR `#194`
- Phase 10CV — add server-authoritative Stripe plan catalog — PR `#196`
- Phase 10CW — add shared Stripe checkout client methods — PR `#197`
- Phase 10CX — add guarded web Stripe purchase surface — PR `#198`
- Phase 10CY — synchronize billing handoff through Phase 10CX — PR `#199`
- Phase 10CZ — stabilize mobile profile disclosure test race — PR `#201`
- Phase 10DA — add internal RevenueCat webhook verification — PR `#202`
- Phase 10DB — define RevenueCat Android product mapping — PR `#203`

PR `#91` is obsolete and superseded by Phase 10F PR `#93`; never merge it. Obsolete Phase 9U PR `#79` must also never be merged. Stripe checkout-completion PR `#188` is superseded by Phase 10CQ PR `#190`, and stale Stripe plan-catalog PR `#195` is superseded by Phase 10CV PR `#196`; never revive or merge those superseded branches.

## What the newest slices prove

- Phase 10S verifies real API process replacement against disposable PostgreSQL: readiness, bounded SIGTERM shutdown, restart on the same host/port/database, and readiness again.
- Phase 10T adds the Prisma `0_init` migration baseline, production-style `migrate deploy`, migration-status/schema-drift CI checks and safe rolling-compatible migration guidance.
- Phases 10AQ and 10AR reject successful non-JSON responses and malformed top-level JSON envelopes before feature code can trust them.
- Phase 10AS applies the shared deadline while mobile secure access-token retrieval is stalled.
- Phase 10AT guarantees the local capacity gate crosses the production HTTP 429 boundary even across aligned one-minute rollover.
- Phases 10AU and 10AV add localized Travel Companion reference recovery and actively cancel abandoned country, phrasebook and emergency-reference requests.
- Phase 10U exposes bounded, authenticated, owner-scoped active-session visibility plus idempotent targeted revocation and revoke-all behavior with minimized metadata.
- Phase 10V adds explicit operator-configured request budgets for credentialed external providers and consumes budget immediately before each real upstream attempt, including retries, without guessing vendor limits.
- Phase 10W provides the traveller-facing web session-security experience on top of Phase 10U with privacy minimization, authoritative destructive actions, accessibility and browser evidence.
- Phases 10X and 10Z bound the planner-list PostgreSQL hot path and relation queries with deterministic evidence.
- Phases 10Y and 10AC through 10AG make supported replica assumptions explicit for rate limits, provider budgets, cache, circuit state and metrics aggregation without adding hot-path shared writes.
- Phases 10AA and 10AB harden accommodation-gallery behavior and keyboard focus.
- Phases 10AH through 10AJ provide immediate budget-navigation feedback, a lightweight global loading skeleton and localized safe route recovery.
- Phases 10AK through 10AM compose client deadlines with caller cancellation, stop abandoned searches and keep abort classification deterministic.
- Phase 10AN cancels abandoned or superseded destination weather and image requests while keeping provider states independent.
- Phase 10AO bounds shared-client JSON response reads for declared and streamed payloads before parsing.
- Phase 10AP contains mobile route render failures with a privacy-safe accessible retry screen and activates the mobile recovery test foundation.
- Phases 10AX through 10BD extend CI stability, bounded database/reference-query behavior, outage recovery evidence, and bounded country/language/emergency reference responses.
- Phases 10BE through 10BJ add secure deletion plus adaptive/mobile UX and network-boundary foundations.
- Phases 10BK and 10BL keep the canonical CI runtime current and reproducible.
- Phases 10BM through 10BT establish secure mobile credentials/session rotation and connect authentication, registration, recovery, verification, identity restoration and Profile behavior.
- Phases 10BU and 10BV provide mobile and public-web account deletion surfaces backed by authoritative server deletion.
- Phases 10BW and 10BX publish the public privacy policy and Terms of Service while keeping future subscriptions explicitly disabled until billing is actually implemented.
- Phases 10BY through 10CK establish the subscription trust chain: authoritative Free/Pro plans and entitlements, centralized server-side premium authorization, truthful read-only web/mobile plan status, a privacy-minimized verified billing-event ledger, replay-safe and concurrency-safe processing, transactional provider-state application, opaque verifier-minted evidence, Stripe signature verification, provider-scoped subscription identity, internal verified Stripe lifecycle processing, and a disabled-by-default public Stripe webhook ingress with dedicated limits.
- Phase 10CL synchronizes that trust-chain handoff. Phases 10CM through 10CX add the guarded web purchase path: server-only Stripe purchase configuration, server-owned checkout policy, durable attempt/idempotency ownership, internal Checkout Session creation, verified completion-to-`PENDING` ownership, duplicate-subscription protection, order-safe webhook dispatch, authenticated checkout ingress, truthful availability, provider-backed display pricing, shared checkout client methods, and the signed-in web purchase UI.
- Phase 10CX still does not trust checkout/browser success as entitlement. Only verified current `ACTIVE`/`TRIALING` lifecycle state grants Pro. Refunds, billing-portal/customer self-service, provider-side cancellation management, Android Google Play Billing/RevenueCat, future Apple In-App Purchase and advertising remain separate work.
- Phase 10CY synchronizes the billing handoff through Phase 10CX.
- Phase 10CZ stabilizes the mobile profile disclosure test race without weakening assertions, adding sleeps or increasing timeouts.
- Phase 10DA adds internal RevenueCat exact-raw-byte webhook verification with timestamped HMAC-SHA256, replay tolerance and privacy-minimized provider-neutral evidence.
- Phase 10DB adds server-owned RevenueCat/Google Play product configuration and exact fail-closed mapping to internal Pro plans. It does not resolve ownership or mutate subscriptions.

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
- a production-build web test path plus measured and enforced public-home mobile resource budgets;
- bounded shared-client JSON response reads;
- mobile nested-route failure containment and active mobile recovery tests.

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

The exact Phase 10DB `develop` SHA `10a7b7160e2726f5e1afa7974e6ff22d62c9d418` is fully verified by independent push CI run `36037329944` with all five canonical jobs green. Before starting another slice, re-fetch live `develop`, verify its exact push CI and inspect open PRs because repository state wins over this handoff.

For web subscriptions, the guarded Stripe purchase path now exists and must not be duplicated. Browser checkout success is still informational only. Candidate future web-billing lifecycle work includes customer self-service/cancellation and refund/revocation semantics, but each must preserve server-authoritative provider verification, ownership, idempotency and entitlement rules.

Android Google Play Billing plus RevenueCat is a separate provider-specific purchase integration and must not reuse the Stripe web purchase endpoint or UI. Start Android billing from server-owned product/configuration and verified store/RevenueCat evidence boundaries, then add ownership, replay/idempotency, refund/revocation and restore semantics before any mobile buy/restore surface can claim a subscription. Future iOS Apple In-App Purchase plus RevenueCat remains separate again.

Issue `#40` remains the broad production-readiness program. Candidate genuine gaps still include dependency timeout/recovery behavior beyond existing provider-isolation tests, database N+1 or hot-path evidence outside the verified planner-list path, deployment-platform edge/load-balancer/WAF requirements once a concrete public target exists, route-specific partial/degraded-mode UX gaps, and external metrics-collector integration only after a concrete multi-replica target exists. Treat these as candidates only; do not add Redis, queues, read replicas, distributed tracing, monitoring vendors, or other shared infrastructure without measured need.

Issue `#36` remains the separate privacy-conscious analytics/admin-monitoring program. Its sequencing still defers implementation until the necessary authoritative product/subscription actions exist and before final release hardening. Any admin analytics surface must remain administrator-only and outside the traveller application.
