// Language records include spoken languages beyond UI locales. `isUiSupported`
// tells clients which languages currently have a complete application message set.
export const LANGUAGE_REFERENCE_VERSION = 1;

// The current generated catalogue contains 342 records. This ceiling preserves
// room for controlled growth while preventing malformed imports from producing
// unbounded public responses.
export const MAX_PUBLIC_LANGUAGE_RECORDS = 512;
