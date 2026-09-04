# AttraVoya Pro

**Discover more. Travel smarter. Stay safer.**

AttraVoya Pro is a destination-first global travel platform being built as a JavaScript monorepo. The customer website, administration portal, mobile application, API, database, localization, provider integrations, and security controls live in one repository while remaining separate applications/packages.

> Development status: active foundation build. Empty scaffold files are being implemented phase by phase and are not considered complete merely because they exist.

## Applications

- `apps/web` — Next.js customer website.
- `apps/admin` — separate Next.js administration portal.
- `apps/mobile` — Expo / React Native application.
- `apps/server` — Fastify REST API.

## Shared packages

- `packages/database` — Prisma + PostgreSQL access.
- `packages/api-client` — shared API client contracts/helpers.
- `packages/validation` — shared Zod validation.
- `packages/constants` — roles, permissions, entitlements, limits, and feature flags.
- `packages/design-tokens` — reusable visual design tokens.
- `packages/localization` — global country/language/currency reference and locale helpers.
- `packages/utilities` — environment-neutral helpers.

## Local prerequisites

The repository currently targets:

- Node.js `>=24.20.0 <25`
- pnpm `>=11.22.0 <12`
- Docker with Docker Compose

Run the environment diagnostic before starting services:

```bash
node scripts/check-environment.js
```

## First local setup

1. Install the required Node.js version and enable pnpm through Corepack.
2. Generate a private local `.env`:

```bash
node scripts/setup-development.js
```

The setup script creates strong **local-development-only** secrets when fields are blank. It never invents external provider API keys.

3. Validate the core environment:

```bash
node scripts/validate-env.js
```

4. Start PostgreSQL and LibreTranslate:

```bash
docker compose up -d
```

5. Install dependencies:

```bash
pnpm install --no-frozen-lockfile
```

The current Phase 1 security baseline upgraded Next.js to `16.3.4`. The first install refreshes the lockfile to that security-fixed version; normal installs can use `pnpm install` afterward.

6. Generate the Prisma client:

```bash
pnpm db:generate
```

7. Start the API or full workspace:

```bash
pnpm dev:server
# or
pnpm dev
```

## Local service ports

| Service        | Local address           |
| -------------- | ----------------------- |
| Website        | `http://localhost:3000` |
| Admin          | `http://localhost:3001` |
| API            | `http://localhost:5000` |
| LibreTranslate | `http://localhost:5001` |
| PostgreSQL     | `localhost:5432`        |

PostgreSQL and LibreTranslate are bound to `127.0.0.1` by Docker Compose so the local development services are not exposed directly to other machines on the network.

## API health checks

Once the API is running:

```text
GET /api/v1/health/live
GET /api/v1/health/ready
```

- **Liveness** proves the Node.js API process can answer requests.
- **Readiness** also checks PostgreSQL before reporting that the service is ready for real traffic.

Each response includes an `x-request-id` header that can be matched with backend logs when diagnosing a failure.

## External APIs

Development intentionally supports free/free-tier providers. Missing provider credentials should produce a clear unavailable state for that feature; they must never be replaced with fake runtime travel data.

The project currently plans adapters for Geoapify, Open-Meteo, Frankfurter, LibreTranslate, Ticketmaster, NewsData.io, Pexels, Resend, and later live flight/accommodation providers.

## Security baseline

Security is implemented throughout development rather than appended at release. The server foundation includes environment validation, secret-safe structured logging, request IDs, security headers, restricted CORS, signed-cookie support, global rate limiting, and sanitized centralized errors. Authentication, RBAC, entitlement checks, and feature-specific security are implemented in their dedicated phases.

Never commit `.env`, credentials, tokens, API keys, private keys, or real production secrets.

## Development rule

A feature is not complete because a file exists or a page renders. It must also have working behavior, validation, authorization where required, error/loading/empty states, translation, accessibility, responsive behavior, and tests appropriate to its risk.

## Budget-first domain foundation

AttraVoya Pro treats affordability as a core product capability. A traveller can provide an origin, total budget, dates/flexibility, party composition (including children's ages), interests, and comfort level. The domain model can recommend destinations that fit the budget, explain cost ranges and confidence, preserve a safety reserve, recalculate cheaper scenarios, and later compare planned costs with actual trip expenses.

See `docs/database.md` and `docs/decisions/0002-budget-first-domain-model.md` for the database and architectural reasoning.

## Working roadmap

The current engineering/learning roadmap is maintained in `WORKING-PLAN.md`. The project is built in controlled phases with verification and a clean checkpoint before moving forward.

## Accommodation and whole-trip lodging value

AttraVoya Pro does not assume every traveller wants a hotel. Planning supports guest houses, bed & breakfasts, hostels, short-term/weekly rentals, serviced apartments, aparthotels, vacation homes and other legitimate stay types. Lodging ranking is designed to consider total trip impact — including food and local transport where reliable estimates are available — instead of sorting only by nightly room price.

## Global localization foundation

AttraVoya Pro includes all 249 ISO 3166-1 country codes in the shared localization package. Country names are localized with JavaScript `Intl.DisplayNames`, while country, preferred UI language and preferred currency remain independent preferences. The initial UI message set covers 18 locales, including Arabic RTL metadata.

Run `pnpm translations:check` to verify that every enabled locale has the same message keys and no blank translations. Interface localization is separate from the traveller translation API; verified emergency information is separate from both.

See `docs/localization.md`.

## Professional customer design foundation

Phase 5A establishes the original AttraVoya Pro customer visual system: semantic light/dark themes, editorial travel layouts, Lucide icons, responsive search, a distinct budget-first entry path, mobile navigation, consent-gated recent searches, and translated authentication screens. The design deliberately avoids generic AI/SaaS visual patterns and does not use fabricated travel prices, ratings or statistics to make the interface look complete.

See `docs/design-system.md`, `docs/accessibility.md`, and `PHASE-5A-REPORT.md`.

## Real provider platform — Phase 6A

The first provider adapters are now implemented behind provider-neutral contracts:

- Geoapify — destination autocomplete, nearby places, geocoding/routing foundation, and accommodation locations;
- Open-Meteo — current weather and forecast;
- Frankfurter v2 — approximate currency rates/conversion;
- LibreTranslate — local traveller-entered text translation.

The provider HTTP layer adds timeouts, controlled transient retries, rate-limit handling, safe provider errors, and bounded caches. Traveller-entered translation text is not cached. Geoapify accommodation records are treated as location data only: live room price, availability, cancellation and amenity data remain unavailable until a real inventory provider is connected.

Run the dependency-light adapter check with:

```bash
pnpm providers:smoke
```

See `docs/external-services.md` and `PHASE-6A-REPORT.md`.
