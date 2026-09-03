import { requireProviderCredential } from '../http/provider-credentials.js';
import { PLACE_CATEGORY_GROUPS } from './place-categories.js';
import { normalizeGeoapifyAutocomplete, normalizeGeoapifyFeatureCollection } from './places-normalizer.js';

const AUTOCOMPLETE_ENDPOINT = 'https://api.geoapify.com/v1/geocode/autocomplete';
const PLACES_ENDPOINT = 'https://api.geoapify.com/v2/places';

export function createGeoapifyPlacesProvider({ http, apiKey, cache, cacheTtlSeconds = 3600 }) {
  function key() {
    return requireProviderCredential(apiKey, 'Geoapify', 'GEOAPIFY_API_KEY');
  }

  return {
    name: 'geoapify',

    async autocomplete({ query, limit = 8, language = 'en', countryCode, biasLatitude, biasLongitude }) {
      const cacheKey = ['autocomplete', query.toLowerCase(), limit, language, countryCode ?? '', biasLatitude ?? '', biasLongitude ?? ''].join(':');
      const cached = cache?.get(cacheKey);
      if (cached) return cached;

      const url = new URL(AUTOCOMPLETE_ENDPOINT);
      url.searchParams.set('text', query);
      url.searchParams.set('format', 'json');
      url.searchParams.set('limit', String(limit));
      url.searchParams.set('lang', language);
      url.searchParams.set('apiKey', key());
      if (countryCode) url.searchParams.set('filter', `countrycode:${countryCode.toLowerCase()}`);
      if (Number.isFinite(biasLatitude) && Number.isFinite(biasLongitude)) {
        url.searchParams.set('bias', `proximity:${biasLongitude},${biasLatitude}`);
      }

      const payload = await http.requestJson(url);
      const result = {
        provider: 'geoapify',
        fetchedAt: new Date().toISOString(),
        results: normalizeGeoapifyAutocomplete(payload),
      };
      return cache ? cache.set(cacheKey, result, Math.min(cacheTtlSeconds, 900)) : result;
    },

    async searchNearby({ categoryGroup, latitude, longitude, radiusMeters = 5000, limit = 20, language = 'en' }) {
      const categories = PLACE_CATEGORY_GROUPS[categoryGroup];
      if (!categories) throw new TypeError(`Unsupported place category group: ${categoryGroup}`);

      const cacheKey = ['nearby', categoryGroup, Number(latitude).toFixed(4), Number(longitude).toFixed(4), radiusMeters, limit, language].join(':');
      const cached = cache?.get(cacheKey);
      if (cached) return cached;

      const url = new URL(PLACES_ENDPOINT);
      url.searchParams.set('categories', categories.join(','));
      url.searchParams.set('filter', `circle:${longitude},${latitude},${radiusMeters}`);
      url.searchParams.set('bias', `proximity:${longitude},${latitude}`);
      url.searchParams.set('limit', String(limit));
      url.searchParams.set('lang', language);
      url.searchParams.set('apiKey', key());

      const payload = await http.requestJson(url);
      const result = {
        provider: 'geoapify',
        fetchedAt: new Date().toISOString(),
        categoryGroup,
        results: normalizeGeoapifyFeatureCollection(payload),
      };
      return cache ? cache.set(cacheKey, result, cacheTtlSeconds) : result;
    },
  };
}
