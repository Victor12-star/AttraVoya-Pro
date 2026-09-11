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
- all clients using the same normalized provider name share one in-process allowance;
- different providers have independent allowances;
- once the configured window rolls over, allowance is restored.

Budget exhaustion uses the existing safe `PROVIDER_RATE_LIMITED` application error and provider `rate_limited` aggregate metric. No credentials, payloads, destination details, email addresses, or other personal data are added to budget errors or metrics.

## Deployment and scaling

The current budget counter is intentionally in process because the application currently runs as a single API instance and Issue #40 requires measured evidence before adding distributed infrastructure.

If the API is later deployed with multiple replicas, the configured allowance is **per process**. Before adding replicas, either:

1. divide the desired total provider allowance safely across replica configurations, or
2. demonstrate through measured production requirements that a shared cross-replica quota coordinator is necessary, then introduce the smallest suitable shared mechanism.

Do not add Redis, a distributed rate-limit service, or another coordination dependency solely in anticipation of future scale.

## Release verification

Changes to provider budget behavior must verify at least:

- no configured policy preserves existing provider transport behavior;
- separate clients for the same provider share allowance;
- different providers remain independent;
- retries count as real attempts;
- exhaustion blocks before `fetch`;
- window rollover restores allowance;
- production environment validation rejects enabled credentialed providers without budgets;
- the five canonical CI jobs pass on the exact PR head and again on the exact merged `develop` SHA.
