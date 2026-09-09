# AttraVoya Pro — Next Chat Handoff

Continue `Victor12-star/AttraVoya-Pro` from the exact live repository state. Do not repeat completed work.

## First action in a new chat

1. Fetch `develop` and record its exact SHA.
2. Inspect the exact push-triggered CI run attached to that SHA.
3. Verify all five canonical jobs individually rather than relying on workflow-level success.
4. Re-read `docs/CURRENT-WORK.md` and this file from that exact SHA.
5. Inspect open pull requests/issues and the live roadmap before choosing any new feature slice.
6. Do not restart Phase 9V or Phase 9W; both are already fully released and post-merge verified.

## Current fully verified release

Phase 9W — itinerary-aware Travel Companion destination/language selection — is complete.

- PR: `#82`
- Final PR head: `68ffb64437dfab095d92a0becb998ef567e20857`
- Final PR CI run: `34381531508`
- All five canonical jobs passed
- Exact squash-merged `develop`: `05da4337dfb0ec8790f40cfe31de4a36ce11506e`
- Post-merge push CI run: `34381990044`
- All five canonical jobs passed

The Phase 9W read contract is authenticated and owner-scoped, bounded to relevant active/planned trips, `private, no-store`, and data-minimized. It supports safe automatic current-destination/language selection while preserving manual override. Do not expand it casually to expose trip notes, budgets, expenses, accommodation details, provider IDs, passport data, or itinerary item contents.

## Previous verified release

Phase 9V — grounded Travel Companion assistant — is complete.

- PR: `#81`
- Final PR head: `4196edcfe229d4fbb86c4c756bbfe4d44dd48868`
- Final PR CI run: `34371785290`
- All five canonical jobs passed
- Exact squash-merged `develop`: `a06f3f54446084a55851ac0f6506d0f6b91246fb`
- Post-merge push CI run: `34372221954`
- All five canonical jobs passed

## Critical Travel Companion boundaries

- The server AI integration remains only a reserved provider boundary; do not fake an LLM/model call or branding.
- Ground answers in approved AttraVoya contracts and explicitly decline unsupported questions rather than hallucinating.
- Keep Travel Companion conversation history session-only unless a later privacy-reviewed design explicitly changes that rule.
- Embassy discovery uses the provider-neutral places boundary and Geoapify's documented `office.government.embassy` category; do not invent a separate consulate provider category.
- Do not present provider phone/site/opening-hours/passport-procedure fields as officially verified government information.
- Preserve verified emergency provenance and safe HTTP/HTTPS source-link normalization.
- Do not invent emergency contacts, consular contacts, travel prices, hotel/flight availability, weather, visa/passport rules, or other unsupported live facts.
- Preserve all 18 maintained UI locales, accessibility, mobile behavior, RTL, reduced-motion, and theme behavior.

Obsolete Phase 9U PR `#79` was closed as superseded and must never be merged.

## Release rule

Every new slice must use the normal gate:

1. start from the latest exact `develop` SHA whose push CI has all five jobs green;
2. create a dedicated branch;
3. open a PR into `develop`;
4. exact final PR head must pass all five canonical jobs;
5. squash-merge using expected-head protection;
6. exact resulting `develop` SHA must independently pass all five canonical jobs on a push-triggered run before any later slice starts.

The canonical jobs are:

1. Code quality and unit tests
2. Dependency and secret checks
3. Live no-cost provider checks
4. Production builds
5. PostgreSQL and Prisma verification

Never weaken CI, security, privacy, provider-honesty, accessibility, or data-integrity controls to get green status.

## Next-work status

There is no explicitly designated post-Phase-9W feature slice in the repository at this checkpoint. Do not invent a Phase 9X label merely to keep numbering moving.

Standing open production programs include:

- Issue `#40`: scalability, reliability, performance, resilience, observability, privacy, and user-experience readiness. This is a broad incremental program and should be split into coherent reviewable slices based on the live architecture and measured need.
- Issue `#36`: privacy-conscious analytics and admin monitoring. Its specification explicitly says to implement it after the necessary authoritative product/subscription actions exist and before final release hardening. The analytics dashboard is owner/admin-only and must never be exposed in the normal traveller application.

When continuing, re-inspect the latest verified repository state and choose the next coherent slice only when it is supported by the live roadmap/product gaps or an explicit owner instruction. Repository state always wins over this handoff if newer verified work has landed.
