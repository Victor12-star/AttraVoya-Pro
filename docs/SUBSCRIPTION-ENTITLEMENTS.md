# AttraVoya Pro — Subscription and Entitlement Architecture

## Scope

This document defines the server-authoritative Free/Pro access model. The backend now contains a narrowly scoped, opt-in Stripe webhook ingestion path for verified subscription lifecycle events, but it still does not enable checkout, customer creation, new subscription purchases, Google Play Billing, Apple In-App Purchase, RevenueCat purchase flows, advertising, or paid-provider purchases.

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

A ledger entry being present also does not itself grant Pro. Subscription state may change only through the internal server-side application boundary after provider-specific verification has mapped the event to an existing owned subscription; that boundary applies the state transactionally and then lets the existing entitlement resolver evaluate the resulting subscription state.

### Provider verification evidence boundary

Before an event can enter the verified ledger, an internal provider verification boundary receives the exact raw request bytes plus request metadata and delegates authenticity checks to a provider-specific adapter. The adapter may inspect signatures, authorization metadata, purchase evidence or other provider proof, but it returns only normalized event identity and occurrence time after verification succeeds.

The server boundary, not the caller and not the provider adapter, computes the SHA-256 digest from the exact raw bytes and assigns the server verification timestamp. It then mints an opaque in-process evidence object. The payments service accepts only evidence minted by this boundary; a plain object or copied object containing a plausible hash, event ID or verification time is rejected before persistence.

Raw request bodies, signatures, authorization headers, purchase tokens and provider secrets are not included in the evidence object and are not written to the billing ledger. Payload size is bounded before provider verification so an attacker cannot force unbounded buffering through a future callback route.

The provider-neutral boundary does not itself know any provider secret or signature format. Concrete adapters plug into it separately.

### Provider subscription identity boundary

Before a verified provider event may target authoritative subscription state, the backend resolves the provider-owned subscription identity through the compound key `provider + externalSubscriptionId`. That identity is unique at the database layer so one Stripe or future provider subscription cannot silently map to multiple AttraVoya subscriptions.

Rows without provider identity remain valid because provider linkage is nullable until a real purchase integration creates or attaches the external subscription. Once an external subscription ID is present, event processing must use the provider-scoped resolver rather than searching by customer-controlled fields, email address, plan name, or client-supplied account identifiers.

Unknown provider subscription identities fail closed and do not create, upgrade, downgrade, cancel, or otherwise mutate an AttraVoya subscription. For verified Stripe lifecycle events, an identity that is not linked yet remains retryable rather than being terminalized, because provider event delivery order is not guaranteed and checkout completion may establish ownership on a later delivery.

### Stripe webhook verification adapter

The internal Stripe adapter verifies Stripe's timestamped `v1` HMAC-SHA-256 signature against the exact raw request bytes before event JSON is trusted. It accepts multiple `v1` values so webhook-secret rotation can overlap safely, compares signatures with a timing-safe primitive, and rejects timestamps outside the configured replay tolerance.

Only after authentication succeeds does the adapter parse the event and return the bounded Stripe event ID, event type, and optional provider occurrence time to the provider-neutral verification boundary. The webhook secret, Stripe signature header, and raw payload are not returned in verifier-minted evidence and are not persisted in the billing ledger.

The verifier itself remains an internal adapter. Phase 10CK wires it only through the opt-in HTTP ingress described below. Checkout sessions, customer creation, new subscription purchases, refund handlers, and Stripe API calls remain disabled.

### Internal verified-event recording boundary

The payments module exposes an internal-only `recordVerifiedEvent` service that accepts only verifier-minted evidence. It still normalizes bounded provider/event identifiers, validates the server-owned SHA-256 digest and verification timestamp, and writes only the privacy-minimized ledger fields.

The database unique constraint on provider plus external event ID is the concurrency-safe replay boundary. The first verified delivery creates the record. An exact later retry returns the existing record as a duplicate. Reuse of the same provider event identity with a different event type or payload digest fails closed as a conflict instead of silently replacing the original evidence.

This recording service is not registered as an HTTP route and does not mutate subscription or entitlement state. Phase 10CF keeps mutation in a separate internal transactional boundary; concrete provider-specific adapters remain later separately gated slices.

### Terminal processing state boundary

Verified billing events begin in `PENDING`. Internal processing may move a pending event to `IGNORED` or `FAILED` through one compare-and-set update that requires the row to still be pending. This prevents two workers from overwriting one another's terminal decision.

An exact retry of the same terminal outcome is idempotent. A later attempt to finalize the same event with a different outcome fails closed as a conflict. Failed events accept only bounded machine-safe failure codes such as `UNSUPPORTED_EVENT`; free-text failure messages are rejected so payment or personal data cannot be written into the ledger accidentally.

`APPLIED` is intentionally not exposed by the standalone terminalization service. Phase 10CF adds a separate internal transaction that may mark an event `APPLIED` only while it performs the authoritative subscription mutation and ownership checks in that same database transaction.

No HTTP route, webhook endpoint, payment-provider verification, checkout action, subscription mutation, or entitlement mutation is added by this state-machine layer.

### Transactional subscription-state application

After an event has already entered the verified ledger, the internal payments service may apply provider-normalized state to an existing authoritative subscription. The pending-event claim, subscription mutation, and final `APPLIED` ledger state are coupled in one database transaction; no public billing route is added.

`Subscription.providerStateUpdatedAt` records when the provider says the state became current. Subscription mutation uses that timestamp as a compare-and-swap condition, so a delayed or concurrently processed older event cannot overwrite newer provider state. A stale event is retained as `IGNORED` with the privacy-safe machine code `STALE_PROVIDER_STATE`.

The transaction also requires provider consistency between the verified event and existing subscription. Already-processed events remain idempotent. Active or trialing state requires a current period end later than the provider-state timestamp, and canceled state requires a cancellation timestamp.

This boundary updates only an existing subscription. It does not create a purchase, create a provider customer or subscription, verify Stripe signatures, verify Google Play purchase tokens, process RevenueCat or Apple evidence, expose checkout, or make a billing-event row an entitlement by itself. Pro access still comes only from the server-authoritative subscription and entitlement resolver.

### Internal Stripe subscription-event processing

The Stripe verifier, provider-neutral evidence boundary, verified-event ledger, provider subscription identity resolver, and transactional subscription-state updater are composed by an internal-only subscription-event processor. The processor itself remains transport-agnostic and does not read an environment webhook secret by itself.

Processing order is fixed: authenticate the exact raw Stripe request bytes, mint verified evidence, record the verified event, reject any post-verification event identity mismatch, normalize only recognized Stripe subscription lifecycle state, resolve the existing authoritative subscription by `stripe + externalSubscriptionId`, then call the transactional state updater.

Only `customer.subscription.created`, `customer.subscription.updated`, and `customer.subscription.deleted` can enter subscription-state normalization in this slice. Other authenticated Stripe event types are retained as verified ledger evidence and terminalized as `IGNORED` without touching subscription state.

Unknown provider subscription identities fail closed without terminalizing the verified ledger row. The webhook returns a retryable service-unavailable response so a later delivery can reconcile after verified checkout completion establishes provider ownership. Authenticated but malformed or unsupported subscription state is terminalized as `STRIPE_SUBSCRIPTION_STATE_INVALID`. Neither path creates an account, provider customer, plan, or entitlement.

Stripe lifecycle statuses are compressed into AttraVoya's existing server domain only for authorization-safe state: active and trialing may grant access through the normal entitlement resolver; all mapped non-active states remain non-Pro. No client field, email address, plan name, or unverified provider metadata is used to choose subscription ownership.

### Opt-in Stripe webhook ingress

The public Stripe callback is `POST /api/v1/payments/webhooks/stripe`, but the route is not registered unless `STRIPE_WEBHOOK_ENABLED=true`. Enabling it also requires a server-only `STRIPE_WEBHOOK_SECRET`; startup fails closed if the route is enabled without that secret. The signature replay tolerance is bounded by `STRIPE_WEBHOOK_TOLERANCE_SECONDS`.

The payments plugin replaces JSON parsing only inside its own Fastify scope so Stripe's exact raw request bytes reach signature verification unchanged. Ordinary application JSON routes keep the normal parser. Webhook bodies remain bounded by the server body-size ceiling and the route has a dedicated rate limit so provider retries cannot become an unbounded public ingress.

After the shared verification boundary authenticates the exact request, dispatch uses only the verifier-minted event type. `checkout.session.completed` is sent to the verified checkout-completion ownership bridge. Subscription lifecycle events and other authenticated event types continue through the subscription processor, where unrelated events are safely ignored. Unverified JSON never chooses the processor.

After an event is authenticated and deterministically handled, the route returns only `{ "received": true }`. It does not echo plan state, provider IDs, customer IDs, subscription IDs, ledger results, payment metadata, or internal failure codes. Authenticated permanent failures that have already been terminalized in the billing ledger are acknowledged. Invalid signatures and malformed unauthenticated requests fail before acknowledgment, while transient database/server failures and verified lifecycle events whose ownership is not linked yet remain non-2xx so provider retry delivery can reconcile them later.

The webhook secret, signature header, and raw payload are not written to the billing ledger. The raw body exists only long enough to verify the signature, derive privacy-minimized evidence, and process the authenticated event.

### Disabled-by-default Stripe purchase configuration

Web purchase creation now has a configuration contract, but no purchase API or UI is enabled. `STRIPE_PURCHASE_ENABLED` defaults to `false`. When an operator explicitly enables it, startup requires a server-only `STRIPE_SECRET_KEY` plus distinct canonical Stripe Price IDs for the existing `PRO_MONTHLY` and `PRO_YEARLY` plan keys.

The server owns the plan-to-Price mapping. A future checkout request may select only a recognized AttraVoya plan key and must resolve the external Price ID from server configuration. Clients must never supply or override a Stripe Price ID, customer ID, subscription ID, price amount, currency, billing interval, or success claim as authoritative billing state.

The purchase secret and Price IDs are deployment configuration only. They are not returned by entitlement APIs, rendered in web/mobile plan status, stored in the billing-event ledger, or logged as request metadata. The committed-secret scan rejects Stripe live/test secret-key patterns, while the example environment contains only blank placeholders.

Purchase mode also requires the verified Stripe webhook ingress and secret to be enabled. In production, the configured web origin must use HTTPS and cannot contain embedded credentials.

### Server-owned Stripe checkout policy

The internal checkout policy accepts only the existing `PRO_MONTHLY` or `PRO_YEARLY` AttraVoya plan key. It resolves the corresponding Stripe Price ID from server configuration and derives both return destinations from `WEB_URL` and the existing `/premium` route. A caller cannot override the Stripe Price ID, customer ID, subscription ID, amount, currency, billing interval, success URL, or cancel URL.

The success destination is server-derived as `/premium?checkout=success&session_id={CHECKOUT_SESSION_ID}`, preserving Stripe's future Checkout Session placeholder without trusting a client redirect. Cancellation returns to the same origin at `/premium?checkout=cancelled`. Deployment paths, query strings, and fragments supplied in `WEB_URL` are not reused as arbitrary checkout redirects.

This policy remains internal and makes no network request. It does not install or call the Stripe API client, create a Checkout Session, create a customer, attach a provider subscription, expose a purchase route, show a buy button, or change any user's subscription.

### Server-owned checkout-attempt ledger

Before a future Stripe Checkout Session can be created, the backend now creates or reuses a durable `CheckoutAttempt` owned by the authenticated AttraVoya user and an active server-side plan. The record stores only internal ownership/state, provider name, optional Stripe Checkout Session ID, timestamps, and the selected internal plan relation. It stores no card data, Stripe secret, raw provider payload, client redirect, price amount, currency, or entitlement claim.

Only one active checkout attempt may exist per user. The nullable `activeUserKey` has a database unique constraint, so duplicate clicks or concurrent server workers cannot create two independent active attempts for the same account. An expired pending/session-created attempt is first terminalized as `EXPIRED` and releases that unique key before a replacement may be created. A still-active attempt for the same plan is returned idempotently; a still-active attempt for a different plan fails closed as a conflict instead of silently switching the purchase.

The server-created attempt ID is the future provider idempotency anchor: `attravoya-checkout-<attemptId>`. The client does not provide or choose the Stripe idempotency key. A later trusted Stripe API call may bind exactly one `cs_...` Checkout Session identity to the owned pending attempt. The provider plus external Checkout Session identity is unique at the database layer, and an exact binding retry is idempotent.

This boundary remains internal. It does not call Stripe, create a Checkout Session, create a customer, create or attach an external subscription, expose a purchase endpoint, render payment UI, or grant Pro. Verified webhook reconciliation remains the only path that may ultimately update authoritative subscription state.

Before creating or reusing checkout ownership, the server also checks authoritative Pro subscription state for the authenticated user. Any existing `PENDING`, `ACTIVE`, `TRIALING`, or `PAST_DUE` Pro subscription blocks a new checkout attempt with a conflict response. This prevents accidental double billing when checkout completion is still awaiting lifecycle confirmation, when access is already current, or when an existing provider subscription is recoverable and should be resolved rather than replaced.

The duplicate-subscription guard is provider-neutral at the account level: an existing qualifying Pro subscription blocks another Stripe checkout even if that subscription was created by a different billing provider. Terminal `CANCELED` and `EXPIRED` subscriptions are not part of the blocking query, so a later verified product flow may allow a genuinely ended subscription to start again without weakening current/recoverable ownership protection.

### Internal Stripe Checkout Session creation

Phase 10CP adds the internal server-side Stripe Checkout Session boundary, but it is still not registered as an HTTP purchase route. The service first obtains the durable server-owned checkout attempt, resolves the trusted persisted plan through the server-owned checkout policy, then submits a subscription-mode Checkout Session request to Stripe.

The request uses only the configured server Price ID, quantity one, server-derived success/cancel URLs, the attempt expiry and the attempt-derived idempotency key. The only ownership correlation sent to Stripe is the opaque CheckoutAttempt ID through client reference/metadata fields; the user's email and internal user ID are not sent for ownership selection. The same attempt ID is also copied into subscription metadata so a later verified reconciliation slice can connect the newly created provider subscription back to the durable server attempt without trusting browser state.

Checkout creation uses the existing bounded provider HTTP client with a hard request/total deadline, concurrency queue bounds, provider metrics, circuit behavior and privacy-safe error mapping. The POST is not automatically retried inside one call. A caller retry reuses the same active attempt and the same Stripe idempotency key, which is the duplicate-subscription safety boundary.

The Stripe response is accepted only when it represents a subscription-mode `cs_...` Checkout Session with an HTTPS `checkout.stripe.com` URL. The returned session ID is then bound once to the owned CheckoutAttempt. If Stripe succeeds but database binding fails, the operation does not report success; a later retry uses the same Stripe idempotency key and can safely recover the same provider session.

Checkout attempts now default to 35 minutes and reject configured TTLs below 31 minutes, preserving a buffer above Stripe's 30-minute minimum explicit Session expiry. The provider `expires_at` is derived from the durable attempt expiry so provider and local ownership lifetimes stay aligned.

Phase 10CT exposes the existing server-owned Checkout Session orchestration through a narrow authenticated API entry point described below. This internal gateway still does not create an AttraVoya Subscription row from browser success or grant Pro from checkout success; verified provider reconciliation remains authoritative for subscription state.

### Server-authoritative Stripe display pricing

Phase 10CU adds authenticated `GET /api/v1/payments/checkout/stripe/plans` when Stripe purchase mode is enabled. The endpoint exists so web purchase UI can display provider-authoritative pricing instead of hard-coding or inventing subscription amounts.

The server reads only the two configured Stripe Price identities with its server-only secret. Each provider response must match the configured Price ID, be active, use recurring per-unit licensed billing, contain a positive integer unit amount and three-letter currency, and match the expected one-month or one-year interval. Invalid or mismatched provider state fails closed rather than being shown to the user.

The public projection contains only `planKey`, server-owned display name, `unitAmount` in the provider currency's minor unit, `currency`, and `interval`. Stripe Price IDs, authorization headers, product/provider internals, and the Stripe secret are never returned. The client can localize the safe amount/currency for display without becoming authoritative for checkout pricing.

Validated display snapshots are cached briefly in the existing bounded process-local provider cache and concurrent misses are coalesced. This cache is presentation-only and never decides what Stripe charges: Checkout Session creation continues to use the separately configured server-owned Price ID.

The catalog requires authentication, is registered only when purchase mode is enabled, has its own bounded read rate, and returns `private, no-store` to browsers. A successful catalog read does not create checkout ownership, mutate a subscription, or grant an entitlement.

### Authenticated Stripe checkout entry point

Phase 10CT adds `POST /api/v1/payments/checkout/stripe` as the first authenticated purchase ingress. The route is registered only when server-side Stripe purchase mode is explicitly enabled; when purchase mode is disabled, the route does not exist.

The request body is strict and contains only one authoritative AttraVoya plan choice: `PRO_MONTHLY` or `PRO_YEARLY`. Authentication supplies the account identity. The client cannot submit Stripe Price IDs, amounts, currencies, billing intervals, customer IDs, subscription IDs, checkout-session IDs, success/cancel redirects, provider metadata, user ownership, idempotency keys, or entitlement claims.

The route delegates to the existing durable CheckoutAttempt, duplicate-subscription guard, server-owned checkout policy, Stripe Checkout Session gateway, and one-time session binding. It has a dedicated low rate limit and small request-body ceiling because creating a provider checkout session is a credentialed write.

Only the validated Stripe-hosted `checkoutUrl` is returned. Internal checkout-attempt IDs, separate structured Stripe session identifiers, provider configuration, plan-to-Price mapping, subscription state, and entitlement state are not returned by this endpoint. The hosted URL itself necessarily identifies the provider checkout session and is therefore marked `private, no-store`.

Stripe webhook raw-body parsing remains isolated to the webhook-only child Fastify scope. The authenticated checkout route therefore keeps ordinary validated JSON parsing while the webhook continues to receive exact raw bytes for signature verification.

A successful API response means only that a hosted checkout session is available. It does not grant Pro, create authoritative active access, or prove payment completion. Checkout completion can create only non-entitling `PENDING` ownership, and later verified Stripe lifecycle state must still move that subscription to `ACTIVE` or `TRIALING` before the entitlement resolver can expose Pro.

### Verified checkout-completion ownership bridge

A separately verified Stripe `checkout.session.completed` event may connect the external Stripe subscription identity to the exact server-owned `CheckoutAttempt` identified by its already-bound `cs_...` Checkout Session ID. The processor rechecks that the verified Stripe event ID and type match the exact authenticated payload, requires `mode=subscription`, and accepts only Stripe-shaped `cs_...` and `sub_...` identities.

The checkout payload does not choose the AttraVoya user or plan. Ownership comes only from the existing `CheckoutAttempt`, which was created from the authenticated user and server-resolved plan before any provider session could be bound. The billing event claim, checkout-attempt completion, provider subscription identity, and internal subscription creation are coupled through the server transaction boundary and provider identity uniqueness constraints.

Checkout completion creates only a `PENDING` internal subscription. `PENDING` is deliberately excluded from entitlement resolution, which recognizes only current `ACTIVE` or `TRIALING` subscriptions with a future period end. A browser success redirect and a completed Checkout Session therefore cannot grant Pro by themselves. A later separately verified `customer.subscription.*` lifecycle event must supply authoritative subscription status and period state before the existing entitlement resolver can expose Pro access.

Malformed authenticated completion state is terminalized with a bounded privacy-safe machine code. Unknown checkout ownership, inactive plans, conflicting provider identities, and checkout-attempt state races fail closed. Raw Stripe bodies, signature headers, card data, provider secrets, and client-selected ownership data are not stored in the resulting subscription.

The checkout-completion processor remains an internal trust-chain component, but Phase 10CS connects it to the existing opt-in Stripe webhook ingress only after the shared signature-verification boundary has authenticated the event type. Stripe Checkout Session creation is handled by the separate Phase 10CP server gateway, and no authenticated purchase endpoint is exposed yet. No browser/mobile success state grants entitlement; verified lifecycle reconciliation remains authoritative.

## Future billing integration

Billing providers will be added in later, separate CI-gated slices.

The intended evidence path is:

- Web: Stripe Billing, with supported wallet methods where available.
- Android: Google Play Billing -> RevenueCat -> AttraVoya backend.
- Future iOS: Apple In-App Purchase -> RevenueCat -> AttraVoya backend.

Provider callbacks or purchase tokens must be verified server-side before they can create or change authoritative subscription state. Required future controls include signature/token verification, idempotency, replay protection, ownership checks, refund/revocation handling, database transactions, rate limiting, server-only secrets and privacy-safe audit events.

The Stripe webhook trust chain, durable checkout ownership, internal Stripe Checkout Session creation, and authenticated server checkout endpoint now exist. No buy/upgrade UI is enabled yet, and Android/iOS store purchase integrations remain separate work. Until those client-facing purchase surfaces are separately implemented and verified, AttraVoya must not claim that users can purchase new subscriptions from the visible product UI.

## Security boundary

Account-security features are deliberately outside the entitlement gate. A payment failure, expired subscription or Free plan must never remove access to security and privacy controls.

The entitlement resolver is fail-closed. Client state is advisory only, and no client-provided plan or entitlement claim is trusted.

## Data and privacy boundary

Store only subscription data required to make entitlement decisions and reconcile verified provider state. Never store raw card numbers. Do not place payment secrets, purchase tokens or unnecessary billing metadata in client-visible responses, logs or analytics.

## Release discipline

Every entitlement or billing change follows the repository release invariant:

`verified develop -> dedicated branch -> implementation/tests -> exact PR-head 5/5 CI -> squash merge with expected-head protection -> exact post-merge develop 5/5 CI`

Billing, AI and analytics/admin work must remain separate reviewable slices rather than becoming one coupled subsystem.
