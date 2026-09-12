const MAX_DECLARED_API_REPLICAS = 100;

function parseReplicaCount(value) {
  if (value === undefined || value === null || String(value).trim() === '') return 1;

  const normalized = String(value).trim();
  if (!/^\d+$/.test(normalized)) {
    throw new Error(
      'Invalid AttraVoya Pro server environment:\nAPI_REPLICA_COUNT: use a whole number between 1 and 100.',
    );
  }

  const replicaCount = Number(normalized);
  if (
    !Number.isSafeInteger(replicaCount) ||
    replicaCount < 1 ||
    replicaCount > MAX_DECLARED_API_REPLICAS
  ) {
    throw new Error(
      'Invalid AttraVoya Pro server environment:\nAPI_REPLICA_COUNT: use a whole number between 1 and 100.',
    );
  }

  return replicaCount;
}

/**
 * Fail closed when production is declared as multi-replica before the controls
 * that remain intentionally process-local have a reviewed shared-state strategy.
 *
 * Provider request budgets are partitioned conservatively by the declared
 * topology. Provider response caches are also intentionally process-local, but
 * their contract allows only non-authoritative snapshots whose misses can be
 * refetched safely, so cache locality does not require replica coordination.
 * The remaining controls below still block production horizontal scaling.
 *
 * This is a deployment-safety contract, not a claim that one process is the
 * long-term scaling architecture. Remove or evolve the guard only together with
 * measured multi-replica evidence and shared coordination where correctness or
 * quota enforcement requires it.
 */
export function assertSupportedReplicaTopology({ nodeEnv, replicaCount }) {
  const declaredReplicaCount = parseReplicaCount(replicaCount);

  if (nodeEnv === 'production' && declaredReplicaCount > 1) {
    throw new Error(
      'Invalid AttraVoya Pro server environment:\nAPI_REPLICA_COUNT: production currently supports exactly 1 active API replica. Process-local rate limits, circuit state, and aggregate metrics are not yet a shared multi-replica contract.',
    );
  }

  return declaredReplicaCount;
}
