# First owner setup (restricted operation)

AttraVoya Pro has **no public administrator registration**. The initial Super Admin must first exist as an ordinary traveler account, with a verified email and active status. Only a trusted database operator can grant the first owner role. Never put database credentials, user passwords, or the operator's email in GitHub source files or commit messages.

## Preconditions

1. Confirm the target staging/production PostgreSQL database, approved owner identity, and operational authorization outside the repository. Do not point the script at an unverified database.
2. Register the intended owner through the normal AttraVoya Pro public account flow and complete email verification. The account must be active.
3. Ensure the roles and permissions seed has been applied and that **no existing Super Admin** is present.
4. Use a trusted operator environment with the correct, privately configured `DATABASE_URL` and generated Prisma Client. Do not invoke this from the browser, client application, or a public HTTP route.

## One-time provision

From the repository root, using a trusted execution environment:

```bash
FIRST_OWNER_EMAIL='approved-owner@example.com' FIRST_OWNER_APPROVED=yes pnpm --filter @attravoya/database exec node scripts/provision-first-owner.js --confirm-first-owner
```

Substitute the actual approved account email privately. The example address is not a real account or a default owner. Do not enter a password into the script or write credentials into shell history. Prefer injecting `FIRST_OWNER_EMAIL` through a protected environment instead of writing it into a command.

The script locks the operation inside a serializable database transaction, refuses to run if any Super Admin role assignment already exists, and records an immutable administrative audit event. A normal sign-in remains required after provisioning.

## Operational notes

- This script **does not create accounts**, bypass email verification, reset passwords, or generate credentials.
- If a Super Admin exists, stop. Do not remove roles to rerun the bootstrap; use a separately reviewed role-management recovery process.
- Confirm role assignment by logging in through the Admin Staging URL and viewing authorized analytics.
- A later phase will introduce secure owner-issued admin invitations and granular permission management. This script only establishes the first owner.
- The admin login currently uses the existing backend authentication and an HTTP-only same-origin session proxy. Multifactor authentication and account recovery for privileged users remain launch requirements.
