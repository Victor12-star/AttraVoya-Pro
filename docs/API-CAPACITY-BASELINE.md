# AttraVoya Pro API capacity baseline

This document defines the automated API capacity/backpressure baseline and the capacity-planning evidence contract for Issue #40.

## What the current CI gate proves

Canonical CI starts the real AttraVoya API against the disposable PostgreSQL service and exercises the public, database-backed `/api/v1/countries` route. This route is intentionally chosen because it uses PostgreSQL and the normal Fastify request pipeline without depending on a paid or rate-limited external travel provider.

The check runs two bounded traffic scenarios against the same API process:

1. **Steady early-load baseline**
   - 50 total GET requests
   - concurrency 10
   - 2 second per-request timeout
   - zero failed responses allowed
   - p95 latency must be at most 500 ms

2. **Immediate burst/backpressure check**
   - 100 additional GET requests
   - concurrency 40
   - 2 second per-request timeout
   - at least one successful response must complete
   - the existing global API limiter must be exercised and return HTTP 429 for excess traffic
   - no transport errors are allowed
   - no HTTP 5xx responses are allowed
   - no unexpected non-2xx/3xx response other than HTTP 429 is allowed
   - the API process must still be alive after the burst

The capacity checker refuses non-loopback targets, so canonical CI cannot accidentally direct this traffic at a public or production service.

## Current measured early evidence

Phase 10M records a repeatable early-capacity snapshot from the fully verified `develop` commit `0b2a258c0e080377c0e7e596f8477a07f3c6f27d`, push-triggered CI run `34501688863`. The measurement used the GitHub-hosted Ubuntu CI environment, one AttraVoya API process, one disposable PostgreSQL 17 instance, the repository-default database pool maximum of 5 connections, and the existing `/api/v1/countries` synthetic GET workload.

The measured steady run completed 50 of 50 requests with HTTP 200, zero transport errors, 65.49 requests per second, p50 latency 115.52 ms, p95 latency 280.2 ms, p99 latency 300.03 ms, and maximum latency 300.03 ms.

The immediately following burst completed 70 requests with HTTP 200 and shed 30 requests with the expected HTTP 429 response. It produced zero transport errors and zero HTTP 5xx responses. Aggregate throughput was 137.54 requests per second, with p50 latency 286.64 ms, p95 latency 409.01 ms, p99 latency 424.32 ms, and maximum latency 426.43 ms.

After the burst, liveness and readiness each returned HTTP 200 from the same process. The capacity evaluation reported no failures.

This is evidence for one synthetic, non-provider, database-backed read path in one CI environment. It is not evidence that 10 concurrent requests equal 10 concurrent users, that 65.49 requests per second is a production traffic limit, or that the application can safely serve the same rate across every route. Human-user concurrency depends on request mix, think time, session behavior, cache behavior and provider fan-out, none of which can be inferred from this route alone.

## Overload-safe orchestration probes

Liveness and readiness need to remain observable when ordinary traffic is being shed. If the global application rate limit also hides these probes, an orchestrator can misclassify an overloaded but healthy process and restart it unnecessarily.

Phase 10B therefore gives `/api/v1/health/live` and `/api/v1/health/ready` a dedicated rate-limit ceiling of 300 requests per minute. This does **not** disable abuse protection. It provides a separate bounded budget above the ordinary 120 requests-per-minute application limit.

Immediately after the capacity burst has crossed the ordinary HTTP 429 boundary, the same canonical CI check requires:

- liveness to return HTTP 200 from the same API process;
- readiness to return HTTP 200 while PostgreSQL is healthy;
- neither probe to fail because ordinary API traffic exhausted the global budget.

Readiness still keeps its existing semantics: it may legitimately return HTTP 503 when PostgreSQL is unavailable or when graceful draining has begun. The dedicated probe budget changes overload visibility only; it does not weaken readiness correctness.

## Capacity tiers and promotion evidence

Issue #40 requires early, growth and high-scale traffic tiers. A tier is considered measured only after its workload, environment, duration and observed results have been recorded from an authorized test. Do not fill missing tier values with forecasts and then describe them as measurements.

### Early usage

The current CI baseline provides a reproducible first measurement for a single-process database-backed read path. It verifies bounded request handling, p95 latency below the initial 500 ms non-provider objective under the current steady workload, HTTP 429 backpressure during the burst, healthy orchestration probes after overload, and a bounded per-process PostgreSQL connection pool.

Before calling the complete early-production workload validated, a dedicated environment must also measure a representative route mix and record the relationship between simulated users, request rate, database pressure and provider calls. The current CI workload does not supply a defensible concurrent-user number or infrastructure-cost figure, so those values remain unmeasured rather than invented.

### Growth usage

Growth capacity must be measured in an authorized staging-like environment whose application, database, region, networking and relevant external-dependency configuration are close enough to the intended production architecture to make the results useful. Before promotion to this tier, record:

- the expected and tested concurrent-user model, including think time and route mix;
- target and achieved requests per second for each representative route family;
- p50, p95 and p99 latency, response-status counts, transport errors and HTTP 429 shedding;
- API replica count and per-replica saturation signals;
- PostgreSQL pool usage, waiters, connection limits and query pressure;
- provider call rate, provider latency, rate-limit/quota state and cache hit behavior for provider-backed flows;
- selected infrastructure size, region and a current cost estimate from the actual deployment provider;
- behavior during a sudden traffic spike and recovery after the spike ends.

No Redis, shared rate-limit store, durable queue, read replica or other distributed component should be added solely to make this tier look more production-like. Add shared infrastructure only when measurement or multi-replica correctness demonstrates a concrete need.

### High-scale usage

High-scale capacity must be established from measured demand or a defensible launch requirement, not an arbitrary large number. The test must exercise the intended multi-replica topology and the real production-class database/pooler architecture before a high-scale claim is made.

In addition to the growth-tier evidence, record load-balancer behavior, cross-replica backpressure, aggregate database connection demand, rollout capacity overlap, provider amplification, shared-state requirements, failover/recovery behavior and the cost of the tested topology. A single-process CI run can never satisfy this tier.

## Representative workload model

The `/api/v1/countries` route remains useful because it is safe, deterministic and database-backed, but later capacity evidence must not extrapolate it to unrelated work. A representative test plan should separate at least these workload families when they are available in the tested environment:

- inexpensive public/reference reads;
- authenticated owner-scoped database reads;
- authenticated writes with authoritative server confirmation;
- provider-backed discovery reads;
- planner operations that can fan out across multiple pricing collectors;
- health/readiness traffic, measured separately from user traffic.

Use disposable accounts and synthetic test records for authenticated workloads. Do not load-test production user accounts or expose traveller data merely to obtain capacity numbers. Paid or rate-limited external providers must be tested only within explicitly authorized quotas. When a provider cannot safely be exercised at load, measure the local application boundary with an approved deterministic substitute and keep that result clearly separate from real-provider capacity evidence.

## Peak, stress, spike and soak contracts

A normal peak test sustains the traffic expected for the tier long enough to observe stable latency, error rate, saturation and database behavior. The initial non-provider p95 objective remains under 500 ms at the expected load unless later measured evidence and review deliberately revise the service objective.

A stress test increases traffic beyond the expected peak until a documented protection boundary or failure point is reached. Record the first meaningful saturation signal, first intentional backpressure response, first SLO breach, and any HTTP 5xx or transport failure. Safe overload should prefer bounded HTTP 429 shedding over process collapse or uncontrolled resource growth.

A spike test moves quickly from normal traffic to a substantially higher authorized load, then back down. Verify that liveness remains meaningful, readiness reflects real dependency state, queues or connection waiters do not grow without bound, and normal service recovers after the spike is removed.

A soak test runs a representative stable workload in a dedicated environment for a duration long enough to expose leaks or cumulative exhaustion. Its duration must be chosen for the tested deployment rather than forced into canonical pull-request CI. Record CPU, memory, event-loop utilization, database pool use, error rate and latency over time. Any monotonic resource growth that does not stabilize requires investigation before the tier is accepted.

Canonical CI should stay bounded and fast enough to be a reliable release gate. Long-running stress and soak tests belong in an explicitly authorized environment and should retain compact aggregate evidence rather than raw request payloads.

## PostgreSQL connection-budget rule

Each Node process currently defaults to a maximum PostgreSQL pool size of 5 connections, configurable through `DB_POOL_MAX` within the repository's validated range. Deployment planning must calculate the application connection budget as:

`DB_POOL_MAX × database-using application/worker replicas + reserved operational connections`

Reserved operational connections include the capacity needed for migrations, database administration, health/recovery work and other explicitly approved operational clients. The resulting total must stay below the safe connection budget of the selected PostgreSQL service or production pooler with headroom for recovery and rollout overlap.

Do not derive a safe replica count from the current default of 5 alone. The actual PostgreSQL or pooler limit, query workload and measured pool utilization are required first.

## Provider-call and cost budget evidence

Application request rate and external-provider call rate are different quantities. Cache hits, request coalescing and planner fan-out can make one user request create zero, one or multiple upstream calls. For each provider-backed workload, measure or calculate from verified instrumentation:

- application requests per second;
- actual upstream calls per second and calls per user journey;
- cache hit/miss behavior where applicable;
- provider HTTP 429 and `Retry-After` events;
- contractual quota or rate limit known at test time;
- current unit/request cost where a paid provider is used;
- estimated hourly/monthly spend for the measured workload.

Keep provider billing account identifiers, credentials and private invoices out of repository evidence. Cost figures become stale and must be dated and refreshed when deployment/provider pricing changes.

## Required evidence bundle

Each dedicated capacity result should record enough context to be reproducible without collecting private user data. At minimum retain:

- exact application commit and release identifier;
- test date and authorized environment class;
- API replica count and relevant instance/container size;
- PostgreSQL version, pool maximum and pooler mode when applicable;
- synthetic-user model, route family/workload mix and test duration;
- target and achieved request rate/concurrency;
- p50, p95 and p99 latency plus error/status counts;
- HTTP 429/backpressure behavior and recovery;
- CPU, memory and event-loop saturation evidence;
- database pool active/idle/waiting evidence;
- provider calls, failures, quota state and cache behavior when applicable;
- selected infrastructure cost estimate and pricing date for non-CI tiers;
- identified bottleneck, corrective action and retest result when a tier fails.

Capacity logs and artifacts must not contain raw query strings, request bodies, authorization tokens, session cookies, email addresses, precise location history, trip/budget content, child-sensitive data, passport information, provider credentials or raw provider payloads.

## Promotion rule

A capacity tier passes only when its representative workload meets its approved latency/error/backpressure objectives, resource use stays bounded, dependencies remain within their safe budgets, and the evidence bundle is complete. A tier with missing measurements is **unverified**, not passed.

Thresholds must not be silently relaxed to make a test green. If a limit must change because the product workload or architecture changed, record the new measurement, reason and review alongside the change.

## What the current gate does not prove

The current automated gate remains an **early single-process CI baseline**, not a declaration that AttraVoya Pro is production-scalable. It does not establish the final failure point, multi-replica capacity, managed PostgreSQL capacity, CDN/WAF behavior, production network latency, provider-dependent latency, infrastructure cost or real-user concurrency.

Before production maturity is claimed, Issue #40 still requires dedicated-environment peak, stress, soak, spike and recovery testing; measured database/provider capacity; production observability; and evidence that the selected deployment platform can scale and roll back safely.

## Commands

- `pnpm load:test` — generic bounded HTTP load harness. Remote targets remain disabled unless explicitly authorized through the harness safety flag.
- `pnpm capacity:check` — fixed local CI capacity/backpressure and post-overload health-probe contract described above. This command never permits a remote target.
- `pnpm load:harness:test` — deterministic tests for both the generic load harness and the capacity-check evaluation rules.
