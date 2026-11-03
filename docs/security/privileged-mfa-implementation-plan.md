# Privileged multifactor authentication: security design and acceptance gates

Status: design-only checkpoint. No routes, database tables, credentials, or account behavior are changed by this phase.

## Verified existing integration points

- `apps/server/src/modules/auth/auth.routes.js` exposes ordinary and mobile password login, refresh, password reset, and session management.
- `auth.service.js` currently creates an `AuthSession` and issues access/refresh tokens immediately after the password check. `refresh()` issues another access token after refresh-token rotation.
- `apps/admin/src/app/api/admin/login/route.js` calls `/api/v1/auth/mobile/login` and then verifies analytics permission, storing both tokens in HttpOnly cookies.
- Access JWTs contain a subject only. Backend authorizes privileged requests using current PostgreSQL roles and permissions.
- Revoking refresh sessions does not revoke already issued access JWTs. Session revocation and MFA are separate security concerns.

**Security invariant:** A user with an enrolled and required MFA factor MUST NOT obtain an administrator-usable access token or refresh token from password-only login, password reset, mobile login, refresh, direct backend routes, or an alternate client. The admin UI alone is not an enforcement boundary.

## Proposed rollout sequence

1. Add explicit per-account MFA enrollment state and a versioned, migration-reviewed persistence model. Protect TOTP secrets using authenticated encryption and a managed key that is separate from database credentials; never log secret material. Recovery codes are individually hashed and single-use.
2. Add an authenticated, password-reconfirmed enrollment-initiation route that returns a secret/otpauth URI only once, with a short-lived pending state. Enrollment is **not active** until a valid TOTP code is verified. Rate-limit initiation, confirmation, and recovery attempts; audit transitions without recording codes or secrets.
3. Refactor password authentication into a short-lived, limited-purpose MFA challenge for privileged accounts with active MFA. No `AuthSession`, bearer JWT, or refresh token is created until challenge completion. Bind challenge to the authenticated account, purpose, expiry, and one-time consumption; never accept a client-declared role or MFA completion claim.
4. Enforce the same privileged MFA policy in every token-issuance entry point: `/login`, `/mobile/login`, `/refresh`, password reset/recovery, and any future social or alternate sign-in flow. A previously authenticated MFA session may refresh according to an explicitly documented bounded assurance policy, but a password-only session must never be upgraded silently.
5. Add a challenge step to the existing same-origin Admin frontend login route, keeping session cookies unset until successful verification. Use no-store responses, CSRF/same-origin protection, and accessible mobile-friendly forms.
6. Add MFA disable, factor replacement, recovery-code rotation, and owner emergency recovery only after reauthentication and a reviewed, audit-tracked recovery policy. Do not automatically remove MFA during password reset or grant SUPER_ADMIN to another account.
7. Stage and verify the DB migration separately before staging backend deployment. Do not force-enroll the existing owner or modify credentials without explicit approval. Later, require MFA for privileged roles with a guarded enrollment transition and tested lockout avoidance.

## Required integration tests before activation

| Scenario | Expected result |
| --- | --- |
| Existing ordinary traveler without MFA | Existing login, mobile login, refresh, and password reset remain compatible |
| Privileged user with active MFA enters valid password | MFA challenge only; no access JWT, refresh token, or active AuthSession |
| Privileged user attempts direct mobile login | Identical server-side MFA gate |
| Invalid, expired, reused, or replayed TOTP | Denied; no token or session |
| Valid TOTP within documented clock tolerance | One-time challenge consumed; session issued exactly once |
| Replayed or raced challenge | At most one successful issuance |
| Password-only token tries an administrator API | Rejected for MFA-required privileged account |
| Previously issued sessions after MFA becomes mandatory | Explicit invalidation or limited migration policy; no bypass |
| Password reset or recovery-code login | No MFA disablement or silent privilege escalation |
| Lost factor, rate-limit attack, or provider failure | Safe failure with auditable, reviewed recovery path |
| Revoked admin role or disabled account | Privileged request rejected even with a previously valid access JWT |
| Login cookie response before MFA completion | No authenticated cookies set |
| Enrollment / secret display / recovery codes | Never logged, leaked to analytics, or persisted in plaintext |
| Multiple active challenges | Independent, bounded, revocable, and single-use |

## Token and session revocation follow-up

The existing JWT subject-only claims are compatible with database authorization checks but not sufficient for immediate per-session revocation. Separately design a database-backed `sessionId`/session-version or token-version check on **each protected request**, including admin APIs, with a fail-closed policy and transactional invalidation on password change, role removal, disablement, and all-device logout. Ensure refresh rotation and session revocation are race-safe.

## Release constraints

- Keep public traveler accounts working.
- Explicitly test privilege transitions, alternate token paths, concurrency, and lockout prevention.
- Require five exact-head pull-request CI jobs and five independent post-merge develop jobs.
- No database migration, secret change, actual enrollment, password reset, role assignment, invitation, or deployment occurs in this design-only checkpoint.
- A documentation-only change does not certify MFA as implemented.
