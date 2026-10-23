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

function availabilityStatusFor(observedRatio) {
  if (observedRatio === null) return 'INSUFFICIENT_DATA';
  if (observedRatio >= PRODUCTION_SLO.availabilityTargetRatio) return 'MEETS_TARGET';
  return 'BREACH';
}

function latencyStatusFor(sampleCount, p95Ms) {
  if (sampleCount === 0) return 'INSUFFICIENT_DATA';
  if (p95Ms < PRODUCTION_SLO.nonProviderP95TargetMs) return 'MEETS_TARGET';
  return 'BREACH';
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

  const availabilityStatus = availabilityStatusFor(availabilityObservedRatio);
  const latencyStatus = latencyStatusFor(nonProviderSamples, nonProviderP95Ms);

  const fullProductionWindow = observationWindowSeconds >= PRODUCTION_SLO.rollingWindowSeconds;

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
