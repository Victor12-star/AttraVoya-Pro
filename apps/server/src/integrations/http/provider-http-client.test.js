import { describe, expect, it, vi } from 'vitest';

import { createProviderHttpClient } from './provider-http-client.js';

function jsonResponse(status, payload, headers = {}) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'content-type': 'application/json', ...headers },
  });
}

describe('provider HTTP client', () => {
  it('returns parsed JSON for successful responses', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(200, { ok: true }));
    const client = createProviderHttpClient({ provider: 'test', fetchImpl, retryMax: 0 });

    await expect(client.requestJson('https://provider.example/data')).resolves.toEqual({
      ok: true,
    });
  });

  it('does not retry rate-limit responses in a tight loop', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(jsonResponse(429, { error: 'slow down' }, { 'retry-after': '60' }));
    const client = createProviderHttpClient({ provider: 'test', fetchImpl, retryMax: 3 });

    await expect(client.requestJson('https://provider.example/data')).rejects.toMatchObject({
      code: 'PROVIDER_RATE_LIMITED',
    });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('retries transient GET failures before succeeding', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(503, { error: 'temporary' }))
      .mockResolvedValueOnce(jsonResponse(200, { ok: true }));
    const client = createProviderHttpClient({ provider: 'test', fetchImpl, retryMax: 1 });

    await expect(client.requestJson('https://provider.example/data')).resolves.toEqual({
      ok: true,
    });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });
});
