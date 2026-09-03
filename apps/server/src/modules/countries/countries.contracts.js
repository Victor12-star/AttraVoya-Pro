/**
 * Public country reference contract.
 *
 * Country names returned by the API are stable English reference names. Web
 * and mobile clients localize them with @attravoya/localization/Intl.DisplayNames.
 * This avoids duplicating hundreds of translated country names in PostgreSQL.
 */
export const COUNTRY_REFERENCE_VERSION = 1;
