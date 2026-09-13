import { env } from './config/env.js';
import { resolveSupportedReplicaTopology } from './config/replica-topology.js';
import { buildApp } from './app.js';
import { createReadinessState } from './lifecycle/readiness-state.js';
import { registerDatabaseLifecycle } from './plugins/database.js';
import { createShutdownHandler } from './shutdown.js';

const replicaTopology = resolveSupportedReplicaTopology({
  nodeEnv: env.NODE_ENV,
  replicaCount: process.env.API_REPLICA_COUNT,
  metricsAggregationMode: process.env.METRICS_AGGREGATION_MODE,
  metricsInstanceId: process.env.METRICS_INSTANCE_ID,
});
const { replicaCount } = replicaTopology;

const readinessState = createReadinessState();
const app = await buildApp({ readinessState, replicaCount, replicaTopology });
registerDatabaseLifecycle(app);

const shutdown = createShutdownHandler({
  app,
  readinessState,
  gracePeriodMs: env.SHUTDOWN_GRACE_MS,
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.once(signal, () => {
    void shutdown(signal);
  });
}

try {
  const address = await app.listen({
    host: env.API_HOST,
    port: env.API_PORT,
  });

  app.log.info(
    {
      address,
      replicaCount,
      metricsAggregationMode: replicaTopology.metrics.aggregationMode,
      metricsInstanceId: replicaTopology.metrics.instanceId,
    },
    'AttraVoya Pro API started',
  );
} catch (error) {
  app.log.fatal({ err: error }, 'AttraVoya Pro API failed to start');
  process.exit(1);
}
