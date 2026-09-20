/**
 * Public country reference contract.
 *
 * Country names returned by the API are stable English reference names. Web
 * and mobile clients localize them with @attravoya/localization/Intl.DisplayNames.
 * This avoids duplicating hundreds of translated country names in PostgreSQL.
 */
export const COUNTRY_REFERENCE_VERSION = 1;

// The generated ISO catalogue contains 249 countries. This ceiling preserves
// the complete current set and controlled growth while bounding public reads.
export const MAX_PUBLIC_COUNTRY_RECORDS = 300;
