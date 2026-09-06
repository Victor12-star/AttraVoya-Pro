import { describe, expect, it } from 'vitest';

import {
  normalizeAccommodationPricingEvidence,
  normalizeFlightPricingEvidence,
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

  it.each(['ESTIMATE', 'USER_ENTERED', 'UNAVAILABLE'])(
    'rejects %s as verified accommodation market evidence',
    (pricingBasis) => {
      expect(() =>
        normalizeAccommodationPricingEvidence(validEvidence({ pricingBasis }), 'EUR'),
      ).toThrow('live or verified-price evidence');
    },
  );

  it.each(['ESTIMATE', 'USER_ENTERED', 'UNAVAILABLE'])(
    'rejects %s as verified flight market evidence',
    (pricingBasis) => {
      expect(() => normalizeFlightPricingEvidence(validEvidence({ pricingBasis }), 'EUR')).toThrow(
        'live or verified-price evidence',
      );
    },
  );

  it('rejects currency mismatch, invalid ranges, and missing source identity', () => {
    expect(() =>
      normalizeAccommodationPricingEvidence(validEvidence({ currencyCode: 'SEK' }), 'EUR'),
    ).toThrow('planner budget currency');
    expect(() =>
      normalizeFlightPricingEvidence(validEvidence({ amountMin: 400, amountMax: 300 }), 'EUR'),
    ).toThrow('maximum cannot be below');
    expect(() =>
      normalizeFlightPricingEvidence(validEvidence({ sourceProvider: ' ' }), 'EUR'),
    ).toThrow('sourceProvider is invalid');
  });
});
