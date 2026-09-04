import { requireProviderCredential } from '../http/provider-credentials.js';
import { normalizeTicketmasterEvents } from './ticketmaster-events-normalizer.js';

const EVENTS_ENDPOINT = 'https://app.ticketmaster.com/discovery/v2/events.json';
const GEOHASH_ALPHABET = '0123456789bcdefghjkmnpqrstuvwxyz';

function encodeGeohash(latitude, longitude, precision = 9) {
  let evenBit = true;
  let bit = 0;
  let character = 0;
  let hash = '';
  const latitudeRange = [-90, 90];
  const longitudeRange = [-180, 180];

  while (hash.length < precision) {
    const range = evenBit ? longitudeRange : latitudeRange;
    const value = evenBit ? longitude : latitude;
    const midpoint = (range[0] + range[1]) / 2;

    if (value >= midpoint) {
      character = (character << 1) | 1;
      range[0] = midpoint;
    } else {
      character <<= 1;
      range[1] = midpoint;
    }

    evenBit = !evenBit;
    bit += 1;

    if (bit === 5) {
      hash += GEOHASH_ALPHABET[character];
      bit = 0;
      character = 0;
    }
  }

  return hash;
}

function eventCacheKey(query) {
  return JSON.stringify({
    keyword: query.keyword ?? null,
    city: query.city ?? null,
    countryCode: query.countryCode ?? null,
    classificationName: query.classificationName ?? null,
    latitude: query.latitude ?? null,
    longitude: query.longitude ?? null,
    radius: query.radius ?? null,
    unit: query.unit ?? null,
    startDateTime: query.startDateTime ?? null,
    endDateTime: query.endDateTime ?? null,
    locale: query.locale ?? null,
    size: query.size ?? null,
    page: query.page ?? null,
    sort: query.sort ?? null,
  });
}

export function createTicketmasterEventsProvider({ http, apiKey, cache, cacheTtlSeconds = 3600 }) {
  function key() {
    return requireProviderCredential(apiKey, 'Ticketmaster', 'TICKETMASTER_API_KEY');
  }

  return {
    name: 'ticketmaster',

    async searchEvents(query = {}) {
      const cacheKey = eventCacheKey(query);
      const cached = cache?.get(cacheKey);
      if (cached) return cached;

      const url = new URL(EVENTS_ENDPOINT);
      url.searchParams.set('apikey', key());
      url.searchParams.set('size', String(query.size ?? 20));
      url.searchParams.set('page', String(query.page ?? 0));
      url.searchParams.set('locale', query.locale ?? 'en');
      url.searchParams.set('includeTest', 'no');

      if (query.keyword) url.searchParams.set('keyword', query.keyword);
      if (query.city) url.searchParams.set('city', query.city);
      if (query.countryCode) url.searchParams.set('countryCode', query.countryCode);
      if (query.classificationName) {
        url.searchParams.set('classificationName', query.classificationName);
      }
      if (query.startDateTime) url.searchParams.set('startDateTime', query.startDateTime);
      if (query.endDateTime) url.searchParams.set('endDateTime', query.endDateTime);
      if (query.sort) url.searchParams.set('sort', query.sort);

      if (Number.isFinite(query.latitude) && Number.isFinite(query.longitude)) {
        // Ticketmaster deprecated raw latlong filtering in favour of geoPoint.
        // Encoding here keeps that provider detail out of every AttraVoya client.
        url.searchParams.set('geoPoint', encodeGeohash(query.latitude, query.longitude));
        url.searchParams.set('radius', String(query.radius ?? 25));
        url.searchParams.set('unit', query.unit ?? 'km');
      }

      const payload = await http.requestJson(url);
      const normalized = normalizeTicketmasterEvents(payload);
      return cache ? cache.set(cacheKey, normalized, cacheTtlSeconds) : normalized;
    },
  };
}
