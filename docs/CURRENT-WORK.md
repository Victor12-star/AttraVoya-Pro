# AttraVoya Pro — Current Work

This is the authoritative development handoff for `Victor12-star/AttraVoya-Pro`.

## Release invariant

Every feature slice must follow this sequence without shortcuts:

1. Confirm the exact `develop` HEAD and its exact push CI run.
2. Confirm all five canonical CI jobs completed successfully on that exact SHA.
3. Create a feature branch from that exact SHA.
4. Implement and test the slice on the feature branch.
5. Open a pull request to `develop`.
6. Confirm all five canonical jobs completed successfully on the exact final PR head.
7. Squash-merge using the exact expected PR head SHA.
8. Confirm the exact resulting `develop` SHA.
9. Confirm an independent push-triggered CI run on that exact `develop` SHA has all five canonical jobs green before starting another slice.

The five canonical jobs are:

- Code quality and unit tests
- Dependency and secret checks
- Live no-cost provider checks
- Production builds
- PostgreSQL and Prisma verification

Never infer 5/5 from workflow-level status alone; inspect the individual jobs. Do not bypass checks, weaken workflows, or push feature work directly to `develop`.

## Current fully verified release

Phase 9W — itinerary-aware Travel Companion destination/language selection — is complete.

- PR: `#82`
- Final PR head: `68ffb64437dfab095d92a0becb998ef567e20857`
- Final PR CI run: `34381531508`
- Result: all five canonical jobs passed
- Squash-merged `develop` SHA: `05da4337dfb0ec8790f40cfe31de4a36ce11506e`
- Independent post-merge push CI run: `34381990044`
- Result: all five canonical jobs passed

Phase 9W adds an authenticated, owner-scoped Trip read path for Travel Companion, keeps the response bounded and `private, no-store`, prefers the current `ACTIVE` trip and otherwise the nearest `PLANNED` trip, can safely select the saved trip destination/language, allows manual override at any time, and does not expose trip notes, budgets, expenses, accommodation details, provider IDs, passport data, or itinerary item contents.

## Previous verified Travel Companion release

Phase 9V — grounded Travel Companion assistant — is complete.

- PR: `#81`
- Final PR head: `4196edcfe229d4fbb86c4c756bbfe4d44dd48868`
- Final PR CI run: `34371785290`
- Result: all five canonical jobs passed
- Squash-merged `develop` SHA: `a06f3f54446084a55851ac0f6506d0f6b91246fb`
- Independent post-merge push CI run: `34372221954`
- Result: all five canonical jobs passed

Phase 9V remains deliberately grounded rather than pretending a general AI provider exists. `apps/server/src/integrations/ai/` is still only a reserved provider boundary. The Travel Companion assistant answers only from approved AttraVoya contracts, routes embassy/lost-passport questions to Travel Emergency Mode, declines unsupported questions, and keeps conversation history session-only rather than persisting user prompts.

## Travel Companion safety boundaries that remain mandatory

Preserve the completed Phase 9U/9V/9W rules:

- embassy discovery uses the provider-neutral places boundary and Geoapify's documented `office.government.embassy` category;
- do not invent a separate consulate provider category;
- optional precise location used by embassy discovery stays runtime-only;
- provider phone, website, opening hours, or passport procedures are not presented as officially verified government information;
- lost/stolen-passport guidance remains generic and directs users to the responsible authority for exact requirements;
- no fake LLM/model claim until a real provider is implemented behind the reserved AI boundary;
- no invented emergency number, consular contact, hotel availability, price, weather, flight, visa, passport rule, or other unsupported fact;
- emergency source URLs remain restricted to safe HTTP/HTTPS normalization and verified source/verification metadata remains visible;
- owner-scoped trip context remains authenticated, bounded, data-minimized, and `private, no-store`;
- manual destination choice must not be overwritten unexpectedly by later trip-context loading;
- all 18 maintained UI locales, accessibility, mobile behavior, RTL, reduced-motion, and theme compatibility remain supported.

Obsolete Phase 9U PR `#79` was closed as superseded and must never be merged.

## Recent completed Travel Companion sequence

- Phase 9K — translation provider safety hardening
- Phase 9L — Travel Companion language foundation
- Phase 9M — two-way local-language interpreter
- Phase 9R — Taxi/Driver Card
- Phase 9T — Travel Emergency Mode
- Phase 9U — embassy discovery and lost-passport assistance
- Phase 9V — grounded conversational assistant foundation
- Phase 9W — itinerary-aware destination/language selection

## Current next-work status

No post-Phase-9W feature slice is explicitly designated in the live repository at this checkpoint. Do not invent a Phase 9X name or restart a completed Travel Companion slice.

Two standing production programs remain open but are not, by themselves, an instruction to start an arbitrary implementation slice:

- GitHub Issue `#40` / `docs/SCALABILITY-RELIABILITY-UX-REQUIREMENTS.md` — broad incremental production scalability, reliability, performance, resilience, observability, privacy, and UX requirements.
- GitHub Issue `#36` / `docs/PRIVACY-ANALYTICS-ADMIN-MONITORING.md` — privacy-conscious analytics/admin monitoring. Its sequencing explicitly defers implementation until the necessary authoritative product/subscription actions exist and before final release hardening. The analytics dashboard is admin-only and must never appear in the normal traveller application.

Before starting the next product slice, inspect the live repository, open issues/PRs, roadmap, and current product gaps from the latest verified `develop`. Repository state wins over this document if newer verified work has landed.
