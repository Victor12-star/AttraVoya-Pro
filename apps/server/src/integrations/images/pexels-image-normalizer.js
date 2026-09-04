const PEXELS_URL = 'https://www.pexels.com';

function stringOrNull(value) {
  return typeof value === 'string' && value.trim().length > 0
    ? value.trim()
    : null;
}

function finiteNumberOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function externalId(value) {
  if (value === undefined || value === null) return null;
  return String(value);
}

function normalizeSources(src) {
  return {
    original: stringOrNull(src?.original),
    large2x: stringOrNull(src?.large2x),
    large: stringOrNull(src?.large),
    medium: stringOrNull(src?.medium),
    small: stringOrNull(src?.small),
    portrait: stringOrNull(src?.portrait),
    landscape: stringOrNull(src?.landscape),
    tiny: stringOrNull(src?.tiny),
  };
}

export function normalizePexelsPhoto(photo) {
  const photoUrl = stringOrNull(photo?.url);
  const photographerUrl = stringOrNull(photo?.photographer_url);

  return {
    provider: 'pexels',
    externalId: externalId(photo?.id),
    width: finiteNumberOrNull(photo?.width),
    height: finiteNumberOrNull(photo?.height),
    averageColor: stringOrNull(photo?.avg_color),
    alt: stringOrNull(photo?.alt),
    sourcePageUrl: photoUrl,
    sources: normalizeSources(photo?.src),
    photographer: {
      externalId: externalId(photo?.photographer_id),
      name: stringOrNull(photo?.photographer),
      profileUrl: photographerUrl,
    },
    attribution: {
      photoUrl,
      photographerUrl,
      photographerName: stringOrNull(photo?.photographer),
    },
  };
}

export function normalizePexelsSearch(payload, fetchedAt = new Date().toISOString()) {
  if (!payload || typeof payload !== 'object') {
    throw new TypeError('Pexels payload must be an object.');
  }

  const photos = Array.isArray(payload.photos) ? payload.photos : [];
  const page = Number.isInteger(payload.page) ? payload.page : 1;
  const perPage = Number.isInteger(payload.per_page)
    ? payload.per_page
    : photos.length;
  const totalResults = Number.isInteger(payload.total_results)
    ? payload.total_results
    : photos.length;

  return {
    provider: 'pexels',
    fetchedAt,
    photos: photos.map(normalizePexelsPhoto),
    page: {
      number: page,
      size: perPage,
      totalResults,
      hasPrevious: Boolean(payload.prev_page),
      hasNext: Boolean(payload.next_page),
    },
    attribution: {
      providerName: 'Pexels',
      providerUrl: PEXELS_URL,
      providerLinkText: 'Photos provided by Pexels',
      providerLinkRequired: true,
      photographerCreditRecommended: true,
    },
  };
}
