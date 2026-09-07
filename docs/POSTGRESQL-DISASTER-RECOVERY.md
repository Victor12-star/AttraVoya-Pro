# PostgreSQL disaster recovery contract

## Status and scope

This document defines AttraVoya Pro's PostgreSQL recovery targets and launch requirements. It is a readiness contract, not evidence that a production database provider has already been configured to meet these targets.

The CI recovery drill validates the mechanics of a PostgreSQL 17 logical backup and restore against a disposable local database. It does not prove that a future managed provider's point-in-time recovery, geographic redundancy, retention or operator procedures work. Those provider-specific capabilities must be verified before production launch.

## Initial recovery objectives

For the first public production release, the database recovery targets are:

- Recovery Point Objective (RPO): no more than 15 minutes of committed database changes may be lost in a database-recovery incident.
- Recovery Time Objective (RTO): database-backed service should be restored within 60 minutes of declaring a database-recovery incident.
- Point-in-time recovery window: at least 7 days.
- Automated backup retention: at least 30 days for retained snapshots or logical backups used for disaster recovery.
- Restore verification: at least once per quarter and before production launch.

These are targets. They become production claims only after the selected database platform is configured and a provider-specific restore exercise demonstrates them.

An RPO of 15 minutes normally requires continuous WAL-based point-in-time recovery or an equivalent managed-provider capability. Periodic `pg_dump` files alone are not sufficient to satisfy that RPO.

## Production launch gate

Before AttraVoya Pro may be described as production-recoverable, the selected PostgreSQL platform must provide and have evidence for all of the following:

- encrypted automated backups;
- point-in-time recovery covering at least the stated recovery window;
- backup retention meeting or exceeding the stated target;
- a documented restore procedure that does not overwrite the only surviving copy of production data;
- a completed isolated restore exercise;
- measured recovery duration and recovered restore point;
- confirmation that application secrets, database credentials and backup access are limited by least privilege;
- a rollback path for schema migrations and application releases;
- an owner for declaring, coordinating and closing a recovery incident.

If the selected provider cannot meet the targets, the targets must be revised explicitly before launch or the provider must be changed. The application must not silently claim stronger recovery guarantees than the infrastructure can provide.

## CI recovery drill

The repository recovery drill is run with:

```sh
POSTGRES_RECOVERY_TEST=1 pnpm db:recovery:test
```

The drill deliberately refuses to run unless the database host is loopback-only (`127.0.0.1`, `localhost` or `::1`). This prevents the automated test from creating or dropping recovery databases on a remote or production PostgreSQL server.

The drill:

1. uses PostgreSQL 17 tooling matching the CI database major version;
2. creates a custom-format `pg_dump` from the disposable CI database;
3. creates an isolated temporary restore database;
4. restores the dump with `pg_restore --exit-on-error`;
5. compares the number of public base tables between source and restored databases;
6. compares stable seeded reference-data counts for countries, languages, currencies, roles, permissions and plans;
7. removes the temporary restore database and local dump.

This proves that the current schema and seeded reference data can complete a logical backup-and-restore cycle in CI. It is intentionally separate from the future managed-provider disaster-recovery exercise.

## Production incident restore procedure

When a real database recovery is required:

1. Declare the incident and record the start time, affected environment and latest known healthy application/database state.
2. Stop or restrict application writes when continued writes could increase inconsistency or overwrite recoverable data.
3. Preserve the damaged/current database. Do not restore destructively over the only remaining copy.
4. Select the recovery point using provider PITR or the newest verified backup consistent with the incident boundary.
5. Restore into an isolated replacement database or recovery instance first.
6. Run schema validation, migration-status checks and integrity checks before routing application traffic to the recovered database.
7. Verify critical reference data and a representative set of private owner-scoped records without exposing private data in logs.
8. Update the application connection only after the recovered database passes validation and readiness checks.
9. Keep the previous database isolated long enough to support rollback or forensic comparison.
10. Record actual data-loss interval and recovery duration, then compare them with the RPO and RTO targets.
11. Complete a post-incident review and update procedures, monitoring or architecture when the targets were missed.

## Migration recovery rules

Database migrations used during rolling or low-downtime deployments must remain backward-compatible with the previous application version while both versions can be live.

A destructive migration must not be applied without:

- a verified backup or provider restore point;
- a documented rollback or forward-repair plan;
- confirmation that the expected restore time still fits the RTO target;
- explicit review of data-loss risk;
- a staged deployment sequence that does not require old and new application versions to disagree about the schema.

Schema removal should normally use an expand-and-contract sequence: add the new schema first, deploy compatible application code, migrate data, verify usage has moved, and only remove the old schema in a later release.

## Evidence to retain

For each production restore exercise, retain non-sensitive evidence containing:

- exercise date;
- provider and database region;
- selected restore point;
- backup/PITR source used;
- restore start and completion timestamps;
- measured RPO and RTO result;
- validation checks performed;
- success/failure outcome;
- follow-up actions.

Do not place database dumps, credentials, tokens, private trip data, personal data or child-sensitive data in GitHub issues, CI artifacts or public logs.
