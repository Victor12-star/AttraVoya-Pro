import { describe, expect, it } from 'vitest';

import { createProviderCache } from './provider-cache.js';

describe('provider cache', () => {
  it('coalesces concurrent misses for the same key into one loader call', async () => {
    const cache = createProviderCache();
    const gate = Promise.withResolvers();
    let loaderCalls = 0;

    const loader = async () => {
      loaderCalls += 1;
      await gate.promise;
      return { value: 'shared' };
    };

    const first = cache.getOrLoad('same-key', loader, 60);
    const second = cache.getOrLoad('same-key', loader, 60);
    const third = cache.getOrLoad('same-key', loader, 60);

    await Promise.resolve();
    expect(loaderCalls).toBe(1);

    gate.resolve(undefined);
    const results = await Promise.all([first, second, third]);

    expect(results).toEqual([
      { value: 'shared' },
      { value: 'shared' },
      { value: 'shared' },
    ]);
    expect(cache.get('same-key')).toEqual({ value: 'shared' });
  });

  it('clears a rejected in-flight load so a later request can retry', async () => {
    const cache = createProviderCache();
    const upstreamError = new Error('temporary upstream failure');
    let loaderCalls = 0;

    const failingLoader = async () => {
      loaderCalls += 1;
      throw upstreamError;
    };

    const results = await Promise.allSettled([
      cache.getOrLoad('retry-key', failingLoader, 60),
      cache.getOrLoad('retry-key', failingLoader, 60),
    ]);

    expect(loaderCalls).toBe(1);
    expect(results.every((result) => result.status === 'rejected')).toBe(true);
    expect(cache.get('retry-key')).toBeUndefined();

    const recovered = await cache.getOrLoad(
      'retry-key',
      async () => {
        loaderCalls += 1;
        return 'recovered';
      },
      60,
    );

    expect(recovered).toBe('recovered');
    expect(loaderCalls).toBe(2);
  });

  it('allows different cache keys to load independently', async () => {
    const cache = createProviderCache();
    const gate = Promise.withResolvers();
    const started = [];

    const first = cache.getOrLoad(
      'first-key',
      async () => {
        started.push('first');
        await gate.promise;
        return 'first-value';
      },
      60,
    );
    const second = cache.getOrLoad(
      'second-key',
      async () => {
        started.push('second');
        await gate.promise;
        return 'second-value';
      },
      60,
    );

    await Promise.resolve();
    expect(started).toEqual(['first', 'second']);

    gate.resolve(undefined);
    await expect(Promise.all([first, second])).resolves.toEqual(['first-value', 'second-value']);
  });

  it('keeps cache and in-flight limits fail-fast and explicit', () => {
    expect(() => createProviderCache({ maxEntries: 0 })).toThrow(
      'Provider cache maxEntries must be a positive integer.',
    );
    expect(() => createProviderCache({ maxInFlight: 0 })).toThrow(
      'Provider cache maxInFlight must be a positive integer.',
    );
  });
});
