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

  const access = request.cookies.get(ACCESS_COOKIE)?.value;
  if (!access) {
    return NextResponse.json({ error: 'Please sign in again.' }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid password change request.' }, { status: 400 });
  }

  if (
    typeof body?.currentPassword !== 'string' ||
    typeof body?.newPassword !== 'string' ||
    body.currentPassword.length > 128 ||
    body.newPassword.length > 128 ||
    body.newPassword.length < 8
  ) {
    return NextResponse.json({ error: 'Enter a valid current and new password.' }, { status: 400 });
  }

  try {
    const response = await backendRequest('/api/v1/auth/change-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${access}`,
      },
      body: JSON.stringify({
        currentPassword: body.currentPassword,
        newPassword: body.newPassword,
      }),
    });

    if (!response.ok) {
      const status = response.status;
      return NextResponse.json({
        error: status === 401
          ? 'Current password is incorrect or your session has expired.'
          : status === 400
            ? 'New password must be different and meet password requirements.'
            : status === 429
              ? 'Too many attempts. Please try again later.'
              : 'Password change could not be completed.',
      }, { status: [400, 401, 429].includes(status) ? status : 503 });
    }

    const result = NextResponse.json({ ok: true }, {
      headers: { 'Cache-Control': 'private, no-store' },
    });
    result.cookies.set(ACCESS_COOKIE, '', { ...sessionCookieOptions, maxAge: 0 });
    result.cookies.set(REFRESH_COOKIE, '', { ...sessionCookieOptions, maxAge: 0 });
    return result;
  } catch {
    return NextResponse.json({ error: 'Security service temporarily unavailable.' }, { status: 503 });
  }
}
