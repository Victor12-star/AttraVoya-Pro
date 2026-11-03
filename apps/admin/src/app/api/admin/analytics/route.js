import { NextResponse } from 'next/server';

import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  backendRequest,
  sessionCookieOptions,
} from '../../../../lib/admin-backend.js';

function reply(payload, status) {
  return NextResponse.json(payload, {
    status,
    headers: { 'Cache-Control': 'private, no-store' },
  });
}

export async function GET(request) {
  const days = request.nextUrl.searchParams.get('days') ?? '7';
  if (!['7', '30', '90'].includes(days)) {
    return reply({ error: { message: 'Unsupported analytics window.' } }, 400);
  }

  let access = request.cookies.get(ACCESS_COOKIE)?.value;
  const refresh = request.cookies.get(REFRESH_COOKIE)?.value;
  if (!access && !refresh) {
    return reply({ error: { message: 'Sign in to view analytics.' } }, 401);
  }
  try {
    let rotated = null;
    let response = access
      ? await backendRequest(`/api/v1/analytics/users?days=${days}`, {
          headers: { Authorization: `Bearer ${access}` },
        })
      : new Response(null, { status: 401 });

    if (response.status === 401 && refresh) {
      const refreshResponse = await backendRequest('/api/v1/auth/mobile/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: refresh }),
      });
      if (refreshResponse.ok) {
        rotated = await refreshResponse.json();
        access = rotated?.accessToken;
        if (typeof access === 'string') {
          response = await backendRequest(`/api/v1/analytics/users?days=${days}`, {
            headers: { Authorization: `Bearer ${access}` },
          });
        }
      }
    }

    if (!response.ok) {
      const code = [401, 403].includes(response.status) ? response.status : 503;
      return reply(
        {
          error: {
            message:
              code === 403 ? 'Administrator permission required.' : 'Unable to load analytics.',
          },
        },
        code,
      );
    }

    const metrics = await response.json();
    const result = reply(metrics, 200);
    if (rotated?.accessToken && rotated?.refreshToken) {
      result.cookies.set(ACCESS_COOKIE, rotated.accessToken, {
        ...sessionCookieOptions,
        maxAge: 15 * 60,
      });
      const seconds = Math.max(
        1,
        Math.min(
          30 * 24 * 60 * 60,
          Math.floor((Date.parse(rotated.refreshExpiresAt) - Date.now()) / 1000),
        ),
      );
      result.cookies.set(REFRESH_COOKIE, rotated.refreshToken, {
        ...sessionCookieOptions,
        maxAge: Number.isFinite(seconds) ? seconds : 15 * 60,
      });
    }
    return result;
  } catch {
    return reply({ error: { message: 'Analytics are temporarily unavailable.' } }, 503);
  }
}
