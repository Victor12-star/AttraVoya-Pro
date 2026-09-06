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

function storedRequest(overrides = {}) {
  return {
    id: 'plan-request-1',
    userId: 'user-1',
    originCityId: 'city-stockholm',
    targetDestinationId: null,
    ...overrides,
  };
}

function destination(overrides = {}) {
  return {
    id: 'destination-lisbon',
    cityId: 'city-lisbon',
    slug: 'lisbon-portugal',
    summary: 'Published destination summary.',
    city: {
      name: 'Lisbon',
      regionName: 'Lisbon District',
      country: { iso2: 'PT', name: 'Portugal' },
    },
    ...overrides,
  };
}

function plannerRepository(overrides = {}) {
  return {
    findOwnedRequestById: vi.fn(async ({ userId, requestId }) =>
      userId === 'user-1' && requestId === 'plan-request-1' ? storedRequest() : null,
    ),
    findPublishedDestinationCandidateById: vi.fn(async () => destination()),
    listPublishedDestinationCandidates: vi.fn(async () => [destination()]),
    ...overrides,
  };
}

async function createApp(repository) {
  const app = await buildApp({
    logger: false,
    authRepository: authorizationRepository(),
    healthRepository: { checkDatabase: async () => true },
    plannerRepository: repository,
  });
  apps.push(app);
  return app;
}

function bearer(app, userId = 'user-1') {
  return { authorization: `Bearer ${app.jwt.sign({ sub: userId })}` };
}

const candidateUrl = '/api/v1/planner/requests/plan-request-1/destination-candidates';

describe('planner destination candidates', () => {
  it('requires current authentication before private candidate discovery', async () => {
    const repository = plannerRepository();
    const app = await createApp(repository);

    const response = await app.inject({ method: 'GET', url: candidateUrl });

    expect(response.statusCode).toBe(401);
    expect(repository.findOwnedRequestById).not.toHaveBeenCalled();
    expect(repository.listPublishedDestinationCandidates).not.toHaveBeenCalled();
  });

  it('returns published catalog candidates without claiming affordability or ranking', async () => {
    const repository = plannerRepository();
    const app = await createApp(repository);

    const response = await app.inject({
      method: 'GET',
      url: candidateUrl,
      headers: bearer(app),
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['cache-control']).toBe('private, no-store');
    expect(repository.findOwnedRequestById).toHaveBeenCalledWith({
      userId: 'user-1',
      requestId: 'plan-request-1',
    });
    expect(repository.listPublishedDestinationCandidates).toHaveBeenCalledWith({
      excludeCityId: 'city-stockholm',
      limit: 20,
    });
    expect(response.json()).toEqual({
      destinationCandidates: {
        requestId: 'plan-request-1',
        mode: 'PUBLISHED_CATALOG',
        destinations: [
          {
            id: 'destination-lisbon',
            slug: 'lisbon-portugal',
            name: 'Lisbon',
            regionName: 'Lisbon District',
            country: { code: 'PT', name: 'Portugal' },
            summary: 'Published destination summary.',
          },
        ],
        evaluation: {
          budgetFit: 'NOT_EVALUATED',
          rankingApplied: false,
          priceDataAvailable: false,
          availabilityDataUsed: false,
        },
        provenance: {
          kind: 'PUBLISHED_CATALOG_CANDIDATE',
          source: 'ATTRAVOYA_PUBLISHED_DESTINATION_CATALOG',
          liveDataUsed: false,
          providerDataUsed: false,
          pricingDataUsed: false,
          statement:
            'Candidates are published AttraVoya catalog destinations only. They are not ranked by price or confirmed affordable, and no fare, accommodation-price, or availability data was used.',
        },
      },
    });
  });

  it('hides another traveller request as not found', async () => {
    const repository = plannerRepository();
    const app = await createApp(repository);

    const response = await app.inject({
      method: 'GET',
      url: candidateUrl,
      headers: bearer(app, 'user-2'),
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toMatchObject({ error: { code: 'NOT_FOUND' } });
    expect(repository.listPublishedDestinationCandidates).not.toHaveBeenCalled();
    expect(repository.findPublishedDestinationCandidateById).not.toHaveBeenCalled();
  });

  it('uses only the request fixed target when one was explicitly selected', async () => {
    const repository = plannerRepository({
      findOwnedRequestById: vi.fn(async () =>
        storedRequest({ targetDestinationId: 'destination-lisbon' }),
      ),
    });
    const app = await createApp(repository);

    const response = await app.inject({
      method: 'GET',
      url: candidateUrl,
      headers: bearer(app),
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().destinationCandidates.mode).toBe('FIXED_TARGET');
    expect(response.json().destinationCandidates.destinations).toHaveLength(1);
    expect(repository.findPublishedDestinationCandidateById).toHaveBeenCalledWith(
      'destination-lisbon',
    );
    expect(repository.listPublishedDestinationCandidates).not.toHaveBeenCalled();
  });

  it('returns no candidate when a fixed target is no longer published', async () => {
    const repository = plannerRepository({
      findOwnedRequestById: vi.fn(async () =>
        storedRequest({ targetDestinationId: 'destination-retired' }),
      ),
      findPublishedDestinationCandidateById: vi.fn(async () => null),
    });
    const app = await createApp(repository);

    const response = await app.inject({
      method: 'GET',
      url: candidateUrl,
      headers: bearer(app),
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().destinationCandidates).toMatchObject({
      mode: 'FIXED_TARGET',
      destinations: [],
      evaluation: { budgetFit: 'NOT_EVALUATED', rankingApplied: false },
    });
    expect(repository.listPublishedDestinationCandidates).not.toHaveBeenCalled();
  });
});
