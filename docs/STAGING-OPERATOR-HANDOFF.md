# Staging operator handoff — AttraVoya Pro

This is an operator input sheet, not a declaration that staging exists. Use it with [staging acceptance evidence](STAGING-DEPLOYMENT-EVIDENCE.md) and the [launch-readiness tracker](LAUNCH-READINESS-TRACKER.md).

## Confirm these non-secret facts before deployment

- **Web hosting service and project:** Not confirmed.
- **API hosting service and project:** Not confirmed.
- **Admin hosting service and project:** Not confirmed.
- **PostgreSQL hosting provider, project, and region:** Not confirmed.
- **Staging hostnames or provider-assigned preview URLs:** Not confirmed.
- **DNS manager for `vikwora.com`:** Not confirmed.
- **Support/privacy contact email domain:** Not confirmed.

Record the provider name, dashboard project identifier (not a token), environment label, and responsible operator for each. Never paste passwords, database URLs, API keys, personal data, billing credentials, or private service-account files into an issue or pull request.

## Owner workflow

1. Review your existing provider dashboards; determine whether the web, API, admin and PostgreSQL projects already exist. Avoid duplicate accounts and unnecessary paid services.
2. If they exist, document only their names, staging/production labels, regions and non-secret provider-assigned URLs.
3. If any component does not exist, choose an appropriate host only after assessing application requirements, data region, database connections, backup support and expected costs.
4. Configure staging services and credentials **inside their own secret managers** after the project identities have been confirmed. Do not set production domain DNS or switch live billing on during this phase.
5. Run the acceptance tests in [staging deployment evidence](STAGING-DEPLOYMENT-EVIDENCE.md). Mark each gate verified only with real deployment evidence.
6. Then plan domain mapping according to [production domain readiness](PRODUCTION-DOMAIN-READINESS.md). `vikwora.com` is owned; no DNS target, SSL configuration, or public availability is presumed.

## Minimum staging acceptance

- Web, API and admin respond at confirmed HTTPS staging URLs.
- API health/readiness, database migrations and backups pass.
- Web and Android test sessions use only approved staging API endpoints.
- User sign-up, verification email, password reset and deletion work.
- Third-party failures are handled safely and estimated prices are not represented as live booking inventory.
- Monitoring and alert delivery are proved; rollback restores a known-good version.

## Follow-up decision

Once the non-secret provider inventory is known, create a separate configuration plan tailored to the actual provider dashboards, with safe step-by-step UI instructions. Do not invent DNS records, API secrets, pricing tiers, or live integrations.
