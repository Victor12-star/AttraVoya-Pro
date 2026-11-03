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

  let credentials;
  try {
    credentials = await request.json();
  } catch {
    return NextResponse.json({ error: 'Enter your email and password.' }, { status: 400 });
  }

  if (
    typeof credentials?.email !== 'string' ||
    typeof credentials?.password !== 'string' ||
    credentials.email.length > 320 ||
    credentials.password.length > 1024
  ) {
    return NextResponse.json({ error: 'Enter your email and password.' }, { status: 400 });
  }

  try {
    const response = await backendRequest('/api/v1/auth/mobile/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: credentials.email, password: credentials.password }),
    });
    if (!response.ok) {
      return NextResponse.json(
        {
          error:
            response.status === 401
              ? 'Incorrect credentials or account unavailable.'
              : 'Sign in failed. Please try again.',
        },
        { status: response.status === 401 ? 401 : 503 },
      );
    }
    const session = await response.json();
    if (typeof session?.accessToken !== 'string' || typeof session?.refreshToken !== 'string') {
      return NextResponse.json({ error: 'Invalid authentication response.' }, { status: 502 });
    }

    // Authorization is always checked against the backend's current database state.
    const permission = await backendRequest('/api/v1/analytics/users?days=1', {
      headers: { Authorization: `Bearer ${session.accessToken}` },
    });
    if (!permission.ok) {
      await backendRequest('/api/v1/auth/mobile/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: session.refreshToken }),
      }).catch(() => {});
      return NextResponse.json(
        { error: 'This account does not have permission to access administration.' },
        { status: 403 },
      );
    }

    const result = NextResponse.json({ ok: true });
    result.cookies.set(ACCESS_COOKIE, session.accessToken, {
      ...sessionCookieOptions,
      maxAge: 15 * 60,
    });
    const seconds = Math.max(
      1,
      Math.min(
        30 * 24 * 60 * 60,
        Math.floor((Date.parse(session.refreshExpiresAt) - Date.now()) / 1000),
      ),
    );
    result.cookies.set(REFRESH_COOKIE, session.refreshToken, {
      ...sessionCookieOptions,
      maxAge: Number.isFinite(seconds) ? seconds : 15 * 60,
    });
    return result;
  } catch {
    return NextResponse.json(
      { error: 'Authentication service temporarily unavailable.' },
      { status: 503 },
    );
  }
}
