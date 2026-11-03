import { NextResponse } from 'next/server';

import {
  ACCESS_COOKIE,
  backendRequest,
} from '../../../../lib/admin-backend.js';

function reply(payload, status) {
  return NextResponse.json(payload, {
    status,
    headers: { 'Cache-Control': 'private, no-store' },
  });
}

export async function GET(request) {
  const page = request.nextUrl.searchParams.get('page') ?? '1';
  if (!/^[1-9][0-9]{0,3}$/.test(page) || Number(page) > 1000) {
    return reply({ error: 'Invalid page number.' }, 400);
  }
  const access = request.cookies.get(ACCESS_COOKIE)?.value;
  if (!access) return reply({ error: 'Please sign in again.' }, 401);
  try {
    const response = await backendRequest(`/api/v1/users/admin-directory?page=${page}`, {
      headers: { Authorization: `Bearer ${access}` },
    });
    if (!response.ok) {
      const status = [401, 403].includes(response.status) ? response.status : 503;
      return reply({
        error: status === 403
          ? 'Platform Owner access required.'
          : status === 401
            ? 'Session expired. Please sign in again.'
            : 'User directory is currently unavailable.',
      }, status);
    }
    const data = await response.json();
    return reply(data, 200);
  } catch {
    return reply({ error: 'User directory is currently unavailable.' }, 503);
  }
}
