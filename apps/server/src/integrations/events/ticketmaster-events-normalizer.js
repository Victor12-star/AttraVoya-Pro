function toFiniteNumber(value) {
  if (value === undefined || value === null || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function normalizeClassification(classification) {
  return {
    segment: classification?.segment?.name ?? null,
    genre: classification?.genre?.name ?? null,
    subGenre: classification?.subGenre?.name ?? null,
    type: classification?.type?.name ?? null,
    subType: classification?.subType?.name ?? null,
  };
}

function selectImage(images) {
  if (!Array.isArray(images) || images.length === 0) return null;

  const candidates = images.filter(
    (image) => typeof image?.url === 'string' && image.url.length > 0,
  );
  if (candidates.length === 0) return null;

  const selected = [...candidates].sort((left, right) => {
    const leftArea = Number(left?.width ?? 0) * Number(left?.height ?? 0);
    const rightArea = Number(right?.width ?? 0) * Number(right?.height ?? 0);
    return rightArea - leftArea;
  })[0];

  return {
    url: selected.url,
    ratio: selected.ratio ?? null,
    width: toFiniteNumber(selected.width),
    height: toFiniteNumber(selected.height),
    fallback: Boolean(selected.fallback),
  };
}

function normalizeVenue(venue) {
  if (!venue || typeof venue !== 'object') return null;

  return {
    externalId: venue.id ?? null,
    name: venue.name ?? null,
    city: venue.city?.name ?? null,
    region: venue.state?.name ?? venue.state?.stateCode ?? null,
    country: venue.country?.name ?? null,
    countryCode: venue.country?.countryCode ?? null,
    address: venue.address?.line1 ?? null,
    postalCode: venue.postalCode ?? null,
    latitude: toFiniteNumber(venue.location?.latitude),
    longitude: toFiniteNumber(venue.location?.longitude),
  };
}

export function normalizeTicketmasterEvent(event) {
  const venue = Array.isArray(event?._embedded?.venues) ? event._embedded.venues[0] : null;
  const classifications = Array.isArray(event?.classifications)
    ? event.classifications.map(normalizeClassification)
    : [];

  return {
    provider: 'ticketmaster',
    externalId: event?.id ?? null,
    name: event?.name ?? null,
    url: event?.url ?? null,
    locale: event?.locale ?? null,
    status: event?.dates?.status?.code ?? null,
    start: {
      dateTime: event?.dates?.start?.dateTime ?? null,
      localDate: event?.dates?.start?.localDate ?? null,
      localTime: event?.dates?.start?.localTime ?? null,
      timezone: event?.dates?.timezone ?? null,
      dateTbd: Boolean(event?.dates?.start?.dateTBD),
      dateTba: Boolean(event?.dates?.start?.dateTBA),
      timeTba: Boolean(event?.dates?.start?.timeTBA),
    },
    venue: normalizeVenue(venue),
    classifications,
    image: selectImage(event?.images),
    info: event?.info ?? null,
    pleaseNote: event?.pleaseNote ?? null,
  };
}

export function normalizeTicketmasterEvents(payload, fetchedAt = new Date().toISOString()) {
  if (!payload || typeof payload !== 'object') {
    throw new TypeError('Ticketmaster payload must be an object.');
  }

  const events = Array.isArray(payload._embedded?.events) ? payload._embedded.events : [];
  const page = payload.page ?? {};

  return {
    provider: 'ticketmaster',
    fetchedAt,
    events: events.map(normalizeTicketmasterEvent),
    page: {
      size: Number.isInteger(page.size) ? page.size : events.length,
      number: Number.isInteger(page.number) ? page.number : 0,
      totalElements: Number.isInteger(page.totalElements) ? page.totalElements : events.length,
      totalPages: Number.isInteger(page.totalPages) ? page.totalPages : events.length ? 1 : 0,
    },
  };
}
