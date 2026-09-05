import { createMapsProvider } from '../../integrations/maps/maps-provider.factory.js';
import { createMapsController } from './maps.controller.js';
import { mapsSchemas } from './maps.schema.js';
import { createMapsService } from './maps.service.js';

export async function mapsRoutes(app, options = {}) {
  const provider = options.provider ?? createMapsProvider();
  const service = createMapsService(provider);
  const controller = createMapsController(service);

  app.get('/route', { schema: mapsSchemas.route, handler: controller.route });
}
