import { createNewsProvider } from '../../integrations/news/news-provider.factory.js';
import { createNewsController } from './news.controller.js';
import { newsSchemas } from './news.schema.js';
import { createNewsService } from './news.service.js';

export async function newsRoutes(app, options = {}) {
  const provider = options.provider ?? createNewsProvider();
  const service = createNewsService(provider);
  const controller = createNewsController(service);

  app.get('/', { schema: newsSchemas.search, handler: controller.search });
}
