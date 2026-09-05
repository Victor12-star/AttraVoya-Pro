import Fastify from 'fastify';
import { serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { mapsRoutes } from './maps.routes.js';

const apps = [];

afterEach(async () => Promise.all(apps.splice(0).map((app) => app.close())));

async function buildMapsApp(provider) {
  const app = Fastify({ logger: false });
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);
  await app.register(mapsRoutes, { prefix: '/api/v1/maps', provider });
  apps.push(app);
  return app;
}

describe('maps route API', () => {
  it('returns a conservative provider-neutral route summary', async () => {
    const route = vi.fn(async () => ({
      provider: 'test-maps',
      fetchedAt: '2026-09-05T08:00:00.000Z',
      distanceMeters: 1850,
      durationSeconds: 1320,
      geometry: { shouldNotReachPublicContract: true },
      legs: [{ shouldNotReachPublicContract: true }],
    }));
    const app = await buildMapsApp({ name: 'test-maps', route });

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/maps/route?startLatitude=59.3293&startLongitude=18.0686&endLatitude=59.3326&endLongitude=18.0649&mode=walk&language=sv',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      route: {
        provider: 'test-maps',
        fetchedAt: '2026-09-05T08:00:00.000Z',
        mode: 'walk',
        distanceMeters: 1850,
        durationSeconds: 1320,
      },
    });
    expect(route).toHaveBeenCalledWith({
      waypoints: [
        { latitude: 59.3293, longitude: 18.0686 },
        { latitude: 59.3326, longitude: 18.0649 },
      ],
      mode: 'walk',
      language: 'sv',
    });
  });

  it('rejects unsupported transport modes before calling the provider', async () => {
    const route = vi.fn(async () => null);
    const app = await buildMapsApp({ name: 'test-maps', route });

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/maps/route?startLatitude=59.3293&startLongitude=18.0686&endLatitude=59.3326&endLongitude=18.0649&mode=transit',
    });

    expect(response.statusCode).toBe(400);
    expect(route).not.toHaveBeenCalled();
  });

  it('does not publish malformed provider route values', async () => {
    const app = await buildMapsApp({
      name: 'test-maps',
      route: async () => ({
        provider: 'test-maps',
        distanceMeters: Number.NaN,
        durationSeconds: 20,
      }),
    });

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/maps/route?startLatitude=59.3293&startLongitude=18.0686&endLatitude=59.3326&endLongitude=18.0649&mode=bicycle',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ route: null });
  });
});
