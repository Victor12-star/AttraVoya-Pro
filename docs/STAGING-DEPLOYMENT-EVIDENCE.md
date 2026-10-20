# Staging Deployment Evidence — AttraVoya Pro

This checklist turns [launch readiness](LAUNCH-READINESS-TRACKER.md) into a concrete staging acceptance gate. It records no assumptions about provider accounts, live hostnames, credentials, or completed deployment.

## Staging must be separate from production

Use dedicated staging configuration for the web, API, admin interface and PostgreSQL database. Protect staging with access controls where appropriate. Do not reuse production user records, payment transactions, encryption keys or provider secrets. Keep the public custom domain `vikwora.com` unchanged until provider-assigned staging URLs have been verified.

## Non-secret inventory to fill in during deployment

| Component | Provider/project reference | Provider-assigned staging URL | Verified |
| --- | --- | --- | --- |
| Web frontend | Not provided | Not verified | No |
| API server | Not provided | Not verified | No |
| Admin frontend | Not provided | Not verified | No |
| PostgreSQL database | Not provided | Internal service, not public | No |
| Transactional email | Not provided | Sender domain not verified | No |
| Error monitoring | Not provided | Monitoring dashboard not verified | No |

Do not store connection strings, private dashboard links containing tokens, service credentials, personal data, or provider secrets in the repository.

## Operator setup sequence

1. Identify the actual deployment provider, project name, intended region, and whether staging already exists for web, API, admin and database. Record non-secret identifiers only.
2. Deploy an exact independently five-job-verified `develop` commit to staging; record the SHA and immutable build identifiers.
3. Populate required staging environment settings in the provider's secret manager. Use staging-only database, cryptographic secrets, payment testing mode and email configuration. Never copy `.env` secrets into GitHub.
4. Verify PostgreSQL migrations and restricted application connection permissions. Confirm backups, retention, and a restore rehearsal using non-production data.
5. Verify the staging API health/readiness behavior over HTTPS. Ensure private operational endpoints and administration cannot be reached anonymously.
6. Verify staging web/admin use the intended API, cookie scope, Cross-Origin Resource Sharing (CORS) origin allowlists and authentication callback URLs.
7. Exercise registration, verification email, login, logout, password reset, account deletion and recovery; confirm no real paid provider call is presented as simulated live pricing.
8. Exercise a family budget journey, destination news freshness/provenance, empty provider responses, network timeouts and device/browser error recovery.
9. Verify server errors, saturation alerts, incident notification and deployment rollback from a deliberately failed staging release.
10. Record dated evidence and owner signoff before changing production DNS, mobile release configuration or payment enablement.

## Acceptance matrix

| Acceptance gate | Evidence required | State |
| --- | --- | --- |
| Source integrity | Exact deployed commit and five-job independent CI link | Not verified |
| HTTPS and health | Provider-assigned staging URLs, certificate and health proof | Not verified |
| Database resilience | Migration status, backup and completed restore drill | Not verified |
| Authentication | Non-production registration/verify/reset/delete test report | Not verified |
| API/client isolation | Verified admin access, CORS, cookies and callback settings | Not verified |
| Provider truthfulness | Live-versus-estimate labels and failure recovery test report | Not verified |
| Monitoring | Real alert trigger and safe incident response evidence | Not verified |
| Rollback | Completed rollback drill, prior release restored | Not verified |
| Stakeholder acceptance | Owner/QA review of staging critical paths | Not verified |

## External decisions that require the product owner

Before any environment can be configured, confirm the real **hosting platforms** for web, API, admin and PostgreSQL, the existing projects versus new staging instances, and where DNS for `vikwora.com` is managed. Also confirm the support/contact email domain and approved external integrations. Ask for provider names and non-secret project identifiers, never credentials.

When provider facts are known, give the operator the provider-specific dashboard link, exact safe UI steps and test commands. Do not invent DNS targets, announce a deployment, or mark evidence verified from a passing CI build alone.

Related references: [production domain readiness](PRODUCTION-DOMAIN-READINESS.md), [release tracker](LAUNCH-READINESS-TRACKER.md), [deployment guide](deployment.md), and [production reliability runbook](DEPLOYMENT-RELIABILITY-RUNBOOK.md).
