import { describe, expect, it } from 'vitest';

import { normalizeAccommodationPricingEvidence } from './pricing-evidence.js';

function validEvidence(overrides = {}) {
  return {
    amountMin: '250',
    amountMax: '299.99',
    currencyCode: 'EUR',
    pricingBasis: 'LIVE',
    confidence: 'HIGH',
    sourceProvider: 'verified-provider',
    sourceExternalId: 'stay-123',
    sourceFetchedAt: '2026-09-06T10:00:00.000Z',
    ...overrides,
  };
}

describe('accommodation pricing evidence normalization', () => {
  it('keeps only normalized server evidence fields and provenance', () => {
    expect(
      normalizeAccommodationPricingEvidence(
        validEvidence({ rawProviderPayload: { shouldNotLeak: true } }),
        'EUR',
      ),
    ).toEqual({
      category: 'ACCOMMODATION',
      amountMin: '250.00',
      amountMax: '299.99',
      currencyCode: 'EUR',
      pricingBasis: 'LIVE',
      confidence: 'HIGH',
      sourceProvider: 'verified-provider',
      sourceExternalId: 'stay-123',
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

  it('rejects currency mismatch, invalid ranges, and missing source identity', () => {
    expect(() =>
      normalizeAccommodationPricingEvidence(validEvidence({ currencyCode: 'SEK' }), 'EUR'),
    ).toThrow('planner budget currency');
    expect(() =>
      normalizeAccommodationPricingEvidence(
        validEvidence({ amountMin: 400, amountMax: 300 }),
        'EUR',
      ),
    ).toThrow('maximum cannot be below');
    expect(() =>
      normalizeAccommodationPricingEvidence(validEvidence({ sourceProvider: ' ' }), 'EUR'),
    ).toThrow('sourceProvider is invalid');
  });
});
