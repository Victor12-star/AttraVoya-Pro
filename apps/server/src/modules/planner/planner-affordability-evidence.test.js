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
    originAirportId: null,
    originLabel: 'Stockholm',
    targetDestinationId: null,
    earliestDeparture: new Date('2026-10-01T00:00:00.000Z'),
    latestReturn: new Date('2026-10-15T00:00:00.000Z'),
    fixedDeparture: null,
    fixedReturn: null,
    minNights: 5,
    maxNights: 7,
    flexibleDates: true,
    budgetAmount: '1000.00',
    adults: 2,
    childrenAges: [6],
    interests: ['MUSEUMS'],
    comfortLevel: 'STANDARD',
    safetyReservePercent: '10.00',
    status: 'DRAFT',
    createdAt: new Date('2026-09-06T10:00:00.000Z'),
    updatedAt: new Date('2026-09-06T10:00:00.000Z'),
    budgetCurrency: { code: 'EUR' },
    targetDestination: null,
    stayPreference: {
      types: ['HOTEL'],
      unitType: 'PRIVATE',
      breakfast: 'PREFERRED',
      kitchen: 'PREFERRED',
      privateBathroom: 'REQUIRED',
      requiredAmenities: [],
      preferredAmenities: [],
      nearPriorities: [],
      maxNightlyAmount: null,
      maxTotalStayAmount: null,
      longStayFriendly: false,
      familyFriendly: true,
    },
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

const evidenceUrl =
  '/api/v1/planner/requests/plan-request-1/destination-candidates/destination-lisbon/affordability-evidence';

describe('planner affordability evidence gate', () => {
  it('requires current authentication before exposing private evidence context', async () => {
    const repository = plannerRepository();
    const app = await createApp(repository);

    const response = await app.inject({ method: 'GET', url: evidenceUrl });

    expect(response.statusCode).toBe(401);
    expect(repository.findOwnedRequestById).not.toHaveBeenCalled();
    expect(repository.listPublishedDestinationCandidates).not.toHaveBeenCalled();
  });

  it('normalizes planner inputs while keeping affordability unevaluated', async () => {
    const repository = plannerRepository();
    const app = await createApp(repository);

    const response = await app.inject({
      method: 'GET',
      url: evidenceUrl,
      headers: bearer(app),
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['cache-control']).toBe('private, no-store');
    expect(repository.listPublishedDestinationCandidates).toHaveBeenCalledWith({
      excludeCityId: 'city-stockholm',
      limit: 20,
    });

    const payload = response.json().affordabilityEvidence;
    expect(payload.requestId).toBe('plan-request-1');
    expect(payload.destination).toEqual({
      id: 'destination-lisbon',
      slug: 'lisbon-portugal',
      name: 'Lisbon',
      regionName: 'Lisbon District',
      country: { code: 'PT', name: 'Portugal' },
      summary: 'Published destination summary.',
    });
    expect(payload.searchContext).toMatchObject({
      origin: { label: 'Stockholm', cityId: 'city-stockholm', airportId: null },
      dates: {
        flexible: true,
        earliestDeparture: '2026-10-01',
        latestReturn: '2026-10-15',
        minNights: 5,
        maxNights: 7,
      },
      travellers: { adults: 2, childrenAges: [6] },
      budget: {
        currencyCode: 'EUR',
        totalBudget: '1000.00',
        safetyReserve: { amount: '100.00', basis: 'USER_INPUT_DERIVED' },
        spendableBudget: '900.00',
      },
    });
    expect(payload.searchContext.budget.planningTargets).toEqual([
      {
        category: 'FLIGHTS',
        amount: '270.00',
        percentOfSpendable: '30.00',
        basis: 'PLANNING_TARGET',
      },
      {
        category: 'ACCOMMODATION',
        amount: '288.00',
        percentOfSpendable: '32.00',
        basis: 'PLANNING_TARGET',
      },
      {
        category: 'FOOD',
        amount: '135.00',
        percentOfSpendable: '15.00',
        basis: 'PLANNING_TARGET',
      },
      {
        category: 'LOCAL_TRANSPORT',
        amount: '72.00',
        percentOfSpendable: '8.00',
        basis: 'PLANNING_TARGET',
      },
      {
        category: 'ACTIVITIES',
        amount: '63.00',
        percentOfSpendable: '7.00',
        basis: 'PLANNING_TARGET',
      },
      {
        category: 'CHILDREN_ACTIVITIES',
        amount: '27.00',
        percentOfSpendable: '3.00',
        basis: 'PLANNING_TARGET',
      },
      {
        category: 'AIRPORT_TRANSFER',
        amount: '27.00',
        percentOfSpendable: '3.00',
        basis: 'PLANNING_TARGET',
      },
      {
        category: 'TRAVEL_INSURANCE',
        amount: '18.00',
        percentOfSpendable: '2.00',
        basis: 'PLANNING_TARGET',
      },
    ]);
    expect(payload.evidence).toMatchObject({
      policyKey: 'attravoya-affordability-evidence-v1',
      policyVersion: 1,
      status: 'INSUFFICIENT_EVIDENCE',
      collected: [],
      missingCategories: [
        'FLIGHTS',
        'ACCOMMODATION',
        'FOOD',
        'LOCAL_TRANSPORT',
        'ACTIVITIES',
        'CHILDREN_ACTIVITIES',
        'AIRPORT_TRANSFER',
        'TRAVEL_INSURANCE',
      ],
    });
    expect(payload.evaluation).toEqual({
      budgetFit: 'NOT_EVALUATED',
      rankingEligible: false,
      affordabilityConfirmed: false,
    });
    expect(payload.provenance).toMatchObject({
      kind: 'AFFORDABILITY_EVIDENCE_GATE',
      liveDataUsed: false,
      providerDataUsed: false,
      pricingDataUsed: false,
    });
  });

  it('hides another traveller request as not found', async () => {
    const repository = plannerRepository();
    const app = await createApp(repository);

    const response = await app.inject({
      method: 'GET',
      url: evidenceUrl,
      headers: bearer(app, 'user-2'),
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toMatchObject({ error: { code: 'NOT_FOUND' } });
    expect(repository.listPublishedDestinationCandidates).not.toHaveBeenCalled();
    expect(repository.findPublishedDestinationCandidateById).not.toHaveBeenCalled();
  });

  it('rejects a destination outside the current open candidate set', async () => {
    const repository = plannerRepository({
      listPublishedDestinationCandidates: vi.fn(async () => [
        destination({ id: 'destination-madrid', slug: 'madrid-spain' }),
      ]),
    });
    const app = await createApp(repository);

    const response = await app.inject({
      method: 'GET',
      url: evidenceUrl,
      headers: bearer(app),
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toMatchObject({ error: { code: 'NOT_FOUND' } });
  });

  it('does not substitute a different destination for a fixed-target request', async () => {
    const repository = plannerRepository({
      findOwnedRequestById: vi.fn(async () =>
        storedRequest({ targetDestinationId: 'destination-madrid' }),
      ),
    });
    const app = await createApp(repository);

    const response = await app.inject({
      method: 'GET',
      url: evidenceUrl,
      headers: bearer(app),
    });

    expect(response.statusCode).toBe(404);
    expect(repository.findPublishedDestinationCandidateById).not.toHaveBeenCalled();
    expect(repository.listPublishedDestinationCandidates).not.toHaveBeenCalled();
  });

  it('uses the saved fixed target when it matches the requested candidate', async () => {
    const repository = plannerRepository({
      findOwnedRequestById: vi.fn(async () =>
        storedRequest({ targetDestinationId: 'destination-lisbon' }),
      ),
    });
    const app = await createApp(repository);

    const response = await app.inject({
      method: 'GET',
      url: evidenceUrl,
      headers: bearer(app),
    });

    expect(response.statusCode).toBe(200);
    expect(repository.findPublishedDestinationCandidateById).toHaveBeenCalledWith(
      'destination-lisbon',
    );
    expect(repository.listPublishedDestinationCandidates).not.toHaveBeenCalled();
    expect(response.json().affordabilityEvidence.evaluation.budgetFit).toBe('NOT_EVALUATED');
  });
});
