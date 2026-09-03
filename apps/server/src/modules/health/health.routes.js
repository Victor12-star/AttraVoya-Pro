import { createHealthController } from './health.controller.js';
import { createHealthRepository } from './health.repository.js';
import { createHealthService } from './health.service.js';

export async function healthRoutes(app, options = {}) {
  const repository = options.repository ?? createHealthRepository();
  const service = createHealthService(repository);
  const controller = createHealthController(service);

  // Liveness verifies the Node process can answer requests. Readiness also
  // verifies PostgreSQL, which is what an orchestrator should use before
  // sending real application traffic to this instance.
  app.get('/live', controller.liveness);
  app.get('/ready', controller.readiness);
}
