import rateLimit from '@fastify/rate-limit';
import Fastify from 'fastify';
import { serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod';
import { afterEach, describe, expect, it } from 'vitest';

import { plannerRoutes } from './planner.routes.js';

const apps = [];

afterEach(async () => {
  await Promise.all(apps.splice(0).map((app) => app.close()));
});

async function buildPlannerRateLimitApp(repository = {}) {
  const app = Fastify({ logger: false });
  apps.push(app);

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);
  app.decorateRequest('auth', null);
  app.decorate('authenticate', async (request) => {
    request.auth = { id: 'user-1' };
  });

  await app.register(rateLimit, { global: false });
  await app.register(plannerRoutes, {
    prefix: '/planner',
    repository,
  });

  return app;
}

describe('planner API backpressure', () => {
  it('rate-limits repeated planner creation attempts before the global API ceiling', async () => {
    const app = await buildPlannerRateLimitApp();

    for (let index = 0; index < 10; index += 1) {
      const response = await app.inject({
        method: 'POST',
        url: '/planner',
        payload: {},
      });
      expect(response.statusCode).not.toBe(429);
    }

    const limitedResponse = await app.inject({
      method: 'POST',
      url: '/planner',
      payload: {},
    });

    expect(limitedResponse.statusCode).toBe(429);
  });

  it('rate-limits provider-fan-out affordability evidence requests', async () => {
    const app = await buildPlannerRateLimitApp({
      findOwnedRequestById: async () => null,
    });
    const url = '/planner/request-1/destination-candidates/destination-1/affordability-evidence';

    for (let index = 0; index < 10; index += 1) {
      const response = await app.inject({ method: 'GET', url });
      expect(response.statusCode).not.toBe(429);
    }

    const limitedResponse = await app.inject({ method: 'GET', url });

    expect(limitedResponse.statusCode).toBe(429);
  });
});
