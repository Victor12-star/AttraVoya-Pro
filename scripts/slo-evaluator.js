export const PRODUCTION_SLO = Object.freeze({
  availabilityTargetRatio: 0.999,
  nonProviderP95TargetMs: 500,
  rollingWindowSeconds: 30 * 24 * 60 * 60,
});

function count(value, name) {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new TypeError(`${name} must be a non-negative safe integer.`);
  }
  return value;
}

function measurement(value, name) {
  if (!Number.isFinite(value) || value < 0) {
    throw new TypeError(`${name} must be a non-negative finite number.`);
  }
  return value;
}

export function evaluateSloSnapshot(snapshot) {
  const windowSeconds = measurement(snapshot?.observationWindowSeconds, 'observationWindowSeconds');
  const requests = count(snapshot?.userRequests, 'userRequests');
  const errors = count(snapshot?.serverErrors, 'serverErrors');
  const samples = count(
    snapshot?.nonProviderLatency?.sampleCount,
    'nonProviderLatency.sampleCount',
  );
  const p95Ms = measurement(snapshot?.nonProviderLatency?.p95Ms, 'nonProviderLatency.p95Ms');

  if (errors > requests) throw new TypeError('serverErrors cannot exceed userRequests.');

  const observedRatio = requests === 0 ? null : (requests - errors) / requests;
  const errorBudgetConsumedRatio =
    requests === 0 ? null : (errors / requests) / (1 - PRODUCTION_SLO.availabilityTargetRatio);

  return {
    scope: 'AGGREGATE_WINDOW_ONLY',
    productionClaimEligible:
      windowSeconds >= PRODUCTION_SLO.rollingWindowSeconds && requests > 0 && samples > 0,
    observationWindowSeconds: windowSeconds,
    availability: {
      targetRatio: PRODUCTION_SLO.availabilityTargetRatio,
      observedRatio,
      errorBudgetConsumedRatio,
      status:
        observedRatio === null
          ? 'INSUFFICIENT_DATA'
          : observedRatio >= PRODUCTION_SLO.availabilityTargetRatio
            ? 'MEETS_TARGET'
            : 'BREACH',
    },
    nonProviderLatency: {
      targetP95MsExclusive: PRODUCTION_SLO.nonProviderP95TargetMs,
      observedP95Ms: samples === 0 ? null : p95Ms,
      sampleCount: samples,
      status:
        samples === 0
          ? 'INSUFFICIENT_DATA'
          : p95Ms < PRODUCTION_SLO.nonProviderP95TargetMs
            ? 'MEETS_TARGET'
            : 'BREACH',
    },
  };
}
