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

    expect(() =>
      buildBudgetEnvelope({ ...record, budgetAmount: '90071992547409.92' }),
    ).toThrow(RangeError);
  });

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
