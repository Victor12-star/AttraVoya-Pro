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

  it('rejects an inherited currency code instead of trusting the prototype', () => {
    const record = {
      id: 'inherited-currency',
      budgetAmount: '1000.00',
      safetyReservePercent: '10.00',
      childrenAges: [],
      budgetCurrency: Object.create({ code: 'EUR' }),
    };

    expect(() => buildBudgetEnvelope(record)).toThrow('Budget currency code is invalid.');
    const valid = buildBudgetEnvelope({ ...record, budgetCurrency: { code: 'EUR' } });
    expect(valid.currencyCode).toBe('EUR');
  });

  it('uses the validated currency code without reading a mutable getter twice', () => {
    let reads = 0;
    const budgetCurrency = {
      get code() {
        reads += 1;
        return reads === 1 ? 'EUR' : 'USD';
      },
    };
    const record = {
      id: 'stable-currency',
      budgetAmount: '1000.00',
      safetyReservePercent: '10.00',
      childrenAges: [],
      budgetCurrency,
    };

    const result = buildBudgetEnvelope(record);
    expect(result.currencyCode).toBe('EUR');
    expect(reads).toBe(1);
  });

  it('validates one stable budget currency object when the record accessor changes', () => {
    let reads = 0;
    const record = {
      id: 'mutable-currency-object',
      budgetAmount: '1000.00',
      safetyReservePercent: '10.00',
      childrenAges: [],
      get budgetCurrency() {
        reads += 1;
        return reads === 1 ? { code: 'EUR' } : { code: 'USD' };
      },
    };

    const result = buildBudgetEnvelope(record);
    expect(result.currencyCode).toBe('EUR');
    expect(reads).toBe(1);
  });

  it('rejects coerced and nonfinite budget inputs before decimal parsing', () => {
    const record = {
      id: 'coerced-budget',
      budgetAmount: '1000.00',
      safetyReservePercent: '10.00',
      childrenAges: [],
      budgetCurrency: { code: 'EUR' },
    };
    const invalid = [{ toString: () => '1000.00' }, ['1000.00'], NaN, Infinity, -Infinity];

    for (const value of invalid) {
      expect(() => buildBudgetEnvelope({ ...record, budgetAmount: value })).toThrow(
        'Budget amount must be a non-negative decimal value.',
      );
      expect(() => buildBudgetEnvelope({ ...record, safetyReservePercent: value })).toThrow(
        'Safety reserve percent must be a non-negative decimal value.',
      );
    }

    expect(buildBudgetEnvelope({ ...record, budgetAmount: 1000 }).totalBudget).toBe('1000.00');
  });

  it.each(['budgetAmount', 'safetyReservePercent'])(
    'rejects inherited %s instead of using prototype financial input',
    (field) => {
      const record = {
        id: 'prototype-budget',
        budgetAmount: '1000.00',
        safetyReservePercent: '10.00',
        childrenAges: [],
        budgetCurrency: { code: 'EUR' },
      };
      const inherited = Object.create({ [field]: record[field] });
      Object.assign(inherited, { ...record });
      delete inherited[field];

      expect(() => buildBudgetEnvelope(inherited)).toThrow(
        'Budget amount and safety reserve percent must be explicit inputs.',
      );
      expect(buildBudgetEnvelope(record).totalBudget).toBe('1000.00');
    },
  );

  it('reads each financial input once before calculating the budget envelope', () => {
    const reads = { budgetAmount: 0, safetyReservePercent: 0 };
    const record = {
      id: 'stable-inputs',
      budgetCurrency: { code: 'EUR' },
      childrenAges: [],
      get budgetAmount() {
        reads.budgetAmount += 1;
        return reads.budgetAmount === 1 ? '1000.00' : '2000.00';
      },
      get safetyReservePercent() {
        reads.safetyReservePercent += 1;
        return reads.safetyReservePercent === 1 ? '10.00' : '20.00';
      },
    };

    const result = buildBudgetEnvelope(record);
    expect(result.totalBudget).toBe('1000.00');
    expect(result.safetyReserve.percentOfTotal).toBe('10.00');
    expect(result.safetyReserve.amount).toBe('100.00');
    expect(reads).toEqual({ budgetAmount: 1, safetyReservePercent: 1 });
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
