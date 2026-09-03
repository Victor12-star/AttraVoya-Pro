# AttraVoya Pro Security

Security is treated as part of feature development, not as a final release-only task. Do not commit real credentials, API keys, database passwords, signing secrets, session tokens, or private customer data.

## Temporary transitive security overrides

The root workspace pins a small number of patched transitive dependencies while upstream packages catch up. These are security fixes, not feature overrides:

- `@fastify/static` is pinned to `10.1.1` to address GHSA-83w8-p2f5-377r, reached through the Swagger UI documentation route.
- `fast-uri` 3.x/4.x are pinned to `3.1.6`/`4.1.3` to address the 2026 URI host-confusion and SSRF advisories used by JSON-schema tooling.
- `deepmerge-ts` is pinned to `8.0.1` because Prisma 7.9.1 currently pins the vulnerable 7.1.5 release in its configuration loader. This path is build and migration tooling rather than a public request path, but it is still patched.
- `mysql2` is pinned to a patched current release even though AttraVoya Pro uses PostgreSQL; Prisma's CLI dependency graph installs it transitively.

Remove an override only after the direct upstream package depends on a patched version and the CI dependency audit remains clean.

## Reporting and release gate

Critical and high-severity findings must be investigated before a release is approved. A passing user interface is not considered a security test. Authentication, authorization, RBAC, Premium entitlements, IDOR, input validation, sessions/cookies, rate limits, security headers, secret exposure, dependency vulnerabilities, and relevant provider failure paths must be tested independently.
