import { describe, expect, it } from 'vitest';

import { compareScopedHolidayCandidates } from './scoped-holiday-comparison.js';

const candidates = {
  requestId: 'my-brief',
  scope: 'SPECIFIC_CITY',
  countryCode: 'IT',
  cityId: 'rome',
  destinations: [
    { id: 'rome-a', name: 'Rome A' },
    { id: 'rome-b', name: 'Rome B' },
  ],
};

function evidence(destinationId, amountMin, amountMax) {
  return {
    destinationId,
    comparisonKey: 'one-adult-2026-11-10-to-2026-11-17',
    evidence: { status: 'COMPLETE_EVIDENCE', required: [{ category: 'ACCOMMODATION' }] },
    evaluation: {
      evidenceReady: true,
      evaluationPolicy: {
        status: 'EVALUATED',
        currencyCode: 'EUR',
        spendableBudget: '1200.00',
        totalEvidenceRange: { amountMin, amountMax },
      },
    },
  };
}

describe('scoped holiday comparison', () => {
  it('never admits outside-city price evidence into city results', () => {
    const result = compareScopedHolidayCandidates(candidates, [
      evidence('outside-city', '1.00', '2.00'),
      evidence('rome-b', '600.00', '900.00'),
      evidence('rome-a', '500.00', '700.00'),
    ]);
    expect(result.ranked.map((item) => item.destinationId)).toEqual(['rome-a', 'rome-b']);
    expect(result.ranked[0].destination.name).toBe('Rome A');
    expect(result.scope).toBe('SPECIFIC_CITY');
    expect(result.availabilityDataUsed).toBe(false);
  });

  it('keeps destinations with missing evidence unranked', () => {
    const result = compareScopedHolidayCandidates(candidates, [evidence('rome-a', '500.00', '700.00')]);
    expect(result.rankingApplied).toBe(false);
    expect(result.unranked).toEqual([{ destinationId: 'rome-b', reason: 'UNVERIFIED_EVIDENCE' }]);
  });

  it('does not produce prices or rankings without evidence', () => {
    const result = compareScopedHolidayCandidates(candidates);
    expect(result.ranked).toEqual([]);
    expect(result.priceDataAvailable).toBe(false);
    expect(result.rankingApplied).toBe(false);
    expect(result.unranked).toHaveLength(2);
  });
});
