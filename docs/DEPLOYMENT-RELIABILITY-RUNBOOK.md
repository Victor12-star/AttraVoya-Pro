# Deployment reliability runbook

This runbook defines the operational contract for deploying and replacing AttraVoya Pro API instances safely. It complements the application-level readiness, admission-control, and bounded graceful-shutdown behavior already implemented in the server.

## Scope

This document covers API process rollout and rollback behavior. It does not claim that a particular hosting provider guarantees zero downtime, and it does not replace provider-specific deployment documentation, database migration procedures, backup/restore procedures, or incident-response policy.

## Required production invariants

Every production API deployment must preserve all of the following:

1. Traffic is sent only to an instance whose readiness endpoint reports ready.
2. When an instance starts draining, it is removed from new traffic before its shutdown window expires.
3. The platform termination grace period is longer than the application's configured `SHUTDOWN_GRACE_MS` value.
4. The application shutdown window remains bounded. The production default is 25,000 ms unless deliberately changed through validated configuration.
5. A replacement instance must become ready before the old healthy capacity is removed when the platform supports rolling replacement.
6. A rollout must stop or roll back when the new version cannot become ready, repeatedly exits, or causes material health/error regression.
7. Deployment automation must not bypass the repository's five canonical CI jobs or treat a successful build alone as release evidence.
8. `API_REPLICA_COUNT` must match the actual number of simultaneously active API replicas. Production currently supports exactly `1` active replica.

## Current replica-topology safety contract

AttraVoya Pro is **not yet claiming production-safe horizontal API scaling**. Several controls are intentionally process-local today, including rate-limit counters, credentialed-provider request budgets, provider circuit state, provider cache coordination, and aggregate process metrics. Running multiple active production replicas without a reviewed shared-state strategy could therefore make those controls inconsistent across replicas even though database-backed user/session state remains shared.

The API startup path enforces this truthfulness boundary through `API_REPLICA_COUNT`:

- missing or blank values resolve to `1` for backward-compatible single-instance operation;
- production accepts exactly `1` active API replica;
- production startup fails closed when `API_REPLICA_COUNT` is greater than `1`;
- non-production environments may declare more than one process for controlled multi-process exercises without turning that into a production-readiness claim;
- invalid values are rejected rather than silently coerced.

Operators must set `API_REPLICA_COUNT` to the real active topology. Do not leave it at `1` while independently scaling the platform above one active production API instance.

This guard is intentionally temporary. Remove or evolve it only after measured traffic/capacity evidence justifies multi-replica operation and every correctness-sensitive process-local control has an explicit decision: move to shared coordination, replace with a multi-replica-safe design, or document why locality is harmless. Do not add Redis, distributed rate limiting, or another coordinator merely to remove the guard before that need exists.

A rolling replacement may still momentarily overlap old and new processes when the platform provides replacement semantics, but that overlap must not be treated as steady-state horizontal scaling. Provider-budget and database-connection implications must still be reviewed before choosing such a rollout strategy.

## Timing contract

`SHUTDOWN_GRACE_MS` controls how long the API allows Fastify and registered close hooks to finish after shutdown begins. The application marks readiness as draining before `app.close()` begins.

The infrastructure termination grace period **must be greater than `SHUTDOWN_GRACE_MS`**. Do not configure both values to the same duration because process start/stop signaling, load-balancer propagation, and platform scheduling consume time outside the application's own drain timer.

For the current default:

- application shutdown grace: 25 seconds;
- infrastructure termination grace: configure a value greater than 25 seconds;
- if `SHUTDOWN_GRACE_MS` is changed, review the infrastructure value in the same deployment change.

Do not infer a universal provider-specific number from this repository. The exact infrastructure value depends on the production platform and must be confirmed against that platform's current termination semantics.

## Readiness and traffic removal

The load balancer or orchestrator should use the API readiness endpoint rather than a generic TCP-open check for admission to production traffic.

During shutdown the expected sequence is:

1. the process receives its termination signal;
2. readiness immediately changes to draining/unready;
3. the platform stops routing new requests to that instance;
4. Fastify close hooks drain in-flight work and database lifecycle cleanup runs;
5. the process exits successfully when cleanup completes inside the configured window;
6. if cleanup exceeds the window or fails, the process exits unsuccessfully so the failure is visible instead of hanging indefinitely.

A liveness or restart policy must not mistake normal readiness draining for an application crash during an intentional rollout.

## Pre-deployment gate

Before deploying a commit to production, verify all of the following against the exact commit being deployed:

- all five canonical GitHub Actions jobs passed on that exact release commit;
- required production environment variables pass the server environment contract;
- `API_REPLICA_COUNT` matches the actual active topology and is `1` for the current production architecture;
- `SHUTDOWN_GRACE_MS` is valid and the infrastructure termination grace remains longer;
- database migrations, when present, have an explicit compatibility/rollback plan and have passed the PostgreSQL/Prisma CI job;
- provider credentials and optional integrations are configured only where intended; missing optional providers must degrade honestly rather than be replaced with fake data;
- no deployment step exposes secrets, request bodies, traveller data, tokens, or provider payloads in logs.

## Rollout verification

After a new version starts, verify before considering the rollout healthy:

- new instances become ready within the platform's expected startup window;
- readiness remains stable rather than repeatedly flapping;
- API error rate and latency do not show a material regression;
- admission-overload behavior remains bounded under pressure;
- database connectivity is healthy and pool saturation is not increasing unexpectedly;
- provider failures remain bounded by the existing timeout/retry/bulkhead/circuit behavior;
- old instances drain and terminate within the expected application/infrastructure windows;
- there are no repeated shutdown-timeout exits.

Use aggregate operational telemetry. Do not add user PII, authentication secrets, raw request bodies, passport information, or raw provider payloads merely to diagnose a rollout.

## Rollback triggers

Stop or roll back a rollout when any of these occur and are attributable to the new release:

- replacement instances cannot reach stable readiness;
- repeated process crashes or shutdown-timeout exits;
- a sustained material increase in server errors or latency;
- database connection exhaustion or unsafe query pressure;
- overload controls no longer shed work predictably;
- a security, privacy, authorization, or data-integrity regression;
- a real provider integration begins returning misleading/fabricated user-facing state because of application handling;
- a migration creates an incompatible state that cannot safely serve the previous application version.

For a rollback involving schema changes, do not blindly redeploy the previous binary. First confirm backward compatibility of the current database schema and follow the migration-specific recovery plan.

## Rollback procedure

For an application-only rollback with a backward-compatible database state:

1. select the last independently verified release commit;
2. confirm its exact release evidence and production configuration compatibility;
3. deploy it using the same readiness and rolling-replacement rules as a forward rollout;
4. keep the failing version out of new traffic once replacement capacity is ready;
5. verify readiness, error rate, latency, database health, and provider degradation behavior after rollback;
6. preserve private structured diagnostics needed for the incident without logging sensitive user/provider payloads.

## Capacity during rolling replacement

Do not plan a rollout that intentionally removes all healthy API capacity before replacement capacity is ready. The required surge/spare capacity depends on the production platform and measured workload, so this repository does not invent a fixed long-term replica count.

For the current architecture, steady-state production remains exactly one active API replica. If the platform briefly overlaps old and new processes during replacement, review that overlap explicitly rather than treating it as proof of production-safe horizontal scaling.

The release owner should confirm that database connection budgets and external-provider concurrency/request-budget controls remain safe while old and new processes overlap during a rolling deployment.

## Failure drills before production launch

The production-readiness program should exercise these scenarios in a staging or disposable environment:

- terminate one API instance while requests are in flight and confirm readiness drops before process exit;
- verify a normal drain completes without a shutdown-timeout failure;
- deliberately hold shutdown past the configured application grace and confirm a visible unsuccessful exit;
- start a replacement that never becomes ready and confirm healthy old capacity is not prematurely discarded where platform semantics allow that control;
- simulate a bad application release and execute the rollback procedure;
- validate database connection budget while replacement processes overlap;
- verify overload/backpressure still protects the service during rollout traffic shifts.

## Release evidence

A deployment is not considered production-ready merely because a container was built or a platform reported `deployed`. Preserve the exact Git commit, CI run, deployment revision, deployment time, and rollback target in the release record. Do not put credentials or personal data in that record.

## When this runbook must be reviewed

Review this document whenever any of the following changes:

- `SHUTDOWN_GRACE_MS` default or validation range;
- readiness/draining behavior;
- hosting/orchestration platform;
- load-balancer health-check behavior;
- database migration strategy;
- `API_REPLICA_COUNT`, API replica topology, or database connection budget;
- release/rollback automation.
