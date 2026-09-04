import { createPlacesProvider } from '../../integrations/places/places-provider.factory.js';
import { createPlacesController } from './places.controller.js';
import { placesSchemas } from './places.schema.js';
import { createPlacesService } from './places.service.js';

export async function placesRoutes(app, options = {}) {
  const provider = options.provider ?? createPlacesProvider();
  const service = createPlacesService(provider);
  const controller = createPlacesController(service);

  app.get('/autocomplete', {
    schema: placesSchemas.autocomplete,
    handler: controller.autocomplete,
  });
  app.get('/nearby', { schema: placesSchemas.nearby, handler: controller.nearby });
}
