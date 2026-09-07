import { createTranslationProvider } from '../../integrations/translation/translation-provider.factory.js';
import { createPhrasebookController } from './phrasebook.controller.js';
import { createPhrasebookRepository } from './phrasebook.repository.js';
import { phrasebookSchemas } from './phrasebook.schema.js';
import { createPhrasebookService } from './phrasebook.service.js';

export async function phrasebookRoutes(app, options = {}) {
  const provider = options.provider ?? createTranslationProvider();
  const repository = options.repository ?? createPhrasebookRepository();
  const service = createPhrasebookService(provider, repository);
  const controller = createPhrasebookController(service);

  app.get('/', {
    schema: phrasebookSchemas.catalog,
    handler: controller.catalog,
  });
}
