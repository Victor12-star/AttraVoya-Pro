import {
  PROVIDER_DISCOVERY_RATE_LIMIT,
  PROVIDER_SEARCH_RATE_LIMIT,
} from '../../config/constants.js';
import { createPlacesProvider } from '../../integrations/places/places-provider.factory.js';
import { createPlacesController } from './places.controller.js';
import { placesSchemas } from './places.schema.js';
import { createPlacesService } from './places.service.js';
import { searchOriginCities } from './origin-city-search.js';

export async function placesRoutes(app, options = {}) {
  const provider = options.provider ?? createPlacesProvider();
  const service = createPlacesService(provider);
  const controller = createPlacesController(service);

  app.get('/autocomplete', {
    schema: placesSchemas.autocomplete,
    config: { rateLimit: PROVIDER_SEARCH_RATE_LIMIT },
    handler: controller.autocomplete,
  });
  app.get('/origin-cities', {
    schema: placesSchemas.autocomplete,
    config: { rateLimit: PROVIDER_SEARCH_RATE_LIMIT },
    async handler(request, reply) {
      const results = await searchOriginCities(request.query);
      reply.header('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
      return reply.send({ places: { provider: 'open-meteo-geocoding', results } });
    },
  });
  app.get('/nearby', {
    schema: placesSchemas.nearby,
    config: { rateLimit: PROVIDER_DISCOVERY_RATE_LIMIT },
    handler: controller.nearby,
  });
}
