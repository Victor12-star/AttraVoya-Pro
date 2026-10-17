import { describe, expect, it } from 'vitest';

import { buildBudgetEnvelope } from './budget-allocation.js';

describe('budget allocation exact arithmetic', () => {
  it('accepts the maximum safe cent amount and rejects one cent more', () => {
    const record = {
      id: 'maximum-budget',
      budgetAmount: '90071992547409.91',
      safetyReservePercent: '0',
      childrenAges: [],
      budgetCurrency: { code: 'SEK' },
    };

    const result = buildBudgetEnvelope(record);
    expect(result.totalBudget).toBe('90071992547409.91');
    expect(result.spendableBudget).toBe('90071992547409.91');

    const invalidRecord = { ...record, budgetAmount: '90071992547409.92' };
    expect(() => buildBudgetEnvelope(invalidRecord)).toThrow(RangeError);
  });

  it('rejects oversized budget and reserve inputs before BigInt parsing', () => {
    const record = {
      id: 'oversized-budget',
      budgetAmount: '1000.00',
      safetyReservePercent: '10.00',
      childrenAges: [],
      budgetCurrency: { code: 'EUR' },
    };
    const oversized = '9'.repeat(100_000);

    expect(() => buildBudgetEnvelope({ ...record, budgetAmount: oversized })).toThrow(
      'Budget amount must be a non-negative decimal value.',
    );
    expect(() => buildBudgetEnvelope({ ...record, safetyReservePercent: oversized })).toThrow(
      'Safety reserve percent must be a non-negative decimal value.',
    );
  });

  it('rejects fractional budget and reserve amounts beyond supported precision', () => {
    const record = {
      id: 'precision-budget',
      budgetAmount: '1000.00',
      safetyReservePercent: '10.00',
      childrenAges: [],
      budgetCurrency: { code: 'EUR' },
    };

    for (const budgetAmount of ['1000.001', '1000.005', '1000.000']) {
      expect(() => buildBudgetEnvelope({ ...record, budgetAmount })).toThrow(
        'Budget amount cannot have more than 2 decimal places.',
      );
    }
    for (const safetyReservePercent of ['10.001', '10.005', '10.000']) {
      expect(() => buildBudgetEnvelope({ ...record, safetyReservePercent })).toThrow(
        'Safety reserve percent cannot have more than 2 decimal places.',
      );
    }

    const valid = buildBudgetEnvelope({
      ...record,
      budgetAmount: '1000.01',
      safetyReservePercent: '10.01',
    });
    expect(valid.totalBudget).toBe('1000.01');
    expect(valid.safetyReserve.percentOfTotal).toBe('10.01');
  });

  it.each(['', 'eur', 'EURO', 'E1R', 'EUR ', '__proto__', null, undefined])(
    'rejects malformed budget currency code %s',
    (code) => {
      const record = {
        id: 'currency-budget',
        budgetAmount: '1000.00',
        safetyReservePercent: '10.00',
        childrenAges: [],
        budgetCurrency: { code },
      };

      expect(() => buildBudgetEnvelope(record)).toThrow('Budget currency code is invalid.');
    },
  );

  it('preserves cents at large supported budgets without floating-point drift', () => {
    const record = {
      id: 'large-budget',
      budgetAmount: '1000000000000.01',
      safetyReservePercent: '7.50',
      childrenAges: [8],
      budgetCurrency: { code: 'SEK' },
    };

    const result = buildBudgetEnvelope(record);
    const asCents = (amount) => BigInt(amount.replace('.', ''));

    const total = asCents(result.totalBudget);
    const reserve = asCents(result.safetyReserve.amount);
    const spendable = asCents(result.spendableBudget);
    const allocated = result.targets.reduce((sum, target) => sum + asCents(target.amount), 0n);

    expect(total).toBe(100000000000001n);
    expect(reserve).toBe((total * 750n + 5000n) / 10000n);
    expect(spendable + reserve).toBe(total);
    expect(allocated).toBe(spendable);
    expect(result.provenance.liveDataUsed).toBe(false);
  });
});
