import { currencyConvertQuerySchema, currencyRatesQuerySchema } from '@attravoya/validation';

export const currencySchemas = Object.freeze({
  rates: { querystring: currencyRatesQuerySchema },
  convert: { querystring: currencyConvertQuerySchema },
});
