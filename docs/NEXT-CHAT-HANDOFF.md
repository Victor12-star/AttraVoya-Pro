# AttraVoya Pro — Next Chat Handoff

Continue `Victor12-star/AttraVoya-Pro` from the exact live repository state. Do not repeat completed work.

## First action in a new chat

1. Fetch `develop` and record its exact SHA.
2. Inspect the exact CI run attached to that SHA and verify the five canonical jobs individually.
3. Inspect the current Phase 9V PR/branch state before making any change.
4. If Phase 9V is still open, continue only from its exact final head and fix any failing CI checks.
5. If Phase 9V is already merged, verify the independent push CI on the resulting exact `develop` SHA before starting the next slice.

## Last fully verified release before Phase 9V

Phase 9U is complete.

- PR `#80`
- final PR head: `2d48f66f5d9422271d90451ba133a768def9e419`
- final PR CI: `34354904041`, all five jobs green
- exact resulting `develop`: `d79f13c6c71239c8811b0e93b2fff85fa77fb25a`
- post-merge push CI: `34358073350`, all five jobs green

Obsolete Phase 9U PR `#79` was closed as superseded and must not be merged.

## Current slice

Phase 9V — grounded Travel Companion assistant.

Branch:

`feature/phase-9v-grounded-travel-assistant`

Baseline:

`d79f13c6c71239c8811b0e93b2fff85fa77fb25a`

### Intended behavior

- integrate into the existing `/language` Travel Companion page;
- choose a current destination;
- answer supported-language questions from the existing phrasebook contract;
- answer useful-phrase questions from the existing phrasebook contract;
- answer emergency questions only from verified country-wide emergency records, including source and verification metadata;
- route embassy/lost-passport questions to the dedicated Travel Emergency Mode;
- explicitly decline unsupported questions rather than hallucinating;
- keep conversation history session-only and do not persist user prompts;
- preserve mobile, accessibility, RTL, reduced-motion, and theme behavior;
- provide UI copy for all 18 maintained locales.

### Critical AI boundary

The server AI integration files are currently zero-byte placeholders. There is no configured general AI provider. Do not fake an LLM call, hard-code a provider claim, or imply a general AI model generated Phase 9V answers.

A future real conversational model may be added behind the reserved AI provider boundary, but it must preserve grounding, provenance, privacy, rate limiting, safety, and no-invented-live-data rules.

## Release rule

The exact final Phase 9V PR head must pass all five canonical jobs:

1. Code quality and unit tests
2. Dependency and secret checks
3. Live no-cost provider checks
4. Production builds
5. PostgreSQL and Prisma verification

Only then squash-merge with the exact expected head SHA. After merge, the exact resulting `develop` SHA must independently pass all five jobs on a push-triggered CI run before proceeding.

Never treat workflow-level success alone as 5/5; inspect each job.

## Likely next slice after Phase 9V

Itinerary-aware destination/language selection remains an explicitly deferred Travel Companion gap. Start it only after Phase 9V is fully released and post-merge verified. Re-inspect the live repository first in case a newer verified plan supersedes this handoff.
