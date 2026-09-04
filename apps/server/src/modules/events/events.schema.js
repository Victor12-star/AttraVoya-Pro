import { eventsQuerySchema } from '@attravoya/validation';

export const eventsSchemas = Object.freeze({
  search: { querystring: eventsQuerySchema },
});
