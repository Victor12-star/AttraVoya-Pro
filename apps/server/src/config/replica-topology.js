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
 * Provider request budgets and API rate limits are partitioned conservatively
 * by the declared topology with aligned fixed windows. Provider response caches
 * are intentionally local but may hold only non-authoritative snapshots whose
 * misses can be refetched safely. Provider circuit state is also intentionally
 * local defensive failure isolation: disagreement changes which replica attempts
 * a provider call, while deployment-wide request budgets bound aggregate attempts
 * and no authoritative application state depends on the circuit. The remaining
 * control below still blocks production horizontal scaling.
 *
 * This is a deployment-safety contract, not a claim that one process is the
 * long-term scaling architecture. Remove or evolve the guard only together with
 * measured multi-replica evidence and shared coordination where correctness or
 * operational visibility requires it.
 */
export function assertSupportedReplicaTopology({ nodeEnv, replicaCount }) {
  const declaredReplicaCount = parseReplicaCount(replicaCount);

  if (nodeEnv === 'production' && declaredReplicaCount > 1) {
    throw new Error(
      'Invalid AttraVoya Pro server environment:\nAPI_REPLICA_COUNT: production currently supports exactly 1 active API replica. Aggregate metrics do not yet provide a complete multi-replica operational view.',
    );
  }

  return declaredReplicaCount;
}
