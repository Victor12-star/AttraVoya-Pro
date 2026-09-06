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

function storedRequest({ requestId, userId, input, currencyCode = 'SEK' }) {
  const createdAt = new Date('2026-09-06T20:00:00.000Z');
  return {
    id: requestId,
    userId,
    originCityId: input.originCityId ?? null,
    originAirportId: input.originAirportId ?? null,
    originLabel: input.originLabel,
    targetDestinationId: input.targetDestinationId ?? null,
    earliestDeparture: input.earliestDeparture ?? null,
    latestReturn: input.latestReturn ?? null,
    fixedDeparture: input.fixedDeparture ?? null,
    fixedReturn: input.fixedReturn ?? null,
    minNights: input.minNights,
    maxNights: input.maxNights,
    flexibleDates: input.flexibleDates,
    budgetAmount: input.budgetAmount,
    adults: input.adults,
    childrenAges: input.childrenAges,
    interests: input.interests,
    comfortLevel: input.comfortLevel,
    safetyReservePercent: input.safetyReservePercent,
    status: input.status,
    createdAt,
    updatedAt: createdAt,
    budgetCurrency: { code: currencyCode },
    targetDestination: null,
    stayPreference: input.accommodation ?? null,
  };
}

function plannerRepository(options = {}) {
  const records = new Map();
  const createOwnedRequestIdempotently = vi.fn(
    async ({ requestId, userId, input }) => {
      const record = storedRequest({ requestId, userId, input });
      if (options.simulateRace) return { record, created: false };
      records.set(requestId, record);
      return { record, created: true };
    },
  );

  return {
    records,
    createOwnedRequestIdempotently,
    findOwnedRequestById: vi.fn(async ({ userId, requestId }) => {
      if (options.simulateRace) return null;
      const record = records.get(requestId);
      return record?.userId === userId ? record : null;
    }),
    findCurrencyByCode: vi.fn(async (code) =>
      code === 'SEK' ? { id: 'currency-sek', code: 'SEK' } : null,
    ),
    findDestinationById: vi.fn(async () => null),
    findOriginCityById: vi.fn(async () => null),
    findOriginAirportById: vi.fn(async () => null),
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

const plannerUrl = '/api/v1/planner/requests';
const requestBody = {
  originLabel: 'Stockholm',
  flexibleDates: true,
  minNights: 2,
  maxNights: 14,
  budgetAmount: 25000,
  budgetCurrencyCode: 'SEK',
  adults: 1,
  childrenAges: [],
  interests: ['FOOD'],
  comfortLevel: 'VALUE',
  safetyReservePercent: 7.5,
};

function headers(app, idempotencyKey = 'planner-create-0001', userId = 'user-1') {
  return {
    ...bearer(app, userId),
    'idempotency-key': idempotencyKey,
  };
}

describe('planner create idempotency', () => {
  it('rejects planner creation without a bounded idempotency key', async () => {
    const repository = plannerRepository();
    const app = await createApp(repository);

    const response = await app.inject({
      method: 'POST',
      url: plannerUrl,
      headers: bearer(app),
      payload: requestBody,
    });

    expect(response.statusCode).toBe(400);
    expect(repository.createOwnedRequestIdempotently).not.toHaveBeenCalled();
  });

  it('replays the authoritative request for the same user, key, and payload', async () => {
    const repository = plannerRepository();
    const app = await createApp(repository);

    const first = await app.inject({
      method: 'POST',
      url: plannerUrl,
      headers: headers(app),
      payload: requestBody,
    });
    const replay = await app.inject({
      method: 'POST',
      url: plannerUrl,
      headers: headers(app),
      payload: requestBody,
    });

    expect(first.statusCode).toBe(201);
    expect(first.headers['idempotency-replayed']).toBeUndefined();
    expect(replay.statusCode).toBe(200);
    expect(replay.headers['idempotency-replayed']).toBe('true');
    expect(replay.headers['cache-control']).toBe('private, no-store');
    expect(replay.json()).toEqual(first.json());
    expect(repository.createOwnedRequestIdempotently).toHaveBeenCalledTimes(1);
    expect(repository.findCurrencyByCode).toHaveBeenCalledTimes(1);
  });

  it('returns a conflict when the same key is reused with different planner details', async () => {
    const repository = plannerRepository();
    const app = await createApp(repository);

    const first = await app.inject({
      method: 'POST',
      url: plannerUrl,
      headers: headers(app),
      payload: requestBody,
    });
    const conflict = await app.inject({
      method: 'POST',
      url: plannerUrl,
      headers: headers(app),
      payload: { ...requestBody, budgetAmount: 26000 },
    });

    expect(first.statusCode).toBe(201);
    expect(conflict.statusCode).toBe(409);
    expect(conflict.json().error.code).toBe('CONFLICT');
    expect(repository.createOwnedRequestIdempotently).toHaveBeenCalledTimes(1);
  });

  it('treats a matching concurrent create winner as a replay', async () => {
    const repository = plannerRepository({ simulateRace: true });
    const app = await createApp(repository);

    const response = await app.inject({
      method: 'POST',
      url: plannerUrl,
      headers: headers(app),
      payload: requestBody,
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['idempotency-replayed']).toBe('true');
    expect(repository.createOwnedRequestIdempotently).toHaveBeenCalledTimes(1);
  });

  it('scopes the same idempotency key independently per authenticated user', async () => {
    const repository = plannerRepository();
    const app = await createApp(repository);

    const firstUser = await app.inject({
      method: 'POST',
      url: plannerUrl,
      headers: headers(app, 'planner-create-shared', 'user-1'),
      payload: requestBody,
    });
    const secondUser = await app.inject({
      method: 'POST',
      url: plannerUrl,
      headers: headers(app, 'planner-create-shared', 'user-2'),
      payload: requestBody,
    });

    expect(firstUser.statusCode).toBe(201);
    expect(secondUser.statusCode).toBe(201);
    expect(firstUser.json().planRequest.id).not.toBe(secondUser.json().planRequest.id);
    expect(repository.createOwnedRequestIdempotently).toHaveBeenCalledTimes(2);
  });
});
