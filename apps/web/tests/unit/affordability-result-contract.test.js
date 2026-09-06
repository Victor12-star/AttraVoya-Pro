import { describe, expect, it } from 'vitest';

import { isSafeAffordabilityEvaluation } from '../../src/features/planner/affordability-result-contract.js';
import {
  AFFORDABILITY_RESULT_LOCALES,
  getAffordabilityResultCopy,
} from '../../src/features/planner/affordability-result-copy.js';

const CATEGORIES = [
  'FLIGHTS',
  'ACCOMMODATION',
  'FOOD',
  'LOCAL_TRANSPORT',
  'ACTIVITIES',
  'CHILDREN_ACTIVITIES',
  'AIRPORT_TRANSFER',
  'TRAVEL_INSURANCE',
];

function completeEvidence() {
  return {
    status: 'COMPLETE_EVIDENCE',
    required: CATEGORIES.map((category) => ({
      category,
      targetAmount: '100.00',
      targetBasis: 'PLANNING_TARGET',
      status: 'COLLECTED',
    })),
    collected: CATEGORIES.map((category, index) => ({
      category,
      amountScope: 'PLANNER_CATEGORY_TOTAL',
      amountMin: index === 0 ? '180.00' : '80.00',
      amountMax: index === 0 ? '220.00' : '90.00',
      currencyCode: 'EUR',
      pricingBasis: index % 2 === 0 ? 'VERIFIED_PRICE' : 'LIVE',
      confidence: 'HIGH',
      sourceProvider: `provider-${category.toLowerCase()}`,
      sourceExternalId: `external-${index}`,
      sourceFetchedAt: '2026-09-06T16:00:00.000Z',
      verifiedMarketEvidence: true,
    })),
    missingCategories: [],
  };
}

function evaluation(budgetFit, overrides = {}) {
  return {
    budgetFit,
    rankingEligible: false,
    affordabilityConfirmed: budgetFit === 'COMFORTABLE',
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
        amountMin: '740.00',
        amountMax: '850.00',
      },
    },
    ...overrides,
  };
}

describe('affordability result contract', () => {
  it('provides result copy for all 18 supported UI locales', () => {
    expect(AFFORDABILITY_RESULT_LOCALES).toHaveLength(18);
    for (const locale of AFFORDABILITY_RESULT_LOCALES) {
      const copy = getAffordabilityResultCopy(locale);
      expect(copy.statuses.COMFORTABLE).toBeTruthy();
      expect(copy.statuses.TIGHT).toBeTruthy();
      expect(copy.statuses.OVER_BUDGET).toBeTruthy();
      expect(copy.totalRange).toBeTruthy();
      expect(copy.spendableBudget).toBeTruthy();
      expect(copy.boundary).toBeTruthy();
    }
  });

  it('accepts a mathematically consistent comfortable result', () => {
    expect(isSafeAffordabilityEvaluation(completeEvidence(), evaluation('COMFORTABLE'))).toBe(
      true,
    );
  });

  it('accepts a mathematically consistent tight result', () => {
    expect(
      isSafeAffordabilityEvaluation(
        completeEvidence(),
        evaluation('TIGHT', {
          affordabilityConfirmed: false,
          evaluationPolicy: {
            ...evaluation('COMFORTABLE').evaluationPolicy,
            totalEvidenceRange: { amountMin: '840.00', amountMax: '960.00' },
          },
        }),
      ),
    ).toBe(true);
  });

  it('accepts a mathematically consistent over-budget result', () => {
    expect(
      isSafeAffordabilityEvaluation(
        completeEvidence(),
        evaluation('OVER_BUDGET', {
          affordabilityConfirmed: false,
          evaluationPolicy: {
            ...evaluation('COMFORTABLE').evaluationPolicy,
            totalEvidenceRange: { amountMin: '910.00', amountMax: '1010.00' },
          },
        }),
      ),
    ).toBe(true);
  });

  it('keeps incomplete evidence safely not evaluated', () => {
    expect(
      isSafeAffordabilityEvaluation(
        {
          status: 'INSUFFICIENT_EVIDENCE',
          required: [],
          collected: [],
          missingCategories: ['FLIGHTS'],
        },
        {
          budgetFit: 'NOT_EVALUATED',
          rankingEligible: false,
          affordabilityConfirmed: false,
          evidenceReady: false,
        },
      ),
    ).toBe(true);
  });

  it('rejects invented statuses, ranking unlocks, and inconsistent arithmetic', () => {
    expect(
      isSafeAffordabilityEvaluation(completeEvidence(), {
        ...evaluation('COMFORTABLE'),
        budgetFit: 'AFFORDABLE',
      }),
    ).toBe(false);
    expect(
      isSafeAffordabilityEvaluation(completeEvidence(), {
        ...evaluation('COMFORTABLE'),
        rankingEligible: true,
      }),
    ).toBe(false);
    expect(
      isSafeAffordabilityEvaluation(
        completeEvidence(),
        evaluation('COMFORTABLE', {
          evaluationPolicy: {
            ...evaluation('COMFORTABLE').evaluationPolicy,
            totalEvidenceRange: { amountMin: '840.00', amountMax: '960.00' },
          },
        }),
      ),
    ).toBe(false);
  });

  it('rejects currency or evidence-category tampering', () => {
    const wrongCurrency = completeEvidence();
    wrongCurrency.collected[0].currencyCode = 'USD';
    expect(isSafeAffordabilityEvaluation(wrongCurrency, evaluation('COMFORTABLE'))).toBe(false);

    const duplicateCategory = completeEvidence();
    duplicateCategory.collected[1].category = duplicateCategory.collected[0].category;
    expect(isSafeAffordabilityEvaluation(duplicateCategory, evaluation('COMFORTABLE'))).toBe(false);
  });
});
