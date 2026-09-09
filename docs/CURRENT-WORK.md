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

## Last fully released slice

Phase 9U — Geoapify-backed embassy discovery and lost-passport assistance — is complete.

- PR: `#80`
- Final PR head: `2d48f66f5d9422271d90451ba133a768def9e419`
- Final PR CI run: `34354904041`
- Result: all five canonical jobs passed
- Squash-merged `develop` SHA: `d79f13c6c71239c8811b0e93b2fff85fa77fb25a`
- Independent post-merge push CI run: `34358073350`
- Result: all five canonical jobs passed

Phase 9U rules that must remain true:

- embassy discovery uses the provider-neutral places boundary and Geoapify's documented `office.government.embassy` category;
- do not invent a separate consulate provider category;
- precise location is optional and runtime-only for this feature;
- provider phone, website, opening hours, or passport procedures are not presented as officially verified government information;
- lost/stolen-passport guidance remains generic and directs users to the responsible authority for exact requirements;
- all supported UI locales, accessibility, RTL, and reduced-motion behavior remain supported.

Obsolete PR `#79` was closed as superseded and must never be merged.

## Current active slice

Phase 9V — grounded Travel Companion assistant.

Working branch:

`feature/phase-9v-grounded-travel-assistant`

Exact baseline:

`d79f13c6c71239c8811b0e93b2fff85fa77fb25a`

### Why this implementation is grounded rather than a fake AI chatbot

`apps/server/src/integrations/ai/` currently contains placeholder files only. No real general AI provider is configured. Phase 9V must therefore not claim that an AI model produced answers and must not fabricate a model integration.

The current foundation answers only from trusted AttraVoya contracts:

- destination language and useful-phrase answers: `/api/v1/phrasebook?countryCode=...`
- verified country-wide emergency contacts: `/api/v1/emergency?countryCode=...`
- embassy and lost-passport questions: route users to the dedicated Travel Emergency Mode from Phase 9U
- unsupported questions: explicitly decline rather than guess

### Phase 9V product and safety requirements

- destination-scoped questions;
- multilingual deterministic intent recognition for the maintained UI languages;
- strict normalization of provider/reference payloads before rendering;
- emergency source URLs must be HTTP/HTTPS only;
- verified emergency source name and verification date must remain visible;
- no invented emergency number, consular contact, hotel availability, price, weather, flight, visa, passport rule, or other unsupported fact;
- no general AI/model branding until a real provider is implemented behind the reserved AI boundary;
- conversation history is session-only React state and is not persisted by this feature;
- stale async responses must not overwrite a newer destination or answer;
- accessible keyboard/focus behavior, mobile layout, dark/light theme compatibility, RTL-friendly layout, and reduced-motion support;
- localized UI copy across all 18 maintained locales.

### Current Phase 9V files

- `apps/web/src/features/language/grounded-travel-assistant.jsx`
- `apps/web/src/features/language/grounded-travel-assistant-copy.js`
- `apps/web/src/features/language/grounded-travel-assistant.module.css`
- `apps/web/tests/unit/grounded-travel-assistant.test.jsx`
- `apps/web/src/app/(main)/language/page.jsx`

The assistant is composed into the existing Travel Companion page between the interpreter and Travel Emergency Mode. Do not create a parallel Travel Companion route.

## Recent completed Travel Companion sequence

- Phase 9K — translation provider safety hardening
- Phase 9L — Travel Companion language foundation
- Phase 9M — two-way local-language interpreter
- Phase 9R — Taxi/Driver Card
- Phase 9T — Travel Emergency Mode
- Phase 9U — embassy discovery and lost-passport assistance
- Phase 9V — grounded conversational assistant foundation — current slice

## Planned next gap after Phase 9V

The remaining Travel Companion gap explicitly deferred by the earlier interpreter work is itinerary-aware destination/language selection. Treat that as the likely next slice only after Phase 9V has been squash-merged and the resulting exact `develop` SHA independently passes all five canonical jobs.

Before beginning any later slice, inspect the live repository and current handoff again. Repository state always wins over this file if a newer verified release has already landed.
