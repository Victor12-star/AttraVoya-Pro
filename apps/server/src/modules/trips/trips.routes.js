import { createTripsController } from './trips.controller.js';
import { createTripsRepository } from './trips.repository.js';
import { tripsSchemas } from './trips.schema.js';
import { createTripsService } from './trips.service.js';

export async function tripsRoutes(app, options = {}) {
  const repository = options.repository ?? createTripsRepository();
  const service = createTripsService(repository, { now: options.now });
  const controller = createTripsController(service);
  const protectedApp = /** @type {any} */ (app);
  const authenticated = { onRequest: [protectedApp.authenticate] };

  // Saved trips contain private travel dates and destination intent. Companion
  // context is therefore owner-scoped and never cached by shared intermediaries.
  app.get(
    '/companion-context',
    { ...authenticated, schema: tripsSchemas.companionContext },
    controller.getCompanionContext,
  );
}
