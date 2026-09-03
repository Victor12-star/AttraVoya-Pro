import { requireProviderCredential } from '../http/provider-credentials.js';
import { normalizeGeoapifyGeocoding, normalizeGeoapifyRoute } from './maps-normalizer.js';

const GEOCODE_ENDPOINT = 'https://api.geoapify.com/v1/geocode/search';
const REVERSE_ENDPOINT = 'https://api.geoapify.com/v1/geocode/reverse';
const ROUTING_ENDPOINT = 'https://api.geoapify.com/v1/routing';

export function createGeoapifyMapsProvider({ http, apiKey, cache, cacheTtlSeconds = 3600 }) {
  const key = () => requireProviderCredential(apiKey, 'Geoapify', 'GEOAPIFY_API_KEY');

  return {
    name: 'geoapify',

    async geocode({ text, language = 'en', limit = 5 }) {
      const cacheKey = `geocode:${language}:${limit}:${text.toLowerCase()}`;
      const cached = cache?.get(cacheKey);
      if (cached) return cached;
      const url = new URL(GEOCODE_ENDPOINT);
      url.searchParams.set('text', text);
      url.searchParams.set('format', 'json');
      url.searchParams.set('lang', language);
      url.searchParams.set('limit', String(limit));
      url.searchParams.set('apiKey', key());
      const payload = await http.requestJson(url);
      const result = normalizeGeoapifyGeocoding(payload);
      return cache ? cache.set(cacheKey, result, cacheTtlSeconds) : result;
    },

    async reverseGeocode({ latitude, longitude, language = 'en' }) {
      const cacheKey = `reverse:${Number(latitude).toFixed(5)}:${Number(longitude).toFixed(5)}:${language}`;
      const cached = cache?.get(cacheKey);
      if (cached) return cached;
      const url = new URL(REVERSE_ENDPOINT);
      url.searchParams.set('lat', String(latitude));
      url.searchParams.set('lon', String(longitude));
      url.searchParams.set('format', 'json');
      url.searchParams.set('lang', language);
      url.searchParams.set('apiKey', key());
      const payload = await http.requestJson(url);
      const result = normalizeGeoapifyGeocoding(payload);
      return cache ? cache.set(cacheKey, result, cacheTtlSeconds) : result;
    },

    async route({ waypoints, mode = 'drive', language = 'en' }) {
      const url = new URL(ROUTING_ENDPOINT);
      url.searchParams.set('waypoints', waypoints.map(({ latitude, longitude }) => `${latitude},${longitude}`).join('|'));
      url.searchParams.set('mode', mode);
      url.searchParams.set('lang', language);
      url.searchParams.set('format', 'json');
      url.searchParams.set('apiKey', key());
      const payload = await http.requestJson(url);
      return normalizeGeoapifyRoute(payload);
    },
  };
}
