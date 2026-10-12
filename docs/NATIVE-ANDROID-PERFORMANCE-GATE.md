# Native Android performance release gate

## Status

This is a manual evidence gate for the first native Android release.
It complements `docs/WEB-MOBILE-PERFORMANCE-BUDGET.md`.
It is not evidence that a production Android build or device test has passed.
Web browser measurements are not proof of native Android performance.

## Test setup

- Record the exact commit, build number, Android version and device model.
- Test on a low or mid-range physical device and a current physical device.
- Label emulator results separately from physical-device measurements.
- Use a signed release build, preferably from Google Play internal testing.
- Use disposable accounts and non-sensitive seeded travel data.
- Record network conditions, cache-clearing policy and test date.
- Measure five cold starts and five warm resumes without discarding slow trials.
- Report all trial values, medians and maximums.
- Do not upload authentication tokens, private trip data or child information.

## Initial investigation thresholds

These are provisional targets that require device baseline calibration.
They do not represent proven production performance.

- Cold start: investigate median time above 3 seconds to usable home screen.
- Warm resume: investigate median time above 1 second to usable interaction.
- Interaction: investigate repeated unresponsiveness above 500 milliseconds.
- Frames: record dropped frames, refresh rate and diagnostic method.
- Memory: record baseline, peak and memory after repeated usage cycles.
- Network: record aggregate data use and investigate duplicate API requests.

Approve final device-specific budgets only after reviewing measured baselines.
Never silently raise a threshold to make a release pass.

## User journeys

- Fresh install, first launch, permissions, navigation and sign-in.
- Returning session, cold launch, warm resume and session refresh.
- Budget planner, validation, save retry and preservation of entered data.
- Discovery during slow, failed or unavailable travel-provider responses.
- Subscription status and unavailable Google Play offerings.
- Foreground location consent, refusal and permission revocation.
- Background, airplane mode, reconnection, restart and duplicate-write safety.
- Account deletion, sign-out, retries and failure handling.

Check TalkBack, enlarged text, focus order and content-state announcements.
Verify right-to-left layout and relevant system animation preferences.

## Evidence and release decision

Record the build, devices, method, metrics, failures and reviewer decision.
Mark each journey as pass, fail or not run with supporting evidence.
A missing test is not a pass.

Collect aggregate measurements without private URLs, payloads or identifiers.
Do not publish exact locations, payment data or secrets.

Repository CI alone does not prove native release readiness.
Require physical-device checks and Google Play internal-track verification.
Block release for critical crashes, privacy exposure or unsafe account behavior.

## External setup

Google Play, Android signing, EAS builds, production API hosting and RevenueCat
may require owner configuration. Explain the relevant website and manual steps
when needed. Never request passwords or secret API keys in the chat.
