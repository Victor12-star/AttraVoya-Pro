import { describe, expect, it } from 'vitest';

import { compareVerifiedHolidayRanges } from './verified-holiday-comparison.js';

function example(id, min, max, options = {}) {
  return {
    destinationId: id,
    comparisonKey: options.key ?? 'one-adult-seven-nights-2026-11-05',
    evidence: {
      status: 'COMPLETE_EVIDENCE',
      required: [{ category: 'ACCOMMODATION' }, { category: 'FOOD' }],
    },
    evaluation: {
      evidenceReady: true,
      evaluationPolicy: {
        status: 'EVALUATED',
        currencyCode: options.currency ?? 'EUR',
        spendableBudget: '1200.00',
        totalEvidenceRange: { amountMin: min, amountMax: max },
      },
    },
  };
}

describe('Verified holiday comparison', () => {
  it('orders comparable evidence by conservative highest total cost', () => {
    const result = compareVerifiedHolidayRanges([
      example('expensive', '850.00', '1050.00'),
      example('affordable', '500.00', '700.00'),
      example('middle', '600.00', '900.00'),
    ]);
    expect(result.ranked.map((x) => x.destinationId)).toEqual([
      'affordable',
      'middle',
      'expensive',
    ]);
    expect(result.ordering).toBe('LOWEST_VERIFIED_UPPER_BOUND_FIRST');
  });

  it('does not rank missing, unevaluated or mismatched currency and trip basis', () => {
    const results = compareVerifiedHolidayRanges([
      example('eligible', '500.00', '700.00'),
      { destinationId: 'missing', comparisonKey: 'same' },
      example('other-currency', '100.00', '200.00', { currency: 'SEK' }),
      example('other-party', '100.00', '200.00', { key: 'two-adults' }),
    ]);
    expect(results.ranked.map((x) => x.destinationId)).toEqual(['eligible']);
    expect(results.unranked).toHaveLength(3);
  });

  it('does not misrepresent a single qualified holiday as a comparative ranking', () => {
    const result = compareVerifiedHolidayRanges([example('rome', '500.00', '900.00')]);
    expect(result.rankingApplied).toBe(false);
    expect(result.priceDataAvailable).toBe(true);
    expect(result.disclaimer).toContain('not bookings');
  });

  it('returns no ranking for empty evidence', () => {
    const result = compareVerifiedHolidayRanges([]);
    expect(result.ranked).toEqual([]);
    expect(result.priceDataAvailable).toBe(false);
    expect(result.rankingApplied).toBe(false);
  });
});
