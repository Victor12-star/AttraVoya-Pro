import { NextResponse } from 'next/server';

import { ACCESS_COOKIE, backendRequest, validSameOrigin } from '../../../../lib/admin-backend.js';

export async function POST(request) {
  if (!validSameOrigin(request)) {
    return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
  }
  const access = request.cookies.get(ACCESS_COOKIE)?.value;
  if (!access) {
    return NextResponse.json({ error: 'Sign in as the Platform Owner.' }, { status: 401 });
  }
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid invitation request.' }, { status: 400 });
  }
  if (
    typeof body?.email !== 'string' ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email) ||
    body.email.length > 320 ||
    typeof body?.currentPassword !== 'string' ||
    !body.currentPassword ||
    body.currentPassword.length > 128
  ) {
    return NextResponse.json({ error: 'Enter a valid email and owner password.' }, { status: 400 });
  }
  try {
    const response = await backendRequest('/api/v1/users/admin-invitations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${access}` },
      body: JSON.stringify({
        email: body.email.trim().toLowerCase(),
        currentPassword: body.currentPassword,
      }),
    });
    if (!response.ok) {
      const status = response.status;
      const errors = {
        400: 'Check the invitation email address.',
        401: 'Owner password confirmation failed. Sign in and try again.',
        403: 'Only the Platform Owner can invite administrators.',
        429: 'Too many invitations. Please try again later.',
      };
      return NextResponse.json(
        { error: errors[status] ?? 'Invitation email is currently unavailable.' },
        { status: [400,401,403,429].includes(status) ? status : 503 },
      );
    }
    return NextResponse.json(await response.json(), {
      headers: { 'Cache-Control': 'private, no-store' },
    });
  } catch {
    return NextResponse.json({ error: 'Invitation service is currently unavailable.' }, { status: 503 });
  }
}
