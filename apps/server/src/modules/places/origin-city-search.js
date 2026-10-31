const GEOCODING_URL = 'https://geocoding-api.open-meteo.com/v1/search';

/**
 * Origin suggestions are informational place names, not bookable airports.
 * This public provider keeps departure search independent of Geoapify quotas.
 */
/** @param {{ query?: string, limit?: number, language?: string, countryCode?: string }} options */
export async function searchOriginCities({ query, limit = 8, language = 'en', countryCode } = {}) {
  const name = String(query ?? '').trim();
  if (name.length < 2 || name.length > 100) return [];
  const count = Number.isInteger(Number(limit)) ? Math.max(1, Math.min(Number(limit), 20)) : 8;
  const url = new URL(GEOCODING_URL);
  url.searchParams.set('name', name);
  url.searchParams.set('count', String(count));
  url.searchParams.set('language', /^[a-z]{2}$/.test(language) ? language : 'en');
  if (/^[A-Z]{2}$/.test(String(countryCode ?? ''))) {
    url.searchParams.set('countryCode', String(countryCode));
  }

  const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
  if (!response.ok) throw new Error('Origin city lookup is temporarily unavailable');
  const data = await response.json();
  return (Array.isArray(data?.results) ? data.results : [])
    .filter((place) => typeof place?.name === 'string' && typeof place?.country === 'string')
    .map((place) => ({
      provider: 'open-meteo-geocoding',
      externalId: String(place.id ?? ''),
      name: place.name,
      formattedAddress: [place.name, place.admin1, place.country].filter(Boolean).join(', '),
      city: place.name,
      country: place.country,
      countryCode: place.country_code ?? null,
      latitude: Number.isFinite(place.latitude) ? place.latitude : null,
      longitude: Number.isFinite(place.longitude) ? place.longitude : null,
      resultType: 'city',
    }));
}
