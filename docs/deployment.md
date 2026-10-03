# Deployment

## Android production submission

AttraVoya Pro uses EAS Build and EAS Submit for the Android production release path.

The committed `apps/mobile/eas.json` intentionally does **not** contain
`serviceAccountKeyPath`. Google Play service-account JSON is a credential and
must not be stored in this repository.

For Google Play submission:

1. Create the app in Google Play Console.
2. Create the Google service account used for Play submissions.
3. Upload the service-account JSON to the Android service credentials for the
   AttraVoya Pro EAS project using the EAS dashboard or `eas credentials`.
4. Keep `apps/mobile/eas.json` free of local credential-file paths.
5. Submit with the production profile only after the exact `develop` SHA is
   independently verified by all five canonical CI jobs.

Current Android production submission safeguards:

- application ID pinned to `com.attravoya.pro`
- internal testing track
- draft release status
- changes held out of review until explicitly sent
- committed Git state required before EAS builds
- remote app-version ownership with production auto-increment

Never commit Google service-account JSON, Play credentials, Expo access tokens,
private signing keys, RevenueCat secret keys, database credentials, or other
production secrets.
