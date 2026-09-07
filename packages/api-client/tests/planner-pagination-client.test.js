import { describe, expect, it, vi } from 'vitest';

import { createApiClient } from '../src/index.js';

describe('planner pagination API client', () => {
  it('preserves the original list URL without pagination arguments', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ requests: [], page: { hasMore: false, nextCursor: null } }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );
    const client = createApiClient({ baseUrl: 'http://localhost:5000', fetchImpl });

    await client.listBudgetPlanRequests();

    expect(String(fetchImpl.mock.calls[0][0])).toBe(
      'http://localhost:5000/api/v1/planner/requests',
    );
  });

  it('encodes bounded page size and opaque cursor as query parameters', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ requests: [], page: { hasMore: false, nextCursor: null } }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );
    const client = createApiClient({ baseUrl: 'http://localhost:5000', fetchImpl });

    await client.listBudgetPlanRequests({ limit: 12, cursor: 'abc+/=_cursor' });

    const url = new URL(String(fetchImpl.mock.calls[0][0]));
    expect(url.pathname).toBe('/api/v1/planner/requests');
    expect(url.searchParams.get('limit')).toBe('12');
    expect(url.searchParams.get('cursor')).toBe('abc+/=_cursor');
  });
});
