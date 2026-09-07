import { describe, expect, it, vi } from 'vitest';

import { createHttpRequestMetrics, createHttpRequestMetricsHook } from './http-request-metrics.js';

describe('HTTP request metrics', () => {
  it('reports bounded request rate, 5xx error rate, status classes and latency percentiles', () => {
    let nowMs = 1_000;
    const metrics = createHttpRequestMetrics({ now: () => nowMs });

    metrics.record({ method: 'GET', route: '/health/live', statusCode: 200, durationMs: 10 });
    metrics.record({ method: 'GET', route: '/health/live', statusCode: 200, durationMs: 75 });
    metrics.record({
      method: 'POST',
      route: '/planner/requests',
      statusCode: 201,
      durationMs: 300,
    });
    metrics.record({
      method: 'POST',
      route: '/planner/requests',
      statusCode: 503,
      durationMs: 1_200,
    });
    metrics.record({ method: 'GET', route: '/places', statusCode: 404, durationMs: 9_000 });

    nowMs = 11_000;
    const snapshot = metrics.snapshot();

    expect(snapshot.windowSeconds).toBe(10);
    expect(snapshot.overall.requests).toBe(5);
    expect(snapshot.overall.requestsPerSecond).toBe(0.5);
    expect(snapshot.overall.serverErrors).toBe(1);
    expect(snapshot.overall.serverErrorRate).toBe(0.2);
    expect(snapshot.overall.statusClasses).toEqual({
      '1xx': 0,
      '2xx': 3,
      '3xx': 0,
      '4xx': 1,
      '5xx': 1,
      other: 0,
    });
    expect(snapshot.overall.latencyMsUpperBound).toEqual({
      p50: 500,
      p95: 10_000,
      p99: 10_000,
    });
  });

  it('caps route series and aggregates excess routes into a fixed overflow series', () => {
    const metrics = createHttpRequestMetrics({ maxSeries: 2 });

    metrics.record({ method: 'GET', route: '/one', statusCode: 200, durationMs: 10 });
    metrics.record({ method: 'GET', route: '/two', statusCode: 200, durationMs: 20 });
    metrics.record({ method: 'GET', route: '/three', statusCode: 200, durationMs: 30 });
    metrics.record({ method: 'POST', route: '/four', statusCode: 500, durationMs: 40 });

    const snapshot = metrics.snapshot();
    const overflow = snapshot.series.find((series) => series.route === '<overflow>');

    expect(snapshot.series).toHaveLength(3);
    expect(overflow).toMatchObject({
      method: '*',
      route: '<overflow>',
      requests: 2,
      serverErrors: 1,
    });
  });

  it('records only the route supplied by the privacy-safe route resolver', async () => {
    const record = vi.fn();
    const hook = createHttpRequestMetricsHook(
      { record },
      (request) => request.routeOptions?.url ?? '<unmatched>',
    );

    await hook(
      {
        method: 'GET',
        url: '/planner/requests/private-id?destination=private-place',
        routeOptions: { url: '/planner/requests/:requestId' },
      },
      { statusCode: 503, elapsedTime: 42.5 },
    );

    expect(record).toHaveBeenCalledWith({
      method: 'GET',
      route: '/planner/requests/:requestId',
      statusCode: 503,
      durationMs: 42.5,
    });
    expect(JSON.stringify(record.mock.calls)).not.toContain('private-id');
    expect(JSON.stringify(record.mock.calls)).not.toContain('private-place');
  });
});
