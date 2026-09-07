import { describe, expect, it } from 'vitest';

import { createProviderMetrics } from './provider-metrics.js';

describe('provider metrics', () => {
  it('reports provider request rate, retries, failures, 429s and bounded latency percentiles', () => {
    let nowMs = 1_000;
    const metrics = createProviderMetrics({ now: () => nowMs });

    metrics.record({ provider: 'frankfurter', outcome: 'success', durationMs: 80, attempts: 1 });
    metrics.record({
      provider: 'frankfurter',
      outcome: 'rate_limited',
      durationMs: 120,
      attempts: 1,
    });
    metrics.record({ provider: 'frankfurter', outcome: 'timeout', durationMs: 3_000, attempts: 3 });

    nowMs = 11_000;
    const snapshot = metrics.snapshot();
    const frankfurter = snapshot.providers[0];

    expect(snapshot.windowSeconds).toBe(10);
    expect(frankfurter).toMatchObject({
      provider: 'frankfurter',
      requests: 3,
      requestsPerSecond: 0.3,
      attempts: 5,
      retries: 2,
      successes: 1,
      failures: 2,
      rateLimited: 1,
      latencyMsUpperBound: {
        p50: 250,
        p95: 5_000,
        p99: 5_000,
      },
    });
    expect(frankfurter.failureRate).toBeCloseTo(2 / 3);
    expect(frankfurter.outcomes).toMatchObject({
      success: 1,
      timeout: 1,
      rateLimited: 1,
    });
  });

  it('caps configured provider series and aggregates excess names into one overflow series', () => {
    const metrics = createProviderMetrics({ maxProviders: 2 });

    metrics.record({ provider: 'one', outcome: 'success', durationMs: 10, attempts: 1 });
    metrics.record({ provider: 'two', outcome: 'success', durationMs: 20, attempts: 1 });
    metrics.record({ provider: 'three', outcome: 'network', durationMs: 30, attempts: 2 });
    metrics.record({ provider: 'four', outcome: 'response', durationMs: 40, attempts: 1 });

    const snapshot = metrics.snapshot();
    const overflow = snapshot.providers.find((provider) => provider.provider === '<overflow>');

    expect(snapshot.providers).toHaveLength(3);
    expect(overflow).toMatchObject({
      provider: '<overflow>',
      requests: 2,
      attempts: 3,
      retries: 1,
      failures: 2,
    });
  });

  it('normalizes unknown outcome labels instead of creating new metric dimensions', () => {
    const metrics = createProviderMetrics();

    metrics.record({
      provider: 'Example',
      outcome: 'user-controlled-value',
      durationMs: 10,
      attempts: 1,
    });

    expect(metrics.snapshot().providers[0]).toMatchObject({
      provider: 'example',
      outcomes: { other: 1 },
    });
  });
});
