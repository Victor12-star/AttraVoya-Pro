import { createLanguagesController } from './languages.controller.js';
import { createLanguagesRepository } from './languages.repository.js';
import { createLanguagesService } from './languages.service.js';

export async function languagesRoutes(app, options = {}) {
  const repository = options.repository ?? createLanguagesRepository();
  const service = createLanguagesService(repository);
  const controller = createLanguagesController(service);

  app.get('/', controller.list);
}
