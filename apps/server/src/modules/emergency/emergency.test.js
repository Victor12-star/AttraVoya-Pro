import { afterEach, describe, expect, it } from 'vitest';

process.env.NODE_ENV = 'test';
process.env.API_HOST = '127.0.0.1';
process.env.API_PORT = '5000';
process.env.LOG_LEVEL = 'silent';
process.env.WEB_URL = 'http://localhost:3000';
process.env.ADMIN_URL = 'http://localhost:3001';
process.env.API_URL = 'http://localhost:5000';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.JWT_ACCESS_SECRET = 'a'.repeat(64);
process.env.COOKIE_SECRET = 'c'.repeat(64);
process.env.DATA_ENCRYPTION_KEY = 'd'.repeat(64);

const { buildApp } = await import('../../app.js');

const apps = [];
afterEach(async () => {
  await Promise.all(apps.splice(0).map((app) => app.close()));
});

function baseRecord(overrides = {}) {
  return {
    id: 'emergency-se-general',
    regionName: null,
    service: 'GENERAL_EMERGENCY',
    serviceLabel: 'General emergency',
    phoneNumber: '112',
    sourceName: 'Official emergency authority',
    sourceUrl: 'https://example.gov/emergency',
    status: 'VERIFIED',
    lastVerifiedAt: new Date('2026-08-01T10:00:00.000Z'),
    isPublished: true,
    country: { iso2: 'SE' },
    ...overrides,
  };
}

function appOptions(emergencyRepository) {
  return {
    logger: false,
    emergencyRepository,
    healthRepository: { checkDatabase: async () => true },
    authRepository: {
      findAuthorizationContextByUserId: async () => null,
    },
  };
}

describe('verified emergency reference endpoint', () => {
  it('returns only published verified country-wide records without authentication', async () => {
    const app = await buildApp(
      appOptions({
        listPublishedVerifiedByCountryCode: async (countryCode) => [
          baseRecord({ country: { iso2: countryCode } }),
          baseRecord({ id: 'draft', status: 'DRAFT', country: { iso2: countryCode } }),
          baseRecord({ id: 'regional', regionName: 'Stockholm', country: { iso2: countryCode } }),
          baseRecord({ id: 'unpublished', isPublished: false, country: { iso2: countryCode } }),
        ],
      }),
    );
    apps.push(app);

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/emergency?countryCode=se',
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['cache-control']).toContain('max-age=60');
    expect(response.json()).toEqual({
      emergency: {
        countryCode: 'SE',
        records: [
          {
            id: 'emergency-se-general',
            service: 'GENERAL_EMERGENCY',
            serviceLabel: 'General emergency',
            phoneNumber: '112',
            sourceName: 'Official emergency authority',
            sourceUrl: 'https://example.gov/emergency',
            lastVerifiedAt: '2026-08-01T10:00:00.000Z',
          },
        ],
      },
    });
  });

  it('rejects malformed country codes before reaching the repository', async () => {
    let called = false;
    const app = await buildApp(
      appOptions({
        listPublishedVerifiedByCountryCode: async () => {
          called = true;
          return [];
        },
      }),
    );
    apps.push(app);

    const response = await app.inject({ method: 'GET', url: '/api/v1/emergency?countryCode=SWE' });

    expect(response.statusCode).toBe(400);
    expect(called).toBe(false);
  });

  it('drops records with missing verification provenance instead of exposing them', async () => {
    const app = await buildApp(
      appOptions({
        listPublishedVerifiedByCountryCode: async (countryCode) => [
          baseRecord({ sourceUrl: 'javascript:alert(1)', country: { iso2: countryCode } }),
          baseRecord({ id: 'missing-date', lastVerifiedAt: null, country: { iso2: countryCode } }),
        ],
      }),
    );
    apps.push(app);

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/emergency?countryCode=SE',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().emergency.records).toEqual([]);
  });
});
