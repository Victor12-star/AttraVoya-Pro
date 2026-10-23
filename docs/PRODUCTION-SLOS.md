# Production service-level objectives and error-budget contract

## Status and scope

This document defines AttraVoya Pro's initial production service-level objectives (SLOs) and
error-budget process. These are launch and mature-production targets, not evidence that the
current deployment already achieves them.

Repository tests, load checks and process-local metrics provide evidence about application
behavior in controlled environments. Production SLO claims require measurements from the
deployed service over the stated observation windows.

## Service-level indicators

The initial service-level indicators (SLIs) are intentionally limited to signals the application
already exposes or can derive from production monitoring without collecting request payloads or
other unnecessary personal data.

### Availability

Availability measures whether user-facing API requests that reach AttraVoya Pro receive a
non-server-error response.

- Count HTTP 5xx responses as unavailable outcomes.
- Do not hide maintenance windows from availability merely because maintenance was intentional.
- Do not count health probes as user traffic.
- Track provider-dependent operations separately when an upstream provider is the direct cause
  of degraded or unavailable data.
- Keep the calculation aggregate-only; request URLs with user-controlled values, request bodies,
  tokens and private travel data must not become monitoring labels.

Initial mature-production target:

- at least 99.9% monthly availability for the AttraVoya Pro service.

A 99.9% objective over a 30-day window allows an error budget of 0.1%, equivalent to 43 minutes
and 12 seconds of unavailable service during that window. This is a budget, not planned downtime
to consume.

### Non-provider API latency

Measure server-side latency for API routes whose successful completion does not depend on a live
third-party provider response.

Initial target under the expected production traffic tier:

- p95 latency below 500 ms.

The target must be evaluated under representative load. A fast idle environment is not evidence
that the objective is met at expected concurrency.

Provider-dependent routes are not forced into the same latency objective because upstream
latency is not fully controlled by AttraVoya Pro. They must instead remain bounded by the
configured end-to-end request deadlines, provider timeouts, retry limits, concurrency limits and
circuit-breaker behavior.

### Saturation and bounded growth

Production operation must not exhibit unbounded resource growth.

At minimum, monitoring must cover:

- PostgreSQL pool utilization and waiting requests;
- API request rate and server-error rate;
- p50, p95 and p99 request latency;
- runtime CPU, memory and event-loop utilization;
- provider latency, failure and rate-limit outcomes;
- provider-cache activity;
- declared API replica count and observed metric instance identities.

Queue-depth objectives become mandatory only after a durable application queue is introduced.
The absence of a queue today must not be represented as zero queue backlog.

## Error-budget process

Use a rolling 30-day window for the initial availability error budget.

When the service remains within budget:

- reliability work continues alongside normal product delivery;
- new reliability risks still require review before release;
- capacity and failure-mode tests continue to run in CI and before meaningful traffic increases.

When 50% of the monthly error budget has been consumed:

- review the incidents and dominant failure classes;
- verify that alerts, runbooks and dashboards identify the actual user impact;
- prioritize fixes for recurring causes before increasing traffic or provider fan-out.

When 100% of the monthly error budget has been consumed:

- pause non-essential production-risk changes until the dominant reliability problems are
  addressed;
- require a written incident/reliability review before widening rollout;
- restore sufficient reliability evidence before claiming the SLO is being met again.

An error budget must never be used to justify known data-loss, security, privacy, billing or
account-access defects. Those remain release blockers regardless of availability percentage.

## Production measurement requirements

Before AttraVoya Pro may claim that an SLO is met:

1. Select and configure the production monitoring backend.
2. Aggregate every active API replica when more than one replica serves traffic.
3. Verify that monitoring labels remain bounded and contain no secrets or unnecessary personal
   data.
4. Measure availability and latency over the documented observation window.
5. Confirm alert thresholds are actionable and map to an owner or runbook.
6. Retain enough aggregate history to calculate the current error budget and compare it with
   prior periods.
7. Validate expected-load behavior with the repository load/capacity harness and a production-like
   environment before materially increasing traffic.

Synthetic checks and CI tests may supplement production measurements, but they do not replace
real service telemetry.

## Vendor-neutral evaluator

The repository includes `scripts/slo-evaluator.js` as a small aggregate-only evaluation layer for
monitoring exports. It accepts no request payloads, user identifiers, tokens, URLs, trip data or
other personal data. Its input contract is deliberately limited to:

- observation-window duration;
- total user-facing request count;
- HTTP 5xx count;
- aggregate non-provider latency sample count and p95 latency.

Run it with a JSON export from the chosen monitoring backend:

```bash
pnpm slo:evaluate ./aggregate-slo-window.json
```

The evaluator reports availability status, request-based error-budget consumption and the
non-provider p95 target status. A window shorter than 30 days may still show whether its local
aggregate values meet the numerical thresholds, but the evaluator marks it as ineligible for a
production-SLO claim. This prevents a short healthy sample from being misrepresented as proof of
the documented rolling 30-day objective.

The evaluator is intentionally vendor-neutral. Selecting, deploying and operating the production
monitoring backend remains an operations step and must still aggregate every serving replica.

## Alerting principles

Alerts should identify conditions that require an operator action rather than every transient
event.

Initial alert categories should include:

- sustained server-error rate or availability-budget burn;
- sustained p95 latency above the applicable target;
- database-pool saturation or persistent waiting requests;
- missing expected metric instance identities in multi-replica production;
- sustained provider failure/rate-limit states for enabled providers;
- runtime saturation that threatens request deadlines;
- health/readiness failures that remove serving capacity.

Alerts, dashboards and notification text must not include credentials, raw request payloads,
private trip/budget details, child-sensitive data or other unnecessary personal information.

## Relationship to repository tests

The repository already provides evidence for individual reliability mechanisms, including:

- bounded load, spike and soak checks;
- database-pool exhaustion behavior;
- database backup/restore and outage-recovery checks;
- graceful process restart behavior;
- provider deadlines, retry jitter, concurrency limits, circuit breaking and request budgets;
- health/readiness behavior and controlled maintenance mode;
- aggregate service metrics and privacy-conscious logging.

These checks prove mechanisms, not production SLO attainment. Production SLO status becomes a
claim only after deployed monitoring demonstrates the targets over the required window.

## Release rule

Do not describe AttraVoya Pro as meeting its production SLOs solely because CI is green.

Production SLO readiness requires both:

1. a verified repository commit with the relevant reliability safeguards passing; and
2. deployed, privacy-safe monitoring evidence showing the stated objectives over the applicable
   observation window.
