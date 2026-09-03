# Phase 3B — Authentication, Sessions, and Recent Search Foundation

## Completed

- Added registration service with Argon2id password hashing.
- Added one-time email verification token generation and SHA-256 token storage.
- Added email verification flow that activates verified accounts.
- Added login with generic credential failures and a dummy Argon2 verification path to reduce account-enumeration timing differences.
- Added database-backed authorization context so stale JWT role claims cannot preserve removed privileges.
- Added opaque refresh sessions stored only as hashes in PostgreSQL.
- Added refresh-token rotation on every refresh.
- Added logout/session revocation.
- Added forgot-password flow with generic public response.
- Added one-time password-reset tokens and automatic revocation of all sessions after a password change.
- Added strict per-route rate limits for registration, login, verification, and password reset operations.
- Added secure HttpOnly authentication cookies. Secure cookies are enforced in production and SameSite=Lax is used for the current same-site architecture.
- Removed the unused JWT refresh secret. Refresh sessions intentionally use opaque random credentials instead of long-lived refresh JWTs.
- Added a configurable refresh-session lifetime.
- Added a PostgreSQL RecentSearch model for signed-in users.
- Added guest recent-search browser storage with an eight-search limit.
- Added local preference storage for language, country, currency, and theme.
- Documented why recent searches do not belong in cookies and established cookie-consent boundaries for future analytics/marketing tools.
- Created the `develop` branch in the connected GitHub repository so future source synchronization does not require uncontrolled commits directly to `main`.

## Security decisions

1. Raw refresh, email-verification, and password-reset tokens are never stored in PostgreSQL.
2. Refresh credentials rotate after every successful use.
3. Password reset revokes all existing sessions.
4. Login does not trust roles embedded in access tokens; current roles and permissions are loaded from PostgreSQL.
5. Suspended/deactivated users cannot continue using a previously issued token.
6. Unknown-email and wrong-password logins return the same public credential error.
7. Forgot-password responses do not reveal whether an email is registered.
8. Authentication cookies are HttpOnly and are redacted from server logs.
9. Recent travel-search payloads are not placed in cookies because cookies travel with HTTP requests and are a poor privacy/performance fit for search history.

## Verification performed in this environment

- JavaScript syntax check over 385 project JavaScript/MJS files: passed.
- JSON parse check over 33 project JSON files: passed.
- Targeted syntax checks for every new/changed authentication and browser-storage file: passed.

## Still requires the target Node/pnpm/Docker environment

- Prisma schema validation/generation and migration.
- Vitest authentication integration tests.
- PostgreSQL session lifecycle tests.
- Cookie behaviour through a running browser.
- Full pnpm lint/build/test pipeline.
- Resend email-delivery integration.

These items must not be marked complete until executed successfully in the proper Node 24.20 / pnpm 11 / Docker environment.
