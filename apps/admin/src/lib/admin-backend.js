import 'server-only';

const STAGING_API = 'https://attravoya-pro-api-staging.onrender.com';

export const ACCESS_COOKIE = 'attravoya_admin_access';
export const REFRESH_COOKIE = 'attravoya_admin_refresh';

export function backendUrl(path) {
  const base = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? STAGING_API;
  const parsed = new URL(base);
  if (!['https:', 'http:'].includes(parsed.protocol)) throw new Error('Invalid backend protocol');
  if (process.env.NODE_ENV === 'production' && parsed.protocol !== 'https:') {
    throw new Error('Admin backend must use HTTPS in production');
  }
  return new URL(path, parsed.origin).toString();
}

export async function backendRequest(path, options = {}) {
  return fetch(backendUrl(path), {
    ...options,
    cache: 'no-store',
    headers: { Accept: 'application/json', ...options.headers },
    signal: AbortSignal.timeout(45_000),
  });
}

export const sessionCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: /** @type {const} */ ('strict'),
  path: '/',
};

export function validSameOrigin(request) {
  const origin = request.headers.get('origin');
  if (!origin) return false;
  try {
    return new URL(origin).origin === request.nextUrl.origin;
  } catch {
    return false;
  }
}
