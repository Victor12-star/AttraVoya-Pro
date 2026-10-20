# AttraVoya Pro — Launch Readiness Tracker

Baseline: 2026-10-20.

Evidence: `develop` commit `996ae5f2314baeb4d71926a18b474b53b047b516`; independent five-job push run `39472214975` passed.

> Green CI verifies repository checks, not production bookings, deployed services, payment settlement, or a published Play Store app. Do not infer completion percentage from commit counts.

## Release status

**Not release-ready.** Web, server, admin, and Android workspaces exist with automated quality, database, dependency, build, and free-provider checks. Production launch gates below require separate evidence.

## Launch gates

Use **Verified**, **Implemented / unverified**, **Blocked**, or **Not checked** for each gate. A gate is only Verified after the listed acceptance evidence exists.

### 1. Engineering CI

- Status: **Verified on baseline commit only**.
- Owner: Engineering.
- Evidence: all five independent canonical checks passed on the exact production candidate `develop` SHA.

### 2. Family budget planner and trip journeys

- Status: **Implemented / unverified in production**.
- Owner: Engineering and QA.
- Evidence: real browser journeys, budget reconciliation, child/family handling, network failures, and persisted plan recovery.

### 3. Traveller news and destination safety awareness

- Status: **Implemented / unverified in production**.
- Owner: Engineering and QA.
- Evidence: visible publication timestamps and freshness limits, source attribution, neutral awareness wording, graceful provider failures, and no unsupported claims.

### 4. Live flights and booking inventory

- Status: **Blocked**.
- Owner: Product owner and engineering.
- Evidence: approved provider contract and configuration, real fares/availability, source provenance, booking link or flow, and no invented live prices.

### 5. Live accommodation availability and pricing

- Status: **Blocked**.
- Owner: Product owner and engineering.
- Evidence: approved room-inventory provider, verified prices, taxes, fees, cancellation terms, and availability provenance. Place search alone does not prove bookable rooms.

### 6. Production web, API, admin, and custom domains

- Status: **Blocked**.
- Owner: Product owner and operations.
- Evidence: exact hosting services, validated DNS and HTTPS for `vikwora.com` and required subdomains, health checks, CORS, callback settings, secure admin access, and policy pages.

### 7. Authentication email

- Status: **Not checked in production**.
- Owner: Product owner and operations.
- Evidence: verified sending domain plus successful account verification and password-reset delivery.

### 8. Stripe web payments

- Status: **Implemented / unverified in production**.
- Owner: Product owner and engineering.
- Evidence: real test transactions, signed webhooks, account ownership, renewals, cancellations, refunds, and server-authoritative entitlement reconciliation.

### 9. RevenueCat and Google Play Android subscriptions

- Status: **Not verified for release**.
- Owner: Product owner and engineering.
- Evidence: active Play products, correct RevenueCat mapping, signed webhooks, purchase and restore, renewals, revocations, and ownership tests.

### 10. Privacy, resilience, and operations

- Status: **Implemented / unverified in production**.
- Owner: Product owner and operations.
- Evidence: privacy and GDPR review for final data flows, backup/restore drill, access audit, alerts, security checks, and documented rollback.

### 11. Android release and Play listing

- Status: **Blocked**.
- Owner: Product owner and QA.
- Evidence: approved app icon, signed EAS Android App Bundle, Play Console declarations, test release installed on physical devices, and verified support/privacy URLs.

### 12. End-to-end release acceptance

- Status: **Not verified**.
- Owner: QA and product owner.
- Evidence: production-like web and Android tests, accessibility including TalkBack, offline recovery, load and restart behavior, critical-path checks, and staged rollout signoff.

## Priorities

1. Establish secure, observable staging for web, API, admin, database, authentication email, and mobile API routing.
2. Verify the family budget journey, truthful destination news, and commercial flight/accommodation providers.
3. Test web Stripe and Android RevenueCat/Play billing against real test accounts and server entitlements.
4. Connect the owned `vikwora.com` domain, complete release policies, approve Android artwork, and run Google Play internal testing.
5. Validate accessibility, real-device behavior, monitoring, backups, incident procedures, and staged rollout.

## Owner actions

At each external account or domain step, provide the provider dashboard URL, why it is needed, secure configuration instructions, and a verification checklist. Do not request passwords, API secrets, signing keys, or service-account JSON in chat.

## Reference documents

- [Google Play release checklist](GOOGLE-PLAY-RELEASE-CHECKLIST.md)
- [Production domain readiness](PRODUCTION-DOMAIN-READINESS.md)
- [External provider integration](external-services.md)
- [Deployment](deployment.md)
- [Current workflow](CURRENT-WORK.md)

## Evidence log

- 2026-10-20: Baseline set at `996ae5f2314baeb4d71926a18b474b53b047b516` with independent successful run `39472214975`. No production launch gate is claimed verified without production evidence.
