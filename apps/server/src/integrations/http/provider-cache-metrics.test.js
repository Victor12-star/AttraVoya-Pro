import { describe, expect, it, vi } from 'vitest';

import { createProviderCache } from './provider-cache.js';

/**
 * @returns {{ promise: Promise<void>, resolve: (value: void | PromiseLike<void>) => void }}
 */
function deferredVoid() {
  /** @type {(value: void | PromiseLike<void>) => void} */
  let resolve = () => {};
  /** @type {Promise<void>} */
  const promise = new Promise((resolvePromise) => {
    resolve = resolvePromise;
  });

  return { promise, resolve };
}

function recordedOutcomes(metrics) {
  return metrics.record.mock.calls.map(([event]) => event.outcome);
}

describe('provider cache metrics integration', () => {
  it('records misses, coalescing and hits without exposing cache keys', async () => {
    const metrics = { record: vi.fn() };
    const cache = createProviderCache({ metrics });
    const gate = deferredVoid();
    const privateKey = '59.3293:18.0686:family-trip-budget';
    let loaderCalls = 0;

    const loader = async () => {
      loaderCalls += 1;
      await gate.promise;
      return { forecast: 'verified-provider-data' };
    };

    const first = cache.getOrLoad(privateKey, loader, 60);
    const second = cache.getOrLoad(privateKey, loader, 60);
    await Promise.resolve();

    expect(loaderCalls).toBe(1);
    gate.resolve(undefined);
    await expect(Promise.all([first, second])).resolves.toEqual([
      { forecast: 'verified-provider-data' },
      { forecast: 'verified-provider-data' },
    ]);
    await expect(cache.getOrLoad(privateKey, loader, 60)).resolves.toEqual({
      forecast: 'verified-provider-data',
    });

    expect(recordedOutcomes(metrics)).toEqual(['miss', 'load', 'miss', 'coalesced', 'hit']);
    expect(JSON.stringify(metrics.record.mock.calls)).not.toContain(privateKey);
  });

  it('records load failures and in-flight-cap bypasses while remaining bounded', async () => {
    const metrics = { record: vi.fn() };
    const cache = createProviderCache({ maxInFlight: 1, metrics });
    const gate = deferredVoid();

    const first = cache.getOrLoad(
      'first-key',
      async () => {
        await gate.promise;
        return 'first';
      },
      60,
    );
    await Promise.resolve();

    await expect(cache.getOrLoad('second-key', async () => 'second', 60)).resolves.toBe('second');
    await expect(
      cache.getOrLoad('failed-key', async () => {
        throw new Error('upstream failed');
      }, 60),
    ).rejects.toThrow('upstream failed');

    gate.resolve(undefined);
    await expect(first).resolves.toBe('first');

    expect(recordedOutcomes(metrics)).toContain('inflight_bypass');
    expect(recordedOutcomes(metrics)).toContain('load_failure');
  });

  it('records eviction and expiration without storing the affected keys', () => {
    let currentTime = 0;
    const metrics = { record: vi.fn() };
    const cache = createProviderCache({
      maxEntries: 1,
      now: () => currentTime,
      metrics,
    });

    cache.set('private-first-key', 'first', 60);
    cache.set('private-second-key', 'second', 60);
    currentTime = 61_000;

    expect(cache.get('private-second-key')).toBeUndefined();
    expect(recordedOutcomes(metrics)).toEqual(['eviction', 'expiration', 'miss']);
    expect(JSON.stringify(metrics.record.mock.calls)).not.toContain('private-first-key');
    expect(JSON.stringify(metrics.record.mock.calls)).not.toContain('private-second-key');
  });

  it('never changes cache success when the metrics observer fails', async () => {
    const cache = createProviderCache({
      metrics: {
        record() {
          throw new Error('metrics backend unavailable');
        },
      },
    });

    await expect(cache.getOrLoad('key', async () => 'value', 60)).resolves.toBe('value');
    expect(cache.get('key')).toBe('value');
  });
});
