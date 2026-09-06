# AttraVoya Pro — Scalability, Reliability and User Experience Requirements

Status: mandatory production-readiness requirement

Tracking issue: GitHub Issue #40 — Production scalability, reliability, performance and user-experience readiness

## Purpose

AttraVoya Pro must be able to grow from early usage to large concurrent usage without exhausting infrastructure, losing or duplicating user data, leaking private information, overwhelming external travel providers, or degrading into a confusing experience.

Scalability is not defined as “the server can start” or “CI is green.” It must be demonstrated with measured capacity, bounded resource behavior, multi-instance-safe infrastructure where needed, recovery procedures, observability and reliable user-facing degradation.

## Existing foundations that must be preserved

The repository already contains several useful foundations:

- Global API rate limiting.
- External-provider hard timeouts and bounded retries for safe idempotent requests.
- A bounded in-process TTL provider cache abstraction.
- Health checks.
- Structured logs with privacy-conscious redaction.
- Request IDs.
- Graceful process shutdown handling.
- Server-only provider secrets.
- Owner-scoped private planner data and `private, no-store` planner responses.
- Phase 8L bounded concurrent pricing-evidence collection with independent fail-closed handling.

These foundations are helpful but are not yet proof of production-scale readiness.

## Required production architecture

### Stateless horizontal API scaling

- API instances should remain stateless except for intentionally local, disposable caches.
- Shared state needed across replicas must use appropriate shared infrastructure rather than process memory.
- Production must support multiple API replicas behind a load balancer when measured traffic requires it.
- Add orchestration-ready liveness and readiness semantics.
- Preserve graceful shutdown and drain in-flight work during deployment/scale-down.
- Support low/zero-downtime deployment and rollback.

### PostgreSQL capacity and correctness

- Define a connection budget per API/worker replica.
- Use a production pooler such as PgBouncer or a managed platform pooler before horizontal autoscaling can exhaust PostgreSQL.
- Use bounded pagination/cursors on growing collections.
- Review indexes against actual query patterns and slow-query plans.
- Prevent N+1 queries on hot paths.
- Use transactions for multi-write consistency.
- Use optimistic locking/versioning or another explicit conflict strategy when concurrent edits could overwrite each other.
- Keep rolling-deployment migrations backward-compatible.
- No destructive migration without backup/recovery and rollback planning.
- Define and test backups, restore, point-in-time recovery, RPO and RTO before production readiness.
- Introduce read replicas only when measurements justify them.

### Distributed caching

- The current in-process cache is suitable only for local/single-instance acceleration.
- Introduce a shared cache such as Redis when multi-instance deployment or request volume requires it.
- Define TTL, freshness, invalidation and stale-data rules per data class.
- Prevent cache stampedes with request coalescing/single-flight or equivalent controls.
- Do not place secrets, tokens, unnecessary PII, detailed private trip/budget content or child-sensitive data into broadly shared caches.
- Keep private planner responses `private, no-store` unless a later privacy review explicitly changes this.
- Cache provider data only where provider terms and provenance/freshness rules allow it.

### Durable background jobs

When asynchronous workload warrants it, use a durable queue for work such as:

- Email delivery.
- Notifications.
- Analytics aggregation.
- Provider refreshes.
- Long imports/exports.
- Other non-request-critical work.

Every job must be idempotent, retry-safe and observable. Use bounded exponential backoff with jitter, dead-letter handling and duplicate protection. Do not move user-critical state transitions into a queue without a clear consistency and recovery contract.

### External-provider resilience

- Preserve hard timeouts and safe-method retry limits.
- Add retry jitter before high-volume production use so replicas do not retry in lockstep.
- Add per-provider concurrency limits/bulkheads where needed.
- Add circuit-breaker or equivalent temporary suppression for repeatedly failing providers when measurements justify it.
- Track provider latency, failure rate, quota/rate-limit state and freshness.
- Respect HTTP 429 and `Retry-After` without creating retry storms.
- Gracefully degrade to explicit unavailable, partial or stale states.
- Never fabricate travel data, availability, prices or zero-cost categories to make a failing provider look successful.

### API backpressure and abuse resistance

- Evolve the global rate limit into route/risk-aware limits for authentication, search, planner/provider fan-out and write-heavy routes.
- Use account/user/IP/device-aware controls only where justified and privacy-compatible.
- Bound request bodies, list sizes, provider fan-out and expensive calculations.
- Reject malformed/oversized inputs early.
- Use CDN/WAF/DDoS protections at the edge for public production traffic.
- Expensive routes must fail fast under overload rather than causing total service collapse.

### Idempotency and concurrency safety

- Add idempotency contracts to retry-prone writes where duplicate submission could create duplicate records or side effects.
- Test double-clicks, retries after timeout, reconnects and concurrent edits.
- Preserve database uniqueness constraints as final integrity barriers.
- Sensitive operations must not show client-side success before authoritative server confirmation.

## Observability and operational quality

Production must expose privacy-safe operational signals for:

- Request rate.
- p50/p95/p99 latency.
- Error rate.
- CPU/memory/event-loop saturation.
- Database connection-pool use.
- Slow queries.
- Queue depth/age once queues exist.
- Cache hit/miss rate once shared caching exists.
- Provider latency/failure/quota/freshness.
- Authentication failures/abuse signals without storing unnecessary personal data.
- Key planner funnel health.

Add distributed tracing when API/database/provider/queue complexity warrants it, plus error tracking with sensitive-data scrubbing.

Before mature production, define SLOs and error budgets. Initial performance objectives to validate under realistic load are:

- Mature production availability target: at least 99.9%.
- p95 non-provider API latency: under 500 ms at expected load.
- No unbounded request, queue or connection growth.
- Provider-dependent operations remain bounded by explicit timeout/fallback policies.

These targets are acceptance objectives, not claims that the current repository already achieves them.

## User satisfaction and product quality

### Web/mobile performance

- Establish Core Web Vitals and mobile performance budgets.
- Use code splitting/lazy loading for heavy routes and assets.
- Optimize images, fonts and static resources.
- Use CDN caching where safe.
- Avoid unnecessary repeated API/provider calls.
- Deduplicate safe in-flight reads when appropriate.

### Reliable interaction states

Every important user flow should have clear:

- Loading/skeleton state.
- Empty state.
- Partial-data state.
- Timeout state.
- Offline/reconnection state where relevant.
- Retry state.
- Success confirmation.
- Recoverable error state that preserves entered form data.

Prevent accidental duplicate submissions. Disable or show authoritative pending state for buttons during writes. Draft/autosave behavior may be added only with clear privacy and data-integrity semantics.

### Accessibility and internationalization

- Preserve keyboard and screen-reader usability.
- Maintain contrast and visible focus.
- Preserve reduced-motion behavior.
- Support all 18 current UI locales.
- Arabic must remain RTL-correct.
- Error text shown to travellers should be human-readable and actionable, while detailed diagnostics remain private in logs.

### Data honesty

Performance must never be improved by pretending data is available when it is not. Do not show fake progress, fake fares, fake availability, invented ratings, hidden estimates or fabricated provider results.

## Graceful degradation

A failure in one non-critical dependency—weather, maps, events, news, images, translation or one pricing provider—must not unnecessarily take down unrelated application functionality.

Define critical vs non-critical dependencies and serve safe partial experiences when possible. Add maintenance/degraded-mode handling instead of blank screens or crashes. Test restart, provider outage, database pressure, network loss, timeout and recovery behavior.

## Security and privacy at scale

Scalability must preserve:

- Least privilege.
- RBAC and server-side authorization.
- Server-only secrets.
- Owner-scoped private planner data.
- Secret/key rotation using managed secret storage in production.
- Dependency, supply-chain and secret scanning.
- GDPR privacy-by-design/default, data minimization, retention/deletion and data-rights controls.
- Aggregate-first privacy-conscious analytics under the separate analytics/admin requirement.

High traffic is never a justification to collect unnecessary personal information.

## Capacity and cost controls

Define at least three measured traffic tiers:

1. Early usage.
2. Growth usage.
3. High-scale usage.

For each tier, document expected concurrent users, request rate, provider-call rate, database connection requirement and infrastructure cost. Put quotas/budgets around paid provider usage so abuse or a software bug cannot create uncontrolled spend.

Prefer measured horizontal scaling after profiling. Do not add distributed infrastructure simply because it is fashionable; add it when traffic, reliability or multi-instance correctness requires it.

## Mandatory production-readiness tests

Before AttraVoya Pro is declared production-scalable, run and document:

- Normal peak load tests.
- Stress tests beyond expected peak.
- Long-running soak tests for leaks/resource exhaustion.
- Burst/spike tests.
- Database pool-exhaustion tests.
- Queue backlog/recovery tests once queues exist.
- Cache failover/stampede tests once shared caching exists.
- Provider slow/failure/quota tests.
- Concurrency/idempotency tests.
- Backup/restore and disaster-recovery exercises.
- Browser/mobile end-to-end tests.
- Slow-network and reconnect tests.
- Accessibility tests.
- Security/abuse tests.
- Privacy-leakage tests.

## Delivery rule

Implement these requirements incrementally in dedicated, reviewable slices. Every slice still follows the repository gate:

1. Start from the latest verified `develop` commit.
2. Use a dedicated feature branch.
3. Open a PR into `develop`.
4. Exact final PR head must pass all five canonical CI jobs.
5. Squash merge with expected-head protection.
6. Exact resulting `develop` SHA must pass all five canonical CI jobs before the next slice begins.

No test, formatter, security, privacy or provider-honesty control may be weakened to achieve green status.
