import { NextResponse } from 'next/server';

import { ACCESS_COOKIE, backendRequest, validSameOrigin } from '../../../../lib/admin-backend.js';

export async function POST(request) {
  if (!validSameOrigin(request)) {
    return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
  }

  const access = request.cookies.get(ACCESS_COOKIE)?.value;
  if (!access) return NextResponse.json({ error: 'Please sign in again.' }, { status: 401 });

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }
  if (
    typeof body?.email !== 'string' ||
    body.email.length > 320 ||
    typeof body?.currentPassword !== 'string' ||
    body.currentPassword.length > 128 ||
    !['grant', 'revoke'].includes(body?.action)
  ) {
    return NextResponse.json({ error: 'Enter valid administrator details.' }, { status: 400 });
  }

  try {
    const response = await backendRequest('/api/v1/users/admin-role', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${access}` },
      body: JSON.stringify({
        email: body.email,
        currentPassword: body.currentPassword,
        action: body.action,
      }),
    });
    if (!response.ok) {
      const status = response.status;
      const messages = {
        400: 'The target must have an active, verified account and cannot be an owner.',
        401: 'Owner password confirmation or session failed.',
        403: 'Only the Super Admin can manage administrator roles.',
        409: 'Account or permissions changed; sign in and try again.',
        429: 'Too many requests. Please try again later.',
      };
      return NextResponse.json(
        { error: messages[status] ?? 'Administrator role update temporarily unavailable.' },
        { status: [400, 401, 403, 409, 429].includes(status) ? status : 503 },
      );
    }
    const result = await response.json();
    return NextResponse.json(result, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch {
    return NextResponse.json({ error: 'Administrator role service unavailable.' }, { status: 503 });
  }
}
