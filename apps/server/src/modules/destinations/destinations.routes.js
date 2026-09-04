import { createImageProvider } from '../../integrations/images/image-provider.factory.js';
import { createPlacesProvider } from '../../integrations/places/places-provider.factory.js';
import { createWeatherProvider } from '../../integrations/weather/weather-provider.factory.js';
import { createDestinationOverviewService } from './destination-overview.service.js';
import { createDestinationsController } from './destinations.controller.js';
import { destinationsSchemas } from './destinations.schema.js';
import { createDestinationsService } from './destinations.service.js';

export async function destinationsRoutes(app, options = {}) {
  const placesProvider = options.provider ?? createPlacesProvider();
  const weatherProvider = options.weatherProvider ?? createWeatherProvider();
  const imageProvider = options.imageProvider ?? createImageProvider();

  const service = createDestinationsService(placesProvider);
  const overviewService = createDestinationOverviewService({
    placesProvider,
    weatherProvider,
    imageProvider,
  });
  const controller = createDestinationsController(service, overviewService);

  app.get('/search', {
    schema: destinationsSchemas.search,
    handler: controller.search,
  });

  app.get('/overview', {
    schema: destinationsSchemas.overview,
    handler: controller.overview,
  });
}
