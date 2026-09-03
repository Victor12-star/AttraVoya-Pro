import { createCountriesController } from './countries.controller.js';
import { createCountriesRepository } from './countries.repository.js';
import { createCountriesService } from './countries.service.js';

export async function countriesRoutes(app, options = {}) {
  const repository = options.repository ?? createCountriesRepository();
  const service = createCountriesService(repository);
  const controller = createCountriesController(service);

  // Country reference data is public. The client localizes country names with
  // Intl.DisplayNames so one cached API response can serve every UI language.
  app.get('/', controller.list);
}
