import { describe, expect, it } from 'vitest';

import { createApplicationErrorMetrics } from './application-error-metrics.js';

describe('application error metrics', () => {
  it('reports aggregate errors, 5xx rate, status classes and stable codes', () => {
    const metrics = createApplicationErrorMetrics();

    metrics.record({ code: 'VALIDATION_ERROR', statusCode: 400 });
    metrics.record({ code: 'INTERNAL_ERROR', statusCode: 500 });
    metrics.record({ code: 'INTERNAL_ERROR', statusCode: 503 });

    expect(metrics.snapshot()).toEqual({
      errors: 3,
      serverErrors: 2,
      serverErrorRate: 2 / 3,
      statusClasses: {
        '4xx': 1,
        '5xx': 2,
        other: 0,
      },
      codes: [
        { code: 'VALIDATION_ERROR', count: 1 },
        { code: 'INTERNAL_ERROR', count: 2 },
      ],
    });
  });

  it('bounds error-code cardinality with a fixed overflow bucket', () => {
    const metrics = createApplicationErrorMetrics({ maxCodes: 2 });

    metrics.record({ code: 'ONE', statusCode: 400 });
    metrics.record({ code: 'TWO', statusCode: 401 });
    metrics.record({ code: 'THREE', statusCode: 500 });
    metrics.record({ code: 'FOUR', statusCode: 503 });

    expect(metrics.snapshot().codes).toEqual([
      { code: 'ONE', count: 1 },
      { code: 'TWO', count: 1 },
      { code: '<overflow>', count: 2 },
    ]);
  });

  it('sanitizes invalid status and code values', () => {
    const metrics = createApplicationErrorMetrics();

    metrics.record({ code: '', statusCode: Number.NaN });

    expect(metrics.snapshot()).toMatchObject({
      errors: 1,
      serverErrors: 0,
      statusClasses: { '4xx': 0, '5xx': 0, other: 1 },
      codes: [{ code: 'UNKNOWN_ERROR', count: 1 }],
    });
    expect(() => createApplicationErrorMetrics({ maxCodes: 0 })).toThrow(
      'maxCodes must be a positive integer.',
    );
  });
});
