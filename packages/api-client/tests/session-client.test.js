import { describe, expect, it, vi } from 'vitest';

import { createApiClient } from '../src/index.js';

function jsonResponse(payload) {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}

describe('session API client', () => {
  it('lists active sessions without allowing browser caching', async () => {
    const fetchImpl = vi.fn(async (url, options) => {
      expect(String(url)).toBe('http://localhost:5000/api/v1/auth/sessions');
      expect(options.method).toBe('GET');
      expect(options.credentials).toBe('include');
      expect(options.cache).toBe('no-store');
      return jsonResponse({ sessions: [] });
    });
    const client = createApiClient({ baseUrl: 'http://localhost:5000', fetchImpl });

    await expect(client.listAuthSessions()).resolves.toEqual({ sessions: [] });
  });

  it('validates and safely encodes a targeted session ID before DELETE', async () => {
    const fetchImpl = vi.fn(async (url, options) => {
      expect(String(url)).toBe('http://localhost:5000/api/v1/auth/sessions/session%2Fone');
      expect(options.method).toBe('DELETE');
      expect(options.cache).toBe('no-store');
      return new Response(null, { status: 204 });
    });
    const client = createApiClient({ baseUrl: 'http://localhost:5000', fetchImpl });

    await expect(client.revokeAuthSession(' session/one ')).resolves.toBeNull();
    await expect(client.revokeAuthSession('   ')).rejects.toBeInstanceOf(TypeError);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('revokes all active sessions only through the explicit collection action', async () => {
    const fetchImpl = vi.fn(async (url, options) => {
      expect(String(url)).toBe('http://localhost:5000/api/v1/auth/sessions');
      expect(options.method).toBe('DELETE');
      expect(options.cache).toBe('no-store');
      return new Response(null, { status: 204 });
    });
    const client = createApiClient({ baseUrl: 'http://localhost:5000', fetchImpl });

    await expect(client.revokeAllAuthSessions()).resolves.toBeNull();
  });
});
