import { createFrankfurterCurrencyProvider } from './frankfurter-currency-provider.js';

export const CURRENCY_PROVIDER_REGISTRY = Object.freeze({
  frankfurter: createFrankfurterCurrencyProvider,
});
