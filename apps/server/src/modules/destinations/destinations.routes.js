import { createPlacesProvider } from '../../integrations/places/places-provider.factory.js';
import { createDestinationsController } from './destinations.controller.js';
import { destinationsSchemas } from './destinations.schema.js';
import { createDestinationsService } from './destinations.service.js';

export async function destinationsRoutes(app, options = {}) {
  const provider = options.provider ?? createPlacesProvider();
  const service = createDestinationsService(provider);
  const controller = createDestinationsController(service);

  app.get('/search', {
    schema: destinationsSchemas.search,
    handler: controller.search,
  });
}
