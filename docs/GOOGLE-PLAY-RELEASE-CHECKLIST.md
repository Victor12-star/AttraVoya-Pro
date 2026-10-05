# Google Play release checklist

Last reviewed: 2026-10-04

This checklist separates repository-enforced safeguards from manual Google Play and
production-operations work. A checked repository item means the current implementation is
present and protected by code/tests; it does not mean the Play Console submission itself has
been completed.

## Automated release safeguards already in the repository

- [x] Android application ID is pinned to `com.attravoya.pro`.
- [x] Production builds use Android App Bundle (`.aab`) output.
- [x] Production builds use EAS-managed remote signing credentials.
- [x] EAS CLI is pinned and production builds require a committed source state.
- [x] Production build numbers auto-increment from the remote version source.
- [x] Production Android builds require HTTPS API and public web URLs.
- [x] Production Android builds require a valid EAS project ID.
- [x] Production Android billing requires configured RevenueCat Android public configuration.
- [x] RevenueCat client state is not trusted as the server authorization boundary.
- [x] Android background location is blocked; location is foreground-only.
- [x] Android automatic app-data backup is disabled.
- [x] Android cleartext HTTP traffic is explicitly disabled.
- [x] Android billing launch mode is set safely for the RevenueCat purchase flow.
- [x] In-app account deletion is available.
- [x] A public web account-deletion resource exists at `/delete-account`.
- [x] Mobile Profile links directly to the public web account-deletion resource.
- [x] Mobile registration exposes Privacy policy and Terms of service before account creation.
- [x] The privacy policy discloses the retained non-identifying audit anchor used for
      database/security integrity after account deletion.
- [x] CI independently verifies code quality/unit tests, production builds,
      PostgreSQL/Prisma, dependency/secret checks, and live no-cost providers.

## Google Play policy/version gate

- [x] The current Expo SDK 57 / React Native stack targets Android API 36, satisfying the
      Google Play target-API requirement in force on 2026-10-04.
- [ ] Re-check the target-API requirement immediately before every Play submission because
      Google Play advances this requirement over time.
- [ ] Enter the deployed `/delete-account` HTTPS URL in the Play Console account-deletion
      web-resource field.
- [ ] Complete the Play Console Data safety form so it matches the actual production data
      flows and enabled providers.
- [ ] Confirm the Play Console privacy-policy URL points to the deployed `/privacy` page.
- [ ] Complete all required App content declarations, including audience/children,
      ads, permissions, and any policy declarations that apply at submission time.

## Production configuration blockers

These items require real production values or operator/provider accounts and must not be
replaced with fake placeholders.

- [ ] Configure the real production `EXPO_PUBLIC_API_BASE_URL` using HTTPS.
- [ ] Configure the real production `EXPO_PUBLIC_WEB_BASE_URL` using HTTPS.
- [ ] Configure the real EAS project ID.
- [ ] Configure the real RevenueCat Android public SDK key/product mapping.
- [ ] Configure the real production privacy/support contact email shown by the website.
- [ ] Configure and verify production provider credentials for every provider that is enabled.
- [ ] Verify the production database, backup, restore, monitoring, and alerting setup.
- [ ] Verify production hosting/data-region choices and update the privacy policy with the
      final retention and backup schedules.

## Google Play Console and signing

- [ ] Create or confirm the Google Play app entry for `com.attravoya.pro`.
- [ ] Configure the Google Play service account used by EAS Submit.
- [ ] Confirm Play App Signing/enrollment and upload-key ownership/recovery procedures.
- [ ] Build the production Android App Bundle from an exact verified `develop` commit.
- [ ] Submit first to the internal testing track as a draft.
- [ ] Install the Play-delivered build from the internal track on real Android hardware.
- [ ] Verify purchase, restore, login, logout, account deletion, location, deep links,
      offline/error handling, and app restart behavior in the Play-delivered build.

## Store-listing assets and content

- [ ] **BLOCKER:** approve final AttraVoya Pro launcher icon/adaptive-icon artwork.
      Do not substitute generated placeholder branding.
- [ ] Add the approved final icon/adaptive icon to the Expo Android configuration.
- [ ] Prepare the Play Store feature graphic and phone/tablet screenshots from the final UI.
- [ ] Finalize short description, full description, category, contact details, and support URL.
- [ ] Verify all screenshots and listing text match the actual shipped product and do not claim
      unavailable live fares, availability, providers, or features.

## Billing and subscription release gate

- [ ] Create and activate the intended Google Play subscription products/base plans/offers.
- [ ] Match Play product identifiers to the server-owned RevenueCat product policy.
- [ ] Verify RevenueCat webhook/provider configuration with real production credentials.
- [ ] Test new purchase, renewal, cancellation, expiration, billing issue, plan change, and
      restore flows using Google Play test accounts.
- [ ] Confirm server entitlement state remains authoritative after every lifecycle event.

## Final verification before production rollout

- [ ] Latest `develop` SHA has an independent push-triggered CI run with all five canonical
      jobs green.
- [ ] No unresolved critical/high dependency or secret-scan findings.
- [ ] No production placeholder URLs, fake provider results, test credentials, or debug-only
      switches remain in the release configuration.
- [ ] Public Privacy, Terms, and Delete Account pages load over HTTPS without authentication
      barriers that prevent users from starting the required flow.
- [ ] Accessibility smoke tests pass and key mobile flows are manually checked with TalkBack.
- [ ] Crash/error monitoring and operational alerts are active before widening rollout.
- [ ] Production monitoring calculates the documented availability/latency SLOs and current
      error budget without collecting unnecessary personal data.
- [ ] Internal testing is stable before staged production rollout.
- [ ] Production rollout is staged and monitored rather than immediately released to 100%.

## Release rule

Do not mark AttraVoya Pro as Play Store ready solely because CI is green. Store readiness
requires both:

1. a verified 5/5-green repository commit; and
2. completion of the applicable manual/provider/Play Console items above.

The final Android icon/adaptive-icon artwork remains an explicit product-owner approval item and
must stay separate from unrelated engineering hardening.
