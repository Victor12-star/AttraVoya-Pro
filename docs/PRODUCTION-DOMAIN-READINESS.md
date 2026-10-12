# Production domain readiness — vikwora.com

## Status and safety boundary

Victor has acquired `vikwora.com` for AttraVoya Pro. Ownership alone does not prove DNS control, hosting availability, HTTPS, application health or that any URL is publicly accessible. This is a release checklist, not evidence of live deployment. Do not modify production environment variables or client settings until checks below pass. No registrar, DNS host, web host, API host or admin host is assumed.

## Proposed host mapping (not yet activated)

- `https://vikwora.com`: public web frontend; verify DNS, TLS, frontend response and public policy pages.
- `https://api.vikwora.com`: API server; verify DNS, TLS, expected API response and health/readiness endpoints.
- `https://admin.vikwora.com`: admin frontend; verify DNS, TLS, sign-in routing and access controls.

Public policy URLs proposed under the web origin: `/privacy`, `/terms`, and `/delete-account`. Do not advertise them to Google Play until the final public pages are actually reachable and accurate.

## Required operator facts before configuring DNS

Ask the owner to identify: (1) where DNS for `vikwora.com` is currently managed; (2) the hosting platform, service/project and custom-domain instructions for public web, API and admin; (3) which environment is staging versus production; (4) the planned support/privacy contact mailbox and whether email hosting is configured. Do not request passwords, registrar login credentials, provider secret keys or DNS account tokens in chat.

For each host, obtain the **exact** DNS record type, name and target specified by that host's own provider dashboard. Do not invent IP addresses or CNAME targets. Avoid overwriting existing records, email records, or unrelated services. Keep the existing functioning domains available while testing.

## Deployment sequence and verification gates

1. Confirm that the three intended hosting services already exist, identify their production deployment and test their provider-assigned URLs before custom-domain changes.
2. Add each custom hostname in the matching hosting provider dashboard and record the provider's ownership verification instructions.
3. Make only the DNS edits explicitly required for those verified hosting targets. Check for conflicting records, and preserve MX/TXT records used by email.
4. Verify that DNS resolves to the expected hosting configuration; allow propagation without assuming a fixed completion time.
5. Verify that valid TLS certificates are issued and HTTPS works for all three hostnames. Check redirects and avoid redirect loops. Do not disable certificate validation.
6. Verify each app responds correctly at its hostname. For the API, check normal response and configured liveness/readiness behavior without exposing secrets or private data. Confirm the admin interface is protected, not simply reachable.
7. Test the public `/privacy`, `/terms`, and `/delete-account` pages directly in a private browser session. Check content, links, and account-deletion accuracy.
8. Confirm web/admin API routing and cross-origin resource sharing (CORS) allowlists, cookies/session scope, redirect/callback allowlists, and all OAuth integrations against the exact final origins.
9. Only after steps 1–8 pass, set deployment environment values as appropriate: `WEB_URL=https://vikwora.com`, `ADMIN_URL=https://admin.vikwora.com`, `API_URL=https://api.vikwora.com`. Use production API and web base URLs for production mobile builds. Apply configuration through approved deployment secret/config interfaces; never commit credentials.
10. Validate a production build, sign-in/out, private user boundaries, account deletion, subscription status, provider failures, and browser/mobile recovery behavior. If any safety-critical check fails, roll back the environment change and keep existing working origins.
11. Update Google Play policy/account-deletion links and any OAuth callback allowlists only after the referenced public URLs are verified. Store deployment evidence without secrets or personal information.

## Release evidence to record

Record the verified date, deployment commit, provider project identities (non-secret), final hostname mappings, DNS verification outcome, TLS certificate status, web/admin/API smoke-test outcomes, policy page reachability, CORS/callback review, mobile build configuration review, and rollback readiness. Never publish DNS provider credentials, API keys, private user information or payment tokens.

## External account and manual steps

DNS registration, provider custom-domain setup, certificate issuance where manual, mailbox creation, store console updates and provider OAuth configuration may require Victor's action. Stop at the relevant step, explain which website/dashboard is required and guide him through it. Do not silently assume an external integration has been activated.
