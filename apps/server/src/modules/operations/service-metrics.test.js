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

const { buildApp } = await import('../../app.js');

const apps = [];
afterEach(async () => {
  await Promise.all(apps.splice(0).map((app) => app.close()));
});

function authorizationRepository() {
  return {
    async findAuthorizationContextByUserId(userId) {
      const roles = userId === 'admin-user' ? ['ADMIN'] : ['USER'];

      return {
        id: userId,
        email: `${userId}@example.test`,
        status: 'ACTIVE',
        emailVerifiedAt: new Date('2026-09-09T00:00:00.000Z'),
        roles,
        permissions: [],
      };
    },
  };
}

async function createApp() {
  const requestMetrics = {
    record: vi.fn(),
    snapshot: vi.fn(() => ({
      windowSeconds: 60,
      overall: {
        requests: 12,
        requestsPerSecond: 0.2,
        serverErrors: 1,
        serverErrorRate: 1 / 12,
        statusClasses: { '2xx': 11, '5xx': 1 },
        latencyMsUpperBound: { p50: 100, p95: 500, p99: 500 },
      },
      series: [
        {
          method: 'GET',
          route: '/api/v1/health/live',
          requests: 4,
          requestsPerSecond: 4 / 60,
          serverErrors: 0,
          serverErrorRate: 0,
          statusClasses: { '2xx': 4 },
          latencyMsUpperBound: { p50: 50, p95: 100, p99: 100 },
        },
      ],
    })),
  };
  const providerMetrics = {
    snapshot: vi.fn(() => ({
      windowSeconds: 60,
      providers: [
        {
          provider: 'geoapify',
          requests: 3,
          requestsPerSecond: 0.05,
          attempts: 4,
          retries: 1,
          successes: 2,
          failures: 1,
          failureRate: 1 / 3,
          rateLimited: 0,
          outcomes: { success: 2, unavailable: 1 },
          latencyMsUpperBound: { p50: 250, p95: 1000, p99: 1000 },
        },
      ],
    })),
  };
  const providerCacheMetrics = {
    snapshot: vi.fn(() => ({
      windowSeconds: 60,
      accesses: 10,
      accessesPerSecond: 1 / 6,
      hits: 7,
      misses: 3,
      hitRate: 0.7,
      loads: 3,
      loadFailures: 0,
      loadFailureRate: 0,
      coalesced: 1,
      inFlightBypasses: 0,
      evictions: 0,
      expirations: 1,
      other: 0,
    })),
  };
  const runtimeMetrics = {
    snapshot: vi.fn(() => ({
      windowSeconds: 60,
      cpu: {
        userTimeMs: 1200,
        systemTimeMs: 300,
        totalTimeMs: 1500,
        coreUtilization: 0.025,
        capacityUtilizationRatio: 0.00625,
        availableParallelism: 4,
      },
      memory: {
        rssBytes: 120_000_000,
        heapTotalBytes: 80_000_000,
        heapUsedBytes: 40_000_000,
        heapUtilizationRatio: 0.5,
        externalBytes: 2_000_000,
        arrayBuffersBytes: 250_000,
      },
      eventLoop: {
        utilizationRatio: 0.12,
        activeMs: 7200,
        idleMs: 52_800,
      },
    })),
  };
  const databasePoolMetrics = vi.fn(() => ({
    maxConnections: 5,
    totalConnections: 2,
    idleConnections: 1,
    activeConnections: 1,
    waitingRequests: 0,
    utilization: 0.2,
    saturated: false,
  }));

  const app = await buildApp({
    logger: false,
    authRepository: authorizationRepository(),
    healthRepository: { checkDatabase: async () => true },
    requestMetrics,
    serviceMetricsProviderMetrics: providerMetrics,
    serviceMetricsProviderCacheMetrics: providerCacheMetrics,
    serviceMetricsRuntimeMetrics: runtimeMetrics,
    serviceMetricsDatabasePoolMetrics: databasePoolMetrics,
  });
  apps.push(app);

  return {
    app,
    requestMetrics,
    providerMetrics,
    providerCacheMetrics,
    runtimeMetrics,
    databasePoolMetrics,
  };
}

function bearer(app, userId) {
  return { authorization: `Bearer ${app.jwt.sign({ sub: userId })}` };
}

describe('admin service metrics', () => {
  it('requires current authentication before reading operational metrics', async () => {
    const metrics = await createApp();

    const response = await metrics.app.inject({
      method: 'GET',
      url: '/api/v1/operations/service-metrics',
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toMatchObject({ error: { code: 'AUTHENTICATION_REQUIRED' } });
    expect(metrics.requestMetrics.snapshot).not.toHaveBeenCalled();
    expect(metrics.providerMetrics.snapshot).not.toHaveBeenCalled();
    expect(metrics.providerCacheMetrics.snapshot).not.toHaveBeenCalled();
    expect(metrics.runtimeMetrics.snapshot).not.toHaveBeenCalled();
    expect(metrics.databasePoolMetrics).not.toHaveBeenCalled();
  });

  it('rejects ordinary users before reading operational metrics', async () => {
    const metrics = await createApp();

    const response = await metrics.app.inject({
      method: 'GET',
      url: '/api/v1/operations/service-metrics',
      headers: bearer(metrics.app, 'ordinary-user'),
    });

    expect(response.statusCode).toBe(403);
    expect(response.json()).toMatchObject({ error: { code: 'FORBIDDEN' } });
    expect(metrics.requestMetrics.snapshot).not.toHaveBeenCalled();
    expect(metrics.providerMetrics.snapshot).not.toHaveBeenCalled();
    expect(metrics.providerCacheMetrics.snapshot).not.toHaveBeenCalled();
    expect(metrics.runtimeMetrics.snapshot).not.toHaveBeenCalled();
    expect(metrics.databasePoolMetrics).not.toHaveBeenCalled();
  });

  it('returns a private process-local aggregate snapshot to administrators', async () => {
    const metrics = await createApp();

    const response = await metrics.app.inject({
      method: 'GET',
      url: '/api/v1/operations/service-metrics',
      headers: bearer(metrics.app, 'admin-user'),
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['cache-control']).toBe('private, no-store');
    expect(response.json()).toMatchObject({
      scope: 'PROCESS_LOCAL',
      http: {
        overall: {
          requests: 12,
          serverErrors: 1,
          latencyMsUpperBound: { p95: 500 },
        },
      },
      providers: {
        providers: [{ provider: 'geoapify', requests: 3, failures: 1 }],
      },
      providerCache: { accesses: 10, hits: 7, hitRate: 0.7 },
      runtime: {
        cpu: {
          coreUtilization: 0.025,
          capacityUtilizationRatio: 0.00625,
          availableParallelism: 4,
        },
        memory: {
          rssBytes: 120_000_000,
          heapUsedBytes: 40_000_000,
          heapUtilizationRatio: 0.5,
        },
        eventLoop: { utilizationRatio: 0.12 },
      },
      databasePool: {
        maxConnections: 5,
        activeConnections: 1,
        waitingRequests: 0,
        saturated: false,
      },
    });

    expect(response.body).not.toContain('admin-user@example.test');
    expect(response.body).not.toContain('authorization');
    expect(response.body).not.toContain('DATABASE_URL');
    expect(response.body).not.toContain('postgresql://');
    expect(response.body).not.toContain('query');
    expect(response.body).not.toContain('cacheKey');
    expect(metrics.requestMetrics.snapshot).toHaveBeenCalledTimes(1);
    expect(metrics.providerMetrics.snapshot).toHaveBeenCalledTimes(1);
    expect(metrics.providerCacheMetrics.snapshot).toHaveBeenCalledTimes(1);
    expect(metrics.runtimeMetrics.snapshot).toHaveBeenCalledTimes(1);
    expect(metrics.databasePoolMetrics).toHaveBeenCalledTimes(1);
  });
});
