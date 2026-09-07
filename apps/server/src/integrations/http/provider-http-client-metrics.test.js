import { describe, expect, it, vi } from 'vitest';

import { createProviderHttpClient } from './provider-http-client.js';

function jsonResponse(status, payload, headers = {}) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'content-type': 'application/json', ...headers },
  });
}

/**
 * @returns {{ promise: Promise<Response>, resolve: (value: Response) => void }}
 */
function deferredResponse() {
  /** @type {(value: Response) => void} */
  let resolve = () => {};
  const promise = new Promise((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

async function flushMicrotasks() {
  await Promise.resolve();
  await Promise.resolve();
}

describe('provider HTTP client metrics', () => {
  it('records one successful logical request with its retry attempts', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(503, { error: 'temporary' }))
      .mockResolvedValueOnce(jsonResponse(200, { ok: true }));
    const metrics = { record: vi.fn() };
    const client = createProviderHttpClient({
      provider: 'test-provider',
      fetchImpl,
      retryMax: 1,
      sleepImpl: vi.fn().mockResolvedValue(undefined),
      randomImpl: () => 0.5,
      metrics,
    });

    await expect(client.requestJson('https://provider.example/private-query')).resolves.toEqual({
      ok: true,
    });

    expect(metrics.record).toHaveBeenCalledTimes(1);
    expect(metrics.record).toHaveBeenCalledWith({
      provider: 'test-provider',
      outcome: 'success',
      durationMs: expect.any(Number),
      attempts: 2,
    });
    expect(JSON.stringify(metrics.record.mock.calls)).not.toContain('private-query');
  });

  it('records rate limiting without storing the upstream URL or response body', async () => {
    const metrics = { record: vi.fn() };
    const client = createProviderHttpClient({
      provider: 'test-provider',
      fetchImpl: vi
        .fn()
        .mockResolvedValue(
          jsonResponse(429, { private: 'upstream-body' }, { 'retry-after': '60' }),
        ),
      retryMax: 2,
      metrics,
    });

    await expect(client.requestJson('https://provider.example/secret-place')).rejects.toMatchObject(
      {
        code: 'PROVIDER_RATE_LIMITED',
      },
    );

    expect(metrics.record).toHaveBeenCalledWith({
      provider: 'test-provider',
      outcome: 'rate_limited',
      durationMs: expect.any(Number),
      attempts: 1,
    });
    const recorded = JSON.stringify(metrics.record.mock.calls);
    expect(recorded).not.toContain('secret-place');
    expect(recorded).not.toContain('upstream-body');
  });

  it('records a locally suppressed Retry-After request before any provider attempt', async () => {
    let nowMs = 1_000_000;
    const metrics = { record: vi.fn() };
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(jsonResponse(429, { private: 'upstream-body' }, { 'retry-after': '60' }));
    const client = createProviderHttpClient({
      provider: 'test-provider',
      fetchImpl,
      retryMax: 0,
      nowImpl: () => nowMs,
      metrics,
    });

    await expect(client.requestJson('https://provider.example/secret-place')).rejects.toMatchObject(
      {
        code: 'PROVIDER_RATE_LIMITED',
      },
    );
    await expect(
      client.requestJson('https://provider.example/another-place'),
    ).rejects.toMatchObject({
      code: 'PROVIDER_RATE_LIMITED',
    });

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(metrics.record).toHaveBeenNthCalledWith(2, {
      provider: 'test-provider',
      outcome: 'rate_limited',
      durationMs: expect.any(Number),
      attempts: 0,
    });
    const recorded = JSON.stringify(metrics.record.mock.calls);
    expect(recorded).not.toContain('secret-place');
    expect(recorded).not.toContain('another-place');
    expect(recorded).not.toContain('upstream-body');

    nowMs += 60_000;
  });

  it('records bounded-queue rejection as busy before any provider attempt', async () => {
    const firstFetch = deferredResponse();
    const metrics = { record: vi.fn() };
    const client = createProviderHttpClient({
      provider: 'test-provider',
      fetchImpl: vi
        .fn()
        .mockImplementationOnce(() => firstFetch.promise)
        .mockResolvedValueOnce(jsonResponse(200, { id: 2 })),
      retryMax: 0,
      maxConcurrent: 1,
      maxQueued: 1,
      metrics,
    });

    const firstRequest = client.requestJson('https://provider.example/1');
    const secondRequest = client.requestJson('https://provider.example/2');
    const rejectedRequest = client.requestJson('https://provider.example/3');
    await flushMicrotasks();

    await expect(rejectedRequest).rejects.toMatchObject({
      code: 'PROVIDER_UNAVAILABLE',
      details: { reason: 'busy' },
    });
    expect(metrics.record).toHaveBeenCalledWith({
      provider: 'test-provider',
      outcome: 'busy',
      durationMs: expect.any(Number),
      attempts: 0,
    });

    firstFetch.resolve(jsonResponse(200, { id: 1 }));
    await expect(firstRequest).resolves.toEqual({ id: 1 });
    await expect(secondRequest).resolves.toEqual({ id: 2 });
  });

  it('never changes provider success when the metrics observer itself fails', async () => {
    const client = createProviderHttpClient({
      provider: 'test-provider',
      fetchImpl: vi.fn().mockResolvedValue(jsonResponse(200, { ok: true })),
      retryMax: 0,
      metrics: {
        record() {
          throw new Error('metrics backend unavailable');
        },
      },
    });

    await expect(client.requestJson('https://provider.example/data')).resolves.toEqual({
      ok: true,
    });
  });
});
