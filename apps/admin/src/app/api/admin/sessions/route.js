import { NextResponse } from 'next/server';

import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  backendRequest,
  sessionCookieOptions,
  validSameOrigin,
} from '../../../../lib/admin-backend.js';

function privateResponse(body, status) {
  return NextResponse.json(body, {
    status,
    headers: { 'Cache-Control': 'private, no-store' },
  });
}

export async function GET(request) {
  const access = request.cookies.get(ACCESS_COOKIE)?.value;
  if (!access) return privateResponse({ error: 'Please sign in again.' }, 401);
  try {
    const response = await backendRequest('/api/v1/auth/sessions', {
      headers: { Authorization: `Bearer ${access}` },
    });
    if (!response.ok) {
      return privateResponse({
        error: response.status === 401 ? 'Session expired. Please sign in again.' : 'Unable to load sessions.',
      }, response.status === 401 ? 401 : 503);
    }
    const data = await response.json();
    return privateResponse({ sessions: Array.isArray(data?.sessions) ? data.sessions : [] }, 200);
  } catch {
    return privateResponse({ error: 'Session service temporarily unavailable.' }, 503);
  }
}

export async function DELETE(request) {
  if (!validSameOrigin(request)) return privateResponse({ error: 'Invalid request origin.' }, 403);
  const access = request.cookies.get(ACCESS_COOKIE)?.value;
  if (!access) return privateResponse({ error: 'Please sign in again.' }, 401);
  let body;
  try {
    body = await request.json();
  } catch {
    return privateResponse({ error: 'Confirmation required.' }, 400);
  }
  if (body?.confirmation !== 'SIGN OUT ALL') {
    return privateResponse({ error: 'Type SIGN OUT ALL to confirm.' }, 400);
  }
  try {
    const response = await backendRequest('/api/v1/auth/sessions', {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${access}` },
    });
    if (!response.ok) {
      return privateResponse({
        error: response.status === 401 ? 'Session expired. Please sign in again.' : 'Could not revoke sessions.',
      }, response.status === 401 ? 401 : 503);
    }
    const result = privateResponse({ ok: true }, 200);
    result.cookies.set(ACCESS_COOKIE, '', { ...sessionCookieOptions, maxAge: 0 });
    result.cookies.set(REFRESH_COOKIE, '', { ...sessionCookieOptions, maxAge: 0 });
    return result;
  } catch {
    return privateResponse({ error: 'Session service temporarily unavailable.' }, 503);
  }
}
