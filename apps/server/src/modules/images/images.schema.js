import { imagesSearchQuerySchema } from '@attravoya/validation';

export const imagesSchemas = Object.freeze({
  search: { querystring: imagesSearchQuerySchema },
});
