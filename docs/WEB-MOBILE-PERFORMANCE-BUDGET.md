# Web and mobile performance budget

## Status and scope

This document defines AttraVoya Pro's initial user-experience performance contract for Issue #40. It establishes measurable budgets before production maturity is claimed.

These are targets and release expectations, not evidence that the current application already meets them in production. The repository currently has a Next.js web application and cross-browser Playwright coverage, but it does not yet have a production real-user Core Web Vitals measurement pipeline. A future native mobile client must receive its own device-level budget before public release rather than inheriting browser numbers without validation.

## Core Web Vitals field budget

For real production traffic, the web application should meet the current Core Web Vitals "good" thresholds at the 75th percentile of page visits, evaluated separately for mobile and desktop:

- Largest Contentful Paint (LCP): 2.5 seconds or less.
- Interaction to Next Paint (INP): 200 milliseconds or less.
- Cumulative Layout Shift (CLS): 0.1 or less.

The 75th-percentile rule and thresholds follow the current web.dev Core Web Vitals guidance: https://web.dev/articles/vitals

Passing one aggregate site-wide number is not sufficient when an important route family is materially worse. Production reporting should retain bounded route families such as public discovery, authentication, planner and Travel Companion so regressions on a key journey are visible without recording raw URLs, query strings or private identifiers.

## Pre-release mobile web lab budget

Before a production release, representative user journeys should also be exercised against a production build under repeatable mobile-oriented laboratory conditions. The initial lab targets are:

- LCP: 2.5 seconds or less on the representative tested page.
- CLS: 0.1 or less during the tested journey.
- Total Blocking Time (TBT): less than 200 milliseconds on average mobile-class test hardware or equivalent controlled emulation.
- no uncaught browser exception or failed critical application resource caused by the application under the measured journey.

TBT is a laboratory diagnostic for main-thread blocking and is not a replacement for field INP. Current web.dev guidance recommends TBT below 200 milliseconds on average mobile hardware and explains that INP itself requires real interactions in field measurement: https://web.dev/articles/tbt

A lab pass must not be presented as proof that field Core Web Vitals pass for real users. Device speed, network conditions, geography, cache state, third-party behavior and user interaction patterns can materially change production results.

## Measurement routes

At minimum, performance validation should cover these representative route families when they are available in the tested environment:

- public home/navigation entry;
- authentication entry and form interaction;
- destination/provider-backed discovery without consuming unnecessary paid-provider quota;
- budget-planner entry and form interaction;
- Travel Companion entry and a representative interaction;
- one mobile viewport and one desktop viewport for field reporting, with the release-oriented lab gate weighted toward mobile constraints.

Private flows must use disposable test accounts/data. Performance tooling must not publish traveller budgets, trip details, child-sensitive data, tokens, provider credentials or other private payloads in CI logs or artifacts.

## Loading and interaction rules

Performance work must preserve product truthfulness and usability:

- do not replace real loading with fake progress percentages or invented availability;
- keep loading, empty, partial, timeout, offline/reconnection and retry states understandable;
- preserve entered form state across recoverable failures where it is safe to do so;
- prevent accidental duplicate authoritative submissions while a write is pending;
- lazy-load heavy optional functionality where doing so does not break accessibility or create misleading delayed state;
- optimize images and other static assets without replacing provider provenance or showing unrelated stock imagery as real travel content;
- avoid repeated provider/API requests when a safe in-flight deduplication or bounded cache can serve the same read;
- preserve all maintained locales, Arabic right-to-left layout, keyboard/screen-reader behavior, contrast and reduced-motion support.

Performance is not a reason to weaken security checks, privacy controls, provider verification, authorization, error handling or accessibility.

## Transfer and JavaScript budgets

Phase 10K established a reproducible public-home mobile production baseline on the Pixel 7 Chromium project against the optimized `next start` build. Two independent exact-commit CI runs produced effectively identical transfer results: JavaScript 172,730 bytes, CSS 5,787 bytes and images 0 bytes, while total same-origin transfer measured 195,508 bytes and 195,511 bytes. The three-byte total difference came from the document response; JavaScript and CSS were unchanged.

The initial hard release ceilings use the larger observed baseline plus 10% headroom, rounded upward to the next whole byte:

- total same-origin transfer: 215,063 bytes;
- JavaScript transfer: 190,003 bytes;
- CSS transfer: 6,366 bytes;
- image transfer on the public home route: 0 bytes.

The 10% allowance is intentionally bounded. It permits small build or response-header variation and modest reviewed growth while requiring a deliberate performance review before a material bundle regression can ship. The zero image ceiling does not prohibit images elsewhere in AttraVoya. It reflects the measured public-home baseline. Adding an image to this route requires a new measured baseline and an explicit reviewed budget revision rather than an invented allowance.

The Playwright release gate measures same-origin navigation and resource entries and logs aggregate counts and byte totals only. It must not emit raw resource URLs, query strings, user identifiers, provider payloads or other request-level information. A representative route that legitimately uses image assets must receive its own measured image ceiling rather than inheriting the public-home zero value.

The following rules remain in force:

- new heavy dependencies require a demonstrated product need;
- route-specific code should not be pulled into the global shell without reason;
- large images must use appropriately sized/responsive delivery where the source contract permits it;
- optional maps, rich media and provider SDKs should load only when the related feature is actually used where technically feasible.

## Field telemetry privacy boundary

A future real-user Web Vitals collector must remain purpose-limited operational telemetry and must follow `docs/PRIVACY-ANALYTICS-ADMIN-MONITORING.md`.

The performance dataset must not contain raw URLs/query strings, request bodies, search text, email addresses, phone numbers, raw IP addresses, precise location history, authentication/session tokens, trip notes, budgets, child-specific information, passport information or full provider payloads.

Allowed dimensions should be bounded and documented, for example metric name, metric value, coarse device class, application version and an allowlisted route family. Do not add a persistent user identifier merely to measure page performance.

Any external real-user monitoring provider requires privacy/security review, processor and transfer assessment where applicable, retention rules and deployment configuration before activation. This document does not assume a lawful basis or consent outcome for a future provider.

## Release and regression policy

The public-home mobile resource budgets above are enforced by the production-build Playwright release gate. A regression beyond an approved hard budget must block release unless the budget itself is deliberately revised with measured evidence and review. Thresholds must not be silently raised simply to make CI green.

Field regressions should be handled as operational reliability work. If a key route exceeds the Core Web Vitals budget at the 75th percentile, investigate the route, device segment, backend/provider contribution and recent deployment before claiming the experience meets the target.

## Native mobile boundary

No production native-mobile performance claim is made by this document. Before a native AttraVoya client is released, define and measure budgets on representative low/mid-range target devices for at least cold/warm startup, interaction responsiveness, frame/jank behavior, memory growth, network usage and recovery from background/offline states.

Those native budgets must preserve the same privacy, accessibility, localization, provider-honesty and no-fake-progress rules as the web application.

## Evidence required before production maturity

Production performance maturity requires evidence from both controlled pre-release testing and real production usage. At minimum retain non-sensitive evidence of:

- tested application version/commit;
- route family and device class;
- measurement method and environment;
- LCP, INP and CLS field percentiles when real-user measurement is active;
- relevant lab LCP, CLS and TBT results;
- identified regressions and corrective action;
- confirmation that performance telemetry itself respected the privacy boundary.

Current cross-browser Playwright, slow-network, accessibility and resource-budget tests remain valuable release checks, but they are not a substitute for measured Core Web Vitals.
