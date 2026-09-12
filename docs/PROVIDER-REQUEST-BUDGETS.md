# Provider request budgets

AttraVoya Pro protects credentialed external-provider allowances with explicit, deployment-controlled request budgets.

## Why this exists

Timeouts, retries, circuit breakers, queue bounds, and upstream `429 Retry-After` handling protect reliability, but they do not cap how many paid or quota-bearing requests a faulty loop or abusive traffic pattern can consume. Request budgets add that cost-control boundary.

The application does **not** hardcode vendor quota values. Provider plans and allowances change, so deployment operators must set limits from the actual account or commercial tier in use.

## Configured providers

The current credentialed providers covered by the shared HTTP transport are:

- Geoapify — shared by maps, places, and accommodation integrations
- Ticketmaster
- NewsData
- Pexels
- Resend

For each provider, configure both:

- `<PROVIDER>_REQUEST_BUDGET_MAX`
- `<PROVIDER>_REQUEST_BUDGET_WINDOW_SECONDS`

For example, a deployment using Geoapify sets `GEOAPIFY_REQUEST_BUDGET_MAX` and `GEOAPIFY_REQUEST_BUDGET_WINDOW_SECONDS` to values derived from that deployment's real Geoapify plan. This document intentionally does not provide sample quota numbers that could become stale or be mistaken for vendor guarantees.

Production startup fails closed when one of the credentialed providers above is enabled with a credential but its request budget is missing. Supplying only one half of a budget pair is invalid in every environment.

## Runtime behavior

A budget is consumed immediately before every real upstream HTTP attempt. This means:

- successful upstream requests consume allowance;
- failed upstream requests consume allowance because the request still reached the provider;
- retries consume additional allowance;
- a request rejected by the local budget does **not** call the upstream provider;
- all clients using the same normalized provider name share one process-local counter;
- different providers have independent allowances;
- all replicas use the same wall-clock-aligned budget-window boundaries;
- once the current configured window boundary is crossed, allowance is restored.

Budget exhaustion uses the existing safe `PROVIDER_RATE_LIMITED` application error and provider `rate_limited` aggregate metric. No credentials, payloads, destination details, email addresses, or other personal data are added to budget errors or metrics.

## Deployment and scaling

Configured request-budget maxima are **deployment-wide values**, not per-process allowances. At startup the validated `API_REPLICA_COUNT` is passed into provider-budget configuration. Each active replica receives:

`floor(configured deployment max / declared replica count)`

The division is intentionally conservative. Any remainder is left unused because spending it without either stable replica identity or shared coordination could allow multiple replicas to claim the same remainder. Combined with wall-clock-aligned windows, this guarantees that the declared replicas cannot collectively spend more than the configured deployment-wide budget in one application budget window.

If a configured provider maximum is smaller than `API_REPLICA_COUNT`, startup/configuration fails instead of silently granting a zero allowance or multiplying the quota. Operators must then reduce the declared replica count, configure a legitimate larger provider allowance, or introduce a reviewed shared quota coordinator if measured production requirements justify one.

`API_REPLICA_COUNT` must always match the real simultaneously active topology. Running more replicas than declared invalidates the partitioning guarantee. Temporary rollout overlap must therefore be included in provider-budget capacity planning when the platform can serve both old and new processes concurrently.

This contract removes provider request budgets as a blocker to future multi-replica operation, but it does **not** make the API production-safe for horizontal scaling by itself. The production topology guard remains fail-closed while rate-limit counters, provider circuit state, provider cache coordination, and aggregate metrics still lack a reviewed multi-replica contract.

Do not add Redis, a distributed quota service, or another coordination dependency solely in anticipation of future scale. Introduce shared coordination only when the conservative partitioning contract is insufficient for measured requirements.

## Release verification

Changes to provider budget behavior must verify at least:

- no configured policy preserves existing provider transport behavior;
- separate clients for the same provider share allowance;
- different providers remain independent;
- retries count as real attempts;
- exhaustion blocks before `fetch`;
- wall-clock-aligned window rollover restores allowance consistently across replicas;
- deployment-wide allowance is partitioned conservatively by the declared replica count;
- impossible `maxRequests < replicaCount` configurations fail closed;
- production environment validation rejects enabled credentialed providers without budgets;
- the five canonical CI jobs pass on the exact PR head and again on the exact merged `develop` SHA.
