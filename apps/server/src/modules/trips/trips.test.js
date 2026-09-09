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
      return {
        id: userId,
        email: `${userId}@example.test`,
        status: 'ACTIVE',
        emailVerifiedAt: new Date(),
        roles: ['USER'],
        permissions: [],
      };
    },
  };
}

function storedTrip(overrides = {}) {
  return {
    id: 'trip-1',
    title: 'Stockholm autumn break',
    status: 'ACTIVE',
    startDate: new Date('2026-09-08T00:00:00.000Z'),
    endDate: new Date('2026-09-12T00:00:00.000Z'),
    destination: {
      id: 'destination-stockholm',
      slug: 'stockholm-sweden',
      city: {
        name: 'Stockholm',
        country: { iso2: 'SE', name: 'Sweden' },
      },
    },
    ...overrides,
  };
}

function createTripsRepository(overrides = {}) {
  return {
    listOwnedCompanionTrips: vi.fn(async ({ userId }) =>
      userId === 'user-1'
        ? [
            storedTrip({
              id: 'trip-planned',
              title: 'Madrid next',
              status: 'PLANNED',
              startDate: new Date('2026-10-10T00:00:00.000Z'),
              endDate: new Date('2026-10-15T00:00:00.000Z'),
              destination: {
                id: 'destination-madrid',
                slug: 'madrid-spain',
                city: { name: 'Madrid', country: { iso2: 'ES', name: 'Spain' } },
              },
            }),
            storedTrip(),
          ]
        : [],
    ),
    ...overrides,
  };
}

async function createApp(tripsRepository) {
  const app = await buildApp({
    logger: false,
    authRepository: authorizationRepository(),
    healthRepository: { checkDatabase: async () => true },
    tripsRepository,
    tripsNow: () => new Date('2026-09-09T15:00:00.000Z'),
  });
  apps.push(app);
  return app;
}

function bearer(app, userId = 'user-1') {
  return { authorization: `Bearer ${app.jwt.sign({ sub: userId })}` };
}

describe('travel companion trip context', () => {
  it('requires current authentication before reading private trip context', async () => {
    const repository = createTripsRepository();
    const app = await createApp(repository);

    const response = await app.inject({ method: 'GET', url: '/api/v1/trips/companion-context' });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toMatchObject({ error: { code: 'AUTHENTICATION_REQUIRED' } });
    expect(repository.listOwnedCompanionTrips).not.toHaveBeenCalled();
  });

  it('reads only the authenticated owner and suggests the current active trip first', async () => {
    const repository = createTripsRepository();
    const app = await createApp(repository);

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/trips/companion-context',
      headers: bearer(app),
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['cache-control']).toBe('private, no-store');
    expect(repository.listOwnedCompanionTrips).toHaveBeenCalledWith({
      userId: 'user-1',
      today: new Date('2026-09-09T00:00:00.000Z'),
      limit: 10,
    });
    expect(response.json()).toEqual({
      tripContext: {
        suggestedTripId: 'trip-1',
        source: 'ACTIVE_TRIP',
        trips: [
          expect.objectContaining({
            id: 'trip-1',
            status: 'ACTIVE',
            destination: expect.objectContaining({ countryCode: 'SE', countryName: 'Sweden' }),
          }),
          expect.objectContaining({
            id: 'trip-planned',
            status: 'PLANNED',
            destination: expect.objectContaining({ countryCode: 'ES', countryName: 'Spain' }),
          }),
        ],
      },
    });
  });

  it('falls back to the nearest planned trip when there is no current active trip', async () => {
    const repository = createTripsRepository({
      listOwnedCompanionTrips: vi.fn(async () => [
        storedTrip({
          id: 'trip-later',
          title: 'Later Spain trip',
          status: 'PLANNED',
          startDate: new Date('2026-11-10T00:00:00.000Z'),
          endDate: new Date('2026-11-15T00:00:00.000Z'),
          destination: {
            id: 'destination-madrid',
            slug: 'madrid-spain',
            city: { name: 'Madrid', country: { iso2: 'ES', name: 'Spain' } },
          },
        }),
        storedTrip({
          id: 'trip-sooner',
          title: 'Sooner Sweden trip',
          status: 'PLANNED',
          startDate: new Date('2026-09-20T00:00:00.000Z'),
          endDate: new Date('2026-09-24T00:00:00.000Z'),
        }),
      ]),
    });
    const app = await createApp(repository);

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/trips/companion-context',
      headers: bearer(app),
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().tripContext).toMatchObject({
      suggestedTripId: 'trip-sooner',
      source: 'PLANNED_TRIP',
    });
  });
});
