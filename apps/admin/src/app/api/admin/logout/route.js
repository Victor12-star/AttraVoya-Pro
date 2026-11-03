import { NextResponse } from 'next/server';

import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  backendRequest,
  sessionCookieOptions,
  validSameOrigin,
} from '../../../../lib/admin-backend.js';

export async function POST(request) {
  if (!validSameOrigin(request)) {
    return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
  }
  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;
  if (refreshToken) {
    try {
      await backendRequest('/api/v1/auth/mobile/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
    } catch {
      // Always clear local credentials; backend tokens have bounded expiry.
    }
  }
  const result = NextResponse.json({ ok: true });
  result.cookies.set(ACCESS_COOKIE, '', { ...sessionCookieOptions, maxAge: 0 });
  result.cookies.set(REFRESH_COOKIE, '', { ...sessionCookieOptions, maxAge: 0 });
  return result;
}
