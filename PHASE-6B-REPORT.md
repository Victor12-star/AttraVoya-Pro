# Phase 6B report — transactional email and authentication recovery

## Goal

Finish the no-cost development provider batch with real transactional email support and connect it to usable verification/password-recovery flows without exposing one-time tokens or provider credentials.

## Implemented

### Resend provider adapter

- provider-neutral email contract, registry and factory;
- Resend server-side `POST /emails` adapter;
- lazy `RESEND_API_KEY` and `EMAIL_FROM` credential checks;
- verification links point to `/verify-email` and expire after 24 hours at the auth-service boundary;
- password-reset links point to `/reset-password` and expire after 1 hour;
- provider message IDs are normalized; raw Resend payloads do not escape into the application;
- transactional POST requests are never automatically retried by the shared provider transport.

### Authentication recovery hardening

- added `POST /api/v1/auth/resend-verification`;
- resend responses are deliberately generic for unknown, deleted and already-verified accounts;
- creating a new verification token invalidates prior unused verification tokens;
- registration no longer becomes a misleading 5xx after the user record has already been created if email delivery fails;
- password-reset and resend email failures are logged safely while public responses remain enumeration-resistant;
- production startup now requires the configured Resend provider, API key and sender identity.

### Customer web flows

Replaced placeholder recovery pages with working forms:

- `/forgot-password`;
- `/reset-password?token=...`;
- `/verify-email?token=...`;
- resend-verification form on the verification page;
- forgot-password link on login;
- verification-help link after registration.

The recovery copy is maintained for all 18 supported UI locales and has a parity/non-empty automated test.

### Shared client

`@attravoya/api-client` now exposes `resendVerification(email)` alongside the existing verify/reset methods so web, Admin and mobile can share the same API contract.

## Security decisions

- verification/reset tokens remain hashed in PostgreSQL and are never returned by public API responses;
- provider keys stay server-side;
- email callbacks never log raw one-time tokens;
- email-account existence is not disclosed by forgot-password or resend-verification responses;
- verification is button-driven instead of automatically executed in a React effect, preventing development double-render behavior from consuming a one-time token twice;
- production fails fast if transactional authentication email is not configured.

## Automated coverage added

- Resend adapter unit tests for verification email, password-reset email, missing credentials and malformed upstream responses;
- authentication integration tests for resend-verification and account-enumeration resistance;
- 18-locale recovery-message parity test;
- provider smoke test now includes the Resend adapter without making an external email call.

## Intentionally not done

CI does not send a real Resend email on every push. That would create unwanted transactional mail and consume quota. Real delivery should be verified manually after adding a development Resend key/sender and a controlled recipient.

Live flight fares and live accommodation room prices remain unavailable until approved real providers exist. No sandbox/test fare is presented as live public data.

## Next

Move into Phase 7 customer website vertical slices, starting with homepage/global destination search backed by the real Geoapify provider, then destination pages that compose weather, imagery, nearby places, events/news and honest unavailable states without allowing one provider failure to break the whole page.
