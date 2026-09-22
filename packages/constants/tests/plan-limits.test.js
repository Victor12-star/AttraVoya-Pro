import { describe, expect, it } from 'vitest';

import { PLAN_LIMITS, PLANS, PRO_PLAN_KEYS, getPlanLimit } from '../src/plan-limits.js';

describe('commercial plan contract', () => {
  it('defines monthly and yearly Pro plans with the same product limits', () => {
    expect(PRO_PLAN_KEYS).toEqual([PLANS.PRO_MONTHLY, PLANS.PRO_YEARLY]);
    expect(PLAN_LIMITS[PLANS.PRO_MONTHLY]).toEqual(PLAN_LIMITS[PLANS.PRO_YEARLY]);
    expect(getPlanLimit(PLANS.PRO_MONTHLY, 'MAX_TRIPS')).toBeNull();
    expect(getPlanLimit(PLANS.PRO_YEARLY, 'MAX_TRIPS')).toBeNull();
  });

  it('keeps Free useful and fails the legacy Premium key closed', () => {
    expect(getPlanLimit(PLANS.FREE, 'MAX_TRIPS')).toBe(1);
    expect(getPlanLimit(PLANS.FREE, 'MAX_FAVORITES')).toBe(10);
    expect(PLAN_LIMITS[PLANS.PREMIUM]).toEqual(PLAN_LIMITS[PLANS.FREE]);
    expect(PRO_PLAN_KEYS).not.toContain(PLANS.PREMIUM);
  });
});
