# Phase 2 — Database and budget-intelligence foundation

## Completed

- Added the core Prisma/PostgreSQL domain model.
- Separated roles/permissions from Free/Premium subscriptions.
- Added hashed authentication-session and verification/reset token models.
- Added global country, language, currency, city, destination, and airport models.
- Made budget-first destination discovery a first-class database domain.
- Added ranked travel recommendations with budget/family/weather fit metadata.
- Added cost provenance: live, verified, estimated, user-entered, or unavailable.
- Added confidence, data-completeness, and budget-fit status fields.
- Added versioned budget scenarios for "make this trip cheaper" workflows.
- Added actual trip expenses for the future Budget Guard.
- Added authoritative emergency-record verification fields.
- Added feature flags, provider-health state, and append-only admin audit records.
- Removed basic emergency assistance from Premium entitlements.
- Disabled Premium checkout by default until a real payment provider exists.
- Added budget-planner Zod input validation.
- Added a safe seed policy for roles, permissions, plans, entitlements, and flags only.
- Added schema guard tests and database architecture documentation.

## Verification performed in this environment

- Modified JavaScript files pass `node --check`.
- JSON package metadata parses successfully.
- `pnpm-lock.yaml` parses as valid YAML.
- Schema structural guard checks pass.
- No TypeScript source files were introduced.
- ProviderStatus contains no API-key/secret/token fields.

## Runtime verification still required

The current execution environment cannot download the required pnpm version and does not provide Docker. Therefore these checks must be run when the project is opened on a machine with Node 24.20, pnpm 11.22, and Docker:

1. `pnpm install --frozen-lockfile`
2. `pnpm db:generate`
3. `pnpm --filter @attravoya/database validate:schema`
4. `docker compose up -d postgres`
5. `pnpm db:migrate`
6. `pnpm db:seed`
7. `pnpm --filter @attravoya/database test`

Do not create a migration manually before Prisma validates the schema. This avoids committing SQL that may drift from the actual Prisma model.
