import { createEntitlementsController } from './entitlements.controller.js';
import { createEntitlementsRepository } from './entitlements.repository.js';
import { entitlementsSchemas } from './entitlements.schema.js';
import { createEntitlementsService } from './entitlements.service.js';

export async function entitlementsRoutes(app, options = {}) {
  const repository = options.repository ?? createEntitlementsRepository();
  const service = createEntitlementsService(repository, { now: options.now });
  const controller = createEntitlementsController(service);
  const protectedApp = /** @type {any} */ (app);

  // Entitlements are private authorization state. Clients may use this response
  // to render features, but the server remains authoritative for every gated
  // operation and the response must never be shared-cacheable.
  app.get('/me', {
    onRequest: [protectedApp.authenticate],
    schema: entitlementsSchemas.currentAccess,
    handler: controller.getCurrentAccess,
  });
}
