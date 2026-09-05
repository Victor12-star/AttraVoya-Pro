import { createPlannerController } from './planner.controller.js';
import { createPlannerRepository } from './planner.repository.js';
import { plannerSchemas } from './planner.schema.js';
import { createPlannerService } from './planner.service.js';

export async function plannerRoutes(app, options = {}) {
  const repository = options.repository ?? createPlannerRepository();
  const service = createPlannerService(repository);
  const controller = createPlannerController(service);
  const protectedApp = /** @type {any} */ (app);
  const authenticated = { onRequest: [protectedApp.authenticate] };

  // Planner drafts contain private travel intent and budget information. Persisted
  // requests therefore require current authenticated account state, even though
  // public destination browsing remains available without an account.
  app.post(
    '/',
    { ...authenticated, schema: plannerSchemas.createRequest },
    controller.createRequest,
  );
  app.get('/', authenticated, controller.listRequests);
  app.get(
    '/:requestId/allocation',
    { ...authenticated, schema: plannerSchemas.getRequest },
    controller.getAllocation,
  );
  app.get(
    '/:requestId',
    { ...authenticated, schema: plannerSchemas.getRequest },
    controller.getRequest,
  );
}
