import { emergencyCountryQuerySchema } from '@attravoya/validation';

export const emergencySchemas = Object.freeze({
  country: { querystring: emergencyCountryQuerySchema },
});
