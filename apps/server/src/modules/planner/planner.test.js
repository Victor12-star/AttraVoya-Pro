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
    originCityId: null,
    originAirportId: null,
    originLabel: 'Stockholm',
    targetDestinationId: null,
    earliestDeparture: null,
    latestReturn: null,
    fixedDeparture: new Date('2026-10-10T00:00:00.000Z'),
    fixedReturn: new Date('2026-10-17T00:00:00.000Z'),
    minNights: 2,
    maxNights: 14,
    flexibleDates: false,
    budgetAmount: '25000',
    adults: 2,
    childrenAges: [6],
    interests: ['history', 'food'],
    comfortLevel: 'VALUE',
    safetyReservePercent: '7.5',
    status: 'DRAFT',
    createdAt: new Date('2026-09-05T20:00:00.000Z'),
    updatedAt: new Date('2026-09-05T20:00:00.000Z'),
    budgetCurrency: { code: 'SEK' },
    targetDestination: null,
    stayPreference: {
      types: ['HOTEL'],
      unitType: 'ANY',
      breakfast: 'PREFERRED',
      kitchen: 'NOT_REQUIRED',
      privateBathroom: 'REQUIRED',
      requiredAmenities: [],
      preferredAmenities: [],
      nearPriorities: [],
      maxNightlyAmount: '2200',
      maxTotalStayAmount: null,
      longStayFriendly: false,
      familyFriendly: true,
    },
    ...overrides,
  };
}

function createPlannerRepository(overrides = {}) {
  return {
    findCurrencyByCode: vi.fn(async (code) =>
      code === 'SEK' ? { id: 'currency-sek', code: 'SEK' } : null,
    ),
    findDestinationById: vi.fn(async () => ({ id: 'destination-1', status: 'PUBLISHED' })),
    findOriginCityById: vi.fn(async () => ({ id: 'city-1' })),
    findOriginAirportById: vi.fn(async () => ({ id: 'airport-1', cityId: 'city-1' })),
    createOwnedRequest: vi.fn(async () => storedRequest()),
    listOwnedRequests: vi.fn(async (userId) => (userId === 'user-1' ? [storedRequest()] : [])),
    findOwnedRequestById: vi.fn(async ({ userId, requestId }) =>
      userId === 'user-1' && requestId === 'plan-request-1' ? storedRequest() : null,
    ),
    ...overrides,
  };
}

async function createApp(plannerRepository) {
  const app = await buildApp({
    logger: false,
    authRepository: authorizationRepository(),
    healthRepository: { checkDatabase: async () => true },
    plannerRepository,
  });
  apps.push(app);
  return app;
}

function validBody(overrides = {}) {
  return {
    originLabel: 'Stockholm',
    fixedDeparture: '2026-10-10',
    fixedReturn: '2026-10-17',
    flexibleDates: false,
    budgetAmount: 25000,
    budgetCurrencyCode: 'sek',
    adults: 2,
    childrenAges: [6],
    interests: ['history', 'food'],
    comfortLevel: 'VALUE',
    accommodation: {
      types: ['HOTEL'],
      breakfast: 'PREFERRED',
      privateBathroom: 'REQUIRED',
      maxNightlyAmount: 2200,
      familyFriendly: true,
    },
    ...overrides,
  };
}

function bearer(app, userId = 'user-1') {
  return { authorization: `Bearer ${app.jwt.sign({ sub: userId })}` };
}

describe('budget planner requests', () => {
  it('rejects persisted planner data without current authentication', async () => {
    const repository = createPlannerRepository();
    const app = await createApp(repository);

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/planner/requests',
      payload: validBody(),
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toMatchObject({ error: { code: 'AUTHENTICATION_REQUIRED' } });
    expect(repository.createOwnedRequest).not.toHaveBeenCalled();
  });

  it('creates an owner-bound draft using shared defaults and normalized references', async () => {
    const repository = createPlannerRepository();
    const app = await createApp(repository);

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/planner/requests',
      headers: bearer(app),
      payload: validBody(),
    });

    expect(response.statusCode).toBe(201);
    expect(repository.findCurrencyByCode).toHaveBeenCalledWith('SEK');
    expect(repository.createOwnedRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        currencyId: 'currency-sek',
        input: expect.objectContaining({
          status: 'DRAFT',
          fixedDeparture: new Date('2026-10-10T00:00:00.000Z'),
          fixedReturn: new Date('2026-10-17T00:00:00.000Z'),
          minNights: 2,
          maxNights: 14,
          safetyReservePercent: 7.5,
          accommodation: expect.objectContaining({
            types: ['HOTEL'],
            unitType: 'ANY',
            familyFriendly: true,
          }),
        }),
      }),
    );
    expect(response.json()).toMatchObject({
      planRequest: {
        id: 'plan-request-1',
        budget: { amount: '25000', currencyCode: 'SEK', safetyReservePercent: '7.5' },
        travellers: { adults: 2, childrenAges: [6] },
        status: 'DRAFT',
      },
    });
  });

  it('lists only the authenticated traveller requests and hides another owner request as not found', async () => {
    const repository = createPlannerRepository();
    const app = await createApp(repository);

    const listResponse = await app.inject({
      method: 'GET',
      url: '/api/v1/planner/requests',
      headers: bearer(app),
    });
    expect(listResponse.statusCode).toBe(200);
    expect(listResponse.json().requests).toHaveLength(1);
    expect(repository.listOwnedRequests).toHaveBeenCalledWith('user-1', 20);

    const otherOwnerResponse = await app.inject({
      method: 'GET',
      url: '/api/v1/planner/requests/plan-request-1',
      headers: bearer(app, 'user-2'),
    });
    expect(otherOwnerResponse.statusCode).toBe(404);
    expect(otherOwnerResponse.json()).toMatchObject({ error: { code: 'NOT_FOUND' } });
    expect(repository.findOwnedRequestById).toHaveBeenCalledWith({
      userId: 'user-2',
      requestId: 'plan-request-1',
    });
  });

  it('rejects contradictory date modes and excessive traveller counts before persistence', async () => {
    const repository = createPlannerRepository();
    const app = await createApp(repository);

    const contradictory = await app.inject({
      method: 'POST',
      url: '/api/v1/planner/requests',
      headers: bearer(app),
      payload: validBody({ flexibleDates: true }),
    });
    expect(contradictory.statusCode).toBe(400);

    const tooManyTravellers = await app.inject({
      method: 'POST',
      url: '/api/v1/planner/requests',
      headers: bearer(app),
      payload: validBody({ adults: 12, childrenAges: Array(9).fill(7) }),
    });
    expect(tooManyTravellers.statusCode).toBe(400);
    expect(repository.createOwnedRequest).not.toHaveBeenCalled();
  });

  it('rejects unsupported currencies and inconsistent origin references without exposing database details', async () => {
    const unsupportedCurrencyRepository = createPlannerRepository();
    const app = await createApp(unsupportedCurrencyRepository);

    const currencyResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/planner/requests',
      headers: bearer(app),
      payload: validBody({ budgetCurrencyCode: 'ZZZ' }),
    });
    expect(currencyResponse.statusCode).toBe(400);
    expect(currencyResponse.json()).toMatchObject({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'The selected budget currency is not supported.',
      },
    });

    const mismatchRepository = createPlannerRepository({
      findOriginAirportById: vi.fn(async () => ({ id: 'airport-2', cityId: 'city-2' })),
    });
    const mismatchApp = await createApp(mismatchRepository);
    const mismatchResponse = await mismatchApp.inject({
      method: 'POST',
      url: '/api/v1/planner/requests',
      headers: bearer(mismatchApp),
      payload: validBody({ originCityId: 'city-1', originAirportId: 'airport-2' }),
    });
    expect(mismatchResponse.statusCode).toBe(400);
    expect(mismatchResponse.json()).toMatchObject({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'The selected origin city and airport do not match.',
      },
    });
  });
});
