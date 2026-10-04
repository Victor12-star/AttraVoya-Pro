import Constants from 'expo-constants';

const ALLOWED_PUBLIC_PATHS = new Set(['/delete-account', '/privacy', '/terms']);

function invalidConfiguration() {
  return new Error('The mobile public web configuration is invalid.');
}

export function normalizePublicWebBaseUrl(
  value,
  { allowInsecure = typeof __DEV__ !== 'undefined' && __DEV__ } = {},
) {
  if (typeof value !== 'string' || !value.trim()) throw invalidConfiguration();

  let url;
  try {
    url = new URL(value.trim());
  } catch {
    throw invalidConfiguration();
  }

  if (!['http:', 'https:'].includes(url.protocol)) throw invalidConfiguration();
  if (url.username || url.password || url.search || url.hash) throw invalidConfiguration();
  if (url.protocol === 'http:' && !allowInsecure) throw invalidConfiguration();

  return url.toString().replace(/\/$/, '');
}

export function getConfiguredPublicWebBaseUrl(
  expoConfig = Constants.expoConfig,
  { allowInsecure = typeof __DEV__ !== 'undefined' && __DEV__ } = {},
) {
  return normalizePublicWebBaseUrl(expoConfig?.extra?.webBaseUrl, { allowInsecure });
}

export function buildConfiguredPublicWebPageUrl(
  path,
  expoConfig = Constants.expoConfig,
  options = {},
) {
  if (!ALLOWED_PUBLIC_PATHS.has(path)) throw invalidConfiguration();
  const baseUrl = getConfiguredPublicWebBaseUrl(expoConfig, options);
  return new URL(path, `${baseUrl}/`).toString();
}
