import { ProviderResponseError } from '../../errors/app-error.js';
import { requireProviderCredential } from '../http/provider-credentials.js';
import { normalizeNewsDataResponse } from './news-normalizer.js';

const NEWS_ENDPOINT = 'https://newsdata.io/api/1/latest';

function newsCacheKey(query) {
  return JSON.stringify({
    query: query.query ?? null,
    countryCode: query.countryCode ?? null,
    language: query.language ?? null,
    categories: query.categories ?? [],
    size: query.size ?? null,
    page: query.page ?? null,
  });
}

export function createNewsDataNewsProvider({ http, apiKey, cache, cacheTtlSeconds = 1800 }) {
  function key() {
    return requireProviderCredential(apiKey, 'NewsData', 'NEWSDATA_API_KEY');
  }

  return {
    name: 'newsdata',

    async searchNews(query = {}) {
      const cacheKey = newsCacheKey(query);
      const cached = cache?.get(cacheKey);
      if (cached) return cached;

      const url = new URL(NEWS_ENDPOINT);
      url.searchParams.set('apikey', key());
      url.searchParams.set('language', String(query.language ?? 'en').toLowerCase());
      // Development deliberately honours the free-tier ceiling instead of
      // silently depending on a paid NewsData plan.
      url.searchParams.set('size', String(query.size ?? 10));

      if (query.query) url.searchParams.set('q', query.query);
      if (query.countryCode) url.searchParams.set('country', query.countryCode.toLowerCase());
      if (Array.isArray(query.categories) && query.categories.length > 0) {
        url.searchParams.set('category', query.categories.join(','));
      }
      if (query.page) url.searchParams.set('page', query.page);

      const payload = await http.requestJson(url);
      if (payload?.status && payload.status !== 'success') {
        throw new ProviderResponseError('NewsData returned an unsuccessful response.');
      }

      const normalized = normalizeNewsDataResponse(payload);
      return cache ? cache.set(cacheKey, normalized, cacheTtlSeconds) : normalized;
    },
  };
}
