# Service SLO and error-budget policy

Status: production-maturity contract

Tracking issue: GitHub Issue #40 — Production scalability, reliability, performance and user-experience readiness

## Purpose

This document defines how AttraVoya Pro will measure service reliability, interpret the initial production Service Level Objectives (SLOs), and use error budgets to decide when reliability work must take priority over ordinary feature delivery.

An SLO is a target for the reliability experienced by users. A Service Level Indicator (SLI) is the measured signal used to evaluate that target. An error budget is the amount of allowed failure implied by the SLO during a measurement window.

These targets are operational objectives, not claims that the current repository already achieves mature production reliability.

## Current measurement boundary

The API already exposes bounded process-local request, provider, provider-cache, database-pool, CPU, memory and event-loop metrics through the protected administrator service-metrics endpoint.

Those snapshots are intentionally process-local and mostly cumulative for the lifetime of one process. They are useful diagnostics, but a single process snapshot cannot prove cluster-wide availability or a rolling production SLO.

Production SLO evaluation therefore requires an external or deployment-level measurement source that can aggregate the same privacy-safe signals across all serving replicas and preserve the required rolling window. External availability measurement must also detect failures where no API response is produced, because in-process HTTP metrics cannot observe a process or network path that never answered.

Until that production measurement path exists, AttraVoya must report the mature SLOs as **not yet production-verified** rather than inferring success from CI, one process, or one successful deployment.

## Measurement window

Use a rolling 30-day window for mature production SLO and error-budget evaluation.

The window rolls continuously. Error budgets are not manually reset after an incident or deployment. A shorter diagnostic window may be used to detect rapid regressions, but it does not replace the 30-day SLO decision window.

## Core API availability SLI

The mature production availability objective is at least **99.9%** for eligible core API traffic.

The production availability SLI should be calculated as:

`good eligible requests / total eligible requests`

A good eligible request is one where the AttraVoya service is reachable and returns the expected application response without an AttraVoya server failure.

The following must be treated as bad availability outcomes when they affect eligible traffic:

- HTTP 5xx responses caused by AttraVoya;
- load-balancer or gateway failures attributable to the AttraVoya service;
- connection failures where no serving API instance successfully answers;
- AttraVoya timeouts that prevent an eligible core operation from completing;
- deployment or infrastructure failures that make otherwise valid core API traffic unavailable.

Expected client-side rejections such as invalid input, failed authentication or authorization, and deliberate abuse-policy rejection are not service-availability successes and should not be used to make the SLO look better. They should be classified separately from server availability failures.

HTTP 429 needs particular care. A policy rate limit protecting the service from abusive or excessive traffic is not the same as a server crash, while overload shedding can reveal insufficient capacity for legitimate traffic. Production monitoring must keep enough bounded operational classification to distinguish these cases before deciding how a 429 contributes to availability reporting. Do not simply classify every 429 as either success or failure without that context.

Health-probe traffic is operational evidence and must not be used to inflate the user-facing availability SLI denominator.

## Non-provider API latency SLI

The initial mature production latency objective from Issue #40 is:

**p95 non-provider API latency under 500 ms at expected production load.**

The measurement set must include eligible non-provider API requests across all serving replicas. Provider-backed operations are excluded from this specific latency objective because their completion time is also bounded by external-provider behavior, explicit provider timeouts, retry policy, queue wait and the total provider request deadline.

This exclusion must not be used to hide slow internal work. A route is provider-dependent only when the operation actually depends on an external provider in its normal contract.

The current HTTP metrics expose privacy-safe normalized route labels and latency buckets. Production aggregation may use those bounded labels, but it must not introduce raw URLs, query strings, user identifiers or unbounded per-request dimensions.

The current CI capacity check is useful release evidence for an early single-process baseline, but it does not prove the 30-day production latency SLO.

## Provider-dependent operations

External-provider reliability must be measured separately from the non-provider API latency SLO.

At minimum, production operations should evaluate provider latency, failures, rate-limit state, retry/cooldown behavior, freshness and bounded completion. Existing timeouts, retry jitter, concurrency bulkheads, queue-wait limits, circuit breaking and total request deadlines remain reliability controls rather than reasons to report an unavailable provider result as success.

A provider failure may result in an explicitly unavailable, partial or stale user experience where that product contract allows it. It must never be converted into invented availability, a fabricated price, a false zero-cost category or fake provider success to protect an SLO.

No provider-specific numeric availability SLO is established by this document. Such targets should be added only after real provider baselines and contractual dependencies are known.

## Saturation and bounded-growth guardrails

CPU, memory, event-loop utilization and database-pool usage are diagnostic saturation signals. They help explain SLO degradation but are not themselves user-facing availability SLOs.

Production maturity still requires the Issue #40 guardrail that requests, queues and database connections do not grow without bound. Queue depth/age becomes mandatory only when a durable queue is actually introduced. Shared-cache health becomes mandatory only when shared caching is actually justified and deployed.

Do not add Redis, queues, tracing platforms or other distributed infrastructure only to satisfy this document. Add them when measured scale or multi-instance correctness requires them.

## Availability error budget

A 99.9% availability SLO allows a maximum bad-event fraction of **0.1%** during the rolling 30-day window.

For a request-based production SLI:

`availability error budget = total eligible requests × 0.001`

`availability budget remaining = allowed bad requests - observed bad requests`

Do not convert the request-based budget into a downtime duration unless the production availability SLI is explicitly time-based and measured by an appropriate external source. The repository must not mix request-based and time-based calculations in one reported percentage.

## Latency error budget

The p95 latency objective means at least 95% of eligible non-provider requests in the evaluated population should complete within 500 ms.

For threshold-based operational reporting, the slow-request allowance is therefore 5% of eligible measured requests. The production system may also report the percentile directly, but it must use a consistent population and rolling window so releases cannot improve the number merely by changing which routes are counted.

## Error-budget release policy

Error-budget state must influence release decisions rather than existing only as a dashboard number.

Use the following policy for the rolling 30-day availability and latency objectives:

1. When burn is within budget and there is no significant reliability regression, normal feature delivery may continue through the existing exact-commit CI release gate.
2. When more than half of an error budget is consumed before half of the 30-day window has elapsed, pause high-risk non-essential changes and investigate the dominant failure source before continuing ordinary release velocity.
3. When an error budget is exhausted, reliability and recovery work takes priority. Non-essential feature releases should remain paused until the rolling window and observed service behavior return to a safe state.
4. Security, privacy, data-integrity and urgent incident fixes are not blocked merely because an error budget is exhausted, but they still require the safest available validation and release process.
5. A deployment that causes a material new latency, error, readiness, saturation or database-pool regression should be stopped or rolled back according to the deployment reliability runbook even if the 30-day budget has not yet been exhausted.

Do not retroactively reclassify an incident solely to protect the budget. Any exclusion rule must be defined before it is used and must be applied consistently.

## Fast regression signals

The 30-day error budget is the product/release decision window, but operations must also inspect shorter windows so a severe new release does not consume the budget before anyone reacts.

Useful short-window signals include:

- sudden HTTP 5xx increase;
- non-provider p95/p99 latency regression;
- readiness instability;
- database-pool saturation or exhaustion;
- sustained CPU, memory or event-loop saturation;
- provider failure or rate-limit spikes;
- repeated overload shedding for traffic believed to be legitimate;
- shutdown-timeout or crash loops after deployment.

Thresholds for paging or automated rollback must be tuned from measured production baselines. This document does not invent universal alert thresholds before that evidence exists.

## Release and incident evidence

For a production release or reliability incident, retain privacy-safe operational evidence sufficient to answer:

- exact application commit and deployment revision;
- deployment start/end time;
- SLO/SLI state before and after the change;
- aggregate request/error/latency and saturation changes;
- database-pool and provider-health changes where relevant;
- whether rollback occurred and to which independently verified commit;
- the dominant technical cause and follow-up action.

Do not put credentials, tokens, raw request bodies, raw URLs/query strings, user IDs, email addresses, traveller details, trip/budget content, passport data, child-sensitive information or raw provider payloads into SLO labels, alerts, dashboards or incident records.

## Relationship to analytics

SLO and operational reliability telemetry is not traveller analytics.

Any future dashboard exposing these operational signals must remain an authenticated administrator surface with server-side authorization. It must not be inserted into the normal AttraVoya traveller application or used as a reason to collect unnecessary personal data. The separate Issue #36 analytics/admin requirement remains separately sequenced.

## Production-maturity acceptance

AttraVoya Pro must not be described as meeting these SLOs until all of the following are true:

- production or production-like traffic is measured across every serving replica rather than one process only;
- no-response/network-path failures are observable by an external or deployment-level source;
- availability and latency calculations use documented stable populations and a rolling 30-day window;
- the mature targets have been validated under realistic expected load;
- normal peak, stress, soak and burst testing has established bounded behavior;
- database capacity and provider failure behavior have been exercised;
- the error-budget release process has an owner and is used during real release decisions;
- operational telemetry preserves the repository privacy boundaries.

CI success remains mandatory release evidence, but CI success alone is not SLO evidence.

## Review triggers

Review this policy whenever any of the following changes:

- the mature availability or latency target;
- the SLO measurement window;
- the production topology or load-balancer path;
- request classification or normalized route labels;
- provider dependency boundaries;
- the protected service-metrics contract;
- the deployment/rollback process;
- a queue, shared cache, tracing or external monitoring system is introduced;
- production incident evidence shows that the current SLI does not represent user-visible reliability accurately.
