import { ACCOMMODATION_TYPES } from '@attravoya/constants';

const CATEGORY_TO_TYPE = Object.freeze([
  ['accommodation.hotel', ACCOMMODATION_TYPES.HOTEL],
  ['accommodation.hostel', ACCOMMODATION_TYPES.HOSTEL],
  ['accommodation.guest_house', ACCOMMODATION_TYPES.GUEST_HOUSE],
  ['accommodation.apartment', ACCOMMODATION_TYPES.SHORT_TERM_RENTAL],
  ['accommodation.chalet', ACCOMMODATION_TYPES.COTTAGE],
]);

export function accommodationTypeFromCategories(categories = []) {
  for (const [category, type] of CATEGORY_TO_TYPE) {
    if (categories.includes(category)) return type;
  }
  return ACCOMMODATION_TYPES.OTHER;
}

/**
 * Geoapify tells us where a property exists; it is not a live inventory API.
 * Price, availability, breakfast, kitchen and cancellation data therefore stay
 * explicitly unknown instead of being invented from the place category.
 */
export function normalizeAccommodationPlace(place) {
  return {
    ...place,
    accommodationType: accommodationTypeFromCategories(place.categories),
    livePrice: null,
    liveAvailability: null,
    cancellationPolicy: null,
    amenities: [],
    inventoryDataAvailable: false,
  };
}
