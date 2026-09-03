import { normalizeGeoapifyAutocomplete } from '../places/places-normalizer.js';

export function normalizeGeoapifyGeocoding(payload) {
  return normalizeGeoapifyAutocomplete(payload);
}

export function normalizeGeoapifyRoute(payload) {
  const route = Array.isArray(payload?.results) ? payload.results[0] : null;
  if (!route) return null;
  return {
    provider: 'geoapify',
    fetchedAt: new Date().toISOString(),
    distanceMeters: route.distance ?? null,
    durationSeconds: route.time ?? null,
    distanceUnits: route.distance_units ?? 'meters',
    geometry: route.geometry ?? null,
    legs: Array.isArray(route.legs) ? route.legs : [],
  };
}
