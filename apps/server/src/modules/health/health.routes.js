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
  app.get('/live', controller.liveness);
  app.get('/ready', controller.readiness);
}
