import { withAndroidManifest } from 'expo/config-plugins';

/**
 * Keep production Android network traffic on encrypted transports.
 *
 * The application already rejects non-HTTPS production API and web URLs.
 * This manifest safeguard adds a native platform boundary so accidental
 * cleartext HTTP usage is not silently permitted by future configuration.
 */
export function disableAndroidCleartextTraffic(androidManifest) {
  const application = androidManifest?.manifest?.application?.[0];

  if (!application?.$) {
    throw new Error('Android network security configuration: application node was not found.');
  }

  application.$['android:usesCleartextTraffic'] = 'false';
  return androidManifest;
}

export default function withAndroidCleartextTrafficDisabled(config) {
  return withAndroidManifest(config, (configWithManifest) => {
    configWithManifest.modResults = disableAndroidCleartextTraffic(configWithManifest.modResults);
    return configWithManifest;
  });
}
