import { describe, expect, it, vi } from 'vitest';

import { ApiClientError, createApiClient } from '../src/index.js';

describe('API client', () => {
  it('normalizes API errors and preserves request IDs', async () => {
    const fetchImpl = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Invalid search.',
              requestId: 'request-123',
            },
          }),
          { status: 400, headers: { 'content-type': 'application/json' } },
        ),
    );
    const client = createApiClient({ baseUrl: 'http://localhost:5000', fetchImpl });

    await expect(client.request('/api/v1/example')).rejects.toMatchObject({
      name: 'ApiClientError',
      status: 400,
      code: 'VALIDATION_ERROR',
      requestId: 'request-123',
    });
  });

  it('adds a mobile Bearer token only when supplied by the caller', async () => {
    const fetchImpl = vi.fn(async (_url, options) => {
      expect(options.headers.get('authorization')).toBe('Bearer mobile-token');
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    });
    const client = createApiClient({
      baseUrl: 'http://localhost:5000',
      fetchImpl,
      getAccessToken: async () => 'mobile-token',
      credentials: 'omit',
    });

    await expect(client.request('/api/v1/example')).resolves.toEqual({ ok: true });
  });

  it('throws a network-safe error instead of leaking fetch details', async () => {
    const client = createApiClient({
      baseUrl: 'http://localhost:5000',
      fetchImpl: async () => {
        throw new Error('socket internals');
      },
    });

    await expect(client.request('/api/v1/example')).rejects.toBeInstanceOf(ApiClientError);
    await expect(client.request('/api/v1/example')).rejects.toMatchObject({
      code: 'NETWORK_ERROR',
    });
  });
});
