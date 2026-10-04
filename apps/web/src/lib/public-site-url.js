const LOCAL_DEVELOPMENT_SITE_URL = 'http://localhost:3000';
const PRODUCTION_ENVIRONMENT = 'production';
const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '::1']);

function isProduction(env) {
  return env.NODE_ENV?.trim().toLowerCase() === PRODUCTION_ENVIRONMENT;
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
  const configured = [
    env.NEXT_PUBLIC_SITE_URL,
    env.NEXT_PUBLIC_WEB_URL,
    env.WEB_URL,
  ]
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
  }

  return origin;
}
