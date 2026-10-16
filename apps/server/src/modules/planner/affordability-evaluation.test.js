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

function completeGate({
  spendableBudget = '900.00',
  collected,
  totalBudget = '1000.00',
  reserveAmount = '100.00',
  reservePercent = '10.00',
}) {
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
          amount: reserveAmount,
          percentOfTotal: reservePercent,
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

  it.each([
    { affordabilityConfirmed: true },
    { rankingEligible: true },
    { budgetFit: 'COMFORTABLE' },
    { evaluationPolicy: { status: 'EVALUATED' } },
  ])('blocks stale affordability state for incomplete evidence %#', (stale) => {
    const gate = {
      evidence: { status: 'INSUFFICIENT_EVIDENCE' },
      evaluation: {
        budgetFit: 'NOT_EVALUATED',
        rankingEligible: false,
        affordabilityConfirmed: false,
        evidenceReady: false,
        ...stale,
      },
      provenance: { statement: 'Awaiting evidence.' },
    };
    const evaluated = evaluateAffordabilityEvidenceGate(gate);
    expect(evaluated.evaluation).toMatchObject({
      budgetFit: 'NOT_EVALUATED',
      rankingEligible: false,
      affordabilityConfirmed: false,
      evidenceReady: false,
      evaluationPolicy: { status: 'BLOCKED', reason: 'INCOMPLETE_EVIDENCE' },
    });
    expect(evaluated.provenance.statement).toContain('blocked');
  });

  it.each(['', 'eur', 'EURO', 'E1R', 'EUR ', '__proto__'])(
    'blocks malformed budget currency code %s',
    (currencyCode) => {
      const gate = completeGate({
        collected: [collectedEvidence('FLIGHTS', '200.00', '250.00')],
      });
      gate.searchContext.budget.currencyCode = currencyCode;
      gate.evidence.collected[0].currencyCode = currencyCode;

      expect(evaluateAffordabilityEvidenceGate(gate).evaluation).toMatchObject({
        budgetFit: 'NOT_EVALUATED',
        affordabilityConfirmed: false,
        evidenceReady: false,
        evaluationPolicy: { status: 'BLOCKED', reason: 'INVALID_COMPLETE_EVIDENCE' },
      });
    },
  );

  it.each(['0.00', '00.00', '000.00'])(
    'blocks a required expense with a zero planning target %s',
    (targetAmount) => {
      const gate = completeGate({
        collected: [collectedEvidence('FLIGHTS', '200.00', '250.00')],
      });
      gate.evidence.required[0].targetAmount = targetAmount;

      expect(evaluateAffordabilityEvidenceGate(gate).evaluation).toMatchObject({
        budgetFit: 'NOT_EVALUATED',
        affordabilityConfirmed: false,
        evidenceReady: false,
        evaluationPolicy: { status: 'BLOCKED', reason: 'INVALID_COMPLETE_EVIDENCE' },
      });
    },
  );

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

  it.each([
    { totalBudget: '1000.00', spendableBudget: '950.00', reserveAmount: '100.00' },
    { totalBudget: '1000.00', spendableBudget: '800.00', reserveAmount: '100.00' },
    { totalBudget: '1000.00', spendableBudget: '900.00', reserveAmount: '0.01' },
    { totalBudget: '1000.00', spendableBudget: '900.00', reserveAmount: 'invalid' },
  ])('blocks inconsistent budget and reserve amounts %#', (budget) => {
    const gate = completeGate({
      ...budget,
      collected: [collectedEvidence('FLIGHTS', '200.00', '250.00')],
    });
    const evaluated = evaluateAffordabilityEvidenceGate(gate);
    expect(evaluated.evaluation).toMatchObject({
      budgetFit: 'NOT_EVALUATED',
      affordabilityConfirmed: false,
      evidenceReady: false,
      evaluationPolicy: { status: 'BLOCKED', reason: 'INVALID_COMPLETE_EVIDENCE' },
    });
  });

  it.each([
    { reservePercent: '20.00' },
    { reservePercent: '101.00' },
    { reservePercent: 'invalid' },
    { reservePercent: '10.01' },
  ])('blocks mismatched or invalid reserve percentage %#', (reserve) => {
    const gate = completeGate({
      ...reserve,
      collected: [collectedEvidence('FLIGHTS', '200.00', '250.00')],
    });
    expect(evaluateAffordabilityEvidenceGate(gate).evaluation).toMatchObject({
      budgetFit: 'NOT_EVALUATED',
      affordabilityConfirmed: false,
      evaluationPolicy: { status: 'BLOCKED', reason: 'INVALID_COMPLETE_EVIDENCE' },
    });
  });

  it('accepts correctly rounded fractional-cent reserve amounts', () => {
    const gate = completeGate({
      totalBudget: '0.05',
      spendableBudget: '0.04',
      reserveAmount: '0.01',
      reservePercent: '10.00',
      collected: [collectedEvidence('FLIGHTS', '0.01', '0.03')],
    });
    expect(evaluateAffordabilityEvidenceGate(gate).evaluation.budgetFit).toBe('COMFORTABLE');
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

  it('rejects ambiguous source timestamps without an explicit timezone', () => {
    const invalidTimestamp = completeGate({
      collected: [
        collectedEvidence('FLIGHTS', '200.00', '250.00', {
          sourceFetchedAt: '2026-09-06T12:00:00',
        }),
      ],
    });

    const evaluated = evaluateAffordabilityEvidenceGate(invalidTimestamp);
    expect(evaluated.evaluation.budgetFit).toBe('NOT_EVALUATED');
    expect(evaluated.evaluation.evaluationPolicy.status).toBe('BLOCKED');

    const validTimestamp = completeGate({
      collected: [
        collectedEvidence('FLIGHTS', '200.00', '250.00', {
          sourceFetchedAt: '2026-09-06T14:00:00+02:00',
        }),
      ],
    });
    expect(evaluateAffordabilityEvidenceGate(validTimestamp).evaluation.budgetFit).toBe(
      'COMFORTABLE',
    );
  });

  it('rejects impossible source calendar dates and accepts leap-day evidence', () => {
    for (const sourceFetchedAt of [
      '2026-02-29T12:00:00Z',
      '2026-04-31T12:00:00Z',
      '2026-13-01T12:00:00Z',
      '2026-00-01T12:00:00Z',
    ]) {
      const gate = completeGate({
        collected: [collectedEvidence('FLIGHTS', '200.00', '250.00', { sourceFetchedAt })],
      });
      expect(evaluateAffordabilityEvidenceGate(gate).evaluation.budgetFit).toBe('NOT_EVALUATED');
    }

    const leapDay = completeGate({
      collected: [
        collectedEvidence('FLIGHTS', '200.00', '250.00', {
          sourceFetchedAt: '2024-02-29T12:00:00Z',
        }),
      ],
    });
    expect(evaluateAffordabilityEvidenceGate(leapDay).evaluation.budgetFit).toBe('COMFORTABLE');
  });

  it('blocks future-dated market evidence without confirming affordability', () => {
    const future = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const gate = completeGate({
      collected: [
        collectedEvidence('FLIGHTS', '200.00', '250.00', {
          sourceFetchedAt: future,
        }),
      ],
    });

    expect(evaluateAffordabilityEvidenceGate(gate).evaluation).toMatchObject({
      budgetFit: 'NOT_EVALUATED',
      rankingEligible: false,
      affordabilityConfirmed: false,
      evidenceReady: false,
      evaluationPolicy: { status: 'BLOCKED', reason: 'INVALID_COMPLETE_EVIDENCE' },
    });
  });

  it('rejects invalid source clock times without normalizing into another day', () => {
    for (const sourceFetchedAt of [
      '2026-09-06T24:00:00Z',
      '2026-09-06T25:00:00Z',
      '2026-09-06T12:60:00Z',
      '2026-09-06T12:00:60Z',
    ]) {
      const gate = completeGate({
        collected: [collectedEvidence('FLIGHTS', '200.00', '250.00', { sourceFetchedAt })],
      });
      expect(evaluateAffordabilityEvidenceGate(gate).evaluation.budgetFit).toBe('NOT_EVALUATED');
    }

    const valid = completeGate({
      collected: [
        collectedEvidence('FLIGHTS', '200.00', '250.00', {
          sourceFetchedAt: '2026-09-06T23:59:59Z',
        }),
      ],
    });
    expect(evaluateAffordabilityEvidenceGate(valid).evaluation.budgetFit).toBe('COMFORTABLE');
  });

  it.each(['UNKNOWN_COST', 'constructor', '__proto__'])(
    'blocks unsupported completed pricing category %s',
    (category) => {
      const gate = completeGate({
        collected: [collectedEvidence(category, '200.00', '250.00')],
      });
      const evaluated = evaluateAffordabilityEvidenceGate(gate);
      expect(evaluated.evaluation).toMatchObject({
        budgetFit: 'NOT_EVALUATED',
        affordabilityConfirmed: false,
        evidenceReady: false,
        evaluationPolicy: { status: 'BLOCKED', reason: 'INVALID_COMPLETE_EVIDENCE' },
      });
    },
  );

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

  it('blocks oversized monetary strings before affordability integer conversion', () => {
    const oversized = `${'9'.repeat(100_000)}.00`;
    const flight = collectedEvidence('FLIGHTS', '200.00', '250.00');

    const invalidBudget = completeGate({
      spendableBudget: oversized,
      collected: [flight],
    });
    expect(evaluateAffordabilityEvidenceGate(invalidBudget).evaluation.budgetFit).toBe(
      'NOT_EVALUATED',
    );

    const invalidPrice = completeGate({
      collected: [collectedEvidence('FLIGHTS', '200.00', oversized)],
    });
    expect(evaluateAffordabilityEvidenceGate(invalidPrice).evaluation.budgetFit).toBe(
      'NOT_EVALUATED',
    );
  });

  it('keeps affordability evidence exact at the maximum supported cent amount', () => {
    const amount = '90071992547409.91';
    const gate = completeGate({
      spendableBudget: amount,
      totalBudget: amount,
      reserveAmount: '0.00',
      reservePercent: '0.00',
      collected: [collectedEvidence('FLIGHTS', amount, amount)],
    });

    const evaluated = evaluateAffordabilityEvidenceGate(gate);
    expect(evaluated.evaluation.budgetFit).toBe('COMFORTABLE');
    expect(evaluated.evaluation.evaluationPolicy.totalEvidenceRange).toEqual({
      amountMin: amount,
      amountMax: amount,
    });

    const tooLarge = '90071992547409.92';
    const invalidBudget = completeGate({
      spendableBudget: tooLarge,
      collected: [collectedEvidence('FLIGHTS', amount, amount)],
    });
    expect(evaluateAffordabilityEvidenceGate(invalidBudget).evaluation.budgetFit).toBe(
      'NOT_EVALUATED',
    );

    const invalidEvidence = completeGate({
      spendableBudget: amount,
      totalBudget: amount,
      reserveAmount: '0.00',
      reservePercent: '0.00',
      collected: [collectedEvidence('FLIGHTS', amount, tooLarge)],
    });
    expect(evaluateAffordabilityEvidenceGate(invalidEvidence).evaluation.budgetFit).toBe(
      'NOT_EVALUATED',
    );
  });
});
