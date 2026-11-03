import { NextResponse } from 'next/server';

import {
  ACCESS_COOKIE,
  backendRequest,
  validSameOrigin,
} from '../../../../../../lib/admin-backend.js';

export async function POST(request, { params }) {
  if (!validSameOrigin(request)) {
    return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
  }
  const access = request.cookies.get(ACCESS_COOKIE)?.value;
  if (!access) return NextResponse.json({ error: 'Please sign in again.' }, { status: 401 });
  const { invitationId } = await params;
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(invitationId)) {
    return NextResponse.json({ error: 'Invalid invitation.' }, { status: 400 });
  }
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }
  if (
    typeof body?.currentPassword !== 'string' ||
    !body.currentPassword ||
    body.currentPassword.length > 128
  ) {
    return NextResponse.json({ error: 'Enter your owner password.' }, { status: 400 });
  }
  try {
    const response = await backendRequest(
      `/api/v1/users/admin-invitations/${encodeURIComponent(invitationId)}/revoke`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${access}` },
        body: JSON.stringify({ currentPassword: body.currentPassword }),
      },
    );
    if (!response.ok) {
      const status = [400, 401, 403, 429].includes(response.status) ? response.status : 503;
      return NextResponse.json(
        {
          error:
            status === 401
              ? 'Password or session confirmation failed.'
              : status === 403
                ? 'Platform Owner access required.'
                : status === 429
                  ? 'Too many attempts. Please try again later.'
                  : 'Unable to revoke the invitation record.',
        },
        { status },
      );
    }
    return NextResponse.json(await response.json(), {
      headers: { 'Cache-Control': 'private, no-store' },
    });
  } catch {
    return NextResponse.json({ error: 'Invitation service unavailable.' }, { status: 503 });
  }
}
