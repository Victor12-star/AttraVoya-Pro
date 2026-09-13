import { ROLES } from '@attravoya/constants';
import { getDatabasePoolMetrics } from '@attravoya/database';

import { providerCacheMetrics } from '../../observability/provider-cache-metrics.js';
import { providerMetrics } from '../../observability/provider-metrics.js';
import { runtimeMetrics } from '../../observability/runtime-metrics.js';

function requireSnapshotSource(source, name) {
  if (!source || typeof source.snapshot !== 'function') {
    throw new TypeError(`${name} must expose a snapshot function.`);
  }

  return source;
}

function requireDatabasePoolReader(reader) {
  if (typeof reader !== 'function') {
    throw new TypeError('Database pool metrics reader must be a function.');
  }

  return reader;
}

function requireMetricsTopology(topology) {
  const replicaCount = topology?.replicaCount;
  const aggregationMode = topology?.metrics?.aggregationMode;
  const instanceId = topology?.metrics?.instanceId;

  if (!Number.isInteger(replicaCount) || replicaCount < 1) {
    throw new TypeError('Metrics topology replicaCount must be a positive integer.');
  }
  if (!['process_local', 'external'].includes(aggregationMode)) {
    throw new TypeError('Metrics topology aggregationMode is invalid.');
  }
  if (typeof instanceId !== 'string' || instanceId.length < 1) {
    throw new TypeError('Metrics topology instanceId is required.');
  }

  return { replicaCount, aggregationMode, instanceId };
}

/**
 * Expose bounded, process-local operational telemetry to current administrators.
 * The underlying metric registries deliberately contain aggregate service data
 * only; no raw request URLs, query values, cache keys, SQL, credentials, trip
 * details, traveller data, or provider response payloads are included.
 */
export async function serviceMetricsRoutes(app, options = {}) {
  const protectedApp = /** @type {any} */ (app);
  const requestMetrics = requireSnapshotSource(
    options.requestMetrics ?? protectedApp.requestMetrics,
    'Request metrics',
  );
  const configuredProviderMetrics = requireSnapshotSource(
    options.providerMetrics ?? providerMetrics,
    'Provider metrics',
  );
  const configuredProviderCacheMetrics = requireSnapshotSource(
    options.providerCacheMetrics ?? providerCacheMetrics,
    'Provider cache metrics',
  );
  const configuredRuntimeMetrics = requireSnapshotSource(
    options.runtimeMetrics ?? runtimeMetrics,
    'Runtime metrics',
  );
  const readDatabasePoolMetrics = requireDatabasePoolReader(
    options.getDatabasePoolMetrics ?? getDatabasePoolMetrics,
  );
  const topology = requireMetricsTopology(
    options.topology ?? {
      replicaCount: 1,
      metrics: { aggregationMode: 'process_local', instanceId: 'single' },
    },
  );

  const adminOnly = {
    onRequest: [protectedApp.authenticate, protectedApp.authorize({ minimumRole: ROLES.ADMIN })],
  };

  app.get('/', adminOnly, async (_request, reply) => {
    // Operational snapshots are never shared or browser-cached. They describe
    // only this API process. In external mode the collector must scrape every
    // instance and aggregate snapshots instead of treating one response as cluster-wide.
    reply.header('Cache-Control', 'private, no-store');

    return {
      scope: 'PROCESS_LOCAL',
      topology: {
        instanceId: topology.instanceId,
        declaredReplicas: topology.replicaCount,
        aggregationMode: topology.aggregationMode.toUpperCase(),
      },
      http: requestMetrics.snapshot(),
      providers: configuredProviderMetrics.snapshot(),
      providerCache: configuredProviderCacheMetrics.snapshot(),
      runtime: configuredRuntimeMetrics.snapshot(),
      databasePool: readDatabasePoolMetrics(),
    };
  });
}
