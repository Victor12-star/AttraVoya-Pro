# Staging Deployment Evidence — AttraVoya Pro

Staging is **not verified**. This checklist does not assert that an external account, hostname, credential, or deployment already exists.

## Staging isolation

Use dedicated staging configuration for web, API, admin, and PostgreSQL. Protect staging with appropriate access controls. Do not reuse production personal data, payment transactions, encryption keys, or credentials.

Keep `vikwora.com` unchanged until provider-assigned staging URLs are verified.

## Operator inventory

Record the provider, non-secret project identifier, staging URL (where applicable), and verification date for each component:

- Web frontend: **Not verified**.
- API server: **Not verified**.
- Admin frontend: **Not verified**.
- PostgreSQL database: **Not verified**; no public database URL.
- Transactional email: **Not verified**; sender domain unconfirmed.
- Error monitoring: **Not verified**.

Never commit connection strings, credentials, private tokenized URLs, or personal data.

## Deployment and verification sequence

1. Identify actual hosting providers, projects, regions, and any existing staging environments.
2. Deploy an exact independently five-job-verified `develop` commit; record its SHA and build identifier.
3. Configure staging-only database, encryption secrets, payment testing, and email through provider secret managers.
4. Verify database migration status, restricted access, backups, retention, and a restore drill with non-production data.
5. Check API HTTPS health/readiness and ensure administrative/operational endpoints reject unauthenticated access.
6. Confirm web and admin API routing, cookie scope, Cross-Origin Resource Sharing (CORS), and authentication callbacks.
7. Exercise registration, email verification, login, logout, password reset, account deletion, and session recovery.
8. Test family budgets, news timestamps and attribution, provider empty responses, timeouts, and safe error recovery.
9. Verify error monitoring, saturation alerts, incident response, and rollback to an earlier staging release.
10. Record evidence and owner approval before production DNS changes, mobile releases, or live payments.

## Acceptance gates

Every gate below is **Not verified** until the specified evidence is attached.

- **Source integrity:** exact deployed SHA, build identifier, and independently successful five-job CI run.
- **HTTPS and health:** staging hostnames, certificate, HTTPS, and health/readiness evidence.
- **Database resilience:** migrations, backup schedule, and successful restoration report.
- **Authentication:** non-production register, verify, reset, delete, and recovery test report.
- **Client isolation:** admin authorization, CORS, cookies, and callbacks validated.
- **Provider accuracy:** verified live-versus-estimate labeling and safe provider failure handling.
- **Monitoring:** test alert, notification, and incident response proof.
- **Rollback:** completed drill restoring a prior known-good release.
- **Acceptance:** owner and quality-assurance signoff on key web and Android flows.

## Actions requiring the product owner

Confirm the actual hosting platforms for web, API, admin, and database; which projects exist; where DNS for `vikwora.com` is managed; and the intended support email domain.

After providers are identified, use their official dashboard instructions and record verification evidence. Never request passwords, signing keys, secret tokens, or service-account JSON in chat. Never invent DNS records or claim a deployment is live without verification.

## Related guidance

- [Launch readiness tracker](LAUNCH-READINESS-TRACKER.md)
- [Production domain readiness](PRODUCTION-DOMAIN-READINESS.md)
- [Deployment guide](deployment.md)
- [Deployment reliability runbook](DEPLOYMENT-RELIABILITY-RUNBOOK.md)
