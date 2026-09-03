import { createAccommodationProvider } from '../../integrations/accommodation/accommodation-provider.factory.js';
import { createAccommodationController } from './accommodation.controller.js';
import { accommodationSchemas } from './accommodation.schema.js';
import { createAccommodationService } from './accommodation.service.js';

export async function accommodationRoutes(app, options = {}) {
  const provider = options.provider ?? createAccommodationProvider();
  const service = createAccommodationService(provider);
  const controller = createAccommodationController(service);

  app.get('/nearby', { schema: accommodationSchemas.nearby, handler: controller.nearby });
}
