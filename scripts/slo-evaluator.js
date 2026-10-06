import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

export const PRODUCTION_SLO = Object.freeze({
  availabilityTargetRatio: 0.999,
  nonProviderP95TargetMs: 500,
  rollingWindowSeconds: 30 * 24 * 60 * 60,
});

function requireFiniteNonNegative(value, name) {
  if (!Number.isFinite(value) || value < 0) {
    throw new TypeError(`${name} must be a finite non-negative number.`);
  }

  return value;
}

function requireIntegerNonNegative(value, name) {
  if (!Number.isInteger(value) || value < 0) {
    throw new TypeError(`${name} must be a non-negative integer.`);
  }

  return value;
}

export function evaluateSloSnapshot(snapshot) {
  const observationWindowSeconds = requireFiniteNonNegative(
    snapshot?.observationWindowSeconds,
    'observationWindowSeconds',
  );
  const userRequests = requireIntegerNonNegative(snapshot?.userRequests, 'userRequests');
  const serverErrors = requireIntegerNonNegative(snapshot?.serverErrors, 'serverErrors');
  const nonProviderSamples = requireIntegerNonNegative(
    snapshot?.nonProviderLatency?.sampleCount,
    'nonProviderLatency.sampleCount',
  );
  const nonProviderP95Ms = requireFiniteNonNegative(
    snapshot?.nonProviderLatency?.p95Ms,
    'nonProviderLatency.p95Ms',
  );

  if (serverErrors > userRequests) {
    throw new TypeError('serverErrors cannot exceed userRequests.');
  }

  const availabilityObservedRatio =
    userRequests === 0 ? null : (userRequests - serverErrors) / userRequests;
  const serverErrorRate = userRequests === 0 ? null : serverErrors / userRequests;
  const allowedErrorRate = 1 - PRODUCTION_SLO.availabilityTargetRatio;
  const errorBudgetConsumedRatio =
    serverErrorRate === null ? null : serverErrorRate / allowedErrorRate;

  const availabilityStatus =
    availabilityObservedRatio === null
      ? 'INSUFFICIENT_DATA'
      : availabilityObservedRatio >= PRODUCTION_SLO.availabilityTargetRatio
        ? 'MEETS_TARGET'
        : 'BREACH';

  const latencyStatus =
    nonProviderSamples === 0
      ? 'INSUFFICIENT_DATA'
      : nonProviderP95Ms < PRODUCTION_SLO.nonProviderP95TargetMs
        ? 'MEETS_TARGET'
        : 'BREACH';

  const fullProductionWindow =
    observationWindowSeconds >= PRODUCTION_SLO.rollingWindowSeconds;

  return Object.freeze({
    scope: 'AGGREGATE_WINDOW_ONLY',
    productionClaimEligible:
      fullProductionWindow &&
      availabilityStatus !== 'INSUFFICIENT_DATA' &&
      latencyStatus !== 'INSUFFICIENT_DATA',
    observationWindowSeconds,
    availability: Object.freeze({
      targetRatio: PRODUCTION_SLO.availabilityTargetRatio,
      observedRatio: availabilityObservedRatio,
      serverErrorRate,
      errorBudgetConsumedRatio,
      status: availabilityStatus,
    }),
    nonProviderLatency: Object.freeze({
      targetP95MsExclusive: PRODUCTION_SLO.nonProviderP95TargetMs,
      observedP95Ms: nonProviderSamples === 0 ? null : nonProviderP95Ms,
      sampleCount: nonProviderSamples,
      status: latencyStatus,
    }),
  });
}

async function runCli() {
  const inputPath = process.argv[2];
  if (!inputPath) {
    throw new Error('Usage: node scripts/slo-evaluator.js <aggregate-snapshot.json>');
  }

  const snapshot = JSON.parse(await readFile(inputPath, 'utf8'));
  const result = evaluateSloSnapshot(snapshot);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runCli().catch((error) => {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  });
}
