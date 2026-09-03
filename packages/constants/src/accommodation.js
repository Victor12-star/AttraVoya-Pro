/**
 * Accommodation domain constants shared by web, mobile, admin, and the API.
 *
 * Keep these identifiers provider-neutral. Geoapify, Booking.com, Expedia, or a
 * future provider may use different category names; provider adapters translate
 * those values into this internal vocabulary before application code sees them.
 */
export const ACCOMMODATION_TYPES = Object.freeze({
  HOTEL: 'HOTEL',
  BUDGET_HOTEL: 'BUDGET_HOTEL',
  GUEST_HOUSE: 'GUEST_HOUSE',
  BED_AND_BREAKFAST: 'BED_AND_BREAKFAST',
  HOSTEL: 'HOSTEL',
  SERVICED_APARTMENT: 'SERVICED_APARTMENT',
  APARTHOTEL: 'APARTHOTEL',
  SHORT_TERM_RENTAL: 'SHORT_TERM_RENTAL',
  VACATION_HOME: 'VACATION_HOME',
  RESORT: 'RESORT',
  VILLA: 'VILLA',
  COTTAGE: 'COTTAGE',
  CAMPSITE: 'CAMPSITE',
  HOLIDAY_PARK: 'HOLIDAY_PARK',
  OTHER: 'OTHER',
});

export const STAY_UNIT_TYPES = Object.freeze({
  ENTIRE_PLACE: 'ENTIRE_PLACE',
  PRIVATE_ROOM: 'PRIVATE_ROOM',
  SHARED_ROOM: 'SHARED_ROOM',
  ANY: 'ANY',
});

/**
 * Preference strength lets the planner distinguish a must-have from something
 * that should improve ranking but should not eliminate an otherwise good trip.
 */
export const STAY_PREFERENCE_LEVELS = Object.freeze({
  NOT_REQUIRED: 'NOT_REQUIRED',
  PREFERRED: 'PREFERRED',
  REQUIRED: 'REQUIRED',
});

export const STAY_AMENITIES = Object.freeze({
  BREAKFAST_INCLUDED: 'BREAKFAST_INCLUDED',
  BREAKFAST_AVAILABLE: 'BREAKFAST_AVAILABLE',
  KITCHEN: 'KITCHEN',
  PRIVATE_BATHROOM: 'PRIVATE_BATHROOM',
  WIFI: 'WIFI',
  PARKING: 'PARKING',
  POOL: 'POOL',
  AIR_CONDITIONING: 'AIR_CONDITIONING',
  WASHING_MACHINE: 'WASHING_MACHINE',
  ELEVATOR: 'ELEVATOR',
  STEP_FREE_ACCESS: 'STEP_FREE_ACCESS',
  CRIB_AVAILABLE: 'CRIB_AVAILABLE',
  FAMILY_ROOM: 'FAMILY_ROOM',
});

export const STAY_NEAR_PRIORITIES = Object.freeze({
  CITY_CENTRE: 'CITY_CENTRE',
  BEACH: 'BEACH',
  AIRPORT: 'AIRPORT',
  PUBLIC_TRANSPORT: 'PUBLIC_TRANSPORT',
  FAMILY_ACTIVITIES: 'FAMILY_ACTIVITIES',
  ATTRACTIONS: 'ATTRACTIONS',
  SHOPPING: 'SHOPPING',
  RESTAURANTS: 'RESTAURANTS',
  NIGHTLIFE: 'NIGHTLIFE',
  HOSPITAL: 'HOSPITAL',
  CUSTOM: 'CUSTOM',
});
