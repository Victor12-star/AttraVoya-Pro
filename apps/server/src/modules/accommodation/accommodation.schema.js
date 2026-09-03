import { accommodationNearbyQuerySchema } from '@attravoya/validation';

export const accommodationSchemas = Object.freeze({ nearby: { querystring: accommodationNearbyQuerySchema } });
