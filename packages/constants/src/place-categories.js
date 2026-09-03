/**
 * Public place-search groups understood by AttraVoya Pro clients.
 * Provider adapters map these stable aliases to provider-specific categories.
 */
export const PLACE_CATEGORY_GROUPS = Object.freeze({
  RESTAURANTS: 'restaurants',
  CAFES: 'cafes',
  ATTRACTIONS: 'attractions',
  MUSEUMS: 'museums',
  ACCOMMODATION: 'accommodation',
  HOTELS: 'hotels',
  HOSTELS: 'hostels',
  GUEST_HOUSES: 'guestHouses',
  APARTMENTS: 'apartments',
  HOSPITALS: 'hospitals',
  PHARMACIES: 'pharmacies',
  POLICE: 'police',
  SHOPPING: 'shopping',
  SUPERMARKETS: 'supermarkets',
  PLAYGROUNDS: 'playgrounds',
  PARKS: 'parks',
  ATMS: 'atms',
  PARKING: 'parking',
  AIRPORTS: 'airports',
});

export const PLACE_CATEGORY_GROUP_VALUES = Object.freeze(Object.values(PLACE_CATEGORY_GROUPS));
