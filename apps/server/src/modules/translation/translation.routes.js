import { createTranslationProvider } from '../../integrations/translation/translation-provider.factory.js';
import { createTranslationController } from './translation.controller.js';
import { translationSchemas } from './translation.schema.js';
import { createTranslationService } from './translation.service.js';

const TRANSLATION_RATE_LIMIT = Object.freeze({ max: 30, timeWindow: '1 minute' });

export async function translationRoutes(app, options = {}) {
  const provider = options.provider ?? createTranslationProvider();
  const service = createTranslationService(provider);
  const controller = createTranslationController(service);

  app.get('/languages', controller.languages);
  app.post('/', {
    schema: translationSchemas.translate,
    config: { rateLimit: TRANSLATION_RATE_LIMIT },
    handler: controller.translate,
  });
}
