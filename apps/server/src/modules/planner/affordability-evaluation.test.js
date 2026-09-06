import { describe, expect, it } from 'vitest';

import { evaluateAffordabilityEvidenceGate } from './affordability-evaluation.js';

function collectedEvidence(category, amountMin, amountMax, overrides = {}) {
  return {
    category,
    amountScope: 'PLANNER_CATEGORY_TOTAL',
    amountMin,
    amountMax,
    currencyCode: 'EUR',
    pricingBasis: 'VERIFIED_PRICE',
    confidence: 'HIGH',
    sourceProvider: `verified-${category.toLowerCase()}-test`,
    sourceExternalId: `${category.toLowerCase()}-evidence-1`,
    sourceFetchedAt: '2026-09-06T12:00:00.000Z',
    verifiedMarketEvidence: true,
    ...overrides,
  };
}

function completeGate({ spendableBudget = '900.00', collected, totalBudget = '1000.00' }) {
  const required = collected.map((item) => ({
    category: item.category,
    targetAmount: '100.00',
    targetBasis: 'PLANNING_TARGET',
    status: 'COLLECTED',
  }));

  return {
    requestId: 'plan-request-1',
    destination: { id: 'destination-lisbon' },
    searchContext: {
      budget: {
        currencyCode: 'EUR',
        totalBudget,
        spendableBudget,
        safetyReserve: {
          amount: '100.00',
          basis: 'USER_INPUT_DERIVED',
        },
      },
    },
    evidence: {
      policyKey: 'attravoya-affordability-evidence-v1',
      policyVersion: 1,
      status: 'COMPLETE_EVIDENCE',
      required,
      collected,
      missingCategories: [],
      collectionAttempts: [],
    },
    evaluation: {
      budgetFit: 'NOT_EVALUATED',
      rankingEligible: false,
      affordabilityConfirmed: false,
      evidenceReady: true,
    },
    provenance: {
      kind: 'AFFORDABILITY_EVIDENCE_GATE',
      liveDataUsed: false,
      providerDataUsed: true,
      pricingDataUsed: true,
      statement: 'Complete evidence awaits evaluation.',
    },
  };
}

describe('affordability evaluation policy', () => {
  it('leaves incomplete evidence unevaluated and unchanged', () => {
    const gate = {
      evidence: { status: 'INSUFFICIENT_EVIDENCE' },
      evaluation: {
        budgetFit: 'NOT_EVALUATED',
        rankingEligible: false,
        affordabilityConfirmed: false,
        evidenceReady: false,
      },
    };

    expect(evaluateAffordabilityEvidenceGate(gate)).toBe(gate);
  });

  it('confirms comfortable budget fit only when the full upper range fits spendable budget', () => {
    const gate = completeGate({
      collected: [
        collectedEvidence('FLIGHTS', '200.00', '250.00'),
        collectedEvidence('ACCOMMODATION', '300.00', '400.00'),
        collectedEvidence('FOOD', '100.00', '150.00'),
      ],
    });

    const evaluated = evaluateAffordabilityEvidenceGate(gate);

    expect(evaluated.evaluation).toMatchObject({
      budgetFit: 'COMFORTABLE',
      rankingEligible: false,
      affordabilityConfirmed: true,
      evidenceReady: true,
      evaluationPolicy: {
        policyKey: 'attravoya-affordability-evaluation-v1',
        policyVersion: 1,
        status: 'EVALUATED',
        comparisonBasis: 'SPENDABLE_BUDGET',
        safetyReserveProtected: true,
        currencyCode: 'EUR',
        spendableBudget: '900.00',
        totalEvidenceRange: {
          amountMin: '600.00',
          amountMax: '800.00',
        },
      },
    });
  });

  it('marks a range crossing the spendable budget as tight without confirming affordability', () => {
    const gate = completeGate({
      collected: [
        collectedEvidence('FLIGHTS', '250.00', '350.00'),
        collectedEvidence('ACCOMMODATION', '350.00', '450.00'),
        collectedEvidence('FOOD', '100.00', '150.00'),
      ],
    });

    const evaluated = evaluateAffordabilityEvidenceGate(gate);

    expect(evaluated.evaluation.budgetFit).toBe('TIGHT');
    expect(evaluated.evaluation.affordabilityConfirmed).toBe(false);
    expect(evaluated.evaluation.rankingEligible).toBe(false);
    expect(evaluated.evaluation.evaluationPolicy.totalEvidenceRange).toEqual({
      amountMin: '700.00',
      amountMax: '950.00',
    });
  });

  it('marks the trip over budget only when the full lower range exceeds spendable budget', () => {
    const gate = completeGate({
      collected: [
        collectedEvidence('FLIGHTS', '350.00', '400.00'),
        collectedEvidence('ACCOMMODATION', '400.00', '450.00'),
        collectedEvidence('FOOD', '175.00', '200.00'),
      ],
    });

    const evaluated = evaluateAffordabilityEvidenceGate(gate);

    expect(evaluated.evaluation).toMatchObject({
      budgetFit: 'OVER_BUDGET',
      affordabilityConfirmed: false,
      rankingEligible: false,
    });
    expect(evaluated.evaluation.evaluationPolicy.totalEvidenceRange).toEqual({
      amountMin: '925.00',
      amountMax: '1050.00',
    });
  });

  it('protects the safety reserve by comparing against spendable budget, not total budget', () => {
    const gate = completeGate({
      totalBudget: '1000.00',
      spendableBudget: '900.00',
      collected: [
        collectedEvidence('FLIGHTS', '400.00', '450.00'),
        collectedEvidence('ACCOMMODATION', '450.00', '470.00'),
      ],
    });

    const evaluated = evaluateAffordabilityEvidenceGate(gate);

    expect(evaluated.evaluation.budgetFit).toBe('TIGHT');
    expect(evaluated.evaluation.affordabilityConfirmed).toBe(false);
    expect(evaluated.evaluation.evaluationPolicy.safetyReserveProtected).toBe(true);
  });

  it('fails closed when a complete evidence set is duplicated, mismatched, or unverified', () => {
    const flight = collectedEvidence('FLIGHTS', '200.00', '250.00');
    const gate = completeGate({
      collected: [flight, collectedEvidence('ACCOMMODATION', '300.00', '350.00')],
    });
    gate.evidence.collected[1] = {
      ...gate.evidence.collected[1],
      category: 'FLIGHTS',
      currencyCode: 'USD',
      verifiedMarketEvidence: false,
    };

    const evaluated = evaluateAffordabilityEvidenceGate(gate);

    expect(evaluated.evaluation).toMatchObject({
      budgetFit: 'NOT_EVALUATED',
      rankingEligible: false,
      affordabilityConfirmed: false,
      evidenceReady: false,
      evaluationPolicy: {
        status: 'BLOCKED',
        reason: 'INVALID_COMPLETE_EVIDENCE',
        comparisonBasis: 'SPENDABLE_BUDGET',
        safetyReserveProtected: true,
      },
    });
  });
});
