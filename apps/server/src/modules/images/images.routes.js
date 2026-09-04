import { createImageProvider } from '../../integrations/images/image-provider.factory.js';
import { createImagesController } from './images.controller.js';
import { imagesSchemas } from './images.schema.js';
import { createImagesService } from './images.service.js';

export async function imagesRoutes(app, options = {}) {
  const provider = options.provider ?? createImageProvider();
  const service = createImagesService(provider);
  const controller = createImagesController(service);

  app.get('/search', {
    schema: imagesSchemas.search,
    handler: controller.search,
  });
}
