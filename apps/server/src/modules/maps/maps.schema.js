import { mapsRouteQuerySchema } from '@attravoya/validation';

export const mapsSchemas = Object.freeze({
  route: { querystring: mapsRouteQuerySchema },
});
