function featureProperties(feature) {
  return feature?.properties && typeof feature.properties === 'object' ? feature.properties : {};
}

export function normalizeGeoapifyPlaceFeature(feature) {
  const properties = featureProperties(feature);
  const coordinates = Array.isArray(feature?.geometry?.coordinates) ? feature.geometry.coordinates : [];

  return {
    provider: 'geoapify',
    externalId: properties.place_id ?? properties.datasource?.raw?.osm_id?.toString?.() ?? null,
    name: properties.name ?? properties.address_line1 ?? properties.formatted ?? 'Unnamed place',
    formattedAddress: properties.formatted ?? ([properties.address_line1, properties.address_line2].filter(Boolean).join(', ') || null),
    addressLine1: properties.address_line1 ?? null,
    addressLine2: properties.address_line2 ?? null,
    city: properties.city ?? properties.town ?? properties.village ?? null,
    state: properties.state ?? null,
    postcode: properties.postcode ?? null,
    country: properties.country ?? null,
    countryCode: properties.country_code?.toUpperCase?.() ?? null,
    latitude: Number(properties.lat ?? coordinates[1]),
    longitude: Number(properties.lon ?? coordinates[0]),
    categories: Array.isArray(properties.categories) ? properties.categories : [],
    distanceMeters: Number.isFinite(Number(properties.distance)) ? Number(properties.distance) : null,
    website: properties.website ?? properties.datasource?.raw?.website ?? null,
    phone: properties.contact?.phone ?? properties.datasource?.raw?.phone ?? null,
    openingHours: properties.opening_hours ?? properties.datasource?.raw?.opening_hours ?? null,
    source: {
      provider: 'geoapify',
      fetchedAt: new Date().toISOString(),
    },
  };
}

export function normalizeGeoapifyFeatureCollection(payload) {
  if (!payload || !Array.isArray(payload.features)) return [];
  return payload.features.map(normalizeGeoapifyPlaceFeature);
}

export function normalizeGeoapifyAutocomplete(payload) {
  const rows = Array.isArray(payload?.results) ? payload.results : [];
  return rows.map((properties) => normalizeGeoapifyPlaceFeature({
    properties,
    geometry: { coordinates: [properties.lon, properties.lat] },
  }));
}
