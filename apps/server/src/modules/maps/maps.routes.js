import { createMapsController } from './maps.controller.js';
import { mapsSchemas } from './maps.schema.js';
import { createMapsService } from './maps.service.js';

async function resolveProvider(provider) {
  if (provider) return provider;

  // Keep the production provider factory lazy so focused route tests can inject
  // a provider without loading the full server environment as a side effect.
  const { createMapsProvider } = await import('../../integrations/maps/maps-provider.factory.js');
  return createMapsProvider();
}

export async function mapsRoutes(app, options = {}) {
  const provider = await resolveProvider(options.provider);
  const service = createMapsService(provider);
  const controller = createMapsController(service);

  app.get('/route', { schema: mapsSchemas.route, handler: controller.route });
}
