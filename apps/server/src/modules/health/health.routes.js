import { HEALTH_PROBE_RATE_LIMIT } from '../../config/constants.js';
import { createHealthController } from './health.controller.js';
import { createHealthRepository } from './health.repository.js';
import { createHealthService } from './health.service.js';

export async function healthRoutes(app, options = {}) {
  const repository = options.repository ?? createHealthRepository();
  const service = createHealthService(repository, {
    readinessState: options.readinessState,
  });
  const controller = createHealthController(service);

  // Liveness verifies the Node process can answer requests. Readiness also
  // verifies PostgreSQL and refuses new traffic once graceful draining starts,
  // which is what an orchestrator should use before routing application work.
  // Give both probes their own bounded rate budget so ordinary overload cannot
  // make a healthy instance look dead while still preventing unbounded probing.
  app.get(
    '/live',
    { config: { rateLimit: HEALTH_PROBE_RATE_LIMIT } },
    controller.liveness,
  );
  app.get(
    '/ready',
    { config: { rateLimit: HEALTH_PROBE_RATE_LIMIT } },
    controller.readiness,
  );
}
