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
  it.each([undefined, null, {}, { status: '' }, { status: ' ' }, { status: 123 }])(
    'rejects malformed collection payload %s',
    (collection) => {
      expect(() => applyMarketPricingCollection(gate(), 'FLIGHTS', collection)).toThrow(
        'Pricing collection status is invalid.',
      );
    },
  );

  it('rejects otherwise supported categories that are not required by the plan', () => {
    expect(() =>
      applyMarketPricingCollection(gate(), 'ACCOMMODATION', {
        status: 'COLLECTED',
        evidence: { category: 'ACCOMMODATION', pricingBasis: 'LIVE' },
      }),
    ).toThrow('Pricing category is not required by the current plan.');
  });

  it('rejects mismatched category evidence rather than marking the gate ready', () => {
    expect(() =>
      applyMarketPricingCollection(gate(), 'FLIGHTS', {
        status: 'COLLECTED',
        evidence: { category: 'ACCOMMODATION', pricingBasis: 'LIVE' },
      }),
    ).toThrow('Collected pricing evidence category does not match the request.');

    expect(() => applyMarketPricingCollection(gate(), 'FLIGHTS', { status: 'COLLECTED' })).toThrow(
      'Collected pricing evidence category does not match the request.',
    );
  });

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

  it('updates provenance when refreshed evidence changes from live to verified', () => {
    const first = applyMarketPricingCollection(gate(), 'FLIGHTS', {
      status: 'COLLECTED',
      evidence: { category: 'FLIGHTS', amountMin: '100.00', pricingBasis: 'LIVE' },
    });
    const refreshed = applyMarketPricingCollection(first, 'FLIGHTS', {
      status: 'COLLECTED',
      evidence: { category: 'FLIGHTS', amountMin: '90.00', pricingBasis: 'VERIFIED_PRICE' },
    });

    expect(refreshed.provenance).toMatchObject({
      liveDataUsed: false,
      providerDataUsed: true,
      pricingDataUsed: true,
    });
    expect(refreshed.provenance.statement).toContain('Verified cost evidence was collected');
  });

  it('removes pricing provenance if a failed refresh leaves no evidence', () => {
    const first = applyMarketPricingCollection(gate(), 'FLIGHTS', {
      status: 'COLLECTED',
      evidence: { category: 'FLIGHTS', amountMin: '100.00', pricingBasis: 'LIVE' },
    });
    const failed = applyMarketPricingCollection(first, 'FLIGHTS', {
      status: 'NOT_CONFIGURED',
    });

    expect(failed.provenance).toMatchObject({
      liveDataUsed: false,
      providerDataUsed: false,
      pricingDataUsed: false,
    });
    expect(failed.provenance.statement).toContain('No current market pricing evidence');
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
