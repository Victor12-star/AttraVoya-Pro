import { describe, expect, it } from 'vitest';

import {
  normalizeAccommodationPricingEvidence,
  normalizeFlightPricingEvidence,
  normalizePlannerCategoryPricingEvidence,
} from './pricing-evidence.js';

function validEvidence(overrides = {}) {
  return {
    amountMin: '250',
    amountMax: '299.99',
    currencyCode: 'EUR',
    pricingBasis: 'LIVE',
    confidence: 'HIGH',
    sourceProvider: 'verified-provider',
    sourceExternalId: 'market-123',
    sourceFetchedAt: '2026-09-06T10:00:00.000Z',
    ...overrides,
  };
}

describe('market pricing evidence normalization', () => {
  it('keeps only normalized accommodation evidence fields and provenance', () => {
    expect(
      normalizeAccommodationPricingEvidence(
        validEvidence({ rawProviderPayload: { shouldNotLeak: true } }),
        'EUR',
      ),
    ).toEqual({
      category: 'ACCOMMODATION',
      amountScope: 'PLANNER_CATEGORY_TOTAL',
      amountMin: '250.00',
      amountMax: '299.99',
      currencyCode: 'EUR',
      pricingBasis: 'LIVE',
      confidence: 'HIGH',
      sourceProvider: 'verified-provider',
      sourceExternalId: 'market-123',
      sourceFetchedAt: '2026-09-06T10:00:00.000Z',
      verifiedMarketEvidence: true,
    });
  });

  it('normalizes verified flight evidence through the same strict market contract', () => {
    expect(
      normalizeFlightPricingEvidence(
        validEvidence({
          amountMin: 180,
          amountMax: 220.5,
          pricingBasis: 'VERIFIED_PRICE',
          sourceExternalId: 'flight-offer-456',
          providerRaw: { shouldNotLeak: true },
        }),
        'eur',
      ),
    ).toEqual({
      category: 'FLIGHTS',
      amountScope: 'PLANNER_CATEGORY_TOTAL',
      amountMin: '180.00',
      amountMax: '220.50',
      currencyCode: 'EUR',
      pricingBasis: 'VERIFIED_PRICE',
      confidence: 'HIGH',
      sourceProvider: 'verified-provider',
      sourceExternalId: 'flight-offer-456',
      sourceFetchedAt: '2026-09-06T10:00:00.000Z',
      verifiedMarketEvidence: true,
    });
  });

  it.each([
    'FOOD',
    'LOCAL_TRANSPORT',
    'ACTIVITIES',
    'CHILDREN_ACTIVITIES',
    'AIRPORT_TRANSFER',
    'TRAVEL_INSURANCE',
  ])('normalizes %s only through the verified category-total contract', (category) => {
    const normalized = normalizePlannerCategoryPricingEvidence(
      validEvidence({
        amountMin: 40,
        amountMax: 75.5,
        pricingBasis: 'VERIFIED_PRICE',
        sourceExternalId: `${category.toLowerCase()}-evidence`,
        rawSourceResponse: { mustNotLeak: true },
      }),
      'EUR',
      category,
    );

    expect(normalized).toEqual({
      category,
      amountScope: 'PLANNER_CATEGORY_TOTAL',
      amountMin: '40.00',
      amountMax: '75.50',
      currencyCode: 'EUR',
      pricingBasis: 'VERIFIED_PRICE',
      confidence: 'HIGH',
      sourceProvider: 'verified-provider',
      sourceExternalId: `${category.toLowerCase()}-evidence`,
      sourceFetchedAt: '2026-09-06T10:00:00.000Z',
      verifiedMarketEvidence: true,
    });
    expect(normalized).not.toHaveProperty('rawSourceResponse');
  });

  it.each(['ESTIMATE', 'USER_ENTERED', 'UNAVAILABLE'])(
    'rejects %s as verified accommodation market evidence',
    (pricingBasis) => {
      expect(() =>
        normalizeAccommodationPricingEvidence(validEvidence({ pricingBasis }), 'EUR'),
      ).toThrow('live or verified-price evidence');
    },
  );

  it.each(['ESTIMATE', 'USER_ENTERED', 'UNAVAILABLE'])(
    'rejects %s as verified remaining-category evidence',
    (pricingBasis) => {
      expect(() =>
        normalizePlannerCategoryPricingEvidence(validEvidence({ pricingBasis }), 'EUR', 'FOOD'),
      ).toThrow('live or verified-price evidence');
    },
  );

  it('rejects currency mismatch, invalid ranges, missing identity, and unsupported categories', () => {
    expect(() =>
      normalizeAccommodationPricingEvidence(validEvidence({ currencyCode: 'SEK' }), 'EUR'),
    ).toThrow('planner budget currency');
    expect(() =>
      normalizeFlightPricingEvidence(validEvidence({ amountMin: 400, amountMax: 300 }), 'EUR'),
    ).toThrow('maximum cannot be below');
    expect(() =>
      normalizePlannerCategoryPricingEvidence(
        validEvidence({ sourceProvider: ' ' }),
        'EUR',
        'LOCAL_TRANSPORT',
      ),
    ).toThrow('sourceProvider is invalid');
    expect(() => normalizePlannerCategoryPricingEvidence(validEvidence(), 'EUR', 'OTHER')).toThrow(
      'category is not supported',
    );
  });
});
