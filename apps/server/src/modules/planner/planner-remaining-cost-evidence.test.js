import { describe, expect, it, vi } from 'vitest';

import { createPlannerService } from './planner.service.js';

const CATEGORY_TARGETS = Object.freeze({
  FLIGHTS: '270.00',
  ACCOMMODATION: '288.00',
  FOOD: '135.00',
  LOCAL_TRANSPORT: '72.00',
  ACTIVITIES: '63.00',
  CHILDREN_ACTIVITIES: '27.00',
  AIRPORT_TRANSFER: '27.00',
  TRAVEL_INSURANCE: '18.00',
});

/**
 * @typedef {Object} VerifiedCollectorResult
 * @property {string} amountMin
 * @property {string} amountMax
 * @property {string} currencyCode
 * @property {string} pricingBasis
 * @property {string} confidence
 * @property {string} sourceProvider
 * @property {string} sourceExternalId
 * @property {string} sourceFetchedAt
 * @property {{ mustNotLeak: boolean }} [rawProviderPayload]
 */

function storedRequest() {
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
    comfortLevel: 'VALUE',
    safetyReservePercent: '10.00',
    status: 'DRAFT',
    createdAt: new Date('2026-09-06T10:00:00.000Z'),
    updatedAt: new Date('2026-09-06T10:00:00.000Z'),
    budgetCurrency: { code: 'EUR' },
    targetDestination: null,
    stayPreference: null,
  };
}

function destination() {
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
  };
}

function repository() {
  return {
    findOwnedRequestById: vi.fn(async ({ userId, requestId }) =>
      userId === 'user-1' && requestId === 'plan-request-1' ? storedRequest() : null,
    ),
    listPublishedDestinationCandidates: vi.fn(async () => [destination()]),
  };
}

function verifiedEvidence(category, amount = CATEGORY_TARGETS[category]) {
  return /** @type {VerifiedCollectorResult} */ ({
    amountMin: amount,
    amountMax: amount,
    currencyCode: 'EUR',
    pricingBasis: 'VERIFIED_PRICE',
    confidence: 'HIGH',
    sourceProvider: `verified-${category.toLowerCase()}-test`,
    sourceExternalId: `${category.toLowerCase()}-evidence-1`,
    sourceFetchedAt: '2026-09-06T12:00:00.000Z',
    rawProviderPayload: { mustNotLeak: true },
  });
}

function verifiedCollector(category, amount = CATEGORY_TARGETS[category]) {
  return {
    collect: vi.fn(async () => verifiedEvidence(category, amount)),
  };
}

function deferredEvidence() {
  /** @type {(value: VerifiedCollectorResult) => void} */
  let resolve = () => {};
  const promise = new Promise((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

async function evidence(service) {
  return service.getAffordabilityEvidence({
    userId: 'user-1',
    requestId: 'plan-request-1',
    destinationId: 'destination-lisbon',
  });
}

describe('remaining planner cost evidence collectors', () => {
  it('marks every required category not configured when no trusted collectors exist', async () => {
    const result = await evidence(createPlannerService(repository()));

    expect(result.evidence.collectionAttempts).toEqual(
      Object.keys(CATEGORY_TARGETS).map((category) => ({
        category,
        status: 'NOT_CONFIGURED',
      })),
    );
    expect(result.evidence.required.every((item) => item.status === 'NOT_CONFIGURED')).toBe(true);
    expect(result.evidence.collected).toEqual([]);
    expect(result.evidence.status).toBe('INSUFFICIENT_EVIDENCE');
    expect(result.evaluation).toEqual({
      budgetFit: 'NOT_EVALUATED',
      rankingEligible: false,
      affordabilityConfirmed: false,
      evidenceReady: false,
    });
  });

  it('starts configured collectors concurrently while preserving deterministic category order', async () => {
    const flightDeferred = deferredEvidence();
    const accommodationDeferred = deferredEvidence();
    const flightPricingCollector = { collect: vi.fn(() => flightDeferred.promise) };
    const accommodationPricingCollector = {
      collect: vi.fn(() => accommodationDeferred.promise),
    };

    const pendingResult = evidence(
      createPlannerService(repository(), {
        flightPricingCollector,
        accommodationPricingCollector,
      }),
    );

    await vi.waitFor(() => {
      expect(flightPricingCollector.collect).toHaveBeenCalledTimes(1);
      expect(accommodationPricingCollector.collect).toHaveBeenCalledTimes(1);
    });

    accommodationDeferred.resolve(verifiedEvidence('ACCOMMODATION'));
    flightDeferred.resolve(verifiedEvidence('FLIGHTS'));
    const result = await pendingResult;

    expect(result.evidence.collectionAttempts.slice(0, 3)).toEqual([
      { category: 'FLIGHTS', status: 'COLLECTED' },
      { category: 'ACCOMMODATION', status: 'COLLECTED' },
      { category: 'FOOD', status: 'NOT_CONFIGURED' },
    ]);
    expect(result.evidence.collected.map((item) => item.category)).toEqual([
      'FLIGHTS',
      'ACCOMMODATION',
    ]);
    expect(result.evaluation).toEqual({
      budgetFit: 'NOT_EVALUATED',
      rankingEligible: false,
      affordabilityConfirmed: false,
      evidenceReady: false,
    });
  });

  it('isolates a failed collector without cancelling verified evidence from another category', async () => {
    const flightPricingCollector = {
      collect: vi.fn(async () => {
        throw new Error('simulated flight provider failure');
      }),
    };
    const accommodationPricingCollector = verifiedCollector('ACCOMMODATION');

    const result = await evidence(
      createPlannerService(repository(), {
        flightPricingCollector,
        accommodationPricingCollector,
      }),
    );

    expect(result.evidence.collectionAttempts.slice(0, 2)).toEqual([
      { category: 'FLIGHTS', status: 'FAILED' },
      { category: 'ACCOMMODATION', status: 'COLLECTED' },
    ]);
    expect(result.evidence.collected).toEqual([
      expect.objectContaining({
        category: 'ACCOMMODATION',
        sourceProvider: 'verified-accommodation-test',
        verifiedMarketEvidence: true,
      }),
    ]);
    expect(result.evidence.required.find((item) => item.category === 'FLIGHTS')).toMatchObject({
      status: 'FAILED',
    });
    expect(result.evidence.required.find((item) => item.category === 'ACCOMMODATION')).toMatchObject({
      status: 'COLLECTED',
    });
    expect(result.evaluation).toEqual({
      budgetFit: 'NOT_EVALUATED',
      rankingEligible: false,
      affordabilityConfirmed: false,
      evidenceReady: false,
    });
  });

  it('accepts all eight server-only verified collectors while keeping ranking disabled', async () => {
    const collectors = {
      flightPricingCollector: verifiedCollector('FLIGHTS'),
      accommodationPricingCollector: verifiedCollector('ACCOMMODATION'),
      foodPricingCollector: verifiedCollector('FOOD'),
      localTransportPricingCollector: verifiedCollector('LOCAL_TRANSPORT'),
      activitiesPricingCollector: verifiedCollector('ACTIVITIES'),
      childrenActivitiesPricingCollector: verifiedCollector('CHILDREN_ACTIVITIES'),
      airportTransferPricingCollector: verifiedCollector('AIRPORT_TRANSFER'),
      travelInsurancePricingCollector: verifiedCollector('TRAVEL_INSURANCE'),
    };
    const result = await evidence(createPlannerService(repository(), collectors));

    expect(result.evidence.status).toBe('COMPLETE_EVIDENCE');
    expect(result.evidence.missingCategories).toEqual([]);
    expect(result.evidence.collectionAttempts).toEqual(
      Object.keys(CATEGORY_TARGETS).map((category) => ({ category, status: 'COLLECTED' })),
    );
    expect(result.evidence.collected).toHaveLength(8);
    expect(result.evidence.collected.map((item) => item.category)).toEqual(
      Object.keys(CATEGORY_TARGETS),
    );
    expect(JSON.stringify(result)).not.toContain('rawProviderPayload');
    expect(result.evaluation).toMatchObject({
      budgetFit: 'COMFORTABLE',
      rankingEligible: false,
      affordabilityConfirmed: true,
      evidenceReady: true,
      evaluationPolicy: {
        policyKey: 'attravoya-affordability-evaluation-v1',
        status: 'EVALUATED',
        comparisonBasis: 'SPENDABLE_BUDGET',
        safetyReserveProtected: true,
        spendableBudget: '900.00',
        totalEvidenceRange: { amountMin: '900.00', amountMax: '900.00' },
      },
    });
  });

  it('fails one remaining category closed without promoting it into verified evidence', async () => {
    const foodPricingCollector = verifiedCollector('FOOD');
    foodPricingCollector.collect.mockResolvedValue({
      amountMin: '100.00',
      amountMax: '120.00',
      currencyCode: 'EUR',
      pricingBasis: 'ESTIMATE',
      confidence: 'HIGH',
      sourceProvider: 'unverified-food-estimate',
      sourceExternalId: 'food-estimate-1',
      sourceFetchedAt: '2026-09-06T12:00:00.000Z',
    });

    const result = await evidence(createPlannerService(repository(), { foodPricingCollector }));

    expect(result.evidence.collectionAttempts).toContainEqual({
      category: 'FOOD',
      status: 'FAILED',
    });
    expect(result.evidence.collected).toEqual([]);
    expect(result.evidence.required.find((item) => item.category === 'FOOD')).toMatchObject({
      status: 'FAILED',
    });
    expect(result.evaluation).toEqual({
      budgetFit: 'NOT_EVALUATED',
      rankingEligible: false,
      affordabilityConfirmed: false,
      evidenceReady: false,
    });
  });
});
