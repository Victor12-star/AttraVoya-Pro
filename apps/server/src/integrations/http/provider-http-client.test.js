import { describe, expect, it, vi } from 'vitest';

import { createProviderHttpClient } from './provider-http-client.js';

function jsonResponse(status, payload, headers = {}) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'content-type': 'application/json', ...headers },
  });
}

/**
 * Creates a controllable Response promise for concurrency/backpressure tests.
 * Initial no-op callbacks keep strict JavaScript checking from treating the
 * resolver functions as possibly undefined before the Promise executor runs.
 *
 * @returns {{
 *   promise: Promise<Response>,
 *   resolve: (value: Response | PromiseLike<Response>) => void,
 *   reject: (reason?: unknown) => void,
 * }}
 */
function deferredResponse() {
  /** @type {(value: Response | PromiseLike<Response>) => void} */
  let resolve = () => {};
  /** @type {(reason?: unknown) => void} */
  let reject = () => {};
  /** @type {Promise<Response>} */
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });

  return { promise, resolve, reject };
}

async function flushMicrotasks() {
  await Promise.resolve();
  await Promise.resolve();
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
    const sleepImpl = vi.fn().mockResolvedValue(undefined);
    const client = createProviderHttpClient({
      provider: 'test',
      fetchImpl,
      retryMax: 1,
      sleepImpl,
      randomImpl: () => 0.5,
    });

    await expect(client.requestJson('https://provider.example/data')).resolves.toEqual({
      ok: true,
    });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(sleepImpl).toHaveBeenCalledTimes(1);
  });

  it('keeps retry jitter inside the defined equal-jitter bounds', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(503, { error: 'temporary-1' }))
      .mockResolvedValueOnce(jsonResponse(503, { error: 'temporary-2' }))
      .mockResolvedValueOnce(jsonResponse(200, { ok: true }));
    const sleepImpl = vi.fn().mockResolvedValue(undefined);
    const randomImpl = vi.fn().mockReturnValueOnce(0).mockReturnValueOnce(0.999999);
    const client = createProviderHttpClient({
      provider: 'test',
      fetchImpl,
      retryMax: 2,
      sleepImpl,
      randomImpl,
    });

    await expect(client.requestJson('https://provider.example/data')).resolves.toEqual({
      ok: true,
    });
    expect(sleepImpl).toHaveBeenNthCalledWith(1, 125);
    expect(sleepImpl).toHaveBeenNthCalledWith(2, 500);
  });

  it('never exceeds the configured in-flight concurrency cap', async () => {
    /** @type {ReturnType<typeof deferredResponse>[]} */
    const pendingFetches = [];
    let activeFetches = 0;
    let maxActiveFetches = 0;
    const fetchImpl = vi.fn(() => {
      activeFetches += 1;
      maxActiveFetches = Math.max(maxActiveFetches, activeFetches);
      const pending = deferredResponse();
      pendingFetches.push(pending);

      return pending.promise.finally(() => {
        activeFetches -= 1;
      });
    });
    const client = createProviderHttpClient({
      provider: 'test',
      fetchImpl,
      retryMax: 0,
      maxConcurrent: 2,
      maxQueued: 2,
    });

    const requests = [0, 1, 2, 3].map((id) =>
      client.requestJson(`https://provider.example/data/${id}`),
    );
    await flushMicrotasks();

    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(maxActiveFetches).toBe(2);

    pendingFetches[0].resolve(jsonResponse(200, { id: 0 }));
    await expect(requests[0]).resolves.toEqual({ id: 0 });
    await flushMicrotasks();
    expect(fetchImpl).toHaveBeenCalledTimes(3);
    expect(maxActiveFetches).toBe(2);

    pendingFetches[1].resolve(jsonResponse(200, { id: 1 }));
    await expect(requests[1]).resolves.toEqual({ id: 1 });
    await flushMicrotasks();
    expect(fetchImpl).toHaveBeenCalledTimes(4);
    expect(maxActiveFetches).toBe(2);

    pendingFetches[2].resolve(jsonResponse(200, { id: 2 }));
    pendingFetches[3].resolve(jsonResponse(200, { id: 3 }));
    await expect(Promise.all(requests)).resolves.toEqual([
      { id: 0 },
      { id: 1 },
      { id: 2 },
      { id: 3 },
    ]);
    expect(maxActiveFetches).toBe(2);
  });

  it('releases queued work after both successful and failed requests', async () => {
    const firstFetch = deferredResponse();
    const secondFetch = deferredResponse();
    const fetchImpl = vi
      .fn()
      .mockImplementationOnce(() => firstFetch.promise)
      .mockImplementationOnce(() => secondFetch.promise)
      .mockResolvedValueOnce(jsonResponse(200, { id: 3 }));
    const client = createProviderHttpClient({
      provider: 'test',
      fetchImpl,
      retryMax: 0,
      maxConcurrent: 1,
      maxQueued: 2,
    });

    const firstRequest = client.requestJson('https://provider.example/data/1');
    const secondRequest = client.requestJson('https://provider.example/data/2');
    const thirdRequest = client.requestJson('https://provider.example/data/3');
    await flushMicrotasks();
    expect(fetchImpl).toHaveBeenCalledTimes(1);

    firstFetch.resolve(jsonResponse(200, { id: 1 }));
    await expect(firstRequest).resolves.toEqual({ id: 1 });
    await flushMicrotasks();
    expect(fetchImpl).toHaveBeenCalledTimes(2);

    secondFetch.reject(new Error('provider connection failed'));
    await expect(secondRequest).rejects.toMatchObject({
      code: 'PROVIDER_UNAVAILABLE',
      details: { provider: 'test', reason: 'network' },
    });
    await flushMicrotasks();
    expect(fetchImpl).toHaveBeenCalledTimes(3);
    await expect(thirdRequest).resolves.toEqual({ id: 3 });
  });

  it('fails closed when the bounded provider queue is full', async () => {
    const firstFetch = deferredResponse();
    const fetchImpl = vi
      .fn()
      .mockImplementationOnce(() => firstFetch.promise)
      .mockResolvedValueOnce(jsonResponse(200, { id: 2 }));
    const client = createProviderHttpClient({
      provider: 'test',
      fetchImpl,
      retryMax: 0,
      maxConcurrent: 1,
      maxQueued: 1,
    });

    const firstRequest = client.requestJson('https://provider.example/data/1');
    const secondRequest = client.requestJson('https://provider.example/data/2');
    const rejectedRequest = client.requestJson('https://provider.example/data/3');

    await expect(rejectedRequest).rejects.toMatchObject({
      code: 'PROVIDER_UNAVAILABLE',
      details: {
        provider: 'test',
        reason: 'busy',
        maxConcurrent: 1,
        maxQueued: 1,
      },
    });
    expect(fetchImpl).toHaveBeenCalledTimes(1);

    firstFetch.resolve(jsonResponse(200, { id: 1 }));
    await expect(firstRequest).resolves.toEqual({ id: 1 });
    await expect(secondRequest).resolves.toEqual({ id: 2 });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });
});
