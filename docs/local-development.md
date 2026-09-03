# Local development foundation

This document explains the Phase 1 development environment in practical terms.

## Why PostgreSQL and LibreTranslate use Docker

Keeping these services in Docker gives every developer a repeatable environment without installing PostgreSQL or the translation runtime directly on the operating system. The containers are replaceable development dependencies; application code communicates with them through stable URLs.

## Why `.env.example` contains no real secrets

`.env.example` documents which configuration keys exist and is safe to commit. The real `.env` is private and ignored by Git. `scripts/setup-development.js` creates strong local secrets only when values are missing, which avoids a repository full of shared default passwords.

External API credentials are deliberately not generated. When a free provider account is created, its real key is added to the private `.env` only.

## Environment commands

```bash
node scripts/check-environment.js
```

Checks the installed Node.js, pnpm, Docker, Docker Compose, and `.env` prerequisites.

```bash
node scripts/setup-development.js
```

Creates or safely completes the local `.env` without overwriting existing values.

```bash
node scripts/validate-env.js
```

Fails when core security/database settings are missing. Provider API keys that have not been created yet are warnings, not fake credentials.

## Health endpoints

`/api/v1/health/live` checks only the API process.

`/api/v1/health/ready` checks PostgreSQL as well. Keeping these two checks separate helps deployments distinguish "the server process exists" from "the application can actually serve database-backed traffic".

## Ports

- Web: 3000
- Admin: 3001
- API: 5000
- LibreTranslate: 5001 (container port 5000)
- PostgreSQL: 5432

The distinct API/LibreTranslate ports avoid the collision that would occur if both attempted to bind to host port 5000.
