# AttraVoya Pro — Launch readiness tracker

Status baseline: 2026-10-20. Evidence commit: `996ae5f2314baeb4d71926a18b474b53b047b516` (independent five-job push CI passed in run 39472214975).

> **Do not confuse implementation with launch verification.** A green CI build establishes repository checks, not a working public booking/payment flow or successful Google Play release. This is an evidence-oriented checklist, not a calculated project-completion percentage.

## Current snapshot

- **Engineering baseline:** Web, server, admin and Android workspaces are present, with automated quality, database, security, production-build and no-cost-provider checks.
- **Launch status:** **Not release-ready.** Deployment, live inventory/prices, real billing flows, signed mobile delivery and manual production testing have not been independently verified.
- **PR discipline:** No new slice until prior merge's exact `develop` push SHA is independently 5/5 green.
- **Public domain:** `vikwora.com` is owned, but domain ownership is *not* proof DNS, HTTPS or live app deployment are configured. See [production domain readiness](PRODUCTION-DOMAIN-READINESS.md).

## How to update progress without false precision

For each release gate below, set one of **Implemented / Verified / Blocked / Not started / Not checked**, attach evidence (commit, CI run, production URL verification, receipt, or Play test report) and the responsible owner. Count a gate as **Verified** only when its specified acceptance evidence exists. Do **not** convert a count of PRs or green jobs into a launch-completion percentage.

| Gate | Current state | Evidence needed to mark Verified | Owner |
| --- | --- | --- | --- |
| Automated source and production build checks | **Verified on baseline only** | Five successful jobs on the exact final `develop` commit | Engineering |
| Web budget planner, trip management and family requirements | **Implemented / production unverified** | Browser end-to-end journeys, budget reconciliation, child/family profiles and error/empty states on production | Engineering + QA |
| Destination news/safety awareness | **Implemented / production unverified** | Freshness labels, source publication dates, no unsupported safety claims, provider failure tests and traveller-facing UX check | Engineering + QA |
| Real flight prices and booking inventory | **Blocked** | Approved commercial provider, account/configuration, contractual permission, live price/availability provenance and real booking-path tests | Owner + engineering |
| Real accommodation prices and availability | **Blocked** | Inventory provider integration, verified pricing, taxes/fees/cancellation and no invented availability | Owner + engineering |
| Production web/API/admin and custom domains | **Blocked** | Confirmed hosting targets, DNS, valid TLS, live health/routes, authentication, CORS/callbacks, policy pages | Owner + operations |
| Transactional authentication email | **Not checked in production** | Verified sender and successful register/verify/reset delivery with audit-safe evidence | Owner + operations |
| Stripe web checkout and entitlement lifecycles | **Implemented / production unverified** | Live-configured checkout, verified webhook events, refund/cancel/renewal flows and reconciliation | Owner + engineering |
| Google Play / RevenueCat Android subscriptions | **Not verified for release** | Production products, webhook and ownership verification, purchase/restore/renewal/cancel/revoke tests, no client-authoritative entitlement | Owner + engineering |
| Data privacy, retention, security and incident response | **Implemented / production unverified** | Deployment-specific GDPR/privacy review, backup restore drill, monitoring/alerting, access control and security signoff | Owner + operations |
| Android signed release and Play listing | **Blocked** | Approved artwork, EAS signed AAB, Play Console declarations, internal test on physical devices, staged rollout plan | Owner + QA |
| Final end-to-end and accessibility release gate | **Not verified** | Real-device web/Android regression, screen readers, network outages, recovery, load/soak and rollback evidence | QA + owner |

## Prioritized release milestones

1. **Testable staging:** Identify hosting accounts, provision staging web/API/admin and database; verify HTTPS, real sign-in and email, health checks, error monitoring and safe rollback. Keep production credentials out of Git.
2. **Truthful core travel journey:** Validate family budget planning and destination safety/news freshness. Select and integrate approved providers for *real* flight fares and accommodation room inventory; clearly separate estimates and live prices.
3. **Revenue and data integrity:** Test web Stripe billing and Android RevenueCat/Google Play lifecycle against real provider sandbox/test accounts; confirm server-authoritative entitlements.
4. **Production and store gate:** Configure `vikwora.com` hostnames, policies/support contacts, final Android icon/assets, store declarations, EAS signing, Play internal testing and staged release.
5. **Operate safely:** Verify backup restore, observability, alerts, privacy/GDPR disclosures, accessibility, crash recovery and incident process before public access widens.

## Operator handoff (when a gate requires owner action)

Provide the exact provider website/dashboard, reason, non-secret configuration steps and post-configuration test. Never ask for a password, API secret, service-account JSON or signing key in chat. Confirm real values in the provider's secret manager and evidence separately before marking a gate verified.

## Related source-of-truth checklists

- [Google Play release checklist](GOOGLE-PLAY-RELEASE-CHECKLIST.md)
- [Production domain readiness](PRODUCTION-DOMAIN-READINESS.md)
- [External providers and truthfulness boundaries](external-services.md)
- [Deployment](deployment.md)
- [Current-work release invariant](CURRENT-WORK.md)

## Release updates

| Date | Change | Evidence |
| --- | --- | --- |
| 2026-10-20 | Baseline tracker created; no public launch gate claimed complete without production evidence | Exact `develop` `996ae5f2314baeb4d71926a18b474b53b047b516`, push CI 39472214975 (5/5 green) |
