import { ACCOMMODATION_TYPES } from '@attravoya/constants';
import { normalizeAccommodationPlace } from './accommodation-normalizer.js';

const SUPPORTED_TYPE_GROUPS = Object.freeze({
  [ACCOMMODATION_TYPES.HOTEL]: 'hotels',
  [ACCOMMODATION_TYPES.GUEST_HOUSE]: 'guestHouses',
  [ACCOMMODATION_TYPES.HOSTEL]: 'hostels',
  [ACCOMMODATION_TYPES.SHORT_TERM_RENTAL]: 'apartments',
  [ACCOMMODATION_TYPES.COTTAGE]: 'accommodation',
});

export function createGeoapifyAccommodationProvider({ placesProvider }) {
  return {
    name: 'geoapify',
    supportedTypes: Object.freeze(Object.keys(SUPPORTED_TYPE_GROUPS)),

    async searchNearby({
      latitude,
      longitude,
      radiusMeters = 5000,
      limit = 20,
      language = 'en',
      types = [],
    }) {
      const requestedTypes = [...new Set(types)];
      const supportedRequestedTypes = requestedTypes.filter((type) => SUPPORTED_TYPE_GROUPS[type]);
      const unsupportedTypes = requestedTypes.filter((type) => !SUPPORTED_TYPE_GROUPS[type]);

      // Geoapify accepts multiple categories, but the public places adapter uses
      // stable groups. Query each exact requested group and deduplicate by place
      // ID so we do not mislabel unsupported lodging types such as B&B or resort.
      const groups = supportedRequestedTypes.length
        ? [...new Set(supportedRequestedTypes.map((type) => SUPPORTED_TYPE_GROUPS[type]))]
        : ['accommodation'];

      const results = [];
      for (const categoryGroup of groups) {
        const response = await placesProvider.searchNearby({
          categoryGroup,
          latitude,
          longitude,
          radiusMeters,
          limit,
          language,
        });
        results.push(...response.results.map(normalizeAccommodationPlace));
      }

      const deduplicated = [
        ...new Map(
          results.map((place) => [
            place.externalId ?? `${place.latitude}:${place.longitude}:${place.name}`,
            place,
          ]),
        ).values(),
      ].slice(0, limit);

      return {
        provider: 'geoapify',
        fetchedAt: new Date().toISOString(),
        results: deduplicated,
        unsupportedTypes,
        inventoryDataAvailable: false,
        message: 'Location data only. Live room price and availability are not connected yet.',
      };
    },
  };
}
