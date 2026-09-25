import process from 'node:process';

const REVENUECAT_ANDROID_PUBLIC_KEY_PATTERN = /^goog_[A-Za-z0-9_-]{4,195}$/;

function configurationError(message) {
  return new Error(`RevenueCat Android configuration: ${message}`);
}

/**
 * Read the public RevenueCat Android build configuration.
 *
 * EXPO_PUBLIC_ values are bundled into the installed application, so this
 * boundary accepts only the Google Play public SDK key. RevenueCat secret API
 * keys (sk_...) must remain server-only and therefore fail validation here.
 */
export function readRevenueCatAndroidPublicConfig(environment = process.env) {
  const rawEnabled = environment.EXPO_PUBLIC_REVENUECAT_ANDROID_ENABLED?.trim().toLowerCase();

  if (rawEnabled && !['true', 'false'].includes(rawEnabled)) {
    throw configurationError('EXPO_PUBLIC_REVENUECAT_ANDROID_ENABLED must be true or false.');
  }

  if (rawEnabled !== 'true') {
    return Object.freeze({ enabled: false });
  }

  const apiKey = environment.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY?.trim();
  if (!apiKey || !REVENUECAT_ANDROID_PUBLIC_KEY_PATTERN.test(apiKey)) {
    throw configurationError(
      'EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY must be a Google Play public SDK key beginning with goog_.',
    );
  }

  return Object.freeze({
    enabled: true,
    apiKey,
  });
}

export { REVENUECAT_ANDROID_PUBLIC_KEY_PATTERN };
