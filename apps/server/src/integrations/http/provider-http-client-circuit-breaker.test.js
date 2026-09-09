import { describe, expect, it, vi } from 'vitest';

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

describe('provider HTTP client circuit breaker', () => {
  it('opens after consecutive unavailable requests and suppresses new provider calls', async () => {
    let nowMs = 1_000;
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(503, { error: 'down-1' }))
      .mockResolvedValueOnce(jsonResponse(503, { error: 'down-2' }))
      .mockResolvedValueOnce(jsonResponse(200, { ok: true }));
    const client = createProviderHttpClient({
      provider: 'test',
      fetchImpl,
      retryMax: 0,
      circuitFailureThreshold: 2,
      circuitOpenMs: 30_000,
      nowImpl: () => nowMs,
    });

    await expect(client.requestJson('https://provider.example/1')).rejects.toMatchObject({
      code: 'PROVIDER_UNAVAILABLE',
    });
    await expect(client.requestJson('https://provider.example/2')).rejects.toMatchObject({
      code: 'PROVIDER_UNAVAILABLE',
    });

    await expect(client.requestJson('https://provider.example/3')).rejects.toMatchObject({
      code: 'PROVIDER_UNAVAILABLE',
      details: { provider: 'test', reason: 'circuit_open', retryAfter: '30' },
    });
    expect(fetchImpl).toHaveBeenCalledTimes(2);

    nowMs += 30_000;
    await expect(client.requestJson('https://provider.example/4')).resolves.toEqual({ ok: true });
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });

  it('allows only one recovery probe after the circuit cooldown', async () => {
    let nowMs = 5_000;
    const probe = deferredResponse();
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(503, { error: 'down' }))
      .mockImplementationOnce(() => probe.promise)
      .mockResolvedValueOnce(jsonResponse(200, { id: 3 }));
    const client = createProviderHttpClient({
      provider: 'test',
      fetchImpl,
      retryMax: 0,
      maxConcurrent: 2,
      circuitFailureThreshold: 1,
      circuitOpenMs: 1_000,
      nowImpl: () => nowMs,
    });

    await expect(client.requestJson('https://provider.example/1')).rejects.toMatchObject({
      code: 'PROVIDER_UNAVAILABLE',
    });

    nowMs += 1_000;
    const recoveryProbe = client.requestJson('https://provider.example/2');
    await flushMicrotasks();
    expect(fetchImpl).toHaveBeenCalledTimes(2);

    await expect(client.requestJson('https://provider.example/parallel')).rejects.toMatchObject({
      code: 'PROVIDER_UNAVAILABLE',
      details: { reason: 'circuit_open' },
    });
    expect(fetchImpl).toHaveBeenCalledTimes(2);

    probe.resolve(jsonResponse(200, { id: 2 }));
    await expect(recoveryProbe).resolves.toEqual({ id: 2 });

    await expect(client.requestJson('https://provider.example/3')).resolves.toEqual({ id: 3 });
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });

  it('reopens immediately when the recovery probe is still unavailable', async () => {
    let nowMs = 10_000;
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(503, { error: 'down' }))
      .mockResolvedValueOnce(jsonResponse(503, { error: 'still-down' }));
    const client = createProviderHttpClient({
      provider: 'test',
      fetchImpl,
      retryMax: 0,
      circuitFailureThreshold: 1,
      circuitOpenMs: 2_000,
      nowImpl: () => nowMs,
    });

    await expect(client.requestJson('https://provider.example/1')).rejects.toMatchObject({
      code: 'PROVIDER_UNAVAILABLE',
    });

    nowMs += 2_000;
    await expect(client.requestJson('https://provider.example/probe')).rejects.toMatchObject({
      code: 'PROVIDER_UNAVAILABLE',
    });

    await expect(client.requestJson('https://provider.example/suppressed')).rejects.toMatchObject({
      code: 'PROVIDER_UNAVAILABLE',
      details: { reason: 'circuit_open', retryAfter: '2' },
    });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('does not trip on provider responses that are not availability failures', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(503, { error: 'temporary' }))
      .mockResolvedValueOnce(jsonResponse(400, { error: 'bad request' }))
      .mockResolvedValueOnce(jsonResponse(503, { error: 'temporary-again' }))
      .mockResolvedValueOnce(jsonResponse(200, { ok: true }));
    const client = createProviderHttpClient({
      provider: 'test',
      fetchImpl,
      retryMax: 0,
      circuitFailureThreshold: 2,
      circuitOpenMs: 30_000,
    });

    await expect(client.requestJson('https://provider.example/1')).rejects.toMatchObject({
      code: 'PROVIDER_UNAVAILABLE',
    });
    await expect(client.requestJson('https://provider.example/2')).rejects.toMatchObject({
      code: 'PROVIDER_RESPONSE_ERROR',
    });
    await expect(client.requestJson('https://provider.example/3')).rejects.toMatchObject({
      code: 'PROVIDER_UNAVAILABLE',
    });
    await expect(client.requestJson('https://provider.example/4')).resolves.toEqual({ ok: true });
    expect(fetchImpl).toHaveBeenCalledTimes(4);
  });

  it('fails closed for invalid circuit-breaker configuration', () => {
    expect(() =>
      createProviderHttpClient({
        provider: 'test',
        fetchImpl: vi.fn(),
        circuitFailureThreshold: 0,
      }),
    ).toThrow('circuitFailureThreshold must be a positive integer');

    expect(() =>
      createProviderHttpClient({
        provider: 'test',
        fetchImpl: vi.fn(),
        circuitOpenMs: 0,
      }),
    ).toThrow('circuitOpenMs must be a positive integer');
  });
});
