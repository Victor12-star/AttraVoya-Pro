import { weatherQuerySchema } from '@attravoya/validation';

export const weatherSchemas = Object.freeze({ forecast: { querystring: weatherQuerySchema } });
