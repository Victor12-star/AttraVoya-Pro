import process from 'node:process';

const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);

function productionConfigurationError(message) {
  return new Error(`Android production configuration: ${message}`);
}

function isAndroidProductionBuild(environment) {
  return (
    environment.APP_VARIANT?.trim().toLowerCase() === 'production' &&
    environment.EAS_BUILD_PLATFORM?.trim().toLowerCase() === 'android'
  );
}

function assertProductionApiBaseUrl(apiBaseUrl) {
  let url;
  try {
    url = new URL(apiBaseUrl);
  } catch {
    throw productionConfigurationError('EXPO_PUBLIC_API_BASE_URL must be a valid HTTPS URL.');
  }

  if (
    url.protocol !== 'https:' ||
    !url.hostname ||
    LOOPBACK_HOSTS.has(url.hostname.toLowerCase()) ||
    url.username ||
    url.password
  ) {
    throw productionConfigurationError(
      'EXPO_PUBLIC_API_BASE_URL must use HTTPS, must not be loopback, and must not contain credentials.',
    );
  }
}

/**
 * Fail closed only for the first supported store target: an EAS production
 * Android build. Development, preview, web and iOS remain unaffected.
 *
 * The RevenueCat public SDK key is configuration only. This guard ensures the
 * production Android binary is wired to billing; it does not grant entitlement.
 */
export function assertAndroidProductionBuildConfiguration({
  environment = process.env,
  apiBaseUrl,
  revenueCatAndroid,
}) {
  if (!isAndroidProductionBuild(environment)) return;

  assertProductionApiBaseUrl(apiBaseUrl);

  if (revenueCatAndroid?.enabled !== true) {
    throw productionConfigurationError(
      'RevenueCat Android must be enabled for the production Android build.',
    );
  }
}

export { isAndroidProductionBuild };
