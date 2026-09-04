import { createEmergencyController } from './emergency.controller.js';
import { createEmergencyRepository } from './emergency.repository.js';
import { emergencySchemas } from './emergency.schema.js';
import { createEmergencyService } from './emergency.service.js';

export async function emergencyRoutes(app, options = {}) {
  const repository = options.repository ?? createEmergencyRepository();
  const service = createEmergencyService(repository);
  const controller = createEmergencyController(service);

  // Basic emergency information is public and never subscription-gated.
  app.get('/', { schema: emergencySchemas.country, handler: controller.listCountry });
}
