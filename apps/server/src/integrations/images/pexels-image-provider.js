import { ProviderResponseError } from '../../errors/app-error.js';
import { loadProviderCacheValue } from '../http/provider-cache.js';
import { requireProviderCredential } from '../http/provider-credentials.js';
import { normalizePexelsSearch } from './pexels-image-normalizer.js';

const SEARCH_ENDPOINT = 'https://api.pexels.com/v1/search';

function imageCacheKey(query) {
  return JSON.stringify({
    query: query.query,
    orientation: query.orientation ?? null,
    size: query.size ?? null,
    color: query.color ?? null,
    locale: query.locale ?? null,
    page: query.page ?? 1,
    perPage: query.perPage ?? 15,
  });
}

export function createPexelsImageProvider({ http, apiKey, cache, cacheTtlSeconds = 86400 }) {
  function key() {
    return requireProviderCredential(apiKey, 'Pexels', 'PEXELS_API_KEY');
  }

  return {
    name: 'pexels',

    async searchPhotos(query) {
      const cacheKey = imageCacheKey(query);

      return loadProviderCacheValue({
        cache,
        key: cacheKey,
        ttlSeconds: cacheTtlSeconds,
        async loader() {
          const url = new URL(SEARCH_ENDPOINT);
          url.searchParams.set('query', query.query);
          url.searchParams.set('page', String(query.page ?? 1));
          url.searchParams.set('per_page', String(query.perPage ?? 15));
          if (query.orientation) {
            url.searchParams.set('orientation', query.orientation);
          }
          if (query.size) url.searchParams.set('size', query.size);
          if (query.color) url.searchParams.set('color', query.color);
          if (query.locale) url.searchParams.set('locale', query.locale);

          const payload = await http.requestJson(url, {
            headers: { Authorization: key() },
          });
          if (!payload || typeof payload !== 'object' || !Array.isArray(payload.photos)) {
            throw new ProviderResponseError('Pexels returned an unexpected photo search response.');
          }

          return normalizePexelsSearch(payload);
        },
      });
    },
  };
}
