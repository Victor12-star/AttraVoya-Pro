import { createEventsProvider } from '../../integrations/events/events-provider.factory.js';
import { createEventsController } from './events.controller.js';
import { eventsSchemas } from './events.schema.js';
import { createEventsService } from './events.service.js';

export async function eventsRoutes(app, options = {}) {
  const provider = options.provider ?? createEventsProvider();
  const service = createEventsService(provider);
  const controller = createEventsController(service);

  app.get('/', { schema: eventsSchemas.search, handler: controller.search });
}
