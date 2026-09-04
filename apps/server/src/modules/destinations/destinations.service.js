const CITY_RESULT_TYPE = 'city';

function isFiniteCoordinate(value) {
  return Number.isFinite(Number(value));
}

function destinationKey(candidate) {
  if (candidate.externalId) return `${candidate.provider}:${candidate.externalId}`;
  return [
    candidate.name.toLowerCase(),
    candidate.countryCode,
    Number(candidate.latitude).toFixed(4),
    Number(candidate.longitude).toFixed(4),
  ].join(':');
}

function toDestinationCandidate(place) {
  if (!place || typeof place !== 'object') return null;
  if (place.resultType && place.resultType !== CITY_RESULT_TYPE) return null;
  if (!isFiniteCoordinate(place.latitude) || !isFiniteCoordinate(place.longitude)) return null;

  const name = String(place.city ?? place.name ?? '').trim();
  const countryCode = String(place.countryCode ?? '')
    .trim()
    .toUpperCase();
  if (!name || countryCode.length !== 2) return null;

  return {
    provider: place.provider ?? 'unknown',
    externalId: place.externalId ?? null,
    name,
    formattedAddress: place.formattedAddress ?? null,
    state: place.state ?? null,
    stateCode: place.stateCode ?? null,
    country: place.country ?? null,
    countryCode,
    latitude: Number(place.latitude),
    longitude: Number(place.longitude),
    timeZone: place.timeZone ?? null,
    confidence: Number.isFinite(Number(place.confidence)) ? Number(place.confidence) : null,
  };
}

export function createDestinationsService(provider) {
  if (!provider || typeof provider.autocomplete !== 'function') {
    throw new TypeError('Destinations service requires a places provider with autocomplete().');
  }

  return {
    async search(query) {
      const providerResult = await provider.autocomplete({
        query: query.query,
        limit: query.limit,
        language: query.language,
        countryCode: query.countryCode,
        // Geoapify's city type intentionally excludes streets, buildings and
        // businesses from the destination picker.
        type: CITY_RESULT_TYPE,
      });

      const seen = new Set();
      const results = [];
      for (const place of providerResult?.results ?? []) {
        const candidate = toDestinationCandidate(place);
        if (!candidate) continue;
        const key = destinationKey(candidate);
        if (seen.has(key)) continue;
        seen.add(key);
        results.push(candidate);
      }

      return {
        provider: providerResult?.provider ?? provider.name ?? 'unknown',
        fetchedAt: providerResult?.fetchedAt ?? new Date().toISOString(),
        query: {
          query: query.query,
          countryCode: query.countryCode ?? null,
          language: query.language,
          limit: query.limit,
        },
        results,
      };
    },
  };
}
