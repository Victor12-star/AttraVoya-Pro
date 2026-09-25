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

  it('requests the current RevenueCat Android identity through a private no-store boundary', async () => {
    const appUserId = 'av_rc_AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
    const fetchImpl = vi.fn(async (url, options) => {
      expect(String(url)).toBe('http://localhost:5000/api/v1/payments/revenuecat/android/identity');
      expect(options.method).toBe('GET');
      expect(options.cache).toBe('no-store');
      expect(options.body).toBeUndefined();
      return new Response(JSON.stringify({ appUserId }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    });
    const client = createApiClient({ baseUrl: 'http://localhost:5000', fetchImpl });

    await expect(client.getRevenueCatAndroidIdentity()).resolves.toEqual({ appUserId });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('forwards cancellation to cached country reference requests', async () => {
    const callerController = new AbortController();
    const fetchImpl = vi.fn(
      async (_url, options) =>
        new Promise((_resolve, reject) => {
          expect(options.cache).toBe('force-cache');
          options.signal.addEventListener(
            'abort',
            () => reject(new DOMException('aborted', 'AbortError')),
            { once: true },
          );
        }),
    );
    const client = createApiClient({ baseUrl: 'http://localhost:5000', fetchImpl });

    const request = client.getCountries({ signal: callerController.signal });
    const expectation = expect(request).rejects.toMatchObject({ code: 'REQUEST_ABORTED' });
    callerController.abort();

    await expectation;
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('builds a provider-neutral destination search URL', async () => {
    const fetchImpl = vi.fn(async (url) => {
      expect(String(url)).toBe(
        'http://localhost:5000/api/v1/destinations/search?query=Stockholm&language=sv&countryCode=SE&limit=8',
      );
      return new Response(JSON.stringify({ destinations: { results: [] } }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    });
    const client = createApiClient({ baseUrl: 'http://localhost:5000', fetchImpl });

    await expect(
      client.searchDestinations({
        query: 'Stockholm',
        language: 'sv',
        countryCode: 'SE',
        limit: 8,
      }),
    ).resolves.toEqual({ destinations: { results: [] } });
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
  it('keeps the hard timeout active when the caller also supplies a signal', async () => {
    vi.useFakeTimers();
    const callerController = new AbortController();
    const client = createApiClient({
      baseUrl: 'http://localhost:5000',
      timeoutMs: 25,
      fetchImpl: async (_url, { signal }) =>
        new Promise((_resolve, reject) => {
          signal.addEventListener(
            'abort',
            () => reject(new DOMException('aborted', 'AbortError')),
            { once: true },
          );
        }),
    });

    const request = client.request('/api/v1/example', { signal: callerController.signal });
    const expectation = expect(request).rejects.toMatchObject({ code: 'REQUEST_TIMEOUT' });
    await vi.advanceTimersByTimeAsync(25);

    await expectation;
    vi.useRealTimers();
  });

  it('reports caller cancellation separately from a timeout', async () => {
    const callerController = new AbortController();
    const client = createApiClient({
      baseUrl: 'http://localhost:5000',
      fetchImpl: async (_url, { signal }) =>
        new Promise((_resolve, reject) => {
          signal.addEventListener(
            'abort',
            () => reject(new DOMException('aborted', 'AbortError')),
            { once: true },
          );
        }),
    });

    const request = client.request('/api/v1/example', { signal: callerController.signal });
    const expectation = expect(request).rejects.toMatchObject({ code: 'REQUEST_ABORTED' });
    callerController.abort();

    await expectation;
  });
  it('preserves caller cancellation when a custom reason and slow rejection cross the deadline', async () => {
    vi.useFakeTimers();
    const callerController = new AbortController();
    const client = createApiClient({
      baseUrl: 'http://localhost:5000',
      timeoutMs: 25,
      fetchImpl: async (_url, { signal }) =>
        new Promise((_resolve, reject) => {
          signal.addEventListener(
            'abort',
            () => setTimeout(() => reject(new Error('custom abort internals')), 30),
            { once: true },
          );
        }),
    });

    const request = client.request('/api/v1/example', { signal: callerController.signal });
    const expectation = expect(request).rejects.toMatchObject({ code: 'REQUEST_ABORTED' });
    callerController.abort(new Error('screen disposed'));
    await vi.advanceTimersByTimeAsync(50);

    await expectation;
    vi.useRealTimers();
  });
  it('rejects a response whose declared size exceeds the safe client boundary', async () => {
    const client = createApiClient({
      baseUrl: 'http://localhost:5000',
      maxResponseBytes: 16,
      fetchImpl: async () =>
        new Response(JSON.stringify({ result: 'small body' }), {
          status: 200,
          headers: {
            'content-type': 'application/json',
            'content-length': '1024',
            'x-request-id': 'request-large-declared',
          },
        }),
    });

    await expect(client.request('/api/v1/example')).rejects.toMatchObject({
      name: 'ApiClientError',
      status: 200,
      code: 'API_RESPONSE_TOO_LARGE',
      requestId: 'request-large-declared',
    });
  });

  it('stops an undeclared streamed response after it crosses the safe boundary', async () => {
    const encoder = new TextEncoder();
    let cancelled = false;
    const body = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode('{"items":'));
        controller.enqueue(encoder.encode('["unexpectedly large"]}'));
      },
      cancel() {
        cancelled = true;
      },
    });
    const client = createApiClient({
      baseUrl: 'http://localhost:5000',
      maxResponseBytes: 12,
      fetchImpl: async () =>
        new Response(body, {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
    });

    await expect(client.request('/api/v1/example')).rejects.toMatchObject({
      code: 'API_RESPONSE_TOO_LARGE',
    });
    expect(cancelled).toBe(true);
  });

  it('rejects an invalid response-size configuration before making requests', () => {
    expect(() =>
      createApiClient({
        baseUrl: 'http://localhost:5000',
        maxResponseBytes: 0,
        fetchImpl: vi.fn(),
      }),
    ).toThrow('maxResponseBytes must be a positive safe integer.');
  });

  it('rejects a successful non-JSON response at the shared client boundary', async () => {
    const client = createApiClient({
      baseUrl: 'http://localhost:5000',
      fetchImpl: async () =>
        new Response('<html>proxy error</html>', {
          status: 200,
          headers: {
            'content-type': 'text/html; charset=utf-8',
            'x-request-id': 'request-unexpected-format',
          },
        }),
    });

    await expect(client.request('/api/v1/example')).rejects.toMatchObject({
      name: 'ApiClientError',
      status: 200,
      code: 'INVALID_API_RESPONSE',
      requestId: 'request-unexpected-format',
    });
  });

  it('accepts JSON-compatible vendor media types', async () => {
    const client = createApiClient({
      baseUrl: 'http://localhost:5000',
      fetchImpl: async () =>
        new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { 'content-type': 'application/problem+json; charset=utf-8' },
        }),
    });

    await expect(client.request('/api/v1/example')).resolves.toEqual({ ok: true });
  });

  it('allows a valid no-content response without a content type', async () => {
    const client = createApiClient({
      baseUrl: 'http://localhost:5000',
      fetchImpl: async () => new Response(null, { status: 204 }),
    });

    await expect(client.request('/api/v1/example')).resolves.toBeNull();
  });

  it.each([
    ['null', null],
    ['an array', []],
    ['a string', 'unexpected'],
    ['a number', 42],
    ['a boolean', true],
  ])('rejects a successful JSON response whose top level is %s', async (_label, payload) => {
    const client = createApiClient({
      baseUrl: 'http://localhost:5000',
      fetchImpl: async () =>
        new Response(JSON.stringify(payload), {
          status: 200,
          headers: {
            'content-type': 'application/json',
            'x-request-id': 'request-invalid-envelope',
          },
        }),
    });

    await expect(client.request('/api/v1/example')).rejects.toMatchObject({
      name: 'ApiClientError',
      status: 200,
      code: 'INVALID_API_RESPONSE',
      requestId: 'request-invalid-envelope',
    });
  });

  it('applies the hard timeout while mobile access-token retrieval is stalled', async () => {
    vi.useFakeTimers();
    const fetchImpl = vi.fn();
    const client = createApiClient({
      baseUrl: 'http://localhost:5000',
      timeoutMs: 25,
      fetchImpl,
      getAccessToken: () => new Promise(() => {}),
    });

    const request = client.request('/api/v1/example');
    const expectation = expect(request).rejects.toMatchObject({ code: 'REQUEST_TIMEOUT' });
    await vi.advanceTimersByTimeAsync(25);

    await expectation;
    expect(fetchImpl).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('releases a request when its caller cancels stalled access-token retrieval', async () => {
    const callerController = new AbortController();
    const fetchImpl = vi.fn();
    const client = createApiClient({
      baseUrl: 'http://localhost:5000',
      fetchImpl,
      getAccessToken: () => new Promise(() => {}),
    });

    const request = client.request('/api/v1/example', { signal: callerController.signal });
    const expectation = expect(request).rejects.toMatchObject({ code: 'REQUEST_ABORTED' });
    callerController.abort();

    await expectation;
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
