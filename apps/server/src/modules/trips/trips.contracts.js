const COMPANION_TRIP_STATUSES = new Set(['ACTIVE', 'PLANNED']);

function textValue(value, maxLength) {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return normalized && normalized.length <= maxLength ? normalized : null;
}

function isoDate(value) {
  return value instanceof Date && Number.isFinite(value.getTime()) ? value.toISOString().slice(0, 10) : null;
}

function countryCode(value) {
  const normalized = textValue(value, 2)?.toUpperCase();
  return normalized && /^[A-Z]{2}$/.test(normalized) ? normalized : null;
}

function isCurrentTrip(trip, today) {
  return trip.status === 'ACTIVE' && trip.startDate <= today && trip.endDate >= today;
}

function tripPriority(trip, today) {
  if (isCurrentTrip(trip, today)) return 0;
  if (trip.status === 'ACTIVE') return 1;
  return 2;
}

export function mapCompanionTrip(record) {
  const id = textValue(record?.id, 128);
  const title = textValue(record?.title, 240);
  const status = textValue(record?.status, 20);
  const startDate = isoDate(record?.startDate);
  const endDate = isoDate(record?.endDate);
  const destinationId = textValue(record?.destination?.id, 128);
  const destinationSlug = textValue(record?.destination?.slug, 180);
  const destinationName = textValue(record?.destination?.city?.name, 180);
  const destinationCountryCode = countryCode(record?.destination?.city?.country?.iso2);
  const destinationCountryName = textValue(record?.destination?.city?.country?.name, 180);

  if (
    !id ||
    !title ||
    !status ||
    !COMPANION_TRIP_STATUSES.has(status) ||
    !startDate ||
    !endDate ||
    !destinationId ||
    !destinationSlug ||
    !destinationName ||
    !destinationCountryCode ||
    !destinationCountryName
  ) {
    return null;
  }

  return {
    id,
    title,
    status,
    startDate,
    endDate,
    destination: {
      id: destinationId,
      slug: destinationSlug,
      name: destinationName,
      countryCode: destinationCountryCode,
      countryName: destinationCountryName,
    },
  };
}

export function buildCompanionTripContext(records, today) {
  const todayString = isoDate(today);
  if (!todayString) throw new TypeError('A valid companion-context date is required.');

  const trips = (Array.isArray(records) ? records : [])
    .map(mapCompanionTrip)
    .filter(Boolean)
    .sort((left, right) => {
      const priorityDifference = tripPriority(left, todayString) - tripPriority(right, todayString);
      if (priorityDifference !== 0) return priorityDifference;
      const dateDifference = left.startDate.localeCompare(right.startDate);
      return dateDifference !== 0 ? dateDifference : left.id.localeCompare(right.id);
    });

  const suggestedTrip = trips[0] ?? null;
  return {
    suggestedTripId: suggestedTrip?.id ?? null,
    source: suggestedTrip
      ? isCurrentTrip(suggestedTrip, todayString)
        ? 'ACTIVE_TRIP'
        : 'PLANNED_TRIP'
      : null,
    trips,
  };
}
