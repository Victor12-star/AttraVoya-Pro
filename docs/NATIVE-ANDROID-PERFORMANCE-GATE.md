# Native Android performance release gate

## Scope and status

This document defines a repeatable **manual evidence gate** for AttraVoya Pro's first native Android release. It complements `docs/WEB-MOBILE-PERFORMANCE-BUDGET.md`, which primarily measures web performance. It does not assert that any Android production build or device test has already passed.

Do not use browser Lighthouse or Chromium transfer measurements as proof of native Android launch or frame performance.

## Test prerequisites

- Use an actual Android App Bundle distributed through Google Play internal testing, or a clearly identified equivalent signed release build for pre-submission investigation.
- Record the exact Git commit, build number, Android version, device model, memory class, test date and relevant test-network condition.
- Use at least one supported low/mid-range Android device and one representative current Android device. Identify physical devices separately from emulator results.
- Use disposable test accounts and non-sensitive seeded trips; never upload private travel details, authentication tokens or child-sensitive information to logs, screenshots or metrics services.
- Run cold start after force-stop and warm start after background/resume separately, with five measured repetitions per condition. Document whether caches are cleared and do not selectively discard slow trials.
- Report median, maximum and all five trial outcomes for each timing and memory measure. Avoid pretending these targets are established production baselines.

## Initial candidate budgets pending baseline calibration

These are *provisional engineering investigation thresholds*, not an assertion of production performance or guaranteed acceptance on every handset:

- Cold start: flag median time to a usable home screen above 3 seconds on the mid-range test device.
- Warm resume: flag median time to a usable interaction above 1 second.
- Responsiveness: flag any repeatable user interaction that leaves the interface unresponsive for over 500 milliseconds.
- Visual smoothness: flag observable or instrumented dropped frames on repeated navigation, scrolling or state transitions; record the measurement tool and device refresh rate rather than imposing an unmeasured universal frame rate.
- Memory: flag a sustained increase across repeated navigation, background and return cycles. Record baseline, peak and after-cycle memory. Do not invent a fixed memory ceiling without target-device measurements.
- Network: record data use for each representative scenario and investigate unexplained duplicate provider/API calls. Never log request payloads or user-specific URLs.

Release approval requires measured baselines, reviewed thresholds appropriate to the supported device range, and retesting after material client regressions. Thresholds must not be silently raised merely to pass.

## Required journeys

1. Fresh installation, first launch, permission decisions, initial navigation and sign-in.
2. Returning session, cold launch, warm resume and secure session refresh.
3. Budget-planner input, validation, save retry and preservation of unsaved data on recoverable failures.
4. Destination discovery with normal, slow, timeout and temporarily unavailable providers; never invent live fares or availability.
5. Profile, subscription-status display and safe handling of unavailable Google Play offerings.
6. Foreground location flow after consent, permission refusal and permission revocation.
7. Background/foreground transitions, airplane mode, reconnection, app restart and recovery without duplicate writes.
8. Account deletion and sign-out, including failure/retry paths.

Run accessibility checks using Android TalkBack and enlarged text. Verify labels, focus progression and content-state announcements. Test right-to-left layout where Arabic is enabled, as well as reduced-motion/system-animation preferences where supported.

## Evidence collection and release decision

Use platform and device diagnostic tools only where appropriate, with explicit data-minimization review. Record coarse, aggregate performance results and release-only observations, not raw network contents, user identifiers, exact locations, secrets or payment data.

The release record must include test build, hardware, OS, methodology, metrics, failures, mitigations and reviewer decision. Mark each journey pass/fail/not run with evidence. A "not run" cannot be treated as a pass.

A repository CI pass is a necessary code-quality gate but **not sufficient** for Android release readiness. Complete physical-device testing and Google Play internal-track verification before staged rollout. If a critical crash, misleading purchase state, privacy exposure or account-loss scenario remains, block release irrespective of performance scores.

## External setup

The Google Play internal track, Android signing, EAS build identity, production API host and RevenueCat configuration may require owner action. Request the provider-specific setup at the stage where it becomes necessary. Do not invent accounts or require secret keys in conversation.
