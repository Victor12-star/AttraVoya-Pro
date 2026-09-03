import { placesAutocompleteQuerySchema, placesNearbyQuerySchema } from '@attravoya/validation';

export const placesSchemas = Object.freeze({
  autocomplete: { querystring: placesAutocompleteQuerySchema },
  nearby: { querystring: placesNearbyQuerySchema },
});
