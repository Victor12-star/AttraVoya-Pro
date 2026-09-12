import { describe, expect, it } from 'vitest';

import {
  AlignedLocalRateLimitStore,
  createReplicaRateLimitRouteNormalizer,
  partitionDeploymentRateLimitConfig,
  partitionDeploymentRateLimitMax,
} from './replica-rate-limit.js';

function increment(store, key, timeWindow) {
  return new Promise((resolve, reject) => {
    store.incr(
      key,
      (error, state) => {
        if (error) reject(error);
        else resolve(state);
      },
      timeWindow,
    );
  });
}

describe('replica-safe rate limits', () => {
  it('partitions deployment-wide maxima conservatively across declared replicas', () => {
    expect(partitionDeploymentRateLimitMax(120, 1)).toBe(120);
    expect(partitionDeploymentRateLimitMax(120, 2)).toBe(60);
    expect(partitionDeploymentRateLimitMax(30, 4)).toBe(7);
    expect(partitionDeploymentRateLimitMax(10, 2)).toBe(5);
    expect(partitionDeploymentRateLimitConfig({ max: 300, timeWindow: '1 minute' }, 2)).toEqual(
      { max: 150, timeWindow: '1 minute' },
    );
  });

  it('fails closed when a configured ceiling cannot reserve one request per replica', () => {
    expect(() => partitionDeploymentRateLimitMax(10, 11)).toThrow(
      'Rate-limit max 10 cannot reserve a non-zero share for 11 declared API replicas.',
    );
  });

  it('partitions a frozen route override exactly once', () => {
    const normalizeRoute = createReplicaRateLimitRouteNormalizer(2);
    const routeOptions = {
      config: {
        rateLimit: Object.freeze({ max: 10, timeWindow: '1 minute' }),
      },
    };

    normalizeRoute(routeOptions);
    expect(routeOptions.config.rateLimit.max).toBe(5);

    normalizeRoute(routeOptions);
    expect(routeOptions.config.rateLimit.max).toBe(5);
  });

  it('rejects dynamic multi-replica route limits instead of leaving them unpartitioned', () => {
    const normalizeRoute = createReplicaRateLimitRouteNormalizer(2);

    expect(() =>
      normalizeRoute({
        config: { rateLimit: { max: () => 10, timeWindow: '1 minute' } },
      }),
    ).toThrow('Multi-replica rate limits require a fixed numeric max.');

    expect(() =>
      normalizeRoute({
        config: { rateLimit: { max: 10, timeWindow: () => 60_000 } },
      }),
    ).toThrow('Multi-replica rate limits require a fixed time window.');
  });

  it('aligns independent replica windows to the same wall-clock boundary', async () => {
    let firstNow = 10_000;
    let secondNow = 40_000;
    const firstStore = new AlignedLocalRateLimitStore({ now: () => firstNow });
    const secondStore = new AlignedLocalRateLimitStore({ now: () => secondNow });

    await expect(increment(firstStore, 'client', 60_000)).resolves.toEqual({
      current: 1,
      ttl: 50_000,
    });
    await expect(increment(secondStore, 'client', 60_000)).resolves.toEqual({
      current: 1,
      ttl: 20_000,
    });

    firstNow = 60_000;
    secondNow = 60_000;

    await expect(increment(firstStore, 'client', 60_000)).resolves.toEqual({
      current: 1,
      ttl: 60_000,
    });
    await expect(increment(secondStore, 'client', 60_000)).resolves.toEqual({
      current: 1,
      ttl: 60_000,
    });
  });

  it('does not reopen an earlier bucket when the wall clock moves backwards', async () => {
    let now = 65_000;
    const store = new AlignedLocalRateLimitStore({ now: () => now });

    await expect(increment(store, 'client', 60_000)).resolves.toMatchObject({ current: 1 });
    now = 55_000;
    await expect(increment(store, 'client', 60_000)).resolves.toMatchObject({ current: 2 });
  });
});
