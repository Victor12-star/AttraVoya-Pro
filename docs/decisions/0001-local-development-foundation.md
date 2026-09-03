# ADR 0001 — Local development foundation

**Status:** Accepted  
**Date:** 2026-09-03

## Context

AttraVoya Pro needs a zero-cost development environment that is predictable for a student developer and maintainable by future contributors. The initial scaffold contained LibreTranslate in Docker but did not provide a local PostgreSQL service, environment setup logic, or a working API process.

## Decision

- Use Docker Compose for local PostgreSQL and LibreTranslate.
- Bind both container services to `127.0.0.1` rather than every network interface.
- Run the AttraVoya API on port 5000 and map LibreTranslate to host port 5001 to avoid a port collision.
- Keep real secrets out of `.env.example` and Git.
- Generate strong local-only database/application secrets with `scripts/setup-development.js` when values are blank.
- Treat third-party API credentials as optional during initial development; missing credentials produce warnings and later feature-level unavailable states rather than fake data.
- Expose separate API liveness and readiness endpoints. Readiness includes PostgreSQL connectivity.
- Validate core configuration during API startup so insecure or incomplete environments fail early.

## Consequences

### Positive

- New developers can reproduce the same services without installing PostgreSQL or LibreTranslate directly.
- Local database and translation services are not exposed to the LAN by default.
- Shared default passwords do not live in source control.
- Deployment systems can distinguish a live Node process from an application that is actually ready to use PostgreSQL.

### Trade-offs

- Docker is required for the standard local workflow.
- LibreTranslate can consume noticeable CPU/storage while language models are installed or running.
- External free API accounts still need to be created separately when those integrations are implemented.
