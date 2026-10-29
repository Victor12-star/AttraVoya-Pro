const GEOCODING_URL = 'https://geocoding-api.open-meteo.com/v1/search';

/**
 * Search public city names without requiring the optional Geoapify credential.
 * Results are text suggestions only; they are not airport IDs or saved destinations.
 */
export async function searchOriginCities({ query, limit = 8, language = 'en', countryCode }) {
  const url = new URL(GEOCODING_URL);
  url.searchParams.set('name', query);
  url.searchParams.set('count', String(Math.min(limit, 20)));
  url.searchParams.set('language', language);
  if (countryCode) url.searchParams.set('countryCode', countryCode);

  const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
  if (!response.ok) {
    throw new Error('Origin city provider is unavailable');
  }
  const payload = await response.json();
  const rows = Array.isArray(payload?.results) ? payload.results : [];
  return rows
    .filter((place) => typeof place?.name === 'string' && typeof place?.country === 'string')
    .map((place) => ({
      provider: 'open-meteo-geocoding',
      externalId: String(place.id ?? ''),
      name: place.name,
      formattedAddress: [place.name, place.admin1, place.country]
        .filter(Boolean)
        .join(', '),
      city: place.name,
      country: place.country,
      countryCode: place.country_code ?? null,
      latitude: Number.isFinite(place.latitude) ? place.latitude : null,
      longitude: Number.isFinite(place.longitude) ? place.longitude : null,
      resultType: 'city',
    }));
}
