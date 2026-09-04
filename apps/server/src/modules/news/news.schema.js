import { newsQuerySchema } from '@attravoya/validation';

export const newsSchemas = Object.freeze({
  search: { querystring: newsQuerySchema },
});
