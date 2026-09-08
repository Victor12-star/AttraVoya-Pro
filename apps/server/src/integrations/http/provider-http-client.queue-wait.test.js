import { afterEach, describe, expect, it, vi } from 'vitest';

import { createProviderHttpClient } from './provider-http-client.js';

function jsonResponse(status, payload) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function deferredResponse() {
  /** @type {(value: Response | PromiseLike<Response>) => void} */
  let resolve = () => {};
  /** @type {Promise<Response>} */
  const promise = new Promise((resolvePromise) => {
    resolve = resolvePromise;
  });

  return { promise, resolve };
}

async function flushMicrotasks() {
  await Promise.resolve();
  await Promise.resolve();
}

afterEach(() => {
  vi.useRealTimers();
});

describe('provider HTTP client queue wait timeout', () => {
  it('fails timed-out queued work without calling the provider or leaking the slot', async () => {
    vi.useFakeTimers();

    const firstFetch = deferredResponse();
    const thirdFetch = deferredResponse();
    const fetchImpl = vi
      .fn()
      .mockImplementationOnce(() => firstFetch.promise)
      .mockImplementationOnce(() => thirdFetch.promise);
    const client = createProviderHttpClient({
      provider: 'test',
      fetchImpl,
      retryMax: 0,
      maxConcurrent: 1,
      maxQueued: 1,
      maxQueueWaitMs: 50,
    });

    const firstRequest = client.requestJson('https://provider.example/data/1');
    const timedOutRequest = client.requestJson('https://provider.example/data/2');
    const timedOutAssertion = expect(timedOutRequest).rejects.toMatchObject({
      code: 'PROVIDER_UNAVAILABLE',
      details: {
        provider: 'test',
        reason: 'busy',
        maxConcurrent: 1,
        maxQueued: 1,
        maxQueueWaitMs: 50,
      },
    });

    await flushMicrotasks();
    expect(fetchImpl).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(50);
    await timedOutAssertion;
    expect(fetchImpl).toHaveBeenCalledTimes(1);

    // The timed-out waiter must be removed from the bounded queue so a later
    // request can wait for the still-active slot instead of being rejected as full.
    const thirdRequest = client.requestJson('https://provider.example/data/3');
    await flushMicrotasks();
    expect(fetchImpl).toHaveBeenCalledTimes(1);

    firstFetch.resolve(jsonResponse(200, { id: 1 }));
    await expect(firstRequest).resolves.toEqual({ id: 1 });
    await flushMicrotasks();
    expect(fetchImpl).toHaveBeenCalledTimes(2);

    thirdFetch.resolve(jsonResponse(200, { id: 3 }));
    await expect(thirdRequest).resolves.toEqual({ id: 3 });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });
});
