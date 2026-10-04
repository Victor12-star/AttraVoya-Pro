const LOCAL_DEVELOPMENT_SITE_URL = 'http://localhost:3000';
const PRODUCTION_ENVIRONMENT = 'production';
const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '::1']);
const RESERVED_EXACT_HOSTNAMES = new Set(['example.com', 'example.net', 'example.org']);
const RESERVED_HOST_SUFFIXES = ['.example', '.invalid', '.test'];

function isProduction(env) {
  return env.NODE_ENV?.trim().toLowerCase() === PRODUCTION_ENVIRONMENT;
}

function isReservedHostname(hostname) {
  const normalized = hostname.toLowerCase();

  return (
    RESERVED_EXACT_HOSTNAMES.has(normalized) ||
    RESERVED_HOST_SUFFIXES.some((suffix) => normalized.endsWith(suffix))
  );
}

function allowsReservedCiOrigin(env, hostname) {
  return (
    env.CI?.trim().toLowerCase() === 'true' &&
    env.ATTRAVOYA_CI_ALLOW_RESERVED_SITE_URL?.trim().toLowerCase() === 'true' &&
    hostname.toLowerCase().endsWith('.invalid')
  );
}

function parseSiteOrigin(value) {
  const url = new URL(value);

  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error('Public site URL must use HTTP or HTTPS.');
  }
  if (url.username || url.password) {
    throw new Error('Public site URL must not include embedded credentials.');
  }
  if (url.search || url.hash) {
    throw new Error('Public site URL must not include a query string or fragment.');
  }
  if (url.pathname !== '/' && url.pathname !== '') {
    throw new Error('Public site URL must be an origin without a path.');
  }

  return url.origin;
}

export function resolvePublicSiteUrl(env = process.env) {
  const configured = [env.NEXT_PUBLIC_SITE_URL, env.NEXT_PUBLIC_WEB_URL, env.WEB_URL]
    .find((value) => value?.trim())
    ?.trim();

  if (!configured) {
    if (isProduction(env)) {
      throw new Error('NEXT_PUBLIC_SITE_URL is required in production.');
    }
    return LOCAL_DEVELOPMENT_SITE_URL;
  }

  const origin = parseSiteOrigin(configured);

  if (isProduction(env)) {
    const url = new URL(origin);

    if (url.protocol !== 'https:') {
      throw new Error('Public site URL must use HTTPS in production.');
    }
    if (LOCAL_HOSTNAMES.has(url.hostname)) {
      throw new Error('Public site URL must not use a local hostname in production.');
    }
    if (isReservedHostname(url.hostname) && !allowsReservedCiOrigin(env, url.hostname)) {
      throw new Error('Public site URL must not use a reserved placeholder hostname in production.');
    }
  }

  return origin;
}
