# AttraVoya Pro — Next Chat Handoff

Use this file to continue the project in a new ChatGPT conversation without repeating completed work.

## Paste this in the new chat

> Continue AttraVoya Pro from `docs/NEXT-CHAT-HANDOFF.md` in the GitHub repository `Victor12-star/AttraVoya-Pro`. Read that file first, then read `docs/CURRENT-WORK.md` and `docs/SCALABILITY-RELIABILITY-UX-REQUIREMENTS.md`. Start from the exact verified `develop` commit recorded in the handoff. Preserve the rule that every slice must pass all five top-level GitHub Actions CI jobs on the exact final PR head before squash merge, then the exact resulting `develop` commit must also pass all five jobs before the next slice starts. Do not repeat completed work.

## Exact current stopping point

- Repository: `Victor12-star/AttraVoya-Pro`
- Integration branch: `develop`
- Production branch: `main`
- Current verified `develop` SHA: `61296f456ff778ab4852000c2a4c6bd1a8c54742`
- This is the Phase 8L squash merge commit.
- Post-merge CI: run #405, workflow run `34053616390`.
- All five top-level jobs passed on that exact `develop` SHA:
  1. Code quality and unit tests
  2. PostgreSQL and Prisma verification
  3. Production builds
  4. Live no-cost provider checks
  5. Dependency and secret checks

## Phase 8L is complete

PR #39, `Phase 8L: collect planner pricing evidence concurrently`, is merged into `develop`.

Final PR head before merge:

`70a43e30601613b5bdc0d8d672ca020f83b7714e`

Squash merge / verified `develop` SHA:

`61296f456ff778ab4852000c2a4c6bd1a8c54742`

Phase 8L changed the planner pricing-evidence orchestration so the fixed server-side pricing collectors execute concurrently instead of accumulating category latency serially. Deterministic category application order and fail-closed normalization remain intact. A failed collector cannot cancel valid evidence from another category.

Phase 8L did **not** introduce destination ranking, booking claims, new provider credentials, schema changes, client evidence-write paths, or fabricated price/availability data.

## Scalability is now a permanent production requirement

Scalability, reliability and user-satisfaction requirements are recorded in:

`docs/SCALABILITY-RELIABILITY-UX-REQUIREMENTS.md`

and are referenced from the permanent handoff:

`docs/CURRENT-WORK.md`

GitHub Issue #40 also tracks the production scalability/reliability/UX program.

Do not treat scalability as a vague final cleanup task. Future slices must preserve or improve these areas where relevant:

- horizontal application scaling
- bounded concurrency and backpressure
- database connection-pool safety and query efficiency
- distributed cache only when justified and never for private traveller intent/budget data
- background queues for long-running or retryable jobs when synchronous request handling is no longer appropriate
- idempotency for write/payment/booking-like operations
- provider timeout, retry, rate-limit and failure isolation
- observability: metrics, logs, traces, SLOs and alerting
- graceful degradation when external services fail
- zero/low-downtime deployment readiness
- backup/restore and disaster-recovery readiness
- load/performance testing before claiming high-user capacity
- responsive UI, accessibility, RTL, reduced-motion and honest loading/error/retry states
- clear user-facing provenance: live/provider facts vs estimates vs planning targets vs unavailable data

Do not add Redis, queues, replicas, tracing systems or other infrastructure merely to say the app is scalable. Add them at the correct architectural boundary with measurable need, tests and operational acceptance criteria.

## Important scalability investigation already performed

Do not repeat this investigation unless the code has changed.

### Health/readiness

The server already has separate health endpoints under the health module:

- `/health/live` verifies that the Node process can answer requests.
- `/health/ready` checks PostgreSQL readiness before the instance should receive application traffic.

The readiness service fails with service-unavailable behavior when the database cannot be reached.

Therefore, **do not create duplicate liveness/readiness endpoints as the next scalability slice**.

Relevant files:

- `apps/server/src/modules/health/health.routes.js`
- `apps/server/src/modules/health/health.controller.js`
- `apps/server/src/modules/health/health.service.js`
- `apps/server/src/modules/health/health.repository.js`
- `apps/server/src/modules/health/health.test.js`

### Provider HTTP transport

The next meaningful scale/reliability gap identified is the common provider HTTP transport:

`apps/server/src/integrations/http/provider-http-client.js`

Current behavior already includes:

- hard request timeouts
- transient retries for safe idempotent requests
- no tight-loop retry on HTTP 429
- provider-safe error mapping
- injectable fetch for deterministic tests
- redaction of unsafe upstream response content from normal errors

But the current retry delay uses synchronized exponential backoff:

`250 * 2 ** (attempt - 1)`, capped at 1500 ms

and the shared transport currently has no explicit per-provider in-flight concurrency guard/backpressure boundary.

This can become a problem when many users hit the same external provider at once: multiple server requests can retry in lockstep and produce a retry storm or exceed provider quotas.

## Recommended next slice

Start a new feature branch from the exact verified base:

`61296f456ff778ab4852000c2a4c6bd1a8c54742`

The next slice should strengthen the shared provider transport with a small, testable, provider-neutral load-protection boundary.

Recommended scope:

1. Add bounded per-client/per-provider in-flight concurrency so one external provider cannot consume unbounded simultaneous outbound requests from one server instance.
2. Add jitter to retry backoff so concurrent failures do not retry in synchronized waves.
3. Preserve existing timeout, retry eligibility, 429 behavior, error mapping and server-only credential rules.
4. Keep queue waiting bounded; do not allow unbounded memory growth.
5. Fail closed with an explicit provider-unavailable/busy outcome if the bounded queue cannot safely accept more work.
6. Add deterministic unit tests using injected fetch/timing primitives where practical.
7. Prove that concurrency never exceeds the configured cap.
8. Prove queued work is released after success and failure.
9. Prove retry jitter stays inside defined bounds without making tests flaky.
10. Do not add provider-specific business logic to the generic transport.

Before implementation, inspect existing tests:

`apps/server/src/integrations/http/provider-http-client.test.js`

and current provider adapters to ensure the shared boundary does not change public behavior unexpectedly.

If inspection reveals a safer or more foundational missing scale boundary, document why and take the smallest production-safe slice instead. Do not invent infrastructure for its own sake.

## Strict development process

Every new slice must follow this exact sequence:

1. Start from the exact currently verified `develop` SHA.
2. Create a dedicated feature branch.
3. Make the smallest coherent production-safe change.
4. Add/adjust focused tests.
5. Keep canonical formatter/CI/security rules unchanged.
6. Open a PR into `develop`.
7. Verify the **exact final PR head** passes all five top-level CI jobs.
8. Squash merge using expected-head protection.
9. Verify `develop` points to the returned squash SHA.
10. Verify the **exact resulting `develop` SHA** passes all five top-level CI jobs.
11. Only then start another slice.

Never merge temporary CI helper/diagnostic files. Temporary helpers must delete themselves or be removed before the final PR head is accepted.

## Canonical formatting and CI rules

Do not weaken or replace the canonical formatter or workflow.

Root `package.json` must keep:

- `"format": "prettier --write ."`
- `"format:check": "prettier --check ."`

`prettier.config.js` must keep:

- `printWidth: 100`
- `singleQuote: true`
- `trailingComma: 'all'`

The canonical CI workflow remains:

`.github/workflows/ci.yml`

## Product/data-honesty rules that must not regress

- AttraVoya is budget-first.
- Provider keys remain server-side.
- Browser/mobile must not call paid/keyed providers directly.
- Never invent live fares, accommodation prices, availability, schedules, ratings, safety facts, medical facts or provider results.
- Planning targets are not market prices.
- Published destination catalog entries are not affordability or bookability proof.
- Affordability must remain evidence-driven and provenance-aware.
- Private traveller intent and budget APIs remain owner-scoped and `private, no-store` where applicable.
- Cross-user private-resource access must not leak existence.
- Missing provider data must remain unavailable/unevaluated rather than fabricated.
- Basic safety must never be paywalled.
- Premium entitlements must never imply admin privileges.
- Frontend visibility is not authorization.
- All 18 supported UI locales must remain working, including Arabic RTL.
- Broad accommodation types remain required product behavior.

## Current supported UI locales

`en, sv, es, de, fr, it, pt, nl, no, da, fi, pl, tr, ar, zh, ja, ko, hi`

## Files to read first in the new chat

Read in this order:

1. `docs/NEXT-CHAT-HANDOFF.md`
2. `docs/CURRENT-WORK.md`
3. `docs/SCALABILITY-RELIABILITY-UX-REQUIREMENTS.md`
4. `apps/server/src/integrations/http/provider-http-client.js`
5. `apps/server/src/integrations/http/provider-http-client.test.js`
6. the current provider adapters that instantiate this shared HTTP client

## Final instruction to the next chat

Proceed proactively. Do not ask the user to repeat project rules already recorded here. Do not redo completed phases. Keep the user updated briefly during long work. Preserve security, privacy, data honesty, scalability, accessibility and the strict exact-head CI gates.
