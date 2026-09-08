import { describe, expect, it } from 'vitest';

import {
  createRouteWatchState,
  distanceBetweenMeters,
  distanceFromRouteMeters,
  evaluateRoutePosition,
} from '../../src/features/safety/route-deviation.js';

const ROUTE = [
  { latitude: 59.3293, longitude: 18.0686 },
  { latitude: 59.33, longitude: 18.08 },
  { latitude: 59.328, longitude: 18.0914 },
];

describe('Safe Ride route deviation evaluation', () => {
  it('computes bounded geographic distance values', () => {
    const distance = distanceBetweenMeters(ROUTE[0], ROUTE[1]);
    expect(distance).toBeGreaterThan(600);
    expect(distance).toBeLessThan(700);
    expect(distanceBetweenMeters({ latitude: 100, longitude: 0 }, ROUTE[0])).toBeNull();
  });

  it('treats a point near the expected path as on route', () => {
    const distance = distanceFromRouteMeters(
      { latitude: 59.3298, longitude: 18.0799 },
      ROUTE,
    );
    expect(distance).not.toBeNull();
    expect(distance).toBeLessThan(100);

    const result = evaluateRoutePosition({
      position: { latitude: 59.3298, longitude: 18.0799 },
      accuracyMeters: 15,
      routePath: ROUTE,
      nowMs: 10_000,
    });
    expect(result.status).toBe('on-route');
    expect(result.offRouteSince).toBeNull();
  });

  it('does not alert on one short-lived off-route GPS sample', () => {
    const result = evaluateRoutePosition({
      position: { latitude: 59.34, longitude: 18.08 },
      accuracyMeters: 15,
      routePath: ROUTE,
      previousState: createRouteWatchState(),
      nowMs: 10_000,
    });
    expect(result.status).toBe('checking');
    expect(result.offRouteSamples).toBe(1);
  });

  it('alerts only after a sustained multi-sample route deviation', () => {
    const first = evaluateRoutePosition({
      position: { latitude: 59.34, longitude: 18.08 },
      accuracyMeters: 10,
      routePath: ROUTE,
      nowMs: 10_000,
    });
    const second = evaluateRoutePosition({
      position: { latitude: 59.341, longitude: 18.081 },
      accuracyMeters: 10,
      routePath: ROUTE,
      previousState: first,
      nowMs: 20_000,
    });
    const third = evaluateRoutePosition({
      position: { latitude: 59.342, longitude: 18.082 },
      accuracyMeters: 10,
      routePath: ROUTE,
      previousState: second,
      nowMs: 31_000,
    });

    expect(first.status).toBe('checking');
    expect(second.status).toBe('checking');
    expect(third.status).toBe('deviated');
    expect(third.offRouteSamples).toBe(3);
  });

  it('suppresses safety alerts when GPS accuracy is too poor', () => {
    const result = evaluateRoutePosition({
      position: { latitude: 59.35, longitude: 18.1 },
      accuracyMeters: 180,
      routePath: ROUTE,
      previousState: {
        status: 'checking',
        offRouteSince: 1_000,
        offRouteSamples: 8,
        distanceFromRouteMeters: 900,
      },
      nowMs: 60_000,
    });

    expect(result.status).toBe('low-accuracy');
    expect(result.offRouteSince).toBeNull();
    expect(result.offRouteSamples).toBe(0);
  });

  it('clears a pending or active deviation after returning to the route', () => {
    const result = evaluateRoutePosition({
      position: { latitude: 59.3298, longitude: 18.0799 },
      accuracyMeters: 12,
      routePath: ROUTE,
      previousState: {
        status: 'deviated',
        offRouteSince: 1_000,
        offRouteSamples: 5,
        distanceFromRouteMeters: 700,
      },
      nowMs: 60_000,
    });

    expect(result.status).toBe('on-route');
    expect(result.offRouteSince).toBeNull();
    expect(result.offRouteSamples).toBe(0);
  });
});
