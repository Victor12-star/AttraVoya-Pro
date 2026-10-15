import { describe, expect, it } from 'vitest';

import { buildBudgetEnvelope } from './budget-allocation.js';

describe('budget allocation exact arithmetic', () => {
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
