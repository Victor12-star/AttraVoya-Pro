import { createWeatherProvider } from '../../integrations/weather/weather-provider.factory.js';
import { createWeatherController } from './weather.controller.js';
import { weatherSchemas } from './weather.schema.js';
import { createWeatherService } from './weather.service.js';

export async function weatherRoutes(app, options = {}) {
  const provider = options.provider ?? createWeatherProvider();
  const service = createWeatherService(provider);
  const controller = createWeatherController(service);

  app.get('/', { schema: weatherSchemas.forecast, handler: controller.forecast });
}
