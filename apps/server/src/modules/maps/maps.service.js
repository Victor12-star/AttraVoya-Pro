function finiteNonNegativeNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : null;
}

function textValue(value) {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return normalized || null;
}

function timestampValue(value) {
  const text = textValue(value);
  return text && Number.isFinite(Date.parse(text)) ? text : null;
}

export function createMapsService(provider) {
  return {
    async getRoute(query) {
      const providerRoute = await provider.route({
        waypoints: [
          { latitude: query.startLatitude, longitude: query.startLongitude },
          { latitude: query.endLatitude, longitude: query.endLongitude },
        ],
        mode: query.mode,
        language: query.language,
      });

      if (!providerRoute) return null;

      const providerName = textValue(providerRoute.provider) ?? textValue(provider.name);
      const distanceMeters = finiteNonNegativeNumber(providerRoute.distanceMeters);
      const durationSeconds = finiteNonNegativeNumber(providerRoute.durationSeconds);

      // Do not forward malformed or provider-specific route payloads. The public
      // contract stays intentionally small until a later map-rendering slice
      // designs and validates route geometry separately.
      if (!providerName || distanceMeters === null || durationSeconds === null) return null;

      return {
        provider: providerName,
        fetchedAt: timestampValue(providerRoute.fetchedAt),
        mode: query.mode,
        distanceMeters,
        durationSeconds,
      };
    },
  };
}
