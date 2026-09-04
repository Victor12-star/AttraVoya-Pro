# Phase 7A — Global destination search

This checkpoint introduces the provider-neutral global destination discovery vertical slice.

## Implemented

- `GET /api/v1/destinations/search`
- Shared Zod validation for query, country, language and result limit
- Geoapify city-only autocomplete support (`type=city`)
- Provider-neutral normalization of destination candidates
- Invalid/duplicate provider rows are filtered before reaching clients
- Shared web/mobile/Admin API-client method: `searchDestinations()`
- Unit tests for destination normalization and API-client URL construction
- Fastify integration coverage, including validation before provider invocation

## Data quality rule

Destination discovery accepts city/town/village-style destination results only. Streets, businesses and arbitrary addresses are deliberately excluded from this route. Generic place search remains available separately through `/api/v1/places`.

## Verification gate

This feature is not complete until the pull-request CI pipeline is green. A real Geoapify external request also remains pending until `GEOAPIFY_API_KEY` is configured as a GitHub Actions secret; provider credentials must never be committed to the repository.
