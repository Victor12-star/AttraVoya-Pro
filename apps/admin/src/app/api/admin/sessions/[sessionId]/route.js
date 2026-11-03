import { NextResponse } from 'next/server';

import { ACCESS_COOKIE, backendRequest, validSameOrigin } from '../../../../../lib/admin-backend.js';

export async function DELETE(request, { params }) {
  if (!validSameOrigin(request)) {
    return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
  }
  const access = request.cookies.get(ACCESS_COOKIE)?.value;
  if (!access) return NextResponse.json({ error: 'Please sign in again.' }, { status: 401 });
  const { sessionId } = await params;
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(sessionId)) {
    return NextResponse.json({ error: 'Invalid session identifier.' }, { status: 400 });
  }
  try {
    const response = await backendRequest(
      `/api/v1/auth/sessions/${encodeURIComponent(sessionId)}`,
      { method: 'DELETE', headers: { Authorization: `Bearer ${access}` } },
    );
    if (!response.ok) {
      return NextResponse.json({
        error: response.status === 401 ? 'Please sign in again.' : 'Could not revoke this session.',
      }, { status: response.status === 401 ? 401 : 503 });
    }
    return NextResponse.json({ ok: true }, {
      headers: { 'Cache-Control': 'private, no-store' },
    });
  } catch {
    return NextResponse.json({ error: 'Session service temporarily unavailable.' }, { status: 503 });
  }
}
