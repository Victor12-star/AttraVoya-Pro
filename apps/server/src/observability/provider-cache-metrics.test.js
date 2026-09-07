import { describe, expect, it } from 'vitest';

import { createProviderCacheMetrics } from './provider-cache-metrics.js';

describe('provider cache metrics', () => {
  it('reports aggregate hit rate and cache-load behavior without labels', () => {
    let currentTime = 0;
    const metrics = createProviderCacheMetrics({ now: () => currentTime });

    metrics.record({ outcome: 'hit' });
    metrics.record({ outcome: 'miss' });
    metrics.record({ outcome: 'load' });
    metrics.record({ outcome: 'load' });
    metrics.record({ outcome: 'load_failure' });
    metrics.record({ outcome: 'coalesced' });
    metrics.record({ outcome: 'inflight_bypass' });
    metrics.record({ outcome: 'eviction' });
    metrics.record({ outcome: 'expiration' });
    currentTime = 2_000;

    expect(metrics.snapshot()).toEqual({
      windowSeconds: 2,
      accesses: 2,
      accessesPerSecond: 1,
      hits: 1,
      misses: 1,
      hitRate: 0.5,
      loads: 2,
      loadFailures: 1,
      loadFailureRate: 0.5,
      coalesced: 1,
      inFlightBypasses: 1,
      evictions: 1,
      expirations: 1,
      other: 0,
    });
  });

  it('keeps unknown outcomes bounded in one aggregate counter', () => {
    const metrics = createProviderCacheMetrics();

    metrics.record({ outcome: 'unexpected-private-value' });

    const snapshot = metrics.snapshot();
    expect(snapshot.other).toBe(1);
    expect(snapshot.accesses).toBe(0);
  });

  it('rejects an invalid clock dependency', () => {
    /** @type {any} */
    const invalidNow = null;
    expect(() => createProviderCacheMetrics({ now: invalidNow })).toThrow(
      'now must be a function.',
    );
  });
});
