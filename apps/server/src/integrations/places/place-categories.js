import { PLACE_CATEGORY_GROUPS as GROUPS } from '@attravoya/constants';

/** Verified Geoapify category IDs behind provider-neutral AttraVoya aliases. */
export const PLACE_CATEGORY_GROUPS = Object.freeze({
  [GROUPS.RESTAURANTS]: ['catering.restaurant'],
  [GROUPS.CAFES]: ['catering.cafe'],
  [GROUPS.ATTRACTIONS]: ['tourism'],
  [GROUPS.MUSEUMS]: ['entertainment.museum'],
  [GROUPS.ACCOMMODATION]: ['accommodation'],
  [GROUPS.HOTELS]: ['accommodation.hotel'],
  [GROUPS.HOSTELS]: ['accommodation.hostel'],
  [GROUPS.GUEST_HOUSES]: ['accommodation.guest_house'],
  [GROUPS.APARTMENTS]: ['accommodation.apartment'],
  [GROUPS.HOSPITALS]: ['healthcare.hospital'],
  [GROUPS.PHARMACIES]: ['healthcare.pharmacy'],
  [GROUPS.POLICE]: ['service.police'],
  [GROUPS.SHOPPING]: ['commercial.shopping_mall'],
  [GROUPS.SUPERMARKETS]: ['commercial.supermarket'],
  [GROUPS.PLAYGROUNDS]: ['leisure.playground'],
  [GROUPS.PARKS]: ['leisure.park'],
  [GROUPS.ATMS]: ['service.financial.atm'],
  [GROUPS.PARKING]: ['parking'],
  [GROUPS.AIRPORTS]: ['airport'],
});

export const PLACE_CATEGORY_GROUP_NAMES = Object.freeze(Object.keys(PLACE_CATEGORY_GROUPS));
