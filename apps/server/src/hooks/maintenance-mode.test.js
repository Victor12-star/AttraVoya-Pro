import { afterEach, describe, expect, it, vi } from 'vitest';

process.env.NODE_ENV = 'test';
process.env.API_HOST = '127.0.0.1';
process.env.API_PORT = '5000';
process.env.LOG_LEVEL = 'silent';
process.env.WEB_URL = 'http://localhost:3000';
process.env.ADMIN_URL = 'http://localhost:3001';
process.env.API_URL = 'http://localhost:5000';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.JWT_ACCESS_SECRET = 'a'.repeat(64);
process.env.JWT_REFRESH_SECRET = 'b'.repeat(64);
process.env.COOKIE_SECRET = 'c'.repeat(64);
process.env.DATA_ENCRYPTION_KEY = 'd'.repeat(64);

const { buildApp } = await import('../app.js');
const { createMaintenanceModeHook } = await import('./maintenance-mode.js');

const apps = [];
afterEach(async () => {
  await Promise.all(apps.splice(0).map((app) => app.close()));
});

describe('maintenance mode', () => {
  it('returns a stable service-unavailable response before user-facing business logic runs', async () => {
    const listCountries = vi.fn(async () => []);
    const app = await buildApp({
      logger: false,
      maintenanceMode: true,
      countriesRepository: { list: listCountries },
      healthRepository: { checkDatabase: async () => true },
    });
    apps.push(app);

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/countries',
    });

    expect(response.statusCode).toBe(503);
    expect(response.json()).toMatchObject({
      error: {
        code: 'SERVICE_UNAVAILABLE',
        message: 'AttraVoya Pro is temporarily unavailable for maintenance. Please try again shortly.',
        details: { reason: 'maintenance' },
      },
    });
    expect(response.headers['x-request-id']).toBeTruthy();
    expect(listCountries).not.toHaveBeenCalled();
  });

  it('keeps liveness available and fails readiness without touching PostgreSQL', async () => {
    const checkDatabase = vi.fn(async () => true);
    const app = await buildApp({
      logger: false,
      maintenanceMode: true,
      healthRepository: { checkDatabase },
    });
    apps.push(app);

    const liveness = await app.inject({
      method: 'GET',
      url: '/api/v1/health/live',
    });
    const readiness = await app.inject({
      method: 'GET',
      url: '/api/v1/health/ready',
    });

    expect(liveness.statusCode).toBe(200);
    expect(liveness.json()).toMatchObject({ status: 'ok', service: 'attravoya-api' });
    expect(readiness.statusCode).toBe(503);
    expect(readiness.json()).toMatchObject({
      error: {
        code: 'SERVICE_UNAVAILABLE',
        message: 'AttraVoya Pro is not ready to accept traffic yet.',
      },
    });
    expect(checkDatabase).not.toHaveBeenCalled();
  });

  it('keeps verified billing webhook ingress outside the maintenance gate', async () => {
    const hook = createMaintenanceModeHook({ enabled: true });

    await expect(
      hook({
        method: 'POST',
        raw: { url: '/api/v1/payments/webhooks/stripe?delivery=retry' },
      }),
    ).resolves.toBeUndefined();

    await expect(
      hook({
        method: 'POST',
        raw: { url: '/api/v1/payments/webhooks/revenuecat' },
      }),
    ).resolves.toBeUndefined();
  });

  it('fails closed for invalid maintenance-mode configuration', () => {
    expect(() =>
      createMaintenanceModeHook({ enabled: /** @type {any} */ ('true') }),
    ).toThrow('Maintenance mode enabled must be a boolean.');
  });
});
