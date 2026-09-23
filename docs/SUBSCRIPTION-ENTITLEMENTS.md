# AttraVoya Pro — Subscription and Entitlement Architecture

## Scope

This document defines the server-authoritative Free/Pro access model. It does not enable billing, checkout, Google Play Billing, Apple In-App Purchase, RevenueCat, Stripe, advertising, or paid-provider purchases.

A client must never become Pro by sending a flag such as `isPro: true`. Clients may display the access state returned by the API, but protected server operations must evaluate the authenticated user's authoritative entitlement state on the server.

## Canonical commercial plans

The initial commercial plan keys are:

- `FREE`
- `PRO_MONTHLY`
- `PRO_YEARLY`

Pro Monthly and Pro Yearly represent different future billing cadences for the same product tier. Billing cadence does not change authorization capabilities.

The old generic `PREMIUM` key is legacy-only. Seed synchronization marks an existing legacy plan row inactive, and the entitlement resolver does not recognize it as Pro.

## Source of truth

The effective access flow is:

`authenticated user -> server subscription lookup -> active plan -> plan entitlements -> server response`

The server accepts Pro access only when all of the following are true:

1. the request belongs to a currently authenticated active account;
2. the stored plan is one of the server-recognized Pro plan keys;
3. the plan itself is active;
4. the subscription status is `ACTIVE` or `TRIALING`;
5. the subscription has already started;
6. the subscription has a future `currentPeriodEnd`.

Unknown, legacy, expired or malformed subscription state fails closed to Free.

No external customer ID, purchase token, payment identifier or provider secret is exposed by the entitlement response.

## Entitlement API

`GET /api/v1/entitlements/me` returns private, non-cacheable access state for the authenticated account.

The response contains:

- the effective plan key, tier and display name;
- recognized entitlement keys;
- current server-defined usage limits;
- minimal subscription status and period-end information when Pro is active.

The endpoint is intended for client rendering and feature discovery. It does not replace server-side authorization on future gated operations.

The web `/premium` route may present this authoritative state to the signed-in traveller. It must treat malformed responses as unavailable, never expose provider/payment identifiers, and never show purchase or upgrade actions until a verified billing integration actually exists.

The protected mobile `/premium` route follows the same display-only rule. It reads the existing authenticated mobile API boundary, strictly normalizes Free and Pro state, provides safe loading/offline/retry handling, and must not expose purchase, upgrade, provider, customer, or payment-token controls until verified mobile billing exists.

## Server enforcement boundary

Future premium API operations must use the centralized server entitlement gate rather than reading a client flag or duplicating subscription checks inside controllers. A protected route composes normal authentication with `app.requireEntitlement(ENTITLEMENTS.<KEY>)`.

The gate resolves the authenticated account through the same authoritative entitlement service used by the access endpoint. Access is granted only when the current verified subscription contains the specific server-recognized entitlement. Free accounts, expired or malformed subscriptions, and Pro plans missing the requested capability fail closed with the stable `SUBSCRIPTION_REQUIRED` API error.

Unknown entitlement keys are rejected as server configuration errors before the route is exposed. The public denial response contains no provider identifiers, payment metadata, purchase tokens, or subscription internals.

Account security, authentication, session controls, privacy controls, account export/deletion, essential emergency/safety functions, and future secure payment-management routes must remain outside this premium gate.

## Free remains useful

Core travel planning, essential emergency/safety access, account security, authentication, password recovery, session management, privacy controls, account export/deletion and future secure payment management must not be paywalled merely because an account is Free.

Pro is intended to expand advanced planning, convenience, limits and future premium capabilities rather than disable the safe core product.

## Verified billing-event ledger

Before any payment provider webhook can change subscription state, verified provider events are recorded in the internal `BillingEvent` ledger. The ledger is provider-neutral and exists to make retries, duplicate delivery, reconciliation, and replay handling deterministic.

Each record stores the provider name, provider event identifier, event type, a SHA-256-sized payload digest, verification time, processing status, optional event occurrence time, optional related subscription, and privacy-safe internal failure code. The combination of provider plus external event ID is unique so the same provider event cannot be applied twice.

The ledger deliberately does not store a raw webhook body, raw purchase token, card data, client secret, provider API secret, or other payment credential. Future provider adapters must verify signatures or purchase evidence before inserting an event into this verified ledger. Receiving an unverified request is not sufficient to grant Pro access.

A ledger entry being present also does not itself grant Pro. Subscription state may change only through a later server-side processor that validates the verified event, maps it to an owned account/subscription, applies an idempotent database transaction, and then lets the existing entitlement resolver evaluate the resulting subscription state.

### Internal verified-event recording boundary

The payments module exposes an internal-only `recordVerifiedEvent` service for evidence that has already passed provider-specific verification. The service normalizes bounded provider/event identifiers, requires a valid SHA-256 payload digest and verification timestamp, and writes only the privacy-minimized ledger fields.

The database unique constraint on provider plus external event ID is the concurrency-safe replay boundary. The first verified delivery creates the record. An exact later retry returns the existing record as a duplicate. Reuse of the same provider event identity with a different event type or payload digest fails closed as a conflict instead of silently replacing the original evidence.

This service is not registered as an HTTP route. It does not verify Stripe signatures, Google Play purchase tokens, RevenueCat events, or Apple transactions, and it does not mutate subscription or entitlement state. Provider-specific verification and authoritative subscription mutation remain later separately gated slices.

## Future billing integration

Billing providers will be added in later, separate CI-gated slices.

The intended evidence path is:

- Web: Stripe Billing, with supported wallet methods where available.
- Android: Google Play Billing -> RevenueCat -> AttraVoya backend.
- Future iOS: Apple In-App Purchase -> RevenueCat -> AttraVoya backend.

Provider callbacks or purchase tokens must be verified server-side before they can create or change authoritative subscription state. Required future controls include signature/token verification, idempotency, replay protection, ownership checks, refund/revocation handling, database transactions, rate limiting, server-only secrets and privacy-safe audit events.

Until those integrations exist, AttraVoya must not claim that subscriptions can be purchased.

## Security boundary

Account-security features are deliberately outside the entitlement gate. A payment failure, expired subscription or Free plan must never remove access to security and privacy controls.

The entitlement resolver is fail-closed. Client state is advisory only, and no client-provided plan or entitlement claim is trusted.

## Data and privacy boundary

Store only subscription data required to make entitlement decisions and reconcile verified provider state. Never store raw card numbers. Do not place payment secrets, purchase tokens or unnecessary billing metadata in client-visible responses, logs or analytics.

## Release discipline

Every entitlement or billing change follows the repository release invariant:

`verified develop -> dedicated branch -> implementation/tests -> exact PR-head 5/5 CI -> squash merge with expected-head protection -> exact post-merge develop 5/5 CI`

Billing, AI and analytics/admin work must remain separate reviewable slices rather than becoming one coupled subsystem.
