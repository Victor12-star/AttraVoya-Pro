import { describe, expect, it } from 'vitest';

import { applyMarketPricingCollection } from './affordability-evidence.js';

function gate() {
  return {
    evidence: {
      status: 'INSUFFICIENT_EVIDENCE',
      required: [{ category: 'FLIGHTS', status: 'NOT_COLLECTED' }],
      collected: [],
      missingCategories: ['FLIGHTS'],
      collectionAttempts: [],
    },
    evaluation: { evidenceReady: false },
    provenance: { liveDataUsed: false, providerDataUsed: false, pricingDataUsed: false },
  };
}

describe('affordability evidence collection refresh', () => {
  it('replaces previous category evidence on repeated successful collection', () => {
    const first = applyMarketPricingCollection(gate(), 'FLIGHTS', {
      status: 'COLLECTED',
      evidence: { category: 'FLIGHTS', amountMin: '100.00', pricingBasis: 'LIVE' },
    });
    const refreshed = applyMarketPricingCollection(first, 'FLIGHTS', {
      status: 'COLLECTED',
      evidence: { category: 'FLIGHTS', amountMin: '80.00', pricingBasis: 'LIVE' },
    });

    expect(refreshed.evidence.collected).toEqual([
      { category: 'FLIGHTS', amountMin: '80.00', pricingBasis: 'LIVE' },
    ]);
    expect(refreshed.evidence.status).toBe('COMPLETE_EVIDENCE');
    expect(refreshed.evaluation.evidenceReady).toBe(true);
    expect(refreshed.evidence.collectionAttempts).toHaveLength(2);
  });

  it('invalidates previous affordability confirmation after recollecting evidence', () => {
    const previouslyEvaluated = {
      ...gate(),
      evaluation: {
        budgetFit: 'COMFORTABLE',
        rankingEligible: true,
        affordabilityConfirmed: true,
        evidenceReady: true,
        evaluationPolicy: { status: 'EVALUATED' },
      },
    };
    const refreshed = applyMarketPricingCollection(previouslyEvaluated, 'FLIGHTS', {
      status: 'COLLECTED',
      evidence: { category: 'FLIGHTS', amountMin: '120.00', pricingBasis: 'LIVE' },
    });

    expect(refreshed.evaluation).toMatchObject({
      budgetFit: 'NOT_EVALUATED',
      rankingEligible: false,
      affordabilityConfirmed: false,
      evidenceReady: true,
    });
    expect(refreshed.evaluation.evaluationPolicy).toBeUndefined();
  });

  it('clears stale category evidence when a refresh cannot collect prices', () => {
    const first = applyMarketPricingCollection(gate(), 'FLIGHTS', {
      status: 'COLLECTED',
      evidence: { category: 'FLIGHTS', amountMin: '100.00', pricingBasis: 'LIVE' },
    });
    const failed = applyMarketPricingCollection(first, 'FLIGHTS', {
      status: 'NOT_CONFIGURED',
    });

    expect(failed.evidence.collected).toEqual([]);
    expect(failed.evidence.missingCategories).toEqual(['FLIGHTS']);
    expect(failed.evidence.status).toBe('INSUFFICIENT_EVIDENCE');
    expect(failed.evaluation.evidenceReady).toBe(false);
  });
});
