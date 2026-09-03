import { afterEach, describe, expect, it } from 'vitest';

// The core environment is set before importing the application because the
// server deliberately validates secrets during module initialization.
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

const { buildApp } = await import('../../app.js');

const apps = [];
afterEach(async () => {
  await Promise.all(apps.splice(0).map((app) => app.close()));
});

describe('health endpoints', () => {
  it('returns liveness without touching PostgreSQL', async () => {
    const app = await buildApp({
      logger: false,
      healthRepository: {
        checkDatabase: async () => true,
      },
    });
    apps.push(app);

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/health/live',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      status: 'ok',
      service: 'attravoya-api',
    });
    expect(response.headers['x-request-id']).toBeTruthy();
  });

  it('returns readiness when the database check succeeds', async () => {
    const app = await buildApp({
      logger: false,
      healthRepository: {
        checkDatabase: async () => true,
      },
    });
    apps.push(app);

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/health/ready',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      status: 'ready',
      database: 'available',
    });
  });

  it('fails readiness safely when PostgreSQL is unavailable', async () => {
    const app = await buildApp({
      logger: false,
      healthRepository: {
        checkDatabase: async () => {
          throw new Error('database password must never appear in API output');
        },
      },
    });
    apps.push(app);

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/health/ready',
    });

    expect(response.statusCode).toBe(503);
    expect(response.json()).toMatchObject({
      error: {
        code: 'SERVICE_UNAVAILABLE',
        message: 'AttraVoya Pro is not ready to accept traffic yet.',
      },
    });
    expect(response.body).not.toContain('database password');
  });
});
