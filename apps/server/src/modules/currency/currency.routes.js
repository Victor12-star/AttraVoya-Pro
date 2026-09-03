import { createCurrencyProvider } from '../../integrations/currency/currency-provider.factory.js';
import { createCurrencyController } from './currency.controller.js';
import { currencySchemas } from './currency.schema.js';
import { createCurrencyService } from './currency.service.js';

export async function currencyRoutes(app, options = {}) {
  const provider = options.provider ?? createCurrencyProvider();
  const service = createCurrencyService(provider);
  const controller = createCurrencyController(service);

  app.get('/rates', { schema: currencySchemas.rates, handler: controller.rates });
  app.get('/convert', { schema: currencySchemas.convert, handler: controller.convert });
}
