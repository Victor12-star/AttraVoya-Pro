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

const apps = [];
afterEach(async () => {
  await Promise.all(apps.splice(0).map((app) => app.close()));
});

describe('application error metric integration', () => {
  it('records the classified public error contract without exception content', async () => {
    const record = vi.fn();
    const app = await buildApp({
      logger: false,
      applicationErrorMetrics: {
        record,
        snapshot: () => ({ errors: 0 }),
      },
    });
    apps.push(app);

    app.get('/test/application-error', async () => {
      throw new Error('private exception detail');
    });

    const response = await app.inject({
      method: 'GET',
      url: '/test/application-error',
    });

    expect(response.statusCode).toBe(500);
    expect(response.json()).toMatchObject({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred.',
      },
    });
    expect(record).toHaveBeenCalledTimes(1);
    expect(record).toHaveBeenCalledWith({
      code: 'INTERNAL_ERROR',
      statusCode: 500,
    });
    expect(JSON.stringify(record.mock.calls)).not.toContain('private exception detail');
  });
});
