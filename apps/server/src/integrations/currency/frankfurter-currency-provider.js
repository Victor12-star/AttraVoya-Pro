import {
  normalizeFrankfurterRates,
  normalizeFrankfurterSingleRate,
} from './currency-normalizer.js';

const API_BASE = 'https://api.frankfurter.dev/v2';

const upperCurrency = (value) => String(value).trim().toUpperCase();

export function createFrankfurterCurrencyProvider({ http, cache, cacheTtlSeconds = 21_600 }) {
  return {
    name: 'frankfurter',

    async getRates({ base = 'EUR', quotes = [] } = {}) {
      const normalizedBase = upperCurrency(base);
      const normalizedQuotes = [...new Set(quotes.map(upperCurrency).filter(Boolean))].sort();
      const cacheKey = `rates:${normalizedBase}:${normalizedQuotes.join(',') || '*'}`;
      const cached = cache?.get(cacheKey);
      if (cached) return cached;

      const url = new URL(`${API_BASE}/rates`);
      url.searchParams.set('base', normalizedBase);
      if (normalizedQuotes.length) url.searchParams.set('quotes', normalizedQuotes.join(','));

      const payload = await http.requestJson(url);
      const result = {
        provider: 'frankfurter',
        fetchedAt: new Date().toISOString(),
        base: normalizedBase,
        rates: normalizeFrankfurterRates(payload, normalizedBase),
        approximate: true,
      };

      return cache ? cache.set(cacheKey, result, cacheTtlSeconds) : result;
    },

    async convert({ amount, from, to }) {
      const base = upperCurrency(from);
      const quote = upperCurrency(to);
      const numericAmount = Number(amount);

      if (base === quote) {
        return {
          provider: 'frankfurter',
          fetchedAt: new Date().toISOString(),
          amount: numericAmount,
          from: base,
          to: quote,
          rate: 1,
          convertedAmount: numericAmount,
          rateDate: null,
          approximate: true,
        };
      }

      const cacheKey = `pair:${base}:${quote}`;
      let rate = cache?.get(cacheKey);
      if (!rate) {
        const payload = await http.requestJson(
          `${API_BASE}/rate/${encodeURIComponent(base)}/${encodeURIComponent(quote)}`,
        );
        rate = normalizeFrankfurterSingleRate(payload, base, quote);
        cache?.set(cacheKey, rate, cacheTtlSeconds);
      }

      return {
        provider: 'frankfurter',
        fetchedAt: new Date().toISOString(),
        amount: numericAmount,
        from: base,
        to: quote,
        rate: rate.rate,
        convertedAmount: numericAmount * rate.rate,
        rateDate: rate.date,
        approximate: true,
      };
    },
  };
}
