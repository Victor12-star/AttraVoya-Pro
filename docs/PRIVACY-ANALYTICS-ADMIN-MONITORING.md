# Privacy-Conscious Analytics and Admin Monitoring

This document is a standing production requirement for AttraVoya Pro.

It must be implemented as a dedicated product/operations phase before production readiness is declared. It is intentionally separate from the current planner evidence work so analytics cannot weaken privacy, authorization, or travel-data honesty boundaries.

## Product goal

Give the owner/admin team enough aggregate information to understand product adoption, reliability, subscriptions, and core feature usage without turning analytics into unnecessary surveillance or exposing travellers' private data.

The admin experience must support at least:

- total registered users
- new registered users over selectable periods
- DAU: distinct active users over the last 24 hours
- WAU: distinct active users over the last 7 days
- MAU: distinct active users over the last 30 days
- Free users/subscribers
- Pro/Premium users/subscribers
- subscription starts, conversions, cancellations, expirations, and other useful entitlement/subscription aggregates
- trips created
- saved planning briefs created
- planner searches / destination-candidate searches
- accommodation searches
- flight searches when the flight feature becomes available
- other important product usage metrics added only when there is a documented operational or product reason
- high-level API/error/availability signals needed to operate the public application safely

Metric definitions must be documented and stable. The dashboard must label rolling windows clearly and must not silently change the meaning of DAU/WAU/MAU.

## Privacy and GDPR design rules

Analytics must follow privacy-by-design and privacy-by-default principles.

### Data minimization

Track only fields needed to calculate an approved metric, diagnose an operational problem, enforce security, or understand a documented product funnel.

Do not place the following into ordinary product analytics events:

- passwords, authentication secrets, tokens, cookies, or session credentials
- raw email addresses or phone numbers
- exact home addresses or unnecessary precise location history
- private trip notes or full itinerary contents
- traveller budgets or detailed financial circumstances unless a separately justified aggregate metric is explicitly approved
- children's names, identities, exact birthdays, or other unnecessary child-specific data
- health, accessibility, dietary, religious, political, biometric, sexual, or other sensitive/special-category information
- raw chat/support message bodies
- raw search text when a bounded category, resource ID, or non-identifying event dimension can answer the analytics question
- full provider payloads

Where a user-linked analytics key is genuinely needed, prefer a pseudonymous internal identifier rather than direct identifiers such as email. Aggregation should remove the need for user-level inspection wherever possible.

### Purpose limitation

Every tracked event and property must have:

- a documented purpose
- an owner
- a schema
- a retention rule
- a lawful-basis/consent assessment where applicable

Do not introduce open-ended event payloads that allow arbitrary personal data to be added later.

### Consent and legal basis

Essential security, fraud prevention, service-operation, and strictly necessary telemetry must be separated from optional product/marketing analytics.

Where EU/EEA law requires consent for non-essential client-side storage or tracking, the system must not activate that tracking before valid consent. Consent must be specific enough for the purpose, revocable, and reflected in the user's privacy controls.

Do not assume that all analytics require consent or that all analytics can rely on legitimate interests. The final implementation must document the applicable lawful basis per analytics purpose and obtain legal/privacy review before production launch.

### Retention and deletion

Retention periods must be configurable and documented before launch.

A sensible initial design target is:

- short-lived raw/pseudonymous product analytics events, normally no longer than needed to create aggregates
- longer-lived daily/weekly/monthly aggregate statistics where they no longer identify an individual
- separate retention rules for security/audit logs based on their distinct purpose

Exact production periods must be justified rather than kept indefinitely.

Account deletion, erasure, and privacy-request workflows must cover analytics data where required. If aggregates are truly anonymous and cannot reasonably be linked back to a person, they may be retained as anonymous statistics; this distinction must be documented.

### Data subject rights and transparency

The privacy notice/settings must explain, in understandable language:

- what analytics are collected
- why they are collected
- whether they are essential or optional
- retention approach
- relevant processors/providers if any
- how consent or analytics preferences can be changed where applicable
- how access, deletion, objection, restriction, and other applicable GDPR rights are handled

If an external analytics processor is ever adopted, require a privacy/security review, DPA, appropriate international-transfer safeguards, and suitable data-region configuration before enabling it.

## Secure analytics event architecture

Prefer server-generated events for authoritative business actions where possible, for example:

- ACCOUNT_REGISTERED
- AUTHENTICATED_ACTIVITY
- TRIP_CREATED
- PLANNER_REQUEST_CREATED
- PLANNER_SEARCH_EXECUTED
- ACCOMMODATION_SEARCH_EXECUTED
- FLIGHT_SEARCH_EXECUTED
- SUBSCRIPTION_STARTED
- SUBSCRIPTION_CHANGED
- SUBSCRIPTION_CANCELED

Client-side events should be used only when a server event cannot represent the needed product interaction, and must pass the same validation/minimization rules.

Analytics events must use an allowlisted schema. Reject unknown event names/properties instead of accepting arbitrary JSON blobs.

A production event should contain only the minimum fields needed, for example:

- event name/version
- event timestamp
- pseudonymous/internal actor ID when required
- coarse platform/client type when useful
- approved bounded dimensions such as feature name or resource category
- request/correlation ID only when operationally necessary and safe

Do not store raw IP addresses or full user-agent strings in the product analytics dataset merely for convenience. Security telemetry may have a separate, justified and shorter-lived treatment.

## Admin dashboard authorization

Analytics and monitoring are admin-only capabilities.

Add an explicit permission such as `analytics:read` / equivalent rather than relying only on a hidden route or UI check.

Requirements:

- server-side authorization on every analytics/admin API
- least-privilege RBAC for ADMIN and SUPER_ADMIN roles
- no ordinary USER role access
- MFA required for privileged production admin accounts where the authentication design supports it
- admin actions and sensitive dashboard access logged to the admin audit trail where appropriate
- no analytics secrets or privileged database credentials in browser/mobile clients
- private/no-store caching for privileged responses where applicable
- rate limiting and validation on admin analytics endpoints

The existing admin application can be the presentation surface, but it must consume protected server APIs; it must never connect directly to privileged database credentials from the browser.

## Dashboard privacy boundary

The default dashboard is aggregate-first.

It may show totals, trends, percentages, cohorts, funnels, and time-series charts, but it must not expose another traveller's private trip, budget, search history, child information, profile details, or other personal content merely because an admin wants product analytics.

Examples of acceptable aggregate views:

- 12,430 registered accounts
- 126 new registrations in the last 7 days
- DAU 1,020 / WAU 4,850 / MAU 12,100
- Free 10,700 / Pro 1,730
- 3,250 planning briefs created this month
- 8,420 destination searches this month
- conversion and retention trends

Avoid tiny cohort breakdowns that make an individual easy to infer. Suppress or combine very small groups when segmentation could create re-identification risk.

Any future user-level support/security console must be a separate capability with its own permissions, purpose, audit logging, and privacy justification. It must not be smuggled into the analytics dashboard.

## Metric correctness

Do not calculate active users from page views alone.

A user counts as active only after an approved meaningful authenticated activity event. The exact qualifying event set must be documented and tested.

For the initial definitions:

- DAU = distinct qualifying authenticated users over the previous 24 hours
- WAU = distinct qualifying authenticated users over the previous 7 days
- MAU = distinct qualifying authenticated users over the previous 30 days

Bots, health checks, admin monitoring, failed login attempts, and anonymous provider polling must not inflate active-user metrics.

Subscription metrics must be derived from authoritative plan/subscription state, not from UI clicks.

Trip/search metrics must be derived from successful authoritative actions. Failed requests can be counted separately as operational/error metrics but must not inflate successful usage totals.

## Scalable storage and aggregation

Initial production architecture may use PostgreSQL if load remains appropriate, but analytics must not degrade transactional travel-planning workloads.

Recommended shape:

1. validated append-only analytics event records or equivalent authoritative event capture
2. indexed/partition-friendly timestamps and event names
3. scheduled or incremental daily aggregate tables/materialized summaries
4. admin queries read aggregates for common dashboard views rather than repeatedly scanning raw events
5. retention jobs remove expired raw analytics data
6. aggregation is idempotent so retries cannot double-count metrics

If product scale later requires a dedicated analytics warehouse, migration must preserve the privacy and purpose restrictions in this document rather than exporting unrestricted production data.

## Operational monitoring is separate from product analytics

The admin/operations area should also surface high-level service health needed to operate AttraVoya Pro safely, for example:

- API error rate
- authentication failures/anomalies at an aggregate operational level
- provider health/configuration status
- important background-job failures
- database/service health
- request latency percentiles
- rate-limit/abuse signals
- deployment/build health where available

Operational/security telemetry must remain purpose-separated from product-behavior analytics even if both are presented in the same admin application.

## Required tests and security checks

The analytics phase is incomplete until tests cover at least:

- USER cannot access any analytics/admin metric endpoint
- authorized ADMIN/SUPER_ADMIN permissions behave as designed
- cross-user private data cannot leak into analytics responses
- event schema rejects unknown or disallowed personal-data fields
- active-user distinct counting is correct
- DAU/WAU/MAU window boundaries are correct
- subscription counts use authoritative subscription/plan states
- trip/search metrics do not double-count retries/idempotent events
- retention jobs remove expired raw data safely
- deletion/erasure workflows handle linked analytics data as designed
- consent-disabled optional analytics do not emit events where consent is required
- tiny cohort/privacy suppression rules work where segmentation is supported
- raw secrets/tokens/provider payloads cannot enter analytics events
- admin endpoints are rate-limited, validated, audited where appropriate, and return safe errors
- aggregate queries remain performant at realistic production-scale volumes

Include these controls again in the final release security/privacy review, threat model, OWASP testing, penetration-style testing, GDPR/data-protection review, and monitoring/incident-readiness phase.

## Implementation sequencing

Do not interrupt an active planner slice merely to bolt in partial tracking.

Implement this requirement as a dedicated, CI-gated production phase after the necessary authoritative product actions/subscription state exist and before final release hardening. The phase may be split into:

1. privacy/legal analytics specification and event allowlist
2. analytics data model + retention/aggregation infrastructure
3. authoritative server instrumentation
4. consent/privacy controls for any optional client telemetry
5. protected admin analytics APIs
6. admin dashboard UI
7. privacy/security/performance tests
8. documentation, retention jobs, monitoring, and release-readiness review

Every slice must follow the repository's existing exact-head five-job CI rule. Tests, authorization, privacy controls, retention rules, or CI must never be weakened to make the analytics dashboard pass.
