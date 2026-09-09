import { loadProviderCacheValue } from '../http/provider-cache.js';
import { requireProviderCredential } from '../http/provider-credentials.js';
import { PLACE_CATEGORY_GROUPS } from './place-categories.js';
import {
  normalizeGeoapifyAutocomplete,
  normalizeGeoapifyFeatureCollection,
} from './places-normalizer.js';

const AUTOCOMPLETE_ENDPOINT = 'https://api.geoapify.com/v1/geocode/autocomplete';
const PLACES_ENDPOINT = 'https://api.geoapify.com/v2/places';
const PLACE_DETAILS_ENDPOINT = 'https://api.geoapify.com/v2/place-details';
const CONSULAR_CATEGORY = 'office.government.embassy';

/**
 * @typedef {object} GeoapifyAutocompleteOptions
 * @property {string} query
 * @property {number} [limit]
 * @property {string} [language]
 * @property {string} [countryCode]
 * @property {number} [biasLatitude]
 * @property {number} [biasLongitude]
 * @property {'city'|'country'|'state'|'postcode'|'street'|'amenity'|'locality'} [type]
 */

function enrichDirectoryContact(base, details) {
  if (!details) return base;
  return {
    ...base,
    website: details.website ?? base.website,
    phone: details.phone ?? base.phone,
    email: details.email ?? base.email,
    openingHours: details.openingHours ?? base.openingHours,
  };
}

export function createGeoapifyPlacesProvider({ http, apiKey, cache, cacheTtlSeconds = 3600 }) {
  function key() {
    return requireProviderCredential(apiKey, 'Geoapify', 'GEOAPIFY_API_KEY');
  }

  return {
    name: 'geoapify',

    /** @param {GeoapifyAutocompleteOptions} options */
    async autocomplete(options) {
      const {
        query,
        limit = 8,
        language = 'en',
        countryCode,
        biasLatitude,
        biasLongitude,
        type,
      } = options;
      const cacheKey = [
        'autocomplete',
        query.toLowerCase(),
        limit,
        language,
        countryCode ?? '',
        biasLatitude ?? '',
        biasLongitude ?? '',
        type ?? '',
      ].join(':');

      return loadProviderCacheValue({
        cache,
        key: cacheKey,
        ttlSeconds: Math.min(cacheTtlSeconds, 900),
        async loader() {
          const url = new URL(AUTOCOMPLETE_ENDPOINT);
          url.searchParams.set('text', query);
          url.searchParams.set('format', 'json');
          url.searchParams.set('limit', String(limit));
          url.searchParams.set('lang', language);
          url.searchParams.set('apiKey', key());
          if (type) url.searchParams.set('type', type);
          if (countryCode) {
            url.searchParams.set('filter', `countrycode:${countryCode.toLowerCase()}`);
          }
          if (Number.isFinite(biasLatitude) && Number.isFinite(biasLongitude)) {
            url.searchParams.set('bias', `proximity:${biasLongitude},${biasLatitude}`);
          }

          const payload = await http.requestJson(url);
          return {
            provider: 'geoapify',
            fetchedAt: new Date().toISOString(),
            results: normalizeGeoapifyAutocomplete(payload),
          };
        },
      });
    },

    async searchNearby({
      categoryGroup,
      latitude,
      longitude,
      radiusMeters = 5000,
      limit = 20,
      language = 'en',
    }) {
      const categories = PLACE_CATEGORY_GROUPS[categoryGroup];
      if (!categories) throw new TypeError(`Unsupported place category group: ${categoryGroup}`);

      const cacheKey = [
        'nearby',
        categoryGroup,
        Number(latitude).toFixed(4),
        Number(longitude).toFixed(4),
        radiusMeters,
        limit,
        language,
      ].join(':');

      return loadProviderCacheValue({
        cache,
        key: cacheKey,
        ttlSeconds: cacheTtlSeconds,
        async loader() {
          const url = new URL(PLACES_ENDPOINT);
          url.searchParams.set('categories', categories.join(','));
          url.searchParams.set('filter', `circle:${longitude},${latitude},${radiusMeters}`);
          url.searchParams.set('bias', `proximity:${longitude},${latitude}`);
          url.searchParams.set('limit', String(limit));
          url.searchParams.set('lang', language);
          url.searchParams.set('apiKey', key());

          const payload = await http.requestJson(url);
          return {
            provider: 'geoapify',
            fetchedAt: new Date().toISOString(),
            categoryGroup,
            results: normalizeGeoapifyFeatureCollection(payload),
          };
        },
      });
    },

    /**
     * Find embassy/consular directory entries inside the selected host country.
     * Geoapify/OSM directory data is never promoted to official verification.
     */
    async searchConsularMissions({
      hostCountryCode,
      hostCountryName,
      citizenshipCountryCode,
      citizenshipCountryName,
      limit = 5,
      language = 'en',
    }) {
      const cacheKey = [
        'consular',
        hostCountryCode,
        citizenshipCountryCode,
        hostCountryName.toLowerCase(),
        citizenshipCountryName.toLowerCase(),
        limit,
        language,
      ].join(':');

      return loadProviderCacheValue({
        cache,
        key: cacheKey,
        ttlSeconds: Math.max(cacheTtlSeconds, 3600),
        async loader() {
          const fetchedAt = new Date().toISOString();
          const countryUrl = new URL(AUTOCOMPLETE_ENDPOINT);
          countryUrl.searchParams.set('text', hostCountryName);
          countryUrl.searchParams.set('format', 'json');
          countryUrl.searchParams.set('type', 'country');
          countryUrl.searchParams.set('filter', `countrycode:${hostCountryCode.toLowerCase()}`);
          countryUrl.searchParams.set('limit', '3');
          countryUrl.searchParams.set('lang', language);
          countryUrl.searchParams.set('apiKey', key());

          const boundaryPayload = await http.requestJson(countryUrl);
          const boundary = normalizeGeoapifyAutocomplete(boundaryPayload).find(
            (candidate) =>
              candidate.countryCode === hostCountryCode && typeof candidate.externalId === 'string',
          );

          const baseResult = {
            provider: 'geoapify',
            fetchedAt,
            sourceType: 'directory',
            officiallyVerified: false,
            hostCountryCode,
            citizenshipCountryCode,
          };

          if (!boundary?.externalId) return { ...baseResult, results: [] };

          const placesUrl = new URL(PLACES_ENDPOINT);
          placesUrl.searchParams.set('categories', CONSULAR_CATEGORY);
          placesUrl.searchParams.set('filter', `place:${boundary.externalId}`);
          placesUrl.searchParams.set('name', citizenshipCountryName);
          placesUrl.searchParams.set('limit', String(limit));
          placesUrl.searchParams.set('lang', language);
          placesUrl.searchParams.set('apiKey', key());

          const placesPayload = await http.requestJson(placesUrl);
          const missions = normalizeGeoapifyFeatureCollection(placesPayload).slice(0, limit);
          const enriched = await Promise.all(
            missions.map(async (mission) => {
              if (!mission.externalId) return mission;
              const detailsUrl = new URL(PLACE_DETAILS_ENDPOINT);
              detailsUrl.searchParams.set('id', mission.externalId);
              detailsUrl.searchParams.set('features', 'details');
              detailsUrl.searchParams.set('lang', language);
              detailsUrl.searchParams.set('apiKey', key());
              try {
                const detailsPayload = await http.requestJson(detailsUrl);
                const details = normalizeGeoapifyFeatureCollection(detailsPayload)[0];
                return enrichDirectoryContact(mission, details);
              } catch {
                // Discovery remains useful when optional contact enrichment is unavailable.
                return mission;
              }
            }),
          );

          return { ...baseResult, results: enriched };
        },
      });
    },
  };
}
