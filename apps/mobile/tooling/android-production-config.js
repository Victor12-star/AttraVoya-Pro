import process from 'node:process';
import { URL } from 'node:url';

const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);
const EAS_PROJECT_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function productionConfigurationError(message) {
  return new Error(`Android production configuration: ${message}`);
}

function isAndroidProductionBuild(environment) {
  return (
    environment.APP_VARIANT?.trim().toLowerCase() === 'production' &&
    environment.EAS_BUILD_PLATFORM?.trim().toLowerCase() === 'android'
  );
}

function assertProductionPublicHttpsUrl(value, variableName) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw productionConfigurationError(`${variableName} must be a valid HTTPS URL.`);
  }

  if (
    url.protocol !== 'https:' ||
    !url.hostname ||
    LOOPBACK_HOSTS.has(url.hostname.toLowerCase()) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  ) {
    throw productionConfigurationError(
      `${variableName} must use HTTPS, must not be loopback, and must not contain credentials, query parameters, or fragments.`,
    );
  }
}

/**
 * Fail closed only for the first supported store target: an EAS production
 * Android build. Development, preview, web and iOS remain unaffected.
 *
 * The RevenueCat public SDK key and EAS project ID are configuration only.
 * This guard ensures the production Android binary is wired to the expected
 * services; it does not grant entitlement.
 */
export function assertAndroidProductionBuildConfiguration({
  environment = process.env,
  apiBaseUrl,
  webBaseUrl,
  easProjectId,
  revenueCatAndroid,
}) {
  if (!isAndroidProductionBuild(environment)) return;

  assertProductionPublicHttpsUrl(apiBaseUrl, 'EXPO_PUBLIC_API_BASE_URL');
  assertProductionPublicHttpsUrl(webBaseUrl, 'EXPO_PUBLIC_WEB_BASE_URL');

  if (!EAS_PROJECT_ID_PATTERN.test(easProjectId ?? '')) {
    throw productionConfigurationError('EAS_PROJECT_ID must be a valid project UUID.');
  }

  if (revenueCatAndroid?.enabled !== true) {
    throw productionConfigurationError(
      'RevenueCat Android must be enabled for the production Android build.',
    );
  }
}

export { isAndroidProductionBuild };
