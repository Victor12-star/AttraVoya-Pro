# Phase 3A report — working plan, accommodation preferences, and authorization foundation

## Purpose

This checkpoint starts Phase 3 without jumping ahead to the visual website. It
also folds the newly approved accommodation strategy into the data model before
migrations are locked.

## Implemented

### Engineering workflow

- Added `WORKING-PLAN.md` as the shared engineering + learning roadmap.
- Added a phase rhythm: understand → design → implement → verify → explain → checkpoint.

### Accommodation planning

- Added provider-neutral accommodation types for hotels, guest houses, B&Bs,
  hostels, serviced apartments, aparthotels, short-term rentals, vacation homes,
  resorts, villas, cottages, campsites, and holiday parks.
- Added room/unit choices (entire place, private room, shared room, any).
- Added required/preferred accommodation semantics.
- Added breakfast, kitchen, private bathroom, amenities, family suitability,
  long-stay suitability, stay-near priorities, nightly limit, and total-stay limit.
- Added `TravelStayPreference` to Prisma.
- Added `AccommodationOption` planning snapshots with provider provenance and
  fields for stay cost, food impact, transport impact, and effective trip cost.
- Extended budget-planner validation to accept accommodation preferences.
- Updated database guard tests and documentation.

### Backend security foundation

- Expanded stable API error codes and typed application errors.
- Registered `@fastify/jwt` for short-lived access-token verification.
- Configured issuer/audience verification and an HttpOnly-cookie-compatible JWT
  path while retaining Authorization-header support for non-browser clients.
- Added database-backed authentication context loading.
- Added `authenticate` hook that rejects missing/invalid/suspended/deleted users.
- Added `authorize` hook supporting minimum role, all-permission, and
  any-permission checks.
- Authorization deliberately reloads current database roles/permissions instead
  of trusting stale role claims in the access token.
- Added authentication/authorization test cases for missing tokens, suspension,
  current permissions, and forged/stale role claims.
- Configured shared Zod validator/serializer compilers for Fastify routes.

### Environment consistency

- The API now loads the root `.env` first and an optional package-local override.
- Prisma CLI configuration loads the same root `.env`, avoiding unnecessary
  secret duplication between packages.

## Verification performed in this environment

- 70 non-empty JavaScript/MJS/CJS files passed `node --check`.
- 33 JSON files parsed successfully.
- No TypeScript source files were introduced.

## Verification not claimed yet

The execution environment has Node 22.16 while the repository targets Node
24.20 and cannot download pnpm because registry network access is unavailable.
Therefore this checkpoint does **not** claim:

- Prisma schema validation/migration success;
- Vitest execution success;
- pnpm lint/build success;
- Docker/PostgreSQL runtime success.

Those checks remain mandatory on the proper development environment before the
first migration is accepted.

## Next implementation slice

Phase 3B:

1. secure registration and Argon2id password hashing;
2. login with generic credential failures;
3. access + refresh session lifecycle;
4. logout/session revocation;
5. email-verification token lifecycle;
6. forgot/reset-password lifecycle;
7. route-specific brute-force rate limits;
8. authentication integration tests;
9. security review before moving to localization.
