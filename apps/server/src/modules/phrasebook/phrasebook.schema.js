import { phrasebookQuerySchema } from '@attravoya/validation';

export const phrasebookSchemas = Object.freeze({
  catalog: { querystring: phrasebookQuerySchema },
});
