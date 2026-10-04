const LOCAL_DEVELOPMENT_SITE_URL = 'http://localhost:3000';

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

function isLocalHostname(hostname) {
  return ['localhost', '127.0.0.1', '::1'].includes(hostname);
}

export function resolvePublicSiteUrl(env = process.env) {
  const configured =
    env.NEXT_PUBLIC_SITE_URL?.trim() ||
    env.NEXT_PUBLIC_WEB_URL?.trim() ||
    env.WEB_URL?.trim();

  if (!configured) {
    if (env.NODE_ENV?.trim().toLowerCase() === 'production') {
      throw new Error('NEXT_PUBLIC_SITE_URL is required in production.');
    }
    return LOCAL_DEVELOPMENT_SITE_URL;
  }

  const origin = parseSiteOrigin(configured);

  if (env.NODE_ENV?.trim().toLowerCase() === 'production') {
    const url = new URL(origin);
    if (url.protocol !== 'https:') {
      throw new Error('Public site URL must use HTTPS in production.');
    }
    if (isLocalHostname(url.hostname)) {
      throw new Error('Public site URL must not use a local hostname in production.');
    }
  }

  return origin;
}
