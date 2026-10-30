import assert from 'node:assert/strict';
import test from 'node:test';

import { evaluateSloSnapshot, PRODUCTION_SLO } from './slo-evaluator.js';

function snapshot(overrides = {}) {
  return {
    observationWindowSeconds: PRODUCTION_SLO.rollingWindowSeconds,
    userRequests: 100000,
    serverErrors: 50,
    nonProviderLatency: { sampleCount: 20000, p95Ms: 420 },
    ...overrides,
  };
}

test('evaluates healthy aggregate evidence without claiming deployment health', () => {
  const result = evaluateSloSnapshot(snapshot());
  assert.equal(result.scope, 'AGGREGATE_WINDOW_ONLY');
  assert.equal(result.productionClaimEligible, true);
  assert.equal(result.productionTargetsMet, true);
  assert.equal(result.availability.status, 'MEETS_TARGET');
  assert.equal(result.nonProviderLatency.status, 'MEETS_TARGET');
  const consumed = result.availability.errorBudgetConsumedRatio;
  if (consumed === null) assert.fail('Expected a numeric error-budget ratio.');
  assert.ok(Math.abs(consumed - 0.5) < 1e-9);
});

test('identifies availability and latency failures', () => {
  const result = evaluateSloSnapshot(
    snapshot({ serverErrors: 200, nonProviderLatency: { sampleCount: 2, p95Ms: 500 } }),
  );
  assert.equal(result.productionClaimEligible, true);
  assert.equal(result.productionTargetsMet, false);
  assert.equal(result.availability.status, 'BREACH');
  assert.equal(result.nonProviderLatency.status, 'BREACH');
});

test('short window cannot justify production claims', () => {
  const result = evaluateSloSnapshot(snapshot({ observationWindowSeconds: 3600 }));
  assert.equal(result.productionClaimEligible, false);
  assert.equal(result.productionTargetsMet, false);
});

test('zero traffic or latency samples remain unknown', () => {
  const result = evaluateSloSnapshot(
    snapshot({
      userRequests: 0,
      serverErrors: 0,
      nonProviderLatency: { sampleCount: 0, p95Ms: 0 },
    }),
  );
  assert.equal(result.productionClaimEligible, false);
  assert.equal(result.availability.status, 'INSUFFICIENT_DATA');
  assert.equal(result.nonProviderLatency.status, 'INSUFFICIENT_DATA');
  assert.equal(result.productionTargetsMet, false);
  assert.equal(result.availability.observedRatio, null);
});

test('invalid or unsafe aggregate observations fail closed', () => {
  assert.throws(() => evaluateSloSnapshot(snapshot({ userRequests: 5, serverErrors: 6 })));
  assert.throws(() => evaluateSloSnapshot(snapshot({ userRequests: 1.5 })));
  assert.throws(() => evaluateSloSnapshot(snapshot({ observationWindowSeconds: -1 })));
  assert.throws(() =>
    evaluateSloSnapshot(snapshot({ nonProviderLatency: { sampleCount: -1, p95Ms: 400 } })),
  );
});

test('availability exactly at target passes while latency exactly at boundary fails', () => {
  const result = evaluateSloSnapshot(
    snapshot({ serverErrors: 100, nonProviderLatency: { sampleCount: 100, p95Ms: 500 } }),
  );
  assert.equal(result.availability.status, 'MEETS_TARGET');
  assert.equal(result.nonProviderLatency.status, 'BREACH');
  assert.equal(result.productionClaimEligible, true);
  assert.equal(result.productionTargetsMet, false);
});

test('full observation window boundary is eligible only with both evidence types', () => {
  const atBoundary = evaluateSloSnapshot(
    snapshot({ observationWindowSeconds: PRODUCTION_SLO.rollingWindowSeconds }),
  );
  assert.equal(atBoundary.productionClaimEligible, true);
  const belowBoundary = evaluateSloSnapshot(
    snapshot({ observationWindowSeconds: PRODUCTION_SLO.rollingWindowSeconds - 1 }),
  );
  assert.equal(belowBoundary.productionClaimEligible, false);
  assert.equal(belowBoundary.productionTargetsMet, false);
  const noLatencyEvidence = evaluateSloSnapshot(
    snapshot({ nonProviderLatency: { sampleCount: 0, p95Ms: 0 } }),
  );
  assert.equal(noLatencyEvidence.availability.status, 'MEETS_TARGET');
  assert.equal(noLatencyEvidence.nonProviderLatency.status, 'INSUFFICIENT_DATA');
  assert.equal(noLatencyEvidence.productionTargetsMet, false);
});

test('independent availability breach cannot be masked by fast latency', () => {
  const result = evaluateSloSnapshot(snapshot({ serverErrors: 101 }));
  assert.equal(result.availability.status, 'BREACH');
  assert.equal(result.nonProviderLatency.status, 'MEETS_TARGET');
  assert.equal(result.productionClaimEligible, true);
  assert.equal(result.productionTargetsMet, false);
});
