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
function parseMetricsAggregationMode(value) {
  if (value === undefined || value === null || String(value).trim() === '') {
    return 'process_local';
  }

  const mode = String(value).trim().toLowerCase();
  if (!['process_local', 'external'].includes(mode)) {
    throw new Error(
      "Invalid AttraVoya Pro server environment:\nMETRICS_AGGREGATION_MODE: use 'process_local' or 'external'.",
    );
  }
  return mode;
}

function parseMetricsInstanceId(value) {
  if (value === undefined || value === null || String(value).trim() === '') return null;

  const instanceId = String(value).trim();
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/.test(instanceId)) {
    throw new Error(
      'Invalid AttraVoya Pro server environment:\nMETRICS_INSTANCE_ID: use 1 to 64 letters, numbers, dots, underscores, or dashes, starting with a letter or number.',
    );
  }
  return instanceId;
}

/**
 * Resolve replica and observability topology once during startup.
 * Metrics remain bounded and process-local so recording adds no database or
 * network work to user requests. External monitoring aggregates replicas.
 *
 * @param {{
 *   nodeEnv: string,
 *   replicaCount?: string | number | null,
 *   metricsAggregationMode?: string | null,
 *   metricsInstanceId?: string | null,
 * }} options
 */
export function resolveSupportedReplicaTopology({
  nodeEnv,
  replicaCount,
  metricsAggregationMode,
  metricsInstanceId,
}) {
  const declaredReplicaCount = parseReplicaCount(replicaCount);
  const aggregationMode = parseMetricsAggregationMode(metricsAggregationMode);
  const configuredInstanceId = parseMetricsInstanceId(metricsInstanceId);

  if (aggregationMode === 'external' && !configuredInstanceId) {
    throw new Error(
      'Invalid AttraVoya Pro server environment:\nMETRICS_INSTANCE_ID: required when METRICS_AGGREGATION_MODE is external.',
    );
  }

  if (nodeEnv === 'production' && declaredReplicaCount > 1 && aggregationMode !== 'external') {
    throw new Error(
      "Invalid AttraVoya Pro server environment:\nMETRICS_AGGREGATION_MODE: production with multiple API replicas requires 'external'.",
    );
  }

  return Object.freeze({
    replicaCount: declaredReplicaCount,
    metrics: Object.freeze({
      aggregationMode,
      instanceId: configuredInstanceId ?? 'single',
    }),
  });
}

export function assertSupportedReplicaTopology(options) {
  return resolveSupportedReplicaTopology(options).replicaCount;
}
