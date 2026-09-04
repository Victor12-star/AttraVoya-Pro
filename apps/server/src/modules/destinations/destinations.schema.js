import { destinationSearchQuerySchema } from '@attravoya/validation';

export const destinationsSchemas = Object.freeze({
  search: { querystring: destinationSearchQuerySchema },
});
