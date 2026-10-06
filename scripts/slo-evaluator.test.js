import assert from 'node:assert/strict';
import test from 'node:test';

import { evaluateSloSnapshot, PRODUCTION_SLO } from './slo-evaluator.js';

function snapshot(overrides = {}) {
  return {
    observationWindowSeconds: PRODUCTION_SLO.rollingWindowSeconds,
    userRequests: 100_000,
    serverErrors: 50,
    nonProviderLatency: {
      sampleCount: 20_000,
      p95Ms: 420,
    },
    ...overrides,
  };
}

test('evaluates a healthy full production window without claiming more than aggregate evidence', () => {
  const result = evaluateSloSnapshot(snapshot());

  assert.equal(result.scope, 'AGGREGATE_WINDOW_ONLY');
  assert.equal(result.productionClaimEligible, true);
  assert.equal(result.availability.status, 'MEETS_TARGET');
  assert.equal(result.availability.observedRatio, 0.9995);
  assert.equal(result.availability.serverErrorRate, 0.0005);
  assert.ok(Math.abs(result.availability.errorBudgetConsumedRatio - 0.5) < 1e-9);
  assert.equal(result.nonProviderLatency.status, 'MEETS_TARGET');
  assert.equal(result.nonProviderLatency.observedP95Ms, 420);
});

test('marks availability and latency breaches explicitly', () => {
  const result = evaluateSloSnapshot(
    snapshot({
      serverErrors: 200,
      nonProviderLatency: {
        sampleCount: 20_000,
        p95Ms: 500,
      },
    }),
  );

  assert.equal(result.availability.status, 'BREACH');
  assert.ok(result.availability.errorBudgetConsumedRatio > 1);
  assert.equal(result.nonProviderLatency.status, 'BREACH');
});

test('refuses to treat a short monitoring window as production-SLO evidence', () => {
  const result = evaluateSloSnapshot(
    snapshot({
      observationWindowSeconds: 60 * 60,
    }),
  );

  assert.equal(result.availability.status, 'MEETS_TARGET');
  assert.equal(result.nonProviderLatency.status, 'MEETS_TARGET');
  assert.equal(result.productionClaimEligible, false);
});

test('returns insufficient-data states without fabricating zero error or latency', () => {
  const result = evaluateSloSnapshot({
    observationWindowSeconds: PRODUCTION_SLO.rollingWindowSeconds,
    userRequests: 0,
    serverErrors: 0,
    nonProviderLatency: {
      sampleCount: 0,
      p95Ms: 0,
    },
  });

  assert.equal(result.productionClaimEligible, false);
  assert.equal(result.availability.status, 'INSUFFICIENT_DATA');
  assert.equal(result.availability.observedRatio, null);
  assert.equal(result.availability.serverErrorRate, null);
  assert.equal(result.availability.errorBudgetConsumedRatio, null);
  assert.equal(result.nonProviderLatency.status, 'INSUFFICIENT_DATA');
  assert.equal(result.nonProviderLatency.observedP95Ms, null);
});

test('rejects invalid aggregate counts instead of normalizing them silently', () => {
  assert.throws(
    () =>
      evaluateSloSnapshot(
        snapshot({
          userRequests: 10,
          serverErrors: 11,
        }),
      ),
    /serverErrors cannot exceed userRequests/,
  );

  assert.throws(
    () =>
      evaluateSloSnapshot(
        snapshot({
          nonProviderLatency: {
            sampleCount: -1,
            p95Ms: 100,
          },
        }),
      ),
    /nonProviderLatency.sampleCount/,
  );
});
