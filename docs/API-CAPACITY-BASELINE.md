# AttraVoya Pro API capacity baseline

This document defines the automated API capacity/backpressure baseline for Issue #40.

## What this gate proves

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

## Overload-safe orchestration probes

Liveness and readiness need to remain observable when ordinary traffic is being shed. If the global application rate limit also hides these probes, an orchestrator can misclassify an overloaded but healthy process and restart it unnecessarily.

Phase 10B therefore gives `/api/v1/health/live` and `/api/v1/health/ready` a dedicated rate-limit ceiling of 300 requests per minute. This does **not** disable abuse protection. It provides a separate bounded budget above the ordinary 120 requests-per-minute application limit.

Immediately after the capacity burst has crossed the ordinary HTTP 429 boundary, the same canonical CI check now requires:

- liveness to return HTTP 200 from the same API process;
- readiness to return HTTP 200 while PostgreSQL is healthy;
- neither probe to fail because ordinary API traffic exhausted the global budget.

Readiness still keeps its existing semantics: it may legitimately return HTTP 503 when PostgreSQL is unavailable or when graceful draining has begun. The dedicated probe budget changes overload visibility only; it does not weaken readiness correctness.

## What this gate does not prove

This is an **early single-process CI baseline**, not a declaration that AttraVoya Pro is production-scalable. It does not establish the final failure point, multi-replica capacity, managed PostgreSQL capacity, CDN/WAF behavior, production network latency, provider-dependent latency, or real-user concurrency.

Before production maturity is claimed, Issue #40 still requires dedicated-environment peak, stress, soak, spike and recovery testing; measured database/provider capacity; production observability; and evidence that the selected deployment platform can scale and roll back safely.

## Commands

- `pnpm load:test` — generic bounded HTTP load harness. Remote targets remain disabled unless explicitly authorized through the harness safety flag.
- `pnpm capacity:check` — fixed local CI capacity/backpressure and post-overload health-probe contract described above. This command never permits a remote target.
- `pnpm load:harness:test` — deterministic tests for both the generic load harness and the capacity-check evaluation rules.
