import { afterEach, describe, expect, it, vi } from 'vitest';

import { createProviderHttpClient } from './provider-http-client.js';

function jsonResponse(status, payload) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

afterEach(() => {
  vi.useRealTimers();
});

describe('provider HTTP client total deadline', () => {
  it('stops retrying when retry delay would cross the logical request deadline', async () => {
    let nowMs = 1_000;
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(503, { error: 'temporary' }));
    const sleepImpl = vi.fn(async (delayMs) => {
      nowMs += delayMs;
    });
    const client = createProviderHttpClient({
      provider: 'test',
      fetchImpl,
      timeoutMs: 1_000,
      totalTimeoutMs: 200,
      retryMax: 3,
      sleepImpl,
      randomImpl: () => 0,
      nowImpl: () => nowMs,
    });

    await expect(client.requestJson('https://provider.example/data')).rejects.toMatchObject({
      code: 'PROVIDER_UNAVAILABLE',
      details: {
        provider: 'test',
        reason: 'timeout',
        scope: 'request',
      },
    });

    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(sleepImpl).toHaveBeenCalledTimes(1);
    expect(sleepImpl).toHaveBeenCalledWith(125);
  });

  it('aborts an active fetch when the total deadline is shorter than the per-attempt timeout', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-09T00:00:00.000Z'));

    const fetchImpl = vi.fn((_url, options) =>
      new Promise((_resolve, reject) => {
        options.signal.addEventListener(
          'abort',
          () => {
            const error = new Error('aborted');
            error.name = 'AbortError';
            reject(error);
          },
          { once: true },
        );
      }),
    );
    const client = createProviderHttpClient({
      provider: 'test',
      fetchImpl,
      timeoutMs: 1_000,
      totalTimeoutMs: 100,
      retryMax: 2,
    });

    const request = client.requestJson('https://provider.example/data');
    const assertion = expect(request).rejects.toMatchObject({
      code: 'PROVIDER_UNAVAILABLE',
      details: {
        provider: 'test',
        reason: 'timeout',
        scope: 'request',
      },
    });

    await vi.advanceTimersByTimeAsync(100);
    await assertion;
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('rejects an invalid total request deadline configuration', () => {
    expect(() =>
      createProviderHttpClient({
        provider: 'test',
        totalTimeoutMs: 0,
      }),
    ).toThrow('Provider HTTP client totalTimeoutMs must be a positive integer.');
  });
});
